package models

type StoredFile struct {
	Base

	Filename    string `gorm:"size:255" json:"filename"`
	Format      string `gorm:"size:32" json:"format"`
	StoragePath string `gorm:"size:1024" json:"storage_path"`
}
