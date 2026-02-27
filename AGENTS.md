# AGENTS.md

## Cursor Cloud specific instructions

This is a static front-end web project (a top-down F1 racing game using Box2D physics). There is no package manager, build system, linter, test framework, or backend.

### Project structure

- `index.html` — main page; loads all CSS/JS/images from external CDN (`multimedia.thenational.ae`)
- `cargame.js` — game logic (physics, controls, lap/damage tracking)
- `cargame.css` — styles; also references a track background image from CDN
- `box2d.js` — bundled Box2D physics engine (local copy is unminified; CDN serves `box2d.min.js`)
- `confetti.js` — confetti animation library for game completion

### Running the application

Serve files with any static HTTP server:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` in a browser.

### Key caveats

- **CDN dependency**: `index.html` loads all assets from `https://multimedia.thenational.ae/assets/visual_assets/formula_one_interactive/`. Internet access is required. The local JS/CSS files are the source but are not referenced by the HTML.
- **No lint/test/build**: There are no configured linting tools, automated tests, or build steps.
- **Controls**: Spacebar = accelerate, arrow left/right = steer, arrow down = brake. Click canvas first for keyboard focus.
