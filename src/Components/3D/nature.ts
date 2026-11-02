import * as THREE from 'three'
import type { Climate } from './calendar'
import { addMerged, box, rod, std, type Random } from './helpers'

export type Swaying = {
  object: THREE.Object3D
  phase: number
  amount: number
  speed: number
}

type Field = {
  x: number
  z: number
  w: number
  d: number
}

const BAMBOO = '#b59a57'
const BARK = '#7d6346'
const WATER = '#5c8794'
const BUND = '#7a6042'
const CARABAO = '#3c3a3f'

const LEAVES: Record<Climate, string> = {
  amihan: '#3f8f3e',
  tagInit: '#7f9c3b',
  tagUlan: '#2d7d3c',
}
const RICE: Record<Climate, string> = {
  amihan: '#86b94a',
  tagInit: '#dcb03c',
  tagUlan: '#55ac50',
}

// A folded leaf that rises from the origin along +x, then droops.
function leafGeometry(length: number, width: number, droop: number) {
  const segments = 8
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = length * t * (1 - 0.15 * t)
    const y = length * (0.34 * t - droop * t * t)
    const half = width * Math.sin(Math.PI * Math.min(t + 0.04, 1)) ** 0.6
    positions.push(x, y - half * 0.3, -half, x, y, 0, x, y - half * 0.3, half)
  }
  for (let i = 0; i < segments; i++) {
    for (let side = 0; side < 2; side++) {
      const a = i * 3 + side
      indices.push(a, a + 1, a + 4, a, a + 4, a + 3)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function leafCrown(
  random: Random,
  count: number,
  length: number,
  width: number,
  droop: number,
) {
  const leaf = leafGeometry(length, width, droop)
  const leaves: THREE.BufferGeometry[] = []

  for (let i = 0; i < count; i++) {
    leaves.push(
      leaf
        .clone()
        .rotateZ((random.next() - 0.5) * 0.35)
        .rotateY((i / count) * Math.PI * 2 + random.next() * 0.3),
    )
  }
  return leaves
}

export function addPalm(
  scene: THREE.Scene,
  random: Random,
  climate: Climate,
  x: number,
  z: number,
  height: number,
): Swaying {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)

  const leanX = (random.next() - 0.5) * 1.4
  const leanZ = (random.next() - 0.5) * 1.4
  const top = new THREE.Vector3(leanX, height, leanZ)
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(),
    new THREE.Vector3(leanX * 0.1, height * 0.6, leanZ * 0.1),
    top,
  )
  addMerged(
    [new THREE.TubeGeometry(curve, 8, 0.085, 7)],
    std(BARK),
    group,
  )

  const crown = addMerged(
    leafCrown(random, 10, 1.55, 0.17, 0.9),
    std(LEAVES[climate], { side: THREE.DoubleSide, flatShading: true }),
    group,
  )
  crown.position.copy(top)

  const coconuts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    coconuts.push(
      new THREE.SphereGeometry(0.085, 8, 6).translate(
        top.x + Math.cos(angle) * 0.13,
        top.y - 0.1,
        top.z + Math.sin(angle) * 0.13,
      ),
    )
  }
  addMerged(coconuts, std('#5a4a2a'), group)

  return {
    object: crown,
    phase: random.next() * 6.28,
    amount: 0.035,
    speed: 0.9,
  }
}

export function addBanana(
  scene: THREE.Scene,
  random: Random,
  climate: Climate,
  x: number,
  z: number,
): Swaying {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.scale.setScalar(0.85 + random.next() * 0.35)
  scene.add(group)

  addMerged(
    [
      rod([0, 0, 0], [0, 0.95, 0], 0.075, 7),
      rod([0.22, 0, 0.1], [0.22, 0.6, 0.1], 0.05, 7),
    ],
    std('#6f8a45'),
    group,
  )

  const crown = addMerged(
    leafCrown(random, 7, 1.05, 0.2, 0.85),
    std(LEAVES[climate], { side: THREE.DoubleSide, flatShading: true }),
    group,
  )
  crown.position.y = 0.92

  return {
    object: crown,
    phase: random.next() * 6.28,
    amount: 0.05,
    speed: 1.2,
  }
}

