import {Mesh, MeshNormalMaterial, BoxGeometry, SphereGeometry, PerspectiveCamera, Scene, WebGLRenderer} from 'three';
import { LitElement, html, css } from "lit";

class DT3DCard extends LitElement  {
	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
	}

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

		// const entityId = 'derp.entity'
		// const state = hass.states[entityId];
		// const stateStr = state ? state.state : "unavailable";
	}

	createContainer() {

	}

	connectedCallback() {
		if (this.container) {
			return;
		}

		const port = this.config?.port || 8080;
		const width = 400;
		const height = 300;

		this.container = document.createElement('div');
		this.container.style.width = `${width}px`;
		this.container.style.height = `${height}px`;
		this.shadowRoot.appendChild(this.container);

		const scene = new Scene();
		const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);

		const renderer = new WebGLRenderer({ alpha: true });
		renderer.setSize(width, height);
		this.container.appendChild(renderer.domElement);

		const geometry = new BoxGeometry();
		const material = new MeshNormalMaterial();
		const cube = new Mesh(geometry, material);
		scene.add(cube);

		if (Array.isArray(this.config?.entities)) {
			this.config.entities.forEach((item) => {
				const sphereGeom = new SphereGeometry(0.1, 16, 16);
				const sphereMat = new MeshNormalMaterial();
				const sphere = new Mesh(sphereGeom, sphereMat);
				sphere.position.set(item.x || 0, item.y || 0, item.z || 0);
				scene.add(sphere);
			});
		}

		camera.position.z = 3;

		const animate = () => {
			requestAnimationFrame(animate);
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
			renderer.render(scene, camera);
		};
		animate();

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

customElements.define('dt3d-card', DT3DCard);

class DT3DCardEditor extends LitElement {

  static properties = {
    _config: { state: true },
  };


}
customElements.define("dt3d-card-editor", DT3DCardEditor);