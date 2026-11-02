import * as THREE from 'three'
import type { Climate } from './calendar'
import {
  addMerged,
  rod,
  std,
  type NightLights,
  type Point,
  type Random,
} from './helpers'
import { addGrassTuft } from './nature'

export type Sign = {
  material: THREE.MeshStandardMaterial
  light: THREE.PointLight
  base: number
  current: number
  target: number
}

type SignContext = {
  random: Random
  nightLights: NightLights
  climate: Climate
}

type SignOptions = {
  x: number
  z: number
  label: string
  paint: string
}

const BAMBOO_DRY = new THREE.Color('#bda768')
const BAMBOO_GREEN = new THREE.Color('#7f8a4a')
const BAMBOO_NODE = new THREE.Color('#4f3d1c')
const ROPE_TONE = new THREE.Color('#b08f55')
const PARCHMENT_LIGHT = '#f0dcae'
const PARCHMENT_EDGE = '#c9a56c'
const BLOTCH = new THREE.Color('#a9824a')
const BURNT = '#35200f'
const LAMP_LIGHT = '#ffcf8a'

// The canvas, and the frame built out from it.
const CANVAS_WIDTH = 2.6
const CANVAS_HEIGHT = 1.1
const SIGN_BRIGHTNESS = 1
const TEXTURE_WIDTH = 1024
const TEXT_MAX_WIDTH = 860

// Kept low: the top of the frame stays under the hut's eaves.
const CANVAS_BOTTOM = 0.66
export const SIGN_CENTER_Y = CANVAS_BOTTOM + CANVAS_HEIGHT / 2
const FRAME_GAP = 0.09
const LOWER_RAIL = CANVAS_BOTTOM - FRAME_GAP
const UPPER_RAIL = CANVAS_BOTTOM + CANVAS_HEIGHT + FRAME_GAP
const RAIL_GAP = 0.13
const POST_TOP = UPPER_RAIL + 0.42
const POST_X = CANVAS_WIDTH / 2 + FRAME_GAP
const POST_GAP = 0.13
const RAIL_REACH = POST_X + POST_GAP + 0.28
const RAIL_FORWARD = 0.05

const POLE_RADIUS = 0.042
const NODE_SPACING = 0.5
const LACES_ACROSS = 8
const LACES_DOWN = 3
const LACE_BOW = 0.035

function tinted(geometry: THREE.BufferGeometry, color: THREE.Color) {
  const { count } = geometry.attributes.position
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) colors.set(color.toArray(), i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

// A bamboo pole: segments of mottled dry and green cane, with a dark raised
// ring at each joint.
function bamboo(from: Point, to: Point, radius: number, random: Random) {
  const start = new THREE.Vector3(...from)
  const end = new THREE.Vector3(...to)
  const along = end.clone().sub(start)
  const segments = Math.max(2, Math.round(along.length() / NODE_SPACING))
  const halfRing = along.clone().setLength(0.014)
  const parts: THREE.BufferGeometry[] = []

  for (let segment = 0; segment < segments; segment++) {
    const a = start.clone().addScaledVector(along, segment / segments)
    const b = start.clone().addScaledVector(along, (segment + 1) / segments)
    const cane = BAMBOO_DRY.clone().lerp(BAMBOO_GREEN, random.next() * 0.8)
    parts.push(tinted(rod(a.toArray(), b.toArray(), radius, 8), cane))

    if (segment < segments - 1) {
      const ringStart = b.clone().sub(halfRing).toArray()
      const ringEnd = b.clone().add(halfRing).toArray()
      parts.push(tinted(rod(ringStart, ringEnd, radius * 1.15, 8), BAMBOO_NODE))
    }
  }
  return parts
}

// Rope wound in an X over the spot where the rails cross the posts.
function lashing(x: number, y: number, z: number) {
  const loops: THREE.BufferGeometry[] = []
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    for (const offset of [-0.04, 0, 0.04]) {
      loops.push(
        tinted(
          new THREE.TorusGeometry(0.125, 0.014, 6, 16)
            .scale(1, 1, 0.45)
            .translate(0, 0, offset)
            .rotateY(Math.PI / 2)
            .rotateZ(angle)
            .translate(x, y, z),
          ROPE_TONE,
        ),
      )
    }
  }
  return loops
}

function laceAt(a: THREE.Vector2, b: THREE.Vector2, z: number) {
  return tinted(rod([a.x, a.y, z], [b.x, b.y, z], 0.01, 4), ROPE_TONE)
}

