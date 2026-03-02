# Box2DJS Top-Down Car Game

A top-down 2D racing game built with **Box2D** (JavaScript port) for realistic car physics. Drive around a track, complete laps, and avoid racking up too much damage from collisions.

## What It Is

- **Physics-driven driving**: The car uses Box2D bodies and joints (revolving wheels, prismatic suspension) so steering, acceleration, and braking feel like a real top-down vehicle.
- **Lap racing**: Cross the finish line to count laps; complete all laps to win (with confetti).
- **Damage system**: Collisions increase a damage percentage; the HUD shows damage and lap count.
- **Controls**: Keyboard (arrow keys + space), plus on-screen buttons for touch/mouse.
- **Runs in the browser**: Single HTML page, canvas rendering, optional fullscreen.

## How to Run

1. Serve the project over HTTP (e.g. `npx serve .` or any static server). Opening `index.html` directly may fail due to script loading.
2. Open the page in a browser. Use **Space** to accelerate, **Down** to brake, **Left/Right** to steer.

## Controls

| Action      | Keyboard | On-screen |
|------------|----------|-----------|
| Accelerate | Space    | Accelerate button |
| Brake      | Down     | Brake button |
| Steer      | Left / Right | Steer left / right |
| Fullscreen | —        | Fullscreen button |

## Tech Stack

- **Box2D** (box2d.js) for 2D physics (bodies, fixtures, joints, collision).
- **Canvas 2D** for drawing the world and car.
- Vanilla JavaScript; no build step.

## Credits & Origins

- Physics and car model inspired by the [Build New Games Box2D tutorial](http://buildnewgames.com/box2dweb/) and [domasx2/gamejs-box2d-car-example](https://github.com/domasx2/gamejs-box2d-car-example).
- A playable demo using this style of game was previously hosted at [The National’s Formula One interactive](https://multimedia.thenational.ae/assets/visual_assets/formula_one_interactive/).

## Project Structure

```
├── index.html   # Page, canvas, controls UI, script/style refs
├── box2d.js     # Box2D physics engine (JS port)
├── cargame.js   # Game logic: world, car, wheels, laps, damage, rendering
├── cargame.css  # Layout and styling
└── README.md
```

**Note:** `index.html` currently references some assets (images, CSS, scripts) from external URLs. For full offline use, replace those with local copies or your own assets.
