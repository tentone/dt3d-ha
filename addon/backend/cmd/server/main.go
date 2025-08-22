package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "modernc.org/sqlite"
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
	db, err := sql.Open("sqlite", "data.db")
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	http.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello from DT3D backend"))
	})

	log.Printf("Listening on :%d", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
