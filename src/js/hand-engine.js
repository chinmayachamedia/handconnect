// ─────────────────────────────────────────────
//  GLOBALS
// ─────────────────────────────────────────────
const landing    = document.getElementById('landing');
const experience = document.getElementById('experience');
const startBtn   = document.getElementById('startBtn');
const exitBtn    = document.getElementById('exitBtn');

const video     = document.getElementById('video');
const bgCanvas  = document.getElementById('bgCanvas');
const fxCanvas  = document.getElementById('fxCanvas');
const bgCtx     = bgCanvas.getContext('2d');
const fxCtx     = fxCanvas.getContext('2d');
const uiHands   = document.getElementById('ui-hands');
const uiFps     = document.getElementById('ui-fps');
const uiGesture = document.getElementById('ui-gesture');
const uiSpread  = document.getElementById('ui-spread');
const toast     = document.getElementById('toast');

let W = 0, H = 0;
let time = 0, lastT = performance.now();
let fpsFrames = 0, lastFpsT = performance.now();
let currentTheme = 'Rainbow';
let handData = [];
let handVel = 0;
let particles = [], ripples = [];
let audioCtx = null, humOsc = null, humGain = null;
let lastPinch = [false, false];
let toastTimer = null;
let mediaInitialized = false;
let cameraInstance = null;
let loopRunning = false;

// Matrix rain state
const FS = 16;
let cols = [], maxCols = 0;

// Fingertip landmark indices
const TIPS = [4, 8, 12, 16, 20];

// ─────────────────────────────────────────────
//  THEMES  (t=time, i=index, n=total)
// ─────────────────────────────────────────────
const THEMES = {
  Rainbow:  (t, i, n) => `hsl(${(t * 80 + i * (360 / n)) % 360}, 100%, 62%)`,
  Cyberpunk:(t, i, n) => i % 2 === 0 ? '#ff003c' : '#00f0ff',
  Lava:     (t, i, n) => `hsl(${(10 + i * 10) % 45}, 100%, ${52 + Math.sin(t + i) * 10}%)`,
  Ocean:    (t, i, n) => `hsl(${185 + i * 18}, 100%, ${55 + Math.sin(t + i * 0.5) * 8}%)`,
  Galaxy:   (t, i, n) => `hsl(${260 + Math.sin(t * 2 + i) * 45}, 100%, 68%)`
};

// ─────────────────────────────────────────────
//  RESIZE
// ─────────────────────────────────────────────
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  bgCanvas.width  = fxCanvas.width  = W;
  bgCanvas.height = fxCanvas.height = H;
  maxCols = Math.floor(W / FS);
  cols = Array.from({ length: maxCols }, () => Math.random() * H / FS);
}
window.addEventListener('resize', resize);
resize();

// ─────────────────────────────────────────────
//  THEME SWITCHER
// ─────────────────────────────────────────────
document.querySelectorAll('.tbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTheme = btn.dataset.theme;
  });
});

// ─────────────────────────────────────────────
//  START / EXIT
// ─────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  landing.hidden = true;
  experience.hidden = false;

  if (!mediaInitialized) {
    initAudio();
    initMediaPipe();
    mediaInitialized = true;
  }

  if (!loopRunning) {
    loopRunning = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  }
});

exitBtn.addEventListener('click', () => {
  experience.hidden = true;
  landing.hidden = false;
});

// ─────────────────────────────────────────────
//  AUDIO ENGINE
// ─────────────────────────────────────────────
function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    humOsc  = audioCtx.createOscillator();
    humGain = audioCtx.createGain();

    humOsc.type = 'sine';
    humOsc.frequency.value = 80;
    humGain.gain.value = 0;

    humOsc.connect(humGain);
    humGain.connect(audioCtx.destination);
    humOsc.start();
  } catch (e) { console.warn('Audio unavailable', e); }
}

function playZap() {
  if (!audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(900, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.45, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function updateHum(hands) {
  if (!audioCtx || !humGain) return;
  if (hands.length < 2) {
    humGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
    return;
  }
  const p1 = hands[0][8], p2 = hands[1][8];
  const d  = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const proximity = Math.max(0, 1 - d);
  humOsc.frequency.setTargetAtTime(80 + proximity * 350, audioCtx.currentTime, 0.1);
  humGain.gain.setTargetAtTime(proximity * 0.18, audioCtx.currentTime, 0.1);
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function toCanvas(p) { return { x: p.x * W, y: p.y * H }; }

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1200);
}

// ─────────────────────────────────────────────
//  EFFECTS
// ─────────────────────────────────────────────
function spawnParticles(pos, color, n = 4) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 7;
    particles.push({
      x: pos.x, y: pos.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1,
      color,
      r: 1 + Math.random() * 2.5
    });
  }
}

