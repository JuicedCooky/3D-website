import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { keys, joystick, initCameraControls } from './controls.js';
import walkUrl from '../3d_models/doro/doro_walk_2.glb?url';
import worldUrl from '../3d_models/world.glb?url';
import grassUrl from '../3d_models/objects/grass.glb?url';
import schoolUrl from '../3d_models/objects/school.glb?url';

import barrelUrl       from '../3d_models/objects/random_objects/barrel/barrel.glb?url';
import barrelOpenUrl   from '../3d_models/objects/random_objects/barrel/barrel-open.glb?url';
import boxUrl          from '../3d_models/objects/random_objects/box/box.glb?url';
import boxLargeUrl     from '../3d_models/objects/random_objects/box/box-large.glb?url';
import boxOpenUrl      from '../3d_models/objects/random_objects/box/box-open.glb?url';
import boxLargeOpenUrl from '../3d_models/objects/random_objects/box/box-large-open.glb?url';

import { initUI, createBuildingTooltipSystem, createBookPanel } from './ui.js';



const SPHERE_RADIUS = 16    ;
const MOVE_SPEED = 3;
const TURN_SPEED = 6;
const HOME_PITCH = 0.4;
const SNAP_SPEED = 6; // how fast camera snaps back
const WALK_ANIM_SPEED = 4.0; // walk animation playback rate (1 = normal, 2 = double, 0.5 = half)
const SPRINT_MULTIPLIER = 2.0; // movement + animation speed multiplier when holding Left Shift
const CAM_DIST = 10;          // initial camera distance from player

const ACCEL_TIME  = 3.0; // seconds of continuous movement to reach full speed
const ACCEL_BONUS = 1.5; // fractional speed increase at full accel (1.0 + this = max multiplier)

const RANDOM_OBJ_CLUSTERS    = 50;
const RANDOM_OBJ_SCALE       = 2.0;
const RANDOM_OBJ_SPREAD      = 1.0; // max arc-distance spread within a cluster (world units)
const RANDOM_OBJ_EXCL_RADIUS      = 2.5;                   // exclusion arc-distance around school
const RANDOM_OBJ_COLLISION_RADIUS = RANDOM_OBJ_SCALE * 0.45; // player push-out radius per item

// ─── Physics ─────────────────────────────────────────────────────────────────
const PHYS_GRAVITY      = 20;                       // acceleration toward sphere center (m/s²)
const PHYS_HALF_EXT     = RANDOM_OBJ_SCALE * 0.35; // fallback half-extent (unused when bbox auto-compute succeeds)
const PHYS_IMPULSE_STR  = 10;                       // impulse magnitude on first player contact
const PHYS_RESTITUTION  = 0.25;                     // bounciness vs sphere ground
const PHYS_GROUND_FRICTION  = 0.5;                  // converts sliding velocity to spin on ground impact
const PHYS_ROLLING_FRICTION = 0.16;                 // angular velocity retained per second while on ground (lower = stops faster)

const GRASS_COUNT     = 10000; // number of grass patches placed on the sphere
const GRASS_SCALE_MIN = 1.0;   // minimum random scale
const GRASS_SCALE_MAX = 2.0;   // maximum random scale

// ─── School placement config ──────────────────────────────────────────────────
const SCHOOL_THETA            = 0.3;  // azimuth around Y axis (radians)
const SCHOOL_PHI              = 0.5;  // polar angle from north pole (radians)
const SCHOOL_YAW              = 0.0;  // spin around sphere normal (radians)
const SCHOOL_SCALE            = 2.0;  // uniform scale
const SCHOOL_COLLISION_RADIUS = 0.5  * SCHOOL_SCALE;  // scales with building size
const SCHOOL_GRASS_RADIUS     = 0.5  * SCHOOL_SCALE;
const SCHOOL_NEAR_ARC_DIST    = 1.75 * SCHOOL_SCALE;  // scales with building size
const UI_HEIGHT = 2.0;


