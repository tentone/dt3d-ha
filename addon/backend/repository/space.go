package repository

import (
	"errors"

	"dt3d-ha/backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SpaceRepository struct {
	db *gorm.DB
}

func NewSpaceRepository(db *gorm.DB) *SpaceRepository {
	return &SpaceRepository{db: db}
}

func (r *SpaceRepository) Create(space *models.Space) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&models.Space{}).Count(&count).Error; err != nil {
			return err
		}

		// The first space is the natural default. A later explicit default
		// atomically replaces the previous one.
		space.IsDefault = space.IsDefault || count == 0
		if space.IsDefault {
			if err := tx.Model(&models.Space{}).
				Where("is_default = ?", true).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}

		return tx.Create(space).Error
	})
}

func (r *SpaceRepository) FindAll() ([]models.Space, error) {
	var spaces []models.Space
	err := r.db.Preload("ObjectInstances").Find(&spaces).Error
	return spaces, err
}

func (r *SpaceRepository) FindByID(id string) (*models.Space, error) {
	var space models.Space
	if err := r.db.Preload("ObjectInstances").First(&space, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &space, nil
}

func (r *SpaceRepository) Update(space *models.Space) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if space.IsDefault {
			if err := tx.Model(&models.Space{}).
				Where("id <> ? AND is_default = ?", space.ID, true).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}

		return tx.Save(space).Error
	})
}

func (r *SpaceRepository) Clone(sourceID, name string) (*models.Space, error) {
	var clonedSpace *models.Space

	err := r.db.Transaction(func(tx *gorm.DB) error {
		var source models.Space
		if err := tx.Preload("ObjectInstances").First(&source, "id = ?", sourceID).Error; err != nil {
			return err
		}

		clone := models.Space{
			Name:        name,
			Description: source.Description,
			IsDefault:   false,
			Config:      append([]byte(nil), source.Config...),
		}
		if err := tx.Create(&clone).Error; err != nil {
			return err
		}

		idMap := make(map[string]string, len(source.ObjectInstances))
		sourceIDByClonedID := make(map[string]string, len(source.ObjectInstances))
		clones := make(map[string]*models.ObjectInstance, len(source.ObjectInstances))
		for _, instance := range source.ObjectInstances {
			clonedID := uuid.New().String()
			idMap[instance.ID] = clonedID
			sourceIDByClonedID[clonedID] = instance.ID
			clones[instance.ID] = &models.ObjectInstance{
				Base:    models.Base{ID: clonedID},
				SpaceID: clone.ID,
				Name:    instance.Name,
				Type:    instance.Type,
				Data:    append([]byte(nil), instance.Data...),
			}
		}

		for _, instance := range source.ObjectInstances {
			if instance.ParentID == nil {
				continue
			}
			clonedParentID, ok := idMap[*instance.ParentID]
			if !ok {
				return errors.New("source space contains an object with a missing parent")
			}
			clones[instance.ID].ParentID = &clonedParentID
		}

		created := make(map[string]bool, len(clones))
		var createObject func(string) error
		creating := make(map[string]bool, len(clones))
		createObject = func(sourceObjectID string) error {
			if created[sourceObjectID] {
				return nil
			}
			if creating[sourceObjectID] {
				return errors.New("source space contains a cyclic object hierarchy")
			}

			creating[sourceObjectID] = true
			instance := clones[sourceObjectID]
			if instance.ParentID != nil {
				sourceParentID := sourceIDByClonedID[*instance.ParentID]
				if err := createObject(sourceParentID); err != nil {
					return err
				}
			}
			if err := tx.Create(instance).Error; err != nil {
				return err
			}
			delete(creating, sourceObjectID)
			created[sourceObjectID] = true
			return nil
		}

		for sourceObjectID := range clones {
			if err := createObject(sourceObjectID); err != nil {
				return err
			}
		}

		clone.ObjectInstances = make([]models.ObjectInstance, 0, len(source.ObjectInstances))
		for _, sourceInstance := range source.ObjectInstances {
			clone.ObjectInstances = append(clone.ObjectInstances, *clones[sourceInstance.ID])
		}
		clonedSpace = &clone
		return nil
	})
	if err != nil {
		return nil, err
	}

	return clonedSpace, nil
}

func (r *SpaceRepository) Delete(space *models.Space) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("space_id = ?", space.ID).
			Delete(&models.ObjectInstance{}).Error; err != nil {
			return err
		}

		if err := tx.Delete(space).Error; err != nil {
			return err
		}

		if !space.IsDefault {
			return nil
		}

		var next models.Space
		if err := tx.Order("created_at ASC").First(&next).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}

		return tx.Model(&next).Update("is_default", true).Error
	})
}
