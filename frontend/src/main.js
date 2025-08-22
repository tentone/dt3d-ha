import * as THREE from 'three';

class DT3DCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    this.hassInstance = hass;
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

  static getConfigElement() {
    return document.createElement('dt3d-card-editor');
  }

  static getStubConfig() {
    return { port: 8080, width: 200, height: 200 };
  }
}

class DT3DCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.render();
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    const port = this.config?.port || 8080;
    this.shadowRoot.innerHTML = `
      <label>Port: <input type="number" value="${port}" /></label>
    `;
    this.shadowRoot
      .querySelector('input')
      .addEventListener('change', (e) => {
        this.config.port = parseInt(e.target.value, 10);
        this.dispatchEvent(
          new CustomEvent('config-changed', {
            detail: { config: this.config },
          })
        );
      });
  }
}

customElements.define('dt3d-card-editor', DT3DCardEditor);
customElements.define('dt3d-card', DT3DCard);
