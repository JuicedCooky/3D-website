import bgUrl      from '../3d_models/ui/tile_0000.png?url';
import btnUrl     from '../3d_models/ui/tile_0001.png?url';
import inputBgUrl from '../3d_models/ui/tile_0002.png?url';
import settingsBtnUrl from '../3d_models/ui/tile_0003.png?url';
import settingsIcon from '../assets/settings.png?url';

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
    settingsBtn.innerHTML = `<img src="${settingsIcon}" alt=""><span>Settings</span>`;
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