// Surface normal at the school's location — derived from spherical coords above
const schoolNormal = new THREE.Vector3(
    Math.sin(SCHOOL_PHI) * Math.cos(SCHOOL_THETA),
    Math.cos(SCHOOL_PHI),
    Math.sin(SCHOOL_PHI) * Math.sin(SCHOOL_THETA)
).normalize();
const cosSchoolGrassExclusion = Math.cos(SCHOOL_GRASS_RADIUS / SPHERE_RADIUS);
// World-space anchor for the school tooltip (slightly above sphere surface)
const schoolTooltipPos = schoolNormal.clone().multiplyScalar(SPHERE_RADIUS + UI_HEIGHT);

const settings = {
    shadowMapSize: 2048,
    grassCount:    GRASS_COUNT,
    grassScaleMin: GRASS_SCALE_MIN,
    grassScaleMax: GRASS_SCALE_MAX,
    panSpeed:      4,
    walkSpeed:      1,
    moveSpeed:      1,
    objClusters:   RANDOM_OBJ_CLUSTERS,
};

const scene = new THREE.Scene();

// ─── Cannon physics world ─────────────────────────────────────────────────────
const physicsWorld = new CANNON.World();
physicsWorld.gravity.set(0, 0, 0); // per-body gravity applied manually each frame
physicsWorld.allowSleep     = true;
physicsWorld.sleepSpeedLimit = 0.4; // sleep when all velocity < this
physicsWorld.sleepTimeLimit  = 1.5; // must stay slow for this many seconds
physicsWorld.solver.iterations = 40; 
physicsWorld.solver.tolerance = 0.001;
const planetShape = new CANNON.Sphere(SPHERE_RADIUS);
const planetBody = new CANNON.Body({
    mass: 0, // Mass 0 makes it an unmovable floor
    shape: planetShape,
    position: new CANNON.Vec3(0, 0, 0)
});

// 1. Create physics materials
const planetMaterial = new CANNON.Material('planet');
const objectMaterial = new CANNON.Material('object');

// 2. Assign the planet material to the planet body
planetBody.material = planetMaterial; 

// 3. Define exactly how these two materials interact
const planetObjectContact = new CANNON.ContactMaterial(
    planetMaterial,
    objectMaterial,
    {
        friction: 0.8,        // High friction to stop infinite sliding
        restitution: 0.1,     // Low bounciness to stop micro-jittering
        contactEquationStiffness: 1e8,  // Makes the floor solid instead of spongy (stops sinking)
        contactEquationRelaxation: 3    // Stabilizes the stiff contacts
    }
);
physicsWorld.addContactMaterial(planetObjectContact);

physicsWorld.addBody(planetBody);

// Background rendered as body CSS so the alpha WebGL canvas is transparent,
// allowing CSS3DRenderer content behind it to show through correctly.
document.body.style.backgroundColor = '#000814';

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);

// WebGL renderer — alpha:true so transparent pixels reveal the CSS3D layer beneath
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;z-index:1;';
document.body.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;z-index:3;pointer-events:none;';
document.body.insertBefore(cssRenderer.domElement, renderer.domElement);

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

// ─── Random scatter objects ────────────────────────────────────────────────────
let randomObjRoot  = null;
let physicsObjects = []; // { body: CANNON.Body, mesh: THREE.Object3D, surfaceNormal: THREE.Vector3 }
let barrelTemplates = null;
let boxTemplates    = null;

const cosObjExcl      = Math.cos(RANDOM_OBJ_EXCL_RADIUS      / SPHERE_RADIUS);
const cosObjCollision = Math.cos(RANDOM_OBJ_COLLISION_RADIUS / SPHERE_RADIUS);

