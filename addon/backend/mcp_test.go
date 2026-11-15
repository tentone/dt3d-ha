package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"dt3d-ha/backend/handlers"
	"dt3d-ha/backend/mcpserver"
	"dt3d-ha/backend/repository"
	"dt3d-ha/backend/service"

	"github.com/gin-gonic/gin"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const testKey = "test-service-key"
const pixelPNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8f8AAAAASUVORK5CYII="

type testDocument = map[string]any

func TestMCPSceneWorkflow(t *testing.T) {
	session, api := testMCP(t)
	tools, err := session.ListTools(t.Context(), nil)
	if err != nil || len(tools.Tools) < 15 {
		t.Fatalf("discover tools: %v, %v", tools, err)
	}
	space := callTool(t, session, "create_space", testDocument{"name": "Workshop", "config": testDocument{"floorplan": testDocument{"automaticFloors": true}}})
	id := space["id"].(string)
	twin := callTool(t, session, "create_space", testDocument{"name": "Studio"})
	material := callTool(t, session, "save_material", testDocument{"space_id": id, "name": "Oak", "color": "#d6b28c"})
	oak := material["material_id"].(string)
	assertToolError(t, session, "build_floorplan", testDocument{
		"space_id": id,
		"walls":    []testDocument{{"start": xy(0, 0), "end": xy(5, 0)}},
		"openings": []testDocument{{"kind": "door", "wall_key": "unknown"}},
	})
	if got := callTool(t, session, "list_objects", testDocument{"space_id": id})["objects"].([]any); len(got) != 0 {
		t.Fatalf("failed batch saved %d objects", len(got))
	}
	built := callTool(t, session, "build_floorplan", testDocument{
		"space_id":  id,
		"walls":     []testDocument{{"key": "west", "start": xy(0, 0), "end": xy(4, 3)}},
		"floors":    []testDocument{{"material_id": oak, "points": []testDocument{xy(0, 0), xy(4, 3), xy(4, 0)}}},
		"openings":  []testDocument{{"kind": "door", "wall_key": "west", "customization": testDocument{"openEntityId": "binary_sensor.front_door"}}},
		"furniture": []testDocument{{"kind": "chair", "position": testDocument{"x": 1, "y": 0, "z": 1}, "parameters": testDocument{"width": 0.6}}},
	})["objects"].([]any)
	wallID := built[0].(testDocument)["id"].(string)
	doorID := built[2].(testDocument)["id"].(string)
	if built[2].(testDocument)["parent_id"] != wallID {
		t.Fatal("door was not attached to its wall")
	}
	assertToolError(t, session, "edit_object", testDocument{"space_id": id, "object_id": wallID, "parent_id": doorID})
	assertToolError(t, session, "delete_material", testDocument{"space_id": id, "material_id": oak})
	callTool(t, session, "edit_object", testDocument{"space_id": id, "object_id": wallID, "data": testDocument{"wall": testDocument{"height": 3}}})
	callTool(t, session, "edit_space", testDocument{"space_id": id, "name": "New workshop", "config": testDocument{"floorplan": testDocument{"connection": testDocument{"shape": "circle"}}}})

	response := getAPI(t, api, "/api/spaces/"+id)
	var fromEditor struct {
		Name   string
		Config struct {
			Floorplan struct{ AutomaticFloors bool }
			Materials []testDocument
		}
		Objects []struct {
			ID   string
			Data testDocument
		} `json:"object_instances"`
	}
	if err := json.Unmarshal(response, &fromEditor); err != nil {
		t.Fatal(err)
	}
	if fromEditor.Name != "New workshop" || !fromEditor.Config.Floorplan.AutomaticFloors || len(fromEditor.Config.Materials) != 1 || len(fromEditor.Objects) != 4 {
		t.Fatalf("unexpected editor data %s", response)
	}
	for _, object := range fromEditor.Objects {
		if object.ID == wallID {
			wall := object.Data["wall"].(testDocument)
			if wall["length"] != float64(5) || wall["height"] != float64(3) {
				t.Fatalf("wall edit overwrote existing geometry: %v", wall)
			}
		}
	}
	reference := callTool(t, session, "add_floorplan_reference", testDocument{
		"space_id": id, "image_base64": pixelPNG, "distance_meters": 3,
		"point_a": testDocument{"x": 0, "y": 0}, "point_b": testDocument{"x": 1, "y": 0},
	})
	if reference["width_meters"] != float64(3) || reference["height_meters"] != float64(3) {
		t.Fatalf("unexpected reference dimensions: %v", reference)
	}
	callTool(t, session, "delete_object", testDocument{"space_id": id, "object_id": wallID})
	if got := callTool(t, session, "list_objects", testDocument{"space_id": id})["objects"].([]any); len(got) != 3 {
		t.Fatalf("deleting the wall should delete its door, got %d remaining objects", len(got))
	}
	callTool(t, session, "delete_space", testDocument{"space_id": id})
	remaining := callTool(t, session, "list_spaces", nil)["spaces"].([]any)
	if len(remaining) != 1 || remaining[0].(testDocument)["id"] != twin["id"] || remaining[0].(testDocument)["is_default"] != true {
		t.Fatalf("expected the remaining space to become default, got %v", remaining)
	}
}

