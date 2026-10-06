package repository

import (
	"encoding/json"
	"fmt"

	"dt3d-ha/backend/models"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func saveMaterial(tx *gorm.DB, spaceID string, value interface{}) (interface{}, error) {
	if values, ok := value.([]interface{}); ok {
		refs := make([]interface{}, len(values))
		for i, item := range values {
			ref, err := saveMaterial(tx, spaceID, item)
			if err != nil {
				return nil, err
			}
			refs[i] = ref
		}
		return refs, nil
	}
	if id, ok := value.(string); ok {
		var count int64
		if err := tx.Model(&models.Material{}).Where("space_id = ? AND uuid = ?", spaceID, id).Count(&count).Error; err != nil {
			return nil, err
		}
		if count == 0 {
			return nil, fmt.Errorf("material %s not found", id)
		}
		return id, nil
	}
	definition, ok := value.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid material definition")
	}
	id, _ := definition["uuid"].(string)
	if id == "" {
		id = uuid.NewString()
		definition["uuid"] = id
	}
	for _, asset := range []struct {
		key   string
		model string
	}{{"images", "image"}, {"textures", "texture"}} {
		items, _ := definition[asset.key].([]interface{})
		for _, item := range items {
			data, ok := item.(map[string]interface{})
			if !ok {
				return nil, fmt.Errorf("invalid %s", asset.key)
			}
			assetID, _ := data["uuid"].(string)
			if assetID == "" {
				return nil, fmt.Errorf("missing asset UUID")
			}
			encoded, err := json.Marshal(data)
			if err != nil {
				return nil, err
			}
			var record interface{} = &models.Texture{SpaceID: spaceID, UUID: assetID, Data: encoded}
			if asset.model == "image" {
				record = &models.TextureImage{SpaceID: spaceID, UUID: assetID, Data: encoded}
			}
			if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(record).Error; err != nil {
				return nil, err
			}
		}
		delete(definition, asset.key)
	}
	encoded, err := json.Marshal(definition)
	if err != nil {
		return nil, err
	}
	if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).
		Create(&models.Material{SpaceID: spaceID, UUID: id, Data: encoded}).Error; err != nil {
		return nil, err
	}
	return id, nil
}

func normalizeObjectAssets(tx *gorm.DB, instance *models.ObjectInstance) error {
	if len(instance.Data) == 0 || string(instance.Data) == "null" {
		return nil
	}
	var data map[string]interface{}
	if err := json.Unmarshal(instance.Data, &data); err != nil {
		return err
	}
	if data["material"] == nil {
		// Upgrade old texture-only objects without discarding their image.
		if url, ok := data["textureDataUrl"].(string); ok {
			textureID, imageID := uuid.NewString(), uuid.NewString()
			data["material"] = map[string]interface{}{"uuid": uuid.NewString(), "type": "MeshStandardMaterial", "map": textureID,
				"textures": []interface{}{map[string]interface{}{"uuid": textureID, "image": imageID}},
				"images":   []interface{}{map[string]interface{}{"uuid": imageID, "url": url}}}
		}
	}
	if material := data["material"]; material != nil {
		ref, err := saveMaterial(tx, instance.SpaceID, material)
		if err != nil {
			return err
		}
		data["material"] = ref
		delete(data, "textureDataUrl")
		delete(data, "textureName")
	}
	encoded, err := json.Marshal(data)
	instance.Data = encoded
	return err
}

func normalizeLibrary(tx *gorm.DB, space *models.Space) error {
	var config map[string]interface{}
	if len(space.Config) == 0 || string(space.Config) == "null" {
		return nil
	}
	if err := json.Unmarshal(space.Config, &config); err != nil {
		return err
	}
	if entries, ok := config["materials"].([]interface{}); ok {
		for _, entry := range entries {
			_, err := saveMaterial(tx, space.ID, entry)
			if err != nil {
				return err
			}
		}
	}
	delete(config, "materials")
	encoded, err := json.Marshal(config)
	space.Config = encoded
	return err
}

