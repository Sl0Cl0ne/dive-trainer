// src/modules/DiveSignals.js
import * as THREE from 'three';
import { createPanel } from '../ui/Panel.js';

/**
 * Dive Signals Module — v3
 *
 * Articulated 3D hand that actually performs each gesture.
 * The hand has a palm + 4 finger pivots (at knuckles) + thumb pivot.
 * Each gesture animates the finger curl amounts and whole-hand motion.
 *
 * Animation is purely the hand performing the signal —
 * no arrows, no effects, just the gesture itself looping.
 */

// ── Hand builder ────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

/**
 * Builds an articulated gloved hand.
 * Returns { group, palm, fingers[4], thumb }
 * fingers: [index, middle, ring, pinky] — each is a Group with rotation.x = curl
 * thumb: Group with rotation.x = curl, rotation.z = splay
 *
 * All measurements in metres. Hand fits in ~0.18m tall bounding box.
 */
function buildHand(color = 0x111111) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
  const g = new THREE.Group();

  // Palm — slightly wider at knuckles
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.115, 0.032), mat);
  g.add(palm);

  // Wrist stub
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.04, 10), mat);
  wrist.position.y = -0.077;
  g.add(wrist);

  // Finger knuckle positions (x offset, y at top of palm)
  const FINGER_DEFS = [
    { x: -0.037, len: 0.068, w: 0.019 }, // index
    { x: -0.012, len: 0.075, w: 0.02  }, // middle
    { x:  0.013, len: 0.072, w: 0.019 }, // ring
    { x:  0.037, len: 0.058, w: 0.017 }, // pinky
  ];

  const fingers = FINGER_DEFS.map(def => {
    const pivot = new THREE.Group();
    pivot.position.set(def.x, 0.058, 0); // at knuckle
    // Finger mesh extends UPWARD from pivot (pivot = rotation point at base of finger)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.len, 0.026), mat);
    mesh.position.y = def.len / 2;
    // Rounded fingertip
    const tip = new THREE.Mesh(new THREE.SphereGeometry(def.w / 2, 8, 6), mat);
    tip.position.y = def.len;
    tip.scale.set(1, 0.7, 0.9);
    pivot.add(mesh, tip);
    g.add(pivot);
    return pivot;
  });

  // Thumb — starts splayed out at base of palm (left side)
  const thumbPivot = new THREE.Group();
  thumbPivot.position.set(-0.058, -0.01, 0.005);
  thumbPivot.rotation.z = 0.35; // natural outward splay
  const thumbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.058, 0.026), mat);
  thumbMesh.position.y = 0.029;
  const thumbTip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), mat);
  thumbTip.position.y = 0.058;
  thumbPivot.add(thumbMesh, thumbTip);
  g.add(thumbPivot);

  return { group: g, palm, fingers, thumbPivot };
}

/**
 * Pose helper: set finger curl values.
 * curls[0..3] = finger curl in radians (0 = straight, ~1.8 = fully curled)
 * thumbCurl = thumb curl (0 = out, 1.2 = tucked)
 * thumbSplay = extra z rotation for thumb (0 = natural)
 */
function setPose(hand, curls, thumbCurl = 0, thumbSplay = 0) {
  curls.forEach((c, i) => { hand.fingers[i].rotation.x = c; });
  hand.thumbPivot.rotation.x = thumbCurl;
  hand.thumbPivot.rotation.z = 0.35 + thumbSplay;
}

// Preset poses
const POSE = {
  open:     [0,    0,    0,    0   ],  // all fingers extended
  fist:     [1.7,  1.75, 1.75, 1.75], // fully curled
  okIndex:  [1.55, 0,    0,    0   ],  // index curled, rest open
};

// ── Gesture functions ───────────────────────────────────────────────────────
// Each returns { group: THREE.Group, animate: (time: number) => void }

