# Digital Twin 3D Home Assistant (DT3DHA)

This repository provides a minimal Home Assistant integration composed of:

- **Frontend card** (`frontend/`): A custom card built with [Vite](https://vitejs.dev) and [three.js](https://threejs.org) that renders a spinning 3D cube. The built card registers the `dt3d-card` element.
- **Backend add-on** (`addon/`): A Go server using SQLite intended to run as a Home Assistant add-on. It exposes a simple `/api/hello` endpoint.

## Frontend development

```bash
cd frontend
npm install
npm run build
```

The build output is placed in `frontend/dist/dt3d-card.js` and can be served as a Home Assistant custom card.

## Backend add-on

The add-on source lives in `addon/` and is built with the Home Assistant add-on system.

- `config.yaml` – metadata for the add-on
- `Dockerfile` – builds the Go server inside a minimal Alpine image

The Go server listens on port `8080` and uses a local SQLite database (`data.db`).
Requests must include the service key configured in the add-on options using
the `X-DT3D-Service-Key` header.

## Repository structure

```
frontend/   - Vite project for the custom card
addon/      - Go backend and Home Assistant add-on files
```

## Home Assistant installation

### Custom card

1. Build the frontend as shown above to produce `frontend/dist/dt3d-card.js`.
2. Copy the file to your Home Assistant configuration directory, e.g.
   `config/www/dt3d-card.js`.
3. In Home Assistant, navigate to **Settings → Dashboards → Resources** and add
   `/local/dt3d-card.js` as a JavaScript resource.
4. Add a manual card in the dashboard using the `custom:dt3d-card` element.

Example card configuration:

```yaml
type: custom:dt3d-card
address: http://<home-assistant-host>
port: 8080
service_key: <same-key-as-the-add-on>
default_space: <space-id>
visualization_only: false
```

Use an `https://` address when the add-on is configured to serve HTTPS.
In edit mode, use the space selector at the top of the card to switch the
space being edited. The adjacent actions create spaces and delete the active
space. Use **Create group** in the sidebar to add an empty group, then organize
objects beneath it in the object tree.
Set `visualization_only: true` to hide editing controls and the object tree
while keeping camera navigation and object interaction available. The
`default_space` is selected in the visual card configuration and is the only
way to choose the displayed space in visualization-only mode.

### Add-on

1. Copy the `addon` directory into your Home Assistant `addons` folder or add
   this repository as a custom add-on repository.
2. Install the add-on from **Settings → Add-ons → Add-on Store**.
3. Set the `service_key` option to a private key and start the add-on.
4. Verify the add-on is running by visiting
   `http://<home-assistant>:8080/api/hello` with the service key header.

```bash
curl -H "X-DT3D-Service-Key: <service_key>" \
  http://<home-assistant>:8080/api/hello
```

#### HTTPS

To serve the backend over HTTPS with your own certificate, place the certificate
and key in Home Assistant's `/ssl` directory and configure the add-on options:

```yaml
ssl_certificate: /ssl/fullchain.pem
ssl_key: /ssl/privkey.pem
use_self_signed_certificate: false
```

The `ssl_certificate` and `ssl_key` options also accept PEM content directly.
Multi-line PEM is supported, as are single-line pasted values with spaces
between the `BEGIN`/`END` markers and the base64 body:

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

If no certificate/key pair is available, set `use_self_signed_certificate: true`.
The backend will generate and reuse a self-signed certificate under `/data`.
Browsers and clients will need to trust or explicitly accept that certificate.

```bash
curl -k -H "X-DT3D-Service-Key: <service_key>" \
  https://<home-assistant>:8080/api/hello
```

### Development deploy script

`addon/deploy.sh` copies the local add-on source to a running Home Assistant
instance over SSH and triggers a rebuild and restart, allowing a fast edit→deploy
cycle.

**Prerequisites**

- The **Terminal & SSH** add-on is installed and running on Home Assistant
  (it exposes SSH on port 22 by default).
- `sshpass` is installed on the machine running the script.

**Usage**

```bash
bash ./addon/deploy.sh <ssh-user> <ssh-password> [ha-host] [ssh-port]

# Example
bash ./addon/deploy.sh root '<ssh-password>' 192.168.1.100 22
```

Optional environment variables:

| Variable   | Default               | Description                           |
|------------|-----------------------|---------------------------------------|
| `HA_HOST`  | `homeassistant.local` | IP or hostname of HA                  |
| `SSH_PORT` | `22`                  | SSH port of the Terminal & SSH add-on |

The script copies `addon/` to `/addons/dt3d`, reloads the Home Assistant add-on
store, then rebuilds and restarts `local_dt3d` if it is installed. If the add-on
is not installed yet, it installs and starts `local_dt3d`.
