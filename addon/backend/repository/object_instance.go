package repository

import (
	"errors"

	"dt3d-ha/backend/models"

	"gorm.io/gorm"
)

const objectInstanceIDBatchSize = 500

type ObjectInstanceRepository struct {
	// Database connection
	db *gorm.DB
}

func NewObjectInstanceRepository(db *gorm.DB) *ObjectInstanceRepository {
	return &ObjectInstanceRepository{db: db}
}

func (r *ObjectInstanceRepository) Create(instance *models.ObjectInstance) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(instance).Error; err != nil {
			return err
		}

		return bumpSpaceCacheVersion(tx, instance.SpaceID)
	})
}

func (r *ObjectInstanceRepository) FindBySpaceID(spaceID string) ([]models.ObjectInstance, error) {
	var instances []models.ObjectInstance
	err := r.db.Where("space_id = ?", spaceID).Find(&instances).Error
	return instances, err
}

func (r *ObjectInstanceRepository) FindByID(id string) (*models.ObjectInstance, error) {
	var instance models.ObjectInstance
	if err := r.db.First(&instance, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &instance, nil
}

func (r *ObjectInstanceRepository) Update(instance *models.ObjectInstance) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(instance).Error; err != nil {
			return err
		}

		return bumpSpaceCacheVersion(tx, instance.SpaceID)
	})
}

func (r *ObjectInstanceRepository) DeleteWithDescendants(spaceID, id string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		ids, err := collectObjectSubtreeIDs(tx, id)
		if err != nil {
			return err
		}

		for end := len(ids); end > 0; end -= objectInstanceIDBatchSize {
			start := end - objectInstanceIDBatchSize
			if start < 0 {
				start = 0
			}

			if err := tx.Delete(&models.ObjectInstance{}, "id IN ?", ids[start:end]).Error; err != nil {
				return err
			}
		}

		return bumpSpaceCacheVersion(tx, spaceID)
	})
}

func bumpSpaceCacheVersion(tx *gorm.DB, spaceID string) error {
	result := tx.Model(&models.Space{}).
		Where("id = ?", spaceID).
		UpdateColumn("cache_version", gorm.Expr("cache_version + 1"))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("space not found")
	}

	return nil
}

func collectObjectSubtreeIDs(tx *gorm.DB, rootID string) ([]string, error) {
	ids := []string{rootID}
	frontier := []string{rootID}
	seen := map[string]struct{}{rootID: {}}

	for len(frontier) > 0 {
		next := []string{}

		for start := 0; start < len(frontier); start += objectInstanceIDBatchSize {
			end := start + objectInstanceIDBatchSize
			if end > len(frontier) {
				end = len(frontier)
			}

			var childIDs []string
			if err := tx.Model(&models.ObjectInstance{}).
				Where("parent_id IN ?", frontier[start:end]).
				Pluck("id", &childIDs).Error; err != nil {
				return nil, err
			}

			for _, childID := range childIDs {
				if _, ok := seen[childID]; ok {
					continue
				}

				seen[childID] = struct{}{}
				ids = append(ids, childID)
				next = append(next, childID)
			}
		}

		frontier = next
	}

	return ids, nil
}
