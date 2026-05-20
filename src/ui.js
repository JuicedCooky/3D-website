import bgUrl      from '../assets/ui/tile_0000.png?url';
import btnUrl     from '../assets/ui/tile_0001.png?url';
import inputBgUrl from '../assets/ui/tile_0002.png?url';
import settingsBtnUrl from '../assets/ui/tile_0003.png?url';
import settingsIcon from '../assets/ui/settings_2.png?url';

import track1Url from '../music/Colorful-Flowers(chosic.com).mp3?url';
import track2Url from '../music/Daydreams-chosic.com_.mp3?url';
import track3Url from '../music/Memories-of-Spring(chosic.com).mp3?url';
import track4Url from '../music/Sonder(chosic.com).mp3?url';
import track5Url from '../music/When-I-Was-A-Boy(chosic.com).mp3?url';

import tooltipBgUrl  from '../assets/ui/tooltip.png?url';
import enterIconUrl  from '../assets/ui/enter.png?url';
import bookCoverUrl  from '../assets/ui/UI_TravelBook_BookCover01a.png?url';
import border1Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_1.png?url';
import border2Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_2.png?url';
import border3Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_3.png?url';
import border4Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_4.png?url';

// Preload all UI images immediately so the browser fetches them in parallel
// with the 3D assets rather than waiting for each initX() call to inject CSS.
[
    bgUrl, btnUrl, inputBgUrl, settingsBtnUrl, settingsIcon,
    tooltipBgUrl, enterIconUrl, bookCoverUrl,
    border1Url, border2Url, border3Url, border4Url,
].forEach(href => {
    const link = document.createElement('link');
    link.rel  = 'preload';
    link.as   = 'image';
    link.href = href;
    document.head.appendChild(link);
});

