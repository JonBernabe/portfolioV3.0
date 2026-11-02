import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type Random = {
  next: () => number
  pick: <T>(items: readonly T[]) => T
}

export type Point = [x: number, y: number, z: number]

export type NightLights = ReturnType<typeof createNightLights>

const UP = new THREE.Vector3(0, 1, 0)
const ROAD_LOOP = 46
const ROAD_EDGE = 20.4

// Seeded so the street looks the same on every visit.
export function createRandom(seed: number): Random {
  const next = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    pick: (items) => items[Math.floor(next() * items.length)],
  }
}

export function std(
  color: THREE.ColorRepresentation,
  options: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    ...options,
  })
}

export function glow(hex: THREE.ColorRepresentation, intensity = 1.6) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(hex).multiplyScalar(intensity),
    toneMapped: false,
  })
}

export function addShadowed<T extends THREE.Object3D>(
  object: T,
  parent: THREE.Object3D,
  cast = true,
  receive = true,
) {
  object.castShadow = cast
  object.receiveShadow = receive
  parent.add(object)
  return object
}

// Everything that switches on at dusk, driven from one place.
export function createNightLights() {
  const materials: {
    material: THREE.MeshBasicMaterial
    off: THREE.Color
    on: THREE.Color
  }[] = []
  const lights: { light: THREE.Light; intensity: number }[] = []

  return {
    glow(
      hex: THREE.ColorRepresentation,
      intensity = 1.6,
      off: THREE.ColorRepresentation = '#241a12',
    ) {
      const material = glow(hex, intensity)
      materials.push({
        material,
        off: new THREE.Color(off),
        on: material.color.clone(),
      })
      return material
    },
    light<T extends THREE.Light>(light: T) {
      lights.push({ light, intensity: light.intensity })
      return light
    },
    update(night: number) {
      for (const { material, off, on } of materials) {
        material.color.lerpColors(off, on, night)
      }
      // Dimmed, not hidden: changing the light count recompiles every shader.
      for (const { light, intensity } of lights) {
        light.intensity = intensity * night
      }
    },
  }
}

// Where something travelling the road is, looping end to end. It shrinks to
// nothing at the island's edges so it never hangs over the side.
export function alongRoad(distance: number, direction: number) {
  const travelled = ((distance % ROAD_LOOP) + ROAD_LOOP) % ROAD_LOOP
  const x = (travelled - ROAD_LOOP / 2) * direction

  return {
    x,
    scale: THREE.MathUtils.smoothstep(ROAD_EDGE - Math.abs(x), 0, 1.2),
  }
}

export function box(w: number, h: number, d: number, [x, y, z]: Point) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z)
}

export function rod(from: Point, to: Point, radius: number, sides = 6) {
  const start = new THREE.Vector3(...from)
  const direction = new THREE.Vector3(...to).sub(start)
  const middle = start.addScaledVector(direction, 0.5)

  return new THREE.CylinderGeometry(radius, radius, direction.length(), sides)
    .applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        UP,
        direction.clone().normalize(),
      ),
    )
    .translate(middle.x, middle.y, middle.z)
}

// Merged so a hut made of dozens of poles costs one draw call.
export function addMerged(
  parts: THREE.BufferGeometry[],
  material: THREE.Material,
  parent: THREE.Object3D,
  cast = true,
) {
  return addShadowed(
    new THREE.Mesh(mergeGeometries(parts), material),
    parent,
    cast,
  )
}

export function paintedTexture(
  size: number,
  paint: (context: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  paint(canvas.getContext('2d')!)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

export function shade(random: Random, color: THREE.Color, range: number) {
  const shaded = color.clone()
  shaded.offsetHSL(0, 0, (random.next() - 0.5) * range)
  return `#${shaded.getHexString()}`
}
