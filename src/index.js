import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { keys, joystick, initCameraControls } from './controls.js';
import walkUrl  from '../3d_models/doro/doro_walk_2.glb?url';
import worldUrl from '../3d_models/world.glb?url';
import grassUrl from '../3d_models/objects/grass.glb?url';

import {
    schoolNormal, gundamNormal, theatreNormal,
    cosSchoolGrassExclusion,
    SCHOOL_COLLISION_RADIUS, SCHOOL_NEAR_ARC_DIST,
    GUNDAM_NEAR_ARC_DIST,
    THEATRE_NEAR_ARC_DIST,
    SCHOOL_THETA, SCHOOL_PHI,
    GUNDAM_THETA, GUNDAM_PHI,
    THEATRE_THETA, THEATRE_PHI,
    GITHUB_THETA, GITHUB_PHI,
    GITHUB_COLLISION_RADIUS, GITHUB_SPIN_SPEED, GITHUB_HEIGHT, GITHUB_NEAR_ARC_DIST,
    githubNormal, githubModel,
    UI_HEIGHT,
    gundamState,
    schoolCss3d, gundamCss3d, theatreCss3d, githubCss3d,
    schoolTooltipPos, gundamTooltipPos, theatreTooltipPos,
    setGithubLoadedCallback,
    initUniqueModels, initTooltipCss3d,
} from './uniqueModels.js';

import { initTheatreZoom } from './theatre.js';

import {
    RANDOM_OBJ_CLUSTERS, RANDOM_OBJ_COLLISION_RADIUS,
    cosObjCollision,
    physicsObjects,
    spawnRandomObjects,
    initScatter,
} from './scatter.js';

import { initUI, createBuildingTooltipSystem, createBookPanel, initMusicPlayer, createTheatreSlideshow, createMiniMap } from './ui.js';
import { initPhysics, PHYS_IMPULSE_STR } from './physics.js';



const SPHERE_RADIUS = 16;
const MOVE_SPEED = 3;
const TURN_SPEED = 6;
const HOME_PITCH = 0.4;
const WALK_ANIM_SPEED = 4.0;
const SPRINT_MULTIPLIER = 2.0;
const CAM_DIST = 10;

const ACCEL_TIME  = 3.0;
const ACCEL_BONUS = 1.5;

const GRASS_COUNT          = 10000;
const GRASS_SCALE_MIN      = 1.0;
const GRASS_SCALE_MAX      = 2.0;
const GRASS_SURFACE_OFFSET = -0.050;

const settings = {
    shadowMapSize:    2048,
    grassCount:       GRASS_COUNT,
    grassScaleMin:    GRASS_SCALE_MIN,
    grassScaleMax:    GRASS_SCALE_MAX,
    grassShadows:     false,
    panSpeed:         4,
    walkSpeed:        1,
    moveSpeed:        1,
    objClusters:      RANDOM_OBJ_CLUSTERS,
    parallaxStrength: 2,
    bgLayerSize:      100,
    fgLayerSize:      100,
    showAxis:         false,
};

const scene = new THREE.Scene();

const { physicsWorld, objectMaterial, stepPhysics } = initPhysics(SPHERE_RADIUS);

let ambientLight, sun;

