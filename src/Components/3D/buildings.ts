import * as THREE from 'three'
import { SECTIONS, type SectionId } from '../Page/sections'
import type { Climate } from './calendar'
import { addParol } from './decorations'
import type { Parol } from './decorations'
import {
  addMerged,
  addShadowed,
  box,
  paintedTexture,
  rod,
  shade,
  std,
  type NightLights,
  type Random,
} from './helpers'
import { addStandingSign, SIGN_CENTER_Y, type Sign } from './signs'

export type Landmark = {
  x: number
  z: number
  d: number
  h: number
  signX: number
  signY: number
  facing: number
  sign: Sign
}

export type BuildingContext = {
  scene: THREE.Scene
  random: Random
  landmarks: Map<SectionId, Landmark>
  clickables: THREE.Object3D[]
  nightLights: NightLights
  climate: Climate
  // Filled when the season hangs a parol on every hut.
  parols: Parol[] | null
}

type BuildingOptions = {
  id?: SectionId
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
}

const BAMBOO = '#b59a57'
const THATCH = '#8d6b3c'
const WINDOW_LIGHT = '#ffcf8a'
const POST_HEIGHT = 1.05
const WALL_HEIGHT = 1.2
const FLOOR_THICKNESS = 0.1
const EAVE = 0.42
const RIDGE_RATIO = 0.35
// Clear ground beside each landmark hut, where its sign stands.
const SIDE_YARD = 4.4
// How far out from the middle of the road the dirt shoulder ends.
const ROAD_SHOULDER = 2.43
const FOOTPATH = '#a5825a'

function sawaliTexture(random: Random, base: string) {
  const color = new THREE.Color(base)
  const cell = 16

  return paintedTexture(128, (context) => {
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        const x = column * cell
        const y = row * cell
        const across = (row + column) % 2 === 0

        for (let strip = 0; strip < 4; strip++) {
          context.fillStyle = shade(random, color, 0.09)
          if (across) context.fillRect(x, y + strip * 4, cell, 3.4)
          else context.fillRect(x + strip * 4, y, 3.4, cell)
        }
      }
    }
  })
}

function thatchTexture(random: Random) {
  const color = new THREE.Color(THATCH)

  return paintedTexture(256, (context) => {
    context.fillStyle = THATCH
    context.fillRect(0, 0, 256, 256)
    context.lineWidth = 1.4

    for (let row = 0; row < 12; row++) {
      const y = row * 21.4

      for (let i = 0; i < 240; i++) {
        const x = random.next() * 256
        context.strokeStyle = shade(random, color, 0.2)
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(x + (random.next() - 0.5) * 4, y + 18 + random.next() * 8)
        context.stroke()
      }

      context.fillStyle = 'rgb(35 20 8 / 0.4)'
      context.fillRect(0, y + 19, 256, 2.4)
    }
  })
}

