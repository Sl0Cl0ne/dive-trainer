// src/modules/GearAssembly.js
import * as THREE from 'three';
import { createPanel } from '../ui/Panel.js';

/**
 * Gear Recognition Module — v2
 *
 * High-fidelity scuba gear models (same quality as the Build section) laid
 * out on a compact table. The player grabs each item and drops it onto the
 * matching name-plate to identify it. Correct match surfaces educational info.
 *
 * New models added: dive mask (frame + lens + silicone skirt + strap),
 * open-heel fins (foot pocket + blade + heel strap).
 *
 * Mannequin sits to the RIGHT of the table at a 45° angle so it no longer
 * blocks the gear.
 *
 * Uses the grab + snap-zone mechanic from XRController.registerGrabbable.
 */

const M = (color, metal = 0, rough = 0.65) =>
  new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });

// ── Gear model builders (shared style with GearBuild) ───────────────────────

function buildTank() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.52, 28), M(0xcccccc, 0.85, 0.18));
  g.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 10, 0, Math.PI*2, 0, Math.PI/2), M(0xbbbbbb, 0.85, 0.2));
  dome.position.y = 0.26; g.add(dome);
  const vb = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.065, 16), M(0x886633, 0.75, 0.3));
  vb.position.y = 0.32; g.add(vb);
  const vp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 12), M(0xaa8833, 0.7, 0.3));
  vp.rotation.x = Math.PI / 2; vp.position.set(0, 0.32, 0.04); g.add(vp);
  const tg = new THREE.Group(); tg.position.y = 0.358;
  const th = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.09, 8), M(0x222222, 0.8, 0.3));
  th.rotation.z = Math.PI / 2; tg.add(th);
  const tv = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.034, 8), M(0x222222, 0.8, 0.3));
  tv.position.y = 0.017; tg.add(tv); g.add(tg);
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.05, 20), M(0x111111, 0, 1.0));
  boot.position.y = -0.285; g.add(boot);
  return g;
}

function buildFirstStage() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.095, 20), M(0x0d0d0d, 0.85, 0.25));
  body.rotation.z = Math.PI / 2; g.add(body);
  [-0.05, 0.05].forEach(x => {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), M(0x888888, 0.9, 0.2));
    cap.position.set(x, 0, 0); cap.rotation.y = x > 0 ? 0 : Math.PI; g.add(cap);
  });
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.009, 8, 20, Math.PI), M(0x444444, 0.8, 0.25));
  yoke.rotation.y = Math.PI / 2; yoke.position.set(0, 0, -0.04); g.add(yoke);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.038, 8), M(0x555555, 0.7));
  screw.position.set(0, -0.028, -0.04); g.add(screw);
  // primary 2nd stage on a short hose
  const hosePts = [];
  for (let i = 0; i <= 10; i++) { const t = i/10; hosePts.push(new THREE.Vector3(0.05 + t*0.04, -t*0.12, 0.02 + Math.sin(t*Math.PI)*0.03)); }
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts), 12, 0.006, 8, false), M(0x111111, 0, 0.8));
  g.add(hose);
  const reg2 = new THREE.Group(); reg2.position.set(0.095, -0.13, 0.05);
  reg2.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.035), M(0x111111, 0, 0.6)));
  const purge = new THREE.Mesh(new THREE.CircleGeometry(0.013, 16), M(0x777777, 0.4));
  purge.position.z = 0.019; reg2.add(purge);
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.04, 8), M(0x333333));
  mouth.position.set(0, -0.03, 0.01); mouth.rotation.x = 0.35; reg2.add(mouth);
  g.add(reg2);
  return g;
}

function buildSPG() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 24), M(0x1a1a1a, 0.85, 0.25));
  body.rotation.x = Math.PI / 2; g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.042, 24), M(0xf5f5f5, 0, 0.95));
  face.position.z = 0.012; g.add(face);
  // tick marks
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.008, 0.001), M(0x222222));
    tick.position.set(Math.cos(a) * 0.033, Math.sin(a) * 0.033, 0.014); tick.rotation.z = a; g.add(tick);
  }
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.03, 0.001), M(0xff2200));
  needle.position.set(0.01, 0.01, 0.015); needle.rotation.z = -0.6; g.add(needle);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 8, 24), M(0x333333, 0.8, 0.3));
  bezel.rotation.x = Math.PI / 2; g.add(bezel);
  // HP hose stub
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.07, 8), M(0x111111, 0, 0.8));
  hose.position.set(0, -0.07, 0); g.add(hose);
  return g;
}