function sampleImageColor(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 8;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 8, 8);
            const data = ctx.getImageData(0, 0, 8, 8).data;
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; }
            const n = data.length / 4;
            resolve(new THREE.Color(r / n / 255, g / n / 255, b / n / 255));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function detectForegroundEdge(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            if (!w || !h) { resolve(null); return; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const rowFill = (y) => {
                const d = ctx.getImageData(0, y, w, 1).data;
                let n = 0;
                for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
                return n / w;
            };
            resolve(rowFill(0) >= 0.8 ? 'top' : rowFill(h - 1) >= 0.8 ? 'bottom' : null);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// Background parallax
let parallax = null;
let bgLayer0Url = null;
{
    const allImages = import.meta.glob(
        '../assets/background/sky/*/background */*.png',
        { eager: true, import: 'default' }
    );

    const folders = {};
    for (const [path, url] of Object.entries(allImages)) {
        const filename = path.split('/').pop();
        if (filename.startsWith('orig')) continue;
        const folder = path.substring(0, path.lastIndexOf('/'));
        (folders[folder] ??= []).push({ n: parseInt(filename), url });
    }

    const keys = Object.keys(folders);
    const chosen = keys[Math.floor(Math.random() * keys.length)];
    const layers = folders[chosen].sort((a, b) => a.n - b.n).map(l => l.url);
    bgLayer0Url = layers[0];

    const fgUrls = layers.slice(1);
    Promise.all([sampleImageColor(layers[0]), ...fgUrls.map(sampleImageColor)])
        .then(([bgColor, ...fgColors]) => {
            if (bgColor && ambientLight) ambientLight.color.copy(bgColor);
            const brightest = fgColors
                .filter(Boolean)
                .reduce((best, c) => {
                    const hsl = {}; c.getHSL(hsl);
                    const bHsl = {}; best.getHSL(bHsl);
                    return hsl.l > bHsl.l ? c : best;
                }, fgColors.find(Boolean));
            if (brightest && sun) sun.color.copy(brightest);
        });

    document.body.style.cssText = 'margin:0;background:#000814;';

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;';
    const divs = layers.map((url) => {
        const d = document.createElement('div');
        d.style.cssText = `position:absolute;width:130%;height:130%;top:-15%;left:-15%;background-image:url('${url}');background-repeat:no-repeat;will-change:transform;`;
        container.appendChild(d);
        return d;
    });
    document.body.appendChild(container);

    const fgEdges = fgUrls.map(() => null);
    function applyOrientation() {
        const portrait = window.innerHeight > window.innerWidth;
        divs.forEach((d, i) => {
            if (i === 0) {
                d.style.backgroundSize = portrait ? 'cover' : `${settings.bgLayerSize}%`;
                d.style.backgroundPosition = 'center';
            } else {
                const edge = fgEdges[i - 1];
                d.style.backgroundSize = `${settings.fgLayerSize}%`;
                d.style.backgroundPosition = (portrait && edge) ? `center ${edge}` : 'center';
            }
        });
    }
    applyOrientation();
    fgUrls.forEach((url, idx) => {
        detectForegroundEdge(url).then(edge => { fgEdges[idx] = edge; applyOrientation(); });
    });

    const _p = new THREE.Vector3();
    parallax = {
        update(camera, strength) {
            _p.copy(camera.position).normalize();
            divs.forEach((d, i) => {
                const f  = divs.length > 1 ? i / (divs.length - 1) : 0;
                const ox = _p.z * f * strength * 80;
                const oy = _p.y * f * strength * 60;
                d.style.transform = `translate(${ox}px,${oy}px)`;
            });
        },
        setLayerSizes() { applyOrientation(); },
        applyOrientation,
    };
}

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);

function updateCameraFov() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.fov = aspect >= 1
        ? 60
        : 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / aspect));
    camera.updateProjectionMatrix();
}
updateCameraFov();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;z-index:1;';
document.body.appendChild(renderer.domElement);

if (bgLayer0Url) {
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileEquirectangularShader();
    new THREE.TextureLoader().load(bgLayer0Url, (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmremGen.fromEquirectangular(tex).texture;
        tex.dispose();
        pmremGen.dispose();
    });
}

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.cssText = 'position:fixed;top:0;left:0;z-index:3;pointer-events:none;';
document.body.insertBefore(cssRenderer.domElement, renderer.domElement);

// Lights
ambientLight = new THREE.AmbientLight(0x8899bb, 0.8);
scene.add(ambientLight);
sun = new THREE.DirectionalLight(0xfff8e0, 2.5);
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

// ─── Grass patches ─────────────────────────────────────────────────────────────
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
    inst.castShadow    = settings.grassShadows;

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
        _dummy.position.copy(normal).multiplyScalar(SPHERE_RADIUS + GRASS_SURFACE_OFFSET);
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

// ─── Unique models (school + gundam) ──────────────────────────────────────────
initUniqueModels(scene, loader, SPHERE_RADIUS);

// ─── Random scatter objects ────────────────────────────────────────────────────
initScatter(scene, loader, physicsWorld, objectMaterial, settings, SPHERE_RADIUS, schoolNormal);

// ─── Controls ─────────────────────────────────────────────────────────────────
const cam = initCameraControls(renderer.domElement, settings, HOME_PITCH, CAM_DIST);

// ─── Player state ─────────────────────────────────────────────────────────────
const playerPos = new THREE.Vector3(0, SPHERE_RADIUS, 0);
let facingDir = new THREE.Vector3(1, 0, 0);

