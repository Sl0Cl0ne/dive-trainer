// src/UnderwaterScene.js
import * as THREE from 'three';

/**
 * Builds the persistent underwater environment:
 * - Atmospheric fog and ambient lighting
 * - Sandy ocean floor with organic undulation
 * - Coral formations and rocks
 * - Animated seaweed
 * - Bubble particle system
 * - Caustic animated point lights
 * - Translucent water surface (viewed from below)
 * - God-ray light shafts
 */
export class UnderwaterScene {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.seaweed = [];
    this.causticLights = [];
    this.bubbleData = [];
    this.bubbleParticles = null;
    this.waterSurface = null;

    this._build();
  }

  _build() {
    this._setupAtmosphere();
    this._buildOceanFloor();
    this._buildSeabedDetails();
    this._buildLightShafts();
    this._buildBubbleSystem();
    this._buildWaterSurface();
  }

  // ── Atmosphere ─────────────────────────────────────────────────────────────

  _setupAtmosphere() {
    this.scene.background = new THREE.Color(0x001827);
    this.scene.fog = new THREE.FogExp2(0x001f3a, 0.07);

    // Deep ambient
    const ambient = new THREE.AmbientLight(0x003355, 0.6);
    this.scene.add(ambient);

    // Sun shaft from above — strong directional
    const sun = new THREE.DirectionalLight(0x3399cc, 1.8);
    sun.position.set(3, 20, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    const sc = sun.shadow.camera;
    sc.near = 0.5; sc.far = 40;
    sc.left = -15; sc.right = 15;
    sc.top  =  15; sc.bottom = -15;
    this.scene.add(sun);
    this.sun = sun;

    // Caustic shimmer lights — 3 animated point lights
    const causticPositions = [
      { x:  3, z: -2 },
      { x: -2, z:  1 },
      { x:  0, z:  3 },
    ];
    causticPositions.forEach((p, i) => {
      const light = new THREE.PointLight(0x0088bb, 2.5, 10);
      light.position.set(p.x, 6, p.z);
      this.scene.add(light);
      this.causticLights.push({
        light,
        baseX: p.x,
        baseZ: p.z,
        phase: (i / 3) * Math.PI * 2,
      });
    });
  }

  // ── Ocean Floor ────────────────────────────────────────────────────────────

  _buildOceanFloor() {
    const geo = new THREE.PlaneGeometry(50, 50, 48, 48);

    // Slightly undulate vertices for organic sand look
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // pre-rotation, y = world Z
      pos.setZ(i,
        Math.sin(x * 0.4) * 0.08 +
        Math.cos(y * 0.6) * 0.06 +
        (Math.random() - 0.5) * 0.04
      );
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x9a8a60,
      roughness: 1.0,
      metalness: 0.0,
    });

    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  // ── Seabed Details ─────────────────────────────────────────────────────────

  _buildSeabedDetails() {
    this._buildCoral();
    this._buildRocks();
    this._buildSeaweed();
  }

  _buildCoral() {
    const colors = [0xff5533, 0xff3366, 0xffaa22, 0x22ffaa, 0xff8833, 0xdd44ff];
    const count = 35;

    for (let i = 0; i < count; i++) {
      const h = 0.25 + Math.random() * 0.9;
      const topR = 0.01 + Math.random() * 0.04;
      const botR = 0.04 + Math.random() * 0.09;
      const col = colors[Math.floor(Math.random() * colors.length)];

      const geo = Math.random() > 0.5
        ? new THREE.CylinderGeometry(topR, botR, h, 6 + Math.floor(Math.random() * 4))
        : new THREE.ConeGeometry(botR, h, 5);

      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.7,
        emissive: col,
        emissiveIntensity: 0.08,
      });

      const mesh = new THREE.Mesh(geo, mat);
      const { x, z } = _randRing(3, 12);
      mesh.position.set(x, h / 2, z - 2);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = (Math.random() - 0.5) * 0.25;
      mesh.castShadow = true;
      this.scene.add(mesh);
    }
  }

  _buildRocks() {
    for (let i = 0; i < 20; i++) {
      const s = 0.15 + Math.random() * 0.5;
      const geo = new THREE.DodecahedronGeometry(s, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.1, 0.25 + Math.random() * 0.15),
        roughness: 1.0,
      });
      const rock = new THREE.Mesh(geo, mat);
      const { x, z } = _randRing(1.5, 11);
      rock.position.set(x, s * 0.35, z - 2);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  _buildSeaweed() {
    for (let i = 0; i < 40; i++) {
      const h = 0.4 + Math.random() * 1.6;
      const geo = new THREE.PlaneGeometry(0.12, h, 1, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.35, 0.6, 0.18 + Math.random() * 0.1),
        roughness: 1.0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const { x, z } = _randRing(0.5, 10);
      mesh.position.set(x, h / 2, z - 2);
      mesh.rotation.y = Math.random() * Math.PI;
      this.scene.add(mesh);
      this.seaweed.push({
        mesh,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        amplitude: 0.06 + Math.random() * 0.06,
      });
    }
  }

  // ── Light Shafts ───────────────────────────────────────────────────────────

  _buildLightShafts() {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4488bb,
      transparent: true,
      opacity: 0.025,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (let i = 0; i < 6; i++) {
      const w = 0.8 + Math.random() * 0.8;
      const geo = new THREE.PlaneGeometry(w, 14);
      const shaft = new THREE.Mesh(geo, mat.clone());
      shaft.position.set(
        (Math.random() - 0.5) * 8,
        7,
        -3 + (Math.random() - 0.5) * 6
      );
      shaft.rotation.x = Math.PI / 2;
      shaft.rotation.z = (Math.random() - 0.5) * 0.4;
      this.scene.add(shaft);
    }
  }

  // ── Bubble Particle System ─────────────────────────────────────────────────

  _buildBubbleSystem() {
    const COUNT = 400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = Math.random() * 13;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22 - 2;

      this.bubbleData.push({
        ox: positions[i * 3],
        oz: positions[i * 3 + 2],
        speed: 0.15 + Math.random() * 0.7,
        drift: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x99ddff,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.bubbleParticles = new THREE.Points(geo, mat);
    this.scene.add(this.bubbleParticles);
  }

  // ── Water Surface ──────────────────────────────────────────────────────────

  _buildWaterSurface() {
    const geo = new THREE.PlaneGeometry(50, 50, 80, 80);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0055aa,
      transparent: true,
      opacity: 0.38,
      metalness: 0.95,
      roughness: 0.05,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const surface = new THREE.Mesh(geo, mat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 13;
    this.scene.add(surface);
    this.waterSurface = surface;
  }

  // ── Animation ──────────────────────────────────────────────────────────────

  update(delta) {
    this.time += delta;
    const t = this.time;

    // Caustic light drift
    this.causticLights.forEach(({ light, baseX, baseZ, phase }) => {
      light.position.x = baseX + Math.sin(t * 0.6 + phase) * 2;
      light.position.z = baseZ + Math.cos(t * 0.45 + phase) * 2;
      light.intensity   = 2.0 + Math.sin(t * 1.1 + phase) * 0.6;
    });

    // Bubble ascent + lateral drift
    const pos = this.bubbleParticles.geometry.attributes.position;
    for (let i = 0; i < this.bubbleData.length; i++) {
      const bd = this.bubbleData[i];
      let y = pos.getY(i) + bd.speed * delta;
      const x = pos.getX(i) + Math.sin(t * 0.9 + bd.phase) * 0.003;
      if (y > 13) { y = 0; }
      pos.setY(i, y);
      pos.setX(i, x);
    }
    pos.needsUpdate = true;

    // Seaweed sway — displace upper vertices more
    this.seaweed.forEach(({ mesh, phase, speed, amplitude }) => {
      const v = mesh.geometry.attributes.position;
      const count = v.count;
      for (let i = 0; i < count; i++) {
        const t2 = i / (count - 1); // 0 = base, 1 = tip
        const sway = Math.sin(t * speed + phase + t2 * 1.5) * amplitude * t2 * t2;
        v.setX(i, sway);
      }
      v.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    });

    // Water surface ripple
    const sv = this.waterSurface.geometry.attributes.position;
    for (let i = 0; i < sv.count; i++) {
      const x = sv.getX(i);
      const z = sv.getZ(i);
      sv.setZ(i,
        Math.sin(x * 0.4 + t * 0.6) * 0.12 +
        Math.cos(z * 0.35 + t * 0.45) * 0.1
      );
    }
    sv.needsUpdate = true;
    this.waterSurface.geometry.computeVertexNormals();
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _randRing(minR, maxR) {
  const angle  = Math.random() * Math.PI * 2;
  const radius = minR + Math.random() * (maxR - minR);
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}