// OK sign: index finger curls down to meet thumb tip forming a circle.
// Hand tilted so the circle faces the viewer.
function gestureOK() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  // Tilt hand so the circle is visible face-on to the player
  h.group.rotation.y = 0.45;
  h.group.rotation.z = -0.15;
  setPose(h, POSE.open, 0);

  return {
    group: h.group,
    animate(t) {
      const phase = (t * 0.28) % 1;
      let curl;
      if      (phase < 0.35) curl = easeInOut(phase / 0.35);
      else if (phase < 0.65) curl = 1;
      else                   curl = easeInOut(1 - (phase - 0.65) / 0.35);

      // Index curls down ~90° so fingertip points forward
      h.fingers[0].rotation.x = curl * 1.45;
      // Thumb swings UP and IN to meet index fingertip
      h.thumbPivot.rotation.x = curl * -0.6;
      h.thumbPivot.rotation.z = 0.35 - curl * 0.55; // swings inward
      h.thumbPivot.position.x = lerp(-0.058, -0.022, curl);
      h.thumbPivot.position.y = lerp(-0.010,  0.040, curl);
      h.thumbPivot.position.z = lerp( 0.005,  0.010, curl);
      // Other three fingers stay extended upward — classic OK pose
      h.fingers[1].rotation.x = curl * 0.1; // very slight curl
      h.fingers[2].rotation.x = curl * 0.1;
      h.fingers[3].rotation.x = curl * 0.15;
    }
  };
}

// Ascend: closed fist, thumb up, whole hand moves upward
function gestureAscend() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  setPose(h, POSE.fist, 0.7);
  h.thumbPivot.rotation.z = 0.1; // thumb points up

  return {
    group: h.group,
    animate(t) {
      // Thumb stays up (extended), hand bobs upward
      setPose(h, POSE.fist, 0.3);
      h.thumbPivot.rotation.z = 0.05;
      h.group.position.y = Math.sin(t * 1.8) * 0.06;
    }
  };
}

// Descend: fist, thumb down, hand moves downward
function gestureDescend() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  // Rotate whole hand so thumb points down
  h.group.rotation.z = Math.PI;

  return {
    group: h.group,
    animate(t) {
      setPose(h, POSE.fist, 0.3);
      h.thumbPivot.rotation.z = 0.05;
      h.group.position.y = -Math.abs(Math.sin(t * 1.8)) * 0.07;
    }
  };
}

// Stop: flat open palm facing viewer, hand pushes forward (toward viewer)
function gestureStop() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  // Rotate hand so palm faces viewer (z toward viewer)
  h.group.rotation.x = -Math.PI / 2;
  h.group.rotation.z = Math.PI; // fingers point up when palm faces viewer

  return {
    group: h.group,
    animate(t) {
      setPose(h, POSE.open, 0, 0);
      // Push forward and back
      h.group.position.z = 0.04 + Math.sin(t * 1.5) * 0.03;
    }
  };
}

// Low on air: fist forms, taps toward chest repeatedly
function gestureLowAir() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      // Always a fist
      setPose(h, POSE.fist, 1.0);
      // Rhythmic tap motion toward chest (forward in -z)
      const tap = Math.abs(Math.sin(t * 2.5));
      h.group.position.z = -tap * 0.05;
      h.group.position.y = tap * 0.01;
    }
  };
}

// Out of air: flat hand sweeps back and forth horizontally at throat level
function gestureOTA() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  // Rotate so hand is flat, edge facing viewer (like a karate chop)
  h.group.rotation.z = Math.PI / 2; // fingers point to the right
  h.group.rotation.x = 0.2;         // slight tilt

  return {
    group: h.group,
    animate(t) {
      setPose(h, POSE.open, 0);
      // Sweep horizontally left and right
      h.group.position.x = Math.sin(t * 2.2) * 0.1;
    }
  };
}

// Something's wrong: open flat hand, palm down, rocks left-right at wrist
function gestureProblem() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  // Palm facing down: tilt forward
  h.group.rotation.x = -Math.PI * 0.45;

  return {
    group: h.group,
    animate(t) {
      setPose(h, POSE.open, 0);
      // Rock left-right — the "so-so" wrist motion
      h.group.rotation.z = Math.sin(t * 2.8) * 0.55;
    }
  };
}