// Dive mask — frame + twin lens + silicone skirt + strap (Cressi frameless style)
function buildMask() {
  const g = new THREE.Group();

  // Soft silicone skirt (the body that seals to the face)
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.1, 0.07),
    M(0x1a1a1a, 0, 0.85)
  );
  g.add(skirt);

  // Front frame face (slightly angled, where lenses sit)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.185, 0.092, 0.018),
    M(0x222222, 0.3, 0.5)
  );
  frame.position.z = 0.04; g.add(frame);

  // Twin tempered-glass lenses
  [-0.045, 0.045].forEach(x => {
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.006, 24),
      new THREE.MeshStandardMaterial({ color: 0x88ccdd, metalness: 0.1, roughness: 0.1,
        transparent: true, opacity: 0.55 })
    );
    lens.rotation.x = Math.PI / 2; lens.position.set(x, 0.005, 0.05); g.add(lens);
    // lens rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.005, 8, 24), M(0x111111, 0.4, 0.4));
    rim.position.set(x, 0.005, 0.052); g.add(rim);
  });

  // Nose pocket (bump under the lenses)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.04), M(0x1a1a1a, 0, 0.85));
  nose.position.set(0, -0.052, 0.035); g.add(nose);

  // Strap — split silicone strap looping back
  const strapPts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const ang = t * Math.PI;
    strapPts.push(new THREE.Vector3(
      Math.cos(ang) * 0.105,
      0.015,
      -0.04 - Math.sin(ang) * 0.11
    ));
  }
  const strap = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts), 16, 0.008, 6, false),
    M(0x111111, 0, 0.8)
  );
  g.add(strap);

  // Buckles at strap attachment points
  [-0.088, 0.088].forEach(x => {
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.012), M(0x333333, 0.5, 0.4));
    buckle.position.set(x, 0.012, 0.005); g.add(buckle);
  });

  return g;
}

// Open-heel fin — foot pocket + blade + adjustable heel strap (Sherwood/ScubaPro style)
function buildFins() {
  const g = new THREE.Group();

  // Blade — long tapered paddle, angled slightly down
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.07, 0);
  bladeShape.lineTo(0.07, 0);
  bladeShape.lineTo(0.085, -0.34);
  bladeShape.lineTo(-0.085, -0.34);
  bladeShape.closePath();
  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bladeShape, { depth: 0.012, bevelEnabled: false }),
    M(0x111111, 0.1, 0.6)
  );
  blade.position.set(0, 0, 0); g.add(blade);

  // Power rails along blade edges (colored accent)
  [-0.078, 0.078].forEach(x => {
    const railShape = new THREE.Shape();
    railShape.moveTo(0, 0); railShape.lineTo(0.012, 0);
    railShape.lineTo(0.016, -0.34); railShape.lineTo(0, -0.34);
    railShape.closePath();
    const rail = new THREE.Mesh(
      new THREE.ExtrudeGeometry(railShape, { depth: 0.016, bevelEnabled: false }),
      M(0x2266aa, 0.3, 0.5)
    );
    rail.position.set(x - (x > 0 ? 0 : 0.012), 0, -0.002); g.add(rail);
  });

  // Foot pocket — angled box where the foot goes
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.13), M(0x1a1a1a, 0, 0.8));
  pocket.position.set(0, 0.05, 0.02); g.add(pocket);
  // open toe
  const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.1, 16, 1, true), M(0x1a1a1a, 0, 0.8));
  toe.rotation.z = Math.PI / 2; toe.position.set(0, 0.05, 0.075); g.add(toe);

  // Heel strap — open-heel adjustable strap behind the pocket
  const strapPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12; const ang = t * Math.PI;
    strapPts.push(new THREE.Vector3(Math.cos(ang) * 0.055, 0.05 + Math.sin(ang) * 0.05, 0.085));
  }
  const strap = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts), 12, 0.007, 6, false),
    M(0x222222, 0, 0.8)
  );
  g.add(strap);

  return g;
}

function makeSnapZone(radius = 0.13) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.12, depthWrite: false })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.3, wireframe: true })));
  return g;
}

// ── Gear catalogue ──────────────────────────────────────────────────────────

