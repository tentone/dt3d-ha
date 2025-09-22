package models

type Base struct {
	ID string `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`

	CreatedAt int64 `gorm:"autoCreateTime"`

	UpdatedAt int64 `gorm:"autoUpdateTime"`
}
