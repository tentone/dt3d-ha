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

		// The first space is the natural default. A later explicit default atomically replaces the previous one.
		space.IsDefault = space.IsDefault || count == 0
		if space.IsDefault {
			if err := tx.Model(&models.Space{}).
				Where("is_default = ?", true).
				Updates(map[string]interface{}{"is_default": false, "cache_version": gorm.Expr("cache_version + 1")}).Error; err != nil {
				return err
			}
		}

		if space.ID == "" {
			space.ID = uuid.NewString()
		}
		if err := normalizeLibrary(tx, space); err != nil {
			return err
		}
		if err := tx.Create(space).Error; err != nil {
			return err
		}
		return loadLibrary(tx, space)
	})
}

func (r *SpaceRepository) FindAll(includeObjects bool) ([]models.Space, error) {
	var spaces []models.Space
	query := r.db
	if includeObjects {
		query = query.Preload("ObjectInstances")
	}
	err := query.Find(&spaces).Error
	if err != nil {
		return nil, err
	}
	for i := range spaces {
		if err := loadLibrary(r.db, &spaces[i]); err != nil {
			return nil, err
		}
	}
	return spaces, nil
}

func (r *SpaceRepository) FindByID(id string) (*models.Space, error) {
	var space models.Space
	// Read the version, configuration and hierarchy from the same database snapshot.
	if err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Preload("ObjectInstances").First(&space, "id = ?", id).Error; err != nil {
			return err
		}
		return loadLibrary(tx, &space)
	}); err != nil {
		return nil, err
	}
	return &space, nil
}

func (r *SpaceRepository) FindVersion(id string) (int64, error) {
	var space models.Space
	err := r.db.Select("id", "cache_version").First(&space, "id = ?", id).Error
	return space.CacheVersion, err
}

func (r *SpaceRepository) Update(space *models.Space) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if space.IsDefault {
			if err := tx.Model(&models.Space{}).
				Where("id <> ? AND is_default = ?", space.ID, true).
				Updates(map[string]interface{}{"is_default": false, "cache_version": gorm.Expr("cache_version + 1")}).Error; err != nil {
				return err
			}
		}

		if err := normalizeLibrary(tx, space); err != nil {
			return err
		}

		// Do not save preloaded associations or a version read before a concurrent edit.
		if err := tx.Model(&models.Space{}).Where("id = ?", space.ID).
			Updates(map[string]interface{}{
				"name": space.Name, "description": space.Description,
				"is_default": space.IsDefault, "config": space.Config,
				"cache_version": gorm.Expr("cache_version + 1"),
			}).Error; err != nil {
			return err
		}
		if err := tx.Preload("ObjectInstances").First(space, "id = ?", space.ID).Error; err != nil {
			return err
		}
		return loadLibrary(tx, space)
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

		// Copy all assets, including unused textures and materials, preserving UUID references.
		for _, table := range []string{"materials", "textures", "texture_images"} {
			columns := "space_id, uuid, data"
			selectColumns := "?, uuid, data"
			if err := tx.Exec("INSERT INTO "+table+" ("+columns+") SELECT "+selectColumns+" FROM "+table+" WHERE space_id = ?", clone.ID, source.ID).Error; err != nil {
				return err
			}
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
		if err := loadLibrary(tx, &clone); err != nil {
			return err
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

		for _, asset := range []interface{}{&models.Material{}, &models.Texture{}, &models.TextureImage{}} {
			if err := tx.Where("space_id = ?", space.ID).Delete(asset).Error; err != nil {
				return err
			}
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

		return tx.Model(&next).Updates(map[string]interface{}{
			"is_default": true, "cache_version": gorm.Expr("cache_version + 1"),
		}).Error
	})
}
