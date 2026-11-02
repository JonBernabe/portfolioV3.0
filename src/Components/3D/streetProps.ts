import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  addMerged,
  addShadowed,
  alongRoad,
  box,
  rod,
  std,
  type NightLights,
  type Random,
} from './helpers'
import { addFigure, addSitter } from './people'

type Vehicle = {
  group: THREE.Group
  z: number
  direction: number
  speed: number
  offset: number
  bounce: number
}

type Fireflies = {
  points: THREE.Points
  positions: THREE.BufferAttribute
  material: THREE.PointsMaterial
  base: [number, number, number, number][]
}

const POST_WOOD = '#5f4a35'
const NIPA = '#8d6b3c'

export function addLamp(
  scene: THREE.Scene,
  nightLights: NightLights,
  x: number,
  z: number,
) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)

  const direction = z < 0 ? 1 : -1
  addMerged(
    [
      rod([0, 0, 0], [0, 3.1, 0], 0.06, 7),
      rod([0, 2.86, 0], [0, 2.86, direction * 0.6], 0.03),
      rod([-0.34, 3.0, 0], [0.34, 3.0, 0], 0.025),
    ],
    std(POST_WOOD),
    group,
  )

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 8),
    nightLights.glow('#ffcf8f', 2.4, '#d9d2c0'),
  )
  head.position.set(0, 2.76, direction * 0.6)
  group.add(head)

  const light = new THREE.PointLight('#ffb36b', 8, 8, 2)
  light.position.set(0, 2.55, direction * 0.6)
  group.add(nightLights.light(light))
}

export function addJeepney(
  scene: THREE.Scene,
  random: Random,
  nightLights: NightLights,
  z: number,
  direction: number,
  palette: [string, string],
): Vehicle {
  const group = new THREE.Group()
  scene.add(group)

  const chrome = std('#c7ccd8', { metalness: 0.75, roughness: 0.3 })

  const body = addShadowed(
    new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.62, 0.78, 2, 0.06), chrome),
    group,
  )
  body.position.y = 0.62

  const hood = addShadowed(
    new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.38, 0.7, 2, 0.05), chrome),
    group,
  )
  hood.position.set(1.18, 0.5, 0)

  addMerged(
    [
      box(1.92, 0.12, 0.8, [0, 0.44, 0]),
      box(2.05, 0.08, 0.86, [0, 0.97, 0]),
      box(0.58, 0.05, 0.72, [1.18, 0.7, 0]),
      box(0.3, 0.1, 0.05, [-0.6, 0.66, 0.4]),
      box(0.3, 0.1, 0.05, [-0.6, 0.66, -0.4]),
    ],
    std(palette[0]),
    group,
  )
  addMerged(
    [
      box(1.92, 0.05, 0.8, [0, 0.78, 0]),
      box(2.07, 0.03, 0.88, [0, 1.02, 0]),
    ],
    std(palette[1]),
    group,
  )

  // Front grille, bumper and the row of chrome ornaments on the hood.
  addMerged(
    [
      box(0.03, 0.26, 0.6, [1.46, 0.5, 0]),
      box(0.05, 0.05, 0.86, [1.48, 0.3, 0]),
      rod([1.3, 0.72, -0.3], [1.3, 0.92, -0.3], 0.012, 5),
      rod([1.3, 0.72, 0.3], [1.3, 0.92, 0.3], 0.012, 5),
      rod([-0.98, 0.36, -0.38], [-0.98, 0.98, -0.38], 0.014, 5),
      rod([-0.98, 0.36, 0.38], [-0.98, 0.98, 0.38], 0.014, 5),
    ],
    chrome,
    group,
  )

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.2, 0.68),
    std('#23303d', { roughness: 0.15, metalness: 0.4 }),
  )
  windshield.position.set(0.94, 0.82, 0)
  group.add(windshield)

  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.2, 0.81),
    nightLights.glow('#ffe2b0', 0.55, '#1b2027'),
  )
  windows.position.set(-0.1, 0.78, 0)
  group.add(windows)

  for (const lightZ of [-0.18, 0.18]) {
    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      nightLights.glow('#ffffff', 3, '#e8e2d2'),
    )
    headlight.position.set(1.47, 0.5, lightZ)
    group.add(headlight)

    const taillight = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.08, 0.1),
      nightLights.glow('#ff3344', 2.5, '#7a1c22'),
    )
    taillight.position.set(-0.96, 0.5, lightZ * 1.6)
    group.add(taillight)
  }

  const rubber = std('#111')
  const wheels = [
    [0.9, 0.36],
    [0.9, -0.36],
    [-0.6, 0.36],
    [-0.6, -0.36],
  ]
  for (const [wheelX, wheelZ] of wheels) {
    const wheel = addShadowed(
      new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 14), rubber),
      group,
    )
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(wheelX, 0.19, wheelZ)
  }

  const beam = new THREE.SpotLight('#fff2d6', 8, 6, 0.5, 0.6, 2)
  beam.position.set(1.4, 0.5, 0)
  beam.target.position.set(4, 0, 0)
  group.add(nightLights.light(beam), beam.target)

  group.rotation.y = direction > 0 ? 0 : Math.PI

  return {
    group,
    z,
    direction,
    speed: 1.7,
    offset: random.next() * 46,
    bounce: 0.015,
  }
}

