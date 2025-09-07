import {Mesh, BoxGeometry, PerspectiveCamera, Scene, WebGLRenderer, MeshBasicMaterial} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LitElement, css } from "lit";

export class DT3DCard extends LitElement  {
	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
	}

	static styles = css`
		:host {
			display: block;
			height: 100%;
		}

		dt3d-card {
			height: 100%;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}
		`;

	static properties = {
		hass: { attribute: false },
		_config: { state: true },
	};

	setConfig(config) {
		if (!config) {
			throw new Error("Invalid configuration");
		}

		this.config = {
			port: 8080,
			...config
		};

		console.log('DT3DCard config set:', this.config);
	}
 
	set hass(hass) {
		this.hassInstance = hass;
		
		const entityId = 'light.garage_light_switch_1'
		const state = hass.states[entityId];
		console.log('Entity state:', state);
	}

	connectedCallback() {
		if (this.container) {
			return;
		}

		const port = this.config?.port || 8080;
		const width = 300;
		const height = 200;
		
		this.container = document.createElement('div');
		this.container.style.width = `${width}px`;
		this.container.style.height = `${height}px`;
		this.shadowRoot.appendChild(this.container);

		const scene = new Scene();
		
		this.camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
		this.camera.position.z = 3;

		this.renderer = new WebGLRenderer({ alpha: true });
		this.renderer.setSize(width, height, false);
		this.renderer.setClearColor(0x444444, 1);
		this.container.appendChild(this.renderer.domElement);

		// Add OrbitControls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true; // Enable damping for smoother controls
		this.controls.dampingFactor = 0.05;

		const geometry = new BoxGeometry();
		const material = new MeshBasicMaterial({ color: 0xffff00, wireframe: true });
	

		const cube = new Mesh(geometry, material);
		scene.add(cube);

		const planeGeometry = new BoxGeometry(5, 5, 0.1);
		const planeMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
		const plane = new Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
		plane.position.y = -1; // Position it below the cube
		scene.add(plane);

		const animate = () => {
			requestAnimationFrame(animate);
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;

			// Update controls
			this.controls.update();

			this.renderer.render(scene, this.camera);
		};
		animate();

		const resizeDetector = new ResizeObserver((event) => {
			console.log('Resizing card', event, this);
			const width = 300;
			const height = 300;

			if (this.container) {
				this.container.style.width = `${width}px`;
				this.container.style.height = `${height}px`;
			}

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height, false);
		});
		resizeDetector.observe(this);

		fetch(`http://localhost:${port}/api/hello`)
			.then((r) => r.text())
			.then((text) => {
				const msg = document.createElement('p');
				msg.textContent = text;
				this.container.appendChild(msg);
			})
			.catch(() => {
				const err = document.createElement('p');
				err.textContent = `Failed to reach backend on port ${port}`;
				this.container.appendChild(err);
			});
	}

	getGridOptions() {
		return {
			rows: 3,
			columns: 6,
			min_rows: 3,
			max_rows: 3,
		};
	}

	static getConfigElement() {
		return document.createElement('dt3d-card-editor');
	}

	static getStubConfig() {
		return {
			port: 8080
		};
	}
}
