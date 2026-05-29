// src/modules/GearBuild.js
import * as THREE from 'three';
import { createPanel } from '../ui/Panel.js';

/**
 * Gear Build Module — v6
 *
 * Fixes:
 *   - BCD: cam band is the z=0 anchor. Backplate goes BEHIND (negative Z),
 *     bladder + front jacket extends FORWARD (positive Z toward player).
 *     After snapping to tank, front of jacket is clearly in front of cylinder.
 *   - Inflator hose: on WEARER'S left = positive X from player's POV.
 *   - Octopus D-ring: on WEARER'S right = negative X from player's POV.
 *   - Safety panels: lowered to table-edge height, tilted upward ~15°.
 */

const STEPS = [
  {
    id: 'bcd_on_tank',
    title: 'Step 1 — BCD onto Tank',
    instruction: 'Grab the BCD and slide the cam band\nover the cylinder. Backplate goes\nagainst the back of the tank.',
    info: 'Backplate sits flush against the tank.\nCam band wraps around the cylinder.\n\nPosition valve at shoulder height\nwhen worn. Tighten cam band until\nthe tank cannot rotate inside.\n\nThe bladder and jacket hang in front\n— you wear it like a vest.',
    safetyNote: '⚠ Grip tank and twist the BCD.\nZero rotation = correctly secured.\nLoose cam band = dropped tanks.',
    grabId: 'bcd', snapId: 'tank_band',
  },
  {
    id: 'first_stage',
    title: 'Step 2 — First Stage onto Valve',
    instruction: 'Grab the first stage and clamp the\nyoke onto the valve port.\nIt sits at valve height, not above.',
    info: 'Yoke slides over the valve port.\nFirst stage body is HORIZONTAL\nat valve height — not above the tank.\n\nLP ports (left from wearer) → regs\nHP port (right from wearer) → SPG\n\nCheck O-ring. Tighten yoke by hand.',
    safetyNote: '⚠ Open valve slowly after attaching.\nHissing = leak. Do not dive.',
    grabId: 'reg1', snapId: 'valve_port',
  },
  {
    id: 'primary_reg',
    title: 'Step 3 — Primary Reg (right shoulder)',
    instruction: 'Grab the black regulator and connect\nto the first stage LP port.\nHose routes over your RIGHT shoulder.',
    info: 'Primary 2nd stage goes in your mouth.\nHose over right shoulder so it hangs\nnaturally at your right side.\n\nTest after opening valve: breathe.\nSmooth flow = working correctly.',
    safetyNote: '⚠ Resistance or free-flow = reg\nneeds servicing before the dive.',
    grabId: 'reg2_prim', snapId: 'right_lp_port',
  },
  {
    id: 'octopus',
    title: 'Step 4 — Octopus (right chest)',
    instruction: 'Grab the yellow octopus, connect\nto the first stage LP port and\nclip to the right chest D-ring.',
    info: 'Octopus hose is longer than primary.\nRight chest D-ring = "triangle of\naccessibility". Yellow = visible.\n\nOne smooth movement to donate:\nunclip → offer mouthpiece first.',
    safetyNote: '⚠ Practise the donation drill until\nit is completely automatic.',
    grabId: 'reg2_octo', snapId: 'right_chest_clip',
  },
  {
    id: 'spg',
    title: 'Step 5 — SPG (lower left)',
    instruction: 'Grab the SPG and connect to the\nfirst stage HP port.\nConsole hangs at lower left hip.',
    info: 'HP hose routes left and downward.\nConsole at lower-left hip — easy\nto read with left hand.\n\nFull = 200–232 bar.\nTurn pressure = 50 bar.\nEmergency reserve = 30 bar.',
    safetyNote: '⚠ Check both gauges before descent.\nAgree on turn pressure. No exceptions.',
    grabId: 'spg', snapId: 'hp_port',
  },
  {
    id: 'lp_hose',
    title: 'Step 6 — LP Hose to BCD',
    instruction: 'Grab the LP hose and connect it from\nthe first stage to the LP port on\nthe LEFT shoulder inflator.',
    info: 'Quick-disconnect LP port is on the\ninflator mechanism — LEFT chest.\n\nPush until you hear a click.\nPull gently to confirm seated.\n\nTest inflate: feel airflow.\nTest dump: air exits freely.',
    safetyNote: '⚠ Sticky dump valve = uncontrolled\nascent risk. Test before every dive.',
    grabId: 'lphose', snapId: 'bcd_inflator',
  },
  {
    id: 'open_valve',
    title: 'Step 7 — Open Valve + BWRAF',
    instruction: 'Point at the T-bar valve handle\nand pull trigger to open it.\nThen run your BWRAF buddy check.',
    info: 'Counter-clockwise fully,\nthen back a half-turn.\n\nBWRAF:\nB — BCD inflate + deflate\nW — Weights present + releasable\nR — Releases: all buckles found\nA — Air: pressure, breathe both regs\nF — Final: mask, fins, computer',
    safetyNote: '⚠ Both divers complete BWRAF on\neach other. Not optional. Ever.',
    grabId: null, snapId: null,
  },
];