function addTricycleWheel(
  group: THREE.Group,
  rubber: THREE.Material,
  x: number,
  z: number,
) {
  const wheel = addShadowed(
    new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.06, 14), rubber),
    group,
  )
  wheel.rotation.x = Math.PI / 2
  wheel.position.set(x, 0.14, z)
}

export function addTricycle(
  scene: THREE.Scene,
  random: Random,
  nightLights: NightLights,
  z: number,
  direction: number,
  paint: string,
  offset: number,
): Vehicle {
  const group = new THREE.Group()
  scene.add(group)

  // Everything is offset so the bike-plus-sidecar sits centered in its lane.
  const bikeZ = -0.26
  const sidecarZ = 0.14

  const rubber = std('#111')
  addTricycleWheel(group, rubber, 0.56, bikeZ)
  addTricycleWheel(group, rubber, -0.4, bikeZ)
  addTricycleWheel(group, rubber, -0.02, 0.4)

  addMerged(
    [
      box(0.36, 0.13, 0.1, [0.02, 0.4, bikeZ]),
      box(0.92, 0.3, 0.42, [-0.04, 0.32, sidecarZ]),
      box(0.3, 0.2, 0.42, [0.5, 0.26, sidecarZ]),
      box(1.14, 0.045, 0.82, [0, 0.98, -0.03]),
    ],
    std(paint),
    group,
  )
  addMerged(
    [
      box(0.34, 0.06, 0.12, [-0.24, 0.45, bikeZ]),
      box(0.26, 0.16, 0.09, [-0.04, 0.24, bikeZ]),
      box(0.05, 0.42, 0.42, [-0.48, 0.66, sidecarZ]),
    ],
    std('#1b1b1f'),
    group,
  )
  addMerged(
    [
      rod([0.56, 0.14, bikeZ], [0.42, 0.56, bikeZ], 0.02),
      rod([0.42, 0.57, bikeZ - 0.17], [0.42, 0.57, bikeZ + 0.17], 0.015),
      rod([-0.4, 0.14, bikeZ], [-0.12, 0.3, bikeZ], 0.016),
      rod([0.46, 0.46, -0.04], [0.46, 0.98, -0.04], 0.016),
      rod([0.46, 0.46, 0.36], [0.46, 0.98, 0.36], 0.016),
      rod([-0.48, 0.46, -0.04], [-0.48, 0.98, -0.04], 0.016),
      rod([-0.48, 0.46, 0.36], [-0.48, 0.98, 0.36], 0.016),
    ],
    std('#c7ccd8', { metalness: 0.7, roughness: 0.35 }),
    group,
  )

  const windscreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.3, 0.4),
    std('#2c3a46', { roughness: 0.15, metalness: 0.4 }),
  )
  windscreen.position.set(0.46, 0.76, sidecarZ)
  group.add(windscreen)

  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    nightLights.glow('#ffffff', 3, '#e8e2d2'),
  )
  headlight.position.set(0.47, 0.52, bikeZ)
  group.add(headlight)

  const taillight = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.05, 0.14),
    nightLights.glow('#ff3344', 2.5, '#7a1c22'),
  )
  taillight.position.set(-0.51, 0.42, sidecarZ)
  group.add(taillight)

  const rider = addFigure(group, random, { size: 0.9 })
  rider.group.position.set(-0.22, 0.2, bikeZ)
  rider.legs[0].rotation.z = rider.legs[1].rotation.z = 1
  rider.arms[0].rotation.z = rider.arms[1].rotation.z = 1.25

  const passenger = addFigure(group, random, { size: 0.82 })
  passenger.group.position.set(-0.08, 0.22, sidecarZ)
  passenger.legs[0].rotation.z = passenger.legs[1].rotation.z = 1.3

  group.rotation.y = direction > 0 ? 0 : Math.PI

  return { group, z, direction, speed: 1.15, offset, bounce: 0.02 }
}

