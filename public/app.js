import * as THREE from "three";
import { generateFingerprint } from "./fingerprint.js";

let scene, camera, renderer;
let starsGeometry, starsMaterial, starsMesh;
let time = 0;
let warpSpeed = 0;
let targetWarpSpeed = 0;
let cameraShake = 0;

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = 1;

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("bg-canvas"),
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050508, 1);

  createStarField();

  window.addEventListener("resize", onResize);
  animate();
}

function createStarField() {
  const count = 1200;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 400;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    sizes[i] = Math.random() * 1.5 + 0.3;
    brightness[i] = Math.random();
  }

  starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  starsGeometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));

  starsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aBrightness;
      varying float vAlpha;
      varying float vBrightness;
      uniform float uTime;
      uniform float uWarp;
      uniform float uPixelRatio;

      void main() {
        vBrightness = aBrightness;

        vec3 pos = position;
        float warpOffset = uWarp * pos.z * 0.02;
        pos.z = mod(pos.z + warpOffset + 200.0, 400.0) - 200.0;

        float twinkle = sin(uTime * (1.0 + aBrightness * 2.0) + aBrightness * 100.0) * 0.3 + 0.7;
        vAlpha = twinkle * (0.3 + aBrightness * 0.7);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float depthScale = 60.0 / -mvPosition.z;
        float warpStretch = 1.0 + uWarp * 0.5;
        gl_PointSize = aSize * depthScale * uPixelRatio * warpStretch;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying float vBrightness;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        float core = 1.0 - smoothstep(0.0, 0.15, dist);
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);

        float intensity = core * 0.6 + glow * 0.4;

        vec3 coolWhite = vec3(0.85, 0.88, 0.95);
        vec3 warmWhite = vec3(0.95, 0.9, 0.85);
        vec3 color = mix(coolWhite, warmWhite, vBrightness);

        gl_FragColor = vec4(color, intensity * vAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  starsMesh = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starsMesh);
}

function triggerWarp() {
  targetWarpSpeed = 8;

  setTimeout(() => {
    targetWarpSpeed = 0;
  }, 2500);
}

function triggerShake() {
  cameraShake = 1;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (starsMaterial) {
    starsMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  warpSpeed += (targetWarpSpeed - warpSpeed) * 0.04;

  if (starsMaterial) {
    starsMaterial.uniforms.uTime.value = time;
    starsMaterial.uniforms.uWarp.value = warpSpeed;
  }

  if (starsMesh) {
    starsMesh.rotation.y = time * 0.003;
    starsMesh.rotation.x = Math.sin(time * 0.002) * 0.02;
  }

  if (cameraShake > 0.01) {
    camera.position.x = Math.sin(time * 40) * cameraShake * 0.15;
    camera.position.y = Math.cos(time * 35) * cameraShake * 0.15;
    cameraShake *= 0.94;
  } else {
    camera.position.x *= 0.95;
    camera.position.y *= 0.95;
    cameraShake = 0;
  }

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
