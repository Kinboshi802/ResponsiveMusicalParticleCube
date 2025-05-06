import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';

const vertShader = `
  uniform float uTime;
  uniform float uAudio;
  varying vec3 vColor;

  void main() {
    vColor = vec3(
      0.5 + 0.5 * sin(uTime + position.x + uAudio * 5.0),
      0.5 + 0.5 * sin(uTime + position.y + uAudio * 10.0),
      0.5 + 0.5 * sin(uTime + position.z + uAudio * 20.0)
    );

    vec3 pos = position;
    pos.x += sin(uTime + position.y * 2.0) * uAudio * 0.5;
    pos.y += cos(uTime + position.x * 2.0) * uAudio * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0 + 10.0 * uAudio;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragShader = `
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    if (dist > 0.5) discard;
    gl_FragColor = vec4(vColor, 1.0 - dist * 2.0);
  }
`;

let scene, camera, renderer, controls, uniforms, geometry;
let audio, audioContext, source, analyser, dataArray;

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  const PARTICLE_COUNT = 10000;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 10;
    positions[i + 1] = (Math.random() - 0.5) * 10;
    positions[i + 2] = (Math.random() - 0.5) * 10;
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  uniforms = {
    uTime: { value: 0.0 },
    uAudio: { value: 0.0 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertShader,
    fragmentShader: fragShader,
    transparent: true
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  audio = new Audio();
  document.getElementById('audioFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.loop = true;

    audio.play().catch(() => {
      alert("Click to enable audio playback.");
      document.body.addEventListener("click", () => audio.play(), { once: true });
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(audioContext.destination);
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

function animate() {
  requestAnimationFrame(animate);
  uniforms.uTime.value += 0.01;
  controls.update();

  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    uniforms.uAudio.value = avg / 255;
  }

  renderer.render(scene, camera);
}

window.addEventListener("DOMContentLoaded", () => {
  init();
  animate();
});
