// src/modules/AirCheck.js
import * as THREE from 'three';
import { createPanel } from '../ui/Panel.js';

/**
 * Air Management Module
 *
 * Presents a 3D submersible pressure gauge (SPG) with a rendered needle.
 * 5 realistic scenarios at various depths and pressures. Player reads the
 * gauge, answers a decision question, and receives feedback grounded in
 * real dive planning principles (rule of thirds, turn pressure, reserve).
 */

const SCENARIOS = [
  {
    bar: 210,
    depth: 0,
    situation: 'You\'re on the boat, gearing up.\nYour SPG reads 210 bar.',
    question: 'What does this tell you?',
    correct: 'Tank is full — safe to dive',
    options: [
      'Tank is full — safe to dive',
      'Tank is at 70% — borderline for a long dive',
      'Emergency threshold — do not enter the water',
      'This is the surface pressure only',
    ],
    explanation: 'A full tank is typically 200–232 bar. Always check before gearing up and record your start pressure in your log. 210 bar is a solid full fill.',
    zone: 'green',
  },
  {
    bar: 150,
    depth: 12,
    situation: 'You\'re at 12m, 15 minutes into a dive.\nYour SPG reads 150 bar. Your buddy shows 160.',
    question: 'You\'re planning to dive to 20m for 10 more\nminutes. What should you consider?',
    correct: 'Plan off the lower gauge — check it again at 20m',
    options: [
      'Plan off the lower gauge — check it again at 20m',
      'You have plenty — don\'t worry until 50 bar',
      'Surface now — 150 is too low to go deeper',
      'Switch to your buddy\'s octopus preemptively',
    ],
    explanation: 'Always plan based on the lower of the two gauges. Air consumption increases with depth (Boyle\'s Law). At 20m you\'re using ~3x surface air per breath compared to the surface.',
    zone: 'yellow',
  },
  {
    bar: 80,
    depth: 18,
    situation: 'You\'re at 18m. SPG reads 80 bar.\nYour buddy signals 100 bar.',
    question: 'What is the correct action?',
    correct: 'Signal ascent — 80 bar at 18m means start now',
    options: [
      'Signal ascent — 80 bar at 18m means start now',
      'Stay until you hit 50 bar — that\'s the rule',
      'Ascend to 10m and hover until you hit 50 bar',
      'Buddy breathe off their tank to extend the dive',
    ],
    explanation: 'At 18m with 80 bar, you need air to ascend + a 3-minute safety stop at 5m + surface reserve. You\'re cutting it close. The "rule of thirds" means 1/3 out, 1/3 back, 1/3 reserve. 80 bar here means ascend now.',
    zone: 'orange',
  },
  {
    bar: 50,
    depth: 10,
    situation: 'SPG reads 50 bar at 10m.\nThis specific level has a name in diving.',
    question: 'What is this called, and what do you do?',
    correct: '"Turn pressure" — begin ascent immediately',
    options: [
      '"Turn pressure" — begin ascent immediately',
      '"Reserve" — you have 5 more minutes',
      '"Emergency reserve" — only for buddy breathing',
      '"Surface threshold" — only relevant at 20m+',
    ],
    explanation: '50 bar is your "turn pressure" — the point at which you must begin your ascent. It accounts for the safety stop and a surface reserve. 30 bar is emergency reserve only. Never plan to use it.',
    zone: 'orange',
  },
  {
    bar: 28,
    depth: 5,
    situation: 'You\'re at 5m completing a 3-minute safety stop.\nSPG now reads 28 bar.',
    question: 'What\'s your immediate concern and action?',
    correct: 'Complete stop quickly and surface — you\'re very low',
    options: [
      'Complete stop quickly and surface — you\'re very low',
      'Skip the safety stop — surface immediately',
      'You\'re fine — 28 bar is still safe reserve',
      'Signal buddy to donate air for the full stop',
    ],
    explanation: 'A 3-minute safety stop at 5m uses ~10–15 bar. At 28 bar you can likely complete it, but it\'s critically tight and stressful. This situation should never happen — it\'s a sign your turn pressure wasn\'t respected earlier.',
    zone: 'red',
  },
];

