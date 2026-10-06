package handlers

import (
	"net/http"

	"dt3d-ha/backend/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Materials can be created and edited without creating a 3D object.
func RegisterMaterialRoutes(router gin.IRouter, db *gorm.DB) {
	router.DELETE("/spaces/:spaceID/materials/:materialID", func(c *gin.Context) {
		if err := repository.DeleteMaterial(db, c.Param("spaceID"), c.Param("materialID")); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	})
	router.PUT("/spaces/:spaceID/materials/:materialID", func(c *gin.Context) {
		var definition map[string]interface{}
		if err := c.ShouldBindJSON(&definition); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid material"})
			return
		}
		definition["uuid"] = c.Param("materialID")
		if err := repository.StoreMaterial(db, c.Param("spaceID"), definition); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	})
}