function spawnRandomObjects() {
    if (!barrelTemplates || !boxTemplates) return;
    if (randomObjRoot) { scene.remove(randomObjRoot); randomObjRoot = null; }
    for (const po of physicsObjects) physicsWorld.removeBody(po.body);
    physicsObjects = [];
    const count = settings.objClusters;
    if (count <= 0) return;

    randomObjRoot = new THREE.Group();
    const groups = [barrelTemplates, boxTemplates];
    const _n = new THREE.Vector3();
    const _tangent = new THREE.Vector3();

    // Minimum arc-distance separation derived from object scale
    const itemFootprint  = RANDOM_OBJ_SCALE * 0.4;          // approx world-radius of one item
    const minItemSep     = 2 * itemFootprint;                // item-to-item min distance
    const minClusterSep  = RANDOM_OBJ_SPREAD + minItemSep;   // cluster-to-cluster min distance
    const cosMinCluster  = Math.cos(minClusterSep / SPHERE_RADIUS);
    const cosMinItem     = Math.cos(minItemSep     / SPHERE_RADIUS);

    const clusterCenters = [];

    for (let c = 0; c < count; c++) {
        // Pick a cluster center that doesn't overlap the school or existing clusters
        let theta, phi, attempts = 0, valid = false;
        do {
            theta = Math.random() * Math.PI * 2;
            phi   = Math.acos(2 * Math.random() - 1);
            _n.set(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
            );
            attempts++;
            if (_n.dot(schoolNormal) > cosObjExcl) continue;
            if (clusterCenters.some(cc => cc.dot(_n) > cosMinCluster)) continue;
            valid = true;
        } while (!valid && attempts < 100);
        if (!valid) continue;

        clusterCenters.push(_n.clone());
        const grp        = groups[Math.floor(Math.random() * groups.length)];
        const itemCnt    = 1 + Math.floor(Math.random() * 4);
        const itemNormals = [];

        for (let i = 0; i < itemCnt; i++) {
            // Pick a spot in the cluster spread that doesn't overlap sibling items
            let itemNormal = null;
            for (let att = 0; att < 20; att++) {
                _tangent.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
                        .addScaledVector(_n, -_tangent.dot(_n)).normalize();
                const arc = Math.random() * RANDOM_OBJ_SPREAD / SPHERE_RADIUS;
                const candidate = _n.clone()
                    .applyQuaternion(new THREE.Quaternion().setFromAxisAngle(_tangent, arc))
                    .normalize();
                if (!itemNormals.some(p => p.dot(candidate) > cosMinItem)) {
                    itemNormal = candidate;
                    itemNormals.push(candidate);
                    break;
                }
            }
            if (!itemNormal) continue;

            const template = grp[Math.floor(Math.random() * grp.length)];
            const obj = template.clone();
            const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), itemNormal);
            const yawQ   = new THREE.Quaternion().setFromAxisAngle(itemNormal, Math.random() * Math.PI * 2);
            obj.quaternion.copy(yawQ).multiply(alignQ);

            // Derive per-model half-extents from pre-computed bbox, scaled to world size
            const rawHe = template.userData.halfExtents ?? new THREE.Vector3(PHYS_HALF_EXT, PHYS_HALF_EXT, PHYS_HALF_EXT);
            const he = rawHe.clone().multiplyScalar(RANDOM_OBJ_SCALE);
            const groundDist = SPHERE_RADIUS + he.y; // body center sits he.y above sphere surface

            // If the model origin is not at its geometric center (e.g. origin at base),
            // the mesh must be offset from the body center so the bottom face stays on the surface.
            // meshOriginOffset = how far the mesh origin is below the bbox center, in world units.
            const bboxCenterY = template.userData.bboxCenterY ?? 0;
            const meshOriginOffset = bboxCenterY * RANDOM_OBJ_SCALE;
            const meshDist = groundDist - meshOriginOffset; // mesh origin radius when upright

            obj.position.copy(itemNormal).multiplyScalar(meshDist);
            obj.scale.setScalar(RANDOM_OBJ_SCALE);
            randomObjRoot.add(obj);

            // Physics body — box shape matches actual mesh extents
            const body = new CANNON.Body({
                mass: 1,
                shape: new CANNON.Box(new CANNON.Vec3(he.x, he.y, he.z)),
                material: objectMaterial, // <--- ADD THIS
                linearDamping:  0.4,
                angularDamping: 0.8,
            });
            body.position.set(
                itemNormal.x * groundDist,
                itemNormal.y * groundDist,
                itemNormal.z * groundDist,
            );
            body.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
            physicsWorld.addBody(body);
            body.sleep();
            physicsObjects.push({ body, mesh: obj, surfaceNormal: itemNormal.clone(), colliding: false, groundDist, meshOriginOffset });
        }
    }
    scene.add(randomObjRoot);
}

