# DT3D user manual

This manual explains how to create, edit, and view a Digital Twin 3D for Home Assistant (DT3D). It covers spaces, 3D objects, Home Assistant entities, floor-plan tools, measurements, grid configuration, viewports, visualization cards, and performance.

Complete the [setup guide](SETUP_GUIDE.md) before using this manual. For system architecture, source layout, and development instructions, see the [project README](README.md).

## Open the editor

Open the Home Assistant dashboard view that contains the DT3D editing card. A fullscreen **Panel (one card)** view gives the editor the most working space. The [setup guide](SETUP_GUIDE.md#create-the-fullscreen-editor) explains how to create and connect this card.

Keep one editing card for maintaining the digital twin and create separate read-only visualization cards for normal dashboard use.

<img src="readme/1_editor_panel.png" width="500">

## Using the editor

### Navigate and edit objects

- Orbit, pan, and zoom with the usual mouse or touch gestures. Use the camera button to switch between perspective and orthographic projection.
- Select an object with one click in the object tree or by double-clicking it in the scene. Use **Move**, **Rotate**, **Scale**, **Disable transform controls**, or **Focus selected objects** on the bottom toolbar. The inspector can edit the object's name, lock state, transform, geometry, material, shadows, and type-specific properties.
- In the object tree, hold **Ctrl** (**Cmd** on macOS) to add or remove individual objects from the selection. Hold **Shift** to select a visible range. A shared transform control moves, rotates, or scales the selection together.
- Drag tree entries to reorder them or make them children of a group. Grouping is useful for floors, rooms, furniture, and entity-controlled layers. Moving or hiding a group also affects its children.
- Right-click an object in the tree or scene to move it to a point, clone it, or delete it. On a touch device, long-press the object. **Move to point** places the object at the next scene double-click; press **Escape** to cancel. The **Delete** key also deletes the selected object after confirmation.
- Use **Ctrl/Cmd+Z** to undo and **Ctrl/Cmd+Y** or **Ctrl/Cmd+Shift+Z** to redo editor changes.
- **Prevent object clipping** on the bottom settings toolbar stops translated objects from passing through visible mesh geometry and lets them slide along obstacles. This setting is stored in the current browser.
- Locked objects cannot be transformed or dragged. Unlock an object in its **Configuration** inspector section before editing it.

### Configure the grid and snapping

The bottom settings toolbar contains three grid controls:

- **Snap transforms to grid** (magnet) enables snapping. Translation uses the configured snap size, rotation snaps to 15-degree increments, and scale snaps to increments of 0.1. New wall points placed on ordinary surfaces and all manually drawn floor points also use the configured snap size; a direct wall connection stays on that wall's centerline.
- **Toggle grid** shows or hides the editor grid. Grid visibility does not enable or disable snapping.
- **Configure grid** opens the grid configuration dialog.

The grid configuration dialog provides:

| Setting   | Default | Description                                                                  |
| --------- | ------- | ---------------------------------------------------------------------------- |
| Grid size | `200`   | Base visible grid extent in meters. The grid expands as the camera rises.    |
| Snap size | `0.5`   | Translation, wall-placement, and manual floor-point snap interval in meters. |

Choose **Save** to apply the values. Grid size and snap size are stored in the current browser, not in the active space, so other devices can use different settings. Grid visibility and snapping are temporary toggles for the current editor.

### Manage spaces

A space is an independent scene with its own objects, saved viewports, daylight, tone mapping, and post-processing configuration. Use separate spaces for different homes, floors, or large sections of a home when one combined scene would be slow to load and render.

1. Use the selector at the top of the editor to switch spaces.
2. Select **Create space**, enter a name and optional description, and confirm. Use **Space configuration** (cog icon) in the same bar to edit those details later or make the active space the default. Selecting a new default clears the previous default.
3. To copy the active space, select **Clone space**, enter a name, and confirm. The new copy includes the space configuration, every object and its hierarchy, and uploaded geometry.
4. Add or edit objects; changes are synchronized to the backend automatically.
5. Select **Download space (.dt3d)** to save the active space as one portable file. The archive contains the space configuration and object database data, along with uploaded geometry, models, textures, and other persisted assets.
6. Select **Upload space (.dt3d)** to create and open a new space from an archive. Import generates new database IDs, so it does not overwrite the original space.
7. To remove the active space, use **Delete space** beside the selector and confirm. This permanently deletes every object in that space.

Space creation, cloning, import/export, switching, and deletion are hidden when `visualization_only: true`.

<img src="readme/space_options.png" width="300">

### Add 3D elements

The left sidebar organizes creation tools into primary actions, **Floorplan**, and **Objects**:

- Primary actions upload assets, add a Home Assistant entity, create a group, or save a viewport.
- **Floorplan** contains wall, floor, door, window, and gate tools.
- **Objects > Mesh** contains cube, sphere, plane, capsule, circle, cone, cylinder, dodecahedron, icosahedron, octahedron, ring, tetrahedron, torus, and torus knot.
- **Objects > Static lights** contains ambient, directional, point, spot, and rectangular area lights.
- **Objects > Furniture** contains the built-in furniture models described below.
- Uploaded models: `.gltf`, `.glb`, `.obj`, `.fbx`, `.dae` (Collada), `.stl`, and `.3ds`. Models can also be dragged onto the canvas.
  - Select or drop companion material and texture files with the model, or choose the folder option in the upload menu to preserve their relative paths.
  - Prefer a self-contained `.glb` when possible for reliable results.

After adding a mesh or furniture object, select it to edit its dimensions, transform, material properties, or apply an image texture. Keep imported geometry and texture sizes modest because they are downloaded and uploaded by each client.

<img src="readme/3_add_objects.png" width="500">

### Use the built-in furniture models

Open **Objects > Furniture** and choose a model. DT3D creates a lightweight procedural object at the scene origin; move it into place with the transform control or its inspector. All dimensions are in meters.

| Model   | Default size (W × D × H) | Model-specific controls                                            |
| ------- | ------------------------ | ------------------------------------------------------------------ |
| Table   | `1.60 × 0.80 × 0.75`     | Top thickness, leg thickness, and leg inset                        |
| Chair   | `0.48 × 0.52 × 0.90`     | Seat height/thickness, leg thickness, and back thickness           |
| Couch   | `2.10 × 0.90 × 0.85`     | Seat height, arm width, cushion thickness, and back thickness      |
| Bathtub | `1.70 × 0.75 × 0.60`     | Rim, wall, and base thickness                                      |
| Shelf   | `1.00 × 0.32 × 1.80`     | Board thickness, shelf count, and optional back panel              |
| Cabinet | `1.20 × 0.45 × 0.90`     | Board thickness, door count, interior shelf count, and handle size |

Expand the furniture-specific inspector section to change these construction parameters. The object rebuilds immediately while keeping its transform and material, so it can be resized without scaling every part manually.

### Add Home Assistant entities

Select **Add entity**, search by entity ID or friendly name, and choose the entity. Position it with the transform controls. Entity visuals update from the Home Assistant state supplied to the card.

| Entity domain    | Specialized visualization                                                                                 | Toggle action |
| ---------------- | --------------------------------------------------------------------------------------------------------- | ------------- |
| `sensor`         | State-aware icon and name/state hover label                                                               | No            |
| `binary_sensor`  | Icon and color derived from the binary state                                                              | No            |
| `camera`         | Round icon with a large still-image preview on pointer hover; requests are serialized and capped at 3 FPS | No            |
| `climate`        | HVAC-mode color and target temperature while active                                                       | No            |
| `light`          | State/color icon plus a configurable 3D light source                                                      | Yes           |
| `switch`         | State icon and name/state hover label                                                                     | Yes           |
| Any other domain | Generic marker and friendly-name label                                                                    | No            |

All entity domains can use **Open entity** to show Home Assistant's more-info dialog. Card-wide single- and double-click defaults can be `open`, `toggle`, or `nothing`. Each entity can inherit or override those defaults in its inspector; **Toggle** is only offered for `light` and `switch` objects.

### Connect any object to entity states

Entity rules connect an existing 3D object to live Home Assistant data. They do not require a separate entity marker in the scene. A rule can move a garage model, recolor a lamp, hide an inactive appliance, or animate a group and all of its children.

1. Put the object in the position, rotation, scale, color, and visibility that should be its normal state. These values become the rule's saved original values.
2. Select the object and expand **Entity rules** at the bottom of its inspector.
3. Choose **Add rule**, then search for or enter a Home Assistant entity ID.
4. Select an action and configure its trigger and target:

| Action               | Configuration                                                                                                                                                                          | Result                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transform action** | Choose position, rotation, or scale. Use **On a specific state** and enter a state, or use **Interpolate from entity value**, a numeric minimum/maximum, and a target X/Y/Z transform. | A matching state applies the target transform. Numeric interpolation moves continuously from the saved original to the target; values outside the range are clamped. Rotation targets are entered in degrees. |
| **Color change**     | Enter a state and choose a target color.                                                                                                                                               | The first compatible material changes color while the state matches, then returns to its saved original color.                                                                                                |
| **Hide**             | Enter a state.                                                                                                                                                                         | The object is hidden while the state matches and returns to its saved original visibility otherwise. Hiding a group hides its complete hierarchy.                                                             |

State comparison is case-insensitive but otherwise exact. Numeric interpolation reads the entity's primary `state`; it does not read attributes such as a cover's `current_position`. If the required value is only available as an attribute, expose it through a Home Assistant template sensor or use the dedicated opening entity fields described below.

For example, to visualize a tank level, bind its numeric `sensor` to **Transform action > Scale > Interpolate from entity value**, use `0` and `100` as the entity range, and set the target Y scale. To flag a leak, bind `binary_sensor.leak` to **Color change**, enter `on`, and choose a warning color.

Add as many rules as needed. Each rule can use the same entity or a different one. If multiple matching rules affect the same position, rotation, scale, color, or visibility, the last matching rule in the list takes precedence. Disable a rule to retain its configuration without applying it, or remove it to restore the saved original value. Rules are stored with the object and are reevaluated whenever Home Assistant supplies updated states.

### Build your first floorplan

#### Add and calibrate a reference image

1. Open **Upload assets** and choose **Floorplan reference**.
2. Select a 2D floorplan image. In the calibration dialog, click two points whose real separation is known, enter that distance in meters, and choose **Add floorplan**.
3. DT3D creates a horizontal textured plane at the calibrated real-world size. Switch to an orthographic top view if that makes the image easier to trace. You can instead add or import a plane manually, but wall points must be double-clicked on a visible scene surface; empty scene space cannot receive a point.
4. Optionally enable grid snapping and set a suitable snap size. Grid snapping and the smart wall guides below are separate features.

#### Draw walls

1. In **Floorplan**, select **Draw wall**.
2. Double-click the reference plane at the first corner. Move the pointer to preview the wall; its live label shows the current length.
3. Double-click the next corner to create the first segment. Continue double-clicking to create a connected run; every endpoint immediately becomes the next segment's start.
4. To force a horizontal plan-axis wall, hold **Ctrl** while positioning and double-clicking the next point. DT3D constrains the segment to the closest X- or Z-aligned result relative to its start. DT3D uses X and Z for the two horizontal floorplan axes; Y is vertical height. Keep **Ctrl** held until the point is placed.
5. Finish the run by placing its endpoint anywhere on an existing wall, or choose **Exit wall and floor tools**. A connection to the middle of a wall creates a T-junction; T-junctions and crossings are split automatically so every join has a real endpoint.

While a wall is previewed without **Ctrl**, DT3D automatically looks for useful relationships with existing walls. Colored snap guidelines identify the relationship that is currently being applied:

| Guideline             | Meaning                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Green                 | **Point snap** — the new endpoint is close to an existing wall endpoint and snaps exactly onto it.               |
| Blue                  | **Endpoint alignment** — the new endpoint shares the X or Z coordinate of an existing endpoint.                  |
| Red                   | **Parallel alignment** — the new segment is nearly parallel to an existing wall and snaps to the same direction. |
| Red and blue together | The new wall is parallel to one wall while its endpoint is aligned with another endpoint.                        |

Point and endpoint-alignment snaps activate within `0.20 m`; parallel alignment activates within `5°`. The lines are temporary editor guides and are not saved or rendered in visualization cards. A direct pointer hit on an existing wall takes priority so it can form a real connection. Holding **Ctrl** uses the manual X/Z constraint instead of these smart guides.

When wall centerlines form a closed loop, DT3D automatically creates a floor surface for that boundary. Moving a wall endpoint updates the matching automatic floor; opening the loop removes it. Adding more walls to the same closed room does not create duplicate floors. You can disable this behavior for the active space from **Floorplan > Wall creation > Create floors automatically** in the object sidebar.

Shared wall endpoints use a separate connection mesh. Each connected wall body stops half its own thickness before the center of the junction, and the connection fills the corner. Open **Wall creation** from the **Floorplan** section of the object sidebar to choose a rectangular or circular connection and set the height, color, and optional baseboard decoration applied by default to newly drawn walls. These defaults do not overwrite walls that already exist.

#### Edit walls and floors

- Select a wall to change its height, thickness, material, and optional baseboard height, depth, and color in the inspector. This edits that wall independently of the creation defaults.
- A selected wall displays blue handles across the full height of its start and end points. Double-click a handle, then drag the translation control to reshape the wall. Every wall sharing that junction moves with it. A shared handle uses the tallest connected wall and changes color when hovered.
- Select **Draw floor surface** to create a floor independently of the wall network. Double-click each boundary point. Every point is projected onto the first point's Y height so the surface stays planar. Hold **Ctrl** to constrain the current edge to X or Z. After adding at least three points, double-click near the first point to close the outline; press **Escape** to discard an unfinished floor.
- Hover a wall to see its length or a floor to see its area. The distance and angle tools in **Measure** provide additional checks.

<img src="readme/5_layout_editor.png" width="500">

### Add and customize doors, windows, and gates

1. Select the target wall, then open **Floorplan > Doors, windows and gates** and choose **Door**, **Window**, or **Gate**.
2. Double-click the desired position on the wall. A direct hit selects that wall, creates the opening as its child, and cuts the wall geometry around it. The tool remains active for additional openings; choose **Exit wall and floor tools** when finished.
3. Select the opening in the scene or object tree. Use **Move** to reposition it along the wall. Moved openings align with and attach to the nearest finite wall segment and remain within that wall's bounds.

All three opening types provide width, visible height, panel thickness, **Open**, and **Opening (%)** controls. Set the percentage to `0` for closed, `100` for fully open, or an intermediate value. **Open** is a shortcut for fully open or closed.

| Opening | Customization available in the inspector                                                                                                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Door    | Hinged or sliding operation; single or double panels; hinge/slide side; inward/outward swing; no knob, round knob, lever, or bar handle; hardware color; optional trim; and an optional glazed opening with configurable size, position, trim, tint, and opacity.                                                         |
| Window  | Hinged or sliding operation; one or two hinged sashes; movable left/right sliding sash; inward/outward swing; frame/trim; glass tint, opacity, and roughness; pane grid rows, columns, bar width, and spacing; horizontal blinds; and louvered shutters. Sliding windows always use two framed sashes on separate tracks. |
| Gate    | Door-style swinging or sliding operation; single or double panels; hinge/slide side; inward/outward swing; a solid panel or vertical bars; and bar width/spacing. A gate always cuts the wall to its full height, even when the visible panel is shorter.                                                                 |

#### Control openings with Home Assistant entities

Use the entity selector beside an opening control to associate it with Home Assistant:

- **Openness entity ID** controls the main door, window, or gate panel.
- **Blind openness entity ID** controls window blinds.
- **Shutter openness entity ID** controls the window's shutter doors.
- **Blade openness entity ID** controls the angle of the louvered shutter blades independently.

The selectors include `binary_sensor`, `cover`, `input_boolean`, `input_number`, `number`, `sensor`, and `switch` entities. DT3D converts their data as follows:

| Home Assistant data                | DT3D opening value           |
| ---------------------------------- | ---------------------------- |
| Numeric state                      | Clamped to `0`–`100` percent |
| Cover `current_position` attribute | Clamped to `0`–`100` percent |
| `on`, `open`, or `true`            | `100%` open                  |
| `off`, `closed`, or `false`        | `0%` open                    |

Selecting an entity makes the corresponding manual percentage field read-only. When the entity supplies a supported value, that value drives the opening automatically. Clear the entity ID to restore manual control. Blind openness is the inverse of **Blind position (% down)**, so a `100%`-open entity raises the blind to `0%` down.

For blinds, choose an inside or outside mounting location, slat spacing, and color. For shutters, choose one or two doors, the door-opening percentage, blade count, independent blade-opening percentage, and color. The opening configuration and all entity associations are saved with the space.

<img src="readme/windows_door.png" width="500">

### Set up viewports

A viewport saves the current camera position, target, projection mode, field of view, and zoom.

1. Navigate to the desired camera position and choose **Create viewport**.
2. Rename the new viewport in the object inspector.
3. Move the camera, right-click the viewport in the tree, and use **Update viewport** whenever the saved camera should be replaced.
4. In the same menu, use **Set default viewport** to make it the default for the space. A space has at most one default viewport.
5. Optionally select a different `default_viewport` in a card's configuration. The card-specific choice overrides the space default for that card.

The optional orientation cube is separate from saved viewports. Double-click a cube face to align the camera to the front, back, left, right, top, or bottom.

### Organize objects with groups

- Create a group to organize objects into a hierarchy or tidy the object tree.
- Groups can be nested. Moving, rotating, scaling, or hiding a group affects all of its children, which is useful for rooms, floors, and entity-driven assemblies.

<img src="readme/groups_editor.png" width="500">

## Configure a space

Open **Space configuration** (cog icon) beside the space selector. The form contains the space name, description, default-space checkbox, appearance, daylight, tone mapping, and post-processing settings. These values are saved with the active space and affect every card that displays it.

### Appearance and daylight

- Enable the procedural sky for a daylight sky dome, or disable it and use a solid-color or transparent background. A transparent background allows the dashboard background to show through the card.
- **Follow Home Assistant date and time** updates the sun position from Home Assistant's configured location and time. The manual elevation and azimuth remain the fallback when sun data is unavailable.
- Ambient color/intensity and sunlight color/intensity control the scene-wide base light and directional sunlight.

<img src="readme/day.png" width="200"><img src="readme/night.png" width="200">

### Post-processing and appearance

| Section         | Options                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Tone mapping    | None, Linear, Reinhard, Cineon, ACES Filmic                                                              |
| Post-processing | Bokeh depth of field, Bloom, GTAO, SSAO, Halftone, Film grain                                            |
| Appearance      | Procedural sky, Home Assistant date/time following, and a solid-color or transparent fallback background |
| Daylight        | Ambient color/intensity, sunlight color/intensity, sun elevation/azimuth                                 |

GTAO and SSAO are mutually exclusive. Post-processing can improve depth and style but is usually the largest GPU cost after high resolution and shadows. Grid visibility, grid size, and snap size are local editor aids rather than space appearance settings.

<img src="readme/4_create_space.png" width="500">

### Measurement tools

- The **Measure** section of the toolbar provides distance and angle measurements.
- Measurement points must be placed on a visible object surface.
- While taking a measurement, the hint box guides you through the required points.
- Completed distances and angles remain visible while you add more measurements or switch tools.
- Select **Clear measurements** to leave measurement mode and remove every completed or unfinished measurement.
- Measurements are editor helpers only and are not saved with the space.
- Selecting another tool, such as a wall tool, exits measurement mode without removing completed measurements.

<img src="readme/measurements.png" width="500">

## Configure visualization cards

Create one or more normal dashboard cards with `visualization_only: true`. Editing controls and the object tree are hidden, while camera navigation and entity interactions remain available.

```yaml
type: custom:dt3d-card
address: https://home.example.com
port: 8080
service_key: replace-with-the-backend-service-key
default_space: 7b9b4c3d-choose-a-space-id
default_viewport: 6a8a2d10-optional-viewport-object-id
navigation_controls: orbit
orientation_cube: false
vr_mode: false
ar_mode: false
ar_location_based: false
ar_location_entity: ""
ar_environment_orientation: 0
visualization_only: true
hide_occluding_walls: true
entity_click_action: open
entity_double_click_action: open
general:
  rendering:
    antialiasing: false
    resolution: 0.75
    shadowMap:
      enabled: false
      type: pcf
      quality: medium
  lowPowerDeviceSettings:
    disableShadowMaps: true
    reduceShadowMapQuality: true
    disablePostProcessing: true
    disableAntialiasing: true
  developmentMode:
    enabled: false
```

Configure `default_space` in visualization mode because viewers cannot switch spaces there. Leave `default_viewport` empty to follow the space's default.

### Card configuration reference

| Option                                                  | Default            | Description                                                                                                                                       |
| ------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `address`                                               | `http://localhost` | Backend scheme and hostname, without the API path or trailing port.                                                                               |
| `port`                                                  | `8080`             | Exposed backend TCP port.                                                                                                                         |
| `service_key`                                           | empty              | Must exactly match the backend `service_key`.                                                                                                     |
| `default_space`                                         | first available    | Space ID opened by this card.                                                                                                                     |
| `default_viewport`                                      | space default      | Viewport object ID opened by this card.                                                                                                           |
| `navigation_controls`                                   | `orbit`            | Camera interaction style: `orbit`, `map`, or `fly`.                                                                                               |
| `orientation_cube`                                      | `false`            | Shows the camera orientation cube.                                                                                                                |
| `vr_mode`                                               | `false`            | Shows a VR button when immersive VR is available through WebXR.                                                                                   |
| `ar_mode`                                               | `false`            | Shows an AR button when immersive AR is available through WebXR.                                                                                  |
| `ar_location_based`                                     | `false`            | Centers AR on a Home Assistant location entity.                                                                                                   |
| `ar_location_entity`                                    | empty              | Entity ID with numeric `latitude` and `longitude` attributes.                                                                                     |
| `ar_environment_orientation`                            | `0`                | Front-of-environment bearing, clockwise in degrees from geographic north.                                                                         |
| `visualization_only`                                    | `false`            | Hides all editing and space-management controls.                                                                                                  |
| `hide_occluding_walls`                                  | `true`             | In visualization mode and at low camera angles, hides the nearest camera-facing wall and at most one connected wall with a different orientation. |
| `entity_click_action`                                   | `nothing`          | `open`, `toggle`, or `nothing`.                                                                                                                   |
| `entity_double_click_action`                            | `open`             | `open`, `toggle`, or `nothing`.                                                                                                                   |
| `general.rendering.antialiasing`                        | `false`            | Smooths geometry edges; changing it recreates the WebGL renderer.                                                                                 |
| `general.rendering.resolution`                          | `1`                | Internal scale: `1`, `0.75`, or `0.5`.                                                                                                            |
| `general.rendering.shadowMap.enabled`                   | `false`            | Enables shadows for compatible lights and meshes.                                                                                                 |
| `general.rendering.shadowMap.type`                      | `pcf`              | `basic`, `pcf`, `pcf_soft`, or `vsm`.                                                                                                             |
| `general.rendering.shadowMap.quality`                   | `medium`           | `very_high`, `high`, `medium`, or `low`; uses separate directional and point-light resolutions.                                                   |
| `general.lowPowerDeviceSettings.disableShadowMaps`      | `false`            | Disables shadow maps on phones and tablets.                                                                                                       |
| `general.lowPowerDeviceSettings.reduceShadowMapQuality` | `false`            | Uses the `low` shadow-map quality preset on phones and tablets.                                                                                   |
| `general.lowPowerDeviceSettings.disablePostProcessing`  | `false`            | Disables every configured post-processing effect on phones and tablets.                                                                           |
| `general.lowPowerDeviceSettings.disableAntialiasing`    | `false`            | Disables WebGL antialiasing on phones and tablets.                                                                                                |
| `general.developmentMode.enabled`                       | `true`             | Shows connection status and build timestamp. Disable for normal dashboards.                                                                       |

Shadow-map quality maps to directional/point-light sizes as follows: `very_high` = 8192/1024, `high` = 4096/512, `medium` = 2048/256, and `low` = 1024/128. The renderer automatically falls back to a supported power-of-two size when the GPU texture or cubemap limit is lower.

Connection, antialiasing, resolution, shadow maps, mobile low-power overrides, and development mode are per-card. Tone mapping, post-processing, and daylight are per-space. Low-power overrides are applied at runtime without changing the saved space configuration.

WebXR immersive modes require a supported browser/device and HTTPS. During an AR session, the sky is hidden and the scene background is forced transparent; the saved space appearance is restored when AR ends. Location-based AR also requires device geolocation and absolute-orientation permission. It converts the device-to-entity geographic offset to meters and aligns the space using the configured bearing.

<img src="readme/6_card_configuration.png" width="500">

<img src="readme/7_dashboard.png" width="500">

## Data synchronization

- A progress indicator appears in the bottom-right corner while DT3D loads data from or stores changes on the server.
- Wait for the indicator to clear before closing or reloading Home Assistant; unsynchronized changes can otherwise be lost.

<img src="readme/synchronization_indicator.png" width="300">

## Performance optimization

The 3D renderer is GPU-bound. Start with the following profile on phones, wall tablets, integrated GPUs, or other low-power devices:

```yaml
general:
  rendering:
    antialiasing: false
    resolution: 0.75
    shadowMap:
      enabled: false
      type: basic
      quality: low
  lowPowerDeviceSettings:
    disableShadowMaps: true
    reduceShadowMapQuality: true
    disablePostProcessing: true
    disableAntialiasing: true
  developmentMode:
    enabled: false
```

Then optimize in this order:

1. Lower `resolution` from `1` to `0.75`, then `0.5`. This usually gives the largest improvement with the smallest visual change.
2. Disable shadow maps. If shadows are required, use `basic` first, limit the number of shadow-casting lights, and disable **Cast shadows** on lights and meshes that do not need them. Select a mesh and expand **Shadows** in the object inspector: **Cast shadows** controls whether the mesh projects a shadow, while **Receive shadows** controls whether shadows are drawn on its surface.
3. Disable post-processing in **Space configuration**. Avoid stacking several effects; GTAO and SSAO cannot be enabled together.
4. Keep antialiasing off on high-DPI displays. Test it only after resolution and shadows are acceptable.
5. Prefer optimized `.glb` models, fewer polygons/materials, compressed textures, and fewer camera entities. Camera objects load and refresh their still images only while their pointer-hover preview is visible.
6. Split very large homes into separate spaces or dashboard views so clients do not render everything at once.

## Troubleshooting

- **An object cannot be moved or reordered:** select it and disable its locked state in the inspector.
- **A wall point cannot be placed:** double-click a visible surface such as a calibrated floorplan reference or plane. Empty scene space cannot receive a wall point.
- **Colored lines appear while drawing walls:** these are temporary [smart snap guidelines](#draw-walls), not scene objects. Green means endpoint snap, blue means endpoint alignment, and red means parallel alignment.
- **A wall will not stay on a plan axis:** hold **Ctrl** while moving the preview and keep it held while double-clicking the endpoint.
- **A door or window is added to the wrong wall:** double-click directly on the intended wall, or move the opening near that wall so it reattaches to the nearest segment.
- **An opening does not follow its entity:** confirm that the entity has a numeric state, a numeric cover `current_position`, or one of the supported open/closed states. Clear and reselect the entity ID if it was renamed.
- **An entity rule does not react:** confirm the exact entity ID and primary state. State triggers compare text exactly apart from case; interpolation requires a numeric primary state and does not read entity attributes.
- **A measurement point is not added:** double-click a visible object surface. Clicking empty scene space does not create a measurement point.
- **Grid settings differ on another device:** grid configuration is stored locally in each browser and is not part of the space.
- **Imported model has missing materials/textures:** use a self-contained `.glb` or apply a texture through the object inspector.
- **The scene is slow on a phone or wall panel:** start with the profile in [Performance optimization](#performance-optimization), then reduce model and texture complexity.

For card loading, connection, authorization, mixed-content, certificate, or space-list problems, see [Setup troubleshooting](SETUP_GUIDE.md#setup-troubleshooting).
