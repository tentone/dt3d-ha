# DT3D setup and usage manual

This manual covers installation, networking, configuration, editing, and
dashboard usage for Digital Twin 3D for Home Assistant (DT3D). The system has
two parts:

For architecture, source layout, and development instructions, see the
[project README](README.md).

- `addon/`: the backend app/add-on. It stores spaces and objects in SQLite and
  exposes them over an authenticated HTTP(S) API.
- `frontend/`: the `custom:dt3d-card` dashboard card. It contains both the
  editor and the read-only visualization mode.

> [!IMPORTANT]
> Home Assistant apps/add-ons are installed from the **Apps/Add-ons store**, not
> from HACS. HACS is only used for dashboard frontend resources. The current
> source checkout does not yet contain the `repository.yaml`, `hacs.json`, and
> built release asset needed for one-click store/HACS installation. The manual
> installation paths below work with the repository as it is today.

## Requirements

- Home Assistant OS or Home Assistant Supervised for the backend app/add-on.
- A hostname that every browser used for Home Assistant can resolve.
- A certificate valid for that hostname if Home Assistant is served over HTTPS.
- Node.js and npm only when building the frontend from source.

## Installation

### 1. Install the backend app/add-on

#### From a custom app/add-on repository

Use these steps when DT3D is published with Home Assistant app repository
metadata:

1. Open **Settings → Apps** (called **Add-ons** in older Home Assistant
   versions), then open the **App store**.
2. Open the three-dot menu, choose **Repositories**, and add:

   ```text
   https://github.com/tentone/dt3d-ha
   ```

