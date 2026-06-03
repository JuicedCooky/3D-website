import * as THREE from 'three';
import pythonUrl from '../../3d_models/objects/technologies/python.glb?url';

const DEG = Math.PI / 180;

// ─── Python orbit config ───────────────────────────────────────────────────────
export const PYTHON_SCALE        = 0.1;   // model scale
export const PYTHON_ORBIT_RADIUS = 22.0;  // distance from world center
export const PYTHON_ORBIT_SPEED  = 0.4;   // rad/s — speed around orbit
export const PYTHON_ORBIT_TILT   = 35.0;  // degrees — tilt of orbit plane from equatorial
export const PYTHON_SHIFT_SPEED  = 0.07;  // rad/s — orbit plane precession speed
// axis around which the orbit plane precesses; (0,1,0) = standard axial precession
export const PYTHON_SHIFT_AXIS_X = 0;
export const PYTHON_SHIFT_AXIS_Y = 1;
export const PYTHON_SHIFT_AXIS_Z = 0;

export let pythonOrbitModel = null;

// ─── Internal orbit state ─────────────────────────────────────────────────────
const _orbitObjs = [];

// ─── Preallocated temporaries ─────────────────────────────────────────────────
const _shiftQ  = new THREE.Quaternion();
const _axisNow = new THREE.Vector3();
const _basisA  = new THREE.Vector3();
const _basisB  = new THREE.Vector3();
const _posNorm = new THREE.Vector3();
const _alignQ  = new THREE.Quaternion();
const _yUp     = new THREE.Vector3(0, 1, 0);

function _addOrbitObj(scene, loader, { url, scale, orbitRadius, orbitSpeed, orbitTilt, shiftSpeed, shiftAxisX, shiftAxisY, shiftAxisZ }, onLoaded) {
    const orbitAxisBase = new THREE.Vector3(
        Math.sin(orbitTilt * DEG),
        Math.cos(orbitTilt * DEG),
        0,
    ).normalize();

    const shiftAxis = new THREE.Vector3(shiftAxisX, shiftAxisY, shiftAxisZ).normalize();

    const obj = { wrapper: null, orbitAxisBase, shiftAxis, orbitAngle: 0, shiftAngle: 0, radius: orbitRadius, orbitSpeed, shiftSpeed };
    _orbitObjs.push(obj);

    loader.load(url, (gltf) => {
        const model  = gltf.scene;
        const bbox   = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        const wrapper = new THREE.Group();
        wrapper.add(model);
        scene.add(wrapper);
        obj.wrapper = wrapper;
        if (onLoaded) onLoaded(wrapper);
    }, undefined, (e) => console.error(url + ' orbit:', e));
}

export function initOrbitModels(scene, loader) {
    _addOrbitObj(scene, loader, {
        url:          pythonUrl,
        scale:        PYTHON_SCALE,
        orbitRadius:  PYTHON_ORBIT_RADIUS,
        orbitSpeed:   PYTHON_ORBIT_SPEED,
        orbitTilt:    PYTHON_ORBIT_TILT,
        shiftSpeed:   PYTHON_SHIFT_SPEED,
        shiftAxisX:   PYTHON_SHIFT_AXIS_X,
        shiftAxisY:   PYTHON_SHIFT_AXIS_Y,
        shiftAxisZ:   PYTHON_SHIFT_AXIS_Z,
    }, (wrapper) => { pythonOrbitModel = wrapper; });
}

export function updateOrbitModels(delta) {
    for (const obj of _orbitObjs) {
        if (!obj.wrapper) continue;

        obj.orbitAngle += obj.orbitSpeed * delta;
        obj.shiftAngle += obj.shiftSpeed * delta;

        _shiftQ.setFromAxisAngle(obj.shiftAxis, obj.shiftAngle);
        _axisNow.copy(obj.orbitAxisBase).applyQuaternion(_shiftQ).normalize();

        // Build two orthogonal basis vectors spanning the orbit plane
        if (Math.abs(_axisNow.y) < 0.9) {
            _basisA.set(0, 1, 0);
        } else {
            _basisA.set(1, 0, 0);
        }
        _basisA.crossVectors(_axisNow, _basisA).normalize();
        _basisB.crossVectors(_axisNow, _basisA).normalize();

        // Position on orbit circle
        obj.wrapper.position
            .copy(_basisA).multiplyScalar(Math.cos(obj.orbitAngle) * obj.radius)
            .addScaledVector(_basisB, Math.sin(obj.orbitAngle) * obj.radius);

        // Orient model Y-up radially outward from world center
        _posNorm.copy(obj.wrapper.position).normalize();
        _alignQ.setFromUnitVectors(_yUp, _posNorm);
        obj.wrapper.quaternion.copy(_alignQ);
    }
}
