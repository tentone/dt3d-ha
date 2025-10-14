package service

import (
	"errors"
	"fmt"
	"strings"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"
	"gorm.io/datatypes"
)

type SceneService struct {
	scenes    *repository.SceneRepository
	instances *repository.ObjectInstanceRepository
}

func NewSceneService(sceneRepo *repository.SceneRepository, instanceRepo *repository.ObjectInstanceRepository) *SceneService {
	return &SceneService{scenes: sceneRepo, instances: instanceRepo}
}

func (s *SceneService) CreateScene(scene *models.Scene) error {
	scene.Name = strings.TrimSpace(scene.Name)
	if scene.Name == "" {
		return errors.New("scene name is required")
	}
	return s.scenes.Create(scene)
}

func (s *SceneService) ListScenes() ([]models.Scene, error) {
	return s.scenes.FindAll()
}

func (s *SceneService) GetSceneByID(id string) (*models.Scene, error) {
	return s.scenes.FindByID(id)
}

var allowedInstanceTypes = map[string]struct{}{
	"3DModel": {},
	"Mesh":    {},
	"Entity":  {},
}

func (s *SceneService) CreateObjectInstance(sceneID string, instance *models.ObjectInstance) error {
	instance.SceneID = sceneID
	instance.Type = strings.TrimSpace(instance.Type)
	if instance.Type == "" {
		return errors.New("object type is required")
	}
	if _, ok := allowedInstanceTypes[instance.Type]; !ok {
		return errors.New("unsupported object type")
	}
	instance.Name = strings.TrimSpace(instance.Name)
	if instance.Name == "" {
		return errors.New("object name is required")
	}
	if instance.ParentID != nil {
		parent, err := s.instances.FindByID(*instance.ParentID)
		if err != nil {
			return fmt.Errorf("parent object lookup failed: %w", err)
		}
		if parent.SceneID != sceneID {
			return errors.New("parent object must belong to the same scene")
		}
	}
	return s.instances.Create(instance)
}

func (s *SceneService) ListObjectInstances(sceneID string) ([]models.ObjectInstance, error) {
	return s.instances.FindBySceneID(sceneID)
}

type UpdateObjectInstanceInput struct {
	Name           string
	Type           string
	Data           datatypes.JSON
	ParentID       *string
	ParentProvided bool
}

func (s *SceneService) UpdateObjectInstance(sceneID, objectID string, payload UpdateObjectInstanceInput) (*models.ObjectInstance, error) {
	instance, err := s.instances.FindByID(objectID)
	if err != nil {
		return nil, err
	}
	if instance.SceneID != sceneID {
		return nil, errors.New("object instance does not belong to scene")
	}

	payload.Type = strings.TrimSpace(payload.Type)
	if payload.Type == "" {
		return nil, errors.New("object type is required")
	}
	if _, ok := allowedInstanceTypes[payload.Type]; !ok {
		return nil, errors.New("unsupported object type")
	}

	payload.Name = strings.TrimSpace(payload.Name)
	if payload.Name == "" {
		return nil, errors.New("object name is required")
	}

	instance.Name = payload.Name
	instance.Type = payload.Type
	instance.Data = payload.Data

	if payload.ParentProvided {
		if payload.ParentID != nil {
			if *payload.ParentID == objectID {
				return nil, errors.New("object cannot be its own parent")
			}
			parent, err := s.instances.FindByID(*payload.ParentID)
			if err != nil {
				return nil, fmt.Errorf("parent object lookup failed: %w", err)
			}
			if parent.SceneID != sceneID {
				return nil, errors.New("parent object must belong to the same scene")
			}
		}
		instance.ParentID = payload.ParentID
	}

	if err := s.instances.Update(instance); err != nil {
		return nil, err
	}
	return instance, nil
}

func (s *SceneService) DeleteObjectInstance(sceneID, objectID string) error {
	instance, err := s.instances.FindByID(objectID)
	if err != nil {
		return err
	}
	if instance.SceneID != sceneID {
		return errors.New("object instance does not belong to scene")
	}
	return s.instances.Delete(objectID)
}

type ObjectTreeNode struct {
	ID       string
	SceneID  string
	ParentID *string
	Name     string
	Type     string
	Data     datatypes.JSON
	Children []*ObjectTreeNode
}

func (s *SceneService) GetObjectTree(sceneID string) ([]*ObjectTreeNode, error) {
	instances, err := s.instances.FindBySceneID(sceneID)
	if err != nil {
		return nil, err
	}
	nodes := make(map[string]*ObjectTreeNode, len(instances))
	roots := []*ObjectTreeNode{}

	for _, inst := range instances {
		node := &ObjectTreeNode{
			ID:       inst.ID,
			SceneID:  inst.SceneID,
			ParentID: inst.ParentID,
			Name:     inst.Name,
			Type:     inst.Type,
			Data:     inst.Data,
			Children: []*ObjectTreeNode{},
		}
		nodes[inst.ID] = node
	}

	for _, node := range nodes {
		if node.ParentID != nil {
			parent, ok := nodes[*node.ParentID]
			if ok {
				parent.Children = append(parent.Children, node)
				continue
			}
		}
		roots = append(roots, node)
	}

	return roots, nil
}
