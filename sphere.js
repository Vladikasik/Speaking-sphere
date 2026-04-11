/* ═══ Kimi OS — 3D Sphere Engine v10 ═══ */
/* Inner sphere = user (mic), Outer sphere = AI */
/* v10: 3D lines, vivid custom colors, setInnerColor API */
(function () {
  'use strict';

  const canvas = document.getElementById('sphereCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let dpr = 1, W = 0, H = 0;

  /* Separate audio levels */
  let micSmooth = 0, micPeak = 0;
  let aiSmooth = 0, aiPeak = 0;
  let anySmooth = 0;

  /* Mobile detection — reduce work */
  const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const COUNT = isMobile ? 500 : 1200;
  const INNER_COUNT = isMobile ? 180 : 400;
  const MAX_PULSES = isMobile ? 4 : 10;
  const RADIUS = 260;
  const FOV = 600;
  const GA = Math.PI * (3 - Math.sqrt(5));

  let speakerBlend = 0;

  /* ── Custom inner-sphere color ── */
  let innerIdleCurrent  = { r: 210, g: 215, b: 225 }; // starts white
  let innerActiveCurrent = { r: 240, g: 245, b: 255 };

  function makeSphere(n, seed) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = GA * i * (seed || 1);
      pts.push({
        ox: Math.cos(th) * r, oy: y, oz: Math.sin(th) * r,
        size: 0.5 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return pts;
  }

  const outerPts = makeSphere(COUNT, 1);
  const innerPts = makeSphere(INNER_COUNT, 1.618);

  /* ── Pulse waves ── */
  const pulses = [];
  let lastPulse = 0;
  function spawnPulse(t, intensity) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pulses.push({
      ox: Math.sin(ph) * Math.cos(th), oy: Math.cos(ph), oz: Math.sin(ph) * Math.sin(th),
      birth: t, speed: 0.6 + Math.random() * 0.5,
      life: 2 + Math.random() * 1.5, intensity: intensity || 1
    });
    if (pulses.length > MAX_PULSES) pulses.shift();
  }

  /* ── Resize ── */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    W = document.documentElement.clientWidth || window.innerWidth;
    H = document.documentElement.clientHeight || window.innerHeight;
    /* iOS Safari: visual viewport can be smaller than layout viewport;
       use the larger value to prevent black strips around the canvas */
    if (window.visualViewport) {
      W = Math.max(W, window.visualViewport.width);
      H = Math.max(H, window.visualViewport.height);
    }
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  resize();
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

  /* ── 3D projection (returns rx, ry, rz for line drawing) ── */
  function project(ox, oy, oz, rotY, rotX, rad, cx, cy) {
    const cY = Math.cos(rotY), sY = Math.sin(rotY);
    let rx = ox * cY - oz * sY, rz = ox * sY + oz * cY;
    const cX = Math.cos(rotX), sX = Math.sin(rotX);
    const ry = oy * cX - rz * sX, rz2 = oy * sX + rz * cX;
    const sc = FOV / (FOV + rz2 * rad);
    return { x: cx + rx * rad * sc, y: cy + ry * rad * sc, depth: (rz2 + 1) * 0.5, sc, rx: rx, ry: ry, rz: rz2 };
  }

  /* ── Pulse brightness ── */
  function getPulse(ox, oy, oz, t) {
    let b = 0;
    for (let w = 0; w < pulses.length; w++) {
      const pw = pulses[w];
      const age = t - pw.birth;
      if (age < 0 || age > pw.life) continue;
      const dot = ox * pw.ox + oy * pw.oy + oz * pw.oz;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      const front = age * pw.speed;
      const dist = Math.abs(angle - front);
      const width = 0.4 + anySmooth * 0.3;
      if (dist < width) {
        const fade = 1 - age / pw.life;
        b += (1 - dist / width) * fade * pw.intensity;
      }
    }
    return Math.min(b, 1.5);
  }

  /* ── Colors ── */
  let colorTime = 0;

  function colorOuter(d, pb, al) {
    const h1 = Math.sin(colorTime * 0.15) * 0.5 + 0.5;
    const h2 = Math.sin(colorTime * 0.11 + 1.5) * 0.5 + 0.5;
    const h3 = Math.sin(colorTime * 0.09 + 3.0) * 0.5 + 0.5;
    const baseR = 20 + h1 * 50 + h2 * 30;
    const baseG = 30 + h2 * 40 + h3 * 35;
    const baseB = 140 + h3 * 60 + h1 * 40;
    return {
      r: Math.round(Math.min(255, baseR + d*45 + pb*80 + al*100)),
      g: Math.round(Math.min(255, baseG + d*65 + pb*90 + al*120)),
      b: Math.round(Math.min(255, baseB + d*70 + pb*50 + al*60)),
    };
  }

  /* Inner color: idle = chosen color, speaking = BRIGHTER chosen color (not white) */
  function colorInner(d, pb, al) {
    const u = speakerBlend;
    const idl = innerIdleCurrent, act = innerActiveCurrent;
    // Shimmer
    const sw = Math.sin(colorTime * 2.5) * 0.5 + 0.5;
    // Base = idle (chosen) color
    let bR = idl.r + (255 - idl.r) * sw * 0.05;
    let bG = idl.g + (255 - idl.g) * sw * 0.05;
    let bB = idl.b + (255 - idl.b) * sw * 0.05;
    // Speaking: blend toward ACTIVE (brighter chosen color), not white
    bR += (act.r - bR) * u * 0.8;
    bG += (act.g - bG) * u * 0.8;
    bB += (act.b - bB) * u * 0.8;
    // Depth + pulse brightness (stays in hue)
    bR += d * 20 + pb * 35 * (1 + u * 0.5);
    bG += d * 20 + pb * 35 * (1 + u * 0.5);
    bB += d * 20 + pb * 35 * (1 + u * 0.5);
    return {
      r: Math.round(Math.min(255, bR)),
      g: Math.round(Math.min(255, bG)),
      b: Math.round(Math.min(255, bB)),
    };
  }

  /* ── Inner-sphere chord lines (long lines crossing THROUGH sphere center) ── */
  const LINE_MIN_DIST = 0.8;   // minimum 3D dist — forces LONG chords
  const LINE_MAX_DIST = 1.9;   // near full diameter
  const LINE_COUNT = isMobile ? 25 : 50;  // fewer, more intentional
  const LINE_REFRESH = 0.3;    // faster refresh for more movement

  let cachedLinePairs = [];
  let lineAlphas = [];
  let lastLineRefresh = -10;

  function refreshLinePairs() {
    const newPairs = [];
    const n = INNER_COUNT;
    const maxAttempts = LINE_COUNT * 10;
    for (let a = 0; a < maxAttempts && newPairs.length < LINE_COUNT; a++) {
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * n);
      if (i === j) continue;
      const pi = innerPts[i], pj = innerPts[j];
      const dx = pi.ox - pj.ox, dy = pi.oy - pj.oy, dz = pi.oz - pj.oz;
      const dist3 = Math.sqrt(dx*dx + dy*dy + dz*dz);
      // Only LONG chords that cross through center
      if (dist3 < LINE_MIN_DIST || dist3 > LINE_MAX_DIST) continue;
      newPairs.push({ i, j, dist3 });
    }
    cachedLinePairs = newPairs;
    while (lineAlphas.length < cachedLinePairs.length) lineAlphas.push(0);
    lineAlphas.length = cachedLinePairs.length;
  }

  function drawInnerLines(proj, colorFn, audioAmt, t) {
    if (t - lastLineRefresh > LINE_REFRESH) {
      refreshLinePairs();
      lastLineRefresh = t;
    }
    if (cachedLinePairs.length === 0) return;

    ctx.lineCap = 'round';
    for (let k = 0; k < cachedLinePairs.length; k++) {
      const pair = cachedLinePairs[k];
      const a = proj[pair.i], b = proj[pair.j];
      if (!a || !b) continue;
      // Both points must be front-facing
      if (a.depth < 0.15 || b.depth < 0.15) {
        lineAlphas[k] *= 0.92;
        continue;
      }

      const avgDepth = (a.depth + b.depth) * 0.5;
      const pulse = Math.max(a.pb || 0, b.pb || 0);

      // Idle: INVISIBLE. Speaking: appear and glow
      const speakFactor = Math.min(1, audioAmt * 5);
      const targetAlpha = speakFactor * (0.15 + avgDepth * 0.25 + pulse * 0.3);

      lineAlphas[k] += (targetAlpha - lineAlphas[k]) * 0.15;
      const alpha = lineAlphas[k];
      if (alpha < 0.005) continue;

      const c = colorFn(avgDepth, pulse, audioAmt);

      // Line width: thin always, slightly thicker when loud
      const lw = (0.3 + avgDepth * 0.4 + speakFactor * 0.4) * dpr;

      // Glow layer when speaking
      if (audioAmt > 0.05 && !isMobile) {
        ctx.globalAlpha = Math.min(0.12, alpha * 0.3);
        ctx.strokeStyle = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
        ctx.lineWidth = lw * 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      ctx.globalAlpha = Math.min(0.4, alpha);
      ctx.strokeStyle = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  /* ── Draw sphere ── */
  function drawSphere(pts, t, rotY, rotX, rad, cx, cy, colorFn, alphaBase, audioAmt, withLines) {
    const n = pts.length;
    const proj = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const disp = Math.sin(t * 0.5 + p.phase * 3) * 0.005;
      const pr = project(p.ox*(1+disp), p.oy*(1+disp), p.oz*(1+disp), rotY, rotX, rad, cx, cy);
      const pb = getPulse(p.ox, p.oy, p.oz, t);
      proj[i] = { x: pr.x, y: pr.y, depth: pr.depth, sc: pr.sc, size: p.size, pb, rx: pr.rx, ry: pr.ry, rz: pr.rz };
    }

    /* Draw lines BEFORE sorting (proj indices match innerPts indices) */
    if (withLines) {
      drawInnerLines(proj, colorFn, audioAmt, t);
    }

    proj.sort((a, b) => a.depth - b.depth);

    for (let i = 0; i < n; i++) {
      const p = proj[i];
      const d = p.depth;
      if (d < 0.05) continue;

      const audioSize = 1 + audioAmt * 0.5 + p.pb * 0.5;
      const sz = Math.max(0.4, p.size * dpr * p.sc * (0.3 + d * 0.7) * audioSize);
      const audioBright = 1 + audioAmt * 2;

      const depthAlpha = d < 0.7 ? d * d * (0.3 + d * 0.7) : 0.35 + d * 0.15;
      const alpha = Math.min(1, (depthAlpha + p.pb * 0.7) * alphaBase * audioBright);
      const c = colorFn(d, p.pb, audioAmt);

      if (!isMobile && (p.pb > 0.1 || d > 0.3) && sz > 0.5) {
        const glowSize = sz * (6 + p.pb * 9 + audioAmt * 8 + d * 3);
        const glowAlpha = alpha * (0.10 + p.pb * 0.20 + audioAmt * 0.18);
        ctx.globalAlpha = Math.min(0.5, glowAlpha);
        const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        gl.addColorStop(0, 'rgba('+c.r+','+c.g+','+c.b+',0.8)');
        gl.addColorStop(0.3, 'rgba('+c.r+','+c.g+','+c.b+',0.25)');
        gl.addColorStop(0.7, 'rgba('+c.r+','+c.g+','+c.b+',0.05)');
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(p.x, p.y, glowSize, 0, Math.PI*2); ctx.fill();
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgb('+c.r+','+c.g+','+c.b+')';
      ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI*2); ctx.fill();

      if ((p.pb > 0.25 || audioAmt > 0.08) && d > 0.4) {
        ctx.globalAlpha = Math.min(0.9, (p.pb*0.5 + audioAmt*0.5) * d);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(p.x, p.y, sz*0.35, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  /* ── Background glow ── */
  function drawGlow(cx, cy, rad) {
    const ga = 0.1 + anySmooth * 0.3;
    const size = rad * (2.0 + anySmooth * 0.5);
    const bg = ctx.createRadialGradient(cx, cy, rad * 0.05, cx, cy, size);
    // Use inner color for glow when user is speaking
    const ic = innerIdleCurrent;
    if (speakerBlend > 0.3) {
      const blend = Math.min(1, speakerBlend);
      bg.addColorStop(0, 'rgba('+ic.r+','+ic.g+','+ic.b+',' + (ga*0.7*blend) + ')');
      bg.addColorStop(0.3, 'rgba('+Math.round(ic.r*0.6)+','+Math.round(ic.g*0.6)+','+Math.round(ic.b*0.6)+',' + (ga*0.35*blend) + ')');
      bg.addColorStop(0.6, 'rgba('+Math.round(ic.r*0.3)+','+Math.round(ic.g*0.3)+','+Math.round(ic.b*0.3)+',' + (ga*0.12*blend) + ')');
    } else {
      const h = Math.sin(colorTime * 0.15) * 0.5 + 0.5;
      const gr = Math.round(60 + h * 60);
      const gg = Math.round(70 + (1-h) * 60);
      const gb = Math.round(180 + h * 75);
      const boost = aiSmooth > 0.02 ? 1.3 : 0.8;
      bg.addColorStop(0, 'rgba('+gr+','+gg+','+gb+',' + (ga*boost) + ')');
      bg.addColorStop(0.25, 'rgba('+(gr>>1)+','+(gg>>1)+','+gb+',' + (ga*boost*0.5) + ')');
      bg.addColorStop(0.55, 'rgba('+(gr>>2)+','+(gg>>2)+','+(gb>>1)+',' + (ga*boost*0.15) + ')');
    }
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI*2); ctx.fill();
  }

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  let startTime = 0;
  function render(ts) {
    requestAnimationFrame(render);
    if (!startTime) startTime = ts;
    const t = (ts - startTime) * 0.001;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h * 0.40;
    ctx.clearRect(0, 0, w, h);

    const k = window.kimiko || {};
    const micLvl = k._micLevel || 0;
    const aiLvl = k._aiLevel || 0;

    micSmooth = micSmooth * 0.7 + micLvl * 0.3;
    micPeak = micPeak * 0.9 + (micLvl > micPeak ? micLvl * 0.5 : 0);
    aiSmooth = aiSmooth * 0.7 + aiLvl * 0.3;
    aiPeak = aiPeak * 0.9 + (aiLvl > aiPeak ? aiLvl * 0.5 : 0);
    anySmooth = Math.max(micSmooth, aiSmooth);

    const explicitSpeaker = k._speaker || 'idle';
    let detectedSpeaker = 'idle';
    if (micLvl > 0.04 && micLvl > aiLvl * 1.5) detectedSpeaker = 'user';
    else if (aiLvl > 0.04) detectedSpeaker = 'ai';
    if (explicitSpeaker === 'user') detectedSpeaker = 'user';
    if (explicitSpeaker === 'ai' && aiLvl > 0.02) detectedSpeaker = 'ai';

    const targetBlend = detectedSpeaker === 'user' ? 1 : 0;
    speakerBlend += (targetBlend - speakerBlend) * 0.18;

    const rotY = t * 0.12;
    const rotX = 0.4 + Math.sin(t * 0.08) * 0.08;

    /* OUTER sphere (AI): 1.3x bigger */
    const outerGrow = 1 + aiSmooth * 0.25 + aiPeak * 0.1;
    const outerBreathe = 1 + Math.sin(t * 1.5) * 0.012;
    const outerRad = RADIUS * 1.3 * dpr * outerBreathe * outerGrow;
    colorTime = t;

    /* INNER sphere (user): grows more when speaking */
    const innerBase = RADIUS * dpr * 0.48;
    const innerGrow = 1 + micSmooth * 0.22 + micPeak * 0.08;
    const innerBreathe = 1 + Math.sin(t * 1.8 + 1) * 0.015;
    const innerRad = innerBase * innerGrow * innerBreathe;

    /* Pulses */
    const active = anySmooth > 0.02;
    const pulseRate = active ? 0.12 + (1 - anySmooth) * 0.25 : 1.5;
    if (t - lastPulse > pulseRate) {
      spawnPulse(t, active ? 1 + anySmooth * 2.5 : 1);
      lastPulse = t;
    }

    drawGlow(cx, cy, outerRad);

    /* Draw outer sphere (AI) — no lines */
    drawSphere(outerPts, t, rotY, rotX, outerRad, cx, cy, colorOuter, 0.55, aiSmooth, false);

    /* Draw inner sphere (user) — WITH lines */
    drawSphere(innerPts, t, -rotY * 1.4, rotX + 0.25, innerRad, cx, cy, colorInner, 1, micSmooth, true);

    /* ── 3D orbital rings (appear when speaking) ── */
    if (!isMobile) {
      const ic = innerIdleCurrent;
      const orbAlpha = Math.min(0.3, micSmooth * 2);
      if (orbAlpha > 0.01) {
        const orbCount = 3;
        for (let ri = 0; ri < orbCount; ri++) {
          const phase = ri * (Math.PI * 2 / orbCount);
          const tiltX = Math.sin(t * 0.4 + phase) * 0.7;
          const tiltZ = Math.cos(t * 0.3 + phase * 1.3) * 0.5;
          const oRad = innerRad * (0.92 + ri * 0.06);
          const segments = 64;
          const oWidth = (0.5 + micSmooth * 1.2) * dpr;

          ctx.lineWidth = oWidth;
          ctx.lineCap = 'round';
          // Draw front-facing arcs only (3D depth sorting)
          ctx.beginPath();
          let drawing = false;
          for (let s = 0; s <= segments; s++) {
            const a = (s / segments) * Math.PI * 2;
            const cosA = Math.cos(a), sinA = Math.sin(a);
            // 3D rotation
            const rx = cosA;
            const ry = sinA * Math.cos(tiltX);
            const rz = sinA * Math.sin(tiltX) + cosA * tiltZ * 0.3;
            if (rz < -0.2) { drawing = false; continue; }
            const depth01 = (rz + 1) * 0.5;
            const px = cx + rx * oRad;
            const py = cy + ry * oRad;
            if (!drawing) { ctx.moveTo(px, py); drawing = true; }
            else ctx.lineTo(px, py);
          }
          const rAlpha = orbAlpha * (0.4 + ri * 0.2);
          ctx.globalAlpha = rAlpha;
          ctx.strokeStyle = 'rgba('+ic.r+','+ic.g+','+ic.b+',0.8)';
          ctx.stroke();
          // Glow
          ctx.globalAlpha = rAlpha * 0.2;
          ctx.lineWidth = oWidth * 5;
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(render);

  /* ── API ── */
  window.kimiko = window.kimiko || {};
  if (typeof window.kimiko.onAiReply !== 'function') window.kimiko.onAiReply = null;
  if (typeof window.kimiko.onMicState !== 'function') window.kimiko.onMicState = null;
  window.kimiko._micLevel = 0;
  window.kimiko._aiLevel = 0;
  window.kimiko._speaker = 'idle';

  /* setInnerColor(idle, active) — sets permanent inner sphere color */
  window.kimiko.setInnerColor = function(idle, active) {
    if (idle) innerIdleCurrent = { r: idle.r, g: idle.g, b: idle.b };
    if (active) {
      innerActiveCurrent = { r: active.r, g: active.g, b: active.b };
    } else if (idle) {
      // Auto-generate active as 1.3× brighter
      innerActiveCurrent = {
        r: Math.min(255, Math.round(idle.r * 1.3)),
        g: Math.min(255, Math.round(idle.g * 1.3)),
        b: Math.min(255, Math.round(idle.b * 1.3)),
      };
    }
    console.log('[sphere] inner color set:', innerIdleCurrent, innerActiveCurrent);
  };

  Object.defineProperty(window.kimiko, 'audioLevel', { get: function () { return anySmooth; } });
})();
