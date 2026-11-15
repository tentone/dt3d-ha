package mcpserver

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"dt3d-ha/backend/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const maxUploadBytes = 32 << 20

type modelFile struct {
	Name   string `json:"name" jsonschema:"Relative filename with extension. Use relative folders to preserve dependencies."`
	Base64 string `json:"base64" jsonschema:"Base64-encoded file bytes"`
}

type importInput struct {
	spaceIDInput
	pose
	File     modelFile   `json:"file"`
	Assets   []modelFile `json:"assets,omitempty" jsonschema:"Companion files such as textures, .bin files and OBJ .mtl files. Limit 32 MiB of decoded data total."`
	Name     string      `json:"name,omitempty" jsonschema:"Name of the imported group; defaults to the model filename"`
	ParentID string      `json:"parent_id,omitempty" jsonschema:"Optional parent in the target space"`
}

type convertedScene struct {
	Objects []struct {
		Name     string
		Type     string
		Parent   int
		Geometry *int
		Data     document
	}
	Materials  []document
	Geometries int
}

func (s *server) importModel(ctx context.Context, in importInput) (document, error) {
	switch strings.ToLower(filepath.Ext(in.File.Name)) {
	case ".glb", ".gltf", ".obj", ".fbx", ".dae", ".stl", ".3ds":
	default:
		return nil, errors.New("supported formats are GLB, glTF, OBJ, FBX, DAE, STL and 3DS")
	}
	if err := validateFiles(in.File, in.Assets); err != nil {
		return nil, err
	}
	if _, err := uuid.Parse(in.SpaceID); err != nil {
		return nil, errors.New("invalid space ID")
	}
	if err := checkSpace(s.db.WithContext(ctx), in.SpaceID); err != nil {
		return nil, err
	}
	select {
	case s.importSlot <- struct{}{}:
		defer func() { <-s.importSlot }()
	default:
		return nil, errors.New("another model import is in progress; try again after it completes")
	}

	workDir, err := os.MkdirTemp("", "dt3d-model-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(workDir)
	if err := writeImportInput(workDir, in); err != nil {
		return nil, err
	}
	converted, err := s.convertModel(ctx, workDir)
	if err != nil {
		return nil, err
	}
	return s.storeModel(ctx, in, workDir, converted)
}

func validateFiles(file modelFile, assets []modelFile) error {
	if len(assets) > 255 {
		return errors.New("a model import accepts at most 255 companion files")
	}
	var total int
	for _, entry := range append([]modelFile{file}, assets...) {
		if entry.Name == "" || strings.ContainsRune(entry.Name, 0) || strings.TrimSpace(entry.Base64) == "" {
			return errors.New("all uploaded files require a name and non-empty base64 data")
		}
		n, err := io.Copy(io.Discard, base64.NewDecoder(base64.StdEncoding, strings.NewReader(entry.Base64)))
		if err != nil || n == 0 {
			return fmt.Errorf("invalid base64 data for %q", entry.Name)
		}
		total += int(n)
		if total > maxUploadBytes {
			return errors.New("model and companion files exceed the 32 MiB upload limit")
		}
	}
	return nil
}

func writeImportInput(workDir string, in importInput) error {
	file, err := os.OpenFile(filepath.Join(workDir, "input.json"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	encodeErr := json.NewEncoder(file).Encode(in)
	return errors.Join(encodeErr, file.Close())
}

func (s *server) convertModel(ctx context.Context, workDir string) (*convertedScene, error) {
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	script, err := filepath.Abs(s.importScript)
	if err != nil {
		return nil, err
	}
	cmd := exec.CommandContext(ctx, "node", "--max-old-space-size=256", "--permission", "--allow-worker",
		"--allow-fs-read="+filepath.Dir(script), "--allow-fs-read="+workDir, "--allow-fs-write="+workDir, script, workDir)
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("model conversion interrupted: %w", ctx.Err())
		}
		if detail, readErr := os.ReadFile(filepath.Join(workDir, "error.txt")); readErr == nil {
			return nil, fmt.Errorf("model conversion failed: %s", strings.TrimSpace(string(detail)))
		}
		return nil, fmt.Errorf("failed to run the add-on model converter: %w", err)
	}
	result, err := os.Open(filepath.Join(workDir, "scene.json"))
	if err != nil {
		return nil, errors.New("converter produced no scene")
	}
	defer result.Close()
	scene := &convertedScene{}
	if err := json.NewDecoder(result).Decode(scene); err != nil {
		return nil, fmt.Errorf("read converted scene: %w", err)
	}
	return scene, nil
}

func (s *server) storeModel(ctx context.Context, in importInput, workDir string, model *convertedScene) (document, error) {
	createdFiles := make([]string, 0, model.Geometries)
	result := document{}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		scene := spaces(tx)
		data := document{}
		in.pose.apply(data)
		root, err := makeObject(scene, in.SpaceID, in.ParentID, named(in.Name, filepath.Base(in.File.Name)), "group", data)
		if err != nil {
			return err
		}
		for _, material := range model.Materials {
			if err := repository.StoreMaterial(tx, in.SpaceID, material); err != nil {
				return err
			}
		}
		geometryIDs := make([]string, model.Geometries)
		for i := range geometryIDs {
			id := uuid.NewString()
			path := filepath.Join(s.geometryDir, in.SpaceID, id+".dt3dgeo")
			createdFiles = append(createdFiles, path)
			if err := copyGeometry(filepath.Join(workDir, fmt.Sprintf("geometry-%d.dt3dgeo", i)), path); err != nil {
				return fmt.Errorf("store converted geometry: %w", err)
			}
			geometryIDs[i] = id
		}
		objectIDs := make([]string, 0, len(model.Objects))
		meshCount := 0
		for _, node := range model.Objects {
			parentID := root.ID
			if node.Parent >= 0 {
				parentID = objectIDs[node.Parent]
			}
			if node.Geometry != nil {
				node.Data["geometryFileId"] = geometryIDs[*node.Geometry]
				meshCount++
			}
			object, err := makeObject(scene, in.SpaceID, parentID, node.Name, node.Type, node.Data)
			if err != nil {
				return err
			}
			objectIDs = append(objectIDs, object.ID)
		}
		result = document{"group": objectSummary(root), "mesh_count": meshCount}
		return nil
	})
	if err != nil {
		for _, path := range createdFiles {
			if cleanupErr := os.Remove(path); cleanupErr != nil && !os.IsNotExist(cleanupErr) {
				err = errors.Join(err, cleanupErr)
			}
		}
		return nil, err
	}
	return result, nil
}

func copyGeometry(source, destination string) error {
	in, err := os.Open(source)
	if err != nil {
		return err
	}
	defer in.Close()
	if err := os.MkdirAll(filepath.Dir(destination), 0750); err != nil {
		return err
	}
	out, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		return err
	}
	_, err = io.Copy(out, in)
	return errors.Join(err, out.Close())
}
