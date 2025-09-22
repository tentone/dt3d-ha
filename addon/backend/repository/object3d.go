package repository

import "gorm.io/gorm"

type Object3DRepository struct {
	DB *gorm.DB
}

func NewObject3DRepository(db *gorm.DB) *Object3DRepository {
	return &Object3DRepository{DB: db}
}
