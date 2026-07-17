# Digital Twin 3D for Home Assistant (DT3D)

DT3D is a Home Assistant custom dashboard card for building and viewing a
persistent 3D representation of a home. The project is split into a browser
frontend and a Home Assistant app/add-on that stores 3D scene data.

For installation and end-user instructions, see the
[setup and usage manual](MANUAL.md).

## System architecture

DT3D deliberately keeps 3D scene storage separate from Home Assistant entity
data:

```text
┌──────────────────────────────── Home Assistant browser tab ────────────────────────────────┐
│                                                                                             │
│  Home Assistant frontend                                                                   │
│    │                                                                                        │
│    │ hass.states, entity metadata, camera images, callService()                            │
│    ▼                                                                                        │
│  custom:dt3d-card ────────────────────────────────┐                                        │
│    │                                              │                                        │
└────│──────────────────────────────────────────────│────────────────────────────────────────┘
     │ Home Assistant's normal frontend card API   │ HTTPS + X-DT3D-Service-Key
     │                                              ▼
     │                                  DT3D Home Assistant app/add-on
     │                                    │
     │                                    ├── Space and object REST API
     │                                    ├── Imported geometry storage
     │                                    └── SQLite scene database
     │
     └── Home Assistant remains the source of entity states and services
```

The responsibilities are:

- **DT3D frontend card:** renders the scene, provides the editor, consumes Home
  Assistant entity states, opens entity dialogs, and calls Home Assistant
  services in the same way as any other custom frontend card.
- **DT3D backend app/add-on:** provides the 3D space API and persists spaces,
  object hierarchies, transforms, materials, viewports, space configuration,
  and uploaded geometry. It does not replace or proxy Home Assistant's entity
  APIs.
- **Home Assistant:** remains the source of truth for entities, their current
  state and attributes, camera image URLs, and service calls such as
  `light.toggle` and `switch.toggle`.

The card therefore has two connections. Home Assistant supplies its normal
frontend `hass` object, while the card connects directly to the DT3D backend's
HTTP(S) API using the configured address, port, and service key.

## Technology stack

### Frontend

