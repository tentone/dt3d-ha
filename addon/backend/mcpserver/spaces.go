package mcpserver

import (
	"context"
	"encoding/json"
	"errors"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/service"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"gorm.io/gorm"
)

type createSpaceInput struct {
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	IsDefault   bool     `json:"is_default,omitempty"`
	Config      document `json:"config,omitempty" jsonschema:"Optional DT3D space settings such as floorplan or scene configuration"`
}

type editSpaceInput struct {
	spaceIDInput
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	IsDefault   *bool    `json:"is_default,omitempty"`
	Config      document `json:"config,omitempty" jsonschema:"Recursive patch of DT3D space settings. Null values remove keys. Manage materials with the material tools."`
}

func (s *server) registerSpaces(protocol *mcp.Server) {
	addTool(protocol, "list_spaces", "List saved spaces and their IDs, names, descriptions and default status.", true, false, s.listSpaces)
	addTool(protocol, "get_space", "Read a space's settings, including its cache version. Use list_objects and list_materials for scene contents.", true, false, s.getSpace)
	addTool(protocol, "create_space", "Create an empty DT3D space. The first space becomes the default.", false, false, s.createSpace)
	addTool(protocol, "edit_space", "Change a space's name, description, default status or scene and floorplan settings. Omitted fields retain their values.", false, true, s.editSpace)
	addTool(protocol, "delete_space", "Permanently delete a space and its objects, materials and geometry files.", false, true, s.removeSpace)
}

func (s *server) listSpaces(ctx context.Context, _ struct{}) (document, error) {
	var entries []models.Space
	if err := s.db.WithContext(ctx).Select("id", "name", "description", "is_default", "cache_version").Order("created_at, id").Find(&entries).Error; err != nil {
		return nil, err
	}
	result := make([]document, 0, len(entries))
	for _, space := range entries {
		result = append(result, spaceDetails(&space))
	}
	return document{"spaces": result}, nil
}

func (s *server) getSpace(ctx context.Context, in spaceIDInput) (document, error) {
	space, err := spaces(s.db.WithContext(ctx)).GetSpaceByID(in.SpaceID)
	if err != nil {
		return nil, err
	}
	return spaceWithConfig(space)
}

func (s *server) createSpace(ctx context.Context, in createSpaceInput) (document, error) {
	if _, ok := in.Config["materials"]; ok {
		return nil, errors.New("use save_material to manage the material library")
	}
	config, err := json.Marshal(in.Config)
	if err != nil {
		return nil, err
	}
	space := &models.Space{Name: in.Name, Description: in.Description, IsDefault: in.IsDefault, Config: config}
	if err := spaces(s.db.WithContext(ctx)).CreateSpace(space); err != nil {
		return nil, err
	}
	return spaceWithConfig(space)
}

func (s *server) editSpace(ctx context.Context, in editSpaceInput) (document, error) {
	if _, ok := in.Config["materials"]; ok {
		return nil, errors.New("use save_material and delete_material to manage the material library")
	}
	var updated *models.Space
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		scene := spaces(tx)
		space, err := scene.GetSpaceByID(in.SpaceID)
		if err != nil {
			return err
		}
		payload := service.UpdateSpaceInput{Name: space.Name, Description: space.Description, IsDefault: in.IsDefault}
		if in.Name != nil {
			payload.Name = *in.Name
		}
		if in.Description != nil {
			payload.Description = *in.Description
		}
		config, err := readDocument(space.Config)
		if err != nil {
			return err
		}
		// The independent material registry is already stored in the database.
		delete(config, "materials")
		payload.Config, err = json.Marshal(patchDocument(config, in.Config))
		if err != nil {
			return err
		}
		updated, err = scene.UpdateSpace(in.SpaceID, payload)
		return err
	})
	if err != nil {
		return nil, err
	}
	return spaceWithConfig(updated)
}

func (s *server) removeSpace(_ context.Context, in spaceIDInput) (document, error) {
	if err := s.deleteSpace(in.SpaceID); err != nil {
		return nil, err
	}
	return document{"deleted_space_id": in.SpaceID}, nil
}

func spaceDetails(space *models.Space) document {
	return document{"id": space.ID, "name": space.Name, "description": space.Description, "is_default": space.IsDefault, "cache_version": space.CacheVersion}
}

func spaceWithConfig(space *models.Space) (document, error) {
	config, err := readDocument(space.Config)
	if err != nil {
		return nil, err
	}
	delete(config, "materials")
	result := spaceDetails(space)
	result["config"] = config
	return result, nil
}

func readDocument(raw []byte) (document, error) {
	data := document{}
	if len(raw) != 0 {
		if err := json.Unmarshal(raw, &data); err != nil {
			return nil, err
		}
	}
	if data == nil {
		data = document{}
	}
	return data, nil
}

// patchDocument applies a JSON Merge Patch to an object.
func patchDocument(target, patch document) document {
	for key, value := range patch {
		switch value := value.(type) {
		case nil:
			delete(target, key)
		case document:
			nested, ok := target[key].(document)
			if !ok {
				nested = document{}
			}
			target[key] = patchDocument(nested, value)
		default:
			target[key] = value
		}
	}
	return target
}
