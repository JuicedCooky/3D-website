import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import idleUrl from '../3d_models/doro/doro.glb?url';
import walkUrl from '../3d_models/doro/doro_walk.glb?url';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(5, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
fill.position.set(-5, 2, -5);
scene.add(fill);

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x222233 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 200, 0x444466, 0x333355);
scene.add(grid);

const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));

const MOVE_SPEED = 3;
const TURN_SPEED = 8; // radians per second
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _targetQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

// Each entry holds { model, mixer }; only one is visible at a time
const doro = { idle: null, walk: null };
let active = null; // currently visible entry
let isMoving = false;
const clock = new THREE.Clock();

function setupModel(gltf) {
    const model = gltf.scene;
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    model.visible = false;

    let mixer = null;
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
    }

    scene.add(model);
    return { model, mixer };
}

function switchTo(entry) {
    if (active === entry) return;
    if (active) {
        // Carry position/rotation over to the incoming model
        entry.model.position.copy(active.model.position);
        entry.model.rotation.copy(active.model.rotation);
        active.model.visible = false;
    }
    entry.model.visible = true;
    active = entry;
}

const loader = new GLTFLoader();
loader.load(idleUrl, (gltf) => {
    doro.idle = setupModel(gltf);
    // Start with idle visible once both are ready (or immediately if walk failed)
    if (!active) switchTo(doro.idle);
}, undefined, (err) => console.error('Failed to load idle model:', err));

loader.load(walkUrl, (gltf) => {
    doro.walk = setupModel(gltf);
}, undefined, (err) => console.error('Failed to load walk model:', err));

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (active) {
        camera.getWorldDirection(_forward);
        _forward.y = 0;
        _forward.normalize();
        _right.crossVectors(_forward, _up).normalize();

        _move.set(0, 0, 0);
        if (keys.has('KeyW')) _move.add(_forward);
        if (keys.has('KeyS')) _move.sub(_forward);
        if (keys.has('KeyA')) _move.sub(_right);
        if (keys.has('KeyD')) _move.add(_right);

        const moving = _move.lengthSq() > 0;

        if (moving !== isMoving) {
            isMoving = moving;
            if (isMoving && doro.walk) switchTo(doro.walk);
            else if (!isMoving && doro.idle) switchTo(doro.idle);
        }

        if (moving) {
            _move.normalize();
            active.model.position.addScaledVector(_move, MOVE_SPEED * delta);
            _euler.set(0, Math.atan2(_move.x, _move.z), 0);
            _targetQuat.setFromEuler(_euler);
            active.model.quaternion.rotateTowards(_targetQuat, TURN_SPEED * delta);
        }

        controls.target.set(
            active.model.position.x,
            active.model.position.y + 1,
            active.model.position.z
        );
    }

    if (active?.mixer) active.mixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
}
animate();
