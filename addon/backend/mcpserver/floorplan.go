package mcpserver

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"slices"
	"strings"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"
	"dt3d-ha/backend/service"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"gorm.io/gorm"
)

type point struct {
	X float64 `json:"x"`
	Z float64 `json:"z"`
}

type vector struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type pose struct {
	Position *vector `json:"position,omitempty" jsonschema:"Parent-local XYZ position in meters"`
	Rotation *vector `json:"rotation,omitempty" jsonschema:"Parent-local XYZ Euler angles in radians"`
	Scale    *vector `json:"scale,omitempty" jsonschema:"Parent-local scale, defaults to 1 on all axes"`
}

type surface struct {
	Color      string `json:"color,omitempty" jsonschema:"Hex RGB color used when no material is assigned"`
	MaterialID string `json:"material_id,omitempty" jsonschema:"Material UUID from list_materials"`
}

type wallInput struct {
	surface
	Name          string   `json:"name,omitempty"`
	Key           string   `json:"key,omitempty" jsonschema:"Unique key for referring to this wall from openings in the same call"`
	Start         point    `json:"start" jsonschema:"Start endpoint in the horizontal XZ plane"`
	End           point    `json:"end" jsonschema:"End endpoint in the horizontal XZ plane"`
	Y             float64  `json:"y,omitempty" jsonschema:"Bottom elevation in meters"`
	Height        *float64 `json:"height,omitempty" jsonschema:"Height in meters; default 2.4"`
	Thickness     *float64 `json:"thickness,omitempty" jsonschema:"Thickness in meters; default 0.2"`
	Customization document `json:"customization,omitempty" jsonschema:"Native wall settings: connectionShape (rectangle or circle), baseboardEnabled, baseboardHeight, baseboardDepth, baseboardColor"`
}

type floorPolygon struct {
	Points []point   `json:"points" jsonschema:"Outer boundary with three or more distinct points, without repeating the first point"`
	Holes  [][]point `json:"holes,omitempty" jsonschema:"Optional inner rings with three or more distinct points each"`
}

type floorInput struct {
	surface
	Name     string         `json:"name,omitempty"`
	Points   []point        `json:"points,omitempty" jsonschema:"Single outer boundary in the XZ plane; use polygons instead to define holes or multiple regions"`
	Polygons []floorPolygon `json:"polygons,omitempty"`
	Y        float64        `json:"y,omitempty" jsonschema:"Floor elevation in meters"`
}

type roomInput struct {
	Name       string   `json:"name"`
	Boundary   []point  `json:"boundary" jsonschema:"Closed room outline in XZ order without repeating the first point. Each edge creates a wall."`
	Y          float64  `json:"y,omitempty" jsonschema:"Floor elevation in meters"`
	WallHeight *float64 `json:"wall_height,omitempty"`
	Thickness  *float64 `json:"wall_thickness,omitempty"`
	WallStyle  surface  `json:"wall_style,omitempty"`
	FloorStyle surface  `json:"floor_style,omitempty"`
}

type openingInput struct {
	surface
	Name          string   `json:"name,omitempty"`
	Kind          string   `json:"kind" jsonschema:"door, window, or gate"`
	WallID        string   `json:"wall_id,omitempty" jsonschema:"ID of an existing wall, or use wall_key for a wall in this call"`
	WallKey       string   `json:"wall_key,omitempty" jsonschema:"Key of an explicitly supplied wall in this call"`
	Offset        float64  `json:"offset,omitempty" jsonschema:"Horizontal center measured from the wall midpoint along its start-to-end axis"`
	Bottom        *float64 `json:"bottom,omitempty" jsonschema:"Bottom of the opening above the wall base; default 0 for doors/gates and 0.9 for windows"`
	Width         *float64 `json:"width,omitempty"`
	Height        *float64 `json:"height,omitempty"`
	Thickness     *float64 `json:"thickness,omitempty"`
	Customization document `json:"customization,omitempty" jsonschema:"Native door/window/gate options. Supports openAmount and openEntityId, plus kind-specific settings such as hingeSide, panelCount, border, blinds or shutters."`
}

