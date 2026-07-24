package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const maxGeometryFileBytes = 256 * 1024 * 1024

type SpaceHandler struct {
	geometryDir string
	spaces      *service.SpaceService
}

func NewSpaceHandler(spaceService *service.SpaceService, geometryDir string) *SpaceHandler {
	return &SpaceHandler{geometryDir: geometryDir, spaces: spaceService}
}

func (h *SpaceHandler) Register(router gin.IRouter) {
	spaces := router.Group("/spaces")
	{
		spaces.GET("", h.listSpaces)
		spaces.POST("", h.createSpace)
		spaces.GET(":spaceID", h.getSpace)
		spaces.PUT(":spaceID", h.updateSpace)
		spaces.DELETE(":spaceID", h.deleteSpace)
		spaces.POST(":spaceID/clone", h.cloneSpace)
		spaces.GET(":spaceID/objects", h.listObjectInstances)
		spaces.GET(":spaceID/tree", h.getObjectTree)
		spaces.POST(":spaceID/objects", h.createObjectInstance)
		spaces.PUT(":spaceID/objects/:objectID", h.updateObjectInstance)
		spaces.DELETE(":spaceID/objects/:objectID", h.deleteObjectInstance)
		spaces.POST(":spaceID/geometries", h.createGeometryFile)
		spaces.GET(":spaceID/geometries/:geometryID", h.getGeometryFile)
	}
}

func (h *SpaceHandler) listSpaces(c *gin.Context) {
	spaces, err := h.spaces.ListSpaces()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	responses := make([]spaceResponse, 0, len(spaces))
	for _, space := range spaces {
		responses = append(responses, toSpaceResponse(space))
	}
	c.JSON(http.StatusOK, responses)
}

func (h *SpaceHandler) createSpace(c *gin.Context) {
	var req createSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid space payload"})
		return
	}

	space := models.Space{
		Name:        req.Name,
		Description: req.Description,
		IsDefault:   req.IsDefault,
		Config:      rawMessageToJSON(req.Config),
	}
	if err := h.spaces.CreateSpace(&space); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, toSpaceResponse(space))
}

func (h *SpaceHandler) getSpace(c *gin.Context) {
	spaceID := c.Param("spaceID")
	space, err := h.spaces.GetSpaceByID(spaceID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toSpaceResponse(*space))
}

func (h *SpaceHandler) updateSpace(c *gin.Context) {
	spaceID := c.Param("spaceID")
	var req updateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid space payload"})
		return
	}

	space, err := h.spaces.UpdateSpace(spaceID, service.UpdateSpaceInput{
		Name:        req.Name,
		Description: req.Description,
		IsDefault:   req.IsDefault,
		Config:      rawMessageToJSON(req.Config),
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toSpaceResponse(*space))
}

func (h *SpaceHandler) cloneSpace(c *gin.Context) {
	sourceSpaceID := c.Param("spaceID")
	if _, err := uuid.Parse(sourceSpaceID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid space id"})
		return
	}

	var req cloneSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid clone payload"})
		return
	}

	space, err := h.spaces.CloneSpace(sourceSpaceID, req.Name)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := cloneGeometryFiles(h.geometryDir, sourceSpaceID, space.ID); err != nil {
		if cleanupErr := h.spaces.DeleteSpace(space.ID); cleanupErr != nil {
			log.Printf("Failed to remove incomplete cloned space %s: %v", space.ID, cleanupErr)
		}
		if cleanupErr := os.RemoveAll(filepath.Join(h.geometryDir, space.ID)); cleanupErr != nil {
			log.Printf("Failed to remove geometry files for incomplete cloned space %s: %v", space.ID, cleanupErr)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clone space geometry files"})
		return
	}

	c.JSON(http.StatusCreated, toSpaceResponse(*space))
}

