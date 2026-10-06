package models

import "gorm.io/datatypes"

// Assets belong to a space, never to an object. UUIDs survive object deletion.
type Material struct {
	SpaceID string         `gorm:"primaryKey"`
	UUID    string         `gorm:"primaryKey"`
	Data    datatypes.JSON `gorm:"type:json"`
}

type Texture struct {
	SpaceID string         `gorm:"primaryKey"`
	UUID    string         `gorm:"primaryKey"`
	Data    datatypes.JSON `gorm:"type:json"`
}

type TextureImage struct {
	SpaceID string         `gorm:"primaryKey"`
	UUID    string         `gorm:"primaryKey"`
	Data    datatypes.JSON `gorm:"type:json"`
}
