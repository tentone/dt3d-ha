package repository

import (
	"testing"

	"dt3d-ha/backend/models"
)

func TestDeleteSpaceDeletesItsObjects(t *testing.T) {
	db := newObjectInstanceTestDB(t)
	repo := NewSpaceRepository(db)

	deletedSpace := models.Space{
		Base: models.Base{ID: "space-to-delete"},
		Name: "Delete me",
	}
	remainingSpace := models.Space{
		Base: models.Base{ID: "space-to-keep"},
		Name: "Keep me",
	}
	for _, space := range []*models.Space{&deletedSpace, &remainingSpace} {
		if err := db.Create(space).Error; err != nil {
			t.Fatalf("create space %s: %v", space.ID, err)
		}
	}

	instances := []models.ObjectInstance{
		{Base: models.Base{ID: "deleted-object"}, SpaceID: deletedSpace.ID, Name: "Deleted", Type: "group"},
		{Base: models.Base{ID: "remaining-object"}, SpaceID: remainingSpace.ID, Name: "Remaining", Type: "group"},
	}
	for _, instance := range instances {
		if err := db.Create(&instance).Error; err != nil {
			t.Fatalf("create object %s: %v", instance.ID, err)
		}
	}

	if err := repo.Delete(&deletedSpace); err != nil {
		t.Fatalf("delete space: %v", err)
	}

	var deletedObjectCount int64
	if err := db.Model(&models.ObjectInstance{}).
		Where("space_id = ?", deletedSpace.ID).
		Count(&deletedObjectCount).Error; err != nil {
		t.Fatalf("count deleted space objects: %v", err)
	}
	if deletedObjectCount != 0 {
		t.Fatalf("deleted space object count = %d, want 0", deletedObjectCount)
	}

	var remainingObjectCount int64
	if err := db.Model(&models.ObjectInstance{}).
		Where("space_id = ?", remainingSpace.ID).
		Count(&remainingObjectCount).Error; err != nil {
		t.Fatalf("count remaining space objects: %v", err)
	}
	if remainingObjectCount != 1 {
		t.Fatalf("remaining space object count = %d, want 1", remainingObjectCount)
	}
}
