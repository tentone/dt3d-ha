package models

// Base model with common fields for all entities
type Base struct {
	// UUID primary key
	ID string `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`

	// Date of creation
	CreatedAt int64 `gorm:"autoCreateTime"`

	// Date of last update
	UpdatedAt int64 `gorm:"autoUpdateTime"`
}
