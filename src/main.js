// src/main.js
/**
 * DiveTrainer VR — Main Application
 *
 * Entry point. Bootstraps:
 *   - WebGL renderer with XR enabled
 *   - Underwater scene (persistent environment)
 *   - XR controller manager
 *   - Main menu
 *   - Module loading/unloading
 *   - Render loop
 *
 * Target: Quest 3 via Meta Browser (WebXR)
 * Fallback: Desktop mouse/keyboard (no VR headset required for development)
 */

import * as THREE from 'three';
import { UnderwaterScene }     from './UnderwaterScene.js';
import { XRControllerManager } from './XRController.js';
import { MainMenu }            from './ui/MainMenu.js';
import { GearBuildModule }     from './modules/GearBuild.js';
import { GearAssemblyModule }  from './modules/GearAssembly.js';
import { DiveSignalsModule }   from './modules/DiveSignals.js';
import { AirCheckModule }      from './modules/AirCheck.js';

class DiveTrainerApp {
  constructor() {
    this.clock         = new THREE.Clock();
    this.currentModule = null;

    this._initRenderer();
    this._initScene();
    this._initXR();
    this._initUI();
    this._bindEvents();
    this._startLoop();
  }

  // ── Renderer ───────────────────────────────────────────────────────────────

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.65;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Insert canvas before overlay so overlay sits on top
    const overlay = document.getElementById('overlay');
    document.body.insertBefore(this.renderer.domElement, overlay);
  }

  // ── Scene & Camera ─────────────────────────────────────────────────────────

  _initScene() {
    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 100);

    // XR rig: camera sits inside this group; move this group to reposition the player
    this.xrRig = new THREE.Group();
    this.xrRig.position.set(0, 0, 0);
    this.xrRig.add(this.camera);
    this.scene.add(this.xrRig);

    // Desktop fallback camera position (slightly above seabed looking toward scene)
    this.camera.position.set(0, 1.65, 2.5);
    this.camera.lookAt(0, 1.4, -1);

    // Build the persistent underwater environment
    this.underwaterScene = new UnderwaterScene(this.scene);
  }

  // ── XR Controllers ─────────────────────────────────────────────────────────

  _initXR() {
    this.xrControllers = new XRControllerManager(this.renderer, this.scene, this.camera);
  }

  // ── Menus & Modules ────────────────────────────────────────────────────────

  _initUI() {
    this.mainMenu = new MainMenu(this.scene, this.xrControllers, (moduleId) => {
      this._loadModule(moduleId);
    });
  }

  _loadModule(moduleId) {
    // Dispose current module cleanly
    if (this.currentModule) {
      this.currentModule.dispose();
      this.currentModule = null;
    }

    this.mainMenu.hide();

    const returnToMenu = () => {
      if (this.currentModule) {
        this.currentModule.dispose();
        this.currentModule = null;
      }
      this.mainMenu.show();
    };

    switch (moduleId) {
      case 'gearbuild':
        this.currentModule = new GearBuildModule(this.scene, this.xrControllers, returnToMenu);
        break;
      case 'gear':
        this.currentModule = new GearAssemblyModule(this.scene, this.xrControllers, returnToMenu);
        break;
      case 'signals':
        this.currentModule = new DiveSignalsModule(this.scene, this.xrControllers, returnToMenu);
        break;
      case 'aircheck':
        this.currentModule = new AirCheckModule(this.scene, this.xrControllers, returnToMenu);
        break;
      default:
        console.warn(`Unknown module: ${moduleId}`);
        returnToMenu();
    }
  }

  // ── VR Entry ───────────────────────────────────────────────────────────────

  _bindEvents() {
    const btn    = document.getElementById('vr-button');
    const status = document.getElementById('status');
    const overlay = document.getElementById('overlay');

    if (!navigator.xr) {
      btn.textContent = 'WebXR not available';
      btn.disabled = true;
      status.textContent = 'Use a WebXR-capable browser (Meta Browser on Quest, or Chrome with a headset)';
      return;
    }

    navigator.xr.isSessionSupported('immersive-vr').then(supported => {
      if (!supported) {
        btn.textContent = 'VR not supported on this device';
        btn.disabled = true;
        status.textContent = 'Try opening this in Meta Browser on your Quest 3';
        return;
      }

      btn.addEventListener('click', async () => {
        try {
          const session = await navigator.xr.requestSession('immersive-vr', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['bounded-floor', 'hand-tracking'],
          });

          await this.renderer.xr.setSession(session);
          overlay.style.display = 'none';

          session.addEventListener('end', () => {
            overlay.style.display = 'flex';
          });
        } catch (err) {
          console.error('XR session error:', err);
          status.textContent = `Error: ${err.message}`;
        }
      });
    }).catch(err => {
      status.textContent = `XR check failed: ${err.message}`;
    });

    // Handle resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ── Render Loop ────────────────────────────────────────────────────────────

  _startLoop() {
    this.renderer.setAnimationLoop((timestamp, frame) => {
      const delta = this.clock.getDelta();

      // Environment always updates
      this.underwaterScene.update(delta);

      // Controllers update (ray hover etc.)
      this.xrControllers.update();

      // Active menu / module
      this.mainMenu.update(delta);

      if (this.currentModule?.update) {
        this.currentModule.update(delta);
      }

      this.renderer.render(this.scene, this.camera);
    });
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────

new DiveTrainerApp();