function edgePoints() {
  const halfW = CANVAS_WIDTH / 2
  const halfH = CANVAS_HEIGHT / 2
  const corners = [
    new THREE.Vector2(-halfW, -halfH),
    new THREE.Vector2(halfW, -halfH),
    new THREE.Vector2(halfW, halfH),
    new THREE.Vector2(-halfW, halfH),
  ]
  return corners.map((corner, side) => ({
    from: corner,
    to: corners[(side + 1) % 4],
    laces: side % 2 ? LACES_DOWN : LACES_ACROSS,
  }))
}

// The cloth bows inward between lacing points, as if pulled tight by the rope.
function clothGeometry() {
  const center = new THREE.Vector2()
  const shape = new THREE.Shape()
  const [{ from: firstCorner }] = edgePoints()
  shape.moveTo(firstCorner.x, firstCorner.y)

  for (const { from, to, laces } of edgePoints()) {
    for (let lace = 0; lace < laces; lace++) {
      const start = from.clone().lerp(to, lace / laces)
      const end = from.clone().lerp(to, (lace + 1) / laces)
      const middle = start.clone().lerp(end, 0.5)
      const pull = center.clone().sub(middle).normalize().multiply(
        new THREE.Vector2(
          Math.abs(to.y - from.y) > 0 ? LACE_BOW : 0,
          Math.abs(to.x - from.x) > 0 ? LACE_BOW : 0,
        ),
      )
      const control = middle.add(pull)
      shape.quadraticCurveTo(control.x, control.y, end.x, end.y)
    }
  }

  const geometry = new THREE.ShapeGeometry(shape, 6)
  const { position, uv } = geometry.attributes
  for (let i = 0; i < position.count; i++) {
    uv.setXY(
      i,
      position.getX(i) / CANVAS_WIDTH + 0.5,
      position.getY(i) / CANVAS_HEIGHT + 0.5,
    )
  }
  return geometry
}

// Zigzag cord from the cloth's edge out to the frame around it.
function lacing(centerY: number, z: number) {
  const cords: THREE.BufferGeometry[] = []
  const halfW = CANVAS_WIDTH / 2
  const halfH = CANVAS_HEIGHT / 2
  const center = new THREE.Vector2(0, centerY)

  for (const { from, to, laces } of edgePoints()) {
    const sideways = Math.abs(to.x - from.x) > 0
    for (let lace = 1; lace < laces; lace++) {
      const onCloth = from.clone().lerp(to, lace / laces).add(center)
      const step = 1 / (laces * 2)
      for (const shift of [-step, step]) {
        const onFrame = from
          .clone()
          .lerp(to, lace / laces + shift)
          .add(center)
        if (sideways) {
          onFrame.y = centerY + Math.sign(onCloth.y - centerY) * (halfH + FRAME_GAP)
        } else {
          onFrame.x = Math.sign(onCloth.x) * (halfW + FRAME_GAP)
        }
        cords.push(laceAt(onCloth, onFrame, z))
      }
    }
  }
  return cords
}

function paintCloth(
  context: CanvasRenderingContext2D,
  random: Random,
  width: number,
  height: number,
) {
  const glow = context.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.2,
    width / 2,
    height / 2,
    width * 0.6,
  )
  glow.addColorStop(0, PARCHMENT_LIGHT)
  glow.addColorStop(0.65, PARCHMENT_LIGHT)
  glow.addColorStop(1, PARCHMENT_EDGE)
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  // Soft stains, then the fine fibres of the cloth over them.
  context.fillStyle = BLOTCH.getStyle()
  for (let i = 0; i < 46; i++) {
    context.globalAlpha = 0.02 + random.next() * 0.04
    context.beginPath()
    context.ellipse(
      random.next() * width,
      random.next() * height,
      40 + random.next() * 120,
      24 + random.next() * 70,
      random.next() * 3,
      0,
      Math.PI * 2,
    )
    context.fill()
  }

  context.strokeStyle = BLOTCH.getStyle()
  context.lineWidth = 1
  for (let i = 0; i < 700; i++) {
    const x = random.next() * width
    const y = random.next() * height
    context.globalAlpha = 0.05 + random.next() * 0.09
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + 8 + random.next() * 34, y + (random.next() - 0.5) * 3)
    context.stroke()
  }
  context.globalAlpha = 1
}

