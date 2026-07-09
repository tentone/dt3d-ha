package repository

import (
	"dt3d-ha/backend/models"

	"gorm.io/gorm"
)

type SpaceRepository struct {
	db *gorm.DB
}

func NewSpaceRepository(db *gorm.DB) *SpaceRepository {
	return &SpaceRepository{db: db}
}

func (r *SpaceRepository) Create(space *models.Space) error {
	return r.db.Create(space).Error
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
	return r.db.Save(space).Error
}
