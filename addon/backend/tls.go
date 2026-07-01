package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"os"
	"time"
)

func validateTLSCertificatePair(certFile string, keyFile string) error {
	if certFile == "" || keyFile == "" {
		return fmt.Errorf("both ssl_certificate and ssl_key must be configured to enable HTTPS")
	}

	if err := validateTLSFile(certFile, "ssl_certificate"); err != nil {
		return err
	}
	if err := validateTLSFile(keyFile, "ssl_key"); err != nil {
		return err
	}

	if _, err := tls.LoadX509KeyPair(certFile, keyFile); err != nil {
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