export function updateVehicles(vehicles: Vehicle[], time: number) {
  for (const { group, z, direction, speed, offset, bounce } of vehicles) {
    const { x, scale } = alongRoad(time * speed + offset, direction)

    // shrink away at the island's edges
    const bump = Math.abs(Math.sin(time * 14 + offset)) * bounce
    group.position.set(x, 0.06 + bump, z)
    group.scale.setScalar(Math.max(scale, 0.001))
    group.visible = scale > 0.01
  }
}

export function addWaitingShed(
  scene: THREE.Scene,
  random: Random,
  x: number,
  z: number,
) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = z < 0 ? 0 : Math.PI
  scene.add(group)

  const parts: THREE.BufferGeometry[] = [box(1.5, 0.05, 0.3, [0, 0.27, 0])]
  for (const postX of [-0.8, 0.8]) {
    for (const postZ of [-0.42, 0.42]) {
      parts.push(rod([postX, 0, postZ], [postX, 1.45, postZ], 0.04, 7))
    }
    parts.push(box(0.05, 0.27, 0.05, [postX * 0.7, 0.13, 0]))
  }
  addMerged(parts, std(POST_WOOD), group)

  addMerged(
    [
      new THREE.BoxGeometry(2, 0.06, 0.74)
        .rotateX(0.42)
        .translate(0, 1.62, 0.3),
      new THREE.BoxGeometry(2, 0.06, 0.74)
        .rotateX(-0.42)
        .translate(0, 1.62, -0.3),
    ],
    std(NIPA),
    group,
  )

  addSitter(group, random, [-0.32, 0.3, 0.04], -Math.PI / 2)
  addSitter(group, random, [0.26, 0.3, 0.04], -Math.PI / 2)
}

export function addFireflies(scene: THREE.Scene, random: Random): Fireflies {
  const count = 150
  const array = new Float32Array(count * 3)
  const base: Fireflies['base'] = []

  for (let i = 0; i < count; i++) {
    const x = (random.next() - 0.5) * 38
    const y = 0.4 + random.next() * 4
    const z = (random.next() - 0.5) * 30
    array.set([x, y, z], i * 3)
    base.push([x, y, z, random.next() * 6.28])
  }

  const positions = new THREE.BufferAttribute(array, 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', positions)
  const material = new THREE.PointsMaterial({
    color: new THREE.Color('#ffd98a').multiplyScalar(2),
    size: 0.07,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const points = new THREE.Points(geometry, material)
  scene.add(points)

  return { points, positions, material, base }
}

export function updateFireflies(
  { points, positions, material, base }: Fireflies,
  time: number,
  night: number,
) {
  points.visible = night > 0.05
  if (!points.visible) return

  base.forEach(([x, y, z, phase], i) => {
    positions.setXYZ(
      i,
      x + Math.sin(time * 0.4 + phase) * 0.4,
      y + Math.sin(time * 0.9 + phase * 2) * 0.3,
      z + Math.cos(time * 0.5 + phase) * 0.4,
    )
  })
  positions.needsUpdate = true
  material.opacity = (0.6 + Math.sin(time * 2) * 0.3) * night
}