export function initUI(settings, { onGrassApply, onGrassShadowChange, onObjApply, onShadowChange, onBgSizeChange, onFgSizeChange, onAxisToggle }) {
    const style = document.createElement('style');
    style.textContent = `
        #settings-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            max-width: calc(100vw - 64px);
            padding: 12px;
            
            /* 1. Set the visual thickness of the border on screen */
            /* Using 20px - 30px usually looks good for low-res pixel art */
            border: 24px solid transparent; 

            /* 2. Use a slice of 10 or 11 for a 32px image */
            /* 'fill' ensures the center 10x10 area of your 32px sprite fills the panel */
            border-image: url('${bgUrl}') 11 fill repeat;

            image-rendering: pixelated;
            font-family: 'Courier New', monospace;
            color: #1a0a00;
            display: none;
            z-index: 100;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7);
        }
        #settings-panel.visible { display: block; }

        #settings-panel h2 {
            margin: 0 0 16px;
            text-align: center;
            font-size: 17px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 1px 1px 0 rgba(255,255,255,0.35);
        }

        .cfg-section {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 14px 0 6px;
            padding-bottom: 3px;
            border-bottom: 2px solid rgba(0,0,0,0.18);
            opacity: 0.65;
        }

        .cfg-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 7px 0;
            gap: 10px;
        }

        .cfg-row label {
            font-size: 12px;
            flex: 1;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .cfg-row select,
        .cfg-row input[type="number"] {
            width: 90px;
            padding: 5px 6px;
            background-image: url('${inputBgUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            outline: none;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            -webkit-appearance: none;
            appearance: none;
            text-align: center;
            cursor: pointer;
        }

        .cfg-btn {
            display: block;
            width: 100%;
            padding: 8px 0;
            margin-top: 8px;
            background-image: url('${btnUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: filter 0.1s;
        }
        .cfg-btn:hover  { filter: brightness(1.1); }
        .cfg-btn:active { transform: scale(0.97); }

        #ui-settings-btn {
            position: fixed;
            top: 14px;
            right: 16px;
            width: 210px;
            height: 66px;
            z-index: 99;
            cursor: pointer;
            background: none;
            border: 16px solid transparent;
            border-image: url('${settingsBtnUrl}') 11 fill repeat;
            image-rendering: pixelated;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            font-family: 'Courier New', monospace;
            font-size: 17px;
            font-weight: bold;
            color: #1a0a00;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: filter 0.1s;
        }
        #ui-settings-btn img {
            width: 24px;
            height: 24px;
            image-rendering: pixelated;
            display: block;
            flex-shrink: 0;
        }
        #ui-settings-btn:hover  { filter: brightness(1.15); }
        #ui-settings-btn:active { transform: scale(0.94); }

        #ui-film-btn {
            position: fixed;
            top: 88px;
            right: 16px;
            width: 210px;
            height: 54px;
            z-index: 99;
            cursor: pointer;
            background: none;
            border: 16px solid transparent;
            border-image: url('${settingsBtnUrl}') 11 fill repeat;
            image-rendering: pixelated;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            color: #1a0a00;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: filter 0.1s;
        }
        #ui-film-btn img {
            width: 20px;
            height: 20px;
            image-rendering: pixelated;
            display: block;
            flex-shrink: 0;
        }
        #ui-film-btn:hover  { filter: brightness(1.15); }
        #ui-film-btn:active { transform: scale(0.94); }
        #ui-film-btn.film-on { filter: sepia(0.5) brightness(0.9); }

        @media (max-width: 520px) {
            #ui-settings-btn { width: 160px; height: 52px; font-size: 13px; right: 8px; }
            #ui-settings-btn img { width: 18px; height: 18px; }
            #ui-film-btn { width: 160px; height: 44px; font-size: 12px; right: 8px; top: 70px; }
            #ui-film-btn img { width: 16px; height: 16px; }
        }
    `;
    document.head.appendChild(style);

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'ui-settings-btn';
    settingsBtn.title = 'Settings [Esc]';
    settingsBtn.innerHTML = `<img src="${settingsIcon}" alt=""><span>Settings [esc]</span>`;
    document.body.appendChild(settingsBtn);

    // --- Film Effect Button ---
    const filmBtn = document.createElement('button');
    filmBtn.id = 'ui-film-btn';
    filmBtn.title = 'Film Effect [F]';
    filmBtn.innerHTML = `<img src="${settingsIcon}" alt=""><span>Film FX: ON</span>`;
    filmBtn.classList.add('film-on');
    document.body.appendChild(filmBtn);

    // Canvas overlay for the film effect
    const filmCanvas = document.createElement('canvas');
    filmCanvas.id = 'film-effect-canvas';
    Object.assign(filmCanvas.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: '97',
        opacity: '1',
        transition: 'opacity 0.5s',
    });
    document.body.appendChild(filmCanvas);

    // Scratch canvas for half-res grain (reused every frame, never added to DOM)
    const grainCanvas = document.createElement('canvas');
    const grainCtx = grainCanvas.getContext('2d');

    let filmActive = true;
    let flickerAlpha = 0;
    let flickerTimer = 2000;
    let jitterTimer = 0;
    let jitterActive = false;
    let jitterFrames = 0;
    let jitterY = 0, jitterH = 0, jitterX = 0;

    const resizeFilmCanvas = () => {
        filmCanvas.width  = window.innerWidth;
        filmCanvas.height = window.innerHeight;
    };
    resizeFilmCanvas();
    window.addEventListener('resize', resizeFilmCanvas);

    const drawFilm = () => {
        requestAnimationFrame(drawFilm);
        if (!filmActive) return;

        const ctx = filmCanvas.getContext('2d');
        const w = filmCanvas.width;
        const h = filmCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Film grain — rendered at half resolution then scaled up for performance
        const gw = Math.ceil(w / 2);
        const gh = Math.ceil(h / 2);
        if (grainCanvas.width !== gw)  grainCanvas.width  = gw;
        if (grainCanvas.height !== gh) grainCanvas.height = gh;
        const id = grainCtx.createImageData(gw, gh);
        const d  = id.data;
        for (let i = 0; i < d.length; i += 4) {
            const v  = (Math.random() * 80) | 0;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = (Math.random() * 38) | 0;
        }
        grainCtx.putImageData(id, 0, 0);
        ctx.drawImage(grainCanvas, 0, 0, w, h);

        // Warm lofi tint
        ctx.fillStyle = 'rgba(255, 200, 80, 0.04)';
        ctx.fillRect(0, 0, w, h);

        // Scanlines — one dark line every 3px
        ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
        for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1);
        }

        // VHS horizontal jitter glitch
        jitterTimer -= 16;
        if (jitterTimer <= 0) {
            jitterTimer  = 1200 + Math.random() * 5000;
            jitterActive = true;
            jitterFrames = 1 + Math.floor(Math.random() * 3);
            jitterY = Math.floor(Math.random() * (h - 20));
            jitterH = 2  + Math.floor(Math.random() * 10);
            jitterX = Math.floor((Math.random() - 0.5) * 12);
        }
        if (jitterActive && jitterFrames > 0) {
            jitterFrames--;
            if (jitterFrames === 0) jitterActive = false;
            if (jitterX !== 0) {
                const strip = ctx.getImageData(0, jitterY, w, jitterH);
                ctx.putImageData(strip, jitterX, jitterY);
            }
        }

        // Vignette
        const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.1, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.65);
        vg.addColorStop(0,   'rgba(0,0,0,0)');
        vg.addColorStop(0.5, 'rgba(0,0,0,0)');
        vg.addColorStop(1,   'rgba(0,0,0,0.6)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        // Screen flicker
        flickerTimer -= 16;
        if (flickerTimer <= 0) {
            flickerTimer = 800 + Math.random() * 4000;
            flickerAlpha = 0.05 + Math.random() * 0.1;
        }
        if (flickerAlpha > 0.001) {
            ctx.fillStyle = `rgba(255,255,230,${flickerAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
            flickerAlpha *= 0.78;
        } else {
            flickerAlpha = 0;
        }
    };
    requestAnimationFrame(drawFilm);

    filmBtn.addEventListener('click', () => {
        filmActive = !filmActive;
        filmCanvas.style.opacity = filmActive ? '1' : '0';
        filmBtn.classList.toggle('film-on', filmActive);
        filmBtn.querySelector('span').textContent = filmActive ? 'Film FX: ON' : 'Film FX';
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
            filmBtn.click();
        }
    });
    // --- End Film Effect ---

    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.innerHTML = `
        <h2>Settings</h2>

        <div class="cfg-section">Graphics</div>
        <div class="cfg-row">
            <label>Shadows</label>
            <select id="cfg-shadow">
                <option value="0">Off</option>
                <option value="512">Low</option>
                <option value="1024">Medium</option>
                <option value="2048">High</option>
            </select>
        </div>

        <div class="cfg-section">Background</div>
        <div class="cfg-row">
            <label>Parallax</label>
            <input type="number" id="cfg-parallax" min="0" max="5" step="0.5" value="${settings.parallaxStrength}">
        </div>
        <div class="cfg-row">
            <label>BG Size %</label>
            <input type="number" id="cfg-bg-size" min="50" max="400" step="10" value="${settings.bgLayerSize}">
        </div>
        <div class="cfg-row">
            <label>FG Size %</label>
            <input type="number" id="cfg-fg-size" min="50" max="400" step="10" value="${settings.fgLayerSize}">
        </div>

        <div class="cfg-section">Controls</div>
        <div class="cfg-row">
            <label>Pan Speed</label>
            <input type="number" id="cfg-pan-speed" min="1" max="20" step="1" value="${settings.panSpeed}">
        </div>
        <div class="cfg-row">
            <label>Move Speed</label>
            <input type="number" id="cfg-move-speed" min="1" max="20" step="1" value="${settings.moveSpeed}">
        </div>

        <div class="cfg-section">Animations</div>
        <div class="cfg-row">
            <label>Walk Speed</label>
            <input type="number" id="cfg-walk-speed" min="1" max="20" step="1" value="${settings.walkSpeed}">
        </div>

        <div class="cfg-section">Grass</div>
        <div class="cfg-row">
            <label>Shadows</label>
            <select id="cfg-grass-shadow">
                <option value="0">Off</option>
                <option value="1">On</option>
            </select>
        </div>
        <div class="cfg-row">
            <label>Count</label>
            <input type="number" id="cfg-count" min="0" max="5000" step="50" value="${settings.grassCount}">
        </div>
        <div class="cfg-row">
            <label>Scale Min</label>
            <input type="number" id="cfg-scale-min" min="0.1" max="20" step="0.1" value="${settings.grassScaleMin}">
        </div>
        <div class="cfg-row">
            <label>Scale Max</label>
            <input type="number" id="cfg-scale-max" min="0.1" max="20" step="0.1" value="${settings.grassScaleMax}">
        </div>

        <button class="cfg-btn" id="cfg-apply-grass">Apply Grass</button>

        <div class="cfg-section">Objects</div>
        <div class="cfg-row">
            <label>Clusters</label>
            <input type="number" id="cfg-obj-clusters" min="0" max="200" step="5" value="${settings.objClusters}">
        </div>
        <button class="cfg-btn" id="cfg-apply-obj">Apply Objects</button>

        <div class="cfg-section">Debug</div>
        <div class="cfg-row">
            <label>Lat/Lon Grid</label>
            <select id="cfg-axis">
                <option value="0">Off</option>
                <option value="1">On</option>
            </select>
        </div>

        <button class="cfg-btn" id="cfg-close">Close  [Esc]</button>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#cfg-shadow').value      = String(settings.shadowMapSize);
    panel.querySelector('#cfg-grass-shadow').value = settings.grassShadows ? '1' : '0';
    panel.querySelector('#cfg-axis').value         = settings.showAxis      ? '1' : '0';

    panel.querySelector('#cfg-parallax').addEventListener('change', (e) => {
        settings.parallaxStrength = Math.max(0, Number(e.target.value));
    });

    panel.querySelector('#cfg-bg-size').addEventListener('change', (e) => {
        settings.bgLayerSize = Math.max(50, Number(e.target.value));
        onBgSizeChange(settings.bgLayerSize);
    });

    panel.querySelector('#cfg-fg-size').addEventListener('change', (e) => {
        settings.fgLayerSize = Math.max(50, Number(e.target.value));
        onFgSizeChange(settings.fgLayerSize);
    });

    panel.querySelector('#cfg-pan-speed').addEventListener('change', (e) => {
        settings.panSpeed = Math.max(1, Number(e.target.value));
    });

    panel.querySelector('#cfg-walk-speed').addEventListener('change', (e) => {
        settings.walkSpeed = Math.max(1, Number(e.target.value));
    });
    panel.querySelector('#cfg-move-speed').addEventListener('change', (e) => {
        settings.moveSpeed = Math.max(1, Number(e.target.value));
    });

    panel.querySelector('#cfg-shadow').addEventListener('change', (e) => {
        settings.shadowMapSize = Number(e.target.value);
        onShadowChange(settings.shadowMapSize);
    });

    panel.querySelector('#cfg-apply-obj').addEventListener('click', () => {
        settings.objClusters = Number(panel.querySelector('#cfg-obj-clusters').value);
        onObjApply();
    });

    panel.querySelector('#cfg-grass-shadow').addEventListener('change', (e) => {
        settings.grassShadows = e.target.value === '1';
        onGrassShadowChange(settings.grassShadows);
    });

    panel.querySelector('#cfg-axis').addEventListener('change', (e) => {
        settings.showAxis = e.target.value === '1';
        onAxisToggle(settings.showAxis);
    });

    panel.querySelector('#cfg-apply-grass').addEventListener('click', () => {
        settings.grassCount    = Number(panel.querySelector('#cfg-count').value);
        settings.grassScaleMin = Number(panel.querySelector('#cfg-scale-min').value);
        settings.grassScaleMax = Number(panel.querySelector('#cfg-scale-max').value);
        onGrassApply();
    });

    panel.querySelector('#cfg-close').addEventListener('click', () => {
        panel.classList.remove('visible');
    });

    settingsBtn.addEventListener('click', () => {
        panel.classList.toggle('visible');
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            if (document.getElementById('book-panel')?.style.display === 'flex') return;
            if (document.getElementById('mini-map-panel')?.classList.contains('visible')) return;
            if (document.getElementById('theatre-overlay')?.classList.contains('active')) return;
            panel.classList.toggle('visible');
        }
    });

    document.addEventListener('pointerdown', (e) => {
        if (!panel.classList.contains('visible')) return;
        if (panel.contains(e.target) || settingsBtn.contains(e.target)) return;
        panel.classList.remove('visible');
    });
}