function spawnRipple(pos, color) {
  ripples.push({ x: pos.x, y: pos.y, radius: 0, maxR: 120 + Math.random() * 120, life: 1, color });
}

// ─────────────────────────────────────────────
//  BACKGROUND — Matrix Rain
// ─────────────────────────────────────────────
function drawBackground() {
  bgCtx.globalCompositeOperation = 'destination-out';
  bgCtx.fillStyle = `rgba(0,0,0,${0.12 + Math.min(handVel * 8, 0.45)})`;
  bgCtx.fillRect(0, 0, W, H);
  bgCtx.globalCompositeOperation = 'source-over';

  const speed = 1 + handVel * 80;
  bgCtx.font = `${FS}px monospace`;

  for (let i = 0; i < maxCols; i++) {
    if (Math.random() > 0.94) {
      bgCtx.fillStyle = THEMES[currentTheme](time, i % 5, 5);
      bgCtx.globalAlpha = 0.55 + Math.random() * 0.4;
      const char = String.fromCharCode(0x30A0 + Math.random() * 96);
      bgCtx.fillText(char, i * FS, cols[i] * FS);
    }
    cols[i] += Math.random() * speed;
    if (cols[i] * FS > H && Math.random() > 0.9) cols[i] = 0;
  }

  bgCtx.globalAlpha = 1;
}