// Ears not clearing: index finger pointing, hand moves to indicate ear area
function gestureEars() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      // Fist with index finger extended (pointing)
      setPose(h, [0, 1.7, 1.7, 1.7], 1.0);
      h.fingers[0].rotation.x = 0;
      // Hand moves toward ear position (right side, oscillates slightly)
      h.group.position.x =  0.06 + Math.sin(t * 1.2) * 0.01;
      h.group.position.y =  0.03 + Math.sin(t * 1.2) * 0.01;
      h.group.rotation.z = -0.4;
    }
  };
}

// Slow down: flat palm facing down, pushes downward repeatedly
function gestureSlowDown() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  // Palm facing down
  h.group.rotation.x = -Math.PI * 0.5;

  return {
    group: h.group,
    animate(t) {
      setPose(h, POSE.open, 0);
      // Push down and return
      const push = (Math.sin(t * 2) + 1) / 2;
      h.group.position.y = -push * 0.07;
    }
  };
}

// Turn the dive: index finger extended, whole hand rotates in a circle
function gestureTurnDive() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      // Index up, others curled
      setPose(h, [0, 1.7, 1.7, 1.7], 1.0);
      h.fingers[0].rotation.x = 0;
      // Rotate the whole hand in a circle (wrist rotation)
      h.group.rotation.z = t * 1.2; // continuous rotation
    }
  };
}

// Come here: fingers curl in beckoning motion, hand tilts
function gestureComeHere() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);
  h.group.rotation.x = -0.5; // palm tilts toward viewer

  return {
    group: h.group,
    animate(t) {
      // All fingers curl and uncurl in a beckoning wave
      const wave = (Math.sin(t * 2.5) + 1) / 2;
      h.fingers.forEach((f, i) => {
        const offset = i * 0.15; // slight offset per finger for wave effect
        const w = (Math.sin(t * 2.5 - offset) + 1) / 2;
        f.rotation.x = w * 1.4;
      });
      setPose(h, [], 0.5); // thumb slightly inward
      h.thumbPivot.rotation.x = 0.3;
    }
  };
}

// Share air: hand points to own mouth, then sweeps to point at buddy
function gestureShareAir() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      // Index pointing (fist + index extended)
      setPose(h, [0, 1.7, 1.7, 1.7], 1.0);
      h.fingers[0].rotation.x = 0;
      // Sweep left (self) to right (buddy) and back
      h.group.rotation.y = Math.sin(t * 1.4) * 0.7;
      h.group.position.y = Math.sin(Math.abs(t * 1.4) * 2) * 0.02;
    }
  };
}

// I'm cold: hand grabs/rubs arm — simple fist that oscillates
function gestureCold() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      // Partially curled fingers (grabbing arm)
      const grip = 0.9 + Math.sin(t * 6) * 0.2; // slight shiver
      setPose(h, [grip, grip, grip, grip], 0.5);
      // Rub motion: up and down
      h.group.position.y = Math.sin(t * 4) * 0.025;
      h.group.rotation.z = Math.sin(t * 8) * 0.04; // slight shiver rotation
    }
  };
}

// Danger: hand forms fist, pounds down like a hammer
function gestureDanger() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      setPose(h, POSE.fist, 1.0);
      // Hammer pound: fast down, slow up
      const cycle = (t * 1.8) % 1;
      let y;
      if (cycle < 0.35) {
        // Quick strike down
        y = lerp(0.06, -0.04, easeInOut(cycle / 0.35));
      } else if (cycle < 0.5) {
        // Brief hold at bottom
        y = -0.04;
      } else {
        // Slow lift back up
        y = lerp(-0.04, 0.06, easeInOut((cycle - 0.5) / 0.5));
      }
      h.group.position.y = y;
    }
  };
}

// Distress (surface): both arms wave — we'll show one arm waving overhead
function gestureDistress() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      setPose(h, POSE.open, 0);
      // Wave overhead: whole arm sweeps side to side
      h.group.rotation.z = Math.sin(t * 2.5) * 0.6;
      h.group.position.y = 0.06 + Math.sin(t * 2.5) * 0.02;
    }
  };
}

