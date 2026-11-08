import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { SectionId } from "../Page/sections";
import { addBuilding, type BuildingContext, type Landmark } from "./buildings";
import { getNow, getSeason, getSkyTime } from "./calendar";
import {
  addDecorations,
  updateDecorations,
  type Decorations,
} from "./decorations";
import {
  addEnvironment,
  addGround,
  updateClouds,
  updateEnvironment,
} from "./environment";
import { createNightLights, createRandom } from "./helpers";
import {
  addBanana,
  addBush,
  addCarabao,
  addChicken,
  addFence,
  addPaddy,
  addPalm,
  addShadeTree,
  updateSwaying,
  type Swaying,
} from "./nature";
import {
  addFarmers,
  addWalkers,
  updateFarmers,
  updateWalkers,
} from "./people";
import {
  addFireflies,
  addJeepney,
  addLamp,
  addTricycle,
  addWaitingShed,
  updateFireflies,
  updateVehicles,
} from "./streetProps";

export type StreetCallbacks = {
  onSelect: (id: SectionId | null) => void;
  onHover: (id: SectionId | null, event?: PointerEvent) => void;
  onInteract: () => void;
  onProgress: (progress: number) => void;
  onReady: () => void;
};

export type Street = {
  focus: (id: SectionId | null) => void;
  dispose: () => void;
};

type Tween = {
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPosition: THREE.Vector3;
  toTarget: THREE.Vector3;
  startedAt: number;
  duration: number;
  done?: () => void;
};

const SEED = 7;
const MOBILE_MAX_WIDTH = 720;
const PIXEL_RATIO = 1.75;
const LITE_PIXEL_RATIO = 1.25;
const LITE_SHADOW_MAP = 1024;
const LITE_SHADOW_EVERY = 2;
const HOME_TARGET = new THREE.Vector3(0, 1.6, 0);
const LOADER_HOLD_MS = 900;
const TAP_TOLERANCE_PX = 6;
const SKY_UPDATE_SECONDS = 30;
const SIGN_DAY_LIGHT = 0.16;
const SIGN_NIGHT_LIGHT = 0.4;
const BACK_ROW_Z = -6.5;
const FRONT_ROW_Z = 6.5;
const PADDY_Z = 13.2;
const PADDY_DEPTH = 6.4;

const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

function homeZoom() {
  const aspect = innerWidth / innerHeight;
  return aspect < 0.8 ? 2.2 : aspect < 1.2 ? 1.6 : 1;
}

function homePosition() {
  // Looks across the road, since the signs face it.
  return new THREE.Vector3(6, 30, 43.5).multiplyScalar(homeZoom());
}

