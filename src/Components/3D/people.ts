import * as THREE from 'three'
import {
  addShadowed,
  alongRoad,
  rod,
  std,
  type Point,
  type Random,
} from './helpers'

export type Figure = {
  group: THREE.Group
  upper: THREE.Group
  legs: [THREE.Group, THREE.Group]
  arms: [THREE.Group, THREE.Group]
}

type FigureOptions = {
  hat?: boolean
  umbrella?: boolean
  size?: number
}

type Walker = {
  figure: Figure
  z: number
  direction: number
  speed: number
  offset: number
  size: number
  umbrella: boolean
  // Stays out after dark. Everyone else has gone home by then.
  nightOwl: boolean
}

type Farmer = {
  figure: Figure
  phase: number
}

const SKIN_TONES = ['#8d5a3b', '#a56b46', '#7a4a2e', '#b67c54']
const HAIR = ['#14110f', '#221a14', '#2e241c']
const SHIRTS = [
  '#ece6d6',
  '#d8402f',
  '#2f6fd8',
  '#f0b429',
  '#3aa76d',
  '#e56fa0',
  '#f2f2f2',
]
const TROUSERS = ['#2b3a55', '#3b3b3b', '#6b4a2f', '#7a7f8a']
const UMBRELLAS = ['#d8312f', '#2f6fd8', '#f0b429', '#7d3fb5']
const SALAKOT = '#c9a65c'

const HIP_Y = 0.29
const LEG = new THREE.CapsuleGeometry(0.036, 0.2, 3, 8)
const TORSO = new THREE.CapsuleGeometry(0.078, 0.14, 3, 10)
const ARM = new THREE.CapsuleGeometry(0.024, 0.17, 3, 6)
const HEAD = new THREE.SphereGeometry(0.066, 12, 10)
const HAIR_CAP = new THREE.SphereGeometry(
  0.07,
  12,
  8,
  0,
  Math.PI * 2,
  0,
  Math.PI * 0.55,
)
const HAT = new THREE.ConeGeometry(0.17, 0.085, 12)
const CANOPY = new THREE.SphereGeometry(
  0.27,
  10,
  6,
  0,
  Math.PI * 2,
  0,
  Math.PI / 2,
)

const WALKERS = [
  { z: 2.02, direction: 1, speed: 0.42, offset: 2, nightOwl: true },
  { z: 2.18, direction: -1, speed: 0.36, offset: 17, nightOwl: false },
  { z: 1.94, direction: -1, speed: 0.46, offset: 33, nightOwl: false },
  { z: 2.1, direction: 1, speed: 0.4, offset: 40, nightOwl: false },
  { z: -2.02, direction: -1, speed: 0.4, offset: 9, nightOwl: true },
  { z: -2.2, direction: 1, speed: 0.38, offset: 24, nightOwl: false },
  { z: -1.96, direction: 1, speed: 0.44, offset: 38, nightOwl: false },
  { z: -2.1, direction: -1, speed: 0.42, offset: 30, nightOwl: false },
  { z: 2.12, direction: 1, speed: 0.72, offset: 22, nightOwl: false, size: 0.7 },
  { z: 2.28, direction: 1, speed: 0.72, offset: 22.7, nightOwl: false, size: 0.66 },
  { z: -2.12, direction: -1, speed: 0.3, offset: 1, nightOwl: false, hat: true },
  { z: -2.26, direction: 1, speed: 0.3, offset: 14, nightOwl: false, hat: true },
]