export function initMusicPlayer() {
    const TRACKS = [
        { url: track1Url, title: 'Colorful Flowers',  artist: 'Tokyo Music Walker' },
        { url: track2Url, title: 'Daydreams',          artist: 'Purrple Cat'        },
        { url: track3Url, title: 'Memories of Spring', artist: 'Tokyo Music Walker' },
        { url: track4Url, title: 'Sonder',             artist: 'Purrple Cat'        },
        { url: track5Url, title: 'When I Was A Boy',   artist: 'Tokyo Music Walker' },
    ];

    let currentIdx = 0;
    let isPlaying  = false;

    const audio = new Audio();
    audio.volume = 0.6;

    const style = document.createElement('style');
    style.textContent = `
        #music-player {
            position: fixed;
            top: 14px;
            left: 16px;
            z-index: 99;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            border: 16px solid transparent;
            border-image: url('${settingsBtnUrl}') 11 fill repeat;
            image-rendering: pixelated;
            padding: 2px 6px;
            font-family: 'Courier New', monospace;
            color: #1a0a00;
            min-width: 180px;
        }
        #music-track-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            overflow: hidden;
        }
        #music-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 170px;
            text-align: center;
        }
        #music-artist {
            font-size: 9px;
            opacity: 0.65;
            text-transform: uppercase;
            letter-spacing: 1px;
            white-space: nowrap;
        }
        #music-controls {
            display: flex;
            gap: 4px;
            align-items: center;
        }
        .music-btn {
            width: 42px;
            padding: 4px 0;
            background-image: url('${btnUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            transition: filter 0.1s;
            line-height: 1;
        }
        .music-btn:hover  { filter: brightness(1.15); }
        .music-btn:active { transform: scale(0.94); }
        #music-play-btn { width: 50px; font-size: 14px; }

        #music-volume-row {
            display: flex;
            align-items: center;
            gap: 5px;
            width: 100%;
            padding: 0 2px;
            box-sizing: border-box;
        }
        #music-volume-label {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.6;
            white-space: nowrap;
        }
        #music-volume {
            -webkit-appearance: none;
            appearance: none;
            flex: 1;
            height: 6px;
            background: rgba(26,10,0,0.25);
            border-radius: 3px;
            outline: none;
            cursor: pointer;
        }
        #music-volume::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #1a0a00;
            cursor: pointer;
        }
        #music-volume::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #1a0a00;
            border: none;
            cursor: pointer;
        }

        @media (max-width: 520px) {
            #music-player { min-width: 110px; left: 8px; top: 10px; padding: 1px 4px; gap: 2px; }
            #music-title { font-size: 9px; max-width: 100px; }
            #music-artist { font-size: 8px; }
            .music-btn { width: 30px; font-size: 11px; }
            #music-play-btn { width: 36px; font-size: 12px; }
        }
    `;
    document.head.appendChild(style);

    const player = document.createElement('div');
    player.id = 'music-player';
    player.innerHTML = `
        <div id="music-track-info">
            <div id="music-title"></div>
            <div id="music-artist"></div>
        </div>
        <div id="music-controls">
            <button class="music-btn" id="music-prev-btn">&#9664;&#9664;</button>
            <button class="music-btn" id="music-play-btn">&#9654;</button>
            <button class="music-btn" id="music-next-btn">&#9654;&#9654;</button>
        </div>
        <div id="music-volume-row">
            <span id="music-volume-label">Vol</span>
            <input type="range" id="music-volume" min="0" max="1" step="0.02" value="${audio.volume}">
        </div>
    `;
    document.body.appendChild(player);

    const titleEl   = player.querySelector('#music-title');
    const artistEl  = player.querySelector('#music-artist');
    const playBtn   = player.querySelector('#music-play-btn');
    const prevBtn   = player.querySelector('#music-prev-btn');
    const nextBtn   = player.querySelector('#music-next-btn');
    const volumeEl  = player.querySelector('#music-volume');

    volumeEl.addEventListener('input', () => { audio.volume = Number(volumeEl.value); });

    const loadTrack = (idx) => {
        currentIdx = ((idx % TRACKS.length) + TRACKS.length) % TRACKS.length;
        const t = TRACKS[currentIdx];
        audio.src = t.url;
        titleEl.textContent  = t.title;
        artistEl.textContent = t.artist;
    };

    const setPlaying = (playing) => {
        isPlaying = playing;
        playBtn.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;';
    };

    const play = () => { audio.play(); setPlaying(true); };
    const pause = () => { audio.pause(); setPlaying(false); };

    playBtn.addEventListener('click', () => {
        if (isPlaying) pause();
        else play();
    });

    prevBtn.addEventListener('click', () => {
        loadTrack(currentIdx - 1);
        if (isPlaying) play();
    });

    nextBtn.addEventListener('click', () => {
        loadTrack(currentIdx + 1);
        if (isPlaying) play();
    });

    audio.addEventListener('ended', () => {
        loadTrack(currentIdx + 1);
        play();
    });

    loadTrack(Math.floor(Math.random() * TRACKS.length));

    const startOnInteraction = () => {
        play();
        window.removeEventListener('click',   startOnInteraction);
        window.removeEventListener('keydown', startOnInteraction);
    };
    window.addEventListener('click',   startOnInteraction);
    window.addEventListener('keydown', startOnInteraction);

    return {
        triggerPlay() { startOnInteraction(); },
    };
}

