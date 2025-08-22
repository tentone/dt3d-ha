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
  }
}

customElements.define('dt3d-card', DT3DCard);
