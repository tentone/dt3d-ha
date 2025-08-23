import * as THREE from 'three';
import './editor.js';

class DT3DCard extends HTMLElement {
	constructor() {
		super();
		
		this.attachShadow({ mode: 'open' });
	}

	// The user supplied configuration.
	// 
	// Throw an exception and Home Assistant will render an error card.
	setConfig(config) {
		this.config = config;

		console.log('DT3DCard config set:', this.config);
	}
 
	// Get the hass instance
	set hass(hass) {
		this.hassInstance = hass;

		// const entityId = 'derp.entity'
    // const state = hass.states[entityId];
    // const stateStr = state ? state.state : "unavailable";
	}


	connectedCallback() {
		const width = this.config?.width || 200;
		const height = this.config?.height || 200;
		const port = this.config?.port || 8080;

		const container = document.createElement('div');
		container.style.width = `${width}px`;
		container.style.height = `${height}px`;
		this.shadowRoot.appendChild(container);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

		const renderer = new THREE.WebGLRenderer({ alpha: true });
		renderer.setSize(width, height);
		container.appendChild(renderer.domElement);

		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshNormalMaterial();
		const cube = new THREE.Mesh(geometry, material);
		scene.add(cube);

		if (Array.isArray(this.config?.entities)) {
			this.config.entities.forEach((item) => {
				const sphereGeom = new THREE.SphereGeometry(0.1, 16, 16);
				const sphereMat = new THREE.MeshNormalMaterial();
				const sphere = new THREE.Mesh(sphereGeom, sphereMat);
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

		fetch(`http://localhost:${port}/api/hello`)
			.then((r) => r.text())
			.then((text) => {
				const msg = document.createElement('p');
				msg.textContent = text;
				container.appendChild(msg);
			})
			.catch(() => {
				const err = document.createElement('p');
				err.textContent = `Failed to reach backend on port ${port}`;
				container.appendChild(err);
			});
	}

	// The height of your card. Home Assistant uses this to automatically
	// distribute all cards over the available columns in masonry view
	// getCardSize() {
	//   return 3;
	// }

	// The rules for sizing your card in the grid in sections view
	// getGridOptions() {
	//   return {
	//     rows: 3,
	//     columns: 6,
	//     min_rows: 3,
	//     max_rows: 3,
	//   };
	// }

	static getConfigElement() {
		return document.createElement('dt3d-card-editor');
	}

	static getStubConfig() {
		return { port: 8080, width: 200, height: 200 };
	}

	static getConfigElement() {
		return document.createElement('dt3d-card-editor');
	}
}

customElements.define('dt3d-card', DT3DCard);
