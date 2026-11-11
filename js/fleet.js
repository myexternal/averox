// Fleet turntable: the sedan and van are real meshes made from photos (Higgsfield, Tripo image-to-3D).
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from '../vendor/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from '../vendor/jsm/libs/meshopt_decoder.module.js';

export async function initFleet({ canvas, section, hint, initial = 'sedan' }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 760px), (pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 2 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(26, 2, 0.05, 50);
  const key = new THREE.DirectionalLight(0xffb15a, 2.4); key.position.set(-2.5, 2.2, 2.0); scene.add(key);   // sodium street light
  const rim = new THREE.DirectionalLight(0xa9c4ff, 1.6); rim.position.set(2.5, 1.4, -2.6); scene.add(rim);   // cold sky behind
  scene.add(new THREE.HemisphereLight(0x8090a0, 0x050505, 0.35));

  // soft contact shadow under the car
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const g = sc.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.85)'); grd.addColorStop(0.55, 'rgba(0,0,0,.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.72), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001;
  const turn = new THREE.Group(); scene.add(turn); turn.add(shadow);

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const cars = {}; const loading = {};
  function load(name) {
    if (loading[name]) return loading[name];
    loading[name] = loader.loadAsync(`media/${name}${small ? '-m' : ''}.glb`).then((gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
      const s = (name === 'van' ? 0.9 : 1) / Math.max(size.x, size.z); // longest side → 1 unit (van a touch smaller so it clears the copy)
      obj.position.set(-c.x * s, -box.min.y * s, -c.z * s);
      obj.scale.setScalar(s);
      const holder = new THREE.Group(); holder.add(obj);
      obj.traverse((m) => {
        if (!m.isMesh) return;
        m.material.transparent = true; m.material.opacity = 1;
        if (m.material.map) m.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      });
      holder.userData = { fade: 0, target: 0, mats: [] };
      obj.traverse((m) => { if (m.isMesh) holder.userData.mats.push(m.material); });
      holder.visible = false;
      turn.add(holder);
      cars[name] = holder;
      return holder;
    });
    return loading[name];
  }

  let current = initial;
  function setFade(h, v) {
    h.userData.fade = v;
    h.visible = v > 0.002;
    h.userData.mats.forEach((m) => { m.opacity = v; m.depthWrite = v > 0.95; });
    const s = 0.94 + 0.06 * v; h.scale.setScalar(s);
  }
  async function show(name) {
    current = name;
    const h = await load(name);
    if (current !== name) return;
    Object.entries(cars).forEach(([k, c]) => { c.userData.target = k === name ? 1 : 0; });
    if (reduced.matches) Object.values(cars).forEach((c) => setFade(c, c.userData.target));
    wake();
  }

  // ── framing
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = camera.aspect < 1 ? 2.9 : camera.aspect < 1.5 ? 2.3 : 1.95;
    camera.position.set(0, dist * 0.22, dist);
    camera.lookAt(0, camera.aspect > 1.4 ? 0.24 : 0.12, 0);
    camera.updateProjectionMatrix();
    wake();
  }
  new ResizeObserver(resize).observe(canvas);

  // ── rotation: auto turn + drag with momentum (velocity handoff, exponential decay)
  let angle = -0.65, vel = 0, dragging = false, lastX = 0, lastT = 0, samples = [];
  const AUTO = 0.16; // rad/s
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-drag');
    lastX = e.clientX; lastT = performance.now(); samples = []; vel = 0;
    hint && hint.classList.add('is-gone');
    wake();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now(); const dx = e.clientX - lastX;
    const k = 4.2 / Math.max(canvas.clientWidth, 1);            // a full drag across ≈ 240°
    angle += dx * k;
    samples.push({ v: (dx * k) / Math.max(now - lastT, 1) * 1000, t: now });
    samples = samples.filter((s) => now - s.t < 90);
    lastX = e.clientX; lastT = now;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; canvas.classList.remove('is-drag');
    vel = samples.length ? samples.reduce((a, s) => a + s.v, 0) / samples.length : 0;
    vel = Math.max(-9, Math.min(9, vel));
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);

  // scroll adds a little turn as the section passes
  let scrollTurn = 0;
  const onScroll = () => {
    const r = section.getBoundingClientRect();
    const p = (innerHeight - r.top) / (innerHeight + r.height);
    scrollTurn = reduced.matches ? 0 : (Math.max(0, Math.min(1, p)) - 0.5) * 1.1;
    wake();
  };
  addEventListener('scroll', onScroll, { passive: true });

  // ── loop (only while visible)
  let visible = false, running = false, last = performance.now();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { rootMargin: '100px 0px' }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  function wake() { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(tick); } }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let busy = dragging;
    if (!dragging) {
      if (Math.abs(vel) > 0.01) { angle += vel * dt; vel *= Math.pow(0.04, dt); busy = true; }   // momentum decays
      else if (!reduced.matches) { angle += AUTO * dt; busy = true; }
    }
    turn.rotation.y = angle + scrollTurn;
    Object.values(cars).forEach((c) => {
      const d = c.userData.target - c.userData.fade;
      if (Math.abs(d) > 0.002) { setFade(c, c.userData.fade + d * (1 - Math.pow(0.0005, dt))); busy = true; }
      else if (c.userData.fade !== c.userData.target) setFade(c, c.userData.target);
    });
    renderer.render(scene, camera);
    if (busy && visible && !document.hidden) requestAnimationFrame(tick); else running = false;
  }

  resize(); onScroll();
  await show(initial);
  section.classList.add('has-3d');
  // prefetch the other vehicle when the browser is idle
  setTimeout(() => load(initial === 'sedan' ? 'van' : 'sedan'), 1500);
  return { show };
}
