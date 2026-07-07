package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode"

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
	configuredCertificateFile = "/data/dt3d-configured.crt"
	configuredKeyFile         = "/data/dt3d-configured.key"
	geometryFilesDir          = "/data/dt3d-geometries"
	selfSignedCertificateFile = "/data/dt3d-self-signed.crt"
	selfSignedKeyFile         = "/data/dt3d-self-signed.key"
)

var inlinePEMBlockPattern = regexp.MustCompile(`(?s)-----BEGIN ([A-Z0-9 ]+)-----\s*(.*?)\s*-----END ([A-Z0-9 ]+)-----`)

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
	return resolveTLSCertificatePathsWithDefaults(
		opt,
		selfSignedCertificateFile,
		selfSignedKeyFile,
		configuredCertificateFile,
		configuredKeyFile,
	)
}

func resolveTLSCertificatePathsWithDefaults(opt options, selfSignedCertificateFile string, selfSignedKeyFile string, configuredCertificateFile string, configuredKeyFile string) (string, string, bool, error) {
	if opt.SSLCertificate != "" && opt.SSLKey != "" {
		if certFile, keyFile, err := prepareTLSCertificatePair(opt.SSLCertificate, opt.SSLKey, configuredCertificateFile, configuredKeyFile); err == nil {
			return certFile, keyFile, true, nil
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
	spaceHandler := handlers.NewSpaceHandler(spaceService, geometryFilesDir)
	handlers.RegisterRoutes(api, spaceHandler)

	if err := runServer(router, fmt.Sprintf("0.0.0.0:%d", opt.Port), opt); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func validateTLSCertificatePair(certFile string, keyFile string) error {
	if certFile == "" || keyFile == "" {
		return fmt.Errorf("both ssl_certificate and ssl_key must be configured to enable HTTPS")
	}

	certPEM, err := readTLSFile(certFile, "ssl_certificate")
	if err != nil {
		return err
	}
	keyPEM, err := readTLSFile(keyFile, "ssl_key")
	if err != nil {
		return err
	}

	return validateTLSCertificatePairPEM(certPEM, keyPEM)
}

func prepareTLSCertificatePair(certValue string, keyValue string, configuredCertificateFile string, configuredKeyFile string) (string, string, error) {
	if certValue == "" || keyValue == "" {
		return "", "", fmt.Errorf("both ssl_certificate and ssl_key must be configured to enable HTTPS")
	}

	certPEM, certIsInline, err := readTLSOptionValue(certValue, "ssl_certificate")
	if err != nil {
		return "", "", err
	}
	keyPEM, keyIsInline, err := readTLSOptionValue(keyValue, "ssl_key")
	if err != nil {
		return "", "", err
	}

	if err := validateTLSCertificatePairPEM(certPEM, keyPEM); err != nil {
		return "", "", err
	}

	certFile := certValue
	if certIsInline {
		if err := os.WriteFile(configuredCertificateFile, certPEM, 0644); err != nil {
			return "", "", fmt.Errorf("failed to write ssl_certificate content to %q: %w", configuredCertificateFile, err)
		}
		certFile = configuredCertificateFile
	}

	keyFile := keyValue
	if keyIsInline {
		if err := os.WriteFile(configuredKeyFile, keyPEM, 0600); err != nil {
			return "", "", fmt.Errorf("failed to write ssl_key content to %q: %w", configuredKeyFile, err)
		}
		keyFile = configuredKeyFile
	}

	return certFile, keyFile, nil
}

func readTLSOptionValue(value string, label string) ([]byte, bool, error) {
	if pemBytes, isInline, err := normalizeInlinePEM(value, label); isInline || err != nil {
		return pemBytes, isInline, err
	}

	fileBytes, err := readTLSFile(value, label)
	return fileBytes, false, err
}

func readTLSFile(path string, label string) ([]byte, error) {
	if err := validateTLSFile(path, label); err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read %s file %q: %w", label, path, err)
	}

	return data, nil
}

func validateTLSCertificatePairPEM(certPEM []byte, keyPEM []byte) error {
	if _, err := tls.X509KeyPair(certPEM, keyPEM); err != nil {
		return fmt.Errorf("failed to load SSL certificate/key pair: %w", err)
	}

	return nil
}

func validateTLSFile(path string, label string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("%s file %q is not available: %w", label, path, err)
	}
	if info.IsDir() {
		return fmt.Errorf("%s path %q is a directory", label, path)
	}

	return nil
}

func normalizeInlinePEM(value string, label string) ([]byte, bool, error) {
	normalizedValue := strings.TrimSpace(value)
	normalizedValue = strings.ReplaceAll(normalizedValue, `\n`, "\n")
	normalizedValue = strings.ReplaceAll(normalizedValue, "\r\n", "\n")
	normalizedValue = strings.ReplaceAll(normalizedValue, "\r", "\n")

	if !strings.Contains(normalizedValue, "-----BEGIN ") && !strings.Contains(normalizedValue, "-----END ") {
		return nil, false, nil
	}

	if block, _ := pem.Decode([]byte(normalizedValue)); block != nil {
		return []byte(normalizedValue), true, nil
	}

	matches := inlinePEMBlockPattern.FindAllStringSubmatch(normalizedValue, -1)
	if len(matches) == 0 {
		return nil, true, fmt.Errorf("%s contains PEM markers but could not be parsed", label)
	}

	var builder strings.Builder
	for _, match := range matches {
		beginType := strings.TrimSpace(match[1])
		endType := strings.TrimSpace(match[3])
		if beginType != endType {
			return nil, true, fmt.Errorf("%s PEM block starts as %q but ends as %q", label, beginType, endType)
		}

		body := compactPEMBody(match[2])
		if body == "" {
			return nil, true, fmt.Errorf("%s PEM block %q is empty", label, beginType)
		}

		builder.WriteString("-----BEGIN ")
		builder.WriteString(beginType)
		builder.WriteString("-----\n")
		builder.WriteString(wrapPEMBody(body))
		builder.WriteString("-----END ")
		builder.WriteString(endType)
		builder.WriteString("-----\n")
	}

	normalizedPEM := []byte(builder.String())
	if block, _ := pem.Decode(normalizedPEM); block == nil {
		return nil, true, fmt.Errorf("%s contains PEM markers but could not be normalized", label)
	}

	return normalizedPEM, true, nil
}

func compactPEMBody(body string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return -1
		}
		return r
	}, body)
}

