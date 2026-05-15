import * as THREE from 'three';
import nipplejs from 'nipplejs';

// ─── Keyboard ─────────────────────────────────────────────────────────────────
export const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup',   (e) => keys.delete(e.code));

// ─── Virtual joystick (touch devices only) ────────────────────────────────────
export const joystick = { x: 0, y: 0 };

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

    manager.on('move', (event) => {
        if (!event.data?.vector) return;
        joystick.x =  event.data.vector.x;
        joystick.y =  event.data.vector.y;
    });
    manager.on('end', () => { joystick.x = 0; joystick.y = 0; });
}

// ─── Camera orbit / zoom controls ─────────────────────────────────────────────
// Returns a mutable state object that animate() reads and writes each frame.
// cam.currentUp must be kept up-to-date by the caller (set via .copy() each frame).
// Set cam.disabled = true to freeze all camera input (e.g. during theatre zoom).
export function initCameraControls(domElement, settings, homePitch, initDist) {
    const cam = {
        baseDir:     new THREE.Vector3(0, 0, 1), // FROM player TOWARD camera, tangent to sphere
        pitch:       homePitch,
        dist:        initDist,
        isOrbiting:  false,
        disabled:    false,
        initialised: false,
        currentUp:   new THREE.Vector3(0, 1, 0), // sphere normal at player; updated each frame
    };

    let touchOrbit = null;
    let pinchDist  = null;

    function pinchSep(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    domElement.addEventListener('mousedown', (e) => {
        if (cam.disabled) return;
        if (e.button === 2) {
            cam.isOrbiting = true;
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            cam.isOrbiting = false;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!cam.isOrbiting || cam.disabled) return;
        const yawQ = new THREE.Quaternion().setFromAxisAngle(cam.currentUp, -e.movementX * settings.panSpeed * 0.001);
        cam.baseDir.applyQuaternion(yawQ);
        cam.baseDir.addScaledVector(cam.currentUp, -cam.baseDir.dot(cam.currentUp)).normalize();
        cam.pitch = Math.max(0.05, Math.min(1.3, cam.pitch + e.movementY * settings.panSpeed * 0.001));
    });

    domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (cam.disabled) return;
        cam.dist = Math.max(2, Math.min(20, cam.dist + e.deltaY * 0.01));
    }, { passive: false });

    domElement.addEventListener('touchstart', (e) => {
        if (cam.disabled) return;
        e.preventDefault();
        if (e.touches.length >= 2) {
            if (touchOrbit) { touchOrbit = null; cam.isOrbiting = false; }
            pinchDist = pinchSep(e.touches);
            return;
        }
        const t = e.changedTouches[0];
        if (!touchOrbit && t.clientY < window.innerHeight * 0.5) {
            touchOrbit = { id: t.identifier, lastX: t.clientX, lastY: t.clientY };
            cam.isOrbiting = true;
        }
    }, { passive: false });

    domElement.addEventListener('touchmove', (e) => {
        if (cam.disabled) return;
        e.preventDefault();
        if (e.touches.length >= 2 && pinchDist !== null) {
            const dist = pinchSep(e.touches);
            cam.dist = Math.max(2, Math.min(20, cam.dist - (dist - pinchDist) * 0.02));
            pinchDist = dist;
            return;
        }
        if (!touchOrbit) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier !== touchOrbit.id) continue;
            const dx = t.clientX - touchOrbit.lastX;
            const dy = t.clientY - touchOrbit.lastY;
            touchOrbit.lastX = t.clientX;
            touchOrbit.lastY = t.clientY;
            const yawQ = new THREE.Quaternion().setFromAxisAngle(cam.currentUp, -dx * settings.panSpeed * 0.001);
            cam.baseDir.applyQuaternion(yawQ);
            cam.baseDir.addScaledVector(cam.currentUp, -cam.baseDir.dot(cam.currentUp)).normalize();
            cam.pitch = Math.max(0.05, Math.min(1.3, cam.pitch + dy * settings.panSpeed * 0.001));
        }
    }, { passive: false });

    function onTouchEnd(e) {
        e.preventDefault();
        if (touchOrbit) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier !== touchOrbit.id) continue;
                touchOrbit = null;
                cam.isOrbiting = false;
                break;
            }
        }
        if (e.touches.length < 2) pinchDist = null;
    }
    domElement.addEventListener('touchend',    onTouchEnd, { passive: false });
    domElement.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return cam;
}