// Throws if the browser can't start WebGL.
export function createStreet(
  mount: HTMLElement,
  { onSelect, onHover, onInteract, onProgress, onReady }: StreetCallbacks,
): Street {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Phones and tablets get a lighter render so the street stays smooth.
  const lite = matchMedia("(pointer: coarse)").matches;
  const random = createRandom(SEED);
  const season = getSeason(getNow());
  const { climate } = season;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, lite ? LITE_PIXEL_RATIO : PIXEL_RATIO),
  );
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // The shadow map is in world space, so the camera can orbit freely while
  // phones redraw it only every few frames for the slow-moving figures.
  renderer.shadowMap.autoUpdate = !lite;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    35,
    innerWidth / innerHeight,
    0.5,
    500,
  );
  camera.position.copy(homePosition());

  // Bloom is a stack of full-screen blur passes, too heavy for phones, which
  // render straight to the canvas instead.
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!lite) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.4,
      0.4,
      0.95,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.32;
  controls.minDistance = 12;
  controls.maxDistance = 130;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.35;

  const landmarks: BuildingContext["landmarks"] = new Map();
  const clickables: BuildingContext["clickables"] = [];
  const nightLights = createNightLights();
  const environment = addEnvironment(scene, random, climate, homeZoom());
  if (lite) {
    environment.skyLight.shadow.mapSize.setScalar(LITE_SHADOW_MAP);
  }
  const vehicles: ReturnType<typeof addJeepney>[] = [];
  const swaying: Swaying[] = [];
  let walkers: ReturnType<typeof addWalkers> = [];
  let farmers: ReturnType<typeof addFarmers> = [];
  let decorations: Decorations | null = null;
  let fireflies: ReturnType<typeof addFireflies> | null = null;
  // Every light is shaded on every pixel even at zero intensity, so phones
  // switch the lamps off outright in full daylight. Toggling them recompiles
  // the shaders, but only once at dawn and once at dusk.
  const lamps: THREE.Light[] = [];

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clock = new THREE.Clock();

  let focused: SectionId | null = null;
  let saved: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  let tween: Tween | null = null;
  let pointerDownAt: [number, number] | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let readyTimer: ReturnType<typeof setTimeout> | undefined;
  let frameId = 0;
  let frameCount = 0;
  let disposed = false;
  let night = 1;
  let nextSkyUpdate = 0;

  function resumeAutoRotateAfter(delay: number) {
    if (reducedMotion) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!focused) controls.autoRotate = true;
    }, delay);
  }

  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    onInteract();
  });
  controls.addEventListener("end", () => resumeAutoRotateAfter(6000));

  function sectionAt(event: PointerEvent): SectionId | null {
    pointer.set(
      (event.clientX / innerWidth) * 2 - 1,
      -(event.clientY / innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(clickables, false);
    return hit ? (hit.object.userData.id as SectionId) : null;
  }

  function setHover(id: SectionId | null, event?: PointerEvent) {
    renderer.domElement.style.cursor = id ? "pointer" : "";
    for (const [key, { sign }] of landmarks) {
      sign.target = key === id || key === focused ? 1.2 : sign.base;
    }
    onHover(id, event);
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerType === "mouse" && !tween) {
      setHover(sectionAt(event), event);
    }
  }

  function handlePointerDown(event: PointerEvent) {
    pointerDownAt = [event.clientX, event.clientY];
  }

  function handlePointerUp(event: PointerEvent) {
    if (!pointerDownAt) return;
    const moved = Math.hypot(
      event.clientX - pointerDownAt[0],
      event.clientY - pointerDownAt[1],
    );
    if (moved > TAP_TOLERANCE_PX) return;

    const id = sectionAt(event);
    if (id) onSelect(id);
    else if (focused) onSelect(null);
  }

  const { domElement } = renderer;
  domElement.addEventListener("pointermove", handlePointerMove);
  domElement.addEventListener("pointerdown", handlePointerDown);
  domElement.addEventListener("pointerup", handlePointerUp);

  function handleResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer?.setSize(innerWidth, innerHeight);
  }
  window.addEventListener("resize", handleResize);

  function tweenTo(
    toPosition: THREE.Vector3,
    toTarget: THREE.Vector3,
    duration: number,
    done?: () => void,
  ) {
    tween = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition,
      toTarget,
      startedAt: performance.now(),
      duration,
      done,
    };
  }

  function flyTo(id: SectionId, building: Landmark) {
    if (!focused) {
      saved = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      };
    }
    focused = id;
    controls.enabled = false;
    controls.autoRotate = false;

    const { x, z, d, h, signX, signY, facing } = building;
    const mobile = innerWidth <= MOBILE_MAX_WIDTH;

    // Camera looks over the roofs across the street, down onto this sign.
    const opposite = [...landmarks.values()].filter((o) => o.facing !== facing);
    const across = Math.max(...opposite.map((o) => o.h), 5.2);
    const back = mobile ? 13 : 12.5;
    const targetY = h / 2 + 0.2;
    // High enough to clear the facing roofs and look down into the yard.
    const cameraY =
      targetY + ((across + 0.6 - targetY) * (back - d / 2)) / 5.3 + 0.4;

    const target = new THREE.Vector3(x, targetY, z + (facing * d) / 2);
    const position = new THREE.Vector3(
      x - facing * 1.2,
      cameraY,
      z + facing * back,
    );
    if (mobile) {
      // Too narrow for hut and sign, so the sign sits above the bottom sheet.
      target.x = position.x = signX;
      target.y = signY - 4.3;
    } else {
      target.x += facing * 0.8; // hut and sign sit left of the side panel
    }

    tweenTo(position, target, 1400);
    setHover(null);
  }

  function flyHome() {
    focused = null;
    const home = saved ?? {
      position: homePosition(),
      target: HOME_TARGET.clone(),
    };
    tweenTo(home.position, home.target, 1300, () => {
      controls.enabled = true;
      resumeAutoRotateAfter(4000);
    });
    setHover(null);
  }

  function focus(id: SectionId | null) {
    if (id === focused) return;
    const building = id && landmarks.get(id);
    if (id && building) flyTo(id, building);
    else if (!id) flyHome();
  }

  function updateCamera() {
    if (tween) {
      const elapsed = (performance.now() - tween.startedAt) / tween.duration;
      const progress = Math.min(elapsed, 1);
      const eased = ease(progress);
      camera.position.lerpVectors(tween.fromPosition, tween.toPosition, eased);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
      camera.lookAt(controls.target);
      if (progress >= 1) {
        const { done } = tween;
        tween = null;
        done?.();
      }
    } else if (controls.enabled) {
      controls.update();
    } else {
      camera.lookAt(controls.target);
    }
  }

  function updateSigns() {
    for (const { sign } of landmarks.values()) {
      sign.current = THREE.MathUtils.lerp(sign.current, sign.target, 0.12);
      sign.material.color.setScalar(sign.current);
      // Cloth in the hut's shade stays pale by day, and after dark it stays
      // readable but too dim to reach the bloom pass.
      sign.material.emissiveIntensity =
        THREE.MathUtils.lerp(SIGN_DAY_LIGHT, SIGN_NIGHT_LIGHT, night) *
        sign.current;
      sign.light.intensity = (1.4 + (sign.current - sign.base) * 5) * night;
    }
  }

  function updateDaylight() {
    const skyTime = getSkyTime(getNow());
    const { daylight } = skyTime;
    night = 1 - daylight;

    updateEnvironment(environment, skyTime);
    nightLights.update(night);
    for (const lamp of lamps) lamp.visible = night > 0;
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.2, 1, daylight);
    if (bloom) {
      bloom.strength = THREE.MathUtils.lerp(0.4, 0.06, daylight);
      bloom.threshold = THREE.MathUtils.lerp(0.95, 1.4, daylight);
    }
  }

  function frame() {
    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    if (time >= nextSkyUpdate) {
      updateDaylight();
      nextSkyUpdate = time + SKY_UPDATE_SECONDS;
    }

    updateCamera();
    updateSigns();
    updateVehicles(vehicles, time);
    updateWalkers(walkers, time, night);
    updateFarmers(farmers, time, night);
    updateSwaying(swaying, time);
    updateClouds(environment, time);
    if (decorations) updateDecorations(decorations, random, time, night);
    if (fireflies) updateFireflies(fireflies, time, night);

    if (lite) {
      renderer.shadowMap.needsUpdate = frameCount % LITE_SHADOW_EVERY === 0;
    }
    frameCount++;

    if (composer) composer.render(delta);
    else renderer.render(scene, camera);
    frameId = requestAnimationFrame(frame);
  }

  function buildVillage() {
    decorations = addDecorations(
      scene,
      random,
      nightLights,
      season,
      reducedMotion,
    );
    const context = {
      scene,
      random,
      landmarks,
      clickables,
      nightLights,
      climate,
      parols: season.festivity === "pasko" ? decorations.lanterns : null,
    };

    addBuilding(
      {
        id: "about",
        x: -11.5,
        z: BACK_ROW_Z,
        w: 3,
        d: 2.6,
        h: 4.1,
        color: "#c8a86f",
      },
      context,
    );
    addBuilding(
      {
        id: "projects",
        x: 1,
        z: BACK_ROW_Z,
        w: 3.4,
        d: 2.6,
        h: 4.4,
        color: "#bd9a5f",
      },
      context,
    );
    addBuilding(
      {
        id: "skills",
        x: -5,
        z: FRONT_ROW_Z,
        w: 3.4,
        d: 2.6,
        h: 3.9,
        color: "#caa974",
      },
      context,
    );
    addBuilding(
      {
        id: "contact",
        x: 7.5,
        z: FRONT_ROW_Z,
        w: 2.8,
        d: 2.6,
        h: 4.2,
        color: "#b99763",
      },
      context,
    );
    addBuilding(
      {
        id: "career",
        x: 13.5,
        z: BACK_ROW_Z,
        w: 2.1,
        d: 2.4,
        h: 3.8,
        color: "#c2a067",
      },
      context,
    );
    addBuilding(
      { x: -16.5, z: FRONT_ROW_Z, w: 1.9, d: 2.4, h: 3.7, color: "#b99763" },
      context,
    );
    addBuilding(
      { x: 17.5, z: FRONT_ROW_Z, w: 1.8, d: 2.4, h: 3.6, color: "#c8a86f" },
      context,
    );
    onProgress(0.7);

    addLamp(scene, nightLights, -18, 2.75);
    addLamp(scene, nightLights, -9.5, -2.75);
    addLamp(scene, nightLights, -0.7, -2.75);
    addLamp(scene, nightLights, 4.2, 2.75);
    addLamp(scene, nightLights, 15.6, -2.75);

    for (const [x, z, w] of [
      [-11.6, -PADDY_Z, 9],
      [0, -PADDY_Z, 13.6],
      [13.4, -PADDY_Z, 12.6],
      [-12.6, PADDY_Z, 14.6],
      [2.6, PADDY_Z, 14.8],
      [14.6, PADDY_Z, 8.6],
    ]) {
      addPaddy(scene, random, climate, { x, z, w, d: PADDY_DEPTH });
    }
    addFence(scene, -20, 20, -9.4);
    addFence(scene, -20, 20, 9.4);

    for (const [x, z, height] of [
      [-19.8, -7.4, 5.6],
      [-17.2, -8.4, 6.2],
      [-20.1, -3.4, 5],
      [-8, -9, 5.8],
      [6.6, -8.8, 5.4],
      [19.6, -8.3, 6],
      [20, -4.2, 5.2],
      [-20, 4.2, 5.4],
      [-19.4, 8.2, 6],
      [-11, 8.6, 5.8],
      [3.4, 8.7, 5.4],
      [14.6, 8.7, 6.2],
      [20, 5, 5.6],
      [19.6, 16, 6],
      [-20, 15.6, 5.4],
      [20, -15.6, 5.6],
    ]) {
      swaying.push(addPalm(scene, random, climate, x, z, height));
    }
    for (const [x, z] of [
      [-14.4, -8.4],
      [-8.4, -7.6],
      [5.4, -7.8],
      [10.6, -8.3],
      [-10.8, 7.8],
      [3.2, 7.4],
      [13.4, 7.4],
    ]) {
      swaying.push(addBanana(scene, random, climate, x, z));
    }
    addShadeTree(scene, random, climate, -18.6, -11.6, 1.1);
    for (const [x, z] of [
      [-8.6, -5.3],
      [4.4, -5.4],
      [15.6, -5.3],
      [2, 5.4],
      [-8.6, 5.4],
      [14.4, 5.4],
      [-13, 5.6],
    ]) {
      addBush(scene, random, climate, x, z);
    }

    swaying.push(
      addCarabao(scene, random, -18.4, -14, 0.6),
      addCarabao(scene, random, 6, PADDY_Z, 2.4),
      addChicken(scene, random, -9.3, -4.4),
      addChicken(scene, random, -8.6, -3.9),
      addChicken(scene, random, 3.6, -3.6),
      addChicken(scene, random, -8.2, 3.7),
      addChicken(scene, random, 5, 4.1),
      addChicken(scene, random, 15.6, -3.9),
    );

    addWaitingShed(scene, random, 18, -3.45);
    walkers = addWalkers(scene, random, climate === "tagUlan");
    farmers = addFarmers(scene, random, [
      [-13, 0, -12.2],
      [-9.6, 0, -14.6],
      [2.4, 0, -12.2],
      [12, 0, -14.2],
      [-14, 0, 13.6],
      [-8, 0, 11.8],
      [1, 0, 14.2],
      [15, 0, 12.4],
    ]);

    vehicles.push(
      addJeepney(scene, random, nightLights, 0.5, 1, ["#d8312f", "#ffd34f"]),
      addJeepney(scene, random, nightLights, -0.5, -1, ["#2f6fd8", "#ff9a4f"]),
      addTricycle(scene, random, nightLights, 1.3, 1, "#2f9c57", 3),
      addTricycle(scene, random, nightLights, 1.3, 1, "#d8312f", 26),
      addTricycle(scene, random, nightLights, -1.3, -1, "#f0b429", 12),
      addTricycle(scene, random, nightLights, -1.3, -1, "#7d3fb5", 35),
    );
    fireflies = addFireflies(scene, random);
    if (lite) {
      // Phones keep only the street lamps. The sign lamps and headlight beams
      // cost as much to shade but light far less, and the signs glow anyway.
      const minorLights = new Set<THREE.Object3D>(
        [...landmarks.values()].map(({ sign }) => sign.light),
      );
      scene.traverse((object) => {
        if (object instanceof THREE.SpotLight || minorLights.has(object)) {
          object.visible = false;
        } else if (object instanceof THREE.PointLight) {
          lamps.push(object);
        }
      });
    }
    onProgress(1);
  }

  async function start() {
    addGround(scene, random, climate);
    onProgress(0.2);

    // Hut signs are drawn to canvas, so Bitter has to be loaded first.
    await Promise.race([
      document.fonts.load("800 76px Bitter"),
      new Promise((resolve) => setTimeout(resolve, 1800)),
    ]).catch(() => {});
    if (disposed) return;
    onProgress(0.45);

    buildVillage();
    frame();
    readyTimer = setTimeout(onReady, LOADER_HOLD_MS);
  }

  void start();

  return {
    focus,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(idleTimer);
      clearTimeout(readyTimer);
      window.removeEventListener("resize", handleResize);
      domElement.removeEventListener("pointermove", handlePointerMove);
      domElement.removeEventListener("pointerdown", handlePointerDown);
      domElement.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      composer?.dispose();
      renderer.dispose();
      // StrictMode remounts in dev, so release the context straight away.
      renderer.forceContextLoss();
      domElement.remove();
    },
  };
}
