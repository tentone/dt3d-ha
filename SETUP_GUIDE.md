# DT3D setup guide

This guide explains how to install and connect Digital Twin 3D for Home Assistant (DT3D). After setup is complete, use the [Studio walkthrough](MANUAL.md#studio-walkthrough) to build your first digital twin.

DT3D has two parts:

- The Home Assistant app/add-on stores spaces and objects and exposes them through an authenticated HTTP(S) API.
- The `custom:dt3d-card` frontend provides the 3D editor and read-only visualization mode in Home Assistant dashboards.

Install the backend from the **App store** and the dashboard card from **Marketplace** on Home Assistant 2026.11 or later. On earlier versions, use HACS for the dashboard card.

## Requirements

- Home Assistant OS or Home Assistant Supervised for the backend app/add-on.
- A hostname that every browser used for Home Assistant can resolve.
- A certificate valid for that hostname when Home Assistant is served over HTTPS.
- Network access from every dashboard client to the configured DT3D backend port.

Node.js and npm are required only when building the frontend from source. See the [project README](README.md) for development instructions.

## Install the DT3D add-on

1. Open **Settings → Apps**. In older Home Assistant versions, this is called **Settings → Add-ons**.
2. Open the **App store**.
3. Open the three-dot menu and select **Repositories**.
4. Add:

   ```text
   https://github.com/tentone/dt3d-ha
   ```

5. Close the repository dialog and refresh the store.
6. Select **DT3D**, then select **Install**.
7. Open the **Configuration** tab and set a long, random `service_key`.
8. Configure HTTP or HTTPS as described in [Configure the backend](#configure-the-backend).
9. Start the app/add-on and enable **Start on boot**.

## Install the dashboard card

### Home Assistant 2026.11 and later

1. Open **Settings → Marketplace** and select **Add from link**.
2. Enter `https://github.com/tentone/dt3d-ha` and select **Add**. Connect your GitHub account when prompted. If Marketplace asks for a type, choose **Dashboard** and select **Add** again.
3. Open **Digital Twin 3D**, select **Install**, and confirm the version.
4. Reload your browser after installation.

Marketplace registers the dashboard resource automatically for dashboards that manage resources in the UI. If you manage resources in YAML, use the URL shown in the install dialog and set the resource type to `module`. The card is served at `/local/community/dt3d-ha/dt3d-card.js`, with a version query parameter in the install dialog.

If you installed DT3D through HACS before upgrading Home Assistant, Marketplace migrates the installation automatically.

### Earlier Home Assistant versions

1. Open **HACS → three-dot menu → Custom repositories**.
2. Add `https://github.com/tentone/dt3d-ha` with category **Dashboard**.
3. Open **Digital Twin 3D** and select **Download**.
4. Reload your browser after installation.

If HACS does not register the resource automatically, add `/hacsfiles/dt3d-ha/dt3d-card.js` as a **JavaScript module** under **Settings → Dashboards → three-dot menu → Resources**.

## Configure the backend

The following example uses a certificate and key stored in Home Assistant's `/ssl` directory:

```yaml
port: 8080
service_key: "replace-with-a-long-random-secret"
ssl_certificate: /ssl/fullchain.pem
ssl_key: /ssl/privkey.pem
use_self_signed_certificate: false
```

| Option | Description |
| --- | --- |
| `port` | TCP port exposed by the backend API. |
| `mcp_enabled` | Starts the optional MCP server. Defaults to `false`. |
| `service_key` | Shared secret that must exactly match the card configuration. |
| `ssl_certificate` | Certificate path, PEM certificate content, or empty for HTTP. |
| `ssl_key` | Private-key path, PEM private-key content, or empty for HTTP. |
| `use_self_signed_certificate` | Generates and reuses a self-signed certificate when set to `true`. |

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

Keep the `service_key` private. Anyone who can reach the backend and has this key can use the DT3D API.

### Network and TLS setup

The card runs in the user's browser and connects directly to the backend. The backend must therefore be reachable from every phone, tablet, and computer that opens the dashboard.

A Home Assistant page loaded over HTTPS cannot call an HTTP backend because browsers block mixed content. When Home Assistant uses HTTPS, configure DT3D with HTTPS as well.

The recommended layout uses one hostname and one trusted certificate:

```text
Home Assistant UI: https://home.example.com:8123
DT3D backend:      https://home.example.com:8080
```

The different ports make these separate browser origins, but the backend provides CORS support. Make sure TCP port `8080`, or the selected alternative, is reachable from all dashboard clients.

If no trusted certificate is available, set `use_self_signed_certificate: true`. DT3D generates and reuses a certificate in `/data`. Every client must trust that certificate before it can connect. A trusted certificate is preferable because it avoids per-device certificate warnings.

## Connect an MCP client

1. Open **Settings → Apps → DT3D → Configuration** and turn on **Enable MCP server**.
2. Under **Network**, enter the host port for **DT3D MCP server port** (`8081/tcp`). You can use `8081` or any available host port. Save and restart the add-on.
3. In your MCP client, select **Streamable HTTP** and enter `https://homeassistant.local:8081/mcp`, substituting your host and selected port. Use `http://` when the add-on's TLS is off. Configure the DT3D `service_key` as a bearer token or send it in the `X-DT3D-Service-Key` request header.

To disable MCP, turn off **Enable MCP server**, clear the Network field, and restart the add-on. The MCP and dashboard API use the same space database and TLS settings.

| Task | MCP tools |
| --- | --- |
| Find, create, rename, configure or delete a space | `list_spaces`, `get_space`, `create_space`, `edit_space`, `delete_space` |
| Build rooms, walls, floor polygons, doors, windows, gates and furniture | `build_floorplan`, `list_furniture` |
| Add a calibrated floorplan image | `add_floorplan_reference` |
| Edit, move, group or delete scene objects and create lights, viewports or entity bindings | `list_objects`, `create_object`, `edit_object`, `delete_object` |
| Create or replace a material, including textures | `list_materials`, `save_material`, `delete_material`. Assign the material with `build_floorplan` or `edit_object`. |
| Import an editable group of static meshes | `import_model` accepts GLB, glTF, OBJ, FBX, DAE, STL and 3DS files. Send the base64 model and any companion files, such as textures, glTF buffers and OBJ material libraries. The decoded upload limit is 32 MiB in total. |

Coordinates are in meters with Y up. Wall endpoints and floor outlines use X and Z. Positions in a hierarchy are relative to the parent, and rotations are in radians. A `build_floorplan` request can create a floor and its perimeter walls from a room boundary or add individual elements to an existing plan. For shared walls, define and reference each wall once. Use `add_floorplan_reference` to scale a PNG, JPEG or GIF between two known image points.

Reload or reopen the space in the dashboard after making MCP edits.

## Create the fullscreen editor

Use one editing card to maintain the digital twin and separate read-only cards for everyday dashboard use.

1. Edit a Home Assistant dashboard and create a new view.
2. Set the view layout/type to **Panel (one card)**.
3. Add a **Manual** card with the configuration below.
4. Replace the example address and service key with the backend values.
5. Keep `visualization_only: false` for the editing card.

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
entity_double_click_action: open
general:
  rendering:
    antialiasing: false
    resolution: 1
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

The visual card editor exposes the same settings. After the connection fields are valid, its **Default space** and **Viewport** lists are loaded from the backend.

<img src="readme/1_editor_panel.png" width="500">

## Verify the installation

1. Open the editor dashboard view.
2. Confirm that the DT3D editor loads without a connection warning.
3. Create a test space.
4. Add a cube and refresh the page.
5. Confirm that the space and cube reload from the backend.

After verification, continue with the [DT3D user manual](MANUAL.md). To add read-only dashboard views, see [Configure visualization cards](MANUAL.md#configure-visualization-cards).

## Setup troubleshooting

- **Card not found:** verify the resource URL and the **JavaScript module** resource type, then hard-refresh the browser.
- **Connection failed:** confirm the hostname is reachable from the browser, the configured port is open, and the backend is running.
- **401 Unauthorized:** make the card and backend `service_key` values identical. Check for accidental leading or trailing spaces.
- **Mixed-content error:** use HTTPS for DT3D whenever the Home Assistant page uses HTTPS.
- **Certificate warning:** the certificate must be trusted and valid for the exact hostname in `address`. A certificate for a DNS name normally does not validate an IP address.
- **Spaces absent in the visual card editor:** complete the address, port, and service-key fields, wait for the lists to reload, and check the browser console or network panel for TLS, CORS, and authorization errors.
