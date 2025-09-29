import {Mesh, BoxGeometry, PerspectiveCamera, Scene, WebGLRenderer, MeshBasicMaterial} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {TransformControls }from 'three/examples/jsm/controls/TransformControls';
import { LitElement, css } from "lit";
import { customElement } from 'lit/decorators.js';

@customElement('dt3d-card')
export class DT3DCard extends LitElement  {
	private config: any;

	public hassInstance: any;
	
	private container: HTMLElement | null = null;

	private canvas: HTMLCanvasElement | null = null;

	private camera: PerspectiveCamera | null = null;

	private renderer: WebGLRenderer | null = null;

	private controls: OrbitControls;

	private transform: TransformControls | null = null;

	static styles = css`
		:host {
			background-color: green;
		}
	`;


	constructor() {
		super();
	}

	static properties = {
		hass: { attribute: false },
		_config: { state: true },
	};

	setConfig(config: any) {
		if (!config) {
			throw new Error("Invalid configuration");
		}

		this.config = {
			port: 8080,
			...config
		};

		console.log('DT3DCard config set:', this.config);
	}
 
	set hass(hass: any) {
		if (!this.hassInstance) {
			console.log('Entity states', this, DT3DCard.styles, hass.states);
		}

		this.hassInstance = hass;
	
	}

	connectedCallback() {
		if (this.container) {
			return;
		}

		const port = this.config?.port || 8080;
		const width = 300;
		const height = 300;
		
		this.container = document.createElement('div');
		this.container.style.cssText = `
			width: 100%;
			height: 100%;
			background-color: #222;
			border-radius: 10px;
		`;
		this.appendChild(this.container);

		this.canvas = document.createElement('canvas');
		this.canvas.style.cssText = `
			width: ${width}px;
			height: ${height}px;
			border-radius: 10px;
		`;
		this.container.appendChild(this.canvas);


		const scene = new Scene();
		
		this.camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
		this.camera.position.z = 3;

		this.renderer = new WebGLRenderer({ alpha: true, canvas: this.canvas });
		this.renderer.setSize(width, height, false);
		this.renderer.setClearColor(0x446644, 1);
		this.container.appendChild(this.renderer.domElement);

		// Add OrbitControls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true; // Enable damping for smoother controls
		this.controls.dampingFactor = 0.05;

		this.transform = new TransformControls( this.camera, this.renderer.domElement );
		this.transform.addEventListener( 'dragging-changed', ( event: any) => {
			this.controls.enabled = ! event.value;
		} );
		scene.add( this.transform );

		// Add a cube
		const geometry = new BoxGeometry();
		const material = new MeshBasicMaterial({ color: 0xffff00, wireframe: true });
		const cube = new Mesh(geometry, material);
		this.transform.attach(cube);
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
			const width = event[0].contentRect.width;
			const height = 300;

			if (this.canvas) {
				this.canvas.style.width = `${width}px`;
			}

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height, false);
		});
		resizeDetector.observe(this.container, { box: 'border-box' });

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