const ZONE_COLORS = {
  green:  { gauge: 0x00cc44, panel: 0x003311 },
  yellow: { gauge: 0xcccc00, panel: 0x332200 },
  orange: { gauge: 0xff8800, panel: 0x331100 },
  red:    { gauge: 0xff2200, panel: 0x330000 },
};

export class AirCheckModule {
  constructor(scene, xrControllers, onComplete) {
    this.scene = scene;
    this.xrControllers = xrControllers;
    this.onComplete = onComplete;

    this.group   = new THREE.Group();
    this.current = 0;
    this.score   = 0;
    this.panels  = [];
    this._optionMeshes = [];

    scene.add(this.group);
    this._addLighting();

    this._buildGauge();
    this._buildChrome();
    this._showScenario(0);
  }

  // ── SPG Gauge ──────────────────────────────────────────────────────────────


  _addLighting() {
    // Strong overhead key light
    const key = new THREE.PointLight(0xfff8f0, 6.0, 10);
    key.position.set(0, 2.5, -0.6);
    this.group.add(key);
    // Front fill — eliminates dark faces toward player
    const fill = new THREE.PointLight(0xffffff, 4.0, 10);
    fill.position.set(0, 1.6, 0.8);
    this.group.add(fill);
    // Left rim
    const rimL = new THREE.PointLight(0xaaccff, 2.5, 8);
    rimL.position.set(-1.5, 1.8, -1.0);
    this.group.add(rimL);
    // Right rim
    const rimR = new THREE.PointLight(0xaaccff, 2.5, 8);
    rimR.position.set( 1.5, 1.8, -1.0);
    this.group.add(rimR);
  }
  _buildGauge() {
    this.gaugeGroup = new THREE.Group();
    this.gaugeGroup.position.set(-1.7, 1.55, -1.1);
    this.gaugeGroup.scale.setScalar(1.6);

    // Gauge body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.045, 36),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.25 })
    );
    body.rotation.x = Math.PI / 2;
    this.gaugeGroup.add(body);

