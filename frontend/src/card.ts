import {Mesh, BoxGeometry, PerspectiveCamera, Scene, WebGLRenderer, MeshBasicMaterial, Raycaster, Vector2, PlaneGeometry, SphereGeometry, Group, MathUtils, Vector3, Object3D} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {TransformControls }from 'three/examples/jsm/controls/TransformControls';
import { Sky } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { LitElement, css } from "lit";
import { customElement } from 'lit/decorators.js';
import { DT3DSidebar } from "./side-bar.js";
import { DT3DTree } from "./object-tree.js";

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

	/**
	 * The scene where all 3D objects are placed.
	 */
	private scene: Scene;

	/**
	 * The home group that contains all main objects in the scene.
	 *
	 * This allows for easy manipulation of the entire scene (e.g., moving, scaling, rotating the whole scene).
	 */
	private home: Group;

	/**
	 * Sidebar element for tools and options.
	 */
	public sidebar: DT3DSidebar;

	/**
	 * Tree element for displaying the 3D object hierarchy.
	 */
	public tree: DT3DTree;

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
	 * Select a 3D model file to upload.
	 * 
	 * Presents a file picker dialog to the user and loads the selected model into the scene.
	 */
	private selectFile() {
		if (!this.home) {
			return;
		}

		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.gltf,.glb,.obj,.fbx';
		input.style.display = 'none';

		input.addEventListener('change', () => {
			const file = input.files?.[0];
			if (file) {
				this.loadModelFromFile(file);
			}
			input.remove();
		});

		const host = this.content ?? this;
		host.appendChild(input);
		input.click();
	}

	/**
	 * Loads a 3D model from a file.
	 * 
	 * @param file - The model file to load. 
	 */
	private loadModelFromFile(file: File) {
		if (!this.home) {
			return;
		}

		const extension = file.name.split('.').pop()?.toLowerCase();

		if (!extension) {
			console.warn('Unable to detect model file extension:', file.name);
			return;
		}

		const url = URL.createObjectURL(file);

		const cleanup = () => {
			URL.revokeObjectURL(url);
		};

		const onError = (error: any) => {
			console.error(`Failed to load ${extension} model`, error);
			cleanup();
		};

		if (extension === 'gltf' || extension === 'glb') {
			const loader = new GLTFLoader();
			loader.load(url, (gltf: any) => {
				cleanup();
				this.addToScene(gltf.scene ?? gltf.scenes?.[0], file.name);
			}, undefined, onError);
			return;
		}
		else if (extension === 'obj') {
			const loader = new OBJLoader();
			loader.load(url, (obj: any) => {
				cleanup();
				this.addToScene(obj, file.name);
			}, undefined, onError);
			return;
		}
		else if (extension === 'fbx') {
			const loader = new FBXLoader();
			loader.load(url, (fbx: any) => {
				cleanup();
				this.addToScene(fbx, file.name);
			}, undefined, onError);
			return;
		}

		console.warn('Unsupported model format:', extension);
		cleanup();
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
	 * Adds a 3D object to the scene.
	 * 
	 * @param object - The 3D object to add to the scene.
	 */
	public addToScene(object: Object3D | null | undefined, name?: string): void {
		if (!object) {
			return;
		}

		if (name) {
			object.name = name;
		}

		this.home.add(object);
		this.transform?.attach(object);
	};


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

		this.scene = new Scene();

		this.home = new Group();
		this.scene.add(this.home);

		this.sidebar = document.createElement('dt3d-sidebar') as DT3DSidebar;
		this.sidebar.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			height: 100%;
		`;
		this.content.appendChild(this.sidebar);
		
		this.tree = document.createElement('dt3d-tree') as DT3DTree;
		this.tree.style.cssText = `
			position: absolute;
			top: 0;	
			right: 0;
			height: 100%;
		`;
		this.content.appendChild(this.tree);

		this.sidebar.addEventListener('transform-tool-selected', (e: any) => {
			const tool = e.detail.tool;
			this.transform.setMode(tool);
		});

		this.sidebar.addEventListener('add-object', (e: any) => {
			const type = e.detail.type;

			let object: Mesh;
			const material = new MeshBasicMaterial({ color: 0x00ffff, wireframe: true });

			if (type === 'cube') {
				const geometry = new BoxGeometry();
				object = new Mesh(geometry, material);
				this.transform.attach(object);
			}
			else if (type === 'plane') {
				const geometry = new PlaneGeometry(1,1,1);
				object = new Mesh(geometry, material);
				object.rotation.x = -Math.PI / 2;
				object.position.y = -1;
			} else if (type === 'sphere') {
				const geometry = new SphereGeometry();
				object = new Mesh(geometry, material);
			}

			if (object) {
				this.transform.attach(object);
				this.home.add(object);
			}
		});

		this.sidebar.addEventListener('upload-model', () => {
			this.selectFile();
		});

		this.camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
		this.camera.position.z = 3;

		this.renderer = new WebGLRenderer({ alpha: true, canvas: this.canvas });
		this.renderer.setSize(width, height, false);
		this.renderer.setClearColor(0x446644, 1);
		this.container.appendChild(this.renderer.domElement);

		// Sky
		const sky = new Sky();
		sky.scale.setScalar(1e4);

		const phi = MathUtils.degToRad( 90 );
		const theta = MathUtils.degToRad( 180 );
		const sunPosition = new Vector3().setFromSphericalCoords( 1, phi, theta );

		sky.material.uniforms.sunPosition.value = sunPosition;
		this.scene.add(sky);

		// Add OrbitControls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true; // Enable damping for smoother controls
		this.controls.dampingFactor = 0.05;

		this.transform = new TransformControls( this.camera, this.renderer.domElement );
		this.transform.addEventListener( 'dragging-changed', ( event: any) => {
			this.controls.enabled = ! event.value;
		} );
		this.scene.add( this.transform.getHelper() );

		// Add a cube
		const geometry = new BoxGeometry();
		const material = new MeshBasicMaterial({ color: 0xffff00, wireframe: true });
		const cube = new Mesh(geometry, material);
		this.transform.attach(cube);
		this.home.add(cube);

		const planeGeometry = new BoxGeometry(5, 5, 0.1);
		const planeMaterial = new MeshBasicMaterial({ color: 0x00ff00 });

		const plane = new Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
		plane.position.y = -1; // Position it below the cube
		this.home.add(plane);

		// Raycaster for object picking
		const raycaster = new Raycaster();
		const pointer = new Vector2();

		this.canvas.addEventListener('dblclick', (event: MouseEvent) => {
			const rect = this.canvas.getBoundingClientRect();
			pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(pointer, this.camera);

			const intersects = raycaster.intersectObjects(this.home.children, false);
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

			this.renderer.render(this.scene, this.camera);
		};
		animate();

		const resizeDetector = new ResizeObserver((event) => {
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
					right: 10px;
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
					right: 10px;
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
