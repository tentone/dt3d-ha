package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"dt3d-ha/backend/handlers"
	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"
	"dt3d-ha/backend/service"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

type options struct {
	Port       int    `json:"port"`
	ServiceKey string `json:"service_key"`
}

func loadOptions() options {
	opt := options{
		Port: 8080,
	}

	data, err := os.ReadFile("/data/options.json")
	if err != nil {
		return opt
	}

	if err := json.Unmarshal(data, &opt); err != nil {
		opt.Port = 8080
		return opt
	}
	if opt.Port == 0 {
		opt.Port = 8080
	}
	opt.ServiceKey = strings.TrimSpace(opt.ServiceKey)
	return opt
}

func main() {
	opt := loadOptions()
	if opt.ServiceKey == "" {
		log.Fatal("service_key must be configured in add-on options")
	}

	// Initialize database
	db, err := gorm.Open(sqlite.Open("data.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	if err := db.AutoMigrate(&models.Space{}, &models.ObjectInstance{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// Repositories
	spaceRepo := repository.NewSpaceRepository(db)
	objectRepo := repository.NewObjectInstanceRepository(db)

	// Services
	spaceService := service.NewSpaceService(spaceRepo, objectRepo)

	// Create router and register handlers
	router := gin.Default()
	router.Use(handlers.CORSMiddleware())
	router.OPTIONS("/api/*path", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	api := router.Group("/api", handlers.RequireServiceKey(opt.ServiceKey))
	spaceHandler := handlers.NewSpaceHandler(spaceService)
	handlers.RegisterRoutes(api, spaceHandler)

	log.Printf("Listening on :%d", opt.Port)
	if err := router.Run(fmt.Sprintf("0.0.0.0:%d", opt.Port)); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