func TestMCPModelImport(t *testing.T) {
	if _, err := exec.LookPath("node"); err != nil {
		t.Skip("Node is unavailable")
	}
	if _, err := os.Stat("../model-import/node_modules/three/package.json"); err != nil {
		t.Skip("Install add-on model importer dependencies with npm ci in addon/model-import")
	}
	session, api := testMCP(t)
	id := callTool(t, session, "create_space", testDocument{"name": "Model test"})["id"].(string)
	upload := func(name, content string) testDocument {
		return testDocument{"name": name, "base64": base64.StdEncoding.EncodeToString([]byte(content))}
	}
	obj := upload("triangle.obj", "mtllib style.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nusemtl painted\nf 1/1 2/2 3/3\n")
	mtl := upload("style.mtl", "newmtl painted\nKd 1 0 0\nmap_Kd texture.png\n")
	png := testDocument{"name": "texture.png", "base64": pixelPNG}
	assertToolError(t, session, "import_model", testDocument{"space_id": id, "file": obj, "assets": []any{mtl}})
	result := callTool(t, session, "import_model", testDocument{"space_id": id, "file": obj, "assets": []any{mtl, png}})
	if result["mesh_count"] != float64(1) {
		t.Fatalf("expected one mesh, got %v", result)
	}
	list := callTool(t, session, "list_objects", testDocument{"space_id": id})["objects"].([]any)
	for _, entry := range list {
		object := entry.(testDocument)
		if object["type"] == "mesh" {
			geometryID := object["data"].(testDocument)["geometryFileId"].(string)
			geometry := getAPI(t, api, "/api/spaces/"+id+"/geometries/"+geometryID)
			if !bytes.HasPrefix(geometry, []byte("DT3DGEO1")) {
				t.Fatal("imported geometry does not use the editor's binary format")
			}
		}
	}
	materials := callTool(t, session, "list_materials", testDocument{"space_id": id, "include_images": true})["materials"].([]any)
	if len(materials) != 1 {
		t.Fatalf("expected one imported material, got %v", materials)
	}
	image := materials[0].(testDocument)["images"].([]any)[0].(testDocument)
	if !strings.HasPrefix(image["url"].(string), "data:image/png;base64,") {
		t.Fatalf("texture was not embedded: %v", image)
	}
	plainOBJ := upload("plain.obj", "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n")
	if imported := callTool(t, session, "import_model", testDocument{"space_id": id, "file": plainOBJ}); imported["mesh_count"] != float64(1) {
		t.Fatalf("a standalone OBJ should import without companion files: %v", imported)
	}
}

func testMCP(t *testing.T) (*mcp.ClientSession, http.Handler) {
	t.Helper()
	dir := t.TempDir()
	db, err := initializeDatabase(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqlDB.Close() })
	geometryDir := filepath.Join(dir, "geometries")
	spaceService := service.NewSpaceService(repository.NewSpaceRepository(db), repository.NewObjectInstanceRepository(db))
	editor := handlers.NewSpaceHandler(spaceService, geometryDir)
	api := gin.New()
	handlers.RegisterRoutes(api.Group("/api", handlers.RequireServiceKey(testKey)), editor)
	endpoint := httptest.NewServer(mcpserver.NewHandler(db, editor.DeleteSpace, geometryDir, "../model-import/import.mjs", testKey))
	t.Cleanup(endpoint.Close)

	for _, tc := range []struct {
		origin string
		key    string
		status int
	}{{"", "", 401}, {"https://browser.example", testKey, 403}} {
		request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, endpoint.URL+"/mcp", nil)
		if err != nil {
			t.Fatal(err)
		}
		if tc.origin != "" {
			request.Header.Set("Origin", tc.origin)
		}
		request.Header.Set(handlers.ServiceKeyHeader, tc.key)
		response, err := endpoint.Client().Do(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != tc.status {
			t.Fatalf("expected HTTP %d, got %d", tc.status, response.StatusCode)
		}
	}

	client := mcp.NewClient(&mcp.Implementation{Name: "dt3d-test", Version: "1"}, nil)
	session, err := client.Connect(t.Context(), &mcp.StreamableClientTransport{
		Endpoint: endpoint.URL + "/mcp", DisableStandaloneSSE: true,
		HTTPClient: &http.Client{Transport: bearerTransport{endpoint.Client().Transport}},
	}, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { session.Close() })
	return session, api
}

type bearerTransport struct{ transport http.RoundTripper }

func (r bearerTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	request = request.Clone(request.Context())
	request.Header.Set("Authorization", "Bearer "+testKey)
	return r.transport.RoundTrip(request)
}

func callTool(t *testing.T, session *mcp.ClientSession, name string, args testDocument) testDocument {
	t.Helper()
	result, err := session.CallTool(t.Context(), &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	if result.IsError {
		t.Fatalf("%s: %v", name, result.Content[0].(*mcp.TextContent).Text)
	}
	return result.StructuredContent.(testDocument)
}

func assertToolError(t *testing.T, session *mcp.ClientSession, name string, args testDocument) {
	t.Helper()
	result, err := session.CallTool(t.Context(), &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil || !result.IsError {
		t.Fatalf("expected %s tool error, got %v, %v", name, result, err)
	}
}

func getAPI(t *testing.T, handler http.Handler, path string) []byte {
	t.Helper()
	request, err := http.NewRequestWithContext(context.Background(), http.MethodGet, path, nil)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set(handlers.ServiceKeyHeader, testKey)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("GET %s returned HTTP %d: %s", path, response.Code, response.Body)
	}
	data, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func xy(x, z float64) testDocument { return testDocument{"x": x, "z": z} }
