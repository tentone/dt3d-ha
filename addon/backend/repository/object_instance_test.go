package repository

import (
	"errors"
	"reflect"
	"testing"

	"dt3d-ha/backend/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestDeleteWithDescendantsDeletesOnlyTargetSubtree(t *testing.T) {
	db := newObjectInstanceTestDB(t)
	repo := NewObjectInstanceRepository(db)

	space := models.Space{
		Base: models.Base{ID: "space-1"},
		Name: "Test Space",
	}
	if err := db.Create(&space).Error; err != nil {
		t.Fatalf("create space: %v", err)
	}

	parent := models.ObjectInstance{
		Base:    models.Base{ID: "parent"},
		SpaceID: space.ID,
		Name:    "Parent",
		Type:    "group",
	}
	child := models.ObjectInstance{
		Base:     models.Base{ID: "child"},
		SpaceID:  space.ID,
		ParentID: &parent.ID,
		Name:     "Child",
		Type:     "mesh",
	}
	grandchild := models.ObjectInstance{
		Base:     models.Base{ID: "grandchild"},
		SpaceID:  space.ID,
		ParentID: &child.ID,
		Name:     "Grandchild",
		Type:     "mesh",
	}
	unrelated := models.ObjectInstance{
		Base:    models.Base{ID: "unrelated"},
		SpaceID: space.ID,
		Name:    "Unrelated",
		Type:    "mesh",
	}

	for _, instance := range []models.ObjectInstance{parent, child, grandchild, unrelated} {
		if err := db.Create(&instance).Error; err != nil {
			t.Fatalf("create object %s: %v", instance.ID, err)
		}
	}

	if err := repo.DeleteWithDescendants(parent.ID); err != nil {
		t.Fatalf("delete with descendants: %v", err)
	}

	for _, deletedID := range []string{parent.ID, child.ID, grandchild.ID} {
		err := db.First(&models.ObjectInstance{}, "id = ?", deletedID).Error
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			t.Fatalf("object %s should be deleted, got error %v", deletedID, err)
		}
	}

	var remaining []models.ObjectInstance
	if err := db.Order("id ASC").Find(&remaining).Error; err != nil {
		t.Fatalf("find remaining objects: %v", err)
	}

	remainingIDs := make([]string, 0, len(remaining))
	for _, instance := range remaining {
		remainingIDs = append(remainingIDs, instance.ID)
	}

	if want := []string{unrelated.ID}; !reflect.DeepEqual(remainingIDs, want) {
		t.Fatalf("remaining object ids = %v, want %v", remainingIDs, want)
	}
}

func newObjectInstanceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}

	if err := db.AutoMigrate(&models.Space{}, &models.ObjectInstance{}); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	return db
}