    // Face
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 36),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5 })
    );
    face.position.z = 0.026;
    this.gaugeGroup.add(face);
    this._gaugeFace = face;

    // Red zone arc (0–50 bar)
    this._buildArc(0, 50, 0xff2200, 0.03);

    // Yellow zone (50–100 bar)
    this._buildArc(50, 100, 0xffaa00, 0.028);

    // Tick marks + labels
    [0, 50, 100, 150, 200, 250, 300].forEach(bar => {
      const angle = this._barToAngle(bar);
      const len = 0.025;
      const inner = 0.14;

      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, len, 0.001),
        new THREE.MeshBasicMaterial({ color: 0x222222 })
      );
      tick.position.set(
        Math.sin(angle) * (inner + len / 2),
        Math.cos(angle) * (inner + len / 2),
        0.028
      );
      tick.rotation.z = -angle;
      this.gaugeGroup.add(tick);
    });

    // Needle (will rotate)
    const needleShape = new THREE.Shape();
    needleShape.moveTo(-0.008, 0);
    needleShape.lineTo(0, 0.135);
    needleShape.lineTo(0.008, 0);
    needleShape.closePath();

    const needleGeo = new THREE.ShapeGeometry(needleShape);
    this._needle = new THREE.Mesh(
      needleGeo,
      new THREE.MeshBasicMaterial({ color: 0xff2200, side: THREE.DoubleSide })
    );
    this._needle.position.z = 0.032;
    this.gaugeGroup.add(this._needle);

    // Center pin
    const pin = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 16),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    pin.position.z = 0.034;
    this.gaugeGroup.add(pin);

    // Bezel ring
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.018, 8, 36),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.3 })
    );
    bezel.rotation.x = Math.PI / 2;
    this.gaugeGroup.add(bezel);

    // Hose stub
    const hose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    hose.position.set(0, -0.26, 0);
    hose.rotation.x = Math.PI / 2;
    this.gaugeGroup.add(hose);

    this.group.add(this.gaugeGroup);
  }

  _buildArc(barStart, barEnd, color, z) {
    const startAngle = this._barToAngle(barStart) + Math.PI / 2;
    const endAngle   = this._barToAngle(barEnd)   + Math.PI / 2;
    const arcLen = endAngle - startAngle;
    if (arcLen <= 0) return;

    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.155, 0.012, 4, 24, arcLen),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    arc.position.z = z;
    arc.rotation.z = -startAngle;
    this.gaugeGroup.add(arc);
  }

  _barToAngle(bar) {
    // 0 bar = -135° (bottom-left), 300 bar = +135° (bottom-right)
    // angle 0 = up; clockwise = increasing
    const normalized = Math.min(Math.max(bar, 0), 300) / 300;
    return (normalized * Math.PI * 1.5) - Math.PI * 0.75;
  }

  _setGaugePressure(bar) {
    this._needle.rotation.z = -this._barToAngle(bar);
  }

  // ── Scenario display ───────────────────────────────────────────────────────

  _buildChrome() {
    const back = createPanel('← Menu', {
      position: new THREE.Vector3(-2.2, 2.3, -1.2),
      width: 0.38,
      fontSize: 19,
      color: 0x1a1a2e,
      align: 'center',
    });
    this.group.add(back);
    this.xrControllers.register(back, {
      onSelect: () => this.onComplete(),
      onHoverEnter: () => back.scale.setScalar(1.06),
      onHoverExit:  () => back.scale.setScalar(1.0),
    });
    this._backBtn = back;

    this._scorePanel = this._makeScorePanel();
    this.group.add(this._scorePanel);
  }

  _makeScorePanel() {
    return createPanel(`Score: ${this.score} / ${SCENARIOS.length}`, {
      position: new THREE.Vector3(2.2, 2.3, -1.2),
      width: 0.44,
      fontSize: 19,
      color: 0x002233,
      align: 'center',
    });
  }

  _showScenario(index) {
    this._clearPanels();

    const s = SCENARIOS[index];
    const colors = ZONE_COLORS[s.zone];

    // Animate needle to new pressure
    this._animateNeedle(s.bar);

    // Pressure readout (near gauge)
    const readout = createPanel(`${s.bar} bar\n${s.depth}m depth`, {
      position: new THREE.Vector3(-1.7, 0.9, -1.1),
      width: 0.52,
      fontSize: 26,
      color: colors.panel,
      align: 'center',
    });
    this._add(readout);

    // Scenario counter
    const counter = createPanel(`Scenario ${index + 1} of ${SCENARIOS.length}`, {
      position: new THREE.Vector3(0, 2.5, -1.3),
      width: 0.65,
      fontSize: 18,
      color: 0x001122,
      align: 'center',
    });
    this._add(counter);

    // Situation
    const sitPanel = createPanel(s.situation, {
      position: new THREE.Vector3(0.3, 2.05, -1.3),
      width: 1.15,
      fontSize: 22,
      color: 0x001133,
      align: 'left',
    });
    this._add(sitPanel);

    // Question
    const qPanel = createPanel(s.question, {
      position: new THREE.Vector3(0.3, 1.55, -1.3),
      width: 1.15,
      fontSize: 21,
      color: 0x220011,
      align: 'left',
    });
    this._add(qPanel);

    // Options
    const shuffled = [...s.options].sort(() => Math.random() - 0.5);
    this._optionMeshes = [];
    shuffled.forEach((opt, i) => {
      const col = i % 2 === 0 ? -0.26 : 0.86;
      const row = i < 2 ? 1.1 : 0.76;

      const btn = createPanel(opt, {
        position: new THREE.Vector3(col, row, -1.3),
        width: 0.95,
        fontSize: 18,
        color: 0x111133,
        align: 'center',
      });
      this._add(btn);
      this._optionMeshes.push(btn);

      this.xrControllers.register(btn, {
        onSelect: () => this._onAnswer(opt, s),
        onHoverEnter: () => btn.scale.setScalar(1.06),
        onHoverExit:  () => btn.scale.setScalar(1.0),
      });
    });
  }

  _animateNeedle(targetBar) {
    const startAngle = this._needle ? -this._needle.rotation.z : 0;
    const endAngle   = -this._barToAngle(targetBar);
    let t = 0;

    const step = () => {
      t = Math.min(t + 0.025, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      if (this._needle) {
        this._needle.rotation.z = startAngle + (endAngle - startAngle) * ease;
      }
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── Answer handling ────────────────────────────────────────────────────────

  _onAnswer(selected, scenario) {
    const correct = selected === scenario.correct;
    if (correct) this.score++;

    this._optionMeshes.forEach(m => this.xrControllers.unregister(m));

    const result = createPanel(
      `${correct ? '✓ Correct' : '✗ Incorrect'}\n\n${scenario.explanation}${!correct ? `\n\nCorrect: ${scenario.correct}` : ''}`,
      {
        position: new THREE.Vector3(0.3, 0.42, -1.3),
        width: 1.35,
        fontSize: 19,
        color: correct ? 0x003311 : 0x330011,
        align: 'left',
      }
    );
    this._add(result);

    this.group.remove(this._scorePanel);
    this._scorePanel = this._makeScorePanel();
    this.group.add(this._scorePanel);

    const isLast = this.current >= SCENARIOS.length - 1;
    const nextBtn = createPanel(isLast ? 'Finish →' : 'Next →', {
      position: new THREE.Vector3(0.9, 0.08, -1.3),
      width: 0.48,
      fontSize: 21,
      color: 0x002244,
      align: 'center',
    });
    this._add(nextBtn);
    this.xrControllers.register(nextBtn, {
      onSelect: () => {
        if (isLast) {
          this._showCompletion();
        } else {
          this.current++;
          this._showScenario(this.current);
        }
      },
      onHoverEnter: () => nextBtn.scale.setScalar(1.06),
      onHoverExit:  () => nextBtn.scale.setScalar(1.0),
    });
  }

  _showCompletion() {
    this._clearPanels();
    const pct   = Math.round((this.score / SCENARIOS.length) * 100);
    const grade = pct === 100 ? '🎉 Perfect. Air management is a critical safety skill.' :
                  pct >= 60  ? '👍 Solid. Review the scenarios you missed.' :
                               '⚠️  Air management needs work. Low air is a leading cause of dive incidents.';

    const done = createPanel(
      `Module Complete\n\nScore: ${this.score} / ${SCENARIOS.length}  (${pct}%)\n\n${grade}`,
      {
        position: new THREE.Vector3(0, 1.7, -1.3),
        width: 1.25,
        fontSize: 24,
        color: 0x001133,
        align: 'center',
      }
    );
    this._add(done);

    const menuBtn = createPanel('← Back to Menu', {
      position: new THREE.Vector3(0, 1.05, -1.3),
      width: 0.55,
      fontSize: 21,
      color: 0x001122,
      align: 'center',
    });
    this._add(menuBtn);
    this.xrControllers.register(menuBtn, {
      onSelect: () => this.onComplete(),
      onHoverEnter: () => menuBtn.scale.setScalar(1.06),
      onHoverExit:  () => menuBtn.scale.setScalar(1.0),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _add(panel) {
    this.group.add(panel);
    this.panels.push(panel);
  }

  _clearPanels() {
    this._optionMeshes.forEach(m => this.xrControllers.unregister(m));
    this._optionMeshes = [];
    this.panels.forEach(p => this.group.remove(p));
    this.panels = [];
  }

  update(delta) {
    if (this.gaugeGroup) {
      this.gaugeGroup.rotation.y = Math.sin(Date.now() * 0.0006) * 0.06;
    }
  }

  dispose() {
    this.xrControllers.clearAll();
    this.scene.remove(this.group);
  }
}