// Return the independent registry in the existing portable library format.
func loadLibrary(tx *gorm.DB, space *models.Space) error {
	var materials []models.Material
	var textures []models.Texture
	var images []models.TextureImage
	if err := tx.Where("space_id = ?", space.ID).Order("uuid").Find(&materials).Error; err != nil {
		return err
	}
	if err := tx.Where("space_id = ?", space.ID).Find(&textures).Error; err != nil {
		return err
	}
	if err := tx.Where("space_id = ?", space.ID).Find(&images).Error; err != nil {
		return err
	}
	textureMap := map[string]models.Texture{}
	imageMap := map[string]models.TextureImage{}
	for _, item := range textures {
		textureMap[item.UUID] = item
	}
	for _, item := range images {
		imageMap[item.UUID] = item
	}
	entries := []interface{}{}
	for _, material := range materials {
		var data map[string]interface{}
		if err := json.Unmarshal(material.Data, &data); err != nil {
			return err
		}
		tmaps, imaps := []interface{}{}, []interface{}{}
		seen := map[string]bool{}
		for _, value := range data {
			id, ok := value.(string)
			if !ok || seen[id] {
				continue
			}
			texture, ok := textureMap[id]
			if !ok {
				continue
			}
			seen[id] = true
			var t map[string]interface{}
			if err := json.Unmarshal(texture.Data, &t); err != nil {
				return err
			}
			tmaps = append(tmaps, t)
			imageID, _ := t["image"].(string)
			if image, ok := imageMap[imageID]; ok && !seen[imageID] {
				var i interface{}
				if err := json.Unmarshal(image.Data, &i); err != nil {
					return err
				}
				imaps = append(imaps, i)
				seen[imageID] = true
			}
		}
		if len(tmaps) > 0 {
			data["textures"] = tmaps
			data["images"] = imaps
		}
		entries = append(entries, data)
	}
	config := map[string]interface{}{}
	if len(space.Config) > 0 && string(space.Config) != "null" {
		if err := json.Unmarshal(space.Config, &config); err != nil {
			return err
		}
	}
	config["materials"] = entries
	encoded, err := json.Marshal(config)
	space.Config = datatypes.JSON(encoded)
	return err
}

// Migrate all legacy embedded assets atomically. Rerunning is safe.
func MigrateMaterialLibrary(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var spaces []models.Space
		if err := tx.Find(&spaces).Error; err != nil {
			return err
		}
		for _, space := range spaces {
			originalConfig := string(space.Config)
			changed := false
			var objects []models.ObjectInstance
			if err := tx.Where("space_id = ?", space.ID).Find(&objects).Error; err != nil {
				return err
			}
			for _, object := range objects {
				originalData := string(object.Data)
				if err := normalizeObjectAssets(tx, &object); err != nil {
					return err
				}
				if string(object.Data) == originalData {
					continue
				}
				changed = true
				if err := tx.Model(&object).UpdateColumn("data", object.Data).Error; err != nil {
					return err
				}
			}
			if err := normalizeLibrary(tx, &space); err != nil {
				return err
			}
			if !changed && originalConfig == string(space.Config) {
				continue
			}
			if err := tx.Model(&space).Updates(map[string]interface{}{"config": space.Config, "cache_version": gorm.Expr("cache_version + 1")}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// StoreMaterial saves an independent definition before an object references it.
func StoreMaterial(db *gorm.DB, spaceID string, definition map[string]interface{}) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var space models.Space
		if err := tx.Select("id").First(&space, "id = ?", spaceID).Error; err != nil {
			return err
		}
		if _, err := saveMaterial(tx, spaceID, definition); err != nil {
			return err
		}
		return bumpSpaceCacheVersion(tx, spaceID)
	})
}

// DeleteMaterial is explicit: an omitted or unused library entry is never garbage collected.
func DeleteMaterial(db *gorm.DB, spaceID, materialID string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var space models.Space
		if err := tx.Select("id").First(&space, "id = ?", spaceID).Error; err != nil {
			return err
		}
		var objects []models.ObjectInstance
		if err := tx.Where("space_id = ?", spaceID).Find(&objects).Error; err != nil {
			return err
		}
		for _, object := range objects {
			if len(object.Data) == 0 {
				continue
			}
			var data map[string]interface{}
			if err := json.Unmarshal(object.Data, &data); err != nil {
				return err
			}
			refs := []interface{}{data["material"]}
			if multiple, ok := data["material"].([]interface{}); ok {
				refs = multiple
			}
			for _, ref := range refs {
				if ref == materialID {
					return fmt.Errorf("material is still used by an object")
				}
			}
		}
		if err := tx.Where("space_id = ? AND uuid = ?", spaceID, materialID).Delete(&models.Material{}).Error; err != nil {
			return err
		}
		return bumpSpaceCacheVersion(tx, spaceID)
	})
}
