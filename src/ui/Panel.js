// src/ui/Panel.js
import * as THREE from 'three';

/**
 * Creates a floating in-world panel with rendered text using Canvas API.
 * Returns a THREE.Mesh (PlaneGeometry + CanvasTexture).
 *
 * @param {string} text - Text content, supports \n for newlines
 * @param {object} options
 * @param {THREE.Vector3} options.position
 * @param {number} options.width - World units width
 * @param {number} options.color - Background hex color
 * @param {number} options.fontSize - Canvas font size (pixels)
 * @param {string} options.align - 'left' | 'center'
 * @param {boolean} options.billboard - Always face camera (set manually if needed)
 */
export function createPanel(text, options = {}) {
  const {
    position = new THREE.Vector3(0, 0, 0),
    width = 0.8,
    color = 0x001133,
    fontSize = 24,
    align = 'center',
    padding = 18,
  } = options;

  const CANVAS_WIDTH = 512;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // -- Measure and wrap text --
  ctx.font = `${fontSize}px Arial, sans-serif`;
  const maxLineWidth = CANVAS_WIDTH - padding * 2;
  const wrappedLines = [];

  for (const rawLine of text.split('\n')) {
    if (!rawLine.trim()) {
      wrappedLines.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxLineWidth && current) {
        wrappedLines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) wrappedLines.push(current);
  }

  const lineHeight = Math.round(fontSize * 1.4);
  const canvasHeight = wrappedLines.length * lineHeight + padding * 2;

  canvas.width = CANVAS_WIDTH;
  canvas.height = canvasHeight;

  // -- Draw background --
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.92)`;
  drawRoundedRect(ctx, 0, 0, CANVAS_WIDTH, canvasHeight, 14);
  ctx.fill();

  // Subtle inner glow border
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top accent line
  ctx.fillStyle = 'rgba(80, 160, 255, 0.4)';
  ctx.fillRect(14, 0, CANVAS_WIDTH - 28, 2);

  // -- Draw text --
  ctx.fillStyle = '#e8f4ff';
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align === 'center' ? 'center' : 'left';

  const textX = align === 'center' ? CANVAS_WIDTH / 2 : padding;

  wrappedLines.forEach((line, i) => {
    ctx.fillText(line, textX, padding + i * lineHeight);
  });

  // -- Create Three.js mesh --
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const aspect = CANVAS_WIDTH / canvasHeight;
  const meshHeight = width / aspect;

  const geo = new THREE.PlaneGeometry(width, meshHeight);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    alphaTest: 0.01,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.userData.isPanel = true;

  return mesh;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