type furnitureInput struct {
	surface
	pose
	Name       string   `json:"name,omitempty"`
	Kind       string   `json:"kind" jsonschema:"Furniture preset ID from list_furniture, for example chair or kitchen-countertop"`
	ParentID   string   `json:"parent_id,omitempty"`
	Parameters document `json:"parameters,omitempty" jsonschema:"Preset-specific properties from list_furniture; omitted properties use the editor defaults"`
}

type floorplanInput struct {
	spaceIDInput
	Rooms     []roomInput      `json:"rooms,omitempty" jsonschema:"Create a floor and perimeter walls for each room. Use explicit walls for shared boundaries."`
	Walls     []wallInput      `json:"walls,omitempty"`
	Floors    []floorInput     `json:"floors,omitempty"`
	Openings  []openingInput   `json:"openings,omitempty"`
	Furniture []furnitureInput `json:"furniture,omitempty"`
}

type furnitureFilter struct {
	Query string `json:"query,omitempty" jsonschema:"Filter by preset name, ID or category"`
}

type furniturePreset struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Category   string   `json:"category"`
	Color      string   `json:"color"`
	Parameters document `json:"parameters"`
}

//go:embed furniture.json
var furnitureJSON []byte

var presets = func() []furniturePreset {
	var result []furniturePreset
	if err := json.Unmarshal(furnitureJSON, &result); err != nil {
		panic(err)
	}
	return result
}()

func (s *server) registerFloorplan(protocol *mcp.Server) {
	addTool(protocol, "build_floorplan", "Add one or more rooms, walls, floor polygons (including holes), doors, windows, gates or furniture pieces. Use individual lists to add a single element. All additions succeed together or are rolled back.", false, false, s.buildFloorplan)
	addTool(protocol, "add_floorplan_reference", "Add a horizontal reference image to a space, scaled using a known distance between two image-pixel locations.", false, false, s.addFloorplanReference)
	addTool(protocol, "list_furniture", "Find the procedural furniture presets in the DT3D editor. Use a search query to get preset defaults and allowed variants.", true, false, s.listFurniture)
}

func (s *server) listFurniture(_ context.Context, in furnitureFilter) (document, error) {
	query := strings.ToLower(strings.TrimSpace(in.Query))
	result := []document{}
	for _, preset := range presets {
		if strings.Contains(strings.ToLower(preset.ID+" "+preset.Name+" "+preset.Category), query) {
			entry := document{"id": preset.ID, "name": preset.Name, "category": preset.Category}
			if query != "" {
				entry["parameters"] = preset.Parameters
			}
			result = append(result, entry)
		}
	}
	return document{"furniture": result}, nil
}

