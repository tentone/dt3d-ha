# dt3d-ha

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

## Testing

### Frontend

The project does not currently include unit tests, but you can verify the
frontend builds successfully:

```bash
cd frontend
npm install
npm run build
```

### Backend

Run the Go tests to ensure the backend compiles and its tests (if any) pass:

```bash
cd addon/backend
go test ./...
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
