import * as THREE from 'three'
import type { Festivity, Season } from './calendar'
import {
  addMerged,
  addShadowed,
  paintedTexture,
  rod,
  std,
  type NightLights,
  type Point,
  type Random,
} from './helpers'

export type Parol = {
  pivot: THREE.Group
  star: THREE.Mesh
  phase: number
}

type Flag = {
  positions: THREE.BufferAttribute
  geometry: THREE.PlaneGeometry
  rest: Float32Array
}

type Shell = {
  points: THREE.Points
  positions: THREE.BufferAttribute
  directions: THREE.Vector3[]
  material: THREE.PointsMaterial
  origin: THREE.Vector3
  phase: number
  cycle: number
}

export type Decorations = {
  lanterns: Parol[]
  bulbs: THREE.PointsMaterial | null
  flag: Flag | null
  rain: THREE.Group | null
  fireworks: Shell[]
}

// Bamboo poles either side of the road. Wires zigzag between them, in the
// stretches where they don't hang in front of a sign in the opening view.
const WIRE_RUNS: [x: number, z: number][][] = [
  [
    [-11, -2.7],
    [-8, 2.7],
    [-4.5, -2.7],
  ],
  [
    [0.2, -2.7],
    [3.4, 2.7],
    [7, -2.7],
  ],
  [
    [15.2, 2.7],
    [16.6, -2.7],
  ],
]
const WIRE_HEIGHT = 5
const WIRE_SAG = 0.45
const WIRE_SEGMENTS = 20
const BAMBOO = '#b59a57'

const PAROL_COLORS = [
  '#ff5e7a',
  '#ffd34f',
  '#5ee0ff',
  '#b57dff',
  '#7dff9a',
  '#ff9a4f',
]
const HEART_COLORS = ['#ff5e7a', '#ff3b6b', '#ff9ec1']
const FIREWORK_COLORS = ['#ffd34f', '#ff5e7a', '#5ee0ff', '#7dff9a', '#ffffff']

const BANDERITAS: Partial<Record<Festivity, string[]>> = {
  bagongTaon: ['#ffd34f', '#f4f1e6', '#d8312f'],
  puso: ['#ff5e7a', '#ffffff', '#d8315b'],
  flores: ['#ff5e7a', '#ffd34f', '#3fb6e8', '#58c76b', '#a667e0', '#ffffff'],
  kalayaan: ['#0038a8', '#ffffff', '#ce1126', '#fcd116'],
}

const RAIN_HEIGHT = 24
const RAIN_DROPS = 950
const RAIN_SPEED = 13

const SHELLS = 6
const SPARKS = 70
const SHELL_CYCLE = 4.6
const SHELL_LIFE = 2.3
const SHELL_RADIUS = 5.6
const SPARK_GLOW = 1.5

function starShape(outer = 0.34, inner = 0.15) {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? inner : outer
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i) shape.lineTo(x, y)
    else shape.moveTo(x, y)
  }
  return shape
}

function heartShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.3)
  shape.bezierCurveTo(-0.46, 0.02, -0.34, 0.36, 0, 0.15)
  shape.bezierCurveTo(0.34, 0.36, 0.46, 0.02, 0, -0.3)
  return shape
}

function lanternGeometry(shape: THREE.Shape) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 1,
  })
  geometry.center()
  return geometry
}

const STAR = lanternGeometry(starShape())
const HEART = lanternGeometry(heartShape())
const STRING = new THREE.CylinderGeometry(0.006, 0.006, 0.25, 4)
const TAIL = new THREE.BoxGeometry(0.015, 0.32, 0.015)

function addLantern(
  parent: THREE.Object3D,
  random: Random,
  nightLights: NightLights,
  [x, y, z]: Point,
  geometry: THREE.BufferGeometry,
  color: string,
): Parol {
  const pivot = new THREE.Group()
  pivot.position.set(x, y, z)
  parent.add(pivot)

  const star = new THREE.Mesh(geometry, nightLights.glow(color, 1.5, color))
  star.position.y = -0.42
  pivot.add(star)

  const string = new THREE.Mesh(
    STRING,
    new THREE.MeshBasicMaterial({ color: '#555a6a' }),
  )
  string.position.y = -0.12
  pivot.add(string)

  for (const offset of [-0.06, 0.06]) {
    const tail = new THREE.Mesh(TAIL, nightLights.glow(color, 1.1, color))
    tail.position.set(offset, -0.88, 0)
    pivot.add(tail)
  }

  return { pivot, star, phase: random.next() * 6.28 }
}

export function addParol(
  parent: THREE.Object3D,
  random: Random,
  nightLights: NightLights,
  position: Point,
) {
  const color = random.pick(PAROL_COLORS)
  return addLantern(parent, random, nightLights, position, STAR, color)
}

// Hangs between two poles, and returns its sag curve.
function addWire(
  scene: THREE.Scene,
  [fromX, fromZ]: [number, number],
  [toX, toZ]: [number, number],
) {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= WIRE_SEGMENTS; i++) {
    const t = i / WIRE_SEGMENTS
    points.push(
      new THREE.Vector3(
        fromX + (toX - fromX) * t,
        WIRE_HEIGHT - Math.sin(t * Math.PI) * WIRE_SAG,
        fromZ + (toZ - fromZ) * t,
      ),
    )
  }
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: '#4a4034' }),
    ),
  )
  return points
}

