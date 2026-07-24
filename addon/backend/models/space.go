package models

import "gorm.io/datatypes"

type Space struct {
	Base

	// Name of the space
	Name string `gorm:"size:255" json:"name"`

	// Description of the space
	Description string `gorm:"size:1024" json:"description"`

	// Whether this is the default space opened when no card override is set
	IsDefault bool `gorm:"index:idx_spaces_one_default,unique,where:is_default = 1" json:"is_default"`

	// General scene/card configuration stored for the space
	Config datatypes.JSON `gorm:"type:json" json:"config"`

	// Objects placed inside the space
	ObjectInstances []ObjectInstance `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"object_instances"`
}
