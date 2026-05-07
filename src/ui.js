import bgUrl      from '../assets/ui/tile_0000.png?url';
import btnUrl     from '../assets/ui/tile_0001.png?url';
import inputBgUrl from '../assets/ui/tile_0002.png?url';
import settingsBtnUrl from '../assets/ui/tile_0003.png?url';
import settingsIcon from '../assets/ui/settings_2.png?url';

import tooltipBgUrl  from '../assets/ui/tooltip.png?url';
import enterIconUrl  from '../assets/ui/enter.png?url';
import bookCoverUrl  from '../assets/ui/UI_TravelBook_BookCover01a.png?url';
import border1Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_1.png?url';
import border2Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_2.png?url';
import border3Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_3.png?url';
import border4Url   from '../assets/ui/tooltip_border/UI_TravelBook_SlotCursor01a_4.png?url';

export function initUI(settings, { onGrassApply, onShadowChange }) {
    const style = document.createElement('style');
    style.textContent = `
        #settings-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
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
    `;
    document.head.appendChild(style);

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'ui-settings-btn';
    settingsBtn.title = 'Settings [Tab]';
    settingsBtn.innerHTML = `<img src="${settingsIcon}" alt=""><span>Settings [tab]</span>`;
    document.body.appendChild(settingsBtn);

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
        <button class="cfg-btn" id="cfg-close">Close  [Tab]</button>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#cfg-shadow').value = String(settings.shadowMapSize);

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
        if (e.code === 'Tab') {
            e.preventDefault();
            panel.classList.toggle('visible');
        }
    });
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
        }
        .bld-tooltip.tt-near .bld-tt-shell {
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
        .bld-tooltip.tt-near .bld-tt-enter { opacity: 1; }
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
        .bld-tooltip.tt-near .bld-tt-border { opacity: 1; }
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
    const W = 480, H = 360;

    const style = document.createElement('style');
    style.textContent = `
        #book-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            width: ${W}px;
            height: ${H}px;
            margin-left: ${-W / 2}px;
            margin-top: ${-H / 2}px;
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
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'book-panel';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'book-panel-close';
    closeBtn.textContent = 'Close  [Esc]';
    panel.appendChild(closeBtn);
    document.body.appendChild(panel);

    let _open = false;

    const close = () => {
        if (!_open) return;
        _open = false;
        panel.style.transition = 'transform 0.25s ease-in, opacity 0.2s ease';
        panel.style.transform = 'scale(0.05)';
        panel.style.opacity = '0';
        // setTimeout instead of transitionend — transitionend silently drops if the
        // transition never starts (e.g. close() called during the 2-rAF open gap)
        setTimeout(() => { if (!_open) panel.style.display = 'none'; }, 300);
    };

    closeBtn.addEventListener('click', close);
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape') close(); });

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
