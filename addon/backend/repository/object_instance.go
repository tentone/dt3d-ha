package repository

import (
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
	return r.db.Create(instance).Error
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
	return r.db.Save(instance).Error
}

func (r *ObjectInstanceRepository) DeleteWithDescendants(id string) error {
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

		return nil
	})
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
