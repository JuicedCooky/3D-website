import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import nipplejs from 'nipplejs';
import walkUrl from '../3d_models/doro/doro_walk_2.glb?url';
import worldUrl from '../3d_models/world.glb?url';
import grassUrl from '../3d_models/objects/grass.glb?url';
import schoolUrl from '../3d_models/objects/school.glb?url';

import { initUI } from './ui.js';



const SPHERE_RADIUS = 8;
const MOVE_SPEED = 3;
const TURN_SPEED = 6;
const HOME_PITCH = 0.4;
const SNAP_SPEED = 6; // how fast camera snaps back
const WALK_ANIM_SPEED = 4.0; // walk animation playback rate (1 = normal, 2 = double, 0.5 = half)
const CAM_DIST = 10;          // initial camera distance from player

const GRASS_COUNT     = 10000; // number of grass patches placed on the sphere
const GRASS_SCALE_MIN = 1.0;   // minimum random scale
const GRASS_SCALE_MAX = 2.0;   // maximum random scale

// ─── School placement config ──────────────────────────────────────────────────
const SCHOOL_THETA            = 0.3;  // azimuth around Y axis (radians)
const SCHOOL_PHI              = 0.5;  // polar angle from north pole (radians)
const SCHOOL_YAW              = 0.0;  // spin around sphere normal (radians)
const SCHOOL_SCALE            = 1.0;  // uniform scale
const SCHOOL_COLLISION_RADIUS = 1.0;  // character push-out radius (world units)
const SCHOOL_GRASS_RADIUS     = 1.0;  // no-grass exclusion radius (world units)

// Surface normal at the school's location — derived from spherical coords above
const schoolNormal = new THREE.Vector3(
    Math.sin(SCHOOL_PHI) * Math.cos(SCHOOL_THETA),
    Math.cos(SCHOOL_PHI),
    Math.sin(SCHOOL_PHI) * Math.sin(SCHOOL_THETA)
).normalize();
const cosSchoolGrassExclusion = Math.cos(SCHOOL_GRASS_RADIUS / SPHERE_RADIUS);

const settings = {
    shadowMapSize: 2048,
    grassCount:    GRASS_COUNT,
    grassScaleMin: GRASS_SCALE_MIN,
    grassScaleMax: GRASS_SCALE_MAX,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000814);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Stars
{
    const verts = new Float32Array(6000);
    for (let i = 0; i < 6000; i += 3) {
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const d = 300 + Math.random() * 200;
        verts[i] = v.x * d; verts[i + 1] = v.y * d; verts[i + 2] = v.z * d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 })));
}

// Lights
scene.add(new THREE.AmbientLight(0x8899bb, 0.8));
const sun = new THREE.DirectionalLight(0xfff8e0, 2.5);
sun.position.set(40, 30, 20);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = sun.shadow.camera.bottom = -(SPHERE_RADIUS * 2.5);
sun.shadow.camera.right = sun.shadow.camera.top = SPHERE_RADIUS * 2.5;

sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.05;

scene.add(sun);

// World sphere
const loader = new GLTFLoader();
loader.load(worldUrl, (gltf) => {
    const world = gltf.scene;
    world.scale.setScalar(SPHERE_RADIUS);
    world.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
    scene.add(world);
}, undefined, (e) => console.error('world:', e));

// Grass patches
const _alignQ = new THREE.Quaternion();
const _yawQ   = new THREE.Quaternion();
const _yUp    = new THREE.Vector3(0, 1, 0);
const _dummy  = new THREE.Object3D();

let grassMeshTemplate = null;
let currentGrass      = null;

function spawnGrass() {
    if (!grassMeshTemplate) return;
    if (currentGrass) {
        scene.remove(currentGrass);
        currentGrass.dispose();
        currentGrass = null;
    }
    const count = settings.grassCount;
    if (count <= 0) return;

    const inst = new THREE.InstancedMesh(grassMeshTemplate.geometry, grassMeshTemplate.material, count);
    inst.receiveShadow = true;
    inst.castShadow    = false;

    for (let i = 0; i < count; i++) {
        const theta  = Math.random() * Math.PI * 2;
        const phi    = Math.acos(2 * Math.random() - 1);
        const normal = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
        );
        if (normal.dot(schoolNormal) > cosSchoolGrassExclusion) { i--; continue; }
        _alignQ.setFromUnitVectors(_yUp, normal);
        _yawQ.setFromAxisAngle(normal, Math.random() * Math.PI * 2);
        _dummy.position.copy(normal).multiplyScalar(SPHERE_RADIUS);
        _dummy.quaternion.copy(_yawQ).multiply(_alignQ);
        _dummy.scale.setScalar(
            settings.grassScaleMin + Math.random() * (settings.grassScaleMax - settings.grassScaleMin)
        );
        _dummy.updateMatrix();
        inst.setMatrixAt(i, _dummy.matrix);
    }

    currentGrass = inst;
    scene.add(inst);
}

