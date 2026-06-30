package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SpaceHandler struct {
	spaces *service.SpaceService
}

func NewSpaceHandler(spaceService *service.SpaceService) *SpaceHandler {
	return &SpaceHandler{spaces: spaceService}
}

func (h *SpaceHandler) Register(router gin.IRouter) {
	spaces := router.Group("/spaces")
	{
		spaces.GET("", h.listSpaces)
		spaces.POST("", h.createSpace)
		spaces.GET(":spaceID", h.getSpace)
		spaces.GET(":spaceID/objects", h.listObjectInstances)
		spaces.GET(":spaceID/tree", h.getObjectTree)
		spaces.POST(":spaceID/objects", h.createObjectInstance)
		spaces.PUT(":spaceID/objects/:objectID", h.updateObjectInstance)
		spaces.DELETE(":spaceID/objects/:objectID", h.deleteObjectInstance)
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