const GEAR = [
  {
    id: 'tank', name: 'Cylinder', full: 'Scuba Tank (Cylinder)',
    build: buildTank, scale: 0.85,
    desc: 'Holds compressed air (~200 bar full).\nCheck the valve, O-ring and pressure\nbefore every dive. Turn at 50 bar.',
  },
  {
    id: 'bcd', name: 'BCD', full: 'Buoyancy Control Device',
    build: () => buildSimpleBCD(), scale: 0.8,
    desc: 'Inflatable jacket controlling buoyancy.\nInflate to ascend or float; deflate to sink.\nPre-check inflator and dump valves.',
  },
  {
    id: 'regulator', name: 'Regulator', full: 'Regulator (1st + 2nd Stage)',
    build: buildFirstStage, scale: 1.0,
    desc: 'Reduces tank pressure to breathable air.\n2nd stage goes in your mouth; the octopus\nis the backup. Test it breathes smoothly.',
  },
  {
    id: 'mask', name: 'Mask', full: 'Dive Mask',
    build: buildMask, scale: 1.0,
    desc: 'Creates an air space so eyes can focus.\nEqualize by exhaling gently through the nose.\nDefog the inside before each dive.',
  },
  {
    id: 'fins', name: 'Fins', full: 'Open-Heel Fins',
    build: buildFins, scale: 0.9,
    desc: 'Propel you with leg kicks. Open-heel fins\nwear over boots with an adjustable strap.\nNever walk forward in fins — shuffle back.',
  },
  {
    id: 'spg', name: 'SPG', full: 'Submersible Pressure Gauge',
    build: buildSPG, scale: 1.0,
    desc: 'Shows remaining air pressure. Check it\nevery few minutes. Surface at your turn\npressure (typically 50 bar).',
  },
];

// Compact BCD for the recognition table (lighter than full build BCD)
function buildSimpleBCD() {
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.4, 0.03), M(0x111111, 0, 0.9));
  back.position.z = -0.03; g.add(back);
  const bladder = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.07), M(0x1a4a6a, 0, 0.6));
  g.add(bladder);
  [-1, 1].forEach(s => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.1), M(0x1a3a5a, 0, 0.65));
    wing.position.set(s * 0.15, -0.02, 0.01); g.add(wing);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.02), M(0x222222, 0, 0.9));
    strap.position.set(s * 0.085, 0.2, 0.05); g.add(strap);
  });
  // corrugated inflator hose
  const hosePts = [];
  for (let i = 0; i <= 12; i++) { const t = i/12; hosePts.push(new THREE.Vector3(0.09 + Math.sin(t*Math.PI*0.5)*0.03, 0.1 + t*0.22, 0.04)); }
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts), 12, 0.012, 6, false), M(0x111111, 0, 0.85));
  g.add(hose);
  const lpPort = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.02, 8), M(0xaa8833, 0.7, 0.3));
  lpPort.rotation.z = Math.PI/2; lpPort.position.set(0.115, 0.09, 0.05); g.add(lpPort);
  return g;
}

// ── Module ────────────────────────────────────────────────────────────────

export class GearAssemblyModule {
  constructor(scene, xrControllers, onComplete) {
    this.scene         = scene;
    this.xrControllers = xrControllers;
    this.onComplete    = onComplete;
    this.group         = new THREE.Group();
    this.panels        = [];
    this.items         = {};   // id -> { mesh, basePos, identified }
    this.nameZones     = {};   // id -> { zone, mesh, labelPanel }
    this.identified    = 0;
    this._activeId     = null; // currently grabbed/being-identified item

    scene.add(this.group);
    this._addLighting();
    this._buildStage();
    this._buildMannequin();
    this._buildItems();
    this._buildNameZones();
    this._buildChrome();
    this._showIntro();
  }

  _addLighting() {
    const key = new THREE.PointLight(0xfff8f0, 6.0, 10);
    key.position.set(0, 2.5, 0.4); this.group.add(key);
    const fill = new THREE.PointLight(0xffffff, 4.0, 10);
    fill.position.set(0, 1.6, 1.2); this.group.add(fill);
    const rimL = new THREE.PointLight(0xaaccff, 2.5, 8);
    rimL.position.set(-1.2, 1.8, -0.3); this.group.add(rimL);
    const rimR = new THREE.PointLight(0xaaccff, 2.5, 8);
    rimR.position.set( 1.2, 1.8, -0.3); this.group.add(rimR);
  }

