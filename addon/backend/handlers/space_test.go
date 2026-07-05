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

func TestCreateObjectInstanceAcceptsFrontendMeshType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router, spaceService := newSpaceTestRouter(t)
	space := models.Space{Name: "Test Space"}
	if err := spaceService.CreateSpace(&space); err != nil {
		t.Fatalf("failed to create test space: %v", err)
	}

	requestBody := strings.NewReader(`{
		"name": "Cube",
		"type": "mesh",
		"data": {
			"meshType": "cube",
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
	if objectResponse.Type != "mesh" {
		t.Fatalf("expected canonical type %q, got %q", "mesh", objectResponse.Type)
	}
}