// Which way: both index fingers point outward and rotate to question
function gestureWhichWay() {
  const h = buildHand();
  h.group.scale.setScalar(1.4);

  return {
    group: h.group,
    animate(t) {
      // Fist with index pointing, rotates to "question"
      setPose(h, [0, 1.7, 1.7, 1.7], 1.0);
      h.fingers[0].rotation.x = 0;
      // Tilt left and right questioningly
      h.group.rotation.z = Math.sin(t * 1.5) * 0.55;
      h.group.rotation.y = Math.sin(t * 1.5) * 0.3;
    }
  };
}

// ── Signal data ─────────────────────────────────────────────────────────────

const SIGNALS = [
  {
    name: 'OK (Underwater)',
    description: 'Thumb and index finger form a circle.\nOther three fingers extended upward.\nExchange at key moments during the dive.',
    correct: 'Return the OK signal',
    options: ['Return the OK signal', 'Ascend slowly', 'Inflate BCD', 'Point to gauge'],
    explanation: 'Underwater OK is two-way. Both divers confirm before descent, after reaching depth, and before ascent. One-way doesn\'t count.',
    accent: 0x004400, gestureFn: gestureOK,
  },
  {
    name: 'Go Up / Ascend',
    description: 'Fist with thumb pointing straight up.\nHand moves upward.\nMax ascent rate: 9 m/min.',
    correct: 'Begin controlled ascent (max 9 m/min)',
    options: ['Begin controlled ascent (max 9 m/min)', 'Return OK', 'Descend deeper', 'Check air'],
    explanation: 'Ascend at max 9 m/min (30 ft/min). Rushing risks decompression sickness — a potentially life-altering injury.',
    accent: 0x003333, gestureFn: gestureAscend,
  },
  {
    name: 'Go Down / Descend',
    description: 'Fist with thumb pointing straight down.\nHand moves downward.\nEqualize before you feel pressure.',
    correct: 'Begin controlled descent, equalize early',
    options: ['Begin controlled descent, equalize early', 'Surface immediately', 'Inflate BCD', 'Return OK'],
    explanation: 'Equalize continuously during descent. If ears won\'t clear, stop and ascend slightly. Never force equalization.',
    accent: 0x003333, gestureFn: gestureDescend,
  },
  {
    name: 'Stop / Stay',
    description: 'Open palm facing partner, fingers up.\nHand pushes gently toward buddy.\nHold position and wait.',
    correct: 'Stop and hold depth',
    options: ['Stop and hold depth', 'Surface immediately', 'Return to buddy', 'Inflate BCD'],
    explanation: 'Pause and wait. The lead diver may be checking conditions, a current, or marine life before proceeding.',
    accent: 0x334400, gestureFn: gestureStop,
  },
  {
    name: 'Low on Air',
    description: 'Fist tapping against the chest.\nTank is below 70 bar.\nNot an emergency yet — act now.',
    correct: 'Begin ascent together — end the dive',
    options: ['Begin ascent together — end the dive', 'Swim to anchor line first', 'Give buddy your octopus', 'Surface alone'],
    explanation: '50 bar is your turn pressure — the dive ends now, together. Splitting up at low air dramatically increases risk.',
    accent: 0x442200, gestureFn: gestureLowAir,
  },
  {
    name: 'Out of Air',
    description: 'Flat hand sweeps back and forth\nacross the throat — urgent, repeated.\nThis is a critical emergency.',
    correct: 'Offer octopus immediately, ascend together',
    options: ['Offer octopus immediately, ascend together', 'Surface alone immediately', 'Try buddy\'s primary reg', 'Signal OK and wait'],
    explanation: 'Offer your octopus RIGHT NOW. Establish neutral buoyancy, ascend together at a controlled rate. Practise this drill.',
    accent: 0x440000, gestureFn: gestureOTA,
  },
  {
    name: "Something's Wrong",
    description: 'Flat open hand, palm down,\nrocking left and right at the wrist.\nThen points to the problem area.',
    correct: 'Approach buddy and investigate',
    options: ['Approach buddy and investigate', 'Surface immediately', 'Inflate BCD', 'Return OK'],
    explanation: 'Check in with your buddy. Problems range from a leaky mask to anxiety. Ask if they want to abort. Never ignore this signal.',
    accent: 0x332200, gestureFn: gestureProblem,
  },
  {
    name: 'Ears Not Clearing',
    description: 'Index finger pointing toward the ear,\nor pinching nose through mask.\nDiver is having equalization trouble.',
    correct: 'Slow descent, give buddy time to equalize',
    options: ['Slow descent, give buddy time to equalize', 'Increase descent rate', 'Surface immediately', 'Signal to go deeper'],
    explanation: 'Slow down or stop. Never force equalization — a ruptured eardrum ends the dive and may cause lasting damage.',
    accent: 0x222233, gestureFn: gestureEars,
  },
  {
    name: 'Slow Down / Calm Down',
    description: 'Flat palm facing down,\npressing downward slowly.\nAlso signals: relax, take it easy.',
    correct: 'Slow down and acknowledge',
    options: ['Slow down and acknowledge', 'Ascend immediately', 'Check air', 'Surface'],
    explanation: 'Panicked or fast divers use more air and make mistakes. If your buddy signals this, breathe slowly and acknowledge.',
    accent: 0x224422, gestureFn: gestureSlowDown,
  },
  {
    name: 'Turn the Dive / Go Back',
    description: 'Index finger extended, whole hand\nrotates in a circular motion.\nThen points back the way you came.',
    correct: 'Turn around and head back',
    options: ['Turn around and head back', 'Descend deeper', 'Return OK signal', 'Stop and wait'],
    explanation: 'The dive ends early — current, low air, discomfort, or a problem. Both divers return to the entry point together.',
    accent: 0x003344, gestureFn: gestureTurnDive,
  },
  {
    name: 'Come Here',
    description: 'All fingers curl inward in a\nbeckoning wave motion.\nPalm faces upward toward you.',
    correct: 'Swim toward the signalling diver',
    options: ['Swim toward the signalling diver', 'Stay in position', 'Ascend to 5m', 'Return OK'],
    explanation: 'Your buddy wants you at their location — often to show marine life, check a condition, or signal a developing problem.',
    accent: 0x114422, gestureFn: gestureComeHere,
  },
  {
    name: 'Share Air / Breathe',
    description: 'Index finger points to mouth,\nthen sweeps to point at buddy.\nSignals: offer or request air.',
    correct: 'Offer octopus, confirm both breathe',
    options: ['Offer octopus, confirm both breathe', 'Surface alone immediately', 'Inflate BCD', 'Take buddy\'s primary reg'],
    explanation: 'Share using the octopus (alternate 2nd stage), not the primary. Practice this handoff before every dive trip.',
    accent: 0x003311, gestureFn: gestureShareAir,
  },
  {
    name: "I'm Cold",
    description: 'Hand grabs and rubs the opposite arm.\nA shivering motion.\nSignals discomfort or early hypothermia.',
    correct: 'Signal ascent — end the dive',
    options: ['Signal ascent — end the dive', 'Return OK', 'Continue diving', 'Check their gauge'],
    explanation: 'Cold impairs judgment and coordination. End the dive. Hypothermia progresses faster underwater than on the surface.',
    accent: 0x112244, gestureFn: gestureCold,
  },
  {
    name: 'Danger / Hazard',
    description: 'Fist pounds down like a hammer,\nthen points at the hazard.\nUsed for marine life, current, obstacle.',
    correct: 'Stop and look where buddy is pointing',
    options: ['Stop and look where buddy is pointing', 'Ascend immediately', 'Return OK', 'Inflate BCD'],
    explanation: 'Identify the hazard before reacting. Lionfish, currents, entanglement — the correct response depends on what the danger is.',
    accent: 0x440000, gestureFn: gestureDanger,
  },
  {
    name: 'Which Way?',
    description: 'Index finger pointing, hand tilts\nfrom side to side questioningly.\nUsed when lost or checking direction.',
    correct: 'Point in the correct direction or check compass',
    options: ['Point in the correct direction or check compass', 'Ascend immediately', 'Return OK', 'Signal danger'],
    explanation: 'Check your compass and point the correct direction. If both divers are unsure, ascend to navigate from the surface.',
    accent: 0x334400, gestureFn: gestureWhichWay,
  },
];

