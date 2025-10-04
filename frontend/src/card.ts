import {Mesh, BoxGeometry, PerspectiveCamera, Scene, WebGLRenderer, MeshBasicMaterial, Raycaster, Vector2} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {TransformControls }from 'three/examples/jsm/controls/TransformControls';
import { LitElement, css } from "lit";
import { customElement } from 'lit/decorators.js';

@customElement('dt3d-card')
export class DT3DCard extends LitElement  {
	private config: any;

	public hassInstance: any;
	
	private container: HTMLElement = null;

	private content: HTMLElement = null;

	private canvas: HTMLCanvasElement = null;

	private camera: PerspectiveCamera = null;

	private renderer: WebGLRenderer = null;

	private controls: OrbitControls;

	private transform: TransformControls = null;

	static properties = {
		hass: { attribute: false },
		_config: { state: true },
	};
 
	set hass(hass: any) {
		if (!this.hassInstance) {
			console.log('Entity states', this, DT3DCard.styles, hass.states);
		}

		this.hassInstance = hass;
	
	}

	/**
	 * Set the configuration for the card.
	 * 
	 * @param config - configuration object
	 * @throws Error if the configuration is invalid.
	 */
	public setConfig(config: any) {
		if (!config) {
			throw new Error("Invalid configuration");
		}

		this.config = {
			port: 8080,
			...config
		};

		console.log('DT3DCard config set:', this.config);
	}

	/**
	 * Method called when the element is added to the DOM.
	 * 
	 * Initializes the 3D scene and starts the rendering loop.
	 */
	public connectedCallback() {
		if (this.container) {
			return;
		}

		const port = this.config?.port || 8080;
		const width = 300;
		const height = 300;
		
		this.style.cssText = `
			overflow: hidden;
			width: 100%;
			height: 100%;
			display: block;
			position: relative;
			border-radius: 10px;
		`;

		this.container = document.createElement('div');
		this.container.style.cssText = `
			width: 100%;
			height: 100%;
			background-color: #222;
			overflow: hidden;
		`;
		this.appendChild(this.container);

		this.content = document.createElement('div');
		this.content.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
		`;
		this.container.appendChild(this.content);

		this.canvas = document.createElement('canvas');
		this.canvas.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			width: ${width}px;
			height: ${height}px;
			border-radius: 10px;
		`;
		this.content.appendChild(this.canvas);

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
		scene.add( this.transform.getHelper() );

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

		// Raycaster for object picking
		const raycaster = new Raycaster();
		const pointer = new Vector2();
		const objects: Mesh[] = [cube, plane];

		this.canvas.addEventListener('dblclick', (event: MouseEvent) => {
			const rect = this.canvas.getBoundingClientRect();
			pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(pointer, this.camera);

			const intersects = raycaster.intersectObjects(objects, false);
			if (intersects.length > 0) {
				const picked = intersects[0].object as Mesh;
				this.transform.attach(picked);
			}
		});

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
			const height = event[0].contentRect.height - 100;


			this.content.style.width = `${width}px`;
			this.content.style.height = `${height}px`;
			
			this.canvas.style.width = `${width}px`;
			this.canvas.style.height = `${height}px`;

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height, false);
		});
		resizeDetector.observe(this.container, { box: 'border-box' });

		fetch(`http://localhost:${port}/api/hello`)
			.then((r) => r.text())
			.then((text) => {
				const msg = document.createElement('p');
				msg.style.cssText = `
					color: white;
					z-index: 10;
					position: absolute;
					top: 10px;
					left: 10px;
					background: rgba(0,0,0,0.5);
					padding: 5px;
					border-radius: 5px;
				`;

				msg.textContent = text;
				this.content.appendChild(msg);
			})
			.catch(() => {
				const err = document.createElement('p');
				err.style.cssText = `
					color: red;
					z-index: 10;
					position: absolute;
					top: 10px;
					left: 10px;
					background: rgba(0,0,0,0.5);
					padding: 5px;
					border-radius: 5px;
				`;

				err.textContent = `Failed to reach backend on port ${port}`;
				this.content.appendChild(err);
			});
	}

	/**
	 * Grid settings for the card
	 * 
	 * @returns grid options
	 */
	public getGridOptions(): any {
		return {
			rows: 3,
			columns: 6,
			min_rows: 3,
			max_rows: 3,
		};
	}

	/**
	 * Get the configuration element for the card.
	 * 
	 * @returns - configuration element
	 */
	static getConfigElement(): HTMLElement {
		return document.createElement('dt3d-card-editor');
	}

	/**
	 * Get a stub configuration for the card.
	 * 
	 * @returns - stub configuration
	 */
	static getStubConfig(): any {
		return {
			port: 8080
		};
	}
}
