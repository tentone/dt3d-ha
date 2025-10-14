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

type SceneHandler struct {
	scenes *service.SceneService
}

func NewSceneHandler(sceneService *service.SceneService) *SceneHandler {
	return &SceneHandler{scenes: sceneService}
}

func (h *SceneHandler) Register(router *gin.Engine) {
	scenes := router.Group("/api/scenes")
	{
		scenes.GET("", h.listScenes)
		scenes.POST("", h.createScene)
		scenes.GET(":sceneID", h.getScene)
		scenes.GET(":sceneID/objects", h.listObjectInstances)
		scenes.GET(":sceneID/tree", h.getObjectTree)
		scenes.POST(":sceneID/objects", h.createObjectInstance)
		scenes.PUT(":sceneID/objects/:objectID", h.updateObjectInstance)
		scenes.DELETE(":sceneID/objects/:objectID", h.deleteObjectInstance)
	}
}

func (h *SceneHandler) listScenes(c *gin.Context) {
	scenes, err := h.scenes.ListScenes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	responses := make([]sceneResponse, 0, len(scenes))
	for _, scene := range scenes {
		responses = append(responses, toSceneResponse(scene))
	}
	c.JSON(http.StatusOK, responses)
}

func (h *SceneHandler) createScene(c *gin.Context) {
	var req createSceneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid scene payload"})
		return
	}

	scene := models.Scene{
		Name:        req.Name,
		Description: req.Description,
	}
	if err := h.scenes.CreateScene(&scene); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, toSceneResponse(scene))
}

func (h *SceneHandler) getScene(c *gin.Context) {
	sceneID := c.Param("sceneID")
	scene, err := h.scenes.GetSceneByID(sceneID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "scene not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toSceneResponse(*scene))
}

func (h *SceneHandler) listObjectInstances(c *gin.Context) {
	sceneID := c.Param("sceneID")
	instances, err := h.scenes.ListObjectInstances(sceneID)
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

func (h *SceneHandler) getObjectTree(c *gin.Context) {
	sceneID := c.Param("sceneID")
	tree, err := h.scenes.GetObjectTree(sceneID)
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

func (h *SceneHandler) createObjectInstance(c *gin.Context) {
	sceneID := c.Param("sceneID")
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
	if err := h.scenes.CreateObjectInstance(sceneID, &instance); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, toObjectInstanceResponse(instance))
}

func (h *SceneHandler) updateObjectInstance(c *gin.Context) {
	sceneID := c.Param("sceneID")
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

	instance, err := h.scenes.UpdateObjectInstance(sceneID, objectID, payload)
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

func (h *SceneHandler) deleteObjectInstance(c *gin.Context) {
	sceneID := c.Param("sceneID")
	objectID := c.Param("objectID")

	if err := h.scenes.DeleteObjectInstance(sceneID, objectID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "object instance not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
