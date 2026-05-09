import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import schoolUrl      from '../3d_models/objects/school.glb?url';
import gundamIdleUrl    from '../3d_models/objects/gundam/rx-78_idle-3.glb?url';
import gundamStandUpUrl from '../3d_models/objects/gundam/rx-78_stand-up-2.glb?url';
import theatreUrl from '../3d_models/objects/theatre.glb?url';

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

// ─── Theatre placement config ──────────────────────────────────────────────────
export const THEATRE_THETA            = 3.5;
export const THEATRE_PHI              = 0.65;
export const THEATRE_YAW              = -0.8;
export const THEATRE_SCALE            = 0.4;
export const THEATRE_COLLISION_RADIUS = 0.5 * 1.8;
export const THEATRE_NEAR_ARC_DIST    = 3.5;

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

export const theatreNormal = new THREE.Vector3(
    Math.sin(THEATRE_PHI) * Math.cos(THEATRE_THETA),
    Math.cos(THEATRE_PHI),
    Math.sin(THEATRE_PHI) * Math.sin(THEATRE_THETA)
).normalize();

export let cosSchoolGrassExclusion = 0;
export let schoolTooltipPos  = new THREE.Vector3();
export let gundamTooltipPos  = new THREE.Vector3();
export let theatreTooltipPos = new THREE.Vector3();
export let gundamState  = null;
export let schoolCss3d  = null;
export let gundamCss3d  = null;
export let theatreCss3d = null;
export let theatreScreenMesh = null;
export const theatreWorldQuaternion = new THREE.Quaternion();

// ─── Theatre slideshow ─────────────────────────────────────────────────────────
export const THEATRE_SLIDES = [
    { label: 'Project 1', bg: '#1a1a2e', accent: '#e94560' },
    { label: 'Project 2', bg: '#0f3460', accent: '#53d8fb' },
    { label: 'Project 3', bg: '#16213e', accent: '#f5a623' },
];
export let theatreSlideIdx = 0;
let _slideCanvas  = null;
let _slideCtx     = null;
let _slideTexture = null;

function _drawSlide(idx) {
    if (!_slideCtx) return;
    const slide = THEATRE_SLIDES[idx % THEATRE_SLIDES.length];
    const w = _slideCanvas.width, h = _slideCanvas.height;

    _slideCtx.save();
    _slideCtx.translate(w, 0);
    _slideCtx.scale(-1, 1);

    _slideCtx.fillStyle = slide.bg;
    _slideCtx.fillRect(0, 0, w, h);
    _slideCtx.strokeStyle = 'rgba(255,255,255,0.07)';
    _slideCtx.lineWidth = 1;
    for (let x = 0; x < w; x += 80) { _slideCtx.beginPath(); _slideCtx.moveTo(x, 0); _slideCtx.lineTo(x, h); _slideCtx.stroke(); }
    for (let y = 0; y < h; y += 80) { _slideCtx.beginPath(); _slideCtx.moveTo(0, y); _slideCtx.lineTo(w, y); _slideCtx.stroke(); }
    _slideCtx.fillStyle = slide.accent;
    _slideCtx.fillRect(w * 0.1, h * 0.1, w * 0.8, 4);
    _slideCtx.fillRect(w * 0.1, h * 0.82, w * 0.8, 4);
    _slideCtx.fillStyle = 'rgba(255,255,255,0.9)';
    _slideCtx.font = 'bold 56px monospace';
    _slideCtx.textAlign = 'center';
    _slideCtx.textBaseline = 'middle';
    _slideCtx.fillText(slide.label, w / 2, h / 2);
    _slideCtx.font = '22px monospace';
    _slideCtx.fillStyle = 'rgba(255,255,255,0.45)';
    _slideCtx.fillText(`${idx + 1} / ${THEATRE_SLIDES.length}`, w / 2, h * 0.72);

    _slideCtx.restore();
    if (_slideTexture) _slideTexture.needsUpdate = true;
}

export function advanceTheatreSlide(dir) {
    theatreSlideIdx = ((theatreSlideIdx + dir) % THEATRE_SLIDES.length + THEATRE_SLIDES.length) % THEATRE_SLIDES.length;
    _drawSlide(theatreSlideIdx);
}

export function initUniqueModels(scene, loader, SPHERE_RADIUS) {
    cosSchoolGrassExclusion = Math.cos(SCHOOL_GRASS_RADIUS / SPHERE_RADIUS);
    schoolTooltipPos.copy(schoolNormal).multiplyScalar(SPHERE_RADIUS + UI_HEIGHT);
    gundamTooltipPos.copy(gundamNormal).multiplyScalar(SPHERE_RADIUS + UI_HEIGHT);
    theatreTooltipPos.copy(theatreNormal).multiplyScalar(SPHERE_RADIUS + UI_HEIGHT);

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

    loader.load(theatreUrl, (gltf) => {
        const theatre = gltf.scene;
        theatre.scale.setScalar(THEATRE_SCALE);
        const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), theatreNormal);
        const yawQ   = new THREE.Quaternion().setFromAxisAngle(theatreNormal, THEATRE_YAW);
        theatre.quaternion.copy(yawQ).multiply(alignQ);
        theatreWorldQuaternion.copy(theatre.quaternion);
        theatre.position.copy(theatreNormal).multiplyScalar(SPHERE_RADIUS);
        theatre.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
                console.log(c.name);
                if (c.name === 'screen_body') theatreScreenMesh = c;
            }
        });

        if (theatreScreenMesh) {
            // Normalize UVs to [0,1] — the atlas UVs only cover a sub-region,
            // which crops our canvas texture to a sliver of the screen.
            const uvAttr = theatreScreenMesh.geometry.attributes.uv;
            if (uvAttr) {
                let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
                for (let i = 0; i < uvAttr.count; i++) {
                    const u = uvAttr.getX(i), v = uvAttr.getY(i);
                    if (u < minU) minU = u; if (u > maxU) maxU = u;
                    if (v < minV) minV = v; if (v > maxV) maxV = v;
                }
                const rU = maxU - minU || 1, rV = maxV - minV || 1;
                for (let i = 0; i < uvAttr.count; i++) {
                    uvAttr.setXY(i,
                        (uvAttr.getX(i) - minU) / rU,
                        (uvAttr.getY(i) - minV) / rV,
                    );
                }
                uvAttr.needsUpdate = true;
            }

            _slideCanvas        = document.createElement('canvas');
            _slideCanvas.width  = 1024;
            _slideCanvas.height = 1024;
            _slideCtx           = _slideCanvas.getContext('2d');
            _slideTexture          = new THREE.CanvasTexture(_slideCanvas);
            _slideTexture.colorSpace = THREE.SRGBColorSpace;
            _slideTexture.rotation = -Math.PI / 2;
            _slideTexture.center.set(0.5, 0.5);
            _drawSlide(0);

            const applyMap = (mat) => {
                mat.map               = _slideTexture;
                mat.emissiveMap       = _slideTexture;
                mat.emissive          = new THREE.Color(1, 1, 1);
                mat.emissiveIntensity = 0.6;
                mat.needsUpdate       = true;
            };
            if (Array.isArray(theatreScreenMesh.material)) theatreScreenMesh.material.forEach(applyMap);
            else applyMap(theatreScreenMesh.material);
        }

        scene.add(theatre);
    }, undefined, (e) => console.error('theatre:', e));
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

    theatreCss3d = new CSS3DObject(tooltipSystem.getElement('theatre'));
    theatreCss3d.scale.set(0.01, 0.01, 0.01);
    theatreCss3d.position.copy(theatreTooltipPos);
    cssScene.add(theatreCss3d);
}
