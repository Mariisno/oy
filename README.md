# Floating Island 🏝️

A small, hand-built 3D world in [three.js](https://threejs.org): a floating island with a
waterfall, drifting clouds, a tiny wanderer and a day/dusk toggle. Drag to look around,
scroll to zoom.

No build step. Open `index.html` (the diorama) or `play.html` (the game) in a browser, or serve the folder:

```bash
npx serve .
```

## Files

| File | What it is |
|---|---|
| `index.html` | the page, loads the stage and the island |
| `play.html` | **Øyhopp**, a small game prototype: walk the island, wake the gate, hop to the windmill island |
| `game/world.js` | the game's islands (the home island at game scale, stepping stones, windmill island, sky) |
| `game/main.js` | the game loop: the wanderer, walking and falling, camera, keyboard and touch input, day/dusk |
| `island-model.js` | the island itself: terrain, water, clouds, the wanderer |
| `three-d-stage.js` | `<three-d-stage>`, a reusable viewer with orbit controls, lighting and OBJ/GLB export |
| `styles.css` | page styles |

## Live

Hosted on GitHub Pages: https://mariisno.github.io/oy/

## License

MIT, see `LICENSE`.
