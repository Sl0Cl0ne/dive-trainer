// src/XRController.js
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory }       from 'three/addons/webxr/XRHandModelFactory.js';

/**
 * XRControllerManager — v5
 *
 * Uses the Gamepad API to read button states directly each frame.
 * This is far more reliable on Quest 3 than relying on squeezestart/squeezeend
 * events, which are inconsistently fired in WebXR browser sessions.
 *
 * Quest 3 gamepad button layout:
 *   buttons[0] = trigger (index finger)
 *   buttons[1] = squeeze / grip (middle finger)
 *   buttons[2] = touchpad / thumbstick
 *   buttons[3] = thumbstick press
 *   buttons[4] = A/X
 *   buttons[5] = B/Y
 *
 * Grab = squeeze (buttons[1]) OR trigger held near a grabbable (buttons[0])
 * Select panels = trigger tap (buttons[0]) when NOT near a grabbable
 */

const GRAB_RADIUS    = 0.25;  // metres — generous to aid usability
const SQUEEZE_THRESH = 0.5;   // button.value threshold to count as pressed
const TRIGGER_THRESH = 0.8;   // trigger needs to be pressed further to avoid accidental grabs

export class XRControllerManager {
  constructor(renderer, scene, camera) {
    this.renderer       = renderer;
    this.scene          = scene;
    this.camera         = camera;
    this.interactables  = [];
    this.hoveredObjects = new Map();
    this.grabbed        = new Map();   // ctrlIndex -> grab state | null
    this.controllers    = [];
    this.raycaster      = new THREE.Raycaster();
    this.raycaster.far  = 6;
    this._tempMatrix    = new THREE.Matrix4();

    // Gamepad button state tracking (to detect press/release edges)
    this._prevSqueeze = [false, false];
    this._prevTrigger = [false, false];

    this._init();
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  _init() {
    const controllerFactory = new XRControllerModelFactory();
    const handFactory       = new XRHandModelFactory();

    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);

      // Keep event listeners as backup for browsers that do fire them
      controller.addEventListener('selectstart',  () => this._onTriggerDown(i));
      controller.addEventListener('selectend',    () => this._onTriggerUp(i));
      controller.addEventListener('squeezestart', () => this._onSqueezeDown(i));
      controller.addEventListener('squeezeend',   () => this._onSqueezeUp(i));

      this.scene.add(controller);

      const grip = this.renderer.xr.getControllerGrip(i);
      grip.add(controllerFactory.createControllerModel(grip));
      this.scene.add(grip);

      const hand = this.renderer.xr.getHand(i);
      try { hand.add(handFactory.createHandModel(hand, 'mesh')); } catch(e) {}
      this.scene.add(hand);

      // Ray beam
      const ray = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-4)
        ]),
        new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 })
      );
      controller.add(ray);

      // Hit dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
      );
      dot.visible = false;
      this.scene.add(dot);

      // Grab proximity sphere
      const grabIndicator = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 8),
        new THREE.MeshBasicMaterial({
          color: 0x44ffaa, transparent: true, opacity: 0.2, depthWrite: false
        })
      );
      grabIndicator.visible = false;
      grip.add(grabIndicator);

      this.controllers.push({ controller, grip, hand, ray, dot, grabIndicator });
      this.hoveredObjects.set(i, null);
      this.grabbed.set(i, null);
    }
  }

  // ── Registry ───────────────────────────────────────────────────────────────

  register(object, callbacks) {
    if (!this.interactables.find(e => e.object === object))
      this.interactables.push({ object, type: 'select', callbacks });
    return this;
  }

  registerGrabbable(object, options) {
    if (!this.interactables.find(e => e.object === object))
      this.interactables.push({ object, type: 'grab', callbacks: options });
    return this;
  }

  unregister(object) {
    this.interactables = this.interactables.filter(e => e.object !== object);
  }

  clearAll() {
    for (let i = 0; i < 2; i++) {
      if (this.grabbed.get(i)) this._dropGrab(i);
    }
    this.interactables = [];
    this.hoveredObjects.forEach((_, k) => this.hoveredObjects.set(k, null));
  }

  // ── Event-based handlers (backup) ─────────────────────────────────────────

  _onTriggerDown(i) {
    if (this._startGrab(i)) return;
    const ctrl = this.controllers[i];
    const hits  = this._castRay(ctrl.controller);
    if (!hits.length) return;
    const entry = this._findEntry(hits[0].object);
    if (entry?.type === 'select' && entry.callbacks?.onSelect)
      entry.callbacks.onSelect(hits[0], i);
  }

  _onTriggerUp(i) {
    if (this.grabbed.get(i)) this._dropGrab(i);
  }

  _onSqueezeDown(i) { this._startGrab(i); }
  _onSqueezeUp(i)   { this._dropGrab(i);  }

  // ── Grab ───────────────────────────────────────────────────────────────────

  _startGrab(i) {
    if (this.grabbed.get(i)) return false;

    const ctrl    = this.controllers[i];
    const gripPos = new THREE.Vector3();
    ctrl.grip.getWorldPosition(gripPos);

    let nearest = null, nearestDist = GRAB_RADIUS;
    this.interactables.forEach(entry => {
      if (entry.type !== 'grab') return;
      const p = new THREE.Vector3();
      entry.object.getWorldPosition(p);
      const d = gripPos.distanceTo(p);
      if (d < nearestDist) { nearest = entry; nearestDist = d; }
    });

    if (!nearest) return false;

    const obj       = nearest.object;
    const objParent = obj.parent;
    const objWorldPos = new THREE.Vector3();
    obj.getWorldPosition(objWorldPos);

    // World-space offset: object stays at same relative position to grip
    const worldOffset = objWorldPos.clone().sub(gripPos);

    this.grabbed.set(i, { entry: nearest, parent: objParent, worldOffset });
    ctrl.grabIndicator.visible = false;
    ctrl.ray.visible = false;

    if (nearest.callbacks?.onGrab) nearest.callbacks.onGrab();
    return true;
  }

  _dropGrab(i) {
    const g = this.grabbed.get(i);
    if (!g) return;

    const { entry, parent } = g;
    const ctrl = this.controllers[i];

    const worldPos = new THREE.Vector3();
    entry.object.getWorldPosition(worldPos);

    this.grabbed.set(i, null);
    ctrl.ray.visible = true;

    // Check snap zones
    let snapped = false;
    if (entry.callbacks?.snapZones) {
      for (const zone of entry.callbacks.snapZones) {
        const zoneWorldPos = new THREE.Vector3();
        zone.mesh.getWorldPosition(zoneWorldPos);
        if (worldPos.distanceTo(zoneWorldPos) < (zone.radius || 0.25)) {
          parent.updateWorldMatrix(true, false);
          const parentInv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
          entry.object.position.copy(zoneWorldPos.clone().applyMatrix4(parentInv));
          entry.object.scale.setScalar(1.0);
          if (entry.callbacks?.onSnap) entry.callbacks.onSnap(zone.id);
          snapped = true;
          break;
        }
      }
    }
    if (!snapped && entry.callbacks?.onRelease) entry.callbacks.onRelease();
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update() {
    if (!this.renderer.xr.isPresenting) return;

    // ── Gamepad polling — read button states directly each frame ─────────────
    const session = this.renderer.xr.getSession();
    if (session?.inputSources) {
      session.inputSources.forEach((source, i) => {
        if (i >= 2 || !source.gamepad) return;

        const buttons  = source.gamepad.buttons;
        const squeeze  = buttons[1]?.value > SQUEEZE_THRESH;
        const trigger  = buttons[0]?.value > TRIGGER_THRESH;

        // Squeeze press → grab
        if (squeeze && !this._prevSqueeze[i]) this._startGrab(i);
        if (!squeeze && this._prevSqueeze[i]) this._dropGrab(i);
        this._prevSqueeze[i] = squeeze;

        // Trigger press → grab if near grabbable, else ray-select
        if (trigger && !this._prevTrigger[i]) {
          if (!this._startGrab(i)) {
            // Not near a grabbable — treat as panel select
            const ctrl = this.controllers[i];
            const hits  = this._castRay(ctrl.controller);
            if (hits.length) {
              const entry = this._findEntry(hits[0].object);
              if (entry?.type === 'select' && entry.callbacks?.onSelect)
                entry.callbacks.onSelect(hits[0], i);
            }
          }
        }
        if (!trigger && this._prevTrigger[i]) {
          if (this.grabbed.get(i)) this._dropGrab(i);
        }
        this._prevTrigger[i] = trigger;
      });
    }

    // ── Move grabbed objects every frame ─────────────────────────────────────
    this.grabbed.forEach((g, i) => {
      if (!g) return;
      const ctrl    = this.controllers[i];
      const gripPos = new THREE.Vector3();
      ctrl.grip.getWorldPosition(gripPos);

      const targetWorld = gripPos.clone().add(g.worldOffset);
      const obj = g.entry.object;
      g.parent.updateWorldMatrix(true, false);
      const parentInv = new THREE.Matrix4().copy(g.parent.matrixWorld).invert();
      obj.position.copy(targetWorld.clone().applyMatrix4(parentInv));
    });

    // ── Ray hover + proximity indicators ─────────────────────────────────────
    this.controllers.forEach((ctrl, i) => {
      const isGrabbing = !!this.grabbed.get(i);

      if (!isGrabbing) {
        const gripPos = new THREE.Vector3();
        ctrl.grip.getWorldPosition(gripPos);
        let nearAny = false;

        this.interactables.forEach(entry => {
          if (entry.type !== 'grab') return;
          const p = new THREE.Vector3();
          entry.object.getWorldPosition(p);
          const near = gripPos.distanceTo(p) < GRAB_RADIUS;
          if (near) {
            nearAny = true;
            // Pulse scale
            entry.object.scale.setScalar(1 + Math.sin(Date.now() * 0.008) * 0.06);
          } else {
            entry.object.scale.setScalar(1.0);
          }
        });

        ctrl.grabIndicator.visible = nearAny;
        // Pulse indicator colour between green and white when near
        if (nearAny) {
          const p = (Math.sin(Date.now() * 0.008) + 1) / 2;
          ctrl.grabIndicator.material.color.setRGB(p * 0.5 + 0.5, 1.0, p * 0.5 + 0.5);
        }
      } else {
        ctrl.grabIndicator.visible = false;
      }

      if (isGrabbing) return;

      const hits = this._castRay(ctrl.controller);
      if (hits.length > 0) {
        const hit = hits[0];
        ctrl.dot.visible = true;
        ctrl.dot.position.copy(hit.point);
        const localPt = ctrl.controller.worldToLocal(hit.point.clone());
        ctrl.ray.geometry.setFromPoints([
          new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-localPt.length())
        ]);
        ctrl.ray.material.opacity = 0.7;

        const entry = this._findEntry(hit.object);
        const prev  = this.hoveredObjects.get(i);
        if (entry !== prev) {
          if (prev?.callbacks?.onHoverExit)   prev.callbacks.onHoverExit(i);
          if (entry?.callbacks?.onHoverEnter) entry.callbacks.onHoverEnter(i);
          this.hoveredObjects.set(i, entry || null);
        }
      } else {
        ctrl.dot.visible = false;
        ctrl.ray.geometry.setFromPoints([
          new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-4)
        ]);
        ctrl.ray.material.opacity = 0.3;
        const prev = this.hoveredObjects.get(i);
        if (prev) {
          if (prev.callbacks?.onHoverExit) prev.callbacks.onHoverExit(i);
          this.hoveredObjects.set(i, null);
        }
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _castRay(controller) {
    this._tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tempMatrix);
    return this.raycaster.intersectObjects(
      this.interactables.filter(e => e.type === 'select').map(e => e.object),
      true
    );
  }

  _findEntry(mesh) {
    let node = mesh;
    while (node) {
      const found = this.interactables.find(e => e.object === node);
      if (found) return found;
      node = node.parent;
    }
    return null;
  }
}