// ── Module ──────────────────────────────────────────────────────────────────

export class DiveSignalsModule {
  constructor(scene, xrControllers, onComplete) {
    this.scene         = scene;
    this.xrControllers = xrControllers;
    this.onComplete    = onComplete;
    this.group         = new THREE.Group();
    this.current       = 0;
    this.score         = 0;
    this.panels        = [];
    this._optionMeshes = [];
    this._activeGesture = null;

    scene.add(this.group);
    this._addLighting();
    this._buildChrome();
    this._showSignal(0);
  }

  _addLighting() {
    const key = new THREE.PointLight(0xfff8f0, 5.5, 10);
    key.position.set(0, 2.5, 0.5); this.group.add(key);
    const fill = new THREE.PointLight(0xffffff, 3.5, 10);
    fill.position.set(0, 1.5, 1.2); this.group.add(fill);
    // Dedicated spotlight on gesture area
    const spot = new THREE.PointLight(0xffeedd, 4.0, 4);
    spot.position.set(-1.5, 1.9, -0.5); this.group.add(spot);
    const rimR = new THREE.PointLight(0xaaccff, 2.0, 8);
    rimR.position.set(1.5, 1.8, -0.5); this.group.add(rimR);
  }

  _buildChrome() {
    const back = createPanel('← Menu', {
      position: new THREE.Vector3(-1.9, 1.9, -1.2),
      width: 0.35, fontSize: 18, color: 0x1a1a2e, align: 'center',
    });
    this.group.add(back);
    this.xrControllers.register(back, {
      onSelect: () => this.onComplete(),
      onHoverEnter: () => back.scale.setScalar(1.06),
      onHoverExit:  () => back.scale.setScalar(1.0),
    });
    this._scorePanel = this._makeScorePanel();
    this.group.add(this._scorePanel);
  }