const M = (color, metal = 0, rough = 0.65) =>
  new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });

// ── BCD — cam band at z=0, backplate behind, jacket in front ───────────────
function buildBCD() {
  const g = new THREE.Group();

  // Cam band — reference anchor at z=0, wraps around tank cylinder
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.011, 8, 28),
    M(0x333333, 0.4, 0.6)
  );
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.05, 0);
  g.add(band);

  const camBuckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.018, 0.018),
    M(0x666666, 0.6, 0.4)
  );
  camBuckle.position.set(0, -0.035, 0.002);
  g.add(camBuckle);

  // Backplate — BEHIND the cam band (negative Z, against tank back)
  const backplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.42, 0.022),
    M(0x111111, 0, 0.9)
  );
  backplate.position.z = -0.04;
  g.add(backplate);

  // Back bladder — sits against tank back
  const bladderBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.36, 0.04),
    M(0x1a3a5a, 0, 0.65)
  );
  bladderBack.position.z = -0.01;
  g.add(bladderBack);

  // Side wings — deep enough to bridge from tank back to front
  // Tank radius = 0.07, so z > 0.07 local = in front of tank surface
  [-1, 1].forEach(s => {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.28, 0.18),
      M(0x1a3a5a, 0, 0.65)
    );
    wing.position.set(s * 0.155, -0.02, 0.08);
    g.add(wing);
  });

  // Front bladder — IN FRONT of tank (z=0.12 local = world z=-0.56, tank front at -0.61)
  const bladderFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.34, 0.055),
    M(0x1a4a6a, 0, 0.6)
  );
  bladderFront.position.set(0, 0, 0.12);
  g.add(bladderFront);

  // Front chest panels
  [-1, 1].forEach(s => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.26, 0.038),
      M(0x0d0d0d, 0, 0.85)
    );
    panel.position.set(s * 0.075, 0.03, 0.155);
    g.add(panel);
  });

  // Shoulder straps
  [-0.088, 0.088].forEach(x => {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.24, 0.022),
      M(0x222222, 0, 0.9)
    );
    strap.position.set(x, 0.2, 0.14);
    g.add(strap);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.022, 0.1),
      M(0x222222, 0, 0.9)
    );
    top.position.set(x, 0.32, 0.09);
    g.add(top);
  });

  // Chest buckle
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.022, 0.014),
    M(0x999999, 0.6, 0.4)
  );
  buckle.position.set(0, 0.1, 0.168);
  g.add(buckle);

  // Waist strap
  const waist = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.022, 0.018),
    M(0x222222, 0, 0.9)
  );
  waist.position.set(0, -0.21, 0.148);
  g.add(waist);

  // Weight pockets — lower sides, forward
  [-1, 1].forEach(s => {
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.062, 0.13, 0.04),
      M(0x0a0a0a, 0, 0.95)
    );
    pocket.position.set(s * 0.165, -0.11, 0.152);
    g.add(pocket);
  });

  // ── LEFT shoulder corrugated inflator hose (wearer's left = player's right = +X) ──
  const hosePts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    hosePts.push(new THREE.Vector3(
      0.09 + Math.sin(t * Math.PI * 0.55) * 0.03,
      0.1 + t * 0.26,
      0.13 - t * 0.01
    ));
  }
  const corrHose = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts), 14, 0.013, 6, false),
    M(0x111111, 0, 0.85)
  );
  g.add(corrHose);

  // Corrugated ribs
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(0.014, 0.003, 6, 12),
      M(0x222222, 0, 0.8)
    );
    rib.position.set(
      0.09 + Math.sin(t * Math.PI * 0.55) * 0.03,
      0.1 + t * 0.26,
      0.13 - t * 0.01
    );
    rib.rotation.y = -0.3;
    g.add(rib);
  }

  // Inflator mechanism — wearer's left (+X), on front jacket
  const inflBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.065, 0.028),
    M(0x2a2a2a, 0.3, 0.6)
  );
  inflBody.position.set(0.118, 0.09, 0.155);
  g.add(inflBody);

  // Inflate/deflate buttons
  [0.018, -0.018].forEach((y, i) => {
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.022, 0.01),
      M(i === 0 ? 0x3355aa : 0x553333, 0.3, 0.6)
    );
    btn.position.set(0.118, 0.09 + y, 0.17);
    g.add(btn);
  });

  // LP quick-disconnect port — GOLD, wearer's left (+X)
  const lpPort = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.022, 8),
    M(0xaa8833, 0.7, 0.3)
  );
  lpPort.rotation.z = Math.PI / 2;
  lpPort.position.set(0.142, 0.09, 0.155);
  g.add(lpPort);

  // Wearer's RIGHT chest D-ring for octopus — also +X side
  // (wearer's right = player's left = -X... but octopus clips right chest)
  // Wearer's right = -X from player POV
  const dring = new THREE.Mesh(
    new THREE.TorusGeometry(0.013, 0.003, 6, 14),
    M(0x888888, 0.8, 0.3)
  );
  dring.position.set(-0.115, 0.05, 0.16);
  dring.rotation.x = Math.PI / 2;
  g.add(dring);

  return g;
}