// Fresh grass around the foot of a sign post, the green of the paddies.
export function addGrassTuft(
  parent: THREE.Object3D,
  random: Random,
  climate: Climate,
  x: number,
  z: number,
) {
  const blades: THREE.BufferGeometry[] = [
    new THREE.SphereGeometry(0.34, 10, 6).scale(1, 0.3, 0.8).translate(x, 0, z),
  ]

  for (let i = 0; i < 70; i++) {
    const angle = random.next() * Math.PI * 2
    const reach = Math.sqrt(random.next()) * 0.34
    const height = 0.16 + random.next() * 0.16
    blades.push(
      new THREE.ConeGeometry(0.036, height, 4)
        .rotateZ((random.next() - 0.5) * 0.7)
        .rotateX((random.next() - 0.5) * 0.7)
        .translate(
          x + Math.cos(angle) * reach,
          height / 2,
          z + Math.sin(angle) * reach * 0.8,
        ),
    )
  }

  addMerged(blades, std(RICE[climate], { flatShading: true }), parent, false)
}

export function addShadeTree(
  scene: THREE.Scene,
  random: Random,
  climate: Climate,
  x: number,
  z: number,
  size: number,
) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)

  addMerged(
    [
      rod([0, 0, 0], [0.1, 1.5 * size, 0], 0.17 * size, 8),
      rod([0.1, 1.2 * size, 0], [0.8 * size, 2.1 * size, 0.3], 0.08 * size),
      rod([0.1, 1.2 * size, 0], [-0.7 * size, 2.1 * size, -0.3], 0.08 * size),
    ],
    std(BARK),
    group,
  )

  const canopy: THREE.BufferGeometry[] = []
  const fruit: THREE.BufferGeometry[] = []
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2
    const spread = i ? 1 + random.next() * 0.3 : 0
    const px = Math.cos(angle) * spread * size
    const py = (2.5 + random.next() * 0.8) * size
    const pz = Math.sin(angle) * spread * size

    canopy.push(
      new THREE.IcosahedronGeometry((0.95 + random.next() * 0.4) * size, 1)
        .scale(1, 0.8, 1)
        .translate(px, py, pz),
    )
    fruit.push(
      new THREE.SphereGeometry(0.09, 8, 6)
        .scale(0.8, 1.15, 0.8)
        .translate(px * 1.6, py - 0.55 * size, pz * 1.6),
    )
  }
  addMerged(canopy, std(LEAVES[climate], { flatShading: true }), group)

  // Mangoes ripen with the hot months.
  if (climate === 'tagInit') addMerged(fruit, std('#f0b429'), group)
}

export function addBush(
  scene: THREE.Scene,
  random: Random,
  climate: Climate,
  x: number,
  z: number,
) {
  const flowers: THREE.BufferGeometry[] = []
  for (let i = 0; i < 9; i++) {
    const angle = random.next() * Math.PI * 2
    flowers.push(
      new THREE.SphereGeometry(0.045, 6, 5).translate(
        x + Math.cos(angle) * 0.31,
        0.22 + random.next() * 0.28,
        z + Math.sin(angle) * 0.31,
      ),
    )
  }

  addMerged(
    [
      new THREE.IcosahedronGeometry(0.36, 1)
        .scale(1, 0.85, 1)
        .translate(x, 0.28, z),
    ],
    std(LEAVES[climate], { flatShading: true }),
    scene,
  )
  addMerged(flowers, std('#e8344e'), scene, false)
}

export function addFence(
  scene: THREE.Scene,
  fromX: number,
  toX: number,
  z: number,
) {
  const parts: THREE.BufferGeometry[] = [
    rod([fromX, 0.3, z], [toX, 0.3, z], 0.018),
    rod([fromX, 0.52, z], [toX, 0.52, z], 0.018),
  ]
  for (let x = fromX; x <= toX; x += 0.42) {
    parts.push(rod([x, 0, z], [x, 0.66, z], 0.02, 5))
  }
  addMerged(parts, std(BAMBOO, { roughness: 0.7 }), scene)
}