  _makeScorePanel() {
    return createPanel(`Score: ${this.score} / ${SIGNALS.length}`, {
      position: new THREE.Vector3(1.9, 1.9, -1.2),
      width: 0.46, fontSize: 18, color: 0x002233, align: 'center',
    });
  }

  _showSignal(index) {
    this._clearPanels();
    const sig = SIGNALS[index];

    // Progress + title
    this._add(createPanel(`Signal ${index + 1} / ${SIGNALS.length}`, {
      position: new THREE.Vector3(0, 2.35, -1.2),
      width: 0.6, fontSize: 18, color: 0x001122, align: 'center',
    }));
    this._add(createPanel(`"${sig.name}"`, {
      position: new THREE.Vector3(0.2, 2.0, -1.2),
      width: 1.0, fontSize: 28, color: sig.accent, align: 'center',
    }));
    this._add(createPanel(sig.description, {
      position: new THREE.Vector3(0.2, 1.6, -1.2),
      width: 0.95, fontSize: 19, color: 0x001033, align: 'center',
    }));
    this._add(createPanel('How do you respond?', {
      position: new THREE.Vector3(0.2, 1.22, -1.2),
      width: 0.8, fontSize: 20, color: 0x221100, align: 'center',
    }));

    // Gesture icon — left side, lit from front
    this._buildGestureIcon(sig);

    // Options 2x2
    const shuffled = [...sig.options].sort(() => Math.random() - 0.5);
    this._optionMeshes = [];
    shuffled.forEach((opt, i) => {
      const col = i % 2 === 0 ? -0.35 : 0.75;
      const row = i < 2 ? 0.88 : 0.55;
      const btn = createPanel(opt, {
        position: new THREE.Vector3(col, row, -1.2),
        width: 0.88, fontSize: 17, color: 0x111133, align: 'center',
      });
      this._add(btn);
      this._optionMeshes.push(btn);
      this.xrControllers.register(btn, {
        onSelect: () => this._onAnswer(opt, sig),
        onHoverEnter: () => btn.scale.setScalar(1.06),
        onHoverExit:  () => btn.scale.setScalar(1.0),
      });
    });
  }

