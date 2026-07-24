# DT3D setup guide

This guide explains how to install and connect Digital Twin 3D for Home
Assistant (DT3D). After setup is complete, use the [user manual](MANUAL.md) to
create and manage the digital twin.

DT3D has two parts:

- The Home Assistant app/add-on stores spaces and objects and exposes them
  through an authenticated HTTP(S) API.
- The `custom:dt3d-card` frontend provides the 3D editor and read-only
  visualization mode in Home Assistant dashboards.

Home Assistant apps/add-ons are installed from the **Apps/Add-ons store**. The
dashboard frontend is installed through HACS.

## Requirements

- Home Assistant OS or Home Assistant Supervised for the backend app/add-on.
- HACS for installing the dashboard frontend.
- A hostname that every browser used for Home Assistant can resolve.
- A certificate valid for that hostname when Home Assistant is served over
  HTTPS.
- Network access from every dashboard client to the configured DT3D backend
  port.

Node.js and npm are required only when building the frontend from source. See
the [project README](README.md) for development instructions.

## Install the DT3D add-on

1. Open **Settings → Apps**. In older Home Assistant versions, this is called
   **Settings → Add-ons**.
2. Open the **App store**.
3. Open the three-dot menu and select **Repositories**.
4. Add:

   ```text
   https://github.com/tentone/dt3d-ha
   ```

5. Close the repository dialog and refresh the store.
6. Select **DT3D**, then select **Install**.
7. Open the **Configuration** tab and set a long, random `service_key`.
8. Configure HTTP or HTTPS as described in
   [Configure the backend](#configure-the-backend).
9. Start the app/add-on and enable **Start on boot**.

## Install the frontend

1. Open **HACS → three-dot menu → Custom repositories**.
2. Add `https://github.com/tentone/dt3d-ha` with category **Dashboard**.
3. Open **Digital Twin 3D** and select **Download**.
4. Restart Home Assistant or hard-refresh the browser when prompted.

If HACS does not register the resource automatically, open
**Settings → Dashboards → three-dot menu → Resources** and add the downloaded
`dt3d-card.js` file as a **JavaScript module**. HACS dashboard files are
normally served below `/hacsfiles/`.

## Configure the backend

The following example uses a certificate and key stored in Home Assistant's
`/ssl` directory:

```yaml
port: 8080
service_key: "replace-with-a-long-random-secret"
ssl_certificate: /ssl/fullchain.pem
ssl_key: /ssl/privkey.pem
use_self_signed_certificate: false
```

| Option                        | Description                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| `port`                        | TCP port exposed by the backend API.                                        |
| `service_key`                 | Shared secret that must exactly match the card configuration.               |
| `ssl_certificate`             | Certificate path, PEM certificate content, or empty for HTTP.               |
| `ssl_key`                     | Private-key path, PEM private-key content, or empty for HTTP.                |
| `use_self_signed_certificate` | Generates and reuses a self-signed certificate when set to `true`.          |

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

Keep the `service_key` private. Anyone who can reach the backend and has this
key can use the DT3D API.

### Network and TLS setup

The card runs in the user's browser and connects directly to the backend. The
backend must therefore be reachable from every phone, tablet, and computer that
opens the dashboard.

A Home Assistant page loaded over HTTPS cannot call an HTTP backend because
browsers block mixed content. When Home Assistant uses HTTPS, configure DT3D
with HTTPS as well.

The recommended layout uses one hostname and one trusted certificate:

```text
Home Assistant UI: https://home.example.com:8123
DT3D backend:      https://home.example.com:8080
```

The different ports make these separate browser origins, but the backend
provides CORS support. Make sure TCP port `8080`, or the selected alternative,
is reachable from all dashboard clients.

If no trusted certificate is available, set
`use_self_signed_certificate: true`. DT3D generates and reuses a certificate in
`/data`. Every client must trust that certificate before it can connect. A
trusted certificate is preferable because it avoids per-device certificate
warnings.

## Create the fullscreen editor

Use one editing card to maintain the digital twin and separate read-only cards
for everyday dashboard use.

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
      resolution: 2048
  developmentMode:
    enabled: false
```

The visual card editor exposes the same settings. After the connection fields
are valid, its **Default space** and **Viewport** lists are loaded from the
backend.

<img src="readme/1_editor_panel.png" width="500">

## Verify the installation

1. Open the editor dashboard view.
2. Confirm that the DT3D editor loads without a connection warning.
3. Create a test space.
4. Add a cube and refresh the page.
5. Confirm that the space and cube reload from the backend.

After verification, continue with the [DT3D user manual](MANUAL.md). To add
read-only dashboard views, see
[Configure visualization cards](MANUAL.md#configure-visualization-cards).

## Setup troubleshooting

- **Card not found:** verify the resource URL and the **JavaScript module**
  resource type, then hard-refresh the browser.
- **Connection failed:** confirm the hostname is reachable from the browser,
  the configured port is open, and the backend is running.
- **401 Unauthorized:** make the card and backend `service_key` values
  identical. Check for accidental leading or trailing spaces.
- **Mixed-content error:** use HTTPS for DT3D whenever the Home Assistant page
  uses HTTPS.
- **Certificate warning:** the certificate must be trusted and valid for the
  exact hostname in `address`. A certificate for a DNS name normally does not
  validate an IP address.
- **Spaces absent in the visual card editor:** complete the address, port, and
  service-key fields, wait for the lists to reload, and check the browser
  console or network panel for TLS, CORS, and authorization errors.
