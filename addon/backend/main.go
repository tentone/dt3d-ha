package main

import (
	"dt3d-ha/backend/models"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

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

	// Initialize GORM with SQLite
	db, err := gorm.Open(sqlite.Open("data.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Auto-migrate the schema
	if err := db.AutoMigrate(&models.User{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	http.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello from DT3D backend"))
	})

	log.Printf("Listening on :%d", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
