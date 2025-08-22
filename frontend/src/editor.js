class DT3DCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = { entities: [], ...(config || {}) };
    this.render();
  }

  render() {
    this.innerHTML = '';
    const container = document.createElement('div');
    const list = document.createElement('div');
    this.config.entities.forEach((item, index) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '4px';
      row.style.marginBottom = '4px';

      const entityInput = document.createElement('input');
      entityInput.type = 'text';
      entityInput.placeholder = 'entity';
      entityInput.value = item.entity || '';
      entityInput.addEventListener('change', (e) => {
        this.config.entities[index].entity = e.target.value;
        this._configChanged();
      });
      row.appendChild(entityInput);

      ['x', 'y', 'z'].forEach((coord) => {
        const coordInput = document.createElement('input');
        coordInput.type = 'number';
        coordInput.style.width = '60px';
        coordInput.placeholder = coord;
        coordInput.value = this.config.entities[index][coord] ?? 0;
        coordInput.addEventListener('change', (e) => {
          this.config.entities[index][coord] = parseFloat(e.target.value);
          this._configChanged();
        });
        row.appendChild(coordInput);
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        this.config.entities.splice(index, 1);
        this._configChanged();
        this.render();
      });
      row.appendChild(removeBtn);

      list.appendChild(row);
    });
    container.appendChild(list);

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add entity';
    addBtn.addEventListener('click', () => {
      this.config.entities.push({ entity: '', x: 0, y: 0, z: 0 });
      this._configChanged();
      this.render();
    });
    container.appendChild(addBtn);

    this.appendChild(container);
  }

  _configChanged() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
  }
}

customElements.define('dt3d-card-editor', DT3DCardEditor);
