package models

type User struct {
	Base

	Name string `gorm:"size:255"`
}
