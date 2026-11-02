import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { Climate, SkyTime } from './calendar'
import {
  addMerged,
  addShadowed,
  box,
  glow,
  paintedTexture,
  shade,
  std,
  type Random,
} from './helpers'

export type Environment = {
  climate: ClimateLook
  uniforms: {
    top: THREE.IUniform<THREE.Color>
    horizon: THREE.IUniform<THREE.Color>
    bottom: THREE.IUniform<THREE.Color>
  }
  fog: THREE.Fog
  hemisphere: THREE.HemisphereLight
  skyLight: THREE.DirectionalLight
  sun: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
  moon: THREE.Mesh
  stars: THREE.PointsMaterial
  clouds: THREE.Group
  cloudMaterial: THREE.MeshStandardMaterial
}

type ClimateLook = {
  top: THREE.Color
  horizon: THREE.Color
  bottom: THREE.Color
  sunColor: THREE.Color
  sunIntensity: number
  hemisphereIntensity: number
  grass: string
  dirt: string
  starOpacity: number
  cloudCount: number
  cloudColor: string
  fogNear: number
  fogFar: number
}

const NIGHT = {
  top: new THREE.Color('#050714'),
  horizon: new THREE.Color('#161c3a'),
  bottom: new THREE.Color('#0a0e20'),
  hemisphereSky: new THREE.Color('#5a6bb0'),
  hemisphereGround: new THREE.Color('#1a1428'),
  hemisphereIntensity: 1.5,
  moonColor: new THREE.Color('#9fb4ff'),
  moonIntensity: 1.1,
}

const TWILIGHT = {
  top: new THREE.Color('#3b4a8f'),
  horizon: new THREE.Color('#ff9a5a'),
  bottom: new THREE.Color('#5a4a86'),
  light: new THREE.Color('#ffa766'),
}

export const ISLAND_WIDTH = 42
export const ISLAND_DEPTH = 34
const ROAD_WIDTH = 3.4
const ROAD_JOINT_SPACING = 2.1
const SKY_RADIUS = 240
const SHADOW_REACH = 30

const SUN_NOON = new THREE.Color('#fff1c9').multiplyScalar(2.6)
const SUN_LOW = new THREE.Color('#ff6a1f').multiplyScalar(1.1)
const CLOUD_NIGHT_SHADE = 0.3
const HEMISPHERE_DAY_SKY = new THREE.Color('#cfe4ff')
const HEMISPHERE_DAY_GROUND = new THREE.Color('#7f7a55')

const CLIMATES: Record<Climate, ClimateLook> = {
  amihan: {
    top: new THREE.Color('#2478dc'),
    horizon: new THREE.Color('#c6ecfb'),
    bottom: new THREE.Color('#3f9fe8'),
    sunColor: new THREE.Color('#fff0d8'),
    sunIntensity: 3.1,
    hemisphereIntensity: 1.7,
    grass: '#5d9440',
    dirt: '#a5825a',
    starOpacity: 0.85,
    cloudCount: 9,
    cloudColor: '#ffffff',
    fogNear: 60,
    fogFar: 180,
  },
  tagInit: {
    top: new THREE.Color('#1f6fe0'),
    horizon: new THREE.Color('#ffefd2'),
    bottom: new THREE.Color('#57b2e6'),
    sunColor: new THREE.Color('#ffe6b8'),
    sunIntensity: 3.8,
    hemisphereIntensity: 1.6,
    grass: '#a1a14b',
    dirt: '#bb965f',
    starOpacity: 0.85,
    cloudCount: 4,
    cloudColor: '#ffffff',
    fogNear: 62,
    fogFar: 190,
  },
  tagUlan: {
    top: new THREE.Color('#566679'),
    horizon: new THREE.Color('#aab6bf'),
    bottom: new THREE.Color('#71808f'),
    sunColor: new THREE.Color('#dfe7f0'),
    sunIntensity: 1.1,
    hemisphereIntensity: 2,
    grass: '#3d8240',
    dirt: '#7a5c40',
    starOpacity: 0.2,
    cloudCount: 16,
    cloudColor: '#9aa4ae',
    fogNear: 52,
    fogFar: 160,
  },
}

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 bottom;
  varying vec3 vDirection;

  void main() {
    float height = normalize(vDirection).y;
    vec3 color = height > 0.0
      ? mix(horizon, top, pow(height, 0.55))
      : mix(horizon, bottom, pow(-height, 0.7));
    gl_FragColor = vec4(color, 1.0);
  }