{
    const _initUp  = new THREE.Vector3(0, 1, 0);
    const _initDir = new THREE.Vector3(0, 0, 1);
    camera.position
        .copy(playerPos)
        .addScaledVector(_initDir, CAM_DIST * Math.cos(HOME_PITCH))
        .addScaledVector(_initUp,  CAM_DIST * Math.sin(HOME_PITCH));
    camera.up.copy(_initUp);
    camera.lookAt(playerPos.clone().addScaledVector(_initUp, 0.8));
}

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
let moveTime = 0;

loader.load(walkUrl, (gltf) => {
    const model = gltf.scene;
    model.traverse((c) => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();
    action.timeScale = WALK_ANIM_SPEED * settings.walkSpeed;
    action.paused = true;
    scene.add(model);
    doro = { model, mixer, action };
}, undefined, (e) => console.error('walk:', e));

function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;
    updateCameraFov();
    renderer.setSize(w, h);
    cssRenderer.setSize(w, h);
    if (parallax) parallax.applyOrientation();
}
window.addEventListener('resize', onResize);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
}
requestAnimationFrame(onResize);

const clock = new THREE.Clock();

// ─── Lat/Lon debug grid ────────────────────────────────────────────────────────
function createWorldGrid() {
    const group = new THREE.Group();
    const R   = SPHERE_RADIUS + 0.08;
    const SEG = 96;
    const D   = Math.PI / 180;

    const matDim     = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.45, transparent: true });
    const matRef     = new THREE.LineBasicMaterial({ color: 0xff4422, opacity: 0.85, transparent: true });
    const matAxis    = new THREE.LineBasicMaterial({ color: 0x44ff88, opacity: 0.9,  transparent: true });

    // Latitude circles every 30° (-60 to +60; poles are just the axis endpoints)
    for (let lat = -60; lat <= 60; lat += 30) {
        const phi = (90 - lat) * D;
        const y   = R * Math.cos(phi);
        const r   = R * Math.sin(phi);
        const pts = [];
        for (let i = 0; i <= SEG; i++) {
            const t = (i / SEG) * Math.PI * 2;
            pts.push(new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t)));
        }
        group.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            lat === 0 ? matRef : matDim,
        ));
    }

    // Longitude lines every 30° (full pole-to-pole arcs)
    for (let lon = 0; lon < 360; lon += 30) {
        const theta = lon * D;
        const pts   = [];
        for (let i = 0; i <= SEG; i++) {
            const phi = (i / SEG) * Math.PI;
            pts.push(new THREE.Vector3(
                R * Math.sin(phi) * Math.cos(theta),
                R * Math.cos(phi),
                R * Math.sin(phi) * Math.sin(theta),
            ));
        }
        group.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            lon === 0 ? matRef : matDim,
        ));
    }

    // Polar axis (Y+  = north pole, Y− = south pole)
    group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -R * 1.15, 0),
            new THREE.Vector3(0,  R * 1.15, 0),
        ]),
        matAxis,
    ));

    // Marker dot at lon=0, lat=0 (where the two red lines cross on the equator)
    const dotGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xff4422 });
    const dot    = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(R, 0, 0); // theta=0, phi=π/2  →  (R, 0, 0)
    group.add(dot);

    // Invisible sphere used only as a raycasting target
    const hitSphere = new THREE.Mesh(
        new THREE.SphereGeometry(R, 32, 32),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    scene.add(hitSphere);

    // Floating tooltip DOM element
    const tooltip = document.createElement('div');
    Object.assign(tooltip.style, {
        position:      'fixed',
        pointerEvents: 'none',
        background:    'rgba(10,20,40,0.88)',
        color:         '#ffe8b0',
        fontFamily:    'Courier New, monospace',
        fontSize:      '12px',
        fontWeight:    'bold',
        padding:       '4px 10px',
        borderRadius:  '2px',
        border:        '1px solid rgba(255,200,80,0.4)',
        zIndex:        '202',
        display:       'none',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        whiteSpace:    'nowrap',
    });
    document.body.appendChild(tooltip);

    group.visible = false;
    scene.add(group);
    return { group, hitSphere, tooltip };
}
const { group: worldGrid, hitSphere: _gridHitSphere, tooltip: _gridTooltip } = createWorldGrid();