// Letters burnt into the cloth, with one stroke of the section's paint.
function signTexture(random: Random, text: string, paint: string) {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_WIDTH
  canvas.height = Math.round((TEXTURE_WIDTH * CANVAS_HEIGHT) / CANVAS_WIDTH)
  const context = canvas.getContext('2d')!
  const { width, height } = canvas

  paintCloth(context, random, width, height)

  context.font = '800 196px Bitter, Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgb(40 20 8 / 0.5)'
  context.shadowBlur = 6
  context.fillStyle = BURNT
  context.fillText(text, width / 2, height * 0.47, TEXT_MAX_WIDTH)

  context.shadowBlur = 0
  context.fillStyle = paint
  context.fillRect(width * 0.3, height * 0.76, width * 0.4, 12)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export function addStandingSign(
  parent: THREE.Object3D,
  { x, z, label, paint }: SignOptions,
  { random, nightLights, climate }: SignContext,
) {
  const stand = new THREE.Group()
  stand.position.set(x, 0, z)
  parent.add(stand)

  const parts: THREE.BufferGeometry[] = []

  // A pair of posts on each side, planted in a tuft of grass.
  for (const side of [-1, 1]) {
    const inner = side * POST_X
    const outer = side * (POST_X + POST_GAP)
    parts.push(
      ...bamboo([inner, 0, 0], [inner, POST_TOP, 0], POLE_RADIUS, random),
      ...bamboo([outer, 0, 0], [outer, POST_TOP + 0.1, 0], POLE_RADIUS, random),
    )
    addGrassTuft(stand, random, climate, side * (POST_X + POST_GAP / 2), 0)
  }

  // A pair of rails above the cloth and a pair below, tied across the posts.
  const railsAt = [
    UPPER_RAIL,
    UPPER_RAIL + RAIL_GAP,
    LOWER_RAIL,
    LOWER_RAIL - RAIL_GAP,
  ]
  for (const y of railsAt) {
    const shift = (random.next() - 0.5) * 0.1
    parts.push(
      ...bamboo(
        [-RAIL_REACH + shift, y, RAIL_FORWARD],
        [RAIL_REACH + shift, y, RAIL_FORWARD],
        POLE_RADIUS,
        random,
      ),
    )
  }
  for (const side of [-1, 1]) {
    const postX = side * (POST_X + POST_GAP / 2)
    parts.push(
      ...lashing(postX, UPPER_RAIL + RAIL_GAP / 2, RAIL_FORWARD / 2),
      ...lashing(postX, LOWER_RAIL - RAIL_GAP / 2, RAIL_FORWARD / 2),
    )
  }
  parts.push(
    ...lacing(SIGN_CENTER_Y, 0.01),
    tinted(
      rod(
        [0, UPPER_RAIL, RAIL_FORWARD + 0.04],
        [0, UPPER_RAIL - 0.1, RAIL_FORWARD + 0.1],
        0.006,
        4,
      ),
      ROPE_TONE,
    ),
  )

  const frame = addMerged(
    parts,
    std('#ffffff', { vertexColors: true, roughness: 0.6 }),
    stand,
  )

  const map = signTexture(random, label, paint)
  const material = std('#ffffff', {
    map,
    emissive: '#ffffff',
    emissiveMap: map,
    emissiveIntensity: 0,
  })
  material.color.setScalar(SIGN_BRIGHTNESS)

  // Two faces back to back, so the label reads properly from either side.
  const cloth = clothGeometry()
  const faces = [0, Math.PI].map((turn) => {
    const face = new THREE.Mesh(cloth, material)
    face.position.y = SIGN_CENTER_Y
    face.rotation.y = turn
    face.castShadow = true
    stand.add(face)
    return face
  })

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 10, 8),
    nightLights.glow(LAMP_LIGHT, 2.2, '#a1906a'),
  )
  lamp.position.set(0, UPPER_RAIL - 0.13, RAIL_FORWARD + 0.11)
  stand.add(lamp)

  const light = new THREE.PointLight(LAMP_LIGHT, 0, 4, 2)
  light.position.set(0, SIGN_CENTER_Y + 0.3, 0.9)
  stand.add(light)

  const sign: Sign = {
    material,
    light,
    base: SIGN_BRIGHTNESS,
    current: SIGN_BRIGHTNESS,
    target: SIGN_BRIGHTNESS,
  }

  return { sign, meshes: [frame, ...faces] }
}