loader.load(grassUrl, (gltf) => {
    gltf.scene.traverse((c) => { if (c.isMesh && !grassMeshTemplate) grassMeshTemplate = c; });
    spawnGrass();
}, undefined, (e) => console.error('grass:', e));

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

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));

// ─── Virtual joystick (touch devices only) ────────────────────────────────────
const joystick = { x: 0, y: 0 }; // normalised [-1,1] x/y from nipple

if (window.matchMedia('(pointer: coarse)').matches) {
    const zone = document.createElement('div');
    zone.id = 'joystick-zone';
    Object.assign(zone.style, {
        position: 'fixed',
        left: '0', bottom: '0',
        width: '100%', height: '50%',
        zIndex: '98',
        touchAction: 'none',
    });
    document.body.appendChild(zone);

    const manager = nipplejs.create({
        zone,
        mode: 'dynamic',
        dynamicPage: true,
        color: 'rgba(255,255,255,0.5)',
    });

    manager.on('move', (_, data) => {
        if (!data.vector) return;
        joystick.x =  data.vector.x;
        joystick.y = -data.vector.y; // nipple y is inverted vs forward
    });
    manager.on('end', () => { joystick.x = 0; joystick.y = 0; });
}

// ─── Camera state ─────────────────────────────────────────────────────────────
// camBaseDir: world-space unit vector pointing FROM player TOWARD camera (horizontal, tangent to sphere).
// It is parallel-transported with player movement so it doesn't spin when the player turns.
// It is NOT tied to facingDir.
const camBaseDir = new THREE.Vector3(0, 0, 1); // initialised on first frame
const savedCamBaseDir = new THREE.Vector3(0, 0, 1); // snap-back target
let camPitch = HOME_PITCH;        // elevation angle (radians)
let savedCamPitch = HOME_PITCH;   // snap-back pitch
let camDist = CAM_DIST;           // zoom distance
let isOrbiting = false;
let snapBack = false;

// Cached sphere-normal for use inside event handlers (updated each frame)
const _currentUp = new THREE.Vector3(0, 1, 0);

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        isOrbiting = true;
        snapBack = false;
        savedCamBaseDir.copy(camBaseDir);
        savedCamPitch = camPitch;
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
        isOrbiting = false;
        snapBack = true;
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isOrbiting) return;
    // Rotate camBaseDir around sphere normal by horizontal mouse delta
    const yawQ = new THREE.Quaternion().setFromAxisAngle(_currentUp, -e.movementX * 0.004);
    camBaseDir.applyQuaternion(yawQ);
    // Re-project onto tangent plane (floating-point drift correction)
    camBaseDir.addScaledVector(_currentUp, -camBaseDir.dot(_currentUp)).normalize();
    // Vertical mouse delta changes elevation
    camPitch = Math.max(0.05, Math.min(1.3, camPitch + e.movementY * 0.004));
});

renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    camDist = Math.max(2, Math.min(20, camDist + e.deltaY * 0.01));
}, { passive: false });

// ─── Player state ─────────────────────────────────────────────────────────────
const playerPos = new THREE.Vector3(0, SPHERE_RADIUS, 0); // north pole
let facingDir = new THREE.Vector3(1, 0, 0);               // tangent, world-space

// Pre-allocated temporaries
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _rotAxis = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _mat = new THREE.Matrix4();
const _targetCamPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

// ─── Character model ──────────────────────────────────────────────────────────
let doro = null;
let isMoving = false;

loader.load(walkUrl, (gltf) => {
    const model = gltf.scene;
    model.traverse((c) => {
        if (c.isMesh) { 
            c.castShadow = true; 
            c.receiveShadow = true; 
        }
    });
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();
    action.timeScale = WALK_ANIM_SPEED;
    action.paused = true; // start frozen at frame 0 (idle pose)
    scene.add(model);
    doro = { model, mixer, action };
}, undefined, (e) => console.error('walk:', e));

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

// Initialise camBaseDir to a valid tangent direction on the first frame
let camInitialised = false;