func (h *SpaceHandler) deleteSpace(c *gin.Context) {
	spaceID := c.Param("spaceID")
	if _, err := uuid.Parse(spaceID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid space id"})
		return
	}

	if err := h.spaces.DeleteSpace(spaceID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := os.RemoveAll(filepath.Join(h.geometryDir, spaceID)); err != nil {
		log.Printf("Failed to remove geometry files for deleted space %s: %v", spaceID, err)
	}

	c.Status(http.StatusNoContent)
}

func (h *SpaceHandler) listObjectInstances(c *gin.Context) {
	spaceID := c.Param("spaceID")
	instances, err := h.spaces.ListObjectInstances(spaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	responses := make([]objectInstanceResponse, 0, len(instances))
	for _, instance := range instances {
		responses = append(responses, toObjectInstanceResponse(instance))
	}
	c.JSON(http.StatusOK, responses)
}

func (h *SpaceHandler) getObjectTree(c *gin.Context) {
	spaceID := c.Param("spaceID")
	tree, err := h.spaces.GetObjectTree(spaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	responses := make([]objectTreeNodeResponse, 0, len(tree))
	for _, node := range tree {
		responses = append(responses, toObjectTreeNodeResponse(node))
	}
	c.JSON(http.StatusOK, responses)
}

func (h *SpaceHandler) createObjectInstance(c *gin.Context) {
	spaceID := c.Param("spaceID")
	var req createObjectInstanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid object instance payload"})
		return
	}

	instance := models.ObjectInstance{
		Name:     req.Name,
		Type:     req.Type,
		ParentID: req.ParentID,
		Data:     rawMessageToJSON(req.Data),
	}
	if err := h.spaces.CreateObjectInstance(spaceID, &instance); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, toObjectInstanceResponse(instance))
}

func (h *SpaceHandler) updateObjectInstance(c *gin.Context) {
	spaceID := c.Param("spaceID")
	objectID := c.Param("objectID")

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
		return
	}

	var req updateObjectInstanceRequest
	if err := json.Unmarshal(body, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid object instance payload"})
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Type) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "object name and type are required"})
		return
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid object instance payload"})
		return
	}

	_, parentProvided := raw["parent_id"]

	payload := service.UpdateObjectInstanceInput{
		Name:           req.Name,
		Type:           req.Type,
		Data:           rawMessageToJSON(req.Data),
		ParentID:       req.ParentID,
		ParentProvided: parentProvided,
	}

	instance, err := h.spaces.UpdateObjectInstance(spaceID, objectID, payload)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "object instance not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toObjectInstanceResponse(*instance))
}

func (h *SpaceHandler) deleteObjectInstance(c *gin.Context) {
	spaceID := c.Param("spaceID")
	objectID := c.Param("objectID")

	if err := h.spaces.DeleteObjectInstance(spaceID, objectID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "object instance not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *SpaceHandler) createGeometryFile(c *gin.Context) {
	spaceID := c.Param("spaceID")
	if _, err := uuid.Parse(spaceID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid space id"})
		return
	}

	if _, err := h.spaces.GetSpaceByID(spaceID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	body := http.MaxBytesReader(c.Writer, c.Request.Body, maxGeometryFileBytes)
	data, err := io.ReadAll(body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read geometry file"})
		return
	}

	if len(data) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geometry file is empty"})
		return
	}

	geometryID := uuid.New().String()
	filePath, err := h.geometryFilePath(spaceID, geometryID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := os.MkdirAll(filepath.Dir(filePath), 0750); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create geometry directory"})
		return
	}

	if err := os.WriteFile(filePath, data, 0640); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store geometry file"})
		return
	}

	c.JSON(http.StatusCreated, geometryFileResponse{
		ID:   geometryID,
		Size: len(data),
	})
}

func (h *SpaceHandler) getGeometryFile(c *gin.Context) {
	spaceID := c.Param("spaceID")
	geometryID := c.Param("geometryID")
	filePath, err := h.geometryFilePath(spaceID, geometryID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if _, err := os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "geometry file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read geometry file"})
		return
	}

	c.Header("Content-Type", "application/octet-stream")
	c.File(filePath)
}

func (h *SpaceHandler) geometryFilePath(spaceID string, geometryID string) (string, error) {
	if _, err := uuid.Parse(spaceID); err != nil {
		return "", errors.New("invalid space id")
	}

	if _, err := uuid.Parse(geometryID); err != nil {
		return "", errors.New("invalid geometry id")
	}

	return filepath.Join(h.geometryDir, spaceID, geometryID+".dt3dgeo"), nil
}

func cloneGeometryFiles(geometryDir, sourceSpaceID, clonedSpaceID string) error {
	sourceDir := filepath.Join(geometryDir, sourceSpaceID)
	entries, err := os.ReadDir(sourceDir)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}

	clonedDir := filepath.Join(geometryDir, clonedSpaceID)
	if err := os.MkdirAll(clonedDir, 0750); err != nil {
		return err
	}

	for _, entry := range entries {
		if !entry.Type().IsRegular() {
			continue
		}

		sourceFile, err := os.Open(filepath.Join(sourceDir, entry.Name()))
		if err != nil {
			return err
		}

		clonedFile, err := os.OpenFile(
			filepath.Join(clonedDir, entry.Name()),
			os.O_WRONLY|os.O_CREATE|os.O_EXCL,
			0640,
		)
		if err != nil {
			sourceFile.Close()
			return err
		}

		_, copyErr := io.Copy(clonedFile, sourceFile)
		closeErr := clonedFile.Close()
		sourceCloseErr := sourceFile.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
		if sourceCloseErr != nil {
			return sourceCloseErr
		}
	}

	return nil
}
