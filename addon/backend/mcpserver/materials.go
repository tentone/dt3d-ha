package mcpserver

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"dt3d-ha/backend/repository"

	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type listMaterialsInput struct {
	spaceIDInput
	IncludeImages bool `json:"include_images,omitempty" jsonschema:"Include image payloads for texture editing or export"`
}

type materialIDInput struct {
	spaceIDInput
	MaterialID string `json:"material_id" jsonschema:"Material UUID from list_materials"`
}

type saveMaterialInput struct {
	spaceIDInput
	MaterialID string   `json:"material_id,omitempty" jsonschema:"Existing material UUID to replace. Omit to create a new material."`
	Name       string   `json:"name,omitempty"`
	Color      string   `json:"color,omitempty" jsonschema:"Six-digit hex RGB color, such as #d6b28c"`
	Roughness  *float64 `json:"roughness,omitempty"`
	Metalness  *float64 `json:"metalness,omitempty"`
	Definition document `json:"definition,omitempty" jsonschema:"Full Three.js material JSON for advanced materials, including textures and images from data URLs. Overrides the simple defaults."`
}

func (s *server) registerMaterials(protocol *mcp.Server) {
	addTool(protocol, "list_materials", "List the space material definitions and texture references. Reuse a material UUID in build_floorplan or edit_object.", true, false, s.listMaterials)
	addTool(protocol, "save_material", "Create or replace a shared material, including textured Three.js materials. Editing a shared material updates every object using it.", false, true, s.saveMaterial)
	addTool(protocol, "delete_material", "Delete a material from the library if no object uses it.", false, true, s.deleteMaterial)
}

func (s *server) listMaterials(ctx context.Context, in listMaterialsInput) (document, error) {
	space, err := spaces(s.db.WithContext(ctx)).GetSpaceByID(in.SpaceID)
	if err != nil {
		return nil, err
	}
	config, err := readDocument(space.Config)
	if err != nil {
		return nil, err
	}
	entries, _ := config["materials"].([]any)
	if !in.IncludeImages {
		for _, value := range entries {
			if entry, ok := value.(document); ok {
				delete(entry, "images")
			}
		}
	}
	return document{"materials": entries}, nil
}

func (s *server) saveMaterial(ctx context.Context, in saveMaterialInput) (document, error) {
	definition := document{"type": "MeshStandardMaterial", "color": 0xffffff, "roughness": 1, "metalness": 0}
	if in.Definition != nil {
		if kind, ok := in.Definition["type"].(string); !ok || kind == "" {
			return nil, errors.New("definition.type is required")
		}
		definition = in.Definition
	}
	if in.Name != "" {
		definition["name"] = in.Name
	}
	if in.Color != "" {
		value := strings.TrimPrefix(in.Color, "#")
		color, err := strconv.ParseUint(value, 16, 24)
		if err != nil || len(value) != 6 {
			return nil, errors.New("color must contain six hex digits")
		}
		definition["color"] = color
	}
	for key, value := range map[string]*float64{"roughness": in.Roughness, "metalness": in.Metalness} {
		if value != nil {
			if *value < 0 || *value > 1 {
				return nil, fmt.Errorf("%s must be between 0 and 1", key)
			}
			definition[key] = *value
		}
	}
	id := in.MaterialID
	if id == "" {
		id = uuid.NewString()
	}
	definition["uuid"] = id
	if err := repository.StoreMaterial(s.db.WithContext(ctx), in.SpaceID, definition); err != nil {
		return nil, err
	}
	return document{"material_id": id}, nil
}

func (s *server) deleteMaterial(ctx context.Context, in materialIDInput) (document, error) {
	if err := repository.DeleteMaterial(s.db.WithContext(ctx), in.SpaceID, in.MaterialID); err != nil {
		return nil, err
	}
	return document{"deleted_material_id": in.MaterialID}, nil
}
