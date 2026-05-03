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

### Add-on

1. Copy the `addon` directory into your Home Assistant `addons` folder or add
   this repository as a custom add-on repository.
2. Install and start the add-on from **Settings → Add-ons → Add-on Store**.
3. Verify the add-on is running by visiting
   `http://<home-assistant>:8080/api/hello`.

### Development deploy script

`addon/deploy.sh` copies the local add-on source to a running Home Assistant
instance and triggers a rebuild and restart, allowing a fast edit→deploy cycle.

**Prerequisites**

- The **Terminal & SSH** add-on is installed and running on Home Assistant
  (it exposes SSH on port 22 by default).
- A [long-lived access token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token)
  generated from your HA profile page.

**Usage**

```bash
# Set variables inline or export them beforehand
HA_HOST=192.168.1.100 HA_TOKEN=<your-token> ./addon/deploy.sh

# Or pass them as positional arguments
./addon/deploy.sh 192.168.1.100 <your-token>
```

Optional environment variables:

| Variable   | Default              | Description                          |
|------------|----------------------|--------------------------------------|
| `HA_HOST`  | `homeassistant.local`| IP or hostname of HA                 |
| `HA_TOKEN` | *(required)*         | Long-lived access token              |
| `SSH_USER` | `root`               | SSH username                         |
| `SSH_PORT` | `22`                 | SSH port of the Terminal & SSH add-on|