  _buildGestureIcon(sig) {
    if (this._activeGesture) {
      this.group.remove(this._activeGesture.group);
      this._activeGesture = null;
    }
    if (!sig.gestureFn) return;

    const gesture = sig.gestureFn();

    // Position the gesture icon to the left of text panels
    gesture.group.position.set(-1.52, 1.55, -1.05);

    // Subtle backdrop to frame the gesture
    const backdrop = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.01),
      new THREE.MeshStandardMaterial({
        color: sig.accent,
        roughness: 0.9,
        transparent: true,
        opacity: 0.25,
      })
    );
    backdrop.position.set(-1.52, 1.55, -1.08);
    this.group.add(backdrop);
    this.panels.push(backdrop);

    this.group.add(gesture.group);
    this._activeGesture = gesture;
  }

  _onAnswer(selected, signal) {
    const correct = selected === signal.correct;
    if (correct) this.score++;

    this._optionMeshes.forEach(m => this.xrControllers.unregister(m));

    this._add(createPanel(
      `${correct ? '✓ Correct!' : '✗ Incorrect'}\n\n${signal.explanation}` +
      (!correct ? `\n\nCorrect: ${signal.correct}` : ''),
      {
        position: new THREE.Vector3(0.2, 0.62, -1.2),
        width: 1.22, fontSize: 17,
        color: correct ? 0x003311 : 0x330011, align: 'left',
      }
    ));

    this.group.remove(this._scorePanel);
    this._scorePanel = this._makeScorePanel();
    this.group.add(this._scorePanel);

    const isLast = this.current >= SIGNALS.length - 1;
    const nextBtn = createPanel(isLast ? 'Finish →' : 'Next Signal →', {
      position: new THREE.Vector3(0.2, 0.38, -1.2),
      width: 0.52, fontSize: 20, color: 0x002244, align: 'center',
    });
    this._add(nextBtn);
    this.xrControllers.register(nextBtn, {
      onSelect: () => {
        if (isLast) this._showCompletion();
        else { this.current++; this._showSignal(this.current); }
      },
      onHoverEnter: () => nextBtn.scale.setScalar(1.06),
      onHoverExit:  () => nextBtn.scale.setScalar(1.0),
    });
  }

  _showCompletion() {
    this._clearPanels();
    const pct   = Math.round((this.score / SIGNALS.length) * 100);
    const grade = pct >= 90 ? '🎉 Excellent — dive-ready.' :
                  pct >= 70 ? '👍 Good. Review the missed signals.' :
                              '📖 Signals save lives — keep practising.';
    this._add(createPanel(
      `Training Complete\n\nScore: ${this.score} / ${SIGNALS.length}  (${pct}%)\n\n${grade}`,
      { position: new THREE.Vector3(0, 1.65, -1.2), width: 1.1, fontSize: 24, color: 0x001133, align: 'center' }
    ));
    const back = createPanel('← Back to Menu', {
      position: new THREE.Vector3(0, 1.0, -1.2),
      width: 0.55, fontSize: 20, color: 0x001122, align: 'center',
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
    this._optionMeshes.forEach(m => this.xrControllers.unregister(m));
    this._optionMeshes = [];
    // Unregister all panels (catches nextBtn and any other registered panels)
    this.panels.forEach(p => { this.xrControllers.unregister(p); this.group.remove(p); });
    this.panels = [];
    if (this._activeGesture) {
      this.group.remove(this._activeGesture.group);
      this._activeGesture = null;
    }
  }

  update(delta) {
    const t = Date.now() * 0.001;
    if (this._activeGesture?.animate) {
      this._activeGesture.animate(t);
    }
  }

  dispose() {
    this.xrControllers.clearAll();
    this.scene.remove(this.group);
  }
}
