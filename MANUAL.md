# DT3D user manual

This manual explains how to create, edit, and view a Digital Twin 3D for Home
Assistant (DT3D). It covers spaces, 3D objects, Home Assistant entities,
floor-plan tools, measurements, grid configuration, viewports, visualization
cards, and performance.

Complete the [setup guide](SETUP_GUIDE.md) before using this manual. For system
architecture, source layout, and development instructions, see the
[project README](README.md).

## Open the editor

Open the Home Assistant dashboard view that contains the DT3D editing card. A
fullscreen **Panel (one card)** view gives the editor the most working space.
The [setup guide](SETUP_GUIDE.md#create-the-fullscreen-editor) explains how to
create and connect this card.

Keep one editing card for maintaining the digital twin and create separate
read-only visualization cards for normal dashboard use.

<img src="readme/1_editor_panel.png" width="500">

## Using the editor

### Navigate and edit objects

- Orbit, pan, and zoom with the usual mouse/touch gestures. Use the camera
  button to switch between perspective and orthographic projection.
- Select an object in the object tree, then use **Move**, **Rotate**, or
  **Scale** in the left toolbar. The inspector can edit its name, lock state,
  transform, geometry, material, and type-specific properties.
- Drag tree entries to reorder them or make them children of a group. Grouping
  is useful for floors, rooms, furniture, and entity layers.
- Right-click an object in the tree to clone or delete it. Locked objects cannot
  be transformed or dragged.

### Configure the grid

The **Controls** section of the left toolbar contains three grid controls:

- **Snap transforms to grid** (magnet) enables snapping. Translation uses the
  configured snap size, rotation snaps to 15-degree increments, and scale snaps
  to increments of 0.1. Wall points also use the configured snap size when this
  option is active.
- **Toggle grid** shows or hides the editor grid. Grid visibility does not
  enable or disable snapping.
- **Configure grid** opens the grid configuration dialog.

The grid configuration dialog provides:

| Setting     | Default | Description                                                                 |
| ----------- | ------- | --------------------------------------------------------------------------- |
| Grid size   | `200`   | Base visible grid extent in meters. The grid expands as the camera rises.   |
| Snap size   | `0.5`   | Translation and wall-placement snap interval in meters.                    |

Choose **Save** to apply the values. Grid configuration is stored in the
current browser, not in the active space, so other devices can use different
editor grid settings.

> **Screenshot placeholder — grid controls and grid configuration dialog**
>
> _Replace this block with a screenshot._

### Use the measurement tools

The **Measure** section of the left toolbar provides temporary distance and
angle measurements. Measurement points must be placed on a visible object
surface.

#### Measure a distance

1. Select **Measure distance**.
2. Double-click the surface at the start point.
3. Double-click the surface at the end point.

DT3D draws a line between the two points and shows the distance in meters,
rounded to two decimal places.

#### Measure an angle

1. Select **Measure angle**.
2. Double-click the first endpoint.
3. Double-click the angle vertex.
4. Double-click the second endpoint.

DT3D draws two lines from the middle point and shows the angle in degrees,
rounded to two decimal places.

Select **Clear measurements** to leave measurement mode and remove the current
measurement. Measurements are editor helpers only: they are not saved with the
space and are replaced when a new measurement is started. Selecting a wall tool
also exits measurement mode.

> **Screenshot placeholder — distance and angle measurement tools**
>
> _Replace this block with a screenshot._

### Manage spaces

A space is an independent scene with its own objects, saved viewports, daylight,
tone mapping, and post-processing configuration.

1. Use the selector at the top of the editor to switch spaces.
2. Select **Create space**, enter a name and optional description, and confirm.
3. Add or edit objects; changes are synchronized to the backend automatically.
4. To remove the active space, use **Delete space** beside the selector and
   confirm. This permanently deletes every object in that space.

Space creation, switching, and deletion are hidden when
`visualization_only: true`.

<img src="readme/2_editor.png" width="500">

### Add 3D elements

The **Add** section of the left toolbar provides:

- Built-in meshes: cube, sphere, plane, capsule, circle, cone, cylinder,
  dodecahedron, icosahedron, octahedron, ring, tetrahedron, torus, and torus
  knot.
- Uploaded models: `.gltf`, `.glb`, `.obj`, `.fbx`, `.dae` (Collada), `.stl`,
  and `.3ds`. Models can also be dragged onto the canvas. Select or drop
  companion material and texture files with the model, or choose the folder
  option in the upload menu to preserve their relative paths. Prefer a
  self-contained `.glb` when possible for reliable results.
- Static lights: point, spot, and rectangular area lights.
- Groups, saved viewports, and Home Assistant entities.

After adding a mesh, select it to edit constructor dimensions, transform,
material properties, or apply an image texture. Keep imported geometry and
texture sizes modest because they are downloaded and uploaded by each client.

<img src="readme/3_add_objects.png" width="500">

### Add Home Assistant entities

Select **Add entity**, search by entity ID or friendly name, and choose the
entity. Position it with the transform controls. Entity visuals update from the
Home Assistant state supplied to the card.

| Entity domain    | Specialized visualization                                 | Toggle action |
| ---------------- | --------------------------------------------------------- | ------------- |
| `sensor`         | State-aware icon and name/state hover label               | No            |
| `binary_sensor`  | Icon and color derived from the binary state              | No            |
| `camera`         | Still-image panel refreshed approximately every 5 seconds | No            |
| `climate`        | HVAC-mode color and target temperature while active       | No            |
| `light`          | State/color icon plus a configurable 3D light source      | Yes           |
| `switch`         | State icon and name/state hover label                     | Yes           |
| Any other domain | Generic marker and friendly-name label                    | No            |

All entity domains can use **Open entity** to show Home Assistant's more-info
dialog. Card-wide single- and double-click defaults can be `open`, `toggle`, or
`nothing`. Each entity can inherit or override those defaults in its inspector;
**Toggle** is only offered for `light` and `switch` objects.

> **Screenshot placeholder — adding an entity and configuring its interactions**
>
> _Replace this block with a screenshot._

### Draw a floor plan with walls, doors, and windows

1. Add or import a floor/plane so the wall tool has a surface to intersect.
2. Optionally enable grid snapping and set the required snap size.
3. Select **Draw wall**. Double-click once for the start point, then double-click
   each following point to draw connected wall segments continuously. End on any
   part of an existing wall to finish the run, or choose **Exit wall tools**.
4. Select a wall in the canvas or object tree.
5. Choose **Add door to selected wall** or **Add window to selected wall**, then
   double-click the canvas. The opening is created as a child of that wall.
6. Select the wall, door, or window to edit dimensions, transform, material, and
   open state. Choose **Exit wall tools** when finished.

The wall inspector exposes height and thickness; the live wall label helps with
length. The distance and angle tools in the **Measure** section are useful for
checking the plan.

<img src="readme/5_layout_editor.png" width="500">

### Set up viewports

A viewport saves the current camera position, target, projection mode, field of
view, and zoom.

1. Navigate to the desired camera position and choose **Create viewport**.
2. Rename the new viewport in the object inspector.
3. Move the camera, right-click the viewport in the tree, and use **Update
   viewport** whenever the saved camera should be replaced.
4. In the same menu, use **Set default viewport** to make it the default for the
   space. A space has at most one default viewport.
5. Optionally select a different `default_viewport` in a card's configuration.
   The card-specific choice overrides the space default for that card.

The optional orientation cube is separate from saved viewports. Double-click a
cube face to align the camera to the front, back, left, right, top, or bottom.

### Configure a space

Open **Space configuration** (sun icon) in the left toolbar. These values are
saved with the active space and therefore affect every card that displays it:

| Section         | Options                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tone mapping    | None, Linear, Reinhard, Cineon, ACES Filmic                                                                                                                 |
| Post-processing | Bokeh depth of field, Bloom, GTAO, SSAO, Halftone, Film grain                                                                                               |
| Appearance      | Enable or disable the procedural sky, optionally follow Home Assistant's local date/time daylight cycle, and choose a solid-color or transparent background |
| Daylight        | Ambient color/intensity, sunlight color/intensity, sun elevation/azimuth                                                                                    |

GTAO and SSAO are mutually exclusive. Post-processing can improve depth and
style but is usually the largest GPU cost after high resolution and shadows.
Grid visibility, grid size, and snap size are local editor aids rather than
space appearance settings.

<img src="readme/4_create_space.png" width="500">

## Configure visualization cards

Create one or more normal dashboard cards with `visualization_only: true`.
Editing controls and the object tree are hidden, while camera navigation and
entity interactions remain available.

```yaml
type: custom:dt3d-card
address: https://home.example.com
port: 8080
service_key: replace-with-the-backend-service-key
default_space: 7b9b4c3d-choose-a-space-id
default_viewport: 6a8a2d10-optional-viewport-object-id
navigation_controls: orbit
orientation_cube: false
visualization_only: true
entity_click_action: open
entity_double_click_action: open
general:
  rendering:
    antialiasing: false
    resolution: 0.75
    shadowMap:
      enabled: false
      type: pcf
      resolution: 2048
  developmentMode:
    enabled: false
```

Configure `default_space` in visualization mode because viewers cannot switch
spaces there. Leave `default_viewport` empty to follow the space's default.

### Card configuration reference

| Option                                   | Default            | Description                                                                      |
| ---------------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `address`                                | `http://localhost` | Backend scheme and hostname, without the API path or trailing port.              |
| `port`                                   | `8080`             | Exposed backend TCP port.                                                        |
| `service_key`                            | empty              | Must exactly match the backend `service_key`.                                    |
| `default_space`                          | first available    | Space ID opened by this card.                                                    |
| `default_viewport`                       | space default      | Viewport object ID opened by this card.                                          |
| `navigation_controls`                    | `orbit`            | Camera interaction style: `orbit`, `map`, or `fly`.                              |
| `orientation_cube`                       | `false`            | Shows the camera orientation cube.                                               |
| `visualization_only`                     | `false`            | Hides all editing and space-management controls.                                 |
| `entity_click_action`                    | `nothing`          | `open`, `toggle`, or `nothing`.                                                  |
| `entity_double_click_action`             | `open`             | `open`, `toggle`, or `nothing`.                                                  |
| `general.rendering.antialiasing`         | `false`            | Smooths geometry edges; changing it recreates the WebGL renderer.                |
| `general.rendering.resolution`           | `1`                | Internal scale: `1`, `0.75`, or `0.5`.                                           |
| `general.rendering.shadowMap.enabled`    | `false`            | Enables shadows for compatible lights and meshes.                                |
| `general.rendering.shadowMap.type`       | `pcf`              | `basic`, `pcf`, `pcf_soft`, or `vsm`.                                            |
| `general.rendering.shadowMap.resolution` | `2048`             | Resolution applied to every shadow map: `256`, `512`, `1024`, `2048`, or `4096`. |
| `general.developmentMode.enabled`        | `true`             | Shows connection status and build timestamp. Disable for normal dashboards.      |

Connection, antialiasing, resolution, shadow maps, and development mode are
per-card. Tone mapping, post-processing, and daylight are per-space.

<img src="readme/6_card_configuration.png" width="500">

<img src="readme/7_dashboard.png" width="500">

## Performance optimization

- The digital twin 3D renderer is GPU-bound. The following settings and practices can improve performance on low-end devices, integrated GPUs, and mobile phones.
- Start with the following profile on phones, wall tablets, and integrated GPUs:

```yaml
general:
  rendering:
    antialiasing: false
    resolution: 0.75
    shadowMap:
      enabled: false
      type: basic
  developmentMode:
    enabled: false
```

Then optimize in this order:

1. Lower `resolution` from `1` to `0.75`, then `0.5`. This usually gives the
   largest improvement with the smallest visual change.
2. Disable shadow maps. If shadows are required, use `basic` first, limit the
   number of shadow-casting lights, and disable **Cast shadows** on lights that
   do not need them.
3. Disable post-processing in **Space configuration**. Avoid stacking several
   effects; GTAO and SSAO cannot be enabled together.
4. Keep antialiasing off on high-DPI displays. Test it only after resolution and
   shadows are acceptable.
5. Prefer optimized `.glb` models, fewer polygons/materials, compressed
   textures, and fewer camera entities. Camera objects refresh their still
   images regularly and add network/DOM work.
6. Split very large homes into separate spaces or dashboard views so clients do
   not render everything at once.

## Troubleshooting

- **An object cannot be moved or reordered:** select it and disable its locked
  state in the inspector.
- **A measurement point is not added:** double-click a visible object surface.
  Clicking empty scene space does not create a measurement point.
- **Grid settings differ on another device:** grid configuration is stored
  locally in each browser and is not part of the space.
- **Imported model has missing materials/textures:** use a self-contained `.glb`
  or apply a texture through the object inspector.
- **The scene is slow on a phone or wall panel:** start with the profile in
  [Performance optimization](#performance-optimization), then reduce model and
  texture complexity.

For card loading, connection, authorization, mixed-content, certificate, or
space-list problems, see
[Setup troubleshooting](SETUP_GUIDE.md#setup-troubleshooting).