- TypeScript
- [Lit](https://lit.dev/) custom elements
- [three.js](https://threejs.org/) for WebGL rendering, controls, model loaders,
  CSS 3D overlays, and post-processing
- Vite library-mode build producing one ES module
- Material Design Icons via `@mdi/js`
- Troika text rendering
- ESLint, TypeScript, and Prettier for development checks

The built custom element is registered as `dt3d-card` and is used in Home
Assistant as `custom:dt3d-card`.

### Backend

- Go
- Gin HTTP router
- GORM
- SQLite through the pure-Go `glebarez/sqlite` driver
- Home Assistant base container on Alpine Linux
- Header-based API authentication with `X-DT3D-Service-Key`
- Optional TLS using a configured certificate/key pair or a generated
  self-signed certificate

## Repository structure

```text
.
├── addon/
│   ├── backend/
│   │   ├── handlers/       HTTP authentication and space/object routes
│   │   ├── models/         GORM database models
│   │   ├── repository/     SQLite persistence
│   │   └── service/        Space and object business logic
│   ├── config.yaml         Home Assistant app/add-on metadata and options
│   ├── Dockerfile          Home Assistant app/add-on image
│   └── deploy.sh           SSH-based local deployment helper
├── frontend/
│   ├── src/
│   │   ├── components/     Card, editor UI, menus, tree, and inspectors
│   │   ├── editor/         Scene, renderer, walls, materials, and measurements
│   │   ├── objects/        Persistable 3D and Home Assistant entity objects
│   │   ├── service/        DT3D API client and scene synchronization
│   │   └── locale/         UI strings
│   └── vite.config.js      Single-module production build
├── sample/                 Sample 3D assets
├── MANUAL.md               Installation and user documentation
└── README.md               Architecture and development documentation
```

## Build and test locally

### Frontend

Requirements: a current Node.js installation and npm.

```bash
cd frontend
npm install
npm run lint
npm run build
```

The production bundle is written to:

```text
frontend/dist/dt3d-card.js
```

Other available commands:

```bash
npm run dev       # start the Vite development server
npm run format    # format the frontend source with Prettier
npm run lint-fix  # apply safe ESLint fixes
```

### Backend

Requirements: Go with the version supported by `addon/backend/go.mod`.

```bash
cd addon/backend
go mod download
go test ./...
go build -o dt3d-backend .
```

The Home Assistant container build performs the Go build automatically. To
verify the same container definition locally, build from the `addon` directory:

```bash
docker build -t dt3d-addon-local ./addon
```

## Test in your own Home Assistant deployment

The fastest development loop is to deploy the backend as a local app/add-on and
serve the frontend bundle from Home Assistant's `/config/www` directory.

### 1. Deploy the backend as a local app/add-on

This requires Home Assistant OS or Home Assistant Supervised.

1. Copy the complete repository `addon/` directory to
   `/addons/dt3d` on the Home Assistant host.
2. Open **Settings → Apps** (or **Settings → Add-ons** on older versions), open
   the store, and reload it from the three-dot menu.
3. Open the local **DT3D** entry and select **Install** or **Rebuild**.
4. Configure at least a non-empty `service_key`, then start the app/add-on.

Example development configuration:

```yaml
port: 8080
service_key: replace-with-a-development-secret
ssl_certificate: ""
ssl_key: ""
use_self_signed_certificate: false
```

For HTTPS and certificates, follow the
[network and TLS section of the manual](MANUAL.md#network-and-tls-setup).

The deployment helper copies the backend over SSH, reloads the store, and then
installs, rebuilds, or restarts the local app/add-on:

```bash
bash ./addon/deploy.sh <ssh-user> '<ssh-password>' [ha-host] [ssh-port]

# Example
bash ./addon/deploy.sh root '<ssh-password>' homeassistant.local 22
```

It requires the Home Assistant **Terminal & SSH** app/add-on and `sshpass` on
the development computer.

Verify the backend before loading the frontend:

```bash
curl -H "X-DT3D-Service-Key: replace-with-a-development-secret" \
  http://homeassistant.local:8080/api/hello
```

### 2. Deploy the frontend bundle

After `npm run build`, copy:

```text
frontend/dist/dt3d-card.js
```

to:

```text
/config/www/dt3d-card.js
```

In Home Assistant, open **Settings → Dashboards → three-dot menu → Resources**
and register the following as a JavaScript module:

```text
/local/dt3d-card.js
```

Hard-refresh the browser after replacing the bundle. If the previous JavaScript
is still cached during rapid development, temporarily add or change a query
string in the resource URL, for example `/local/dt3d-card.js?v=2`.

### 3. Create a development card

Add a manual dashboard card:

```yaml
type: custom:dt3d-card
address: http://homeassistant.local
port: 8080
service_key: replace-with-a-development-secret
navigation_controls: orbit
visualization_only: false
general:
  developmentMode:
    enabled: true
```

Use HTTPS for the backend when the Home Assistant page uses HTTPS; browsers
block calls from a secure page to an insecure backend.

### 4. Development verification checklist

- The backend log reports that it is listening on the configured port.
- `/api/hello` responds when the service-key header is present.
- The browser loads `dt3d-card.js` without a 404 or JavaScript module error.
- Development mode displays a successful backend connection.
- A new space can be created and still exists after refreshing the page.
- Adding or moving an object updates the backend without authorization or CORS
  errors in the browser network panel.
- Home Assistant entities update in the scene and light/switch actions call the
  corresponding Home Assistant services.

## Data and runtime paths

Inside the Home Assistant app/add-on:

- SQLite uses `data.db` in the backend process's working directory. In the
  current container image that directory is `/app`.
- Generated or normalized TLS files live under `/data`.
- Imported binary geometry lives under `/data/dt3d-geometries`.
- Certificates mounted from Home Assistant are available under `/ssl`.
- The backend listens on `0.0.0.0` using the configured port, which defaults to
  `8080`.

The frontend stores only local editor preferences, such as grid and collapsed
panel state, in browser storage. Persistent spaces and objects are synchronized
to the backend. Home Assistant entity state is consumed live and is not copied
into the DT3D database as an alternative entity registry.

## Documentation

- [Setup and usage manual](MANUAL.md)
- [Home Assistant custom app repositories](https://developers.home-assistant.io/docs/apps/repository/)
- [Home Assistant dashboard views](https://www.home-assistant.io/dashboards/views/)