// Raycaster for lat/lon hover (only active when grid is visible)
{
    const rc     = new THREE.Raycaster();
    const mouse  = new THREE.Vector2();
    const RAD    = 180 / Math.PI;

    window.addEventListener('mousemove', (e) => {
        if (!settings.showAxis) { _gridTooltip.style.display = 'none'; return; }

        mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);

        rc.setFromCamera(mouse, camera);
        const hits = rc.intersectObject(_gridHitSphere);

        if (hits.length > 0) {
            const n   = hits[0].point.clone().normalize();
            const lat = 90 - Math.acos(Math.max(-1, Math.min(1, n.y))) * RAD;
            let   lon = Math.atan2(n.z, n.x) * RAD;
            if (lon < 0) lon += 360;

            _gridTooltip.textContent  = `Lat: ${lat.toFixed(1)}°  Lon: ${lon.toFixed(1)}°`;
            _gridTooltip.style.display = 'block';
            _gridTooltip.style.left    = (e.clientX + 16) + 'px';
            _gridTooltip.style.top     = (e.clientY - 12) + 'px';
        } else {
            _gridTooltip.style.display = 'none';
        }
    });

    window.addEventListener('mouseleave', () => { _gridTooltip.style.display = 'none'; });
}

initUI(settings, {
    onGrassApply: spawnGrass,
    onGrassShadowChange: (enabled) => {
        if (currentGrass) currentGrass.castShadow = enabled;
    },
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
    onBgSizeChange:  (v)    => parallax.setLayerSizes(v, settings.fgLayerSize),
    onFgSizeChange:  (v)    => parallax.setLayerSizes(settings.bgLayerSize, v),
    onAxisToggle: (show) => {
        worldGrid.visible = show;
        if (!show) _gridTooltip.style.display = 'none';
    },
});

const musicPlayer = initMusicPlayer();
const tooltipSystem = createBuildingTooltipSystem(['school', 'gundam', 'theatre', 'github']);
const bookPanel = createBookPanel();
const theatreSlideshow = createTheatreSlideshow();

const miniMap = createMiniMap([
    { id: 'school',  label: 'School',  icon: '🏫', theta: SCHOOL_THETA,  phi: SCHOOL_PHI  },
    { id: 'gundam',  label: 'Gundam',  icon: '🤖', theta: GUNDAM_THETA,  phi: GUNDAM_PHI  },
    { id: 'theatre', label: 'Theatre', icon: '🎭', theta: THEATRE_THETA, phi: THEATRE_PHI },
    { id: 'github',  label: 'GitHub',  icon: '🐙', theta: GITHUB_THETA,  phi: GITHUB_PHI  },
], {
    onTeleport(theta, phi) {
        const sinPhi = Math.sin(phi);
        playerPos.set(
            sinPhi * Math.cos(theta) * SPHERE_RADIUS,
            Math.cos(phi)            * SPHERE_RADIUS,
            sinPhi * Math.sin(theta) * SPHERE_RADIUS,
        );
        const up = playerPos.clone().normalize();
        const ref = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        facingDir.crossVectors(ref, up).normalize();
        cam.baseDir.crossVectors(up, facingDir).normalize();
    },
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') {
        e.preventDefault();
        miniMap.toggle();
    }
});

const cssScene = new THREE.Scene();
initTooltipCss3d(tooltipSystem, cssScene);

let _currentArcDist        = Infinity;
let _currentGundamArcDist  = Infinity;
let _currentTheatreArcDist = Infinity;
let _currentGithubArcDist  = Infinity;

// Tracks github body's current surface normal (updated after physics step)
const _githubCurrentNormal = githubNormal.clone();

let githubPhysBody  = null;
let githubColliding = false;
let githubSpinning  = true;

setGithubLoadedCallback(() => {
    const gp = githubNormal.clone().multiplyScalar(SPHERE_RADIUS + GITHUB_HEIGHT);
    githubPhysBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(GITHUB_COLLISION_RADIUS * 0.65),
        material: objectMaterial,
        linearDamping:  0.4,
        angularDamping: 0.8,
    });
    githubPhysBody.position.set(gp.x, gp.y, gp.z);
    physicsWorld.addBody(githubPhysBody);
    githubPhysBody.sleep();
});


tooltipSystem.getElement('school').querySelector('.bld-tt-shell').addEventListener('click', (e) => {
    if (!bookPanel.isOpen) bookPanel.open(e.clientX, e.clientY);
});