function addWirePoles(scene: THREE.Scene) {
  addMerged(
    WIRE_RUNS.flat().map(([x, z]) =>
      rod([x, 0, z], [x, WIRE_HEIGHT + 0.05, z], 0.045, 7),
    ),
    std(BAMBOO, { roughness: 0.7 }),
    scene,
  )
}

function addLanternsToWire(
  scene: THREE.Scene,
  random: Random,
  nightLights: NightLights,
  points: THREE.Vector3[],
  geometry: THREE.BufferGeometry,
  colors: string[],
) {
  return [0.25, 0.5, 0.75].map((t) => {
    const { x, y, z } = points[Math.round(t * WIRE_SEGMENTS)]
    return addLantern(
      scene,
      random,
      nightLights,
      [x, y, z],
      geometry,
      random.pick(colors),
    )
  })
}

function addBanderitas(
  scene: THREE.Scene,
  points: THREE.Vector3[],
  colors: string[],
) {
  const positions: number[] = []
  const paints: number[] = []
  const paint = new THREE.Color()

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const middle = a.clone().lerp(b, 0.5)
    positions.push(
      ...a.clone().lerp(b, 0.04).toArray(),
      ...b.clone().lerp(a, 0.04).toArray(),
      middle.x,
      middle.y - 0.3,
      middle.z,
    )
    paint.set(colors[i % colors.length])
    for (let corner = 0; corner < 3; corner++) paints.push(...paint.toArray())
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(paints, 3))
  geometry.computeVertexNormals()
  addShadowed(
    new THREE.Mesh(
      geometry,
      std('#ffffff', { vertexColors: true, side: THREE.DoubleSide }),
    ),
    scene,
  )
}

// Christmas lights strung along a wire; opacity pulses them all together.
function addBulbs(
  scene: THREE.Scene,
  random: Random,
  wires: THREE.Vector3[][],
) {
  const points = wires.flat()
  const colors = new Float32Array(points.length * 3)
  const color = new THREE.Color()
  points.forEach((_, i) => {
    color.set(random.pick(PAROL_COLORS)).multiplyScalar(2.2)
    colors.set(color.toArray(), i * 3)
  })

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.11,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  scene.add(new THREE.Points(geometry, material))
  return material
}

function paintFlag(context: CanvasRenderingContext2D) {
  // Drawn at the flag's 2:1 shape, then stretched to fill the square canvas.
  context.scale(1, 2)
  context.fillStyle = '#0038a8'
  context.fillRect(0, 0, 256, 64)
  context.fillStyle = '#ce1126'
  context.fillRect(0, 64, 256, 64)

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.moveTo(0, 0)
  context.lineTo(111, 64)
  context.lineTo(0, 128)
  context.fill()

  context.fillStyle = '#fcd116'
  context.beginPath()
  context.arc(37, 64, 10, 0, Math.PI * 2)
  context.fill()
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2
    const across = angle + Math.PI / 2
    context.beginPath()
    context.moveTo(37 + Math.cos(across) * 3, 64 + Math.sin(across) * 3)
    context.lineTo(37 + Math.cos(angle) * 21, 64 + Math.sin(angle) * 21)
    context.lineTo(37 - Math.cos(across) * 3, 64 - Math.sin(across) * 3)
    context.fill()
  }

  for (const [x, y] of [
    [12, 18],
    [12, 110],
    [88, 64],
  ]) {
    context.beginPath()
    context.arc(x, y, 5, 0, Math.PI * 2)
    context.fill()
  }
}

function addFlag(scene: THREE.Scene, x: number, z: number): Flag {
  const height = 5
  addMerged(
    [rod([x, 0, z], [x, height, z], 0.035, 8)],
    std('#d9d9d9', { metalness: 0.4, roughness: 0.4 }),
    scene,
  )

  const geometry = new THREE.PlaneGeometry(1.7, 0.85, 18, 6)
  const flag = addShadowed(
    new THREE.Mesh(
      geometry,
      std('#ffffff', {
        map: paintedTexture(256, paintFlag),
        side: THREE.DoubleSide,
      }),
    ),
    scene,
  )
  flag.position.set(x + 0.87, height - 0.45, z)

  const positions = geometry.attributes.position as THREE.BufferAttribute
  return { positions, geometry, rest: new Float32Array(positions.array) }
}

function addRain(scene: THREE.Scene, random: Random) {
  const positions = new Float32Array(RAIN_DROPS * 6)
  for (let i = 0; i < RAIN_DROPS; i++) {
    const x = (random.next() - 0.5) * 72
    const y = random.next() * RAIN_HEIGHT
    const z = (random.next() - 0.5) * 62
    positions.set([x, y, z, x + 0.05, y + 0.55, z], i * 6)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: '#d5e4f2',
    transparent: true,
    opacity: 0.42,
  })

  // Two stacked copies scrolling down read as endless rain with no per-drop work.
  const rain = new THREE.Group()
  for (const y of [0, RAIN_HEIGHT]) {
    const drops = new THREE.LineSegments(geometry, material)
    drops.position.y = y
    rain.add(drops)
  }
  scene.add(rain)
  return rain
}

