import * as THREE from "three";
import { generateFingerprint } from "./fingerprint.js";

let scene, camera, renderer;
let particlesGeometry, particlesMaterial, particlesMesh;
let time = 0;
let warpSpeed = 0;
let targetWarpSpeed = 0;
let cameraShake = 0;
let mouseX = 0;
let mouseY = 0;

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = 300;

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("bg-canvas"),
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x030308, 1);

  createParticleField();

  window.addEventListener("resize", onResize);
  document.addEventListener("mousemove", onMouseMove);
  animate();
}

function createParticleField() {
  const count = 3000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  const offsets = new Float32Array(count);
  const colorMix = new Float32Array(count);

  const spread = 600;
  const depth = 500;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * depth;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

    sizes[i] = Math.random() * 5.0 + 1.5;
    speeds[i] = Math.random() * 0.5 + 0.2;
    offsets[i] = Math.random() * Math.PI * 2;
    colorMix[i] = Math.random();
  }

  particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  particlesGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  particlesGeometry.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 1));
  particlesGeometry.setAttribute("aColorMix", new THREE.BufferAttribute(colorMix, 1));

  particlesMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aSpeed;
      attribute float aOffset;
      attribute float aColorMix;
      varying float vAlpha;
      varying float vColorMix;
      uniform float uTime;
      uniform float uWarp;
      uniform float uPixelRatio;

      void main() {
        vColorMix = aColorMix;

        vec3 pos = position;

        float rise = mod(pos.y + uTime * (8.0 + aSpeed * 12.0) + aOffset * 100.0 + uWarp * 40.0, 600.0) - 300.0;
        pos.y = rise;

        pos.x += sin(uTime * 0.3 * aSpeed + aOffset) * (15.0 + aSpeed * 20.0);
        pos.z += cos(uTime * 0.2 * aSpeed + aOffset * 1.5) * 10.0;

        float pulse = sin(uTime * (0.5 + aSpeed) + aOffset) * 0.2 + 0.8;
        float depthFade = smoothstep(350.0, 30.0, abs(pos.z));
        vAlpha = pulse * depthFade * (0.4 + aSize * 0.08);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float warpScale = 1.0 + uWarp * 0.3;
        gl_PointSize = aSize * (150.0 / -mvPosition.z) * uPixelRatio * warpScale;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying float vColorMix;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        float soft = 1.0 - smoothstep(0.0, 0.5, dist);
        float core = 1.0 - smoothstep(0.0, 0.15, dist);
        float intensity = core * 0.6 + soft * 0.5;

        vec3 deepBlue = vec3(0.3, 0.4, 0.75);
        vec3 paleViolet = vec3(0.6, 0.5, 0.85);
        vec3 softWhite = vec3(0.8, 0.82, 0.95);
        vec3 color = mix(deepBlue, mix(paleViolet, softWhite, vColorMix * 0.6), vColorMix);

        gl_FragColor = vec4(color, intensity * vAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particlesMesh);
}

function triggerWarp() {
  targetWarpSpeed = 10;

  setTimeout(() => {
    targetWarpSpeed = 0;
  }, 2500);
}

