package handlers

import (
	"errors"
	"net/http"

	"dt3d-ha/backend/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FileHandler struct {
	files *service.StoredFileService
}

func NewFileHandler(fileService *service.StoredFileService) *FileHandler {
	return &FileHandler{files: fileService}
}

func (h *FileHandler) Register(router *gin.Engine) {
	files := router.Group("/api/files")
	{
		files.POST("", h.uploadFile)
		files.DELETE(":fileID", h.deleteFile)
	}
}

func (h *FileHandler) uploadFile(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read upload"})
		return
	}
	defer file.Close()

	record, err := h.files.CreateFile(service.CreateStoredFileInput{
		Filename: fileHeader.Filename,
		Reader:   file,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, toStoredFileResponse(*record))
}

func (h *FileHandler) deleteFile(c *gin.Context) {
	fileID := c.Param("fileID")
	if err := h.files.DeleteFile(fileID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