// ── Tank with T-bar valve ──────────────────────────────────────────────────
function buildTank() {
  const g = new THREE.Group();

  const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.52, 28), M(0xcccccc, 0.85, 0.18));
  tankBody.castShadow = true;
  g.add(tankBody);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 20, 10, 0, Math.PI*2, 0, Math.PI/2),
    M(0xbbbbbb, 0.85, 0.2)
  );
  dome.position.y = 0.26;
  g.add(dome);

  // Valve body (brass)
  const vb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.065, 16),
    M(0x886633, 0.75, 0.3)
  );
  vb.position.y = 0.32;
  g.add(vb);

  // Valve PORT facing FORWARD
  const vp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.05, 12),
    M(0xaa8833, 0.7, 0.3)
  );
  vp.rotation.x = Math.PI / 2;
  vp.position.set(0, 0.32, 0.04);
  g.add(vp);

  // O-ring
  const or = new THREE.Mesh(
    new THREE.TorusGeometry(0.015, 0.003, 8, 20),
    M(0x111111, 0, 0.9)
  );
  or.position.set(0, 0.32, 0.063);
  or.rotation.y = Math.PI / 2;
  g.add(or);

  // T-bar handle
  const tg = new THREE.Group();
  tg.position.y = 0.358;
  const th = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.09, 8), M(0x222222, 0.8, 0.3));
  th.rotation.z = Math.PI / 2; tg.add(th);
  const tv = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.034, 8), M(0x222222, 0.8, 0.3));
  tv.position.y = 0.017; tg.add(tv);
  g.add(tg);
  g.userData.tbar = tg;

  // Boot
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.05, 20), M(0x111111, 0, 1.0));
  boot.position.y = -0.285;
  g.add(boot);

  return g;
}