export function addFigure(
  parent: THREE.Object3D,
  random: Random,
  { hat = false, umbrella = false, size = 1 }: FigureOptions = {},
): Figure {
  const skin = std(random.pick(SKIN_TONES))
  const shirt = std(random.pick(SHIRTS))
  const trousers = std(random.pick(TROUSERS))

  const group = new THREE.Group()
  group.scale.setScalar(size)
  parent.add(group)

  const limb = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    host: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    length: number,
  ) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, y, z)
    host.add(pivot)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = -length
    pivot.add(mesh)
    return pivot
  }

  const legs: Figure['legs'] = [
    limb(LEG, trousers, group, 0, HIP_Y, -0.042, 0.145),
    limb(LEG, trousers, group, 0, HIP_Y, 0.042, 0.145),
  ]

  const upper = new THREE.Group()
  upper.position.y = HIP_Y
  group.add(upper)

  // Only the torso casts a shadow: at this size nobody can tell, and it saves
  // about eight shadow draw calls per person.
  const torso = addShadowed(new THREE.Mesh(TORSO, shirt), upper, true, false)
  torso.position.y = 0.12

  const arms: Figure['arms'] = [
    limb(ARM, skin, upper, 0, 0.21, -0.1, 0.1),
    limb(ARM, skin, upper, 0, 0.21, 0.1, 0.1),
  ]

  const head = new THREE.Mesh(HEAD, skin)
  head.position.y = 0.31
  upper.add(head)

  if (hat) {
    const salakot = new THREE.Mesh(HAT, std(SALAKOT))
    salakot.position.y = 0.4
    upper.add(salakot)
  } else {
    const hair = new THREE.Mesh(HAIR_CAP, std(random.pick(HAIR)))
    hair.position.y = 0.318
    upper.add(hair)
  }

  if (umbrella) {
    const shaft = new THREE.Mesh(
      rod([0.05, 0.14, 0.11], [0.05, 0.62, 0.11], 0.009),
      std('#3b3b3b'),
    )
    const canopy = addShadowed(
      new THREE.Mesh(
        CANOPY,
        std(random.pick(UMBRELLAS), { side: THREE.DoubleSide }),
      ),
      upper,
      true,
      false,
    )
    canopy.position.set(0.05, 0.54, 0.11)
    arms[1].rotation.z = 1.1
    upper.add(shaft)
  }

  return { group, upper, legs, arms }
}

export function addWalkers(
  scene: THREE.Scene,
  random: Random,
  raining: boolean,
): Walker[] {
  return WALKERS.map(({ size = 1, hat, ...walker }) => {
    const umbrella = raining && !hat
    return {
      ...walker,
      figure: addFigure(scene, random, { size, hat, umbrella }),
      size,
      umbrella,
    }
  })
}

export function updateWalkers(walkers: Walker[], time: number, night: number) {
  for (const walker of walkers) {
    const { figure, z, direction, speed, offset, size } = walker
    const { x, scale } = alongRoad(time * speed + offset, direction)
    const { group, legs, arms } = figure
    const swing = Math.sin(time * speed * 13 + offset) * 0.6

    group.position.set(x, 0.03 + Math.abs(swing) * 0.012, z)
    group.rotation.y = direction > 0 ? 0 : Math.PI
    group.scale.setScalar(Math.max(scale, 0.001) * size)
    group.visible = scale > 0.01 && (walker.nightOwl || night < 0.7)

    legs[0].rotation.z = swing
    legs[1].rotation.z = -swing
    arms[0].rotation.z = -swing * 0.7
    if (!walker.umbrella) arms[1].rotation.z = swing * 0.7
  }
}

export function addFarmers(
  scene: THREE.Scene,
  random: Random,
  spots: Point[],
): Farmer[] {
  return spots.map(([x, y, z]) => {
    const figure = addFigure(scene, random, { hat: true })
    figure.group.position.set(x, y, z)
    figure.group.rotation.y = random.next() * Math.PI * 2
    return { figure, phase: random.next() * 6.28 }
  })
}

// Bent over planting, and gone from the fields once it's dark.
export function updateFarmers(farmers: Farmer[], time: number, night: number) {
  for (const { figure, phase } of farmers) {
    const reach = Math.sin(time * 1.5 + phase)
    figure.upper.rotation.z = -0.95 + reach * 0.16
    figure.arms[0].rotation.z = 0.9 + reach * 0.35
    figure.arms[1].rotation.z = 0.9 - reach * 0.35
    figure.group.visible = night < 0.7
  }
}

export function addSitter(
  parent: THREE.Object3D,
  random: Random,
  [x, y, z]: Point,
  angle: number,
) {
  const figure = addFigure(parent, random)
  figure.group.position.set(x, y - HIP_Y, z)
  figure.group.rotation.y = angle
  figure.legs[0].rotation.z = figure.legs[1].rotation.z = Math.PI / 2
  figure.arms[0].rotation.z = figure.arms[1].rotation.z = 0.3
}
