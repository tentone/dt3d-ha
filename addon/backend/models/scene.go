package models

import (
	"encoding/json"

	"gorm.io/datatypes"
)

type Scene struct {
	Base

	Name        string `gorm:"size:255" json:"name"`
	Description string `gorm:"size:1024" json:"description"`

	ObjectInstances []ObjectInstance `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"object_instances"`
}

type ObjectInstance struct {
	Base

	SceneID string `gorm:"type:uuid;index" json:"scene_id"`
	Scene   *Scene `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`

	ParentID *string          `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Parent   *ObjectInstance  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"-"`
	Children []ObjectInstance `gorm:"foreignKey:ParentID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"children,omitempty"`

	Name string         `gorm:"size:255" json:"name"`
	Type string         `gorm:"size:64" json:"type"`
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