export function createBuildingTooltipSystem(buildingIds) {
    const BORDER_FRAMES = [border1Url, border2Url, border3Url, border4Url];
    let frameIdx = 0;

    const style = document.createElement('style');
    style.textContent = `
        .bld-tooltip {
            display: inline-block;
            pointer-events: none;
            image-rendering: pixelated;
            opacity: 1;
            transition: opacity 0.3s;
        }
        .bld-tooltip.tt-hidden { opacity: 0; }

        .bld-tt-shell {
            position: relative;
            width: 44px;
            height: 44px;
            background: url('${tooltipBgUrl}') center / 100% 100% no-repeat;
            transition: width 0.25s ease, height 0.25s ease;
            pointer-events: auto;
            cursor: pointer;
        }
        .bld-tooltip.tt-near .bld-tt-shell,
        .bld-tooltip.tt-hovered .bld-tt-shell {
            width: 112px;
            height: 80px;
        }

        .bld-tt-enter {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .bld-tooltip.tt-near .bld-tt-enter,
        .bld-tooltip.tt-hovered .bld-tt-enter { opacity: 1; }
        .bld-tt-enter img {
            width: 40px;
            height: 40px;
            image-rendering: pixelated;
        }

        .bld-tt-border {
            position: absolute;
            inset: -8px;
            background: no-repeat center / 100% 100%;
            image-rendering: pixelated;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        }
        .bld-tooltip.tt-near .bld-tt-border,
        .bld-tooltip.tt-hovered .bld-tt-border { opacity: 1; }
    `;
    document.head.appendChild(style);

    const entries = buildingIds.map((id) => {
        const el = document.createElement('div');
        el.className = 'bld-tooltip tt-hidden';

        const shell = document.createElement('div');
        shell.className = 'bld-tt-shell';

        const enterDiv = document.createElement('div');
        enterDiv.className = 'bld-tt-enter';
        const enterImg = document.createElement('img');
        enterImg.src = enterIconUrl;
        enterImg.alt = '';
        enterDiv.appendChild(enterImg);

        const borderDiv = document.createElement('div');
        borderDiv.className = 'bld-tt-border';
        borderDiv.style.backgroundImage = `url('${BORDER_FRAMES[0]}')`;

        shell.appendChild(enterDiv);
        shell.appendChild(borderDiv);
        el.appendChild(shell);
        // CSS3DRenderer manages DOM placement — do NOT append to body here

        shell.addEventListener('mouseenter', () => el.classList.add('tt-hovered'));
        shell.addEventListener('mouseleave', () => el.classList.remove('tt-hovered'));

        return { id, el, borderDiv };
    });

    setInterval(() => {
        frameIdx = (frameIdx + 1) % BORDER_FRAMES.length;
        const url = BORDER_FRAMES[frameIdx];
        entries.forEach(({ borderDiv }) => {
            borderDiv.style.backgroundImage = `url('${url}')`;
        });
    }, 150);

    return {
        getElement(id) {
            const entry = entries.find(e => e.id === id);
            return entry ? entry.el : null;
        },
        update(states) {
            // CSS3DRenderer handles screen positioning — only toggle state classes here
            states.forEach(({ id, visible, isNear }) => {
                const entry = entries.find(e => e.id === id);
                if (!entry) return;
                const { el } = entry;
                el.classList.toggle('tt-hidden', !visible);
                el.classList.toggle('tt-near', isNear && visible);
            });
        }
    };
}

