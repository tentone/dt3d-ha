package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"dt3d-ha/backend/handlers"
	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"
	"dt3d-ha/backend/service"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type options struct {
	Port int `json:"port"`
}

func loadPort() int {
	port := 8080
	data, err := os.ReadFile("/data/options.json")
	if err != nil {
		return port
	}

	var opt options
	if err := json.Unmarshal(data, &opt); err != nil {
		return port
	}
	if opt.Port != 0 {
		port = opt.Port
	}
	return port
}

func main() {
	port := loadPort()

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
	spaceHandler := handlers.NewSpaceHandler(spaceService)
	handlers.RegisterRoutes(router, spaceHandler)

	log.Printf("Listening on :%d", port)
	if err := router.Run(fmt.Sprintf(":%d", port)); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
