package service

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"

	"github.com/google/uuid"
)

type StoredFileService struct {
	files    *repository.StoredFileRepository
	dataPath string
}

func NewStoredFileService(fileRepo *repository.StoredFileRepository, dataPath string) *StoredFileService {
	return &StoredFileService{files: fileRepo, dataPath: dataPath}
}

type CreateStoredFileInput struct {
	Filename string
	Reader   io.Reader
}

func (s *StoredFileService) CreateFile(input CreateStoredFileInput) (*models.StoredFile, error) {
	input.Filename = strings.TrimSpace(input.Filename)
	if input.Filename == "" {
		return nil, errors.New("filename is required")
	}
	if input.Reader == nil {
		return nil, errors.New("file content is required")
	}

	if err := os.MkdirAll(s.dataPath, 0o755); err != nil {
		return nil, fmt.Errorf("failed to ensure data directory: %w", err)
	}

	ext := strings.TrimPrefix(filepath.Ext(input.Filename), ".")
	if ext == "" {
		ext = "bin"
	}

	fileID := uuid.NewString()
	storageName := fmt.Sprintf("%s.%s", fileID, ext)
	storagePath := filepath.Join(s.dataPath, storageName)

	out, err := os.Create(storagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, input.Reader); err != nil {
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	record := &models.StoredFile{
		Filename:    input.Filename,
		Format:      ext,
		StoragePath: storagePath,
	}

	if err := s.files.Create(record); err != nil {
		_ = os.Remove(storagePath)
		return nil, fmt.Errorf("failed to persist file metadata: %w", err)
	}

	return record, nil
}

func (s *StoredFileService) DeleteFile(id string) error {
	record, err := s.files.FindByID(id)
	if err != nil {
		return err
	}

	if err := os.Remove(record.StoragePath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("failed to delete stored file: %w", err)
	}

	if err := s.files.Delete(id); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	return nil
}
