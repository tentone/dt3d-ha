package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"
	"dt3d-ha/backend/service"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func newSpaceTestRouter(t *testing.T) (*gin.Engine, *service.SpaceService) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}
	if err := db.AutoMigrate(&models.Space{}, &models.ObjectInstance{}); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	spaceService := service.NewSpaceService(
		repository.NewSpaceRepository(db),
		repository.NewObjectInstanceRepository(db),
	)

	router := gin.New()
	api := router.Group("/api")
	NewSpaceHandler(spaceService).Register(api)

	return router, spaceService
}

func TestCreateObjectInstanceStoresFrontendDeclaredType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router, spaceService := newSpaceTestRouter(t)
	space := models.Space{Name: "Test Space"}
	if err := spaceService.CreateSpace(&space); err != nil {
		t.Fatalf("failed to create test space: %v", err)
	}

	requestBody := strings.NewReader(`{
		"name": "Custom Object",
		"type": "custom-spline",
		"data": {
			"object3DType": "custom-spline",
			"position": {"x": 1, "y": 2, "z": 3}
		},
		"parent_id": null
	}`)
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/spaces/"+space.ID+"/objects",
		requestBody,
	)
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, response.Code, response.Body.String())
	}

	var objectResponse objectInstanceResponse
	if err := json.Unmarshal(response.Body.Bytes(), &objectResponse); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if objectResponse.Type != "custom-spline" {
		t.Fatalf("expected type %q, got %q", "custom-spline", objectResponse.Type)
	}
}

func TestUpdateObjectInstanceStoresFrontendDeclaredType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router, spaceService := newSpaceTestRouter(t)
	space := models.Space{Name: "Test Space"}
	if err := spaceService.CreateSpace(&space); err != nil {
		t.Fatalf("failed to create test space: %v", err)
	}

	instance := models.ObjectInstance{
		Name: "Original Object",
		Type: "original-custom",
	}
	if err := instance.SetData(map[string]any{"position": map[string]int{"x": 0, "y": 0, "z": 0}}); err != nil {
		t.Fatalf("failed to set object data: %v", err)
	}
	if err := spaceService.CreateObjectInstance(space.ID, &instance); err != nil {
		t.Fatalf("failed to create test object: %v", err)
	}

	requestBody := strings.NewReader(`{
		"name": "Updated Object",
		"type": "updated-custom",
		"data": {
			"object3DType": "updated-custom",
			"position": {"x": 4, "y": 5, "z": 6}
		},
		"parent_id": null
	}`)
	request := httptest.NewRequest(
		http.MethodPut,
		"/api/spaces/"+space.ID+"/objects/"+instance.ID,
		requestBody,
	)
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, response.Code, response.Body.String())
	}

	var objectResponse objectInstanceResponse
	if err := json.Unmarshal(response.Body.Bytes(), &objectResponse); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if objectResponse.Type != "updated-custom" {
		t.Fatalf("expected type %q, got %q", "updated-custom", objectResponse.Type)
	}
}
