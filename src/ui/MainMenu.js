// src/ui/MainMenu.js
import * as THREE from 'three';
import { createPanel } from './Panel.js';

const MODULES = [
  {
    id: 'gearbuild',
    title: 'Gear Setup',
    icon: '🔧',
    lines: ['Assemble your scuba unit', 'step by step'],
    color: 0x0d2233,
  },
  {
    id: 'gear',
    title: 'Gear ID',
    icon: '🎒',
    lines: ['Identify & place your', 'scuba equipment'],
    color: 0x0d2744,
  },
  {
    id: 'signals',
    title: 'Dive Signals',
    icon: '🤿',
    lines: ['Recognize & respond to', 'hand signals'],
    color: 0x0a2233,
  },
  {
    id: 'aircheck',
    title: 'Air Management',
    icon: '🔵',
    lines: ['Read your SPG & make', 'smart decisions'],
    color: 0x0a2222,
  },
];

export class MainMenu {
  constructor(scene, xrControllers, onSelectModule) {
    this.scene          = scene;
    this.xrControllers  = xrControllers;
    this.onSelectModule = onSelectModule;
    this.group   = new THREE.Group();
    this.panels  = [];
    this.visible = true;
    scene.add(this.group);

    this._addLighting();
    this._build();
  }

  _addLighting() {
    const key = new THREE.PointLight(0xfff8f0, 5.0, 10);
    key.position.set(0, 2.5, -0.4);
    this.group.add(key);
    const fill = new THREE.PointLight(0xffffff, 3.5, 10);
    fill.position.set(0, 1.5, 0.8);
    this.group.add(fill);
  }

  _build() {
    // Title — close and centred
    const title = createPanel('🤿  DiveTrainer VR\nChoose a module', {
      position: new THREE.Vector3(0, 2.1, -1.3),
      width: 1.1,
      fontSize: 28,
      color: 0x001133,
      align: 'center',
    });
    this.group.add(title);
    this.panels.push(title);

    // 2x2 grid — tighter spacing
    MODULES.forEach((mod, i) => {
      const col     = (i % 2 === 0) ? -0.48 : 0.48;
      const row     = Math.floor(i / 2);
      const yOffset = 1.68 - row * 0.58;

      const text = `${mod.icon}  ${mod.title}\n${mod.lines.join(' · ')}`;
      const card = createPanel(text, {
        position: new THREE.Vector3(col, yOffset, -1.3),
        width: 0.82,
        fontSize: 21,
        color: mod.color,
        align: 'center',
      });
      card.userData.moduleId      = mod.id;
      card.userData.isModuleButton = true;
      this.group.add(card);
      this.panels.push(card);

      this.xrControllers.register(card, {
        onSelect:     () => this.onSelectModule(mod.id),
        onHoverEnter: () => card.scale.setScalar(1.06),
        onHoverExit:  () => card.scale.setScalar(1.0),
      });
    });

    // Hint — directly below cards
    const hint = createPanel('Point ray at a module · Pull trigger to start', {
      position: new THREE.Vector3(0, 0.82, -1.3),
      width: 1.0,
      fontSize: 18,
      color: 0x001122,
      align: 'center',
    });
    this.group.add(hint);
    this.panels.push(hint);
  }

  show() {
    this.group.visible = true;
    this.visible = true;
    this.panels.forEach(p => {
      if (p.userData.isModuleButton) {
        this.xrControllers.register(p, {
          onSelect:     () => this.onSelectModule(p.userData.moduleId),
          onHoverEnter: () => p.scale.setScalar(1.06),
          onHoverExit:  () => p.scale.setScalar(1.0),
        });
      }
    });
  }

  hide() {
    this.group.visible = false;
    this.visible = false;
    this.panels.forEach(p => {
      if (p.userData.isModuleButton) this.xrControllers.unregister(p);
    });
  }

  update(delta) {
    if (!this.visible) return;
    this.group.position.y = Math.sin(Date.now() * 0.0005) * 0.015;
  }
}
