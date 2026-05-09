import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import schoolUrl      from '../3d_models/objects/school.glb?url';
import gundamIdleUrl    from '../3d_models/objects/gundam/rx-78_idle-3.glb?url';
import gundamStandUpUrl from '../3d_models/objects/gundam/rx-78_stand-up-2.glb?url';

// ─── School placement config ───────────────────────────────────────────────────
export const SCHOOL_THETA            = 0.3;
export const SCHOOL_PHI              = 0.5;
export const SCHOOL_YAW              = 0.0;
export const SCHOOL_SCALE            = 2.0;
export const SCHOOL_COLLISION_RADIUS = 0.5  * SCHOOL_SCALE;
export const SCHOOL_GRASS_RADIUS     = 0.5  * SCHOOL_SCALE;
export const SCHOOL_NEAR_ARC_DIST    = 1.75 * SCHOOL_SCALE;
export const UI_HEIGHT               = 3.0;

// ─── Gundam placement config ───────────────────────────────────────────────────
export const GUNDAM_THETA         = 1.8;
export const GUNDAM_PHI           = 0.9;
export const GUNDAM_YAW           = 0.5;
export const GUNDAM_SCALE         = 1.0;
export const GUNDAM_NEAR_ARC_DIST = 3.5;

export const schoolNormal = new THREE.Vector3(
    Math.sin(SCHOOL_PHI) * Math.cos(SCHOOL_THETA),
    Math.cos(SCHOOL_PHI),
    Math.sin(SCHOOL_PHI) * Math.sin(SCHOOL_THETA)
).normalize();

export const gundamNormal = new THREE.Vector3(
    Math.sin(GUNDAM_PHI) * Math.cos(GUNDAM_THETA),
    Math.cos(GUNDAM_PHI),
    Math.sin(GUNDAM_PHI) * Math.sin(GUNDAM_THETA)
).normalize();

export let cosSchoolGrassExclusion = 0;
export let schoolTooltipPos = new THREE.Vector3();
export let gundamTooltipPos = new THREE.Vector3();
export let gundamState = null;
export let schoolCss3d = null;
export let gundamCss3d = null;

export function initUniqueModels(scene, loader, SPHERE_RADIUS) {
    cosSchoolGrassExclusion = Math.cos(SCHOOL_GRASS_RADIUS / SPHERE_RADIUS);
    schoolTooltipPos.copy(schoolNormal).multiplyScalar(SPHERE_RADIUS + UI_HEIGHT);
    gundamTooltipPos.copy(gundamNormal).multiplyScalar(SPHERE_RADIUS + UI_HEIGHT);

    loader.load(schoolUrl, (gltf) => {
        const school = gltf.scene;
        school.scale.setScalar(SCHOOL_SCALE);
        const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), schoolNormal);
        const yawQ   = new THREE.Quaternion().setFromAxisAngle(schoolNormal, SCHOOL_YAW);
        school.quaternion.copy(yawQ).multiply(alignQ);
        school.position.copy(schoolNormal).multiplyScalar(SPHERE_RADIUS);
        school.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        scene.add(school);
    }, undefined, (e) => console.error('school:', e));

    const loadGlb = (url) => new Promise((res, rej) => loader.load(url, (gltf) => res(gltf), undefined, rej));

    Promise.all([loadGlb(gundamIdleUrl), loadGlb(gundamStandUpUrl)]).then(([idleGltf, standUpGltf]) => {
        const idleModel    = idleGltf.scene;
        const standUpModel = standUpGltf.scene;

        const placeModel = (scene3d) => {
            scene3d.scale.setScalar(GUNDAM_SCALE);
            const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), gundamNormal);
            const yawQ   = new THREE.Quaternion().setFromAxisAngle(gundamNormal, GUNDAM_YAW);
            scene3d.quaternion.copy(yawQ).multiply(alignQ);
            scene3d.position.copy(gundamNormal).multiplyScalar(SPHERE_RADIUS);
            scene3d.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        };
        placeModel(idleModel);
        placeModel(standUpModel);

        idleModel.visible    = false;
        standUpModel.visible = true;
        scene.add(idleModel);
        scene.add(standUpModel);

        const idleMixer  = new THREE.AnimationMixer(idleModel);
        const idleAction = idleMixer.clipAction(idleGltf.animations[0]);
        idleAction.play();
        idleMixer.update(0);
        idleAction.paused = true;

        const mixer         = new THREE.AnimationMixer(standUpModel);
        const standUpAction = mixer.clipAction(standUpGltf.animations[0]);
        standUpAction.setLoop(THREE.LoopOnce, 1);
        standUpAction.clampWhenFinished = true;
        standUpAction.play();
        mixer.update(0);
        standUpAction.paused = true;

        mixer.addEventListener('finished', () => {
            standUpModel.visible = false;
            idleModel.visible    = true;
            gundamState.animPhase = 'done';
        });

        gundamState = { idleModel, standUpModel, mixer, standUpAction, animPhase: 'idle' };
    }).catch((e) => console.error('gundam:', e));
}

export function initTooltipCss3d(tooltipSystem, cssScene) {
    schoolCss3d = new CSS3DObject(tooltipSystem.getElement('school'));
    schoolCss3d.scale.set(0.01, 0.01, 0.01);
    schoolCss3d.position.copy(schoolTooltipPos);
    cssScene.add(schoolCss3d);

    gundamCss3d = new CSS3DObject(tooltipSystem.getElement('gundam'));
    gundamCss3d.scale.set(0.01, 0.01, 0.01);
    gundamCss3d.position.copy(gundamTooltipPos);
    cssScene.add(gundamCss3d);
}