// Four slopes rising to a short ridge along the hut's length.
function hipRoofGeometry(w: number, d: number, height: number, ridge: number) {
  const halfW = w / 2
  const halfD = d / 2
  const halfRidge = ridge / 2
  const ridgeU = halfRidge / w

  const eaveFrontLeft = [-halfW, 0, halfD]
  const eaveFrontRight = [halfW, 0, halfD]
  const eaveBackRight = [halfW, 0, -halfD]
  const eaveBackLeft = [-halfW, 0, -halfD]
  const ridgeLeft = [-halfRidge, height, 0]
  const ridgeRight = [halfRidge, height, 0]

  const slopes = [
    [eaveFrontLeft, eaveFrontRight, ridgeRight, ridgeLeft],
    [eaveBackRight, eaveBackLeft, ridgeLeft, ridgeRight],
  ]
  const ends = [
    [eaveFrontRight, eaveBackRight, ridgeRight],
    [eaveBackLeft, eaveFrontLeft, ridgeLeft],
  ]

  const positions: number[] = []
  const uvs: number[] = []
  for (const [a, b, c, e] of slopes) {
    positions.push(...a, ...b, ...c, ...a, ...c, ...e)
    uvs.push(0, 0, 1, 0, 0.5 + ridgeU, 1, 0, 0, 0.5 + ridgeU, 1, 0.5 - ridgeU, 1)
  }
  for (const [a, b, c] of ends) {
    positions.push(...a, ...b, ...c)
    uvs.push(0, 0, 1, 0, 0.5, 1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  return geometry
}

export function addBuilding(
  { id, x, z, w, d, h, color }: BuildingOptions,
  {
    scene,
    random,
    landmarks,
    clickables,
    nightLights,
    climate,
    parols,
  }: BuildingContext,
) {
  // Built facing +z, then turned so the front always faces the road.
  const facing = z < 0 ? 1 : -1
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = facing > 0 ? 0 : Math.PI
  scene.add(group)

  const floorY = POST_HEIGHT + FLOOR_THICKNESS
  const roofY = floorY + WALL_HEIGHT
  const roofHeight = h - roofY
  const frontZ = d / 2
  const doorX = w * 0.22

  const framing: THREE.BufferGeometry[] = [
    box(w + 0.24, FLOOR_THICKNESS, d + 0.24, [
      0,
      POST_HEIGHT + FLOOR_THICKNESS / 2,
      0,
    ]),
  ]
  for (const postX of [-w / 2, 0, w / 2]) {
    for (const postZ of [-d / 2, d / 2]) {
      framing.push(rod([postX, 0, postZ], [postX, roofY, postZ], 0.055))
    }
  }

  // Bamboo ladder down to the yard.
  const ladderFoot = frontZ + 0.62
  for (const railX of [-0.17, 0.17]) {
    framing.push(
      rod(
        [doorX + railX, 0, ladderFoot],
        [doorX + railX, floorY + 0.06, frontZ + 0.08],
        0.026,
      ),
    )
  }
  for (let rung = 1; rung <= 4; rung++) {
    const t = rung / 5
    const rungY = floorY * t
    const rungZ = ladderFoot + (frontZ + 0.08 - ladderFoot) * t
    framing.push(
      rod([doorX - 0.17, rungY, rungZ], [doorX + 0.17, rungY, rungZ], 0.02),
    )
  }
  const frame = addMerged(framing, std(BAMBOO, { roughness: 0.7 }), group)

  // A worn footpath from the foot of the ladder out to the road.
  const pathEnd = Math.abs(z) - ROAD_SHOULDER
  const pathLength = pathEnd - ladderFoot + 0.15
  addMerged(
    [box(0.5, 0.02, pathLength, [doorX, 0.012, pathEnd - pathLength / 2])],
    std(FOOTPATH),
    group,
    false,
  )

  const sawali = sawaliTexture(random, color)
  sawali.repeat.set(Math.round(w), 1)
  const walls = addShadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(w, WALL_HEIGHT, d),
      std('#ffffff', { map: sawali }),
    ),
    group,
  )
  walls.position.y = floorY + WALL_HEIGHT / 2

  const thatch = thatchTexture(random)
  thatch.repeat.set(2, 1)
  const roofGeometry = hipRoofGeometry(
    w + EAVE * 2,
    d + EAVE * 2,
    roofHeight,
    w * RIDGE_RATIO,
  )
  const roof = addShadowed(
    new THREE.Mesh(
      roofGeometry,
      std('#ffffff', { map: thatch, side: THREE.DoubleSide }),
    ),
    group,
  )
  roof.position.y = roofY

  addMerged(
    [
      rod(
        [(-w * RIDGE_RATIO) / 2, roofY + roofHeight, 0],
        [(w * RIDGE_RATIO) / 2, roofY + roofHeight, 0],
        0.07,
      ),
      box(w + EAVE * 2 + 0.04, 0.06, d + EAVE * 2 + 0.04, [0, roofY, 0]),
    ],
    std('#5e4526'),
    group,
  )

  const lit = nightLights.glow(WINDOW_LIGHT, 0.75 + random.next() * 0.45)
  const openings: [number, number, number, number][] = [
    [doorX, floorY + 0.46, 0.46, 0.86],
    [-w * 0.22, floorY + 0.62, 0.5, 0.42],
  ]
  let door: THREE.Mesh | undefined
  for (const [openingX, openingY, openingW, openingH] of openings) {
    const opening = new THREE.Mesh(
      new THREE.PlaneGeometry(openingW, openingH),
      lit,
    )
    opening.position.set(openingX, openingY, frontZ + 0.012)
    group.add(opening)
    door ??= opening
  }

  // A window at the back too, since the front row shows its back to the camera.
  const backWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), lit)
  backWindow.position.set(0, floorY + 0.62, -frontZ - 0.012)
  backWindow.rotation.y = Math.PI
  group.add(backWindow)

  // Window shutter propped open on a stick, the way a kubo keeps cool.
  const shutter = addShadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.03, 0.4),
      std(BAMBOO, { roughness: 0.7 }),
    ),
    group,
  )
  shutter.position.set(-w * 0.22, floorY + 0.92, frontZ + 0.17)
  shutter.rotation.x = 0.45

  if (parols) {
    parols.push(
      addParol(group, random, nightLights, [doorX, roofY - 0.1, frontZ + EAVE]),
    )
  }

  if (!id) return

  const { label, paint } = SECTIONS[id]

  const awning = addShadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.04, 0.34),
      std(paint, { roughness: 0.6 }),
    ),
    group,
  )
  awning.position.set(doorX, floorY + 1.0, frontZ + 0.15)
  awning.rotation.x = 0.28

  // On the side away from the door, out by the road.
  const signX = -(w / 2 + EAVE + SIDE_YARD / 2)
  const { sign, meshes } = addStandingSign(
    group,
    { x: signX, z: frontZ + EAVE + 0.08, label, paint },
    { random, nightLights, climate },
  )

  for (const mesh of [frame, walls, roof, awning, door, ...meshes]) {
    if (!mesh) continue
    mesh.userData.id = id
    clickables.push(mesh)
  }

  landmarks.set(id, {
    x,
    z,
    d,
    h,
    signX: x + facing * signX,
    signY: SIGN_CENTER_Y,
    facing,
    sign,
  })
}