function triggerShake() {
  cameraShake = 1;
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (particlesMaterial) {
    particlesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  warpSpeed += (targetWarpSpeed - warpSpeed) * 0.04;

  if (particlesMaterial) {
    particlesMaterial.uniforms.uTime.value = time;
    particlesMaterial.uniforms.uWarp.value = warpSpeed;
  }

  const targetX = mouseX * 15;
  const targetY = -mouseY * 10;
  camera.position.x += (targetX - camera.position.x) * 0.02;
  camera.position.y += (targetY - camera.position.y) * 0.02;

  camera.position.y += Math.sin(time * 0.15) * 0.3;
  camera.position.x += Math.cos(time * 0.1) * 0.2;

  if (cameraShake > 0.01) {
    camera.position.x += Math.sin(time * 40) * cameraShake * 0.15;
    camera.position.y += Math.cos(time * 35) * cameraShake * 0.15;
    cameraShake *= 0.94;
  }

  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

const counterEl = document.getElementById("counter-value");
const postCounterEl = document.getElementById("post-counter-value");
const preShift = document.getElementById("pre-shift");
const postShift = document.getElementById("post-shift");
const shiftBtn = document.getElementById("shift-btn");
const shareBtn = document.getElementById("share-btn");
const flashOverlay = document.getElementById("flash-overlay");

const ceremony1 = document.getElementById("ceremony-step-1");
const ceremony2 = document.getElementById("ceremony-step-2");
const ceremony3 = document.getElementById("ceremony-step-3");
const ceremony4 = document.getElementById("ceremony-step-4");
const badgeNumber = document.getElementById("badge-number");
const finalNumber = document.getElementById("final-number");

let currentCount = 0;
let myNumber = null;
let deviceFingerprint = null;

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

function updateCounterDisplays(value) {
  const formatted = formatNumber(value);
  counterEl.textContent = formatted;
  if (postCounterEl) postCounterEl.textContent = formatted;
}

function animateCounter(target) {
  const start = currentCount;
  const diff = target - start;
  if (diff === 0 && start === 0) {
    updateCounterDisplays(0);
    return;
  }
  if (diff === 0) return;

  const duration = 1500;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    currentCount = Math.round(start + diff * eased);
    updateCounterDisplays(currentCount);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

async function fetchCount() {
  try {
    const res = await fetch("/api/count");
    const data = await res.json();
    animateCounter(data.count);
  } catch (e) {
    counterEl.textContent = "0";
  }
}

async function checkFingerprint() {
  try {
    deviceFingerprint = await generateFingerprint();

    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint: deviceFingerprint }),
    });

    if (!res.ok) return;
    const data = await res.json();

    if (data.shifted) {
      myNumber = String(data.id);
      animateCounter(data.count);
      showAlreadyShifted();
    } else {
      shiftBtn.disabled = false;
      shiftBtn.style.opacity = "1";
    }
  } catch (e) {
    console.error("Fingerprint check failed:", e);
    shiftBtn.disabled = false;
    shiftBtn.style.opacity = "1";
  }
}

async function runCeremony(shifterId) {
  const num = `#${formatNumber(parseInt(shifterId))}`;

  preShift.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  preShift.style.opacity = "0";
  preShift.style.transform = "scale(0.98)";

  await wait(700);
  preShift.classList.add("hidden");
  postShift.classList.remove("hidden");

  ceremony1.classList.remove("hidden");
  await wait(2000);

  ceremony1.classList.add("hidden");
  ceremony2.classList.remove("hidden");
  await wait(2000);

  ceremony2.classList.add("hidden");
  ceremony3.classList.remove("hidden");
  badgeNumber.textContent = num;

  triggerWarp();
  triggerShake();
  flashOverlay.classList.add("flash");
  setTimeout(() => flashOverlay.classList.remove("flash"), 1200);

  await wait(3000);

  ceremony3.classList.add("hidden");
  ceremony4.classList.remove("hidden");
  finalNumber.textContent = num;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function doShift() {
  if (!deviceFingerprint) return;

  shiftBtn.disabled = true;
  shiftBtn.style.pointerEvents = "none";
  shiftBtn.style.opacity = "0.3";

  try {
    const res = await fetch("/api/shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint: deviceFingerprint }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    if (!data.id) throw new Error("No id returned");

    myNumber = String(data.id);
    animateCounter(data.count);
    await runCeremony(myNumber);
  } catch (e) {
    console.error("Shift failed:", e);
    shiftBtn.disabled = false;
    shiftBtn.style.pointerEvents = "auto";
    shiftBtn.style.opacity = "1";
  }
}

function showAlreadyShifted() {
  const num = `#${formatNumber(parseInt(myNumber))}`;
  preShift.classList.add("hidden");
  postShift.classList.remove("hidden");
  ceremony1.classList.add("hidden");
  ceremony2.classList.add("hidden");
  ceremony3.classList.add("hidden");
  ceremony4.classList.remove("hidden");
  finalNumber.textContent = num;
}

function shareNumber() {
  const text = `I am #${formatNumber(parseInt(myNumber))} in THE SILENT FLOOD.`;
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({ title: "THE SILENT FLOOD", text, url }).catch(() => { });
  } else {
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
      shareBtn.textContent = "copied";
      setTimeout(() => {
        shareBtn.textContent = "share your number";
      }, 2000);
    });
  }
}

shiftBtn.disabled = true;
shiftBtn.style.opacity = "0.3";
shiftBtn.addEventListener("click", doShift);
shareBtn.addEventListener("click", shareNumber);

initScene();
fetchCount();
setInterval(fetchCount, 5000);
checkFingerprint();
