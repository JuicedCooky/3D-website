import * as THREE from 'three';
import {
    theatreScreenMesh,
    theatreWorldQuaternion,
    theatreNormal,
    advanceTheatreSlide,
    theatreSlideIdx,
} from './uniqueModels.js';

const _gameUIIds = ['ui-settings-btn', 'ui-film-btn', 'music-player'];

function setGameUIVisible(visible) {
    _gameUIIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    });
}

// ─── Slide metadata ────────────────────────────────────────────────────────────
const SLIDES = [
    {
        title: 'Portfolio Website',
        body: 'An interactive 3D portfolio built on a spherical world with physics, custom GLSL shaders, and CSS3D overlays. Walk around, explore buildings, and discover projects.',
        url: 'https://github.com/JuicedCooky',
    },
    {
        title: 'Project Beta',
        body: 'Explorations in reinforcement learning applied to game AI. The agent learns optimal pathing through a dynamic environment using Q-learning and policy gradient methods.',
        url: 'https://github.com/JuicedCooky',
    },
    {
        title: 'Project Gamma',
        body: 'A full-stack collaborative music app — real-time MIDI over WebSockets with a browser-native sequencer, mixer, and shared sound library.',
        url: 'https://github.com/JuicedCooky',
    },
];

// ─── Description panel ────────────────────────────────────────────────────────
function _createDescPanel() {
    const style = document.createElement('style');
    style.textContent = `
        #theatre-desc-panel {
            position: fixed;
            top: 68px;
            left: 50%;
            transform: translateX(-50%) translateY(-10px);
            width: min(520px, 82vw);
            padding: 11px 17px 12px;
            background: rgba(6, 4, 14, 0.84);
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 3px;
            backdrop-filter: blur(12px);
            font-family: 'Courier New', monospace;
            color: #ddd5c0;
            z-index: 151;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.32s ease, transform 0.32s ease;
        }
        #theatre-desc-panel.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        #theatre-desc-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 6px;
            color: #c8a85a;
        }
        #theatre-desc-body {
            font-size: 10.5px;
            line-height: 1.7;
            opacity: 0.72;
        }
        #theatre-desc-hint {
            margin-top: 9px;
            font-size: 9px;
            opacity: 0.32;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        @media (max-width: 520px) {
            #theatre-desc-panel { top: 56px; padding: 8px 12px 9px; }
            #theatre-desc-title { font-size: 10px; letter-spacing: 2px; }
            #theatre-desc-body  { font-size: 9.5px; }
        }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'theatre-desc-panel';
    panel.innerHTML = `
        <div id="theatre-desc-title"></div>
        <div id="theatre-desc-body"></div>
        <div id="theatre-desc-hint">Click screen · visit project</div>
    `;
    document.body.appendChild(panel);

    const titleEl = panel.querySelector('#theatre-desc-title');
    const bodyEl  = panel.querySelector('#theatre-desc-body');

    function _apply(idx) {
        const d = SLIDES[idx % SLIDES.length];
        titleEl.textContent = d.title;
        bodyEl.textContent  = d.body;
    }

    return {
        show(idx) { _apply(idx); panel.classList.add('visible'); },
        update(idx) { _apply(idx); },
        hide()     { panel.classList.remove('visible'); },
    };
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function initTheatreZoom({ tooltipSystem, theatreSlideshow, getDoro, camera, rendererEl }) {
    let _active = false;
    const _camTarget    = new THREE.Vector3();
    const _lookAt       = new THREE.Vector3();
    const _scratch      = new THREE.Vector3();
    const _screenNormal = new THREE.Vector3();

    const _descPanel = _createDescPanel();
    const _raycaster = new THREE.Raycaster();
    const _mouse     = new THREE.Vector2();

    function exit() {
        _active = false;
        theatreSlideshow.hide();
        _descPanel.hide();
        setGameUIVisible(true);
        rendererEl.style.cursor = '';
        const doro = getDoro();
        if (doro) doro.model.visible = true;
    }

    function _advance(dir) {
        advanceTheatreSlide(dir);
        _descPanel.update(theatreSlideIdx);
    }

    function enter() {
        if (_active || !theatreScreenMesh) return;
        _active = true;

        theatreScreenMesh.getWorldPosition(_scratch);
        _screenNormal.set(1, 0, 0).applyQuaternion(theatreWorldQuaternion).normalize();
        _camTarget.copy(_scratch).addScaledVector(_screenNormal, 3.5);
        _lookAt.copy(_scratch);

        const doro = getDoro();
        if (doro) doro.model.visible = false;
        setGameUIVisible(false);
        theatreSlideshow.show({
            onClose: exit,
            onPrev:  () => _advance(-1),
            onNext:  () => _advance(1),
        });
        _descPanel.show(theatreSlideIdx);
    }

    // ── Screen click → open project URL ───────────────────────────────────────
    rendererEl.addEventListener('click', (e) => {
        if (!_active || !theatreScreenMesh) return;
        _mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        _raycaster.setFromCamera(_mouse, camera);
        if (_raycaster.intersectObject(theatreScreenMesh, false).length > 0) {
            const url = SLIDES[theatreSlideIdx % SLIDES.length].url;
            window.open(url, '_blank', 'noopener');
        }
    });

    // ── Pointer cursor when hovering the screen ────────────────────────────────
    rendererEl.addEventListener('mousemove', (e) => {
        if (!_active || !theatreScreenMesh) return;
        _mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        _raycaster.setFromCamera(_mouse, camera);
        rendererEl.style.cursor =
            _raycaster.intersectObject(theatreScreenMesh, false).length > 0 ? 'pointer' : '';
    });

    tooltipSystem.getElement('theatre').querySelector('.bld-tt-shell')
        .addEventListener('click', enter);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape'     && _active) { exit();       return; }
        if (e.code === 'ArrowLeft'  && _active) { _advance(-1); return; }
        if (e.code === 'ArrowRight' && _active) { _advance(1);  return; }
    });

    return {
        get isActive() { return _active; },
        enter,
        exit,
        updateCamera(cam, delta) {
            cam.position.lerp(_camTarget, Math.min(1, 4 * delta));
            cam.up.copy(theatreNormal);
            cam.lookAt(_lookAt);
        },
    };
}
