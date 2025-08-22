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
