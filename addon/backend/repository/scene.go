package repository

import (
	"dt3d-ha/backend/models"

	"gorm.io/gorm"
)

type SceneRepository struct {
	db *gorm.DB
}

func NewSceneRepository(db *gorm.DB) *SceneRepository {
	return &SceneRepository{db: db}
}

func (r *SceneRepository) Create(scene *models.Scene) error {
	return r.db.Create(scene).Error
}

func (r *SceneRepository) FindAll() ([]models.Scene, error) {
	var scenes []models.Scene
	err := r.db.Preload("ObjectInstances").Find(&scenes).Error
	return scenes, err
}

func (r *SceneRepository) FindByID(id string) (*models.Scene, error) {
	var scene models.Scene
	if err := r.db.Preload("ObjectInstances").First(&scene, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &scene, nil
}
