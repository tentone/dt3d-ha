package handlers

import (
	"encoding/json"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/service"

	"gorm.io/datatypes"
)

type createSpaceRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type createObjectInstanceRequest struct {
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Data     json.RawMessage `json:"data"`
	ParentID *string         `json:"parent_id"`
}

type updateObjectInstanceRequest struct {
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Data     json.RawMessage `json:"data"`
	ParentID *string         `json:"parent_id"`
}

type objectInstanceResponse struct {
	ID        string          `json:"id"`
	SpaceID   string          `json:"space_id"`
	ParentID  *string         `json:"parent_id"`
	Name      string          `json:"name"`
	Type      string          `json:"type"`
	Data      json.RawMessage `json:"data"`
	CreatedAt int64           `json:"created_at"`
	UpdatedAt int64           `json:"updated_at"`
}

type spaceResponse struct {
	ID              string                   `json:"id"`
	Name            string                   `json:"name"`
	Description     string                   `json:"description"`
	CreatedAt       int64                    `json:"created_at"`
	UpdatedAt       int64                    `json:"updated_at"`
	ObjectInstances []objectInstanceResponse `json:"object_instances"`
}

type objectTreeNodeResponse struct {
	ID       string                   `json:"id"`
	SpaceID  string                   `json:"space_id"`
	ParentID *string                  `json:"parent_id"`
	Name     string                   `json:"name"`
	Type     string                   `json:"type"`
	Data     json.RawMessage          `json:"data"`
	Children []objectTreeNodeResponse `json:"children,omitempty"`
}

func toObjectInstanceResponse(instance models.ObjectInstance) objectInstanceResponse {
	data := json.RawMessage(instance.Data)
	if len(data) == 0 {
		data = json.RawMessage([]byte("null"))
	}
	return objectInstanceResponse{
		ID:        instance.ID,
		SpaceID:   instance.SpaceID,
		ParentID:  instance.ParentID,
		Name:      instance.Name,
		Type:      instance.Type,
		Data:      data,
		CreatedAt: instance.CreatedAt,
		UpdatedAt: instance.UpdatedAt,
	}
}

func toSpaceResponse(space models.Space) spaceResponse {
	responses := make([]objectInstanceResponse, 0, len(space.ObjectInstances))
	for _, inst := range space.ObjectInstances {
		responses = append(responses, toObjectInstanceResponse(inst))
	}
	return spaceResponse{
		ID:              space.ID,
		Name:            space.Name,
		Description:     space.Description,
		CreatedAt:       space.CreatedAt,
		UpdatedAt:       space.UpdatedAt,
		ObjectInstances: responses,
	}
}

func toObjectTreeNodeResponse(node *service.ObjectTreeNode) objectTreeNodeResponse {
	data := json.RawMessage(node.Data)
	if len(data) == 0 {
		data = json.RawMessage([]byte("null"))
	}
	children := make([]objectTreeNodeResponse, 0, len(node.Children))
	for _, child := range node.Children {
		children = append(children, toObjectTreeNodeResponse(child))
	}
	return objectTreeNodeResponse{
		ID:       node.ID,
		SpaceID:  node.SpaceID,
		ParentID: node.ParentID,
		Name:     node.Name,
		Type:     node.Type,
		Data:     data,
		Children: children,
	}
}

func rawMessageToJSON(data json.RawMessage) datatypes.JSON {
	if len(data) == 0 {
		return datatypes.JSON([]byte("null"))
	}
	return datatypes.JSON(data)
}
