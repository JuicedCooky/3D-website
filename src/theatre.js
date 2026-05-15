import * as THREE from 'three';
import slide0Url from '../assets/slideshow/Screenshot 2026-05-09 042521.png?url';
import thesisUrl from '../assets/slideshow/thesis2d.gif?url';
import {
    theatreScreenMesh,
    theatreWorldQuaternion,
    theatreNormal,
    setTheatreScreenReadyCallback,
} from './uniqueModels.js';

// ─── Slideshow state ──────────────────────────────────────────────────────────
const THEATRE_SLIDES = [
    { label: 'thesis', bg: '#1a1a2e', accent: '#e94560', imgUrl: thesisUrl },
    { label: 'Project 2', bg: '#0f3460', accent: '#53d8fb' },
    { label: 'Project 3', bg: '#16213e', accent: '#f5a623' },
];
// ─── Slide metadata ────────────────────────────────────────────────────────────
const SLIDES = [
    {
        title: 'Portfolio Website',
        body: 'A culmination of knowledge learnt from my undergraduate years by applying and researching innovative and nuances on continual learning for neural networks. Researching and expanding on existing continual learning methods importantly on evaluating across multi-domain tasks.',
        url: 'https://github.com/JuicedCooky/thesis',
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

let _slideIdx     = 0;
let _slideCanvas  = null;
let _slideCtx     = null;
let _slideTexture = null;
let _activeGifImg = null;

function _drawSlideFallback(slide, idx) {
    const w = _slideCanvas.width, h = _slideCanvas.height;
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
}

function _blitImg(img) {
    const w = _slideCanvas.width, h = _slideCanvas.height;
    _slideCtx.fillStyle = '#000';
    _slideCtx.fillRect(0, 0, w, h);
    const PAD = 16;
    const s = Math.min((w - PAD * 2) / img.naturalWidth, (h - PAD * 2) / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    _slideCtx.save();
    _slideCtx.translate(w, 0);
    _slideCtx.scale(-1, 1);
    _slideCtx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    _slideCtx.restore();
    if (_slideTexture) _slideTexture.needsUpdate = true;
}

function _tickGif() {
    if (_activeGifImg) _blitImg(_activeGifImg);
}

function _clearGif() {
    if (_activeGifImg?.parentNode) _activeGifImg.parentNode.removeChild(_activeGifImg);
    _activeGifImg = null;
}

// RAF loop so GIF plays on the mesh at all times, not only during theatre zoom
;(function _gifRaf() {
    requestAnimationFrame(_gifRaf);
    _tickGif();
}());

function _drawSlide(idx) {
    if (!_slideCtx) return;
    _clearGif();
    const slide = THEATRE_SLIDES[idx % THEATRE_SLIDES.length];
    if (slide.imgUrl) {
        const img = new Image();
        const isGif = new URL(slide.imgUrl, location.href).pathname.toLowerCase().endsWith('.gif');
        img.onload = () => {
            _blitImg(img);
            if (isGif) {
                // Must be in the viewport (not display:none / opacity:0 / off-screen)
                // for browsers to keep advancing GIF frames.
                Object.assign(img.style, {
                    position: 'fixed', top: '0', left: '0',
                    width: '1px', height: '1px',
                    opacity: '0.01', pointerEvents: 'none', zIndex: '-9999',
                });
                document.body.appendChild(img);
                _activeGifImg = img;
            }
        };
        img.src = slide.imgUrl;
    } else {
        const w = _slideCanvas.width, h = _slideCanvas.height;
        _slideCtx.save();
        _slideCtx.translate(w, 0);
        _slideCtx.scale(-1, 1);
        _drawSlideFallback(slide, idx);
        _slideCtx.restore();
        if (_slideTexture) _slideTexture.needsUpdate = true;
    }
}

function _advanceSlide(dir) {
    _slideIdx = ((_slideIdx + dir) % THEATRE_SLIDES.length + THEATRE_SLIDES.length) % THEATRE_SLIDES.length;
    _drawSlide(_slideIdx);
}

setTheatreScreenReadyCallback((screenMesh) => {
    _slideCanvas        = document.createElement('canvas');
    _slideCanvas.width  = 1024;
    _slideCanvas.height = 1024;
    _slideCtx           = _slideCanvas.getContext('2d');
    _slideTexture           = new THREE.CanvasTexture(_slideCanvas);
    _slideTexture.colorSpace = THREE.SRGBColorSpace;
    _slideTexture.wrapS     = THREE.ClampToEdgeWrapping;
    _slideTexture.wrapT     = THREE.ClampToEdgeWrapping;
    _slideTexture.repeat.set(3.890, 1.570);
    _slideTexture.offset.set(-0.485, 0.000);
    _slideTexture.rotation  = -1.571;
    _slideTexture.center.set(0.5, 0.5);
    _drawSlide(0);
    const applyMap = (mat) => {
        mat.map               = _slideTexture;
        mat.emissiveMap       = _slideTexture;
        mat.emissive          = new THREE.Color(1, 1, 1);
        mat.emissiveIntensity = 0.6;
        mat.needsUpdate       = true;
    };
    if (Array.isArray(screenMesh.material)) screenMesh.material.forEach(applyMap);
    else applyMap(screenMesh.material);
});

const _gameUIIds = ['ui-settings-btn', 'ui-film-btn', 'music-player'];

function setGameUIVisible(visible) {
    _gameUIIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    });
}



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

    // ── Glow tuning ───────────────────────────────────────────────────────────
    const GLOW_BLUR      = 80;  // px — Gaussian blur radius (diffusion spread)
    const GLOW_MAGNITUDE = 0.9; // peak opacity (0–1)

    const _glowEl = document.createElement('div');
    Object.assign(_glowEl.style, {
        position:      'fixed',
        pointerEvents: 'none',
        zIndex:        '150',
        background:    'transparent',
        border:        '1px solid rgba(200,168,90,0.75)',
        boxSizing:     'border-box',
        display:       'none',
        boxShadow:     [
            `0 0 ${Math.round(GLOW_BLUR * 0.4)}px  2px rgba(255,228,140,${GLOW_MAGNITUDE})`,
            `0 0 ${GLOW_BLUR}px                    0px rgba(200,168,90,${GLOW_MAGNITUDE * 0.65})`,
            `0 0 ${Math.round(GLOW_BLUR * 2.2)}px  0px rgba(200,168,90,${GLOW_MAGNITUDE * 0.25})`,
        ].join(','),
    });
    document.body.appendChild(_glowEl);

    const _bbCorners = Array.from({ length: 8 }, () => new THREE.Vector3());

    function _updateGlowBounds() {
        if (!theatreScreenMesh) return;
        theatreScreenMesh.geometry.computeBoundingBox();
        const { min, max } = theatreScreenMesh.geometry.boundingBox;
        // All 8 corners of the local bounding box — handles any mesh orientation
        _bbCorners[0].set(min.x, min.y, min.z);
        _bbCorners[1].set(max.x, min.y, min.z);
        _bbCorners[2].set(max.x, max.y, min.z);
        _bbCorners[3].set(min.x, max.y, min.z);
        _bbCorners[4].set(min.x, min.y, max.z);
        _bbCorners[5].set(max.x, min.y, max.z);
        _bbCorners[6].set(max.x, max.y, max.z);
        _bbCorners[7].set(min.x, max.y, max.z);

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const c of _bbCorners) {
            c.applyMatrix4(theatreScreenMesh.matrixWorld).project(camera);
            const sx = (c.x + 1) * 0.5 * window.innerWidth;
            const sy = (-c.y + 1) * 0.5 * window.innerHeight;
            if (sx < minX) minX = sx; if (sx > maxX) maxX = sx;
            if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
        }
        Object.assign(_glowEl.style, {
            left:   minX + 'px',
            top:    minY + 'px',
            width:  (maxX - minX) + 'px',
            height: (maxY - minY) + 'px',
        });
    }

    function exit() {
        _active = false;
        theatreSlideshow.hide();
        _descPanel.hide();
        setGameUIVisible(true);
        rendererEl.style.cursor = '';
        const doro = getDoro();
        if (doro) doro.model.visible = true;
        const jz = document.getElementById('joystick-zone');
        if (jz) jz.style.display = '';
        _glowEl.style.display = 'none';
    }

    function _advance(dir) {
        _advanceSlide(dir);
        _descPanel.update(_slideIdx);
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
        const jz = document.getElementById('joystick-zone');
        if (jz) jz.style.display = 'none';
        theatreSlideshow.show({
            onClose: exit,
            onPrev:  () => _advance(-1),
            onNext:  () => _advance(1),
        });
        _descPanel.show(_slideIdx);
    }

    // ── Screen pointerdown → open project URL ─────────────────────────────────
    rendererEl.addEventListener('pointerdown', (e) => {
        if (!_active || !theatreScreenMesh || e.button !== 0) return;
        _mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        _raycaster.setFromCamera(_mouse, camera);
        if (_raycaster.intersectObject(theatreScreenMesh, false).length > 0) {
            const url = SLIDES[_slideIdx % SLIDES.length].url;
            const a = Object.assign(document.createElement('a'), {
                href: url, target: '_blank', rel: 'noopener noreferrer',
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    // Project screen center to CSS pixels using the settled camera target
    function _screenCenter() {
        _scratch.copy(_lookAt).project(camera);
        return {
            x: (_scratch.x + 1) * 0.5 * window.innerWidth,
            y: (-_scratch.y + 1) * 0.5 * window.innerHeight,
        };
    }

    // ── Pointer cursor + glow on hover ────────────────────────────────────────
    function _insideScreen(clientX, clientY) {
        const { x: sx, y: sy } = _screenCenter();
        const r = Math.min(window.innerWidth, window.innerHeight) * 0.32;
        const dx = clientX - sx, dy = clientY - sy;
        return dx * dx + dy * dy < r * r;
    }

    let _hovering = false;
    function _setHover(v) {
        _hovering = v;
        rendererEl.style.cursor  = v ? 'pointer' : '';
        _glowEl.style.display    = v ? ''        : 'none';
    }

    window.addEventListener('mousemove', (e) => {
        if (!_active) return;
        _setHover(_insideScreen(e.clientX, e.clientY));
    });

    window.addEventListener('touchstart', (e) => {
        if (!_active || !e.touches[0]) return;
        _setHover(_insideScreen(e.touches[0].clientX, e.touches[0].clientY));
    }, { passive: true });

    window.addEventListener('touchend', () => {
        if (!_active) return;
        _setHover(false);
    }, { passive: true });

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
            cam.position.lerp(_camTarget, Math.min(1, 12 * delta));
            cam.up.copy(theatreNormal);
            cam.lookAt(_lookAt);
            _updateGlowBounds();
            _tickGif();
        },
    };
}
