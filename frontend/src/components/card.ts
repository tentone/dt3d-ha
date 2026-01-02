import { Object3D } from "three";
import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { DT3DSidebar } from "./side-bar/side-bar.js";
import { DT3DTree } from "./object-tree/object-tree.js";
import { Locale } from "../locale/locale.js";
import en from "../locale/en.json";
import { ConnectionStatus } from "./connection-status/connection-status.js";
import { DT3DScene } from "./scene.js";

@customElement("dt3d-card")
export class DT3DCard extends LitElement {
	/**
	 * Home assistant card configuration.
	 */
	private config: any;

	/**
	 * Home assistant instance.
	 */
	public hassInstance: any;

	private container: HTMLElement = null;

	private content: HTMLElement = null;

	/**
	 * Sidebar element for tools and options.
	 */
	public sidebar: DT3DSidebar;

	/**
	 * Tree element for displaying the 3D object hierarchy.
	 */
	public tree: DT3DTree;

	private sceneManager: DT3DScene | null = null;

	static properties = {
		hass: { attribute: false },
		_config: { state: true },
	};
	public locale: Locale;

	set hass(hass: any) {
		if (!this.hassInstance) {
			console.log("DT3D: Entity states", this, DT3DCard.styles, hass.states);
		}

		this.locale = new Locale();
		this.locale.load("en", en);

		this.hassInstance = hass;

		this.sceneManager?.updateEntityObjects(this.hassInstance);
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
			...config,
		};

		console.log("DT3D: Config set:", this.config);
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

		console.log("DT3d: Adding object to scene", object, name);

		this.sceneManager?.addToScene(object, name);
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

		super.connectedCallback();

		const port = this.config?.port || 8080;

		this.style.cssText = `
			overflow: hidden;
			width: 100%;
			height: 100%;
			display: block;
			position: relative;
			border-radius: 10px;
		`;

		this.container = document.createElement("div");
		this.container.style.cssText = `
			width: 100%;
			height: 100%;
			overflow: hidden;
		`;
		this.appendChild(this.container);

		this.content = document.createElement("div");
		this.content.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			height: 100%;
		`;
		this.container.appendChild(this.content);

		this.sidebar = document.createElement("dt3d-sidebar") as DT3DSidebar;
		this.sidebar.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			height: 100%;
		`;
		this.content.appendChild(this.sidebar);

		this.tree = document.createElement("dt3d-tree") as DT3DTree;
		this.tree.style.cssText = `
			position: absolute;
			top: 0;	
			right: 0;
			height: 100%;
		`;
		this.content.appendChild(this.tree);

		const connection = document.createElement("connection-status") as ConnectionStatus;
		connection.port = port;
		this.content.appendChild(connection);

		this.sceneManager = new DT3DScene({
			container: this.container,
			content: this.content,
			tree: this.tree,
			sidebar: this.sidebar,
			getHass: () => this.hassInstance,
		});

		this.sceneManager.initialize();

		this.sidebar.addEventListener("add-object", (e: any) => {
			const type = e.detail.type as string;

			if (type === "upload") {
				this.sceneManager?.selectFile();
			} else if (type === "entity") {
				this.addEntityModal();
			} else {
				this.sceneManager?.addPrimitive(type);
			}
		});

		this.sceneManager.updateEntityObjects(this.hassInstance);
	}

	/**
	 * Method called to add a HA entity to the 3D scene.
	 *
	 * Presents a dialog to select an entity and adds a representation to the scene.
	 *
	 * The entities list is fetched from Home Assistant.
	 */
	public addEntityModal(): void {
		const states = this.hassInstance.states;
		console.log("DT3D: Available entities:", states);

		const dialog = document.createElement("div");
		dialog.style.cssText = `
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: var(--ha-color-neutral-10);
			padding: 20px;
			border-radius: 10px;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
			z-index: 1000;
		`;

		const title = document.createElement("h3");
		title.textContent = "Select an Entity";
		dialog.appendChild(title);

		const searchInput = document.createElement("input");
		searchInput.type = "search";
		searchInput.placeholder = "Search entities...";
		searchInput.style.cssText = `
						width: 100%;
						padding: 6px 8px;
						margin: 8px 0 12px 0;
						border-radius: 6px;
						border: 1px solid var(--ha-color-border);
						background: var(--ha-color-neutral-05);
						color: var(--ha-color-neutral-95);
				`;

		dialog.appendChild(searchInput);

		const list = document.createElement("ul");
		list.style.cssText = `
						list-style: none;
						padding: 0;
						margin: 10px 0;
						max-height: 200px;
						overflow-y: auto;
				`;

		const listItems: HTMLLIElement[] = [];

		Object.keys(states).forEach((entityId) => {
			const listItem = document.createElement("li");
			listItem.style.cssText = `
								padding: 5px;
								cursor: pointer;
								border-bottom: 1px solid #ccc;
						`;

			listItem.textContent = entityId;
			listItem.dataset.entityId = entityId.toLowerCase();
			listItem.addEventListener("click", () => {
				this.addEntityToScene(entityId);
				dialog.remove();
			});

			listItems.push(listItem);
			list.appendChild(listItem);
		});

		// Auxiliar function to filter the list of options.
		const filterList = () => {
			const query = searchInput.value.trim().toLowerCase();
			listItems.forEach((item) => {
				const match = !query || item.dataset.entityId?.includes(query);
				item.style.display = match ? "" : "none";
			});
		};

		searchInput.addEventListener("input", filterList);

		dialog.appendChild(list);

		const cancelButton = document.createElement("button");
		cancelButton.textContent = "Cancel";
		cancelButton.style.cssText = `
			margin-top: 10px;
			padding: 5px 10px;
			background: var(--ha-color-red-40);
			color: white;
			border: none;
			border-radius: 5px;
			cursor: pointer;
		`;

		cancelButton.addEventListener("click", () => {
			dialog.remove();
		});

		dialog.appendChild(cancelButton);
		this.content.appendChild(dialog);
	}

	/**
	 * Adds a Home Assistant entity representation to the 3D scene.
	 *
	 * @param entityId - The ID of the entity to add.
	 */
	private addEntityToScene(entityId: string): void {
		this.sceneManager?.addEntityToScene(entityId, this.hassInstance);
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
		return document.createElement("dt3d-config-editor");
	}

	/**
	 * Get a stub configuration for the card.
	 *
	 * @returns - stub configuration
	 */
	static getStubConfig(): any {
		return {
			port: 8080,
		};
	}
}
