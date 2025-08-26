import {Mesh, MeshNormalMaterial, BoxGeometry, SphereGeometry, PerspectiveCamera, Scene, WebGLRenderer, MeshBasicMaterial} from 'three';
import { LitElement, css} from "lit";


export class DT3DCard extends LitElement  {
	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
	}

	static styles = css`
		:host {
			display: block;
			height: 100%;     /* stretch to grid cell height */
		}

		dt3d-card {
			height: 100%;     /* let the card fill the host */
			display: flex;
			flex-direction: column;
			justify-content: center; /* center vertically */
			align-items: center;     /* center horizontally */
		}
		`;

	static properties = {
		hass: { attribute: false },
		_config: { state: true },
	};

	// The user supplied configuration.
	// 
	// Throw an exception and Home Assistant will render an error card.
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
 
	// Get the hass instance
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
		
		this.camera = new PerspectiveCamera(75, width/height, 0.1, 1000);
		this.camera.position.z = 3;

		this.renderer = new WebGLRenderer({ alpha: true });
		this.renderer.setSize(width, height, false);
		this.container.appendChild(this.renderer.domElement);

		const geometry = new BoxGeometry();
		const material = new MeshBasicMaterial({color: 0x00ff00, wireframe: true});

		const cube = new Mesh(geometry, material);
		scene.add(cube);


		const animate = () => {
			requestAnimationFrame(animate);
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
			this.renderer.render(scene, this.camera);
		};
		animate();

		// Resize detector to make the canvas fill the card
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

		// Attempt to fetch from the backend to demonstrate connectivity
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


	// The rules for sizing your card in the grid in sections view
	getGridOptions() {
		return {
			rows: 3,
			columns: 6,
			min_rows: 3,
			max_rows: 3,
		};
	}

	/**
	 * Get the element to be used in the card configuration editor.
	 */
	static getConfigElement() {
		return document.createElement('dt3d-card-editor');
	}

	/**
	 * Get the stub configuration for the card.
	 */
	static getStubConfig() {
		return {
			port: 8080
		};
	}
}