// ── First stage — horizontal at valve height ───────────────────────────────
function buildFirstStage() {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.095, 20),
    M(0x0d0d0d, 0.85, 0.25)
  );
  body.rotation.z = Math.PI / 2;
  g.add(body);

  [-0.05, 0.05].forEach(x => {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), M(0x888888, 0.9, 0.2));
    cap.position.set(x, 0, 0);
    cap.rotation.y = x > 0 ? 0 : Math.PI;
    g.add(cap);
  });

  const yoke = new THREE.Mesh(
    new THREE.TorusGeometry(0.024, 0.009, 8, 20, Math.PI),
    M(0x444444, 0.8, 0.25)
  );
  yoke.rotation.y = Math.PI / 2;
  yoke.position.set(0, 0, -0.04);
  g.add(yoke);

  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.038, 8), M(0x555555, 0.7));
  screw.position.set(0, -0.028, -0.04);
  g.add(screw);

  // LP ports left, HP port right
  [-0.02, 0, 0.02].forEach(z => {
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.028, 8), M(0x334466, 0.7, 0.4));
    lp.rotation.z = Math.PI / 2; lp.position.set(-0.062, 0, z); g.add(lp);
    const lpCap = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M(0x334466, 0.6));
    lpCap.position.set(-0.078, 0, z);
    g.add(lpCap);
  });

  const hp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.028, 8), M(0x662222, 0.7, 0.4));
  hp.rotation.z = Math.PI / 2; hp.position.set(0.062, 0, 0); g.add(hp);
  const hpCap = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M(0x662222, 0.6));
  hpCap.position.set(0.078, 0, 0);
  g.add(hpCap);

  return g;
}

function buildSecondStage(color = 0x111111) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.04), M(color, 0, 0.6)));
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.044, 8), M(0x333333));
  mouth.position.set(0, -0.034, 0.012); mouth.rotation.x = 0.35; g.add(mouth);
  const purge = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), M(color === 0xddaa00 ? 0xccaa00 : 0x777777, 0.4));
  purge.position.set(0, 0, 0.021); g.add(purge);
  return g;
}

function buildSPG() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 20), M(0x1a1a1a, 0.85, 0.25));
  body.rotation.x = Math.PI / 2; g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), M(0xf5f5f5, 0, 0.95));
  face.position.z = 0.011; g.add(face);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.022, 0.001), M(0xff2200));
  needle.position.set(0.008, 0.008, 0.013); needle.rotation.z = -0.5; g.add(needle);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 6, 20), M(0x333333, 0.8, 0.3));
  bezel.rotation.x = Math.PI / 2; g.add(bezel);
  return g;
}

function buildLPHose() {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push(new THREE.Vector3(Math.sin(t * Math.PI) * 0.035, -t * 0.12, 0));
  }
  return new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.005, 8, false),
    M(0x111111, 0, 0.8)
  );
}

function makeSnapZone(radius = 0.09) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.15, depthWrite: false })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.35, wireframe: true })));
  return g;
}

// ── Module ─────────────────────────────────────────────────────────────────

export class GearBuildModule {
  constructor(scene, xrControllers, onComplete) {
    this.scene         = scene;
    this.xrControllers = xrControllers;
    this.onComplete    = onComplete;
    this.group         = new THREE.Group();
    this.panels        = [];
    this.snapZones     = {};
    this.components    = {};
    this.stepIndex     = 0;

    scene.add(this.group);
    this._addLighting();
    this._buildStage();
    this._buildComponents();
    this._buildNavigation();
    this._showStep(0);
  }

  _addLighting() {
    const key = new THREE.PointLight(0xfff8f0, 6.0, 10);
    key.position.set(0, 2.5, 0.4);
    this.group.add(key);
    const fill = new THREE.PointLight(0xffffff, 4.0, 10);
    fill.position.set(0, 1.6, 1.2);
    this.group.add(fill);
    const rimL = new THREE.PointLight(0xaaccff, 2.5, 8);
    rimL.position.set(-1.2, 1.8, -0.3); this.group.add(rimL);
    const rimR = new THREE.PointLight(0xaaccff, 2.5, 8);
    rimR.position.set( 1.2, 1.8, -0.3); this.group.add(rimR);
  }

