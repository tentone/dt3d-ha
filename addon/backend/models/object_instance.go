package models

import (
	"encoding/json"

	"gorm.io/datatypes"
)

type ObjectInstance struct {
	Base

	// Space where this object belongs
	SpaceID string `gorm:"type:uuid;index" json:"space_id"`
	Space   *Space `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`

	// Parent-child relationship for hierarchical objects
	ParentID *string         `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Parent   *ObjectInstance `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`

	// Children objects for hierarchical structure
	Children []ObjectInstance `gorm:"foreignKey:ParentID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"children,omitempty"`

	// Name of the object instance
	Name string `gorm:"size:255" json:"name"`

	// Frontend-declared object type.
	Type string `gorm:"size:64" json:"type"`

	// Arbitrary JSON data for the object instance
	Data datatypes.JSON `json:"data"`
}

func (oi *ObjectInstance) SetData(data interface{}) error {
	if data == nil {
		oi.Data = datatypes.JSON([]byte("null"))
		return nil
	}

	encoded, err := json.Marshal(data)
	if err != nil {
		return err
	}

	oi.Data = datatypes.JSON(encoded)
	return nil
}
