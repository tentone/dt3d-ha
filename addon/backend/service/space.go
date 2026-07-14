package service

import (
	"errors"
	"fmt"
	"strings"

	"dt3d-ha/backend/models"
	"dt3d-ha/backend/repository"

	"gorm.io/datatypes"
)

type SpaceService struct {
	spaces    *repository.SpaceRepository
	instances *repository.ObjectInstanceRepository
}

func NewSpaceService(spaceRepo *repository.SpaceRepository, instanceRepo *repository.ObjectInstanceRepository) *SpaceService {
	return &SpaceService{spaces: spaceRepo, instances: instanceRepo}
}

func (s *SpaceService) CreateSpace(space *models.Space) error {
	space.Name = strings.TrimSpace(space.Name)
	if space.Name == "" {
		return errors.New("space name is required")
	}
	return s.spaces.Create(space)
}

func (s *SpaceService) ListSpaces() ([]models.Space, error) {
	return s.spaces.FindAll()
}

func (s *SpaceService) GetSpaceByID(id string) (*models.Space, error) {
	return s.spaces.FindByID(id)
}

func (s *SpaceService) DeleteSpace(id string) error {
	space, err := s.spaces.FindByID(id)
	if err != nil {
		return err
	}

	return s.spaces.Delete(space)
}

type UpdateSpaceInput struct {
	Name        string
	Description string
	Config      datatypes.JSON
}

func (s *SpaceService) UpdateSpace(spaceID string, payload UpdateSpaceInput) (*models.Space, error) {
	space, err := s.spaces.FindByID(spaceID)
	if err != nil {
		return nil, err
	}

	payload.Name = strings.TrimSpace(payload.Name)
	if payload.Name == "" {
		return nil, errors.New("space name is required")
	}

	space.Name = payload.Name
	space.Description = payload.Description
	space.Config = payload.Config

	if err := s.spaces.Update(space); err != nil {
		return nil, err
	}

	return space, nil
}

func (s *SpaceService) CreateObjectInstance(spaceID string, instance *models.ObjectInstance) error {
	instance.SpaceID = spaceID
	instance.Type = strings.TrimSpace(instance.Type)

	if instance.Type == "" {
		return errors.New("object type is required")
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
		if parent.SpaceID != spaceID {
			return errors.New("parent object must belong to the same space")
		}
	}
	return s.instances.Create(instance)
}

func (s *SpaceService) ListObjectInstances(spaceID string) ([]models.ObjectInstance, error) {
	return s.instances.FindBySpaceID(spaceID)
}

type UpdateObjectInstanceInput struct {
	Name           string
	Type           string
	Data           datatypes.JSON
	ParentID       *string
	ParentProvided bool
}

func (s *SpaceService) UpdateObjectInstance(spaceID, objectID string, payload UpdateObjectInstanceInput) (*models.ObjectInstance, error) {
	instance, err := s.instances.FindByID(objectID)
	if err != nil {
		return nil, err
	}
	if instance.SpaceID != spaceID {
		return nil, errors.New("object instance does not belong to space")
	}

	payload.Type = strings.TrimSpace(payload.Type)
	if payload.Type == "" {
		return nil, errors.New("object type is required")
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
			if parent.SpaceID != spaceID {
				return nil, errors.New("parent object must belong to the same space")
			}
		}
		instance.ParentID = payload.ParentID
	}

	if err := s.instances.Update(instance); err != nil {
		return nil, err
	}
	return instance, nil
}

func (s *SpaceService) DeleteObjectInstance(spaceID, objectID string) error {
	instance, err := s.instances.FindByID(objectID)
	if err != nil {
		return err
	}
	if instance.SpaceID != spaceID {
		return errors.New("object instance does not belong to space")
	}
	return s.instances.DeleteWithDescendants(objectID)
}

type ObjectTreeNode struct {
	ID       string
	SpaceID  string
	ParentID *string
	Name     string
	Type     string
	Data     datatypes.JSON
	Children []*ObjectTreeNode
}

func (s *SpaceService) GetObjectTree(spaceID string) ([]*ObjectTreeNode, error) {
	instances, err := s.instances.FindBySpaceID(spaceID)
	if err != nil {
		return nil, err
	}
	nodes := make(map[string]*ObjectTreeNode, len(instances))
	roots := []*ObjectTreeNode{}

	for _, inst := range instances {
		node := &ObjectTreeNode{
			ID:       inst.ID,
			SpaceID:  inst.SpaceID,
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