initUI(settings, {
    onGrassApply: spawnGrass,
    onShadowChange: (size) => {
        if (size === 0) {
            sun.castShadow = false;
        } else {
            sun.castShadow = true;
            sun.shadow.mapSize.setScalar(size);
            if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
        }
    },
});

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!doro) { renderer.render(scene, camera); return; }

    // ── Surface normal ───────────────────────────────────────────────────────
    _up.copy(playerPos).normalize();
    _currentUp.copy(_up); // expose to event handlers

    // Initialise camera direction on first frame (perpendicular to playerPos, arbitrary tangent)
    if (!camInitialised) {
        camBaseDir.set(0, 0, 1).addScaledVector(_up, -_up.z).normalize();
        savedCamBaseDir.copy(camBaseDir);
        camInitialised = true;
    }

    // ── Keep facingDir tangent to sphere ─────────────────────────────────────
    facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();

    // ── Camera-relative WASD axes ─────────────────────────────────────────────
    // Camera sits in the camBaseDir direction from the player.
    // "Forward" (W) = from camera toward player = -camBaseDir.
    // "Right"   (D) = cross(camFwd, _up).
    _camFwd.copy(camBaseDir).negate();
    _camRight.crossVectors(_camFwd, _up).normalize();

    // ── Movement input ────────────────────────────────────────────────────────
    _moveDir.set(0, 0, 0);
    if (keys.has('KeyW')) _moveDir.add(_camFwd);
    if (keys.has('KeyS')) _moveDir.sub(_camFwd);
    if (keys.has('KeyA')) _moveDir.sub(_camRight);
    if (keys.has('KeyD')) _moveDir.add(_camRight);
    if (joystick.x !== 0 || joystick.y !== 0) {
        _moveDir.addScaledVector(_camFwd,  joystick.y);
        _moveDir.addScaledVector(_camRight, joystick.x);
    }

    const moving = _moveDir.lengthSq() > 0;

    if (moving !== isMoving) {
        isMoving = moving;
        doro.action.paused = !moving;
        if (!moving) { doro.action.time = 0; doro.mixer.update(0); }
    }

    if (moving) {
        _moveDir.normalize();

        // Smooth turn toward moveDir
        const dot = Math.max(-1, Math.min(1, facingDir.dot(_moveDir)));
        if (dot < 0.9999) {
            _rotAxis.crossVectors(facingDir, _moveDir).normalize();
            _q.setFromAxisAngle(_rotAxis, Math.min(Math.acos(dot), TURN_SPEED * delta));
            facingDir.applyQuaternion(_q).normalize();
        }

        // Move on sphere surface: rotate playerPos around cross(up, moveDir)
        _rotAxis.crossVectors(_up, _moveDir).normalize();
        _q.setFromAxisAngle(_rotAxis, MOVE_SPEED * delta / SPHERE_RADIUS);
        playerPos.applyQuaternion(_q).setLength(SPHERE_RADIUS);
        facingDir.applyQuaternion(_q).normalize();

        // Parallel-transport camBaseDir and savedCamBaseDir so camera stays
        // stable relative to the sphere surface (doesn't spin as player walks)
        camBaseDir.applyQuaternion(_q).normalize();
        savedCamBaseDir.applyQuaternion(_q).normalize();
    }

    // ── Post-move surface re-projection ──────────────────────────────────────
    _up.copy(playerPos).normalize();
    facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
    camBaseDir.addScaledVector(_up, -camBaseDir.dot(_up)).normalize();
    savedCamBaseDir.addScaledVector(_up, -savedCamBaseDir.dot(_up)).normalize();

    // ── Building collision ────────────────────────────────────────────────────
    const cosAngle = _up.dot(schoolNormal);
    const arcDist  = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * SPHERE_RADIUS;
    if (arcDist < SCHOOL_COLLISION_RADIUS && arcDist > 0.0001) {
        _rotAxis.crossVectors(schoolNormal, _up).normalize();
        _q.setFromAxisAngle(_rotAxis, SCHOOL_COLLISION_RADIUS / SPHERE_RADIUS);
        playerPos.copy(schoolNormal).multiplyScalar(SPHERE_RADIUS).applyQuaternion(_q).setLength(SPHERE_RADIUS);
        _up.copy(playerPos).normalize();
        facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
        camBaseDir.addScaledVector(_up, -camBaseDir.dot(_up)).normalize();
        savedCamBaseDir.addScaledVector(_up, -savedCamBaseDir.dot(_up)).normalize();
    }

    // ── Snap camera back toward saved position when right-click released ──────
    if (snapBack && !isOrbiting) {
        camBaseDir.lerp(savedCamBaseDir, Math.min(1, SNAP_SPEED * delta)).normalize();
        camPitch = THREE.MathUtils.lerp(camPitch, savedCamPitch, Math.min(1, SNAP_SPEED * delta));
        if (camBaseDir.dot(savedCamBaseDir) > 0.9999 && Math.abs(camPitch - savedCamPitch) < 0.001) {
            snapBack = false;
        }
    }

    // ── Orient model (local Y = sphere normal, local Z = facing) ─────────────
    _right.crossVectors(_up, facingDir).normalize();
    _mat.makeBasis(_right, _up, facingDir);
    doro.model.quaternion.setFromRotationMatrix(_mat);
    doro.model.position.copy(playerPos);

    doro.mixer.update(delta);

    // ── Camera position ───────────────────────────────────────────────────────
    _targetCamPos.copy(playerPos)
        .addScaledVector(camBaseDir, camDist * Math.cos(camPitch))
        .addScaledVector(_up,        camDist * Math.sin(camPitch));

    camera.position.lerp(_targetCamPos, Math.min(1, 8 * delta));
    camera.up.copy(_up);
    _lookAt.copy(playerPos).addScaledVector(_up, 0.8);
    camera.lookAt(_lookAt);

    renderer.render(scene, camera);
}
animate();
