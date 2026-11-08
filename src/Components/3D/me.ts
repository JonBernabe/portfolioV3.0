import * as THREE from "three";
import { type Random } from "./helpers";
import { addFigure, type Figure } from "./people";

export type Me = {
  figure: Figure;
};

const size = 1.6;
const skinTone = "#8d5a3b";
const hairColor = "#14110f";
const shirtColor = "#0b380b";
const trousersColor = "#2b3a55";
const groundY = 0.03;
const jumpEvery = 5;
const jumpHeight = 0.3;
const jumpDuration = 0.5;
const waveSpeed = 10;

export function addMe(
  scene: THREE.Scene,
  random: Random,
  x: number,
  z: number,
): Me {
  const figure = addFigure(scene, random, {
    skinTone,
    hairColor,
    shirtColor,
    trousersColor,
    size,
  });
  figure.group.position.set(x, groundY, z);
  return {
    figure,
  };
}

export function updateMe(
  me: Me,
  time: number,
  camera: THREE.Camera,
  reducedMotion: boolean,
) {
  const { group, legs, arms } = me.figure;

  group.rotation.y = Math.atan2(
    group.position.z - camera.position.z,
    camera.position.x - group.position.x,
  );

  const jumpPhase = (time % jumpEvery) / jumpDuration;
  const inAir = !reducedMotion && jumpPhase < 1;
  const wave = Math.sin(time * waveSpeed) * 0.5;

  if (inAir) {
    group.position.y = groundY + 4 * jumpHeight * jumpPhase * (1 - jumpPhase);
    arms[0].rotation.x = 2.8;
    arms[1].rotation.x = -2.8;
    legs[0].rotation.x = 0.35;
    legs[1].rotation.x = -0.35;
  } else {
    group.position.y = groundY;
    arms[0].rotation.x = 0.15;
    arms[1].rotation.x = -2.6 + wave;
    legs[0].rotation.x = 0;
    legs[1].rotation.x = 0;
  }
}