function sparkTexture() {
  return paintedTexture(32, (context) => {
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgb(255 255 255 / 1)')
    gradient.addColorStop(0.4, 'rgb(255 255 255 / 0.7)')
    gradient.addColorStop(1, 'rgb(255 255 255 / 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 32, 32)
  })
}

function addFireworks(scene: THREE.Scene): Shell[] {
  const shells: Shell[] = []
  const spark = sparkTexture()

  for (let i = 0; i < SHELLS; i++) {
    const positions = new THREE.BufferAttribute(
      new Float32Array(SPARKS * 3),
      3,
    )
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', positions)
    const material = new THREE.PointsMaterial({
      size: 0.62,
      map: spark,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    points.visible = false
    scene.add(points)

    shells.push({
      points,
      positions,
      material,
      directions: Array.from({ length: SPARKS }, () =>
        new THREE.Vector3().randomDirection(),
      ),
      origin: new THREE.Vector3(),
      phase: (i / SHELLS) * SHELL_CYCLE,
      cycle: -1,
    })
  }
  return shells
}

export function addDecorations(
  scene: THREE.Scene,
  random: Random,
  nightLights: NightLights,
  { climate, festivity }: Season,
  reducedMotion: boolean,
): Decorations {
  const decorations: Decorations = {
    lanterns: [],
    bulbs: null,
    flag: null,
    rain: null,
    fireworks: [],
  }

  if (climate === 'tagUlan' && !reducedMotion) {
    decorations.rain = addRain(scene, random)
  }
  if (!festivity) return decorations

  addWirePoles(scene)
  const wires = WIRE_RUNS.flatMap((run) =>
    run.slice(1).map((pole, i) => addWire(scene, run[i], pole)),
  )
  const colors = BANDERITAS[festivity]
  if (colors) wires.forEach((wire) => addBanderitas(scene, wire, colors))

  if (festivity === 'pasko') {
    decorations.bulbs = addBulbs(scene, random, wires)
    for (const wire of wires) {
      decorations.lanterns.push(
        ...addLanternsToWire(scene, random, nightLights, wire, STAR, PAROL_COLORS),
      )
    }
  }
  if (festivity === 'puso') {
    for (const wire of wires) {
      decorations.lanterns.push(
        ...addLanternsToWire(scene, random, nightLights, wire, HEART, HEART_COLORS),
      )
    }
  }
  if (festivity === 'kalayaan') decorations.flag = addFlag(scene, 18.4, 3.1)
  if (festivity === 'bagongTaon' && !reducedMotion) {
    decorations.fireworks = addFireworks(scene)
  }

  return decorations
}

function updateFlag({ positions, geometry, rest }: Flag, time: number) {
  for (let i = 0; i < positions.count; i++) {
    const x = rest[i * 3]
    const reach = (x + 0.85) / 1.7
    positions.setZ(i, Math.sin(x * 5 - time * 4) * 0.09 * reach)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
}

function updateFireworks(
  shells: Shell[],
  random: Random,
  time: number,
  night: number,
) {
  for (const shell of shells) {
    const { points, positions, directions, material, origin } = shell
    const progress = time + shell.phase
    const cycle = Math.floor(progress / SHELL_CYCLE)
    const age = progress - cycle * SHELL_CYCLE

    if (cycle !== shell.cycle) {
      shell.cycle = cycle
      const angle = random.next() * Math.PI * 2
      const reach = 6 + random.next() * 18
      origin.set(
        Math.cos(angle) * reach,
        11 + random.next() * 9,
        Math.sin(angle) * reach,
      )
      material.color
        .set(random.pick(FIREWORK_COLORS))
        .multiplyScalar(SPARK_GLOW)
    }

    points.visible = night > 0.5 && age < SHELL_LIFE
    if (!points.visible) continue

    const life = age / SHELL_LIFE
    const burst = (1 - (1 - life) ** 3) * SHELL_RADIUS
    const fall = age * age * 0.6
    directions.forEach(({ x, y, z }, i) => {
      positions.setXYZ(
        i,
        origin.x + x * burst,
        origin.y + y * burst - fall,
        origin.z + z * burst,
      )
    })
    positions.needsUpdate = true
    material.opacity = 1 - life * life
  }
}

export function updateDecorations(
  { lanterns, bulbs, flag, rain, fireworks }: Decorations,
  random: Random,
  time: number,
  night: number,
) {
  for (const { pivot, star, phase } of lanterns) {
    pivot.rotation.x = Math.sin(time * 1.3 + phase) * 0.12
    star.rotation.z = Math.sin(time * 0.7 + phase) * 0.25
  }

  if (bulbs) bulbs.opacity = (0.65 + Math.sin(time * 3) * 0.35) * night
  if (flag) updateFlag(flag, time)
  if (rain) rain.position.y = -((time * RAIN_SPEED) % RAIN_HEIGHT)
  updateFireworks(fireworks, random, time, night)
}