export function addPaddy(
  scene: THREE.Scene,
  random: Random,
  climate: Climate,
  { x, z, w, d }: Field,
) {
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.02, d),
    std(WATER, { roughness: 0.18, metalness: 0.25 }),
  )
  water.position.set(x, 0.012, z)
  water.receiveShadow = true
  scene.add(water)

  const bund = 0.14
  addMerged(
    [
      box(w + bund, 0.09, bund, [x, 0.045, z - d / 2]),
      box(w + bund, 0.09, bund, [x, 0.045, z + d / 2]),
      box(bund, 0.09, d + bund, [x - w / 2, 0.045, z]),
      box(bund, 0.09, d + bund, [x + w / 2, 0.045, z]),
    ],
    std(BUND),
    scene,
    false,
  )

  const spacing = 0.26
  const columns = Math.floor((w - 0.3) / spacing)
  const rows = Math.floor((d - 0.3) / spacing)
  const rice = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.06, 0.34, 5),
    std('#ffffff'),
    columns * rows,
  )

  const matrix = new THREE.Matrix4()
  const tint = new THREE.Color()
  const base = new THREE.Color(RICE[climate])
  const position = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const tilt = new THREE.Euler()

  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const height = 0.8 + random.next() * 0.5
      position.set(
        x - (w - 0.3) / 2 + column * spacing + random.next() * 0.04,
        0.02 + 0.15 * height,
        z - (d - 0.3) / 2 + row * spacing + random.next() * 0.04,
      )
      tilt.set((random.next() - 0.5) * 0.3, 0, (random.next() - 0.5) * 0.3)
      rotation.setFromEuler(tilt)
      scale.set(1, height, 1)
      matrix.compose(position, rotation, scale)

      const index = column * rows + row
      rice.setMatrixAt(index, matrix)
      tint.copy(base).offsetHSL(0, 0, (random.next() - 0.5) * 0.1)
      rice.setColorAt(index, tint)
    }
  }
  scene.add(rice)
}

export function addCarabao(
  scene: THREE.Scene,
  random: Random,
  x: number,
  z: number,
  angle: number,
): Swaying {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = angle
  scene.add(group)

  const hide = std(CARABAO, { roughness: 0.6 })
  const body = new THREE.CapsuleGeometry(0.26, 0.62, 4, 10).rotateZ(Math.PI / 2)
  body.translate(0, 0.56, 0)

  const parts: THREE.BufferGeometry[] = [
    body,
    rod([-0.58, 0.68, 0], [-0.68, 0.32, 0], 0.016, 5),
  ]
  for (const legX of [-0.36, 0.36]) {
    for (const legZ of [-0.15, 0.15]) {
      parts.push(rod([legX, 0, legZ], [legX, 0.42, legZ], 0.058, 7))
    }
  }
  addMerged(parts, hide, group)

  // Head on its own pivot so it can dip down to graze.
  const neck = new THREE.Group()
  neck.position.set(0.56, 0.62, 0)
  group.add(neck)

  const horns = rod([0.2, 0.14, -0.3], [0.2, 0.08, 0.3], 0.024, 6)
  addMerged(
    [
      box(0.32, 0.2, 0.2, [0.2, 0.0, 0]),
      box(0.14, 0.13, 0.15, [0.39, -0.03, 0]),
      horns,
    ],
    hide,
    neck,
  )

  return {
    object: neck,
    phase: random.next() * 6.28,
    amount: 0.22,
    speed: 0.5,
  }
}

export function addChicken(
  scene: THREE.Scene,
  random: Random,
  x: number,
  z: number,
): Swaying {
  const group = new THREE.Group()
  group.position.set(x, 0.03, z)
  group.rotation.y = random.next() * Math.PI * 2
  scene.add(group)

  addMerged(
    [
      new THREE.SphereGeometry(0.07, 8, 6).scale(1.25, 0.95, 0.9).translate(0, 0.13, 0),
      new THREE.SphereGeometry(0.04, 8, 6).translate(0.08, 0.21, 0),
      new THREE.ConeGeometry(0.03, 0.09, 5).rotateZ(0.7).translate(-0.1, 0.19, 0),
    ],
    std(random.pick(['#a8552c', '#e4ddcb', '#3a2c26'])),
    group,
  )
  addMerged(
    [rod([0, 0, 0.02], [0, 0.08, 0.02], 0.007, 4), rod([0, 0, -0.02], [0, 0.08, -0.02], 0.007, 4)],
    std('#d6a23a'),
    group,
    false,
  )

  return {
    object: group,
    phase: random.next() * 6.28,
    amount: 0.35,
    speed: 2.6,
  }
}

export function updateSwaying(swaying: Swaying[], time: number) {
  for (const { object, phase, amount, speed } of swaying) {
    object.rotation.z = -Math.abs(Math.sin(time * speed + phase)) * amount
  }
}
