package mcpserver

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"

	"github.com/google/uuid"
)

type pixel struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type referenceInput struct {
	spaceIDInput
	Name           string  `json:"name,omitempty"`
	ImageBase64    string  `json:"image_base64" jsonschema:"Base64 of a PNG, JPEG or GIF image, up to 16 MiB decoded"`
	PointA         pixel   `json:"point_a" jsonschema:"First calibration point in image pixels"`
	PointB         pixel   `json:"point_b" jsonschema:"Second calibration point in image pixels"`
	DistanceMeters float64 `json:"distance_meters" jsonschema:"Real-world distance between the two calibration points"`
	Position       *vector `json:"position,omitempty" jsonschema:"Scene position of the image center; defaults to just below the floor at the origin"`
}

func (s *server) addFloorplanReference(ctx context.Context, in referenceInput) (document, error) {
	const maxImageBytes = 16 << 20
	if len(in.ImageBase64) > base64.StdEncoding.EncodedLen(maxImageBytes) {
		return nil, errors.New("reference image exceeds the 16 MiB upload limit")
	}
	payload, err := base64.StdEncoding.DecodeString(in.ImageBase64)
	if err != nil {
		return nil, errors.New("reference image must be valid base64")
	}
	if len(payload) > maxImageBytes {
		return nil, errors.New("reference image exceeds the 16 MiB upload limit")
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(payload))
	if err != nil || config.Width <= 0 || config.Height <= 0 {
		return nil, errors.New("reference image must be a PNG, JPEG or GIF")
	}
	width, height := float64(config.Width), float64(config.Height)
	for _, p := range []pixel{in.PointA, in.PointB} {
		if p.X < 0 || p.X > width || p.Y < 0 || p.Y > height {
			return nil, errors.New("calibration points must lie within the image")
		}
	}
	pixels := math.Hypot(in.PointB.X-in.PointA.X, in.PointB.Y-in.PointA.Y)
	if pixels == 0 || in.DistanceMeters <= 0 {
		return nil, errors.New("calibration requires two distinct points and a positive distance")
	}
	scale := in.DistanceMeters / pixels
	width, height = width*scale, height*scale
	if math.IsInf(width, 0) || math.IsInf(height, 0) {
		return nil, errors.New("calibrated dimensions are too large")
	}
	textureID, imageID := uuid.NewString(), uuid.NewString()
	data := document{
		"meshType": "plane", "geometryParameters": document{"width": width, "height": height},
		"position": vector{Y: -0.001}, "rotation": vector{X: -math.Pi / 2},
		"material": document{
			"type": "MeshBasicMaterial", "name": named(in.Name, "Floorplan reference"),
			"color": 0xffffff, "side": 2, "toneMapped": false, "map": textureID,
			"textures": []document{{"uuid": textureID, "image": imageID, "colorSpace": "srgb"}},
			"images":   []document{{"uuid": imageID, "url": "data:image/" + format + ";base64," + in.ImageBase64}},
		},
	}
	if in.Position != nil {
		data["position"] = in.Position
	}
	object, err := makeObject(spaces(s.db.WithContext(ctx)), in.SpaceID, "", named(in.Name, "Floorplan reference"), "mesh", data)
	if err != nil {
		return nil, err
	}
	return document{"object": objectSummary(object), "width_meters": width, "height_meters": height}, nil
}