  _buildStage() {
    const tMat = new THREE.MeshStandardMaterial({ color: 0x1a2a33, roughness: 0.8 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.5), tMat);
    table.position.set(0, 0.9, -0.65);
    table.receiveShadow = true;
    this.group.add(table);
    [[-0.6,-0.45],[0.6,-0.45],[-0.6,-0.88],[0.6,-0.88]].forEach(([x,z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.9, 0.045), tMat);
      leg.position.set(x, 0.45, z);
      this.group.add(leg);
    });
  }

  _buildComponents() {
    const add = (id, mesh, pos) => {
      mesh.position.set(...pos);
      mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      this.group.add(mesh);
      this.components[id] = { mesh, attached: false, basePos: new THREE.Vector3(...pos) };
    };

    add('tank',      buildTank(),                   [ 0.0,  1.21, -0.68]);
    add('bcd',       buildBCD(),                    [-0.42, 1.14, -0.64]);
    add('reg1',      buildFirstStage(),              [ 0.36, 1.12, -0.66]);
    add('reg2_prim', buildSecondStage(0x111111),     [ 0.56, 1.12, -0.58]);
    add('reg2_octo', buildSecondStage(0xddaa00),     [ 0.56, 1.12, -0.78]);
    add('spg',       buildSPG(),                    [-0.34, 1.12, -0.58]);
    add('lphose',    buildLPHose(),                 [-0.34, 1.12, -0.78]);
  }

  _snapPositions() {
    // Tank at [0, 1.21, -0.68], radius 0.07
    // Tank back surface: z = -0.75  |  Tank front surface: z = -0.61
    // Valve centre y = 1.21 + 0.32 = 1.53
    // Valve port face: z = -0.68 + 0.063 = -0.617

    return {
      // BCD: cam band at z=0 wraps tank. Front jacket now at z=+0.12 local = world z=-0.56
      tank_band:       [ 0.0,  1.21, -0.68],

      // First stage: horizontal at valve height, yoke faces tank
      valve_port:      [ 0.0,  1.53, -0.59],

      // Primary reg + octopus: wearer's RIGHT = player's LEFT = -X
      right_lp_port:   [-0.16, 1.53, -0.62],
      right_chest_clip:[-0.14, 1.31, -0.56],

      // SPG: bottom LEFT as player sees it = -X, lower Y
      hp_port:         [-0.16, 1.1,  -0.62],

      // LP hose: BCD inflator on wearer's LEFT = player's RIGHT = +X
      bcd_inflator:    [ 0.14, 1.28, -0.56],
    };
  }

  _buildSnapZone(id, pos) {
    const zone = makeSnapZone();
    zone.position.set(...pos);
    zone.visible = false;
    this.group.add(zone);
    this.snapZones[id] = zone;
    return zone;
  }

  _showSnapZone(id)   { if (this.snapZones[id]) this.snapZones[id].visible = true; }
  _hideAllSnapZones() { Object.values(this.snapZones).forEach(z => z.visible = false); }

  _buildNavigation() {
    const back = createPanel('← Menu', {
      position: new THREE.Vector3(-0.82, 2.05, -0.5),
      width: 0.3, fontSize: 17, color: 0x1a1a2e, align: 'center',
    });
    this.group.add(back);
    this.xrControllers.register(back, {
      onSelect: () => this.onComplete(),
      onHoverEnter: () => back.scale.setScalar(1.06),
      onHoverExit:  () => back.scale.setScalar(1.0),
    });
    this._stepCounter = createPanel('Step 1 / 7', {
      position: new THREE.Vector3(0.82, 2.05, -0.5),
      width: 0.3, fontSize: 17, color: 0x002233, align: 'center',
    });
    this.group.add(this._stepCounter);
  }

  _showStep(index) {
    this._clearPanels();
    this._hideAllSnapZones();

    const step    = STEPS[index];
    const snapPos = this._snapPositions();

    this.group.remove(this._stepCounter);
    this._stepCounter = createPanel(`Step ${index + 1} / ${STEPS.length}`, {
      position: new THREE.Vector3(0.82, 2.05, -0.5),
      width: 0.3, fontSize: 17, color: 0x002233, align: 'center',
    });
    this.group.add(this._stepCounter);

    // Title — above gear, front
    const title = createPanel(step.title, {
      position: new THREE.Vector3(0, 2.0, -0.48),
      width: 0.78, fontSize: 21, color: 0x001133, align: 'center',
    });
    this._add(title);

    // Instruction — left panel
    const instr = createPanel(step.instruction, {
      position: new THREE.Vector3(-0.58, 1.68, -0.48),
      width: 0.65, fontSize: 17, color: 0x002244, align: 'left',
    });
    this._add(instr);

    // Info — right panel
    const info = createPanel(step.info, {
      position: new THREE.Vector3(0.58, 1.66, -0.48),
      width: 0.68, fontSize: 15, color: 0x001122, align: 'left',
    });
    this._add(info);

    // Safety note — at TABLE EDGE, tilted upward toward player
    const safety = createPanel(step.safetyNote, {
      position: new THREE.Vector3(0, 0.98, -0.38),
      width: 0.82, fontSize: 15, color: 0x2a1000, align: 'left',
    });
    safety.rotation.x = -0.28; // tilt face upward ~16° toward standing player
    this._add(safety);

    if (step.grabId && step.snapId) {
      this._activateGrab(step, index, snapPos[step.snapId]);
    } else {
      this._addValveButton(index);
    }
  }

  _activateGrab(step, stepIndex, snapPosArr) {
    const comp = this.components[step.grabId];
    if (!comp || comp.attached) return;

    if (!this.snapZones[step.snapId]) {
      this._buildSnapZone(step.snapId, snapPosArr);
    }
    this._showSnapZone(step.snapId);
    const zoneMesh = this.snapZones[step.snapId];

    const hint = createPanel('Squeeze grip to grab', {
      position: comp.basePos.clone().add(new THREE.Vector3(0, 0.14, 0.1)),
      width: 0.26, fontSize: 13, color: 0x004400, align: 'center',
    });
    this._add(hint);

    this.xrControllers.registerGrabbable(comp.mesh, {
      snapZones: [{ mesh: zoneMesh, id: step.snapId, radius: 0.14 }],
      onGrab: () => {
        zoneMesh.children.forEach(c => {
          if (c.material) c.material.opacity = Math.min(c.material.opacity * 2.5, 0.75);
        });
      },
      onSnap: () => {
        comp.attached = true;
        this.xrControllers.unregister(comp.mesh);
        comp.mesh.scale.setScalar(1.0);
        this._hideAllSnapZones();

        // LP hose: replace placeholder with a proper curved connector tube
        if (step.id === 'lp_hose') {
          this.group.remove(comp.mesh);
          // First stage LP port world position (first stage snapped to valve_port)
          const fsPos  = new THREE.Vector3(-0.062, 1.53, -0.59); // LP port on first stage
          const bcdPos = new THREE.Vector3( 0.14,  1.28, -0.56); // BCD inflator port
          const hoseMesh = this._buildConnectingHose(fsPos, bcdPos);
          this.group.add(hoseMesh);
        } else {
          comp.mesh.traverse(c => {
            if (c.isMesh && c.material?.color) {
              const orig = c.material.color.getHex();
              c.material.color.setHex(0x44ff88);
              setTimeout(() => c.material.color.setHex(orig), 600);
            }
          });
        }
        this._showStepDone(stepIndex);
      },
      onRelease: () => {
        zoneMesh.children.forEach(c => {
          if (c.material) c.material.opacity = c.material.wireframe ? 0.35 : 0.15;
        });
      },
    });
  }

  _showStepDone(stepIndex) {
    const done = createPanel('✓ Connected!', {
      position: new THREE.Vector3(0, 1.44, -0.48),
      width: 0.52, fontSize: 18, color: 0x002211, align: 'center',
    });
    this._add(done);
    this._addNextButton(stepIndex);
  }

  _buildConnectingHose(startWorld, endWorld) {
    // Curved LP hose tube between first stage port and BCD inflator
    const mid = new THREE.Vector3(
      (startWorld.x + endWorld.x) / 2,
      (startWorld.y + endWorld.y) / 2 + 0.06,
      (startWorld.z + endWorld.z) / 2 - 0.04
    );
    const curve = new THREE.CatmullRomCurve3([startWorld, mid, endWorld]);
    const geo   = new THREE.TubeGeometry(curve, 20, 0.007, 8, false);
    const mat   = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const hose  = new THREE.Mesh(geo, mat);
    hose.castShadow = true;
    return hose;
  }

  _addNextButton(currentIndex) {
    const isLast = currentIndex >= STEPS.length - 1;
    const btn = createPanel(isLast ? 'Finish →' : 'Next Step →', {
      position: new THREE.Vector3(0.38, 1.1, -0.48),
      width: 0.4, fontSize: 17, color: 0x002244, align: 'center',
    });
    this._add(btn);
    this.xrControllers.register(btn, {
      onSelect: () => {
        if (isLast) this._showCompletion();
        else { this.stepIndex = currentIndex + 1; this._showStep(this.stepIndex); }
      },
      onHoverEnter: () => btn.scale.setScalar(1.06),
      onHoverExit:  () => btn.scale.setScalar(1.0),
    });
  }

  _addValveButton(index) {
    const tankComp = this.components['tank'];
    const hint = createPanel('Point at T-bar + trigger to open', {
      position: new THREE.Vector3(0, 1.65, -0.48),
      width: 0.55, fontSize: 15, color: 0x004400, align: 'center',
    });
    this._add(hint);
    if (tankComp) {
      this.xrControllers.register(tankComp.mesh, {
        onSelect: () => {
          this.xrControllers.unregister(tankComp.mesh);
          const tbar = tankComp.mesh.userData.tbar;
          if (tbar) {
            let t = 0;
            const spin = () => { t += 0.1; tbar.rotation.y = t; if (t < Math.PI * 2) requestAnimationFrame(spin); };
            spin();
          }
          this._showStepDone(index);
        },
        onHoverEnter: () => tankComp.mesh.scale.setScalar(1.04),
        onHoverExit:  () => tankComp.mesh.scale.setScalar(1.0),
      });
    }
  }

  _showCompletion() {
    this._clearPanels();
    this._hideAllSnapZones();
    this._add(createPanel(
      '🎉 Assembly Complete!\n\nBCD → First Stage → Primary Reg\n→ Octopus → SPG → LP Hose → BWRAF\n\nHave a divemaster verify your\nsetup for your first real dives.',
      { position: new THREE.Vector3(0, 1.72, -0.5), width: 0.92, fontSize: 19, color: 0x001133, align: 'center' }
    ));
    const back = createPanel('← Back to Menu', {
      position: new THREE.Vector3(0, 1.14, -0.5),
      width: 0.44, fontSize: 17, color: 0x001122, align: 'center',
    });
    this._add(back);
    this.xrControllers.register(back, {
      onSelect: () => this.onComplete(),
      onHoverEnter: () => back.scale.setScalar(1.06),
      onHoverExit:  () => back.scale.setScalar(1.0),
    });
  }

  _add(p) { this.group.add(p); this.panels.push(p); }

  _clearPanels() {
    this.panels.forEach(p => { this.xrControllers.unregister(p); this.group.remove(p); });
    this.panels = [];
  }

  update(delta) {
    const t = Date.now() * 0.001;
    Object.values(this.snapZones).forEach(z => { if (z.visible) z.rotation.y += delta * 0.7; });
    const grabbed = new Set();
    this.xrControllers.grabbed.forEach(g => { if (g) grabbed.add(g.entry.object); });
    Object.values(this.components).forEach(({ mesh, attached, basePos }) => {
      if (!attached && !grabbed.has(mesh)) {
        mesh.position.y = basePos.y + Math.sin(t * 0.9 + basePos.x) * 0.01;
      }
    });
  }

  dispose() {
    this.xrControllers.clearAll();
    this.scene.remove(this.group);
  }
}
