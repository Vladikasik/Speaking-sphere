/* ═══ Voice Note Recording Mode + Touch Interaction ═══ */
/* Tap → already connected (auto-connect on load)      */
/* Hold 3s → record note (xAI transcription, no VAD)   */
/* Release → keep recording. Tap again → stop & extract */
(function () {
  'use strict';

  var _cfg = window.__neron || {};
  function _d(p) { return atob((p || []).join('')); }

  /* ── State ── */
  var recState = 'idle';  // idle | pressing | recording | processing | cards | grok_handoff
  var pressTimer = null;
  var touchActive = false; /* prevents pointer+touch double-fire */

  /* ── DOM ── */
  var touchTarget = document.getElementById('touchTarget');
  var barEl = document.getElementById('recordingBar');
  var barFill = document.getElementById('recordingBarFill');
  var hintEl = document.getElementById('recordingHint');
  var transcriptEl = document.getElementById('transcriptDisplay');
  var processingEl = document.getElementById('processingOverlay');
  var bottomUI = document.getElementById('bottomUI');

  var origTint1 = 'rgba(60,110,220,0.18)';
  var origTint2 = 'rgba(30,65,160,0.14)';

  function setState(s) {
    var prev = recState;
    recState = s;
    console.log('[recording] ' + prev + ' \u2192 ' + s);
  }

  /* ══════════════════════════════════════════
     PRESSING — 3 second hold
     ══════════════════════════════════════════ */
  function startPressing() {
    if (recState !== 'idle') return;
    setState('pressing');

    /* Stop AI if speaking */
    if (window.neron && window.neron.stopAiPlayback) window.neron.stopAiPlayback();

    /* Show + animate loading bar */
    barEl.classList.add('active');
    barFill.style.transition = 'none';
    barFill.style.width = '0';
    void barFill.offsetWidth; /* force reflow */
    barFill.style.transition = 'width 3s linear';
    barFill.style.width = '100%';

    pressTimer = setTimeout(function () {
      pressTimer = null;
      enterRecording();
    }, 3000);
  }

  function cancelPressing() {
    if (recState !== 'pressing') return;
    setState('idle');
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }

    barFill.style.transition = 'width 0.2s';
    barFill.style.width = '0';
    setTimeout(function () { barEl.classList.remove('active'); }, 250);
  }

  /* ══════════════════════════════════════════
     RECORDING — xAI transcription, VAD off
     ══════════════════════════════════════════ */
  function enterRecording() {
    setState('recording');

    /* Suppress any Grok responses during recording */
    window.neron._suppressResponse = true;
    /* Disable VAD so xAI doesn't auto-respond, but audio still flows */
    if (window.neron.clearAudioBuffer) window.neron.clearAudioBuffer();
    if (window.neron.setVAD) window.neron.setVAD(false);

    /* Red background */
    document.body.style.setProperty('--sphere-tint-1', 'rgba(220,60,60,0.25)');
    document.body.style.setProperty('--sphere-tint-2', 'rgba(160,30,30,0.18)');

    /* Red sphere */
    if (window.kimiko && window.kimiko.setInnerColor) {
      window.kimiko.setInnerColor({ r: 240, g: 80, b: 80 }, { r: 255, g: 120, b: 120 });
    }

    /* UI */
    hintEl.classList.add('visible');
    transcriptEl.classList.add('visible');
    transcriptEl.textContent = 'Recording...';
    if (bottomUI) bottomUI.style.opacity = '0';

    /* Keep bar full as recording indicator */
    barFill.style.transition = 'none';
    barFill.style.width = '100%';
  }

  /* ══════════════════════════════════════════
     STOP RECORDING — commit audio, get transcript
     ══════════════════════════════════════════ */
  function stopAndProcess() {
    if (recState !== 'recording') return;
    setState('processing');

    /* UI: show spinner */
    hintEl.classList.remove('visible');
    transcriptEl.textContent = 'Transcribing...';
    processingEl.classList.add('active');

    /* Commit the audio buffer — xAI will transcribe it */
    if (window.neron.commitAudio) window.neron.commitAudio();

    /* Wait for transcription callback from voice.js */
    var timeout = setTimeout(function () {
      /* Timeout fallback — if no transcript after 8s, bail */
      window.neron._onTranscript = null;
      console.warn('[recording] Transcription timeout');
      processingEl.classList.remove('active');
      showToast('Transcription timeout');
      resetToIdle();
    }, 8000);

    window.neron._onTranscript = function (transcript) {
      window.neron._onTranscript = null;
      clearTimeout(timeout);
      console.log('[recording] Got transcript:', transcript);

      if (!transcript || !transcript.trim()) {
        processingEl.classList.remove('active');
        showToast('No speech detected');
        resetToIdle();
        return;
      }

      callExtraction(transcript.trim());
    };
  }

  /* ══════════════════════════════════════════
     EXTRACTION API
     ══════════════════════════════════════════ */
  async function callExtraction(transcript) {
    transcriptEl.textContent = transcript;

    try {
      var resp = await fetch('https://api.neron.guru/extract/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + _d(_cfg.e)
        },
        body: JSON.stringify({ text: transcript })
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      var yamlText = await resp.text();
      console.log('[recording] Extraction raw:', yamlText);

      var extraction;
      try {
        extraction = jsyaml.load(yamlText);
      } catch (e) {
        try { extraction = JSON.parse(yamlText); } catch (e2) {
          throw new Error('Failed to parse response');
        }
      }

      processingEl.classList.remove('active');
      transcriptEl.classList.remove('visible');
      enterCards(extraction, transcript);

    } catch (err) {
      console.error('[recording] Extraction failed:', err);
      processingEl.classList.remove('active');
      transcriptEl.classList.remove('visible');
      showToast('Extraction failed — sending note to Neron');
      grokHandoff(transcript, null, []);
    }
  }

  /* ══════════════════════════════════════════
     CARDS
     ══════════════════════════════════════════ */
  function enterCards(extraction, transcript) {
    setState('cards');

    barEl.classList.remove('active');
    barFill.style.width = '0';

    document.body.style.setProperty('--sphere-tint-1', origTint1);
    document.body.style.setProperty('--sphere-tint-2', origTint2);
    if (window.kimiko && window.kimiko.setInnerColor) {
      window.kimiko.setInnerColor({ r: 210, g: 215, b: 225 });
    }

    /* Disable touch target so card swipes work */
    touchTarget.style.pointerEvents = 'none';

    if (!window.neron || !window.neron.cards) {
      grokHandoff(transcript, extraction, []);
      return;
    }

    window.neron.cards.show(extraction, function (swipeResults) {
      touchTarget.style.pointerEvents = '';
      grokHandoff(transcript, extraction, swipeResults);
    });
  }

  /* ══════════════════════════════════════════
     GROK HANDOFF
     ══════════════════════════════════════════ */
  function grokHandoff(transcript, extraction, swipeResults) {
    setState('grok_handoff');

    if (bottomUI) bottomUI.style.opacity = '1';

    /* Re-enable VAD and responses for normal conversation */
    window.neron._suppressResponse = false;
    if (window.neron.setVAD) window.neron.setVAD(true);

    var prompt = buildGrokPrompt(transcript, extraction, swipeResults);

    if (window.neron && window.neron.sendTextToGrok) {
      window.neron.sendTextToGrok(prompt).then(function () {
        setState('idle');
      }).catch(function (err) {
        console.error('[recording] Grok handoff failed:', err);
        setState('idle');
      });
    } else {
      setState('idle');
    }
  }

  function buildGrokPrompt(transcript, extraction, swipeResults) {
    var lines = ['The user just recorded a voice note: "' + transcript + '"'];

    if (extraction && swipeResults && swipeResults.length > 0) {
      var confirmed = swipeResults.filter(function (r) { return r.direction === 'right'; });
      var dismissed = swipeResults.filter(function (r) { return r.direction === 'left'; });

      if (confirmed.length > 0) {
        lines.push('');
        lines.push('Extracted insights confirmed:');
        confirmed.forEach(function (r) {
          var d = getSummary(r.type, extraction);
          if (d) lines.push('- ' + r.type + ': ' + d);
        });
      }
      if (dismissed.length > 0) {
        lines.push('');
        lines.push('Dismissed (may be inaccurate):');
        dismissed.forEach(function (r) { lines.push('- ' + r.type); });
      }
    }

    lines.push('');
    lines.push('Acknowledge what was recorded, mention key points, offer to help with tasks or follow up. Be conversational and concise.');
    return lines.join('\n');
  }

  function getSummary(type, ext) {
    if (!ext) return null;
    switch (type) {
      case 'mood':   return ext.mood ? (ext.mood.emotions || []).join(', ') + (ext.mood.trigger ? ' (' + ext.mood.trigger + ')' : '') : null;
      case 'body':   return ext.body ? [ext.body.physical, ext.body.sleep, ext.body.substance].filter(Boolean).join('; ') : null;
      case 'food':   return ext.food ? (ext.food.items || []).join(', ') : null;
      case 'activities': return (ext.activities || []).map(function (a) { return a.description; }).join(', ');
      case 'tasks':  return (ext.goals_tasks || []).map(function (t) { return t.content; }).join(', ');
      case 'reflections': return (ext.reflections || []).map(function (r) { return r.content; }).join('; ');
      case 'people': return (ext.people || []).map(function (p) { return p.name; }).join(', ');
      default: return null;
    }
  }

  /* ══════════════════════════════════════════
     RESET
     ══════════════════════════════════════════ */
  function resetToIdle() {
    setState('idle');
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }

    barFill.style.transition = 'width 0.2s';
    barFill.style.width = '0';
    barEl.classList.remove('active');
    hintEl.classList.remove('visible');
    transcriptEl.classList.remove('visible');
    processingEl.classList.remove('active');

    document.body.style.setProperty('--sphere-tint-1', origTint1);
    document.body.style.setProperty('--sphere-tint-2', origTint2);
    if (window.kimiko && window.kimiko.setInnerColor) {
      window.kimiko.setInnerColor({ r: 210, g: 215, b: 225 });
    }

    if (bottomUI) bottomUI.style.opacity = '1';
    touchTarget.style.pointerEvents = '';

    /* Re-enable VAD and responses */
    if (window.neron) {
      window.neron._suppressResponse = false;
      if (window.neron.setVAD) window.neron.setVAD(true);
      window.neron._onTranscript = null;
    }
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:40;' +
      'padding:12px 24px;border-radius:16px;background:rgba(20,20,20,0.9);border:1px solid rgba(255,255,255,0.15);' +
      'color:rgba(255,255,255,0.8);font-size:13px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'pointer-events:none;opacity:0;transition:opacity 0.3s;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 2500);
  }

  /* ══════════════════════════════════════════
     TOUCH + POINTER EVENTS
     ══════════════════════════════════════════ */
  if (!touchTarget) return;

  /* ── Unified handlers ── */
  function onDown(e) {
    if (recState === 'idle') {
      startPressing();
    }
    /* recording/processing/cards — handled on up */
  }

  function onUp(e) {
    if (recState === 'pressing') {
      cancelPressing();
      /* Was just a tap — no action needed since auto-connected on load */
      return;
    }
    /* Release while recording → do NOTHING (keep recording) */
    /* Only a fresh tap (down+up) while recording stops it — handled via onTap */
  }

  function onTap() {
    /* Only fires on quick tap gestures, not after long-press release */
    if (recState === 'recording') {
      stopAndProcess();
    }
  }

  function onCancel() {
    if (recState === 'pressing') cancelPressing();
  }

  /* ── Touch events (iOS primary) ── */
  var touchStartTime = 0;
  var touchMoved = false;

  touchTarget.addEventListener('touchstart', function (e) {
    touchActive = true;
    touchStartTime = Date.now();
    touchMoved = false;
    onDown(e);
    e.preventDefault(); /* prevent iOS long-press callout / magnifier */
  }, { passive: false });

  touchTarget.addEventListener('touchmove', function () {
    touchMoved = true;
  }, { passive: true });

  touchTarget.addEventListener('touchend', function (e) {
    var elapsed = Date.now() - touchStartTime;
    onUp(e);

    /* Detect tap: quick touch without moving */
    if (!touchMoved && elapsed < 400 && recState === 'recording') {
      /* This was a fresh tap while recording — use a slight delay to
         distinguish from the release of the initial long-press */
      stopAndProcess();
    }

    /* Reset touch flag after a tick (so pointer events don't double-fire) */
    setTimeout(function () { touchActive = false; }, 100);
    e.preventDefault();
  }, { passive: false });

  touchTarget.addEventListener('touchcancel', function () {
    onCancel();
    touchActive = false;
  });

  /* ── Pointer events (desktop fallback) ── */
  var pointerDownTime = 0;

  touchTarget.addEventListener('pointerdown', function (e) {
    if (touchActive) return; /* touch already handled */
    pointerDownTime = Date.now();
    onDown(e);
  });

  touchTarget.addEventListener('pointerup', function (e) {
    if (touchActive) return;
    var elapsed = Date.now() - pointerDownTime;
    onUp(e);

    if (elapsed < 400 && recState === 'recording') {
      stopAndProcess();
    }
  });

  touchTarget.addEventListener('pointercancel', function () {
    if (touchActive) return;
    onCancel();
  });

  /* Prevent context menu on long-press */
  touchTarget.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ── Public API ── */
  window.neron = window.neron || {};
  window.neron.recording = { getState: function () { return recState; }, cancel: resetToIdle };

})();