func wrapPEMBody(body string) string {
	var builder strings.Builder
	for len(body) > 64 {
		builder.WriteString(body[:64])
		builder.WriteString("\n")
		body = body[64:]
	}
	builder.WriteString(body)
	builder.WriteString("\n")
	return builder.String()
}

func ensureSelfSignedCertificate(certFile string, keyFile string) error {
	if err := validateTLSCertificatePair(certFile, keyFile); err == nil {
		return nil
	}

	if err := generateSelfSignedCertificate(certFile, keyFile); err != nil {
		return fmt.Errorf("failed to generate self-signed certificate: %w", err)
	}

	if err := validateTLSCertificatePair(certFile, keyFile); err != nil {
		return fmt.Errorf("failed to load generated self-signed certificate: %w", err)
	}

	return nil
}

func generateSelfSignedCertificate(certFile string, keyFile string) error {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return err
	}

	serialLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialLimit)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			CommonName:   "DT3D self-signed certificate",
			Organization: []string{"DT3D"},
		},
		NotBefore:             now.Add(-time.Hour),
		NotAfter:              now.AddDate(5, 0, 0),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames: []string{
			"localhost",
			"homeassistant",
			"homeassistant.local",
		},
		IPAddresses: []net.IP{
			net.ParseIP("127.0.0.1"),
			net.ParseIP("::1"),
		},
	}
	template.IPAddresses = append(template.IPAddresses, localInterfaceIPs()...)

	certificateDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return err
	}

	certPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certificateDER,
	})
	keyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	})

	if err := os.WriteFile(certFile, certPEM, 0644); err != nil {
		return err
	}
	if err := os.WriteFile(keyFile, keyPEM, 0600); err != nil {
		return err
	}

	return nil
}

func localInterfaceIPs() []net.IP {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return nil
	}

	ips := make([]net.IP, 0, len(addrs))
	seen := make(map[string]struct{}, len(addrs))
	for _, addr := range addrs {
		var ip net.IP
		switch value := addr.(type) {
		case *net.IPNet:
			ip = value.IP
		case *net.IPAddr:
			ip = value.IP
		}

		if ip == nil || ip.IsLoopback() || ip.IsUnspecified() {
			continue
		}

		if ipv4 := ip.To4(); ipv4 != nil {
			ip = ipv4
		}

		key := ip.String()
		if _, exists := seen[key]; exists {
			continue
		}

		seen[key] = struct{}{}
		ips = append(ips, ip)
	}

	return ips
}