`

function addClouds(scene: THREE.Scene, random: Random, look: ClimateLook) {
  const clouds = new THREE.Group()
  scene.add(clouds)

  const material = std('#ffffff', { flatShading: true, roughness: 1 })

  for (let i = 0; i < look.cloudCount; i++) {
    const puffs: THREE.BufferGeometry[] = []
    const count = 4 + Math.floor(random.next() * 3)
    for (let puff = 0; puff < count; puff++) {
      puffs.push(
        new THREE.IcosahedronGeometry(1.1 + random.next() * 1.3, 1)
          .scale(1, 0.62, 1)
          .translate(
            (puff - count / 2) * 1.5,
            random.next() * 0.5,
            (random.next() - 0.5) * 1.6,
          ),
      )
    }

    const cloud = addMerged(puffs, material, clouds, false)
    const angle = (i / look.cloudCount) * Math.PI * 2 + random.next()
    const radius = 62 + random.next() * 38
    cloud.position.set(
      Math.cos(angle) * radius,
      12 + random.next() * 20,
      Math.sin(angle) * radius,
    )
    cloud.rotation.y = random.next() * Math.PI
    cloud.scale.setScalar(1.8)
  }

  return { clouds, cloudMaterial: material }
}

function addStars(scene: THREE.Scene, random: Random) {
  const count = 700
  const radius = SKY_RADIUS - 25
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = random.next() * Math.PI * 2
    const phi = Math.acos(random.next() * 0.9)
    positions.set(
      [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) - 5,
        radius * Math.sin(phi) * Math.sin(theta),
      ],
      i * 3,
    )
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: '#cfd6ff',
    size: 0.85,
    sizeAttenuation: true,
    fog: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  scene.add(new THREE.Points(geometry, material))
  return material
}

function addSkyLight(scene: THREE.Scene) {
  const skyLight = new THREE.DirectionalLight('#ffffff', 1)
  skyLight.castShadow = true
  skyLight.shadow.mapSize.set(3072, 3072)
  Object.assign(skyLight.shadow.camera, {
    left: -SHADOW_REACH,
    right: SHADOW_REACH,
    top: SHADOW_REACH,
    bottom: -SHADOW_REACH,
    near: 1,
    far: 130,
  })
  skyLight.shadow.bias = -0.0005
  scene.add(skyLight)
  return skyLight
}

export function addEnvironment(
  scene: THREE.Scene,
  random: Random,
  climate: Climate,
  zoom: number,
): Environment {
  const look = CLIMATES[climate]

  const hemisphere = new THREE.HemisphereLight('#ffffff', '#000000', 1)
  scene.add(hemisphere)

  const uniforms = {
    top: { value: NIGHT.top.clone() },
    horizon: { value: NIGHT.horizon.clone() },
    bottom: { value: NIGHT.bottom.clone() },
  }
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(SKY_RADIUS, 32, 16),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    ),
  )

  // Phones start further back, so the haze has to start further back too.
  const fog = new THREE.Fog(
    '#000000',
    look.fogNear * zoom,
    look.fogFar * zoom,
  )
  scene.fog = fog

  const sunGlow = glow('#ffffff')
  const moonGlow = glow('#e9ecff', 1.2)
  sunGlow.fog = moonGlow.fog = false
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5.5, 32, 16), sunGlow)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.4, 32, 16), moonGlow)
  scene.add(sun, moon)

  return {
    climate: look,
    uniforms,
    fog,
    hemisphere,
    skyLight: addSkyLight(scene),
    sun,
    moon,
    stars: addStars(scene, random),
    ...addClouds(scene, random, look),
  }
}

function placeOnArc(body: THREE.Object3D, angle: number) {
  body.position.set(Math.cos(angle) * 150, Math.sin(angle) * 115 - 5, -90)
  body.visible = Math.sin(angle) > -0.08
}

export function updateEnvironment(
  environment: Environment,
  { daylight, sunAngle }: SkyTime,
) {
  const { climate, uniforms, fog, hemisphere, skyLight } = environment
  const twilight = 1 - Math.abs(daylight * 2 - 1)

  uniforms.top.value
    .lerpColors(NIGHT.top, climate.top, daylight)
    .lerp(TWILIGHT.top, twilight * 0.7)
  uniforms.horizon.value
    .lerpColors(NIGHT.horizon, climate.horizon, daylight)
    .lerp(TWILIGHT.horizon, twilight * 0.75)
  uniforms.bottom.value
    .lerpColors(NIGHT.bottom, climate.bottom, daylight)
    .lerp(TWILIGHT.bottom, twilight * 0.7)
  fog.color.copy(uniforms.horizon.value)

  hemisphere.color.lerpColors(NIGHT.hemisphereSky, HEMISPHERE_DAY_SKY, daylight)
  hemisphere.groundColor.lerpColors(
    NIGHT.hemisphereGround,
    HEMISPHERE_DAY_GROUND,
    daylight,
  )
  hemisphere.intensity = THREE.MathUtils.lerp(
    NIGHT.hemisphereIntensity,
    climate.hemisphereIntensity,
    daylight,
  )

  placeOnArc(environment.sun, sunAngle)
  environment.sun.material.color.lerpColors(SUN_LOW, SUN_NOON, daylight ** 3)
  placeOnArc(environment.moon, sunAngle - Math.PI)

  // One shadow-casting light plays the sun by day and the moon by night, and
  // fades out as it swaps between them at the horizon.
  const sunIsUp = Math.sin(sunAngle) >= 0
  const angle = sunIsUp ? sunAngle : sunAngle - Math.PI
  const elevation = Math.sin(angle)
  skyLight.position.set(
    Math.cos(angle) * 44,
    Math.max(elevation, 0.3) * 44,
    -20,
  )
  skyLight.color
    .lerpColors(NIGHT.moonColor, climate.sunColor, daylight)
    .lerp(TWILIGHT.light, twilight)
  skyLight.intensity =
    (sunIsUp ? climate.sunIntensity * daylight : NIGHT.moonIntensity) *
    THREE.MathUtils.smoothstep(elevation, 0, 0.25)

  environment.stars.opacity = climate.starOpacity * (1 - daylight) ** 2
  environment.cloudMaterial.color
    .set(climate.cloudColor)
    .multiplyScalar(THREE.MathUtils.lerp(CLOUD_NIGHT_SHADE, 1, daylight))
}

export function updateClouds({ clouds }: Environment, time: number) {
  clouds.rotation.y = time * 0.006
}

function grassTexture(random: Random, base: string) {
  const color = new THREE.Color(base)

  return paintedTexture(512, (context) => {
    context.fillStyle = base
    context.fillRect(0, 0, 512, 512)

    for (let i = 0; i < 140; i++) {
      context.fillStyle = shade(random, color, 0.09)
      context.globalAlpha = 0.35
      context.beginPath()
      context.ellipse(
        random.next() * 512,
        random.next() * 512,
        14 + random.next() * 40,
        10 + random.next() * 26,
        random.next() * 3,
        0,
        Math.PI * 2,
      )
      context.fill()
    }

    context.globalAlpha = 1
    for (let i = 0; i < 5000; i++) {
      context.fillStyle = shade(random, color, 0.16)
      context.fillRect(random.next() * 512, random.next() * 512, 2, 3)
    }
  })
}

export function addGround(
  scene: THREE.Scene,
  random: Random,
  climate: Climate,
) {
  const { grass, dirt } = CLIMATES[climate]

  const soil = addShadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(ISLAND_WIDTH, 1.4, ISLAND_DEPTH, 4, 0.35),
      std('#5a4330'),
    ),
    scene,
    false,
  )
  soil.position.y = -0.8

  // Tiled twice, so the grass keeps its detail on the wider island.
  const grassMap = grassTexture(random, grass)
  grassMap.repeat.set(2, 2)
  const lawn = addShadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(
        ISLAND_WIDTH + 0.2,
        0.3,
        ISLAND_DEPTH + 0.2,
        3,
        0.14,
      ),
      std('#ffffff', { map: grassMap }),
    ),
    scene,
    false,
  )
  lawn.position.y = -0.15

  const rock = new THREE.Mesh(
    new THREE.ConeGeometry(1, 1, 7),
    std('#4a3a2c', { flatShading: true }),
  )
  rock.scale.set(ISLAND_WIDTH / 2, 10, ISLAND_DEPTH / 2)
  rock.rotation.x = Math.PI
  rock.position.y = -6.4
  scene.add(rock)

  const road = addShadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(ISLAND_WIDTH, 0.06, ROAD_WIDTH),
      std('#b3ab9b', { roughness: 0.9 }),
    ),
    scene,
    false,
  )
  road.position.y = 0.03

  const joints: THREE.BufferGeometry[] = []
  const lastJoint = ISLAND_WIDTH / 2 - 0.5
  for (let x = -lastJoint; x <= lastJoint; x += ROAD_JOINT_SPACING) {
    joints.push(box(0.03, 0.01, ROAD_WIDTH, [x, 0.062, 0]))
  }
  joints.push(box(ISLAND_WIDTH, 0.01, 0.03, [0, 0.062, 0]))
  addMerged(joints, std('#8a8375'), scene, false)

  addMerged(
    [-1, 1].map((side) =>
      box(ISLAND_WIDTH, 0.03, 0.75, [0, 0.015, side * 2.06]),
    ),
    std(dirt),
    scene,
    false,
  )

  if (climate === 'tagUlan') {
    const puddle = std('#6d7f8a', { roughness: 0.08, metalness: 0.45 })
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 16), puddle)
      mesh.rotation.x = -Math.PI / 2
      mesh.scale.set(0.3 + random.next() * 0.5, 0.16 + random.next() * 0.2, 1)
      mesh.position.set(
        (random.next() - 0.5) * (ISLAND_WIDTH - 3),
        0.066,
        (random.next() - 0.5) * (ROAD_WIDTH - 0.4),
      )
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }
}