{
    const loadGlb = (url) => new Promise((res, rej) => loader.load(url, (gltf) => res(gltf.scene), undefined, rej));
    Promise.all([
        loadGlb(barrelUrl),
        loadGlb(barrelOpenUrl),
        loadGlb(boxUrl),
        loadGlb(boxLargeUrl),
        loadGlb(boxOpenUrl),
        loadGlb(boxLargeOpenUrl),
    ]).then(([barrel, barrelOpen, box, boxLarge, boxOpen, boxLargeOpen]) => {
        const _bsize   = new THREE.Vector3();
        const _bcenter = new THREE.Vector3();
        const _bbox    = new THREE.Box3();
        [barrel, barrelOpen, box, boxLarge, boxOpen, boxLargeOpen].forEach(obj => {
            obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            _bbox.setFromObject(obj);
            _bbox.getSize(_bsize);
            _bbox.getCenter(_bcenter);
            obj.userData.halfExtents = _bsize.clone().divideScalar(2);
            obj.userData.bboxCenterY = _bcenter.y; // local Y of bbox center relative to model origin
        });
        barrelTemplates = [barrel, barrelOpen];
        boxTemplates    = [box, boxLarge, boxOpen, boxLargeOpen];
        spawnRandomObjects();
    }).catch(e => console.error('random_objects:', e));
}

// ─── Controls ─────────────────────────────────────────────────────────────────
const cam = initCameraControls(renderer.domElement, settings, HOME_PITCH, CAM_DIST);

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
let moveTime = 0; // seconds of continuous movement (drives acceleration)

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
    action.timeScale = WALK_ANIM_SPEED * settings.walkSpeed;
    action.paused = true; // start frozen at frame 0 (idle pose)
    scene.add(model);
    doro = { model, mixer, action };
}, undefined, (e) => console.error('walk:', e));

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();


