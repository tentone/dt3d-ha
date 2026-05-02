package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base model with common fields for all entities
type Base struct {
	// UUID primary key
	ID string `gorm:"type:text;primaryKey"`

	// Date of creation
	CreatedAt int64 `gorm:"autoCreateTime"`

	// Date of last update
	UpdatedAt int64 `gorm:"autoUpdateTime"`
}

// BeforeCreate generates a UUID for the ID field if not already set
func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}
