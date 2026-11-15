package mcpserver

import (
	"context"
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"

	"dt3d-ha/backend/handlers"
	"dt3d-ha/backend/repository"
	"dt3d-ha/backend/service"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"gorm.io/gorm"
)

type server struct {
	db           *gorm.DB
	deleteSpace  func(string) error
	geometryDir  string
	importScript string
	importSlot   chan struct{}
}

type document = map[string]any

type spaceIDInput struct {
	SpaceID string `json:"space_id" jsonschema:"ID from list_spaces"`
}

func NewHandler(db *gorm.DB, deleteSpace func(string) error, geometryDir, importScript, serviceKey string) http.Handler {
	s := &server{db: db, deleteSpace: deleteSpace, geometryDir: geometryDir, importScript: importScript, importSlot: make(chan struct{}, 1)}
	protocol := mcp.NewServer(&mcp.Implementation{Name: "dt3d", Title: "DT3D floorplan editor", Version: "1.0.0"}, &mcp.ServerOptions{
		Instructions: "Use list_spaces to find the space ID. Use list_objects to inspect its scene, get_space for settings, build_floorplan for walls/floors/openings/furniture, and list_furniture for presets. Scene units are meters (Y up); rotations are XYZ Euler angles in radians. Objects use parent-local coordinates. All edits are saved directly to DT3D. Reload the space in the card to view external changes.",
	})
	s.registerSpaces(protocol)
	s.registerObjects(protocol)
	s.registerFloorplan(protocol)
	s.registerMaterials(protocol)
	addTool(protocol, "import_model", "Import a static GLB, glTF, OBJ, FBX, DAE, STL, or 3DS model into the space. Supply the base64 file and any companion files such as textures, MTL or glTF buffers. The result is an editable group of meshes.", false, false, s.importModel)

	transport := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return protocol }, &mcp.StreamableHTTPOptions{
		Stateless: true, JSONResponse: true, MaxRequestBodyBytes: 48 << 20, PropagateRequestCancellation: true,
	})
	endpoint := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Native MCP clients omit Origin. Reject browser origins on this endpoint.
		if len(r.Header.Values("Origin")) > 0 {
			http.Error(w, "Origin is not allowed", http.StatusForbidden)
			return
		}
		key := strings.TrimSpace(r.Header.Get(handlers.ServiceKeyHeader))
		bearer := strings.Fields(r.Header.Get("Authorization"))
		if key == "" && len(bearer) == 2 && strings.EqualFold(bearer[0], "Bearer") {
			key = bearer[1]
		}
		if serviceKey == "" || subtle.ConstantTimeCompare([]byte(key), []byte(serviceKey)) != 1 {
			w.Header().Set("WWW-Authenticate", `Bearer realm="DT3D MCP"`)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		transport.ServeHTTP(w, r)
	})
	mux := http.NewServeMux()
	mux.Handle("/mcp", endpoint)
	return mux
}

func addTool[Input any](protocol *mcp.Server, name, description string, readOnly, destructive bool, run func(context.Context, Input) (document, error)) {
	openWorld := false
	mcp.AddTool(protocol, &mcp.Tool{
		Name: name, Description: description,
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: readOnly, DestructiveHint: &destructive, OpenWorldHint: &openWorld},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, args Input) (*mcp.CallToolResult, document, error) {
		result, err := run(ctx, args)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			err = errors.New("space or object not found; refresh the list and check the ID")
		}
		return nil, result, err
	})
}

func spaces(db *gorm.DB) *service.SpaceService {
	return service.NewSpaceService(repository.NewSpaceRepository(db), repository.NewObjectInstanceRepository(db))
}