3. Close the repository dialog, refresh the store, and select **DT3D**.
4. Select **Install**.
5. On the **Configuration** tab, set a long, random `service_key`.
6. Configure TLS as described in [Network and TLS setup](#network-and-tls-setup),
   then start the app and enable **Start on boot**.

> **Screenshot placeholder — adding the DT3D repository to the Apps/Add-ons store**
>
> _Replace this block with a screenshot._

> **Screenshot placeholder — installing and configuring the DT3D backend**
>
> _Replace this block with a screenshot._

#### Manual installation from this checkout

Copy the repository's `addon` directory to `/addons/dt3d` on Home Assistant,
reload the app/add-on store, and install the local **DT3D** app. The included
development script can perform that copy, rebuild, and restart over SSH:

```bash
bash ./addon/deploy.sh <ssh-user> '<ssh-password>' [ha-host] [ssh-port]

# Example
bash ./addon/deploy.sh root '<ssh-password>' homeassistant.local 22
```

The script requires the **Terminal & SSH** app/add-on on Home Assistant and
`sshpass` on the development computer. It defaults to `homeassistant.local`
and SSH port `22`.

The backend listens on the configured port (default `8080`) and requires the
same service key used by every DT3D card. After starting it, test the API:

```bash
curl -H "X-DT3D-Service-Key: <service-key>" \
  http://homeassistant.local:8080/api/hello
```

Use `https://` after TLS is enabled. Add `-k` only while testing a self-signed
certificate; it is not a browser-side fix.

### 2. Install the frontend

#### HACS installation

Once DT3D publishes a built `dt3d-card.js` as a HACS Dashboard repository:

1. Open **HACS → three-dot menu → Custom repositories**.
2. Add `https://github.com/tentone/dt3d-ha` with category **Dashboard**.
3. Open **Digital Twin 3D**, select **Download**, and restart or hard-refresh
   the browser when prompted.
4. If HACS does not register the resource automatically, add the downloaded JS
   file under **Settings → Dashboards → three-dot menu → Resources** as a
   JavaScript module. HACS dashboard files are normally served below
   `/hacsfiles/`.

> **Screenshot placeholder — adding DT3D as a HACS Dashboard repository**
>
> _Replace this block with a screenshot._

> **Screenshot placeholder — downloading the DT3D frontend in HACS**
>
> _Replace this block with a screenshot._

#### Build and install manually from this checkout

```bash
cd frontend
npm install
npm run build
```

Copy `frontend/dist/dt3d-card.js` to Home Assistant's
`/config/www/dt3d-card.js`. Then open **Settings → Dashboards → three-dot menu
→ Resources**, add `/local/dt3d-card.js`, and select **JavaScript module**.
Hard-refresh every browser that had the dashboard open after updating the file.

> **Screenshot placeholder — registering `/local/dt3d-card.js` as a dashboard resource**
>
> _Replace this block with a screenshot._

## Network and TLS setup

The card runs in the user's browser and connects directly to the backend. The
backend therefore must be reachable from every phone, tablet, and computer that
opens the dashboard; `localhost` normally points to that client device and is
not a suitable production address.

### Recommended layout: one hostname and one trusted certificate

For example:

```text
Home Assistant UI: https://home.example.com
DT3D backend:      https://home.example.com:8080
Card address:      https://home.example.com
Card port:         8080
```

The ports make these different browser origins, but the backend includes CORS
support. Using the same hostname and certificate keeps DNS and certificate
trust consistent.

1. Make `home.example.com` resolve to the Home Assistant host on the local
   network. If the dashboard is used remotely, configure external DNS and the
   router/reverse proxy as appropriate.
2. Make TCP port `8080` (or the configured port) reachable from dashboard
   clients. Do not expose it publicly unless remote access requires it; the
   service key protects the API but should still be treated as a password.
3. Put the certificate and private key already used for Home Assistant in its
   `/ssl` directory. The certificate's subject alternative names must contain
   the hostname entered in the card.
4. Configure DT3D with the same pair:

   ```yaml
   port: 8080
   service_key: "replace-with-a-long-random-secret"
   ssl_certificate: /ssl/fullchain.pem
   ssl_key: /ssl/privkey.pem
   use_self_signed_certificate: false
   ```

5. Restart DT3D and open `https://home.example.com:8080/api/hello` once in a
   browser or test it with `curl`. A `401 Unauthorized` response without the
   header still proves that DNS, routing, and TLS are working.
6. Use `address: https://home.example.com` and `port: 8080` in every card.

The certificate and key options also accept PEM content directly:

```yaml
ssl_certificate: |
  -----BEGIN CERTIFICATE-----
  ...
  -----END CERTIFICATE-----
ssl_key: |
  -----BEGIN PRIVATE KEY-----
  ...
  -----END PRIVATE KEY-----
use_self_signed_certificate: false
```

If no trusted certificate is available, set
`use_self_signed_certificate: true`. DT3D generates and reuses a certificate in
`/data`, but every client must trust it. A Home Assistant page loaded over HTTPS
cannot call an HTTP backend because browsers block mixed content.

> **Screenshot placeholder — Home Assistant and DT3D using the same hostname and certificate**
>
> _Replace this block with a screenshot or network diagram._

## Create the fullscreen editor

Keep one editing card and create separate read-only cards for daily dashboard
use.

1. Edit a dashboard and create a new view.
2. Set the view layout/type to **Panel (one card)**. Panel view stretches its
   only card to the available view area.
3. Add a **Manual** card with the configuration below. Leave
   `visualization_only` set to `false` for the editor.

```yaml
type: custom:dt3d-card
address: https://home.example.com
port: 8080
service_key: replace-with-the-backend-service-key
default_space: ""
default_viewport: ""
navigation_controls: orbit
orientation_cube: true
visualization_only: false
entity_click_action: nothing
entity_double_click_action: toggle
general:
  rendering:
    antialiasing: false
    resolution: 1
    shadowMap:
      enabled: false
      type: pcf
  developmentMode:
    enabled: false
```

The visual card editor exposes the same settings. After the connection fields
are valid, its **Default space** and **Viewport** lists are loaded from the
backend.

> **Screenshot placeholder — a DT3D editor card in a Panel (one card) view**
>
> _Replace this block with a screenshot._

## Using the editor

### Navigate and edit objects

- Orbit, pan, and zoom with the usual mouse/touch gestures. Use the camera
  button to switch between perspective and orthographic projection.
- Select an object in the object tree, then use **Move**, **Rotate**, or
  **Scale** in the left toolbar. The inspector can edit its name, lock state,
  transform, geometry, material, and type-specific properties.
- Enable grid snapping with the magnet button. The adjacent grid controls show
  the grid and configure its size and snap spacing.
- Drag tree entries to reorder them or make them children of a group. Grouping
  is useful for floors, rooms, furniture, and entity layers.
- Right-click an object in the tree to clone or delete it. Locked objects cannot
  be transformed or dragged.

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

> **Screenshot placeholder — the space selector with create and delete actions**
>
> _Replace this block with a screenshot._

### Add 3D elements

The **Add** section of the left toolbar provides:

- Built-in meshes: cube, sphere, plane, capsule, circle, cone, cylinder,
  dodecahedron, icosahedron, octahedron, ring, tetrahedron, torus, and torus
  knot.
- Uploaded models: `.gltf`, `.glb`, `.obj`, and `.fbx`. Models can also be
  dragged onto the canvas. A standalone `.obj` is supported, but companion MTL
  or external texture selection is not part of the file picker; prefer a
  self-contained `.glb` for reliable results.
- Static lights: point, spot, and rectangular area lights.
- Groups, saved viewports, and Home Assistant entities.

After adding a mesh, select it to edit constructor dimensions, transform,
material properties, or apply an image texture. Keep imported geometry and
texture sizes modest because they are downloaded and uploaded by each client.

> **Screenshot placeholder — the Add menu and a selected mesh inspector**
>
> _Replace this block with a screenshot._

### Add Home Assistant entities

Select **Add entity**, search by entity ID or friendly name, and choose the
entity. Position it with the transform controls. Entity visuals update from the
Home Assistant state supplied to the card.

| Entity domain | Specialized visualization | Toggle action |
| --- | --- | --- |
| `sensor` | State-aware icon and name/state hover label | No |
| `binary_sensor` | Icon and color derived from the binary state | No |
| `camera` | Still-image panel refreshed approximately every 5 seconds | No |
| `light` | State/color icon plus a configurable 3D light source | Yes |
| `switch` | State icon and name/state hover label | Yes |
| Any other domain | Generic marker and friendly-name label | No |

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
3. Select **Draw wall**. Double-click once for the start point and double-click
   again for the end point. Repeat for each segment.
4. Select a wall in the canvas or object tree.
5. Choose **Add door to selected wall** or **Add window to selected wall**, then
   double-click the canvas. The opening is created as a child of that wall.
6. Select the wall, door, or window to edit dimensions, transform, material, and
   open state. Choose **Exit wall tools** when finished.

The wall inspector exposes height and thickness; the live wall label helps with
length. The distance and angle tools in the **Measure** section are useful for
checking the plan.

> **Screenshot placeholder — drawing walls and adding a door/window**
>
> _Replace this block with a screenshot._

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

> **Screenshot placeholder — viewport objects and their tree actions**
>
> _Replace this block with a screenshot._

### Configure a space

Open **Space configuration** (sun icon) in the left toolbar. These values are
saved with the active space and therefore affect every card that displays it:

| Section | Options |
| --- | --- |
| Tone mapping | None, Linear, Reinhard, Cineon, ACES Filmic |
| Post-processing | Bokeh depth of field, Bloom, GTAO, SSAO, Halftone, Film grain |
| Daylight | Ambient color/intensity, sunlight color/intensity, sun elevation/azimuth |

GTAO and SSAO are mutually exclusive. Post-processing can improve depth and
style but is usually the largest GPU cost after high resolution and shadows.
Grid visibility, grid size, and snap size are local editor aids rather than
space appearance settings.

> **Screenshot placeholder — the Space configuration dialog**
>
> _Replace this block with a screenshot._

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
entity_double_click_action: toggle
general:
  rendering:
    antialiasing: false
    resolution: 0.75
    shadowMap:
      enabled: false
      type: pcf
  developmentMode:
    enabled: false
```

Configure `default_space` in visualization mode because viewers cannot switch
spaces there. Leave `default_viewport` empty to follow the space's default.

### Card configuration reference

| Option | Default | Description |
| --- | --- | --- |
| `address` | `http://localhost` | Backend scheme and hostname, without the API path or trailing port. |
| `port` | `8080` | Exposed backend TCP port. |
| `service_key` | empty | Must exactly match the backend `service_key`. |
| `default_space` | first available | Space ID opened by this card. |
| `default_viewport` | space default | Viewport object ID opened by this card. |
| `navigation_controls` | `orbit` | Camera interaction style: `orbit`, `map`, or `fly`. |
| `orientation_cube` | `false` | Shows the camera orientation cube. |
| `visualization_only` | `false` | Hides all editing and space-management controls. |
| `entity_click_action` | `nothing` | `open`, `toggle`, or `nothing`. |
| `entity_double_click_action` | `toggle` | `open`, `toggle`, or `nothing`. |
| `general.rendering.antialiasing` | `false` | Smooths geometry edges; changing it recreates the WebGL renderer. |
| `general.rendering.resolution` | `1` | Internal scale: `1`, `0.75`, or `0.5`. |
| `general.rendering.shadowMap.enabled` | `false` | Enables shadows for compatible lights and meshes. |
| `general.rendering.shadowMap.type` | `pcf` | `basic`, `pcf`, `pcf_soft`, or `vsm`. |
| `general.developmentMode.enabled` | `true` | Shows connection status and build timestamp. Disable for normal dashboards. |

Connection, antialiasing, resolution, shadow maps, and development mode are
per-card. Tone mapping, post-processing, and daylight are per-space.

> **Screenshot placeholder — a read-only DT3D visualization card in a dashboard**
>
> _Replace this block with a screenshot._

## Performance optimization

Start with the following profile on phones, wall tablets, and integrated GPUs:

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

- **Card not found:** verify the resource URL, resource type **JavaScript
  module**, and hard-refresh the browser.
- **Connection failed:** confirm the hostname is reachable from the browser,
  port `8080` is open, and the backend is running.
- **401 Unauthorized:** make the card and backend service keys identical. Avoid
  accidental leading/trailing spaces.
- **Mixed-content error:** use HTTPS for DT3D whenever the Home Assistant page
  uses HTTPS.
- **Certificate warning:** the certificate must be trusted and valid for the
  exact hostname in `address`; a certificate for a DNS name normally does not
  validate an IP address.
- **Spaces absent in the visual editor:** finish the address, port, and service
  key fields, wait for the list to reload, and check the browser console/network
  panel for TLS, CORS, or authorization errors.
- **Imported model has missing materials/textures:** use a self-contained `.glb`
  or apply a texture through the object inspector.