tooltipSystem.getElement('gundam').querySelector('.bld-tt-shell').addEventListener('click', () => {
    if (!gundamState || gundamState.animPhase === 'playing') return;
    gundamState.idleModel.visible    = false;
    gundamState.standUpModel.visible = true;
    gundamState.standUpAction.reset().play();
    gundamState.animPhase = 'playing';
});

tooltipSystem.getElement('github').querySelector('.bld-tt-shell').addEventListener('click', () => {
    window.open('https://github.com/JuicedCooky', '_blank', 'noopener,noreferrer');
});

const theatre = initTheatreZoom({
    tooltipSystem,
    theatreSlideshow,
    getDoro:    () => doro,
    camera,
    rendererEl: renderer.domElement,
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        if (_currentArcDist < SCHOOL_NEAR_ARC_DIST && !bookPanel.isOpen) {
            const v = schoolTooltipPos.clone().project(camera);
            const sx = ( v.x * 0.5 + 0.5) * window.innerWidth;
            const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
            bookPanel.open(sx, sy);
        } else if (_currentGundamArcDist < GUNDAM_NEAR_ARC_DIST) {
            if (gundamState && gundamState.animPhase !== 'playing') {
                tooltipSystem.getElement('gundam').querySelector('.bld-tt-shell').click();
            }
        } else if (_currentTheatreArcDist < THEATRE_NEAR_ARC_DIST && !theatre.isActive) {
            theatre.enter();
        }
    }
});

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!doro) { renderer.render(scene, camera); return; }

    // ── Surface normal ───────────────────────────────────────────────────────
    _up.copy(playerPos).normalize();
    cam.currentUp.copy(_up);

    cam.disabled = theatre.isActive;
    if (cam.disabled) cam.isOrbiting = false;

    if (!cam.initialised) {
        cam.baseDir.set(0, 0, 1).addScaledVector(_up, -_up.z).normalize();
        cam.initialised = true;
    }

    facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();

    _camFwd.copy(cam.baseDir).negate();
    _camRight.crossVectors(_camFwd, _up).normalize();

    _moveDir.set(0, 0, 0);
    if (!theatre.isActive) {
        if (keys.has('KeyW')) _moveDir.add(_camFwd);
        if (keys.has('KeyS')) _moveDir.sub(_camFwd);
        if (keys.has('KeyA')) _moveDir.sub(_camRight);
        if (keys.has('KeyD')) _moveDir.add(_camRight);
        if (joystick.x !== 0 || joystick.y !== 0) {
            _moveDir.addScaledVector(_camFwd,  joystick.y);
            _moveDir.addScaledVector(_camRight, joystick.x);
        }
    }

    const moving = _moveDir.lengthSq() > 0;
    const sprinting = moving && keys.has('ShiftLeft');
    const sprintMult = sprinting ? SPRINT_MULTIPLIER : 1.0;

    if (moving !== isMoving) {
        isMoving = moving;
        doro.action.paused = !moving;
        if (moving) musicPlayer.triggerPlay();
        else { doro.action.time = 0; doro.mixer.update(0); moveTime = 0; }
    }

    doro.action.timeScale = WALK_ANIM_SPEED * settings.walkSpeed * sprintMult;

    if (moving) {
        moveTime = Math.min(moveTime + delta, ACCEL_TIME);
        const accelMult = 1 + ACCEL_BONUS * (moveTime / ACCEL_TIME);

        _moveDir.normalize();

        const dot = Math.max(-1, Math.min(1, facingDir.dot(_moveDir)));
        if (dot < 0.9999) {
            _rotAxis.crossVectors(facingDir, _moveDir).normalize();
            _q.setFromAxisAngle(_rotAxis, Math.min(Math.acos(dot), TURN_SPEED * delta));
            facingDir.applyQuaternion(_q).normalize();
        }

        _rotAxis.crossVectors(_up, _moveDir).normalize();
        _q.setFromAxisAngle(_rotAxis, settings.moveSpeed * MOVE_SPEED * accelMult * sprintMult * delta / SPHERE_RADIUS);
        playerPos.applyQuaternion(_q).setLength(SPHERE_RADIUS);
        facingDir.applyQuaternion(_q).normalize();

        cam.baseDir.applyQuaternion(_q).normalize();
    }

    // ── Post-move surface re-projection ──────────────────────────────────────
    _up.copy(playerPos).normalize();
    facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
    cam.baseDir.addScaledVector(_up, -cam.baseDir.dot(_up)).normalize();

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
    }

    // ── GitHub collision ──────────────────────────────────────────────────────
    const githubArcDist = Math.acos(Math.max(-1, Math.min(1, _up.dot(_githubCurrentNormal)))) * SPHERE_RADIUS;
    _currentGithubArcDist = githubArcDist;
    const githubHit = githubArcDist < GITHUB_COLLISION_RADIUS && githubArcDist > 0.0001;
    if (githubHit) {
        _rotAxis.crossVectors(_githubCurrentNormal, _up).normalize();
        _q.setFromAxisAngle(_rotAxis, GITHUB_COLLISION_RADIUS / SPHERE_RADIUS);
        playerPos.copy(_githubCurrentNormal).multiplyScalar(SPHERE_RADIUS).applyQuaternion(_q).setLength(SPHERE_RADIUS);
        _up.copy(playerPos).normalize();
        facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
        cam.baseDir.addScaledVector(_up, -cam.baseDir.dot(_up)).normalize();
    }

    // ── Github physics – apply gravity before world step ─────────────────────
    if (githubPhysBody && githubPhysBody.sleepState < 2) {
        const gp = githubPhysBody.position;
        const gl = gp.length();
        if (gl > 0.001) {
            const gs = -githubPhysBody.mass * 20 / gl;
            githubPhysBody.force.set(gp.x * gs, gp.y * gs, gp.z * gs);
        }
    }

    // ── Physics step ─────────────────────────────────────────────────────────
    stepPhysics(delta, physicsObjects);

    // ── Random object collision + physics impulse ─────────────────────────────
    for (const po of physicsObjects) {
        const objN = po.surfaceNormal;
        const hit  = _up.dot(objN) > cosObjCollision;

        if (hit) {
            _rotAxis.crossVectors(objN, _up).normalize();
            _q.setFromAxisAngle(_rotAxis, RANDOM_OBJ_COLLISION_RADIUS / SPHERE_RADIUS);
            playerPos.copy(objN).multiplyScalar(SPHERE_RADIUS).applyQuaternion(_q).setLength(SPHERE_RADIUS);
            _up.copy(playerPos).normalize();
            facingDir.addScaledVector(_up, -facingDir.dot(_up)).normalize();
            cam.baseDir.addScaledVector(_up, -cam.baseDir.dot(_up)).normalize();

            if (!po.colliding) {
                po.body.wakeUp();
                const dx = objN.x - _up.x, dy = objN.y - _up.y, dz = objN.z - _up.z;
                const rc = dx * objN.x + dy * objN.y + dz * objN.z;
                let tx = dx - objN.x * rc, ty = dy - objN.y * rc, tz = dz - objN.z * rc;
                const tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
                if (tl > 0.001) { tx /= tl; ty /= tl; tz /= tl; }
                po.body.applyImpulse(new CANNON.Vec3(
                    (tx * 0.7 + objN.x * 0.4) * PHYS_IMPULSE_STR,
                    (ty * 0.7 + objN.y * 0.4) * PHYS_IMPULSE_STR,
                    (tz * 0.7 + objN.z * 0.4) * PHYS_IMPULSE_STR,
                ));
            }
        }

        po.colliding = hit;
    }

    // ── Github post-step: ground clamp, position sync, collision impulse ─────
    if (githubPhysBody) {
        if (githubPhysBody.sleepState !== 2) {
            const gp  = githubPhysBody.position;
            const gd  = SPHERE_RADIUS;
            const gl  = gp.length();
            if (gl < gd && gl > 0.001) {
                const sc = gd / gl;
                gp.x *= sc; gp.y *= sc; gp.z *= sc;
                const nx = gp.x / gd, ny = gp.y / gd, nz = gp.z / gd;
                const v  = githubPhysBody.velocity;
                const vn = v.x*nx + v.y*ny + v.z*nz;
                if (vn < 0) { v.x -= vn*nx; v.y -= vn*ny; v.z -= vn*nz; }
            }
            const gl2 = gp.length();
            if (gl2 > 0.001) _githubCurrentNormal.set(gp.x/gl2, gp.y/gl2, gp.z/gl2);
            if (githubModel) githubModel.position.set(gp.x, gp.y, gp.z);
        }

        if (githubHit && !githubColliding && githubPhysBody) {
            githubSpinning = false;
            githubPhysBody.wakeUp();
            const objN = _githubCurrentNormal;
            const dx = objN.x - _up.x, dy = objN.y - _up.y, dz = objN.z - _up.z;
            const rc = dx*objN.x + dy*objN.y + dz*objN.z;
            let tx = dx - objN.x*rc, ty = dy - objN.y*rc, tz = dz - objN.z*rc;
            const tl = Math.sqrt(tx*tx + ty*ty + tz*tz);
            if (tl > 0.001) { tx /= tl; ty /= tl; tz /= tl; }
            githubPhysBody.applyImpulse(new CANNON.Vec3(
                (tx * 0.7 + objN.x * 0.4) * PHYS_IMPULSE_STR,
                (ty * 0.7 + objN.y * 0.4) * PHYS_IMPULSE_STR,
                (tz * 0.7 + objN.z * 0.4) * PHYS_IMPULSE_STR,
            ));
        }
        githubColliding = githubHit;
    }

    // ── Orient model ──────────────────────────────────────────────────────────
    _right.crossVectors(_up, facingDir).normalize();
    _mat.makeBasis(_right, _up, facingDir);
    doro.model.quaternion.setFromRotationMatrix(_mat);
    doro.model.position.copy(playerPos);

    doro.mixer.update(delta);
    if (gundamState && gundamState.animPhase === 'playing') gundamState.mixer.update(delta);

    // ── GitHub spin — stops permanently on first player collision
    if (githubModel && githubSpinning) {
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), GITHUB_SPIN_SPEED * delta);
        githubModel.quaternion.multiply(_q).normalize();
    }

    // ── Camera position ───────────────────────────────────────────────────────
    if (theatre.isActive) {
        theatre.updateCamera(camera, delta);
    } else {
        _targetCamPos.copy(playerPos)
            .addScaledVector(cam.baseDir, cam.dist * Math.cos(cam.pitch))
            .addScaledVector(_up,         cam.dist * Math.sin(cam.pitch));
        camera.position.lerp(_targetCamPos, Math.min(1, 8 * delta));
        camera.up.copy(_up);
        _lookAt.copy(playerPos).addScaledVector(_up, 0.8);
        camera.lookAt(_lookAt);
    }

    // ── Building tooltips (CSS3D) ─────────────────────────────────────────────
    _currentGundamArcDist  = Math.acos(Math.max(-1, Math.min(1, _up.dot(gundamNormal))))  * SPHERE_RADIUS;
    _currentTheatreArcDist = Math.acos(Math.max(-1, Math.min(1, _up.dot(theatreNormal)))) * SPHERE_RADIUS;
    const gundamArcDist  = _currentGundamArcDist;
    const theatreArcDist = _currentTheatreArcDist;
    schoolCss3d.quaternion.copy(camera.quaternion);
    gundamCss3d.quaternion.copy(camera.quaternion);
    theatreCss3d.quaternion.copy(camera.quaternion);
    if (githubCss3d) {
        githubCss3d.quaternion.copy(camera.quaternion);
        // Follow physics body if active, otherwise stay at static tooltip pos
        if (githubPhysBody) {
            const gp  = githubPhysBody.position;
            const gl  = Math.sqrt(gp.x*gp.x + gp.y*gp.y + gp.z*gp.z);
            if (gl > 0.001) {
                githubCss3d.position.set(
                    gp.x/gl * (gl + UI_HEIGHT),
                    gp.y/gl * (gl + UI_HEIGHT),
                    gp.z/gl * (gl + UI_HEIGHT),
                );
            }
        }
    }
    tooltipSystem.update([
        {
            id: 'school',
            visible: schoolNormal.dot(camera.position) > 0,
            isNear:  arcDist < SCHOOL_NEAR_ARC_DIST,
        },
        {
            id: 'gundam',
            visible: gundamNormal.dot(camera.position) > 0,
            isNear:  gundamArcDist < GUNDAM_NEAR_ARC_DIST,
        },
        {
            id: 'theatre',
            visible: !theatre.isActive && theatreNormal.dot(camera.position) > 0,
            isNear:  theatreArcDist < THEATRE_NEAR_ARC_DIST,
        },
        {
            id: 'github',
            visible: _githubCurrentNormal.dot(camera.position) > 0,
            isNear:  _currentGithubArcDist < GITHUB_NEAR_ARC_DIST,
        },
    ]);

    parallax.update(camera, settings.parallaxStrength);
    if (miniMap.isOpen) miniMap.update(_up);
    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
}
animate();