export function createBookPanel() {
    const W = 960, H = 720;

    const style = document.createElement('style');
    style.textContent = `
        #book-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            width: min(${W}px, 95vw);
            height: min(${H}px, calc(min(${W}px, 95vw) * ${H / W}));
            margin-left: calc(min(${W}px, 95vw) / -2);
            margin-top: calc(min(${H}px, calc(min(${W}px, 95vw) * ${H / W})) / -2);
            background: url('${bookCoverUrl}') center / 100% 100% no-repeat;
            image-rendering: pixelated;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            padding-bottom: 28px;
            box-sizing: border-box;
            z-index: 200;
        }
        #book-panel-close {
            display: block;
            width: 140px;
            padding: 8px 0;
            background-image: url('${btnUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: filter 0.1s;
        }
        #book-panel-close:hover  { filter: brightness(1.1); }
        #book-panel-close:active { transform: scale(0.97); }
        #book-panel-content {
            position: relative;
            width: 60%;
            height: 56%;
            margin-bottom: 16px;
            overflow: visible;
        }
        #skill-tree {
            position: absolute;
            inset: 0;
        }
        #skill-tree svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
            pointer-events: none;
        }
        .skill-node {
            position: absolute;
            width: 72px;
            height: 72px;
            transform: translate(-50%, -50%);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .skill-node-icon {
            width: 60px;
            height: 60px;
            border-radius: 6px;
            background: rgba(180, 120, 40, 0.2);
            border: 2px solid rgba(120, 70, 10, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            transition: background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
            box-shadow: inset 0 0 8px rgba(0,0,0,0.12);
        }
        .skill-node:hover .skill-node-icon,
        .skill-node.active .skill-node-icon {
            background: rgba(210, 155, 60, 0.48);
            border-color: rgba(160, 100, 20, 0.9);
            transform: scale(1.12);
            box-shadow: 0 0 14px rgba(200, 140, 30, 0.5), inset 0 0 8px rgba(0,0,0,0.12);
        }
        .skill-node-label {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            font-weight: bold;
            color: #2a1200;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
            margin-top: 4px;
            white-space: nowrap;
        }
        #skill-card {
            position: fixed;
            z-index: 300;
            width: 400px;
            max-height: 85vh;
            overflow-y: auto;
            padding: 14px;
            background: rgba(245, 228, 185, 0.97);
            border: 2px solid #7a4a00;
            border-radius: 3px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.45);
            font-family: 'Courier New', monospace;
            color: #1a0800;
            pointer-events: none;
            opacity: 0;
            transform: translateY(4px) scale(0.92);
            transition: opacity 0.14s ease, transform 0.14s ease;
        }
        #skill-card.visible, #skill-card.pinned {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        #skill-card.pinned { pointer-events: all; }
        #skill-card-close {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 64px;
            padding: 5px 0;
            background-image: url('${btnUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: filter 0.1s;
            display: none;
            z-index: 1;
        }
        #skill-card.pinned #skill-card-close { display: block; }
        #skill-card-close:hover  { filter: brightness(1.1); }
        #skill-card-close:active { transform: scale(0.97); }
        #skill-card-icon { font-size: 32px; text-align: center; margin-bottom: 8px; }
        #skill-card-name {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(120,70,10,0.3);
        }
        #skill-card-desc { font-size: 10px; line-height: 1.65; }
        #skill-card-desc p { margin: 0 0 6px; }
        #skill-card-desc ul { margin: 0; padding-left: 14px; }
        #skill-card-desc li { margin: 2px 0; }

        @media (max-width: 600px) {
            #skill-card {
                width: calc(100vw - 32px);
                max-height: calc(100vh - 80px);
                left: 50%;
                top: 50%;
                transform: translateX(-50%) translateY(calc(-50% + 8px)) scale(0.92);
            }
            #skill-card.visible,
            #skill-card.pinned {
                transform: translateX(-50%) translateY(-50%) scale(1);
            }
            #skill-card-close { width: 72px; font-size: 11px; }
        }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'book-panel';

    const SKILLS = [
        { id: 'base',    label: 'General', icon: '🏫',  x: 50, y: 82,
          desc: 
          `<p>Guiding others cements mastery. A TA bridges the gap between student and scholar.</p>
                <ul>
                    <li><b>GPA: </b>3.64 (A-)</li>
                    <li><b>+5</b> Patience</li>
                </ul>` 
        },
        { id: 'courses', label: "Core Courses", icon: '📚',  x: 5, y: 22,
          desc: `<p>Rigorous coursework across multiple disciplines builds a strong academic base.</p><ul><li><b>+10</b> Knowledge</li><li><b>+6</b> Critical Thinking</li></ul>` },
        { id: 'thesis',  label: "Honors Thesis", icon: '📜',  x: 50, y: 22,
          desc: 
          `<p>An original research contribution — the culmination of years of focused study.</p>
          <b>Thesis Project: Continual Learning Methods on Multi-Domain Tasks.</b>
          <ul>
            <li>Implemented and experimented with various VLM pertaining to Zero-shot learning with Continual features.</li>
            <li>Deployed and tested various continual learning methods to be evaluated on multiple domains.</li>
            <li>Empirically determined performances and differences between multiple methods.</li>
            <li>Used various tools to deploy large scale training including Sharcnet/Alliance Cananda’s research infrastructure.</li>
            <li>Designed an interesting yet easily interpretable data visualization pipeline</li>
        </ul>` },
        { id: 'ta',    label: 'Teaching Assistant', icon: '🧑‍🏫',  x: 100, y: 22,
          desc: 
          `<p>Guiding others cements mastery. A TA bridges the gap between student and scholar.</p>
                <ul>
                    <li><b>GPA: </b>3.64 (A-)</li>
                    <li><b>Courses Taught: </b>Programming Workshop II
                        <ul>
                            <li>test</li>
                        </ul>
                    </li>
                </ul>` 
        },
    ];
    const EDGES = [['base','courses'], ['base','thesis'], ['base','ta']];

    const content = document.createElement('div');
    content.id = 'book-panel-content';

    const tree = document.createElement('div');
    tree.id = 'skill-tree';

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    EDGES.forEach(([fromId, toId]) => {
        const from = SKILLS.find(s => s.id === fromId);
        const to   = SKILLS.find(s => s.id === toId);
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', from.x + '%'); line.setAttribute('y1', from.y + '%');
        line.setAttribute('x2', to.x   + '%'); line.setAttribute('y2', to.y   + '%');
        line.setAttribute('stroke', 'rgba(120,70,10,0.45)');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', '5 4');
        svg.appendChild(line);
    });
    tree.appendChild(svg);

    const card = document.createElement('div');
    card.id = 'skill-card';
    card.innerHTML = `
        <button id="skill-card-close">Close</button>
        <div id="skill-card-icon"></div>
        <div id="skill-card-name"></div>
        <div id="skill-card-desc"></div>
    `;
    document.body.appendChild(card);

    const cardIcon     = card.querySelector('#skill-card-icon');
    const cardName     = card.querySelector('#skill-card-name');
    const cardDesc     = card.querySelector('#skill-card-desc');
    const cardCloseBtn = card.querySelector('#skill-card-close');

    let pinnedNodeId = null;

    const unpinCard = () => {
        pinnedNodeId = null;
        card.classList.remove('pinned', 'visible');
        document.querySelectorAll('.skill-node.active').forEach(n => n.classList.remove('active'));
        tree.style.pointerEvents = '';
    };

    const populateCard = (skill) => {
        cardIcon.textContent = skill.icon;
        cardName.textContent = skill.label;
        cardDesc.innerHTML = skill.desc;
    };

    const positionCard = (nodeEl) => {
        if (window.innerWidth <= 600) {
            card.style.left = '';
            card.style.top  = '';
            return;
        }
        const rect   = nodeEl.getBoundingClientRect();
        const cardW  = card.offsetWidth  || 400;
        const cardH  = card.offsetHeight || 200;
        const margin = 10;
        let left = rect.right + margin;
        if (left + cardW > window.innerWidth  - margin) left = rect.left - cardW - margin;
        let top  = Math.max(margin, rect.top);
        if (top  + cardH > window.innerHeight - margin) top  = window.innerHeight - cardH - margin;
        card.style.left = left + 'px';
        card.style.top  = top  + 'px';
    };

    cardCloseBtn.addEventListener('click', unpinCard);

    document.addEventListener('pointerdown', (e) => {
        if (!pinnedNodeId) return;
        if (card.contains(e.target)) return;
        unpinCard();
    });

    SKILLS.forEach(skill => {
        const node = document.createElement('div');
        node.className = 'skill-node';
        node.dataset.skillId = skill.id;
        node.style.left = skill.x + '%';
        node.style.top  = skill.y + '%';
        node.innerHTML = `
            <div class="skill-node-icon">${skill.icon}</div>
            <div class="skill-node-label">${skill.label}</div>
        `;

        node.addEventListener('mouseenter', () => {
            if (pinnedNodeId) return;
            populateCard(skill);
            positionCard(node);
            card.classList.add('visible');
        });
        node.addEventListener('mouseleave', () => {
            if (pinnedNodeId) return;
            card.classList.remove('visible');
        });
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            if (pinnedNodeId === skill.id) {
                unpinCard();
            } else if (!pinnedNodeId) {
                pinnedNodeId = skill.id;
                populateCard(skill);
                positionCard(node);
                node.classList.add('active');
                card.classList.remove('visible');
                card.classList.add('pinned');
                tree.style.pointerEvents = 'none';
            }
        });

        tree.appendChild(node);
    });

    content.appendChild(tree);
    panel.appendChild(content);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'book-panel-close';
    closeBtn.textContent = 'Close  [Esc]';
    panel.appendChild(closeBtn);
    document.body.appendChild(panel);

    let _open = false;

    const close = () => {
        if (!_open) return;
        _open = false;
        unpinCard();
        panel.style.transition = 'transform 0.25s ease-in, opacity 0.2s ease';
        panel.style.transform = 'scale(0.05)';
        panel.style.opacity = '0';
        // setTimeout instead of transitionend — transitionend silently drops if the
        // transition never starts (e.g. close() called during the 2-rAF open gap)
        setTimeout(() => { if (!_open) panel.style.display = 'none'; }, 300);
    };

    closeBtn.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            if (pinnedNodeId !== null) unpinCard();
            else close();
        }
    });

    document.addEventListener('pointerdown', (e) => {
        if (!_open || pinnedNodeId !== null) return;
        if (panel.contains(e.target)) return;
        close();
    }, { capture: true });

    return {
        open(tooltipScreenX, tooltipScreenY) {
            if (_open) return;
            _open = true;

            // transform-origin set so the scale animation grows from the tooltip's screen position
            const originX = tooltipScreenX - window.innerWidth  / 2 + W / 2;
            const originY = tooltipScreenY - window.innerHeight / 2 + H / 2;
            panel.style.transformOrigin = `${originX}px ${originY}px`;
            panel.style.transition = 'none';
            panel.style.transform = 'scale(0.05)';
            panel.style.opacity = '0';
            panel.style.display = 'flex';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!_open) return; // closed before rAFs fired — don't show
                    panel.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease';
                    panel.style.transform = 'scale(1)';
                    panel.style.opacity = '1';
                });
            });
        },
        close,
        get isOpen() { return _open; },
    };
}

export function createMiniMap(locations, { onTeleport }) {
    const VW = 400, VH = 200;
    const TWO_PI = Math.PI * 2;
    const thetaToX = (theta) => ((((theta % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI) * VW;
    const phiToY   = (phi)   => (phi / Math.PI) * VH;

    const style = document.createElement('style');
    style.textContent = `
        #mini-map-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 460px;
            max-width: calc(100vw - 32px);
            padding: 12px;
            border: 24px solid transparent;
            border-image: url('${bgUrl}') 11 fill repeat;
            image-rendering: pixelated;
            font-family: 'Courier New', monospace;
            color: #1a0a00;
            display: none;
            z-index: 101;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7);
        }
        #mini-map-panel.visible { display: block; }
        #mini-map-title {
            margin: 0 0 10px;
            text-align: center;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 3px;
            font-weight: bold;
            text-shadow: 1px 1px 0 rgba(255,255,255,0.35);
        }
        #mini-map-svg-wrap {
            width: 100%;
            border: 2px solid rgba(26,10,0,0.3);
            box-sizing: border-box;
            border-radius: 2px;
            overflow: hidden;
        }
        #mini-map-svg { display: block; width: 100%; height: auto; }
        #mini-map-hint {
            margin-top: 6px;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.6;
            text-align: center;
        }
        #mini-map-close-btn {
            display: block;
            width: 100%;
            padding: 8px 0;
            margin-top: 8px;
            background-image: url('${btnUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: filter 0.1s;
        }
        #mini-map-close-btn:hover  { filter: brightness(1.1); }
        #mini-map-close-btn:active { transform: scale(0.97); }
        #ui-map-btn {
            position: fixed;
            top: 130px;
            left: 16px;
            width: 210px;
            height: 54px;
            z-index: 99;
            cursor: pointer;
            background: none;
            border: 16px solid transparent;
            border-image: url('${settingsBtnUrl}') 11 fill repeat;
            image-rendering: pixelated;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            color: #1a0a00;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: filter 0.1s;
        }
        #ui-map-btn img { width: 20px; height: 20px; image-rendering: pixelated; display: block; flex-shrink: 0; }
        #ui-map-btn:hover  { filter: brightness(1.15); }
        #ui-map-btn:active { transform: scale(0.94); }
        .map-marker { cursor: pointer; }
        .map-marker-circle { transition: r 0.12s; }
        .map-marker:hover .map-marker-circle { r: 10px; }
        @media (max-width: 520px) {
            #mini-map-panel { width: calc(100vw - 32px); }
            #ui-map-btn { width: 160px; height: 44px; font-size: 12px; left: 8px; top: 100px; }
            #ui-map-btn img { width: 16px; height: 16px; }
        }
    `;
    document.head.appendChild(style);

    // Map toggle button
    const mapBtn = document.createElement('button');
    mapBtn.id = 'ui-map-btn';
    mapBtn.title = 'Map [Tab]';
    mapBtn.innerHTML = `<img src="${settingsIcon}" alt=""><span>Map [tab]</span>`;
    document.body.appendChild(mapBtn);

    const panel = document.createElement('div');
    panel.id = 'mini-map-panel';

    const titleEl = document.createElement('div');
    titleEl.id = 'mini-map-title';
    titleEl.textContent = 'World Map';
    panel.appendChild(titleEl);

    const wrap = document.createElement('div');
    wrap.id = 'mini-map-svg-wrap';

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.id = 'mini-map-svg';
    svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
    svg.setAttribute('xmlns', NS);

    // Background
    const bgRect = document.createElementNS(NS, 'rect');
    bgRect.setAttribute('width', VW); bgRect.setAttribute('height', VH);
    bgRect.setAttribute('fill', '#569c56');
    svg.appendChild(bgRect);

    // Vertical grid lines every 90°
    [1, 2, 3].forEach(i => {
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', VW * i / 4); line.setAttribute('y1', 0);
        line.setAttribute('x2', VW * i / 4); line.setAttribute('y2', VH);
        line.setAttribute('stroke', 'rgba(100,160,200,0.12)');
        line.setAttribute('stroke-width', '0.5');
        svg.appendChild(line);
    });

    // Equator
    const equator = document.createElementNS(NS, 'line');
    equator.setAttribute('x1', 0); equator.setAttribute('y1', VH / 2);
    equator.setAttribute('x2', VW); equator.setAttribute('y2', VH / 2);
    equator.setAttribute('stroke', 'rgba(100,160,200,0.2)');
    equator.setAttribute('stroke-width', '0.8');
    svg.appendChild(equator);

    // Location markers
    locations.forEach(loc => {
        const x = thetaToX(loc.theta);
        const y = phiToY(loc.phi);

        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'map-marker');
        g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);

        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('class', 'map-marker-circle');
        circle.setAttribute('r', '7');
        circle.setAttribute('fill', 'rgba(200,155,50,0.9)');
        circle.setAttribute('stroke', 'rgba(255,255,255,0.7)');
        circle.setAttribute('stroke-width', '1.5');

        const icon = document.createElementNS(NS, 'text');
        icon.setAttribute('y', '4'); icon.setAttribute('text-anchor', 'middle');
        icon.setAttribute('font-size', '9'); icon.setAttribute('fill', '#fff');
        icon.textContent = loc.icon;

        const label = document.createElementNS(NS, 'text');
        label.setAttribute('y', '19'); label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-family', 'Courier New, monospace');
        label.setAttribute('font-size', '7'); label.setAttribute('fill', '#ffe8b0');
        label.setAttribute('font-weight', 'bold');
        label.textContent = loc.label.toUpperCase();

        g.appendChild(circle);
        g.appendChild(icon);
        g.appendChild(label);
        g.addEventListener('click', () => { onTeleport(loc.theta, loc.phi); hide(); });
        svg.appendChild(g);
    });

    // Player marker (rendered last → always on top)
    const playerDot = document.createElementNS(NS, 'circle');
    playerDot.setAttribute('r', '5');
    playerDot.setAttribute('fill', '#ff4400');
    playerDot.setAttribute('stroke', '#fff');
    playerDot.setAttribute('stroke-width', '1.5');

    const playerLbl = document.createElementNS(NS, 'text');
    playerLbl.setAttribute('y', '-8'); playerLbl.setAttribute('text-anchor', 'middle');
    playerLbl.setAttribute('font-family', 'Courier New, monospace');
    playerLbl.setAttribute('font-size', '7'); playerLbl.setAttribute('fill', '#ff8866');
    playerLbl.setAttribute('font-weight', 'bold');
    playerLbl.textContent = 'YOU';

    const playerG = document.createElementNS(NS, 'g');
    playerG.appendChild(playerDot);
    playerG.appendChild(playerLbl);
    svg.appendChild(playerG);

    wrap.appendChild(svg);
    panel.appendChild(wrap);

    const hint = document.createElement('div');
    hint.id = 'mini-map-hint';
    hint.textContent = 'Click a location to teleport  •  [Tab] to close';
    panel.appendChild(hint);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'mini-map-close-btn';
    closeBtn.textContent = 'Close  [Tab]';
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);

    let _open = false;
    const show = () => { _open = true;  panel.classList.add('visible'); };
    const hide = () => { _open = false; panel.classList.remove('visible'); };

    closeBtn.addEventListener('click', hide);
    mapBtn.addEventListener('click', () => { _open ? hide() : show(); });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && _open) hide();
    });

    document.addEventListener('pointerdown', (e) => {
        if (!_open || panel.contains(e.target) || mapBtn.contains(e.target)) return;
        hide();
    });

    return {
        show,
        hide,
        toggle() { _open ? hide() : show(); },
        get isOpen() { return _open; },
        update(playerNorm) {
            const phi   = Math.acos(Math.max(-1, Math.min(1, playerNorm.y)));
            const theta = Math.atan2(playerNorm.z, playerNorm.x);
            const x = thetaToX(theta);
            const y = phiToY(phi);
            playerG.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
        },
    };
}

export function createTheatreSlideshow() {
    const style = document.createElement('style');
    style.textContent = `
        #theatre-overlay {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 150;
            pointer-events: none;
        }
        #theatre-overlay.active { display: block; }

        #theatre-prev-btn, #theatre-next-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: all;
            width: 52px;
            height: 52px;
            background-image: url('${btnUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 22px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            transition: filter 0.1s;
        }
        #theatre-prev-btn { left: 24px; }
        #theatre-next-btn { right: 24px; }
        #theatre-prev-btn:hover, #theatre-next-btn:hover { filter: brightness(1.15); }
        #theatre-prev-btn:active { transform: translateY(-50%) scale(0.94); }
        #theatre-next-btn:active { transform: translateY(-50%) scale(0.94); }

        #theatre-close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            pointer-events: all;
            width: 56px;
            height: 34px;
            background-image: url('${btnUrl}');
            background-size: 100% 100%;
            image-rendering: pixelated;
            border: none;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            color: #1a0a00;
            background-color: transparent;
            transition: filter 0.1s;
        }
        #theatre-close-btn:hover  { filter: brightness(1.15); }
        #theatre-close-btn:active { transform: scale(0.94); }

        @media (max-width: 520px) {
            #theatre-prev-btn, #theatre-next-btn { width: 38px; height: 38px; font-size: 16px; }
            #theatre-prev-btn { left: 8px; }
            #theatre-next-btn { right: 8px; }
            #theatre-close-btn { width: 44px; height: 28px; font-size: 13px; top: 12px; right: 12px; }
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'theatre-overlay';
    overlay.innerHTML = `
        <button id="theatre-prev-btn">&#9664;</button>
        <button id="theatre-next-btn">&#9654;</button>
        <button id="theatre-close-btn">&#10005;</button>
    `;
    document.body.appendChild(overlay);

    const prevBtn  = overlay.querySelector('#theatre-prev-btn');
    const nextBtn  = overlay.querySelector('#theatre-next-btn');
    const closeBtn = overlay.querySelector('#theatre-close-btn');

    let _onClose = null, _onPrev = null, _onNext = null;

    closeBtn.addEventListener('click', () => _onClose?.());
    prevBtn.addEventListener('click',  () => _onPrev?.());
    nextBtn.addEventListener('click',  () => _onNext?.());

    return {
        show({ onClose, onPrev, onNext }) {
            _onClose = onClose;
            _onPrev  = onPrev;
            _onNext  = onNext;
            overlay.classList.add('active');
        },
        hide() {
            overlay.classList.remove('active');
        },
    };
}
