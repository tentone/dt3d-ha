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

const (
	defaultPort               = 8080
	optionsFilePath           = "/data/options.json"
	selfSignedCertificateFile = "/data/dt3d-self-signed.crt"
	selfSignedKeyFile         = "/data/dt3d-self-signed.key"
)

type options struct {
	Port                     int    `json:"port"`
	ServiceKey               string `json:"service_key"`
	SSLCertificate           string `json:"ssl_certificate"`
	SSLKey                   string `json:"ssl_key"`
	UseSelfSignedCertificate bool   `json:"use_self_signed_certificate"`
}

func loadOptions() options {
	return loadOptionsFromFile(optionsFilePath)
}

func defaultOptions() options {
	return options{
		Port: defaultPort,
	}
}

func loadOptionsFromFile(path string) options {
	opt := defaultOptions()

	data, err := os.ReadFile(path)
	if err != nil {
		return opt
	}

	if err := json.Unmarshal(data, &opt); err != nil {
		return defaultOptions()
	}

	opt.normalize()
	return opt
}

func (opt *options) normalize() {
	if opt.Port == 0 {
		opt.Port = defaultPort
	}
	opt.ServiceKey = strings.TrimSpace(opt.ServiceKey)
	opt.SSLCertificate = strings.TrimSpace(opt.SSLCertificate)
	opt.SSLKey = strings.TrimSpace(opt.SSLKey)
}

func resolveTLSCertificatePaths(opt options) (string, string, bool, error) {
	return resolveTLSCertificatePathsWithDefaults(opt, selfSignedCertificateFile, selfSignedKeyFile)
}

func resolveTLSCertificatePathsWithDefaults(opt options, selfSignedCertificateFile string, selfSignedKeyFile string) (string, string, bool, error) {
	if opt.SSLCertificate != "" && opt.SSLKey != "" {
		if err := validateTLSCertificatePair(opt.SSLCertificate, opt.SSLKey); err == nil {
			return opt.SSLCertificate, opt.SSLKey, true, nil
		} else if !opt.UseSelfSignedCertificate {
			return "", "", false, err
		}

		log.Printf("Configured SSL certificate/key could not be loaded; using self-signed certificate")
	} else if opt.SSLCertificate != "" || opt.SSLKey != "" {
		if !opt.UseSelfSignedCertificate {
			return "", "", false, fmt.Errorf("both ssl_certificate and ssl_key must be configured to enable HTTPS")
		}

		log.Printf("Incomplete SSL certificate/key configuration; using self-signed certificate")
	}

	if opt.UseSelfSignedCertificate {
		if err := ensureSelfSignedCertificate(selfSignedCertificateFile, selfSignedKeyFile); err != nil {
			return "", "", false, err
		}

		return selfSignedCertificateFile, selfSignedKeyFile, true, nil
	}

	return "", "", false, nil
}

func runServer(router http.Handler, addr string, opt options) error {
	certFile, keyFile, useTLS, err := resolveTLSCertificatePaths(opt)
	if err != nil {
		return err
	}

	if useTLS {
		log.Printf("Listening with HTTPS on %s", addr)
		return http.ListenAndServeTLS(addr, certFile, keyFile, router)
	}

	log.Printf("Listening with HTTP on %s", addr)
	return http.ListenAndServe(addr, router)
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

	if err := runServer(router, fmt.Sprintf("0.0.0.0:%d", opt.Port), opt); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
