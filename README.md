![No Backend](https://img.shields.io/badge/backend-none-2f5d50?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/javascript-vanilla-f7df1e?style=flat-square)
![MediaPipe](https://img.shields.io/badge/computer%20vision-mediapipe-4285f4?style=flat-square)
![Status](https://img.shields.io/badge/status-experimental-orange?style=flat-square)

# HandConnect

### Your hands, turned into light.

Most projects start with a roadmap. This one started with a question, asked somewhere around 2am: *what if a webcam and ten fingers were the only ingredients?*

HandConnect points your camera at your hands and turns them into a living circuit — particles trailing your fingertips, energy arcs connecting both hands, a rotating mandala stitched from your own geometry, and a synthesized hum that rises the closer your hands get. No controller, no install, no account. Just a browser tab and your hands.

---

## What it actually does

Open it, grant camera access, and start moving your hands. Pinch your thumb and index finger together and sparks fly. Bring both hands close and a current visibly builds between them — and audibly too, since the pitch and volume of an ambient hum are wired directly to hand proximity. Switch between five generative visual themes on the fly, each one a small color function rather than a static palette.

It doesn't do anything "useful." That's sort of the point.

## Key features

- **Real-time two-hand tracking** — 21 landmarks per hand via MediaPipe Hands, running entirely on-device, no server round-trip
- **Five generative themes** — Rainbow, Cyberpunk, Lava, Ocean, and Galaxy, each computed procedurally per frame rather than swapped from a static palette
- **Pinch-to-spark interaction** — bring thumb and index finger together to trigger particle bursts, shockwave ripples, and a synthesized zap
- **Two-hand energy field** — gradient arcs connect matching fingertips across both hands, with a slowly rotating ten-point mandala woven from the geometry between them
- **A hum that listens** — a Web Audio oscillator tracks the distance between your hands in real time, rising in pitch and volume like a theremin built out of code
- **Reactive digital rain** — a matrix-style background that speeds up and brightens with how fast your hands are moving
- **Zero backend, zero accounts** — every pixel and every sound is generated client-side; nothing is recorded, stored, or sent anywhere
- **A hand-tuned landing page** — cursor glow, parallax hero art, scroll reveals, and a couple of easter eggs for anyone who pokes around

## Tech stack

| Layer | Tools |
|---|---|
| Structure & style | HTML5, CSS3 (custom-property design tokens, no framework) |
| Logic | Vanilla JavaScript (ES6+) — no React, no build step |
| Computer vision | [MediaPipe Hands](https://developers.google.com/mediapipe) — on-device hand landmark detection |
| Visuals | Canvas 2D API — particle systems, gradients, glow via shadow blur, blend modes |
| Audio | Web Audio API — oscillators, gain automation, procedural sound design |
| Interaction | IntersectionObserver, requestAnimationFrame |

## Project structure

```
handconnect/
├── index.html
├── src/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── hand-engine.js   # camera, MediaPipe, render loop, audio
│       └── landing.js       # landing page micro-interactions only
├── assets/
│   └── screenshots/
├── LICENSE
└── README.md
```

## Screenshots

<!-- Drop real screenshots or a short GIF into assets/screenshots/ using these filenames, then remove this comment -->

![Landing page](assets/screenshots/landing.png)
![Live experience mid-pinch](assets/screenshots/experience-pinch.png)
![Theme switcher](assets/screenshots/themes.png)

## How it works

Your webcam feed is piped into MediaPipe Hands, which returns 21 3D landmarks per detected hand, roughly 60 times a second. Every frame, the render loop does three things: it measures the distance between your thumb and index fingertip to detect a pinch, it draws the hand skeleton and trailing particles onto a canvas layered above the camera feed using a screen blend mode for the glow, and — if two hands are visible — it draws gradient arcs between matching fingertips plus a rotating mandala from the ten-point geometry between them.

In parallel, a Web Audio oscillator listens to how close your two hands are and maps that distance directly to pitch and gain, so the sound design is exactly as reactive as the visuals — nothing is pre-recorded.

## Installation

```bash
git clone https://github.com/your-username/handconnect.git
cd handconnect
```

This is a fully static project — there's no build step. You do need a local server though, since browsers block camera access on the bare `file://` protocol:

```bash
npx serve .
# or
python -m http.server 8000
```

Open the printed URL in Chrome, grant camera access, and move your hands.

**Live demo:** _add your deployed link here_

## Future improvements

- Custom gesture recorder — teach the app a new gesture and bind it to its own effect
- Snapshot & share — export a few seconds of the canvas and audio as a shareable clip
- Adaptive performance mode — auto-scale particle density and model complexity to hold frame rate on weaker devices
- Remote duet mode — two people in two different places, one shared energy arc, over WebRTC

## Credits

- [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) — Google
- Fonts: Fraunces, Inter, JetBrains Mono via Google Fonts
- Built by Chinmaya Chamedia, somewhere between 2am and 4am

Licensed under [MIT](LICENSE).

---

If this made you smile for even five seconds, it did its job.