  _buildStage() {
    // Compact table — was oversized; now matches GearBuild proportions
    const tMat = new THREE.MeshStandardMaterial({ color: 0x1a2a33, roughness: 0.8 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.45), tMat);
    table.position.set(0, 0.9, -0.7);
    table.receiveShadow = true;
    this.group.add(table);
    [[-0.56,-0.52],[0.56,-0.52],[-0.56,-0.88],[0.56,-0.88]].forEach(([x,z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.9, 0.045), tMat);
      leg.position.set(x, 0.45, z);
      this.group.add(leg);
    });
  }

  _buildMannequin() {
    // Positioned to the RIGHT of the table, rotated 45° to face the gear
    const m = new THREE.Group();
    m.position.set(1.05, 0, -0.7);
    m.rotation.y = -Math.PI / 4; // 45° angle toward the table
    const skin = M(0x33414d, 0, 0.9);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.55, 16), skin);
    torso.position.y = 1.3; m.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin);
    head.position.y = 1.68; m.add(head);
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 16), skin);
    hips.position.y = 0.98; m.add(hips);
    [-1, 1].forEach(s => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.5, 12), skin);
      arm.position.set(s * 0.19, 1.32, 0); arm.rotation.z = s * 0.18; m.add(arm);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.6, 12), skin);
      leg.position.set(s * 0.07, 0.6, 0); m.add(leg);
    });
    this.group.add(m);
    this._mannequin = m;
  }

  _buildItems() {
    // Lay items across the compact table top (table at y=0.9, top ~0.92)
    const layout = [
      ['tank',      -0.5,  1.18, -0.7 ],
      ['bcd',       -0.28, 1.12, -0.72],
      ['regulator', -0.06, 1.0,  -0.7 ],
      ['mask',       0.16, 0.98, -0.68],
      ['fins',       0.36, 0.97, -0.7 ],
      ['spg',        0.52, 0.99, -0.68],
    ];
    layout.forEach(([id, x, y, z]) => {
      const def = GEAR.find(g => g.id === id);
      const mesh = def.build();
      mesh.scale.setScalar(def.scale);
      mesh.position.set(x, y, z);
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      this.group.add(mesh);
      this.items[id] = { mesh, basePos: new THREE.Vector3(x, y, z), identified: false, def };
    });
  }

  _buildNameZones() {
    // A row of name plates above the table; player drops item onto matching name
    const names = GEAR.map(g => g.id);
    const startX = -0.55, gapX = 0.22;
    names.forEach((id, i) => {
      const def = GEAR.find(g => g.id === id);
      const x = startX + i * gapX;
      const y = 1.62, z = -0.72;

      const zone = makeSnapZone(0.12);
      zone.position.set(x, y, z);
      zone.visible = false;
      this.group.add(zone);

      const label = createPanel(def.name, {
        position: new THREE.Vector3(x, y - 0.16, z),
        width: 0.2, fontSize: 15, color: 0x001833, align: 'center',
      });
      this.group.add(label);
      this.panels.push(label);

      this.nameZones[id] = { zone, mesh: zone, labelPanel: label };
    });
  }

  _buildChrome() {
    const back = createPanel('← Menu', {
      position: new THREE.Vector3(-0.78, 2.0, -0.6),
      width: 0.3, fontSize: 16, color: 0x1a1a2e, align: 'center',
    });
    this.group.add(back);
    this.xrControllers.register(back, {
      onSelect: () => this.onComplete(),
      onHoverEnter: () => back.scale.setScalar(1.06),
      onHoverExit:  () => back.scale.setScalar(1.0),
    });

    this._progress = this._makeProgressPanel();
    this.group.add(this._progress);
  }

  _makeProgressPanel() {
    return createPanel(`Identified: ${this.identified} / ${GEAR.length}`, {
      position: new THREE.Vector3(0.78, 2.0, -0.6),
      width: 0.4, fontSize: 16, color: 0x002233, align: 'center',
    });
  }

  _showIntro() {
    this._addPanel(createPanel('Gear Recognition', {
      position: new THREE.Vector3(0, 2.0, -0.62),
      width: 0.55, fontSize: 22, color: 0x001133, align: 'center',
    }));
    this._addPanel(createPanel(
      'Grab each item and drop it on the\nmatching name plate to identify it.',
      { position: new THREE.Vector3(0, 1.85, -0.62), width: 0.7, fontSize: 15, color: 0x002244, align: 'center' }
    ));
    this._activateGrabbables();
  }

  _activateGrabbables() {
    Object.entries(this.items).forEach(([id, item]) => {
      if (item.identified) return;

      // Each item snaps only to its own matching name zone
      const zone = this.nameZones[id].zone;

      this.xrControllers.registerGrabbable(item.mesh, {
        snapZones: [{ mesh: zone, id, radius: 0.16 }],
        onGrab: () => {
          // Reveal all name zones while holding an item
          Object.values(this.nameZones).forEach(nz => { nz.zone.visible = true; });
        },
        onSnap: (zoneId) => {
          if (zoneId === id) this._onCorrect(id);
        },
        onRelease: () => {
          Object.values(this.nameZones).forEach(nz => { nz.zone.visible = false; });
        },
      });
    });
  }

  _onCorrect(id) {
    const item = this.items[id];
    if (!item || item.identified) return;
    item.identified = true;
    this.identified++;
    this.xrControllers.unregister(item.mesh);
    Object.values(this.nameZones).forEach(nz => { nz.zone.visible = false; });

    // Flash green
    item.mesh.traverse(c => {
      if (c.isMesh && c.material?.color) {
        const orig = c.material.color.getHex();
        c.material.color.setHex(0x44ff88);
        setTimeout(() => c.material.color.setHex(orig), 600);
      }
    });

    // Show the info card for this item
    this._showItemInfo(item.def);

    // Update progress
    this.group.remove(this._progress);
    this._progress = this._makeProgressPanel();
    this.group.add(this._progress);

    if (this.identified >= GEAR.length) {
      setTimeout(() => this._showCompletion(), 900);
    }
  }

  _showItemInfo(def) {
    if (this._infoPanel) { this.group.remove(this._infoPanel); }
    this._infoPanel = createPanel(`${def.full}\n\n${def.desc}`, {
      position: new THREE.Vector3(0, 1.3, -0.55),
      width: 0.8, fontSize: 15, color: 0x001a33, align: 'left',
    });
    this._infoPanel.rotation.x = -0.15;
    this.group.add(this._infoPanel);
    this.panels.push(this._infoPanel);
  }

  _showCompletion() {
    this._clearPanels();
    Object.values(this.nameZones).forEach(nz => { nz.zone.visible = false; this.group.remove(nz.zone); });
    this._addPanel(createPanel(
      '🎉 All Gear Identified!\n\nYou can now recognise every core\npiece of scuba kit. Next: learn how\nthey assemble together in Gear Setup.',
      { position: new THREE.Vector3(0, 1.6, -0.62), width: 0.85, fontSize: 18, color: 0x001133, align: 'center' }
    ));
    const back = createPanel('← Back to Menu', {
      position: new THREE.Vector3(0, 1.15, -0.6),
      width: 0.44, fontSize: 17, color: 0x001122, align: 'center',
    });
    this._addPanel(back);
    this.xrControllers.register(back, {
      onSelect: () => this.onComplete(),
      onHoverEnter: () => back.scale.setScalar(1.06),
      onHoverExit:  () => back.scale.setScalar(1.0),
    });
  }

  _addPanel(p) { this.group.add(p); this.panels.push(p); }

  _clearPanels() {
    this.panels.forEach(p => { this.xrControllers.unregister(p); this.group.remove(p); });
    this.panels = [];
  }

  update(delta) {
    const t = Date.now() * 0.001;
    // Reveal-zone rotation
    Object.values(this.nameZones).forEach(nz => { if (nz.zone.visible) nz.zone.rotation.y += delta * 0.7; });
    // Gentle bob for un-grabbed, un-identified items
    const grabbed = new Set();
    this.xrControllers.grabbed.forEach(g => { if (g) grabbed.add(g.entry.object); });
    Object.values(this.items).forEach(({ mesh, basePos, identified }) => {
      if (!identified && !grabbed.has(mesh)) {
        mesh.position.y = basePos.y + Math.sin(t * 0.9 + basePos.x) * 0.008;
        mesh.rotation.y += delta * 0.2;
      }
    });
  }

  dispose() {
    this.xrControllers.clearAll();
    this.scene.remove(this.group);
  }
}
