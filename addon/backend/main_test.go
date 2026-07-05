package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolveTLSCertificatePathsAcceptsFilePaths(t *testing.T) {
	dir, certPath, keyPath, _, _ := newTestTLSCertificatePair(t)

	certFile, keyFile, useTLS, err := resolveTLSCertificatePathsWithDefaults(
		options{
			SSLCertificate: certPath,
			SSLKey:         keyPath,
		},
		filepath.Join(dir, "self-signed.crt"),
		filepath.Join(dir, "self-signed.key"),
		filepath.Join(dir, "configured.crt"),
		filepath.Join(dir, "configured.key"),
	)
	if err != nil {
		t.Fatalf("resolveTLSCertificatePathsWithDefaults returned error: %v", err)
	}
	if !useTLS {
		t.Fatal("expected TLS to be enabled")
	}
	if certFile != certPath {
		t.Fatalf("expected certificate path %q, got %q", certPath, certFile)
	}
	if keyFile != keyPath {
		t.Fatalf("expected key path %q, got %q", keyPath, keyFile)
	}
}

func TestResolveTLSCertificatePathsAcceptsInlinePEM(t *testing.T) {
	dir, _, _, certPEM, keyPEM := newTestTLSCertificatePair(t)
	configuredCert := filepath.Join(dir, "configured.crt")
	configuredKey := filepath.Join(dir, "configured.key")

	certFile, keyFile, useTLS, err := resolveTLSCertificatePathsWithDefaults(
		options{
			SSLCertificate: certPEM,
			SSLKey:         keyPEM,
		},
		filepath.Join(dir, "self-signed.crt"),
		filepath.Join(dir, "self-signed.key"),
		configuredCert,
		configuredKey,
	)
	if err != nil {
		t.Fatalf("resolveTLSCertificatePathsWithDefaults returned error: %v", err)
	}
	if !useTLS {
		t.Fatal("expected TLS to be enabled")
	}
	if certFile != configuredCert {
		t.Fatalf("expected configured certificate path %q, got %q", configuredCert, certFile)
	}
	if keyFile != configuredKey {
		t.Fatalf("expected configured key path %q, got %q", configuredKey, keyFile)
	}
	if err := validateTLSCertificatePair(certFile, keyFile); err != nil {
		t.Fatalf("written inline certificate/key pair is invalid: %v", err)
	}
}

func TestResolveTLSCertificatePathsAcceptsSingleLineInlinePEM(t *testing.T) {
	dir, _, _, certPEM, keyPEM := newTestTLSCertificatePair(t)
	configuredCert := filepath.Join(dir, "configured.crt")
	configuredKey := filepath.Join(dir, "configured.key")

	certFile, keyFile, useTLS, err := resolveTLSCertificatePathsWithDefaults(
		options{
			SSLCertificate: singleLinePEM(certPEM),
			SSLKey:         singleLinePEM(keyPEM),
		},
		filepath.Join(dir, "self-signed.crt"),
		filepath.Join(dir, "self-signed.key"),
		configuredCert,
		configuredKey,
	)
	if err != nil {
		t.Fatalf("resolveTLSCertificatePathsWithDefaults returned error: %v", err)
	}
	if !useTLS {
		t.Fatal("expected TLS to be enabled")
	}
	if certFile != configuredCert {
		t.Fatalf("expected configured certificate path %q, got %q", configuredCert, certFile)
	}
	if keyFile != configuredKey {
		t.Fatalf("expected configured key path %q, got %q", configuredKey, keyFile)
	}
	if err := validateTLSCertificatePair(certFile, keyFile); err != nil {
		t.Fatalf("normalized inline certificate/key pair is invalid: %v", err)
	}
}

func TestResolveTLSCertificatePathsAcceptsMixedPathAndInlinePEM(t *testing.T) {
	dir, _, keyPath, certPEM, _ := newTestTLSCertificatePair(t)
	configuredCert := filepath.Join(dir, "configured.crt")
	configuredKey := filepath.Join(dir, "configured.key")

	certFile, keyFile, useTLS, err := resolveTLSCertificatePathsWithDefaults(
		options{
			SSLCertificate: certPEM,
			SSLKey:         keyPath,
		},
		filepath.Join(dir, "self-signed.crt"),
		filepath.Join(dir, "self-signed.key"),
		configuredCert,
		configuredKey,
	)
	if err != nil {
		t.Fatalf("resolveTLSCertificatePathsWithDefaults returned error: %v", err)
	}
	if !useTLS {
		t.Fatal("expected TLS to be enabled")
	}
	if certFile != configuredCert {
		t.Fatalf("expected configured certificate path %q, got %q", configuredCert, certFile)
	}
	if keyFile != keyPath {
		t.Fatalf("expected original key path %q, got %q", keyPath, keyFile)
	}
	if _, err := os.Stat(configuredKey); !os.IsNotExist(err) {
		t.Fatalf("expected no configured key file for path-based key, stat err: %v", err)
	}
}

func TestResolveTLSCertificatePathsFallsBackToSelfSignedForInvalidInlinePEM(t *testing.T) {
	dir := t.TempDir()
	selfSignedCert := filepath.Join(dir, "self-signed.crt")
	selfSignedKey := filepath.Join(dir, "self-signed.key")

	certFile, keyFile, useTLS, err := resolveTLSCertificatePathsWithDefaults(
		options{
			SSLCertificate:           "-----BEGIN CERTIFICATE----- invalid -----END CERTIFICATE-----",
			SSLKey:                   "-----BEGIN PRIVATE KEY----- invalid -----END PRIVATE KEY-----",
			UseSelfSignedCertificate: true,
		},
		selfSignedCert,
		selfSignedKey,
		filepath.Join(dir, "configured.crt"),
		filepath.Join(dir, "configured.key"),
	)
	if err != nil {
		t.Fatalf("resolveTLSCertificatePathsWithDefaults returned error: %v", err)
	}
	if !useTLS {
		t.Fatal("expected TLS to be enabled")
	}
	if certFile != selfSignedCert {
		t.Fatalf("expected self-signed certificate path %q, got %q", selfSignedCert, certFile)
	}
	if keyFile != selfSignedKey {
		t.Fatalf("expected self-signed key path %q, got %q", selfSignedKey, keyFile)
	}
	if err := validateTLSCertificatePair(certFile, keyFile); err != nil {
		t.Fatalf("self-signed fallback certificate/key pair is invalid: %v", err)
	}
}

func newTestTLSCertificatePair(t *testing.T) (string, string, string, string, string) {
	t.Helper()

	dir := t.TempDir()
	certPath := filepath.Join(dir, "cert.pem")
	keyPath := filepath.Join(dir, "key.pem")
	if err := generateSelfSignedCertificate(certPath, keyPath); err != nil {
		t.Fatalf("failed to generate test certificate: %v", err)
	}

	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		t.Fatalf("failed to read test certificate: %v", err)
	}
	keyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		t.Fatalf("failed to read test key: %v", err)
	}

	return dir, certPath, keyPath, string(certPEM), string(keyPEM)
}

func singleLinePEM(value string) string {
	return strings.Join(strings.Fields(value), " ")
}