func (s *server) buildFloorplan(ctx context.Context, in floorplanInput) (document, error) {
	count := len(in.Walls) + len(in.Floors) + len(in.Openings) + len(in.Furniture)
	for _, room := range in.Rooms {
		if err := validateRing(room.Boundary); err != nil {
			return nil, fmt.Errorf("room %q: %w", room.Name, err)
		}
		count += len(room.Boundary) + 1
	}
	if count < 1 || count > 500 {
		return nil, errors.New("supply between 1 and 500 floorplan elements per call")
	}
	for _, room := range in.Rooms {
		in.Floors = append(in.Floors, floorInput{surface: room.FloorStyle, Name: room.Name + " floor", Points: room.Boundary, Y: room.Y})
		for i, start := range room.Boundary {
			in.Walls = append(in.Walls, wallInput{
				surface: room.WallStyle, Name: fmt.Sprintf("%s wall %d", room.Name, i+1),
				Start: start, End: room.Boundary[(i+1)%len(room.Boundary)], Y: room.Y, Height: room.WallHeight, Thickness: room.Thickness,
			})
		}
	}

	results := make([]document, 0, count)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := checkSpace(tx, in.SpaceID); err != nil {
			return err
		}
		scene := spaces(tx)
		wallIDs := map[string]string{}
		for _, spec := range in.Walls {
			if _, exists := wallIDs[spec.Key]; exists {
				return fmt.Errorf("duplicate wall key %q", spec.Key)
			}
			object, err := makeWall(scene, in.SpaceID, spec)
			if err != nil {
				return fmt.Errorf("wall %q: %w", spec.Name, err)
			}
			if spec.Key != "" {
				wallIDs[spec.Key] = object.ID
			}
			entry := objectSummary(object)
			if spec.Key != "" {
				entry["key"] = spec.Key
			}
			results = append(results, entry)
		}
		for _, spec := range in.Floors {
			object, err := makeFloor(scene, in.SpaceID, spec)
			if err != nil {
				return fmt.Errorf("floor %q: %w", spec.Name, err)
			}
			results = append(results, objectSummary(object))
		}
		for _, spec := range in.Openings {
			object, err := makeOpening(scene, repository.NewObjectInstanceRepository(tx), in.SpaceID, wallIDs, spec)
			if err != nil {
				return fmt.Errorf("opening %q: %w", spec.Name, err)
			}
			results = append(results, objectSummary(object))
		}
		for _, spec := range in.Furniture {
			object, err := makeFurniture(scene, in.SpaceID, spec)
			if err != nil {
				return fmt.Errorf("furniture %q: %w", spec.Name, err)
			}
			results = append(results, objectSummary(object))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return document{"objects": results}, nil
}

func makeWall(scene *service.SpaceService, spaceID string, in wallInput) (*models.ObjectInstance, error) {
	dx, dz := in.End.X-in.Start.X, in.End.Z-in.Start.Z
	length := math.Hypot(dx, dz)
	if length < 0.001 || math.IsInf(length, 0) || invalidDimension(in.Height) || invalidDimension(in.Thickness) {
		return nil, errors.New("wall requires distinct endpoints and positive dimensions")
	}
	settings := in.Customization
	if settings == nil {
		settings = document{}
	}
	settings["length"] = length
	settings["height"] = numberOr(in.Height, 2.4)
	settings["thickness"] = numberOr(in.Thickness, 0.2)
	data := document{
		"meshType": "wall", "wall": settings,
		"position": vector{X: in.Start.X + dx/2, Y: in.Y, Z: in.Start.Z + dz/2},
		"rotation": vector{Y: -math.Atan2(dz, dx)},
	}
	in.surface.apply(data, "c9c7c2")
	return makeObject(scene, spaceID, "", named(in.Name, "Wall"), "mesh", data)
}

func makeFloor(scene *service.SpaceService, spaceID string, in floorInput) (*models.ObjectInstance, error) {
	polygons := in.Polygons
	switch {
	case len(polygons) == 0:
		polygons = []floorPolygon{{Points: in.Points}}
	case len(in.Points) > 0:
		return nil, errors.New("specify either points or polygons")
	}
	for i := range polygons {
		if err := validateRing(polygons[i].Points); err != nil {
			return nil, err
		}
		for _, hole := range polygons[i].Holes {
			if err := validateRing(hole); err != nil {
				return nil, fmt.Errorf("floor hole: %w", err)
			}
		}
		if polygons[i].Holes == nil {
			polygons[i].Holes = [][]point{}
		}
	}
	data := document{
		"meshType": "floor", "position": vector{Y: in.Y},
		"floor": document{"points": polygons[0].Points, "polygons": polygons, "automatic": false},
	}
	in.surface.apply(data, "b8b5aa")
	return makeObject(scene, spaceID, "", named(in.Name, "Floor"), "mesh", data)
}

func makeOpening(scene *service.SpaceService, objects *repository.ObjectInstanceRepository, spaceID string, wallIDs map[string]string, in openingInput) (*models.ObjectInstance, error) {
	if (in.WallID == "") == (in.WallKey == "") {
		return nil, errors.New("specify either wall_id or wall_key")
	}
	wallID := in.WallID
	if in.WallKey != "" {
		wallID = wallIDs[in.WallKey]
		if wallID == "" {
			return nil, fmt.Errorf("unknown wall key %q", in.WallKey)
		}
	}
	wall, err := objects.FindByID(wallID)
	if err != nil {
		return nil, err
	}
	if wall.SpaceID != spaceID {
		return nil, errors.New("wall must belong to the same space")
	}
	var wallData struct {
		MeshType string `json:"meshType"`
		Wall     struct {
			Length *float64 `json:"length"`
			Height *float64 `json:"height"`
		} `json:"wall"`
	}
	if err := json.Unmarshal(wall.Data, &wallData); err != nil {
		return nil, err
	}
	if wall.Type != "mesh" || wallData.MeshType != "wall" {
		return nil, errors.New("opening parent must be a wall")
	}
	var name, color string
	var width, height, thickness, bottom float64
	switch in.Kind {
	case "door":
		name, color, width, height, thickness = "Door", "a47648", 0.9, 2.1, 0.08
	case "window":
		name, color, width, height, thickness, bottom = "Window", "9bd9ff", 1.2, 1, 0.06, 0.9
	case "gate":
		name, color, width, height, thickness = "Gate", "454b50", 2.4, 2, 0.06
	default:
		return nil, errors.New("opening kind must be door, window, or gate")
	}
	width, height = numberOr(in.Width, width), numberOr(in.Height, height)
	thickness, bottom = numberOr(in.Thickness, thickness), numberOr(in.Bottom, bottom)
	if width <= 0 || height <= 0 || thickness <= 0 || bottom < 0 {
		return nil, errors.New("opening requires positive dimensions and a non-negative bottom")
	}
	if math.Abs(in.Offset)+width/2 > numberOr(wallData.Wall.Length, 2)/2+0.001 || bottom+height > numberOr(wallData.Wall.Height, 2.4)+0.001 {
		return nil, errors.New("opening must fit within the wall")
	}
	data := document{
		"meshType": in.Kind, "position": vector{X: in.Offset, Y: bottom},
		"dimensions": document{"width": width, "height": height, "thickness": thickness},
	}
	if in.Customization != nil {
		data[in.Kind] = in.Customization
	}
	in.surface.apply(data, color)
	return makeObject(scene, spaceID, wallID, named(in.Name, name), "mesh", data)
}

func makeFurniture(scene *service.SpaceService, spaceID string, in furnitureInput) (*models.ObjectInstance, error) {
	kind := strings.TrimPrefix(in.Kind, "furniture-")
	index := slices.IndexFunc(presets, func(preset furniturePreset) bool { return preset.ID == kind })
	if index < 0 {
		return nil, fmt.Errorf("unknown furniture preset %q; use list_furniture", in.Kind)
	}
	data := document{"meshType": "furniture-" + kind}
	if in.Parameters != nil {
		data["furniture"] = in.Parameters
	}
	in.pose.apply(data)
	in.surface.apply(data, presets[index].Color)
	return makeObject(scene, spaceID, in.ParentID, named(in.Name, presets[index].Name), "mesh", data)
}

func (in pose) apply(data document) {
	if in.Position != nil {
		data["position"] = in.Position
	}
	if in.Rotation != nil {
		data["rotation"] = in.Rotation
	}
	if in.Scale != nil {
		data["scale"] = in.Scale
	}
}

func (in surface) apply(data document, defaultColor string) {
	if color := named(in.Color, defaultColor); color != "" {
		data["color"] = color
	}
	if in.MaterialID != "" {
		data["material"] = in.MaterialID
	}
}

func validateRing(ring []point) error {
	if len(ring) < 3 || len(ring) > 4096 {
		return errors.New("a polygon requires 3 to 4096 distinct points")
	}
	seen := map[point]bool{}
	var area float64
	for i, p := range ring {
		if seen[p] {
			return errors.New("polygon has a repeated point")
		}
		seen[p] = true
		next := ring[(i+1)%len(ring)]
		area += p.X*next.Z - next.X*p.Z
	}
	if math.Abs(area) < 0.0002 || math.IsInf(area, 0) || math.IsNaN(area) {
		return errors.New("polygon must enclose a nonzero area")
	}
	return nil
}

func named(value, fallback string) string {
	if value = strings.TrimSpace(value); value != "" {
		return value
	}
	return fallback
}

func numberOr(value *float64, fallback float64) float64 {
	if value != nil {
		return *value
	}
	return fallback
}

func invalidDimension(value *float64) bool {
	return value != nil && *value <= 0
}
