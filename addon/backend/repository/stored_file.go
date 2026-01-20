package repository

import (
	"dt3d-ha/backend/models"

	"gorm.io/gorm"
)

type StoredFileRepository struct {
	db *gorm.DB
}

func NewStoredFileRepository(db *gorm.DB) *StoredFileRepository {
	return &StoredFileRepository{db: db}
}

func (r *StoredFileRepository) Create(file *models.StoredFile) error {
	return r.db.Create(file).Error
}

func (r *StoredFileRepository) FindByID(id string) (*models.StoredFile, error) {
	var file models.StoredFile
	if err := r.db.First(&file, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

func (r *StoredFileRepository) Delete(id string) error {
	return r.db.Delete(&models.StoredFile{}, "id = ?", id).Error
}