// ─────────────────────────────────────────────
//  GESTURE DETECTION
// ─────────────────────────────────────────────
function detectGestures() {
  handData.forEach((hand, idx) => {
    const thumb = hand[4], index = hand[8];
    const d = dist(thumb, index);
    const pinching = d < 0.055;

    if (pinching && !lastPinch[idx]) {
      const mid = { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
      const cp  = toCanvas(mid);
      spawnRipple(cp, THEMES[currentTheme](time, 1, 1));
      spawnParticles(cp, THEMES[currentTheme](time, 2, 5), 10);
      playZap();
      showToast('⚡ Pinch');
      uiGesture.textContent = 'Pinch';
    }
    lastPinch[idx] = pinching;
  });

  if (handData[0]) {
    const sp = dist(handData[0][8], handData[0][20]);
    const pct = Math.min(Math.round(sp * 320), 100);
    uiSpread.textContent = pct + '%';
    if (!lastPinch.includes(true)) {
      uiGesture.textContent = pct > 48 ? 'Open hand' : 'Fist';
    }
  }
}

// ─────────────────────────────────────────────
//  MAIN RENDER
// ─────────────────────────────────────────────
function drawEffects() {
  fxCtx.globalCompositeOperation = 'destination-out';
  fxCtx.fillStyle = 'rgba(0,0,0,0.18)';
  fxCtx.fillRect(0, 0, W, H);

  fxCtx.globalCompositeOperation = 'screen';

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx; p.y  += p.vy;
    p.vy += 0.12;
    p.life -= 0.022;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    fxCtx.beginPath();
    fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    fxCtx.fillStyle = p.color;
    fxCtx.globalAlpha = p.life;
    fxCtx.fill();
  }

  // Ripples / Shockwaves
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.radius += (r.maxR - r.radius) * 0.09;
    r.life   -= 0.028;
    if (r.life <= 0) { ripples.splice(i, 1); continue; }
    fxCtx.beginPath();
    fxCtx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    fxCtx.strokeStyle = r.color;
    fxCtx.lineWidth = 5 * r.life;
    fxCtx.globalAlpha = r.life;
    fxCtx.stroke();
  }

  fxCtx.globalAlpha = 1;

  // Hands
  if (handData.length > 0) {
    handData.forEach((hand, hi) => {
      const gc = THEMES[currentTheme](time, hi, 2);

      drawConnectors(fxCtx, hand, HAND_CONNECTIONS, { color: gc, lineWidth: 2 });

      fxCtx.shadowBlur = 18;
      fxCtx.shadowColor = gc;

      hand.forEach((lm, li) => {
        const pt = toCanvas(lm);
        fxCtx.beginPath();
        fxCtx.arc(pt.x, pt.y, TIPS.includes(li) ? 5 : 2.5, 0, Math.PI * 2);
        fxCtx.fillStyle = TIPS.includes(li) ? '#ffffff' : gc;
        fxCtx.globalAlpha = 1;
        fxCtx.fill();
      });

      TIPS.forEach((ti, si) => {
        const pt = toCanvas(hand[ti]);
        const col = THEMES[currentTheme](time, si, TIPS.length);
        if (Math.random() > 0.55) spawnParticles(pt, col, 1);
      });

      fxCtx.shadowBlur = 0;
    });

    // Two-hand interactions
    if (handData.length >= 2) {
      const h1 = handData[0], h2 = handData[1];

      TIPS.forEach((ti, si) => {
        const p1  = toCanvas(h1[ti]);
        const p2  = toCanvas(h2[ti]);
        const d   = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const col = THEMES[currentTheme](time, si, TIPS.length);

        const grad = fxCtx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0,   THEMES[currentTheme](time, si,     5));
        grad.addColorStop(0.5, THEMES[currentTheme](time, si + 1, 5));
        grad.addColorStop(1,   THEMES[currentTheme](time, si + 2, 5));
        fxCtx.beginPath();
        fxCtx.moveTo(p1.x, p1.y);
        fxCtx.lineTo(p2.x, p2.y);
        fxCtx.strokeStyle = grad;
        fxCtx.lineWidth   = 3;
        fxCtx.shadowBlur  = 12;
        fxCtx.shadowColor = col;
        fxCtx.globalAlpha = 1;
        fxCtx.stroke();

        if (d < 160 && Math.random() > 0.45) {
          const mx = (p1.x + p2.x) / 2 + (Math.random() - 0.5) * 55;
          const my = (p1.y + p2.y) / 2 + (Math.random() - 0.5) * 55;
          fxCtx.beginPath();
          fxCtx.moveTo(p1.x, p1.y);
          fxCtx.lineTo(mx, my);
          fxCtx.lineTo(p2.x, p2.y);
          fxCtx.strokeStyle = '#ffffff';
          fxCtx.shadowBlur  = 22;
          fxCtx.shadowColor = col;
          fxCtx.lineWidth   = 2.5;
          fxCtx.globalAlpha = 0.8 * Math.random();
          fxCtx.stroke();
        }

        fxCtx.shadowBlur = 0;
        fxCtx.globalAlpha = 1;
      });

      // Mandala — rotating star from all 10 fingertips
      const allTips = TIPS.map(t => toCanvas(h1[t])).concat(TIPS.map(t => toCanvas(h2[t])));
      const cx = allTips.reduce((s, p) => s + p.x, 0) / 10;
      const cy = allTips.reduce((s, p) => s + p.y, 0) / 10;

      fxCtx.save();
      fxCtx.translate(cx, cy);
      fxCtx.rotate(time * 0.45);
      fxCtx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = { x: allTips[i].x - cx, y: allTips[i].y - cy };
        const b = { x: allTips[(i + 3) % 10].x - cx, y: allTips[(i + 3) % 10].y - cy };
        fxCtx.moveTo(a.x, a.y);
        fxCtx.lineTo(b.x, b.y);
      }
      fxCtx.strokeStyle = 'rgba(255,255,255,0.18)';
      fxCtx.lineWidth   = 1.2;
      fxCtx.globalAlpha = 1;
      fxCtx.stroke();
      fxCtx.restore();
    }

    detectGestures();
  }

  fxCtx.globalCompositeOperation = 'source-over';
}

// ─────────────────────────────────────────────
//  MAIN LOOP
// ─────────────────────────────────────────────
function loop(now) {
  if (experience.hidden) { loopRunning = false; return; }
  requestAnimationFrame(loop);

  const dt = (now - lastT) / 1000;
  lastT = now;
  time += dt;

  fpsFrames++;
  if (now - lastFpsT >= 1000) {
    uiFps.textContent = fpsFrames;
    fpsFrames = 0;
    lastFpsT  = now;
  }

  drawBackground();
  drawEffects();
}

// ─────────────────────────────────────────────
//  MEDIAPIPE
// ─────────────────────────────────────────────
function initMediaPipe() {
  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.72,
    minTrackingConfidence: 0.72
  });

  hands.onResults(results => {
    const lms = results.multiHandLandmarks || [];
    uiHands.textContent = lms.length;

    if (handData.length > 0 && lms.length > 0) {
      handVel = dist(handData[0][8], lms[0][8]);
    } else {
      handVel = 0;
    }

    handData = lms;
    updateHum(handData);
  });

  cameraInstance = new Camera(video, {
    onFrame: async () => { await hands.send({ image: video }); },
    width: 1280,
    height: 720,
    facingMode: 'user'
  });

  cameraInstance.start();
}
