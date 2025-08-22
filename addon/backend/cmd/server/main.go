package main

import (
    "database/sql"
    "log"
    "net/http"

    _ "modernc.org/sqlite"
)

func main() {
    db, err := sql.Open("sqlite", "data.db")
    if err != nil {
        log.Fatalf("failed to open database: %v", err)
    }
    defer db.Close()

    http.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello from DT3D backend"))
    })

    log.Println("Listening on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

