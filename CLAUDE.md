# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server (hot reload)
npm run build      # production build → dist/
npm run preview    # serve the dist/ build locally
npm run deploy     # build then push dist/ to gh-pages branch
```

No test suite exists.

## Architecture

A single-page Three.js 3D portfolio site. The player walks on a sphere (radius 16 units) in a third-person view. The entry point is `src/index.js`, which owns the render loop, camera, player, and physics world.

### Coordinate system for placing objects on the sphere

All surface positions are configured as LON (0–360°) / LAT (−90 to +90°) and converted to spherical:

```js
const THETA = LON * DEG;
const PHI   = (90 - LAT) * DEG;
const normal = new THREE.Vector3(
    Math.sin(PHI) * Math.cos(THETA),
    Math.cos(PHI),
    Math.sin(PHI) * Math.sin(THETA),
).normalize();
```

`normal` is the surface outward vector. Objects are placed at `normal * (SPHERE_RADIUS + height)` and oriented by quaternion-aligning Y-up to `normal`, then applying a yaw rotation around `normal`.

### Source files

| File | Responsibility |
|------|---------------|
| `src/index.js` | Scene setup, animate loop, player movement, physics wiring, camera |
| `src/controls.js` | Keyboard, virtual joystick (nipplejs), camera orbit/zoom input |
| `src/physics.js` | cannon-es world init, `stepPhysics()`, ground-clamping, mesh sync |
| `src/ui.js` | Settings panel, music player, building tooltips, book panel, theatre slideshow, mini-map |
| `src/models/uniqueModels.js` | All named objects: school, gundam, theatre, github, linkedin. Exports placement config, surface normals, and CSS3D tooltip positions |
| `src/models/scatter.js` | Random physics objects scattered over the sphere |
| `src/models/theatre.js` | Theatre zoom-in cinematic and slideshow logic |
| `src/models/orbitModels.js` | Technology logos (python, …) orbiting the world with configurable precession |

### Physics (cannon-es)

- Gravity is off globally; each physics body has radial gravity applied manually each frame toward the sphere center before `world.step()`.
- Link objects (GitHub, LinkedIn) have their own `CANNON.Body` created in the `setXLoadedCallback` callback, **not** inside the scatter system. Ground-clamping and impulse-on-collision are handled per-body inline in `index.js`.
- Random scatter objects go through `physicsObjects[]` array managed by `scatter.js`; `stepPhysics()` in `physics.js` handles their gravity, clamping, and mesh sync.

### Adding a new link object (e.g. Twitter)

1. In `src/models/uniqueModels.js`: add a `?url` import, export `_LON/_LAT/_YAW/…` config consts, export the surface `normal`, export `tooltipPos`/`model`/`css3d` state vars, add a `set_LoadedCallback` function, call `loadLinkObject()` inside `initUniqueModels`, and add the CSS3DObject in `initTooltipCss3d`.
2. In `src/index.js`: import the new consts/state, add a `CANNON.Body` in the loaded callback, add collision detection + physics in the animate loop (mirror the GitHub/LinkedIn blocks), add to `createBuildingTooltipSystem([…])`, add to `createMiniMap([…])`, and add to `tooltipSystem.update([…])`.

### Adding a new orbiting model

In `src/models/orbitModels.js`: add a `?url` import, export config consts, then call `_addOrbitObj()` inside `initOrbitModels`. No changes to `index.js` are needed; `updateOrbitModels(delta)` already drives all entries in `_orbitObjs`.

### CSS3D tooltips

`CSS3DRenderer` sits in a separate DOM layer (`z-index:3`) over the WebGL canvas. Each tooltip is a `CSS3DObject` wrapping a DOM element from `createBuildingTooltipSystem`. Tooltip position tracks the physics body position (when awake) via the animate loop.

### Background parallax

`index.meta.glob` loads all background layer PNGs from `assets/background/sky/`. One folder is chosen randomly per session. Layer 0 is used as the scene environment map; its average color tints the ambient light. The brightest foreground layer tints the sun.

### Asset imports

GLB and audio files must be imported with Vite's `?url` suffix:

```js
import modelUrl from '../3d_models/objects/foo.glb?url';
```

### Camera zoom range

`src/controls.js` lines 91 and 114: `Math.min(60, …)` — max zoom-out is 60 units. Minimum is 2. The Python orbit radius is 22, so anything past 22 is needed to see it from outside.
