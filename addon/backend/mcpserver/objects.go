package mcpserver

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"
	"dt3d-ha/backend/service"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"gorm.io/gorm"
)

type listObjectsInput struct {
	spaceIDInput
	IncludeGeometry bool `json:"include_geometry,omitempty" jsonschema:"Include inline geometry from older saved models"`
}

type objectIDInput struct {
	spaceIDInput
	ObjectID string `json:"object_id" jsonschema:"Object ID from list_objects"`
}

type createObjectInput struct {
	spaceIDInput
	Name     string   `json:"name"`
	Type     string   `json:"type" jsonschema:"DT3D type: mesh, group, entity, viewport, or static-light"`
	ParentID string   `json:"parent_id,omitempty" jsonschema:"Optional parent object in the same space"`
	Data     document `json:"data,omitempty" jsonschema:"Native scene data. Includes position, rotation, scale, meshType, geometryParameters, material, locked, entityId, entityRules, light, and viewport as applicable."`
}

type editObjectInput struct {
	objectIDInput
	Name     *string  `json:"name,omitempty"`
	ParentID string   `json:"parent_id,omitempty" jsonschema:"Move to this parent. Specify updated local transforms in data if needed."`
	Detach   bool     `json:"detach,omitempty" jsonschema:"Move to the root of the space"`
	Data     document `json:"data,omitempty" jsonschema:"Recursive patch of native object data. Use position/rotation/scale for transforms, material for a material ID or array of IDs, and null to remove a field."`
}

func (s *server) registerObjects(protocol *mcp.Server) {
	addTool(protocol, "list_objects", "List the scene objects with parent IDs and editable data. Use parent IDs to reconstruct the hierarchy.", true, false, s.listObjects)
	addTool(protocol, "create_object", "Create a native DT3D object. Supports groups, lights, viewports, Home Assistant entity bindings, and primitive meshType values cube, sphere, plane, capsule, circle, cone, cylinder, dodecahedron, icosahedron, octahedron, ring, tetrahedron, torus and torusKnot. Use build_floorplan for procedural architecture and furniture.", false, false, s.createObject)
	addTool(protocol, "edit_object", "Rename, move, rotate, scale, reparent, change material or edit the native properties of a scene object.", false, true, s.editObject)
	addTool(protocol, "delete_object", "Delete a scene object and all its descendants.", false, true, s.deleteObject)
}

func (s *server) listObjects(ctx context.Context, in listObjectsInput) (document, error) {
	db := s.db.WithContext(ctx)
	if err := checkSpace(db, in.SpaceID); err != nil {
		return nil, err
	}
	objects, err := spaces(db).ListObjectInstances(in.SpaceID)
	if err != nil {
		return nil, err
	}
	result := make([]document, 0, len(objects))
	for _, object := range objects {
		entry, err := objectDetails(&object, in.IncludeGeometry)
		if err != nil {
			return nil, err
		}
		result = append(result, entry)
	}
	return document{"objects": result}, nil
}

func (s *server) createObject(ctx context.Context, in createObjectInput) (document, error) {
	kind := strings.ToLower(strings.TrimSpace(in.Type))
	switch kind {
	case "mesh", "group", "entity", "viewport", "static-light":
	default:
		return nil, fmt.Errorf("unknown object type %q", in.Type)
	}
	if kind == "entity" {
		id, _ := in.Data["entityId"].(string)
		if !strings.Contains(id, ".") {
			return nil, errors.New("entity objects require a Home Assistant entityId such as light.kitchen")
		}
	}

	var object *models.ObjectInstance
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		object, err = makeObject(spaces(tx), in.SpaceID, in.ParentID, in.Name, kind, in.Data)
		return err
	})
	if err != nil {
		return nil, err
	}
	return objectDetails(object, false)
}

func (s *server) editObject(ctx context.Context, in editObjectInput) (document, error) {
	if in.Detach && in.ParentID != "" {
		return nil, errors.New("specify either detach or parent_id")
	}
	var updated *models.ObjectInstance
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		objects := repository.NewObjectInstanceRepository(tx)
		object, err := objects.FindByID(in.ObjectID)
		if err != nil {
			return err
		}
		if object.SpaceID != in.SpaceID {
			return gorm.ErrRecordNotFound
		}
		if in.Name != nil {
			object.Name = *in.Name
		}
		data, err := readDocument(object.Data)
		if err != nil {
			return err
		}
		if err := object.SetData(patchDocument(data, in.Data)); err != nil {
			return err
		}

		payload := service.UpdateObjectInstanceInput{
			Name: object.Name, Type: object.Type, Data: object.Data,
			ParentID: optionalID(in.ParentID), ParentProvided: in.Detach || in.ParentID != "",
		}
		if in.ParentID != "" {
			if err := checkParentChain(objects, in.SpaceID, in.ObjectID, in.ParentID); err != nil {
				return err
			}
		}
		updated, err = spaces(tx).UpdateObjectInstance(in.SpaceID, in.ObjectID, payload)
		return err
	})
	if err != nil {
		return nil, err
	}
	return objectDetails(updated, false)
}

func checkParentChain(objects *repository.ObjectInstanceRepository, spaceID, objectID, parentID string) error {
	visited := map[string]bool{objectID: true}
	for parentID != "" {
		if visited[parentID] {
			return errors.New("reparenting would use a cyclic object hierarchy")
		}
		visited[parentID] = true
		parent, err := objects.FindByID(parentID)
		if err != nil {
			return err
		}
		if parent.SpaceID != spaceID {
			return errors.New("parent object must belong to the same space")
		}
		if parent.ParentID == nil {
			return nil
		}
		parentID = *parent.ParentID
	}
	return nil
}

func (s *server) deleteObject(ctx context.Context, in objectIDInput) (document, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return spaces(tx).DeleteObjectInstance(in.SpaceID, in.ObjectID)
	})
	if err != nil {
		return nil, err
	}
	return document{"deleted_object_id": in.ObjectID}, nil
}

func makeObject(scene *service.SpaceService, spaceID, parentID, name, kind string, data any) (*models.ObjectInstance, error) {
	object := &models.ObjectInstance{Name: name, Type: kind, ParentID: optionalID(parentID)}
	if err := object.SetData(data); err != nil {
		return nil, err
	}
	return object, scene.CreateObjectInstance(spaceID, object)
}

func optionalID(id string) *string {
	if id == "" {
		return nil
	}
	return &id
}

func checkSpace(db *gorm.DB, id string) error {
	var space models.Space
	return db.Select("id").First(&space, "id = ?", id).Error
}

func objectDetails(object *models.ObjectInstance, includeGeometry bool) (document, error) {
	data, err := readDocument(object.Data)
	if err != nil {
		return nil, err
	}
	if !includeGeometry {
		delete(data, "geometry")
	}
	return document{"id": object.ID, "space_id": object.SpaceID, "parent_id": object.ParentID, "name": object.Name, "type": object.Type, "data": data}, nil
}

func objectSummary(object *models.ObjectInstance) document {
	return document{"id": object.ID, "name": object.Name, "type": object.Type, "parent_id": object.ParentID}
}
