package models

type Space struct {
	Base

	// Name of the space
	Name string `gorm:"size:255" json:"name"`

	// Description of the space
	Description string `gorm:"size:1024" json:"description"`

	// Objects placed inside the space
	ObjectInstances []ObjectInstance `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"object_instances"`
}
