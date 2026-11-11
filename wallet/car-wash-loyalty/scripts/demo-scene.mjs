import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* The loyalty card floats in 3D inside a soft car-wash mist. A water drop falls onto the next empty
   slot; on impact the slot fills with a car stamp, a ring of spray bursts out and the card dips and
   recovers. Soap bubbles drift up around it. When the ninth stamp lands the free-wash slot sparkles,
   and after a pause the card spins once and starts again. The +1 button drops a stamp straight away,
   and the card leans toward the pointer. */
const canvas = document.getElementById('scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
const BG = '#0A0A0B', CARD = '#141416', ORANGE = '#FF5500', LABEL = '#FF7A33';
const logoImg = new Image(); logoImg.src = document.querySelector('.brand img').src;

let renderer;
try {
  if (reduced) throw new Error('reduced motion');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }

if (renderer) {
  document.documentElement.classList.add('gl-on');
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.75 : 2));
  // Phones: plain materials, no bloom pass, fewer bubbles. Desktop gets the full look.
  const Mat = LOW ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  renderer.toneMapping = THREE.NoToneMapping; // keeps the background exactly the page blue
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(scene.background, 9, 18);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0.1, 11.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x221005, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.PointLight(0xff5500, 40, 20); rim.position.set(-4, 2, -3); scene.add(rim);

  // ---------- the card face, drawn on a 2D canvas so it matches the real pass ----------
  const W = 340, H = 460, K = LOW ? 2.4 : 3.2; // pass points, texture scale
  const face = document.createElement('canvas');
  face.width = Math.round(W * K); face.height = Math.round(H * K);
  const g = face.getContext('2d');
  const qr = document.createElement('canvas'); qr.width = qr.height = 420;
  if (window.drawQR) window.drawQR(qr, 4, 420);
  const SX = W / 375, STRIP_Y = 62;
  const slot = (i, rtl) => { // stamp slot centre in pass points
    const row = Math.floor(i / 5); let col = i % 5; if (rtl) col = 4 - col;
    return { x: (47.5 + col * 70) * SX, y: STRIP_Y + (35.5 + row * 52) * SX, r: 22 * SX };
  };
  const carPath = new Path2D('M-7.5 -4.5 L-5.5 -10 Q-5 -11.2 -3.6 -11.2 L3.6 -11.2 Q5 -11.2 5.5 -10 L7.5 -4.5 M-11 -1.5 Q-11 -4.5 -8 -4.5 L8 -4.5 Q11 -4.5 11 -1.5 L11 1 Q11 4 8 4 L-8 4 Q-11 4 -11 1 Z M-7.5 4 V7.5 M7.5 4 V7.5');
  const drop = new Path2D('M28 6 C28 6 10 26 10 40 A18 18 0 0 0 46 40 C46 26 28 6 28 6 Z');
  const spark = (x, y, r) => {
    const k = r * 0.28; g.beginPath();
    g.moveTo(x, y - r); g.quadraticCurveTo(x + k, y - k, x + r, y); g.quadraticCurveTo(x + k, y + k, x, y + r);
    g.quadraticCurveTo(x - k, y + k, x - r, y); g.quadraticCurveTo(x - k, y - k, x, y - r); g.fill();
  };
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Tahoma, sans-serif';

  let state = { lang: 'en', stamps: 4, name: 'SALIM', L: {} };
  let shown = 4; // stamps drawn on the card (lags the real count while a drop is falling)
  let sparkle = 0;

  function drawFace() {
    const L = state.L, rtl = state.lang === 'ar';
    g.setTransform(K, 0, 0, K, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = CARD; rr(0, 0, W, H, 16); g.fill();
    g.direction = rtl ? 'rtl' : 'ltr';
    const S = rtl ? (x) => W - x : (x) => x;           // mirror x for Arabic
    const A = (a) => (rtl ? (a === 'left' ? 'right' : a === 'right' ? 'left' : a) : a);
    // logo
    if (logoImg.complete && logoImg.naturalWidth) g.drawImage(logoImg, rtl ? W - 14 - 150 : 14, 20, 150, 150 * 444 / 2340);
    g.textBaseline = 'alphabetic';
    g.textAlign = A('right'); g.fillStyle = LABEL; g.font = `600 10px ${FONT}`;
    g.fillText((L.stamps || 'Stamps').toUpperCase(), S(W - 14), 24);
    g.fillStyle = '#fff'; g.font = `500 22px ${FONT}`; g.fillText(`${shown}/10`, S(W - 14), 49);
    // strip
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.strokeStyle = 'rgba(255,85,0,0.35)'; g.lineWidth = 1; rr(16 * SX, STRIP_Y + 6 * SX, W - 32 * SX, 111 * SX, 16 * SX); g.fill(); g.stroke();
    for (let i = 0; i < 10; i++) {
      const p = slot(i, rtl);
      g.save(); g.translate(p.x, p.y);
      if (i < shown) {
        g.fillStyle = ORANGE; g.beginPath(); g.arc(0, 0, p.r, 0, Math.PI * 2); g.fill();
        g.translate(0, 1.5 * SX); g.scale(0.95 * SX, 0.95 * SX); g.strokeStyle = '#fff'; g.lineWidth = 2.6; g.lineCap = g.lineJoin = 'round'; g.stroke(carPath);
      } else if (i === 9 && shown >= 9) {
        g.fillStyle = `rgba(255,85,0,${0.15 + 0.25 * sparkle})`; g.strokeStyle = ORANGE; g.lineWidth = 2.4;
        g.beginPath(); g.arc(0, 0, p.r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = ORANGE; g.rotate(sparkle * 0.6); spark(0, 0, 11 * SX * (1 + 0.15 * sparkle));
      } else {
        g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.setLineDash([5, 4.2]);
        g.beginPath(); g.arc(0, 0, p.r - 1, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.translate(0, 1.5 * SX); g.scale(0.8 * SX, 0.8 * SX); g.globalAlpha = 0.4; g.strokeStyle = '#fff'; g.lineWidth = 2.6; g.stroke(carPath);
      }
      g.restore();
    }
    // fields
    const left = Math.max(0, 9 - shown);
    const prog = state.lang === 'ar'
      ? (left === 0 ? 'غسلتك المجانية جاهزة!' : left === 1 ? 'باقي غسلة واحدة على الغسلة المجانية' : `باقي ${left} غسلات على الغسلة المجانية`)
      : (left === 0 ? 'Your free wash is ready!' : left === 1 ? '1 more wash until your free one' : `${left} more washes until your free one`);
    g.textAlign = A('left');
    g.fillStyle = LABEL; g.font = `600 10px ${FONT}`; g.fillText(rtl ? L.rule : (L.rule || '').toUpperCase(), S(14), 196);
    g.fillStyle = '#fff'; g.font = `400 15px ${FONT}`; g.fillText(prog, S(14), 215);
    g.fillStyle = LABEL; g.font = `600 10px ${FONT}`; g.fillText(rtl ? L.cust : (L.cust || '').toUpperCase(), S(14), 244);
    g.fillStyle = '#fff'; g.font = `400 15px ${FONT}`; g.fillText(state.name, S(14), 263);
    g.textAlign = A('right');
    g.fillStyle = LABEL; g.font = `600 10px ${FONT}`; g.fillText(rtl ? L.mid : (L.mid || '').toUpperCase(), S(W - 14), 244);
    g.fillStyle = '#fff'; g.font = `400 15px ${FONT}`; g.direction = 'ltr'; g.textAlign = rtl ? 'left' : 'right';
    g.fillText('RP-04821', rtl ? 14 : W - 14, 263); g.direction = rtl ? 'rtl' : 'ltr';
    // QR
    g.fillStyle = '#fff'; rr(W / 2 - 68, 286, 136, 136, 10); g.fill();
    g.drawImage(qr, W / 2 - 60, 294, 120, 120);
    g.textAlign = 'center'; g.font = `400 12px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(L.alt || '', W / 2, 442);
    tex.needsUpdate = true;
  }

  const tex = new THREE.CanvasTexture(face);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // card body + face
  const CW = 3.4, CH = CW * H / W, CD = 0.07;
  const card = new THREE.Group(); scene.add(card);
  const body = new THREE.Mesh(new RoundedBoxGeometry(CW, CH, CD, 4, 0.16),
    new Mat({ color: 0x161618, roughness: 0.4, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 0.5 }));
  card.add(body);
  // Face shows the pass colours exactly; a thin glossy layer on top catches the light.
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, fog: false });
  const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), faceMat);
  faceMesh.position.z = CD / 2 + 0.002; card.add(faceMesh);
  const gloss = new THREE.Mesh(new RoundedBoxGeometry(CW, CH, 0.001, 2, 0.15), new Mat({ color: 0x000000, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.18, envMapIntensity: 1.2, depthWrite: false }));
  gloss.position.z = CD / 2 + 0.006; card.add(gloss);
  // back of the card: plain blue with a faint droplet
  const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new Mat({ color: 0x111112, roughness: 0.4, clearcoat: 1 }));
  backMesh.rotation.y = Math.PI; backMesh.position.z = -CD / 2 - 0.002; card.add(backMesh);
  // soft shadow under the card
  const sh = document.createElement('canvas'); sh.width = sh.height = 128;
  const sg = sh.getContext('2d'); const grd = sg.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,85,0,0.35)'); grd.addColorStop(1, 'rgba(255,85,0,0)'); sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -CH / 2 - 0.75; scene.add(shadow);

  const slotLocal = (i) => { // slot centre in card-local units
    const p = slot(i, state.lang === 'ar');
    return new THREE.Vector3((p.x / W - 0.5) * CW, (0.5 - p.y / H) * CH, CD / 2);
  };

  // ---------- water drop ----------
  const prof = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, a = t * Math.PI; prof.push(new THREE.Vector2(Math.sin(a) * 0.17 * Math.pow(t, 0.6), -Math.cos(a) * 0.2 + 0.14 * Math.pow(1 - t, 3))); }
  const dropMat = new Mat({ color: 0xcfe0ff, roughness: 0.02, metalness: 0, transmission: LOW ? 0 : 0.9, thickness: 0.3, ior: 1.33, clearcoat: 1, transparent: true, opacity: LOW ? 0.85 : 1, emissive: 0xff5500, emissiveIntensity: 0.12, envMapIntensity: 0.8 });
  const dropMesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), dropMat);
  dropMesh.visible = false; scene.add(dropMesh);

  // splash ring + spray particles
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), ringMat); ring.scale.setScalar(0.001); card.add(ring);
  const NP = LOW ? 40 : 90;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const r = x.createRadialGradient(32, 32, 0, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(200,220,255,.8)'); r.addColorStop(1, 'rgba(200,220,255,0)');
    x.fillStyle = r; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pMat = new THREE.PointsMaterial({ size: 0.09, map: dotTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const spray = new THREE.Points(pGeo, pMat); card.add(spray);

  // ---------- soap bubbles ----------
  const NB = LOW ? 9 : 30;
  const bubMat = LOW
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.14, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 0.6, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 800], clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, LOW ? 16 : 28, LOW ? 12 : 20), bubMat, NB);
  const bub = Array.from({ length: NB }, (_, i) => ({
    x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 9, z: -2.5 + Math.random() * 4.2,
    r: 0.07 + Math.random() * 0.22, s: 0.25 + Math.random() * 0.45, ph: Math.random() * 6.28,
  }));
  scene.add(bubbles);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();

  // ---------- post ----------
  const composer = LOW ? null : new EffectComposer(renderer);
  if (composer) {
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.5, 0.97);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  }

  // ---------- state & timeline ----------
  const anim = { drop: null, splash: -1, dip: 0, spin: -1 };
  function startDrop() {
    const target = slotLocal(shown);
    anim.drop = { t: 0, index: shown, target };
    dropMesh.visible = true;
  }
  addEventListener('cardstate', (e) => {
    const prevLang = state.lang;
    state = e.detail;
    if (state.stamps < shown && anim.spin < 0) anim.spin = 0;
    if (prevLang !== state.lang || !anim.drop) drawFace();
  });
  if (window.cardState) window.cardState();

  // pointer lean
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return; // don't jolt the card while the page scrolls
    const r = canvas.getBoundingClientRect();
    lean.tx = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1.2, 1.2);
    lean.ty = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1.2, 1.2);
  }, { passive: true });

  // auto demo: keeps stamping while nobody is pressing the buttons
  let nextAuto = 2.2, holdUntil = 0;
  const clock = new THREE.Clock();
  let time = 0, running = true, visible = true, lastSpark = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 11.6 : 11.5;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; clock.getDelta(); });

  const easeIn = (t) => t * t * t, easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function tick() {
    requestAnimationFrame(tick);
    if (!running || !visible) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05); time += dt;

    // auto-demo
    const idle = !window.__userAt || Date.now() - window.__userAt > 7000;
    if (idle && !anim.drop && anim.spin < 0 && time > nextAuto) {
      if (state.stamps < 9) { window.cardStamp && window.cardStamp(); nextAuto = time + 2.6; }
      else if (!holdUntil) holdUntil = time + 3.5;
      else if (time > holdUntil) { holdUntil = 0; window.cardReset && window.cardReset(); nextAuto = time + 2.5; }
    }
    if (!anim.drop && anim.spin < 0 && state.stamps > shown) startDrop();

    // drop falling
    if (anim.drop) {
      const d = anim.drop; d.t += dt / 0.85;
      const end = card.localToWorld(d.target.clone());
      const k = easeIn(Math.min(d.t, 1));
      dropMesh.position.set(end.x + 0.3 * (1 - k), end.y + 4.2 * (1 - k), end.z + 1.4 * (1 - k));
      const st = 1 + 0.35 * k; dropMesh.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
      dropMesh.rotation.z = 0.15 * (1 - k);
      if (d.t >= 1) {
        dropMesh.visible = false; anim.drop = null;
        shown = Math.min(shown + 1, 9); drawFace();
        anim.splash = 0; anim.dip = 1;
        ring.position.copy(d.target).setZ(CD / 2 + 0.01);
        for (let i = 0; i < NP; i++) {
          const a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.8;
          pPos.set([d.target.x, d.target.y, CD / 2 + 0.02], i * 3);
          pVel.set([Math.cos(a) * sp, Math.sin(a) * sp, 0.6 + Math.random() * 1.8], i * 3);
        }
        pGeo.attributes.position.needsUpdate = true;
      }
    }
    // splash
    if (anim.splash >= 0) {
      anim.splash += dt / 0.8;
      const s = anim.splash, r0 = 0.26;
      ring.scale.setScalar(r0 * (0.9 + 1.6 * easeOut(Math.min(s, 1))));
      ringMat.opacity = 0.9 * Math.max(0, 1 - s);
      pMat.opacity = Math.max(0, 1 - s * 1.1);
      for (let i = 0; i < NP; i++) {
        pVel[i * 3 + 1] -= 4.5 * dt; // gravity (card-local y is roughly world up)
        pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      }
      pGeo.attributes.position.needsUpdate = true;
      if (s >= 1.2) anim.splash = -1;
    }
    anim.dip = Math.max(0, anim.dip - dt * 2.2);
    // free-wash sparkle pulse
    if (shown >= 9 && time - lastSpark > (LOW ? 0.2 : 0.08)) { lastSpark = time; sparkle = 0.5 + 0.5 * Math.sin(time * 4); drawFace(); }
    // reset spin
    let spinY = 0;
    if (anim.spin >= 0) {
      anim.spin += dt / 1.3;
      const s = Math.min(anim.spin, 1);
      spinY = easeOut(s) * Math.PI * 2;
      if (s > 0.25 && shown !== state.stamps) { shown = state.stamps; sparkle = 0; drawFace(); }
      if (s >= 1) anim.spin = -1;
    }

    // card float + lean
    lean.x += (lean.tx - lean.x) * 0.06; lean.y += (lean.ty - lean.y) * 0.06;
    const bob = Math.sin(time * 1.1) * 0.12;
    card.position.set(0, 0.15 + bob, -anim.dip * 0.25 * Math.sin(anim.dip * Math.PI));
    card.rotation.set(-0.08 + lean.y * 0.18 + Math.sin(time * 0.7) * 0.04 - anim.dip * 0.08 * Math.sin(anim.dip * Math.PI),
      -0.22 + lean.x * 0.32 + Math.sin(time * 0.5) * 0.08 + spinY, Math.sin(time * 0.6) * 0.025);
    shadow.scale.setScalar(1 - bob * 0.6); shadow.material.opacity = 0.8 - bob;

    // bubbles drift up and wobble
    for (let i = 0; i < NB; i++) {
      const b = bub[i];
      b.y += b.s * dt; if (b.y > 5) { b.y = -5; b.x = (Math.random() - 0.5) * 8; }
      v3.set(b.x + Math.sin(time * 0.8 + b.ph) * 0.25, b.y, b.z);
      const w = 1 + 0.06 * Math.sin(time * 3 + b.ph);
      sc.set(b.r * w, b.r / w, b.r * w);
      m4.compose(v3, q, sc); bubbles.setMatrixAt(i, m4);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    rim.position.x = -4 + Math.sin(time * 0.4) * 1.5;

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  drawFace();
  if (!logoImg.complete) logoImg.onload = () => drawFace();
  tick();
}
