package repository

import (
	"dt3d-ha/backend/models"

	"gorm.io/gorm"
)

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

func (r *ObjectInstanceRepository) Delete(id string) error {
	return r.db.Delete(&models.ObjectInstance{}, "id = ?", id).Error
}
