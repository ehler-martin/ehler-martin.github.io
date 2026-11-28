import * as THREE from "./vendor/three.module.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { createModel } from "./model-loader.js";

export async function createViewer(view) {
  const canvas = view.querySelector("canvas");
  const stage = view.querySelector(".geometry-stage");
  const status = view.querySelector(".geometry-status");
  const spin = view.querySelector(".geometry-spin");
  const response = await fetch(new URL("./six-lines-six-planes.glb", import.meta.url));
  if (!response.ok) throw new Error("Unable to load the model");
  const model = createModel(await response.arrayBuffer());
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
  camera.up.set(0, 0, 1);
  camera.position.set(4, -5.2, 3.3).setLength(5.8);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(model, new THREE.HemisphereLight(0xffffff, 0xc5cedc, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(3, -4, 6);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-3, 2, 1);
  scene.add(key, fill);

  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = 1;
  controls.maxDistance = 16;
  controls.rotateSpeed = 0.8;
  controls.autoRotateSpeed = 0.8;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = !view.inert;
  let inViewport = true;
  let frame;
  let lastTime;

  function render() {
    if (visible && !document.hidden) renderer.render(scene, camera);
  }
  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }
  function animate(time) {
    controls.update(lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, 0.1));
    lastTime = time;
    frame = requestAnimationFrame(animate);
  }
  function syncAnimation() {
    cancelAnimationFrame(frame);
    lastTime = undefined;
    if (visible && inViewport && !document.hidden && controls.autoRotate) frame = requestAnimationFrame(animate);
  }
  function setSpin(enabled) {
    controls.autoRotate = enabled;
    spin.textContent = enabled ? "Pause" : "Resume rotation";
    syncAnimation();
  }
  controls.addEventListener("change", render);
  canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));
  spin.addEventListener("click", () => setSpin(!controls.autoRotate));
  canvas.addEventListener("keydown", event => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"];
    const pressed = event.key;
    if (!keys.includes(pressed)) return;
    event.preventDefault();
    const turn = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
    const offset = camera.position.clone().sub(controls.target).applyQuaternion(turn);
    const sphere = new THREE.Spherical().setFromVector3(offset);
    switch (pressed) {
      case "ArrowLeft": sphere.theta -= 0.15; break;
      case "ArrowRight": sphere.theta += 0.15; break;
      case "ArrowUp": sphere.phi -= 0.15; break;
      case "ArrowDown": sphere.phi += 0.15; break;
      case "-": sphere.radius *= 1.13; break;
      default: sphere.radius /= 1.13;
    }
    sphere.makeSafe();
    sphere.radius = THREE.MathUtils.clamp(sphere.radius, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setFromSpherical(sphere).applyQuaternion(turn.invert()));
    controls.update();
  });
  new ResizeObserver(resize).observe(stage);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      syncAnimation();
    }).observe(view);
  }
  document.addEventListener("visibilitychange", syncAnimation);
  status.hidden = true;
  spin.disabled = false;
  setSpin(!reducedMotion.matches);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) setSpin(false);
  });
  resize();
  return {
    setVisible(value) {
      visible = value;
      if (value) resize();
      syncAnimation();
    }
  };
}
