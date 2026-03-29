# Sphere Kit — 3D Login Screen

Standalone login/landing screen with interactive 3D particle sphere.
Zero dependencies. Pure HTML + Canvas 2D. Works on mobile and desktop.

## Quick Start

```bash
# Any static server works:
npx serve .
# or
python3 -m http.server 8000
# or just open index.html in browser (sphere needs no server)
```

## Files

```
sphere-kit/
  index.html   — Login page with glass UI + auth buttons (all placeholder)
  sphere.js    — 3D sphere engine (455 lines, no deps)
  README.md    — This file
```

## What to Customize

### 1. Brand Name & Tagline
In `index.html`, search for `CUSTOMIZE` comments. Change:
```html
<title>Your App</title>
...
<h1>Your App</h1>
<p>Tagline goes here</p>
```

### 2. Auth Buttons
Three buttons are wired to `alert()` placeholders:
- **Google OAuth** — replace `href="#"` with your `/auth/google` route
- **Telegram** — replace with your Telegram Login Widget or bot auth
- **Sign In** — replace `onclick` with your password/magic-link flow

To remove a button: delete the `<a class="gl ...">` block.
To add a button: copy any `.gl` block and change icon + text.

### 3. Sphere Color
Inner sphere color can be changed via JS:
```js
// After sphere.js loads:
window.kimiko.setInnerColor({ r: 255, g: 160, b: 60 }); // orange
window.kimiko.setInnerColor({ r: 60, g: 220, b: 140 });  // green
window.kimiko.setInnerColor({ r: 140, g: 80, b: 255 });   // purple
```
The outer sphere color cycles automatically (blue/indigo tones).

### 4. Background Gradient
Change CSS custom properties in `:root`:
```css
--sphere-tint-1: rgba(60,110,220,0.18);  /* top-right glow */
--sphere-tint-2: rgba(30,65,160,0.14);   /* bottom-left glow */
```

### 5. Status Pills
The pills at top of card show system status. Edit directly:
```html
<span class="pill" data-s="on">System: online</span>
```
States: `data-s="on"` (green), `data-s="off"` (red), no attr (neutral).

### 6. Version
```html
<div class="ver">v1.0.0</div>
```

## Sphere API

The sphere engine exposes `window.kimiko`:

| Property/Method | Description |
|----------------|-------------|
| `kimiko.setInnerColor({r,g,b})` | Set inner sphere idle color |
| `kimiko.setInnerColor(idle, active)` | Set idle + speaking colors |
| `kimiko._micLevel = 0..1` | Feed mic audio level (makes inner sphere react) |
| `kimiko._aiLevel = 0..1` | Feed AI audio level (makes outer sphere react) |
| `kimiko._speaker = 'user'\|'ai'\|'idle'` | Who is currently speaking |
| `kimiko.audioLevel` | Read current combined audio level |

### Audio Integration Example

To make the sphere react to real microphone input:
```js
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  function tick() {
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
    window.kimiko._micLevel = avg;
    window.kimiko._speaker = avg > 0.04 ? 'user' : 'idle';
    requestAnimationFrame(tick);
  }
  tick();
});
```

## Performance Notes

- Mobile: auto-reduces particle count (500 vs 1200) and effects
- Retina: capped at 1.5x DPR on mobile, 2x on desktop
- No WebGL — pure Canvas 2D, works everywhere including Telegram WebApp
- Respects `prefers-reduced-motion`

## License

Internal use. Original design by Kimi OS team.