initUI(settings, {
    onGrassApply: spawnGrass,
    onObjApply:   spawnRandomObjects,
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

const tooltipSystem = createBuildingTooltipSystem(['school']);
const bookPanel = createBookPanel();

// Wrap each tooltip element in a CSS3DObject so Three.js projects it into 3D space.
const cssScene = new THREE.Scene();
const schoolCss3d = new CSS3DObject(tooltipSystem.getElement('school'));
schoolCss3d.scale.set(0.01, 0.01, 0.01);
schoolCss3d.position.copy(schoolTooltipPos);
cssScene.add(schoolCss3d);

let _currentArcDist = Infinity;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && _currentArcDist < SCHOOL_NEAR_ARC_DIST && !bookPanel.isOpen) {
        const v = schoolTooltipPos.clone().project(camera);
        const sx = ( v.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
        bookPanel.open(sx, sy);
    }
});

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!doro) { renderer.render(scene, camera); return; }

    // ── Surface normal ───────────────────────────────────────────────────────
    _up.copy(playerPos).normalize();
    cam.currentUp.copy(_up);

    // Initialise camera direction on first frame (perpendicular to playerPos, arbitrary tangent)
    if (!cam.initialised) {
        cam.baseDir.set(0, 0, 1).addScaledVector(_up, -_up.z).normalize();
        cam.savedBaseDir.copy(cam.baseDir);
        cam.initialised = true;
    }

    // ── Keep facingDir tangent to sphere ─────────────────────────────────────
    facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();

    // ── Camera-relative WASD axes ─────────────────────────────────────────────
    // Camera sits in the camBaseDir direction from the player.
    // "Forward" (W) = from camera toward player = -camBaseDir.
    // "Right"   (D) = cross(camFwd, _up).
    _camFwd.copy(cam.baseDir).negate();
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
    const sprinting = moving && keys.has('ShiftLeft');
    const sprintMult = sprinting ? SPRINT_MULTIPLIER : 1.0;

    if (moving !== isMoving) {
        isMoving = moving;
        doro.action.paused = !moving;
        if (!moving) { doro.action.time = 0; doro.mixer.update(0); moveTime = 0; }
    }

    doro.action.timeScale = WALK_ANIM_SPEED * settings.walkSpeed * sprintMult;

    if (moving) {
        moveTime = Math.min(moveTime + delta, ACCEL_TIME);
        const accelMult = 1 + ACCEL_BONUS * (moveTime / ACCEL_TIME);

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
        _q.setFromAxisAngle(_rotAxis, settings.moveSpeed * MOVE_SPEED * accelMult * sprintMult * delta / SPHERE_RADIUS);
        playerPos.applyQuaternion(_q).setLength(SPHERE_RADIUS);
        facingDir.applyQuaternion(_q).normalize();

        // Parallel-transport cam.baseDir and cam.savedBaseDir so camera stays
        // stable relative to the sphere surface (doesn't spin as player walks)
        cam.baseDir.applyQuaternion(_q).normalize();
        cam.savedBaseDir.applyQuaternion(_q).normalize();
    }

    // ── Post-move surface re-projection ──────────────────────────────────────
    _up.copy(playerPos).normalize();
    facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
    cam.baseDir.addScaledVector(_up, -cam.baseDir.dot(_up)).normalize();
    cam.savedBaseDir.addScaledVector(_up, -cam.savedBaseDir.dot(_up)).normalize();

    // ── Building collision ────────────────────────────────────────────────────
    const cosAngle = _up.dot(schoolNormal);
    const arcDist  = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * SPHERE_RADIUS;
    _currentArcDist = arcDist;
    if (arcDist < SCHOOL_COLLISION_RADIUS && arcDist > 0.0001) {
        _rotAxis.crossVectors(schoolNormal, _up).normalize();
        _q.setFromAxisAngle(_rotAxis, SCHOOL_COLLISION_RADIUS / SPHERE_RADIUS);
        playerPos.copy(schoolNormal).multiplyScalar(SPHERE_RADIUS).applyQuaternion(_q).setLength(SPHERE_RADIUS);
        _up.copy(playerPos).normalize();
        facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
        cam.baseDir.addScaledVector(_up, -cam.baseDir.dot(_up)).normalize();
        cam.savedBaseDir.addScaledVector(_up, -cam.savedBaseDir.dot(_up)).normalize();
    }

    // ── Physics step ─────────────────────────────────────────────────────────
    for (const po of physicsObjects) {
        if (po.body.sleepState < 2) {
            // Gravity toward sphere center
            const p = po.body.position;
            const len = p.length();
            if (len > 0.001) {
                const s = -po.body.mass * PHYS_GRAVITY / len;
                po.body.force.set(p.x * s, p.y * s, p.z * s);
            }
        }
    }
    physicsWorld.step(1 / 60, delta, 3);

    // Ground clamp — prevent objects from sinking below the sphere surface
    for (const po of physicsObjects) {
        if (po.body.sleepState === 2) continue;
        const p = po.body.position;
        const dist = p.length();
        if (dist < po.groundDist && dist > 0.001) {
            const scale = po.groundDist / dist;
            p.x *= scale; p.y *= scale; p.z *= scale;
            const nx = p.x / po.groundDist, ny = p.y / po.groundDist, nz = p.z / po.groundDist;
            const v = po.body.velocity;
            const vn = v.x*nx + v.y*ny + v.z*nz;
            if (vn < 0) { v.x -= vn*nx; v.y -= vn*ny; v.z -= vn*nz; }
        }
    }

    // Ground clamp + mesh sync (only for awake/sleepy bodies)
    // for (const po of physicsObjects) {
    //     if (po.body.sleepState === 2) continue; // sleeping — no update needed
    //     const p = po.body.position;
    //     const dist = p.length();
    //     if (dist < po.groundDist && dist > 0.001) {
    //         // Clamp center to resting height above sphere surface
    //         const scale = po.groundDist / dist;
    //         p.set(p.x * scale, p.y * scale, p.z * scale);
    //         const nx = p.x / po.groundDist, ny = p.y / po.groundDist, nz = p.z / po.groundDist;
    //         const he_y = po.groundDist - SPHERE_RADIUS;
    //         const v = po.body.velocity;
    //         const vrad = v.x * nx + v.y * ny + v.z * nz;
    //         if (vrad < 0) {
    //             // Tangential (sliding) velocity — unchanged by normal reflection
    //             const vtx = v.x - vrad * nx;
    //             const vty = v.y - vrad * ny;
    //             const vtz = v.z - vrad * nz;
    //             // Skip restitution for micro-impacts (gravity tick artifacts) to stop jitter/floating
    //             const restitution = Math.abs(vrad) > 0.5 ? PHYS_RESTITUTION : 0;
    //             v.x -= vrad * (1 + restitution) * nx;
    //             v.y -= vrad * (1 + restitution) * ny;
    //             v.z -= vrad * (1 + restitution) * nz;
    //             // Friction impulse at contact point (bottom of box) converts sliding → spin
    //             const vtmag = Math.sqrt(vtx*vtx + vty*vty + vtz*vtz);
    //             const Jn = Math.abs(vrad) * (1 + restitution) * po.body.mass;
    //             if (vtmag > 0.01 && Jn > 0.01) {
    //                 const fmag = Math.min(PHYS_GROUND_FRICTION * Jn, po.body.mass * vtmag);
    //                 po.body.applyImpulse(
    //                     new CANNON.Vec3(-fmag * vtx / vtmag, -fmag * vty / vtmag, -fmag * vtz / vtmag),
    //                     new CANNON.Vec3(-nx * he_y, -ny * he_y, -nz * he_y)
    //                 );
    //             }
    //         }
    //     }
    //     // Rolling resistance: runs whenever body is at or near the sphere surface,
    //     // not just when it has sunk below — fixes infinite spinning after a bounce.
    //     if (dist <= po.groundDist + 0.3 && dist > 0.001) {
    //         const rollingDamp = Math.pow(PHYS_ROLLING_FRICTION, delta);
    //         const av = po.body.angularVelocity;
    //         av.x *= rollingDamp; av.y *= rollingDamp; av.z *= rollingDamp;
    //     }
    //     // Sync Three.js mesh — offset mesh origin from body center in body-local Y direction
    //     // so that models with non-centred origins (e.g. origin at base) sit correctly on the
    //     // surface even after tumbling.
    //     const bq = po.body.quaternion;
    //     po.mesh.quaternion.set(bq.x, bq.y, bq.z, bq.w);
    //     if (Math.abs(po.meshOriginOffset) > 0.0001) {
    //         // Rotate body local Y (0,1,0) into world space via quaternion
    //         const byX = 2*(bq.x*bq.y - bq.w*bq.z);
    //         const byY = 1 - 2*(bq.x*bq.x + bq.z*bq.z);
    //         const byZ = 2*(bq.y*bq.z + bq.w*bq.x);
    //         const off = po.meshOriginOffset;
    //         po.mesh.position.set(p.x - byX*off, p.y - byY*off, p.z - byZ*off);
    //     } else {
    //         po.mesh.position.set(p.x, p.y, p.z);
    //     }
    //     // Keep surfaceNormal current so collision detection follows the object
    //     if (dist > 0.001) po.surfaceNormal.set(p.x / dist, p.y / dist, p.z / dist);
    // }
    // Sync Three.js mesh with Cannon.js body
    for (const po of physicsObjects) {
        if (po.body.sleepState === 2) continue; // sleeping — no update needed
        
        const p = po.body.position;
        const bq = po.body.quaternion;
        
        // Sync rotation
        po.mesh.quaternion.set(bq.x, bq.y, bq.z, bq.w);
        
        // Sync position (accounting for models where the origin is not centered)
        if (Math.abs(po.meshOriginOffset) > 0.0001) {
            // Rotate body local Y (0,1,0) into world space via quaternion
            const byX = 2*(bq.x*bq.y - bq.w*bq.z);
            const byY = 1 - 2*(bq.x*bq.x + bq.z*bq.z);
            const byZ = 2*(bq.y*bq.z + bq.w*bq.x);
            const off = po.meshOriginOffset;
            po.mesh.position.set(p.x - byX*off, p.y - byY*off, p.z - byZ*off);
        } else {
            po.mesh.position.set(p.x, p.y, p.z);
        }

        // Keep surfaceNormal current so collision detection follows the object
        const dist = p.length();
        if (dist > 0.001) po.surfaceNormal.set(p.x / dist, p.y / dist, p.z / dist);
    }

    // ── Random object collision + physics impulse ─────────────────────────────
    for (const po of physicsObjects) {
        const objN = po.surfaceNormal;
        const hit  = _up.dot(objN) > cosObjCollision;

        if (hit) {
            // Push player out (same arc-distance approach as school)
            _rotAxis.crossVectors(objN, _up).normalize();
            _q.setFromAxisAngle(_rotAxis, RANDOM_OBJ_COLLISION_RADIUS / SPHERE_RADIUS);
            playerPos.copy(objN).multiplyScalar(SPHERE_RADIUS).applyQuaternion(_q).setLength(SPHERE_RADIUS);
            _up.copy(playerPos).normalize();
            facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
            cam.baseDir.addScaledVector(_up, -cam.baseDir.dot(_up)).normalize();
            cam.savedBaseDir.addScaledVector(_up, -cam.savedBaseDir.dot(_up)).normalize();

            // Apply impulse only on the leading edge of each contact
            if (!po.colliding) {
                po.body.wakeUp();
                // Tangential component of (objN - playerN), projected onto obj surface
                const dx = objN.x - _up.x, dy = objN.y - _up.y, dz = objN.z - _up.z;
                const rc = dx * objN.x + dy * objN.y + dz * objN.z;
                let tx = dx - objN.x * rc, ty = dy - objN.y * rc, tz = dz - objN.z * rc;
                const tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
                if (tl > 0.001) { tx /= tl; ty /= tl; tz /= tl; }
                // 80 % slide along surface + 20 % outward bounce
                po.body.applyImpulse(new CANNON.Vec3(
                    (tx * 0.7 + objN.x * 0.4) * PHYS_IMPULSE_STR,
                    (ty * 0.7 + objN.y * 0.4) * PHYS_IMPULSE_STR,
                    (tz * 0.7 + objN.z * 0.4) * PHYS_IMPULSE_STR,
                ));
            }
        }

        po.colliding = hit;
    }

    // ── Snap camera back toward saved position when right-click released ──────
    if (cam.snapBack && !cam.isOrbiting) {
        cam.baseDir.lerp(cam.savedBaseDir, Math.min(1, SNAP_SPEED * delta)).normalize();
        cam.pitch = THREE.MathUtils.lerp(cam.pitch, cam.savedPitch, Math.min(1, SNAP_SPEED * delta));
        if (cam.baseDir.dot(cam.savedBaseDir) > 0.9999 && Math.abs(cam.pitch - cam.savedPitch) < 0.001) {
            cam.snapBack = false;
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
        .addScaledVector(cam.baseDir, cam.dist * Math.cos(cam.pitch))
        .addScaledVector(_up,         cam.dist * Math.sin(cam.pitch));

    camera.position.lerp(_targetCamPos, Math.min(1, 8 * delta));
    camera.up.copy(_up);
    _lookAt.copy(playerPos).addScaledVector(_up, 0.8);
    camera.lookAt(_lookAt);

    // ── Building tooltips (CSS3D) ─────────────────────────────────────────────
    schoolCss3d.quaternion.copy(camera.quaternion);
    tooltipSystem.update([{
        id: 'school',
        visible: schoolNormal.dot(camera.position) > 0,
        isNear:  arcDist < SCHOOL_NEAR_ARC_DIST,
    }]);

    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
    console.log(bookPanel.isOpen);
}
animate();
