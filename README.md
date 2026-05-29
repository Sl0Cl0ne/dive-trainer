# 🤿 DiveTrainer VR

A WebXR diving skills trainer built for **Meta Quest 3** (and any WebXR-capable headset/browser). No app store, no sideloading — runs directly in **Meta Browser** via GitHub Pages.

Designed as a pre-dive anxiety reduction and skill familiarization tool: learn your gear, practice hand signals, and understand air management *before* you're in the water.

---

## Training Modules

| Module | What you practice |
|--------|-------------------|
| 🎒 **Gear Assembly** | Identify 6 core pieces of scuba equipment, learn their purpose, and place each on a diver mannequin |
| 🤿 **Dive Signals** | 9 standard PADI/SSI hand signals — read the gesture, choose the correct response, get immediate feedback |
| 🔵 **Air Management** | 5 realistic pressure scenarios at varying depths — read the 3D SPG gauge and make the right call |

---

## Running the App

### Option A — GitHub Pages (recommended, zero setup)

1. Fork this repo on GitHub
2. Go to `Settings → Pages → Source: Deploy from a branch → Branch: main → / (root)`
3. Visit `https://<your-username>.github.io/<repo-name>/` in **Meta Browser** on your Quest 3
4. Tap **Enter VR** and put on your headset

> If you use the included GitHub Actions workflow (`.github/workflows/deploy.yml`), Pages deploys automatically on every push to `main`.

### Option B — Local development server

WebXR requires **HTTPS** or `localhost`. Simplest options:

```bash
# Node (npx, no install)
npx serve .

# Python
python3 -m http.server 8080

# VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open `http://localhost:<port>` in Meta Browser (Quest 3 on the same Wi-Fi) or any WebXR desktop browser.

---

## Controls (Quest 3)

| Action | Input |
|--------|-------|
| Point at objects/buttons | Move either controller |
| Select / interact | Pull **trigger** |
| Navigate menus | Point + trigger on panel buttons |

---

## Project Structure

```
dive-trainer/
├── index.html                    # Entry point — overlay UI + importmap
├── src/
│   ├── main.js                   # App init, XR session, render loop
│   ├── UnderwaterScene.js        # Environment: floor, coral, bubbles, caustics, surface
│   ├── XRController.js           # Controller management, raycasting, interactable registry
│   ├── modules/
│   │   ├── GearAssembly.js       # Gear identification & placement module
│   │   ├── DiveSignals.js        # Signal recognition quiz module
│   │   └── AirCheck.js           # Air management / SPG scenarios module
│   └── ui/
│       ├── MainMenu.js           # Module selection screen
│       └── Panel.js              # Canvas-texture floating text panel utility
└── .github/
    └── workflows/
        └── deploy.yml            # Auto-deploy to GitHub Pages on push to main
```

---

## Architecture Notes

### No build step
Uses native ES module `<script type="module">` + an [importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) to load Three.js r168 directly from jsDelivr CDN. No Webpack, Vite, or npm required. Just static files.

### In-world UI
All menus, labels, and feedback panels are `THREE.Mesh` objects with `CanvasTexture`. Text is rendered on `<canvas>` elements and uploaded as textures — no DOM overlay in VR. This means all UI is fully spatial and works correctly in immersive mode.

### Interaction model
`XRController.js` maintains a flat list of registered interactables (`{object, callbacks}`). Each module registers its interactive panels on load and clears them on dispose. No event bubbling; raycasting walks up the object hierarchy to find the registered ancestor.

### Module lifecycle
```
loadModule(id)
  → currentModule.dispose()   // removes from scene, clears interactables
  → mainMenu.hide()           // unregisters menu buttons
  → new XxxModule(scene, controllers, returnToMenu)

returnToMenu()
  → currentModule.dispose()
  → mainMenu.show()           // re-registers menu buttons
```

---

## Roadmap

### Near-term
- [ ] Hand tracking support (Quest 3 passthrough hands)
- [ ] Audio — regulator breathing, bubbles, muffled underwater ambience
- [ ] Gear recognition quiz (name the item, not just place it)
- [ ] Equipment failure drills: flooded mask, free-flowing regulator

### Medium-term
- [ ] Buddy NPC with scripted signal exchanges
- [ ] Descent/ascent with real-time depth counter and equalization prompts
- [ ] Decompression stop timer with ceiling visualization
- [ ] Progress persistence (IndexedDB) + score history

### Longer-term
- [ ] Passthrough AR mode (Quest 3 color passthrough — gear check in your real room)
- [ ] Instructor mode: configurable signal sets, custom scenarios
- [ ] Localization (signals vary slightly by agency/region)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D rendering | [Three.js r168](https://threejs.org/) |
| VR session | [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API) |
| In-world UI | Canvas 2D API → CanvasTexture |
| Delivery | Static files, GitHub Pages |
| CI/CD | GitHub Actions |

---

## License

MIT — fork it, extend it, use it for dive club training, adapt it for other water sports. Attribution appreciated but not required.

---

## Contributing

Issues and PRs welcome. If you're a dive instructor or divemaster and spot a signal description or procedure that's off, please open an issue — accuracy matters here.
