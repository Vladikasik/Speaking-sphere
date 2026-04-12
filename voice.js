/* ═══ Neron Voice Client — xAI Grok Realtime + Neron MCP ═══ */
(function () {
  'use strict';

  /* ── Keys loaded from config.js (gitignored) ── */
  var _cfg = window.__neron || {};
  function _d(p) { return atob((p || []).join('')); }

  var RATE = 24000;

  /* ── State ── */
  var ws = null;
  var audioCtx = null;
  var micStream = null;
  var isAiSpeaking = false;
  var nextPlayTime = 0;
  var sources = [];
  var state = 'idle';
  /* Soft-mute: WS stays connected, mic stream stays open, but the worklet
     stops forwarding PCM frames and stops writing _micLevel. Flipped on/off
     via window.neron.muteVoice / unmuteVoice / toggleMute. */
  var isMuted = false;
  /* AnalyserNode sits between every AI BufferSourceNode and audioCtx.destination.
     One rAF loop reads getByteFrequencyData per frame and writes the live
     avg/255 value into window.kimiko._aiLevel — so the outer sphere tracks
     what's AUDIBLE right now, not what was just decoded. */
  var aiAnalyser = null;
  var aiLevelBins = null;

  /* ── Recording mode API ── */
  window.neron = window.neron || {};
  window.neron._gateAudio = false;
  window.neron._onTranscript = null;  /* callback: function(transcript) */

  /* ── DOM ── */
  var micBtn = document.getElementById('micBtn');
  var micLabel = document.getElementById('micLabel');
  var statusPill = document.getElementById('statusPill');
  var toolsEl = document.getElementById('tools');

  /* ── Session config ── */
  function sessionMsg(vadType) {
    var td = vadType === null ? null : {
      type: 'server_vad',
      threshold: 0.5,
      silence_duration_ms: 500,
      prefix_padding_ms: 300
    };
    return {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        voice: 'sal',
        instructions: [
          'You are Neron, a voice-based personal knowledge assistant.',
          'You have access to a personal knowledge graph with notes, people, projects, tasks and more.',
          'When the user asks about their notes, tasks, projects, or people — use the search tools.',
          'You can create, update, and delete entities as requested.',
          'Be conversational and concise. Summarize results briefly — never read raw JSON.',
          'When modifying data, confirm what you did.',
          'Entity types: note, person, project, task, ai_note, mood, body, food, activity, resource, reflection.',
          'Always respond in the same language the user speaks to you.'
        ].join(' '),
        audio: {
          input:  { format: { type: 'audio/pcm', rate: RATE } },
          output: { format: { type: 'audio/pcm', rate: RATE } }
        },
        turn_detection: td,
        input_audio_transcription: { model: 'grok-2-latest' },
        tools: [
          { type: 'web_search' },
          {
            type: 'mcp',
            server_url: 'https://mcp.neron.guru/',
            server_label: 'neron',
            allowed_tools: [
              'search', 'semantic_search', 'search_notes',
              'create_entity', 'update_entity', 'delete_entity', 'bulk_create',
              'list_entities', 'get_stats', 'node_context',
              'cypher', 'instructions'
            ],
            authorization: 'Bearer ' + _d(_cfg.n)
          }
        ],
        tool_choice: 'auto'
      }
    };
  }

  /* ════════════════════════════════════════
     CONNECT
     ════════════════════════════════════════ */
  async function connect() {
    if (state !== 'idle') return;
    setState('connecting');
    var key = _d(_cfg.x);

    try {
      var token = key;
      try {
        var resp = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expires_after: { seconds: 600 } })
        });
        if (resp.ok) {
          var data = await resp.json();
          token = (data.client_secret && data.client_secret.value) || token;
          console.log('[voice] Using ephemeral token');
        }
      } catch (e) { console.log('[voice] Ephemeral token unavailable, using direct key'); }

      ws = new WebSocket('wss://api.x.ai/v1/realtime', ['xai-client-secret.' + token]);
      ws.onopen = function () {
        console.log('[voice] Connected to xAI');
        ws.send(JSON.stringify(sessionMsg('server_vad')));
      };
      ws.onmessage = onMessage;
      ws.onclose = function (e) {
        console.log('[voice] Disconnected', e.code);
        cleanup();
        setState('idle');
      };
      ws.onerror = function () { console.error('[voice] WebSocket error'); };
    } catch (e) {
      console.error('[voice] Connection failed', e);
      setState('idle');
    }
  }

  /* ════════════════════════════════════════
     MESSAGE HANDLER
     ════════════════════════════════════════ */
  function onMessage(evt) {
    var msg;
    try { msg = JSON.parse(evt.data); } catch (e) { return; }

    switch (msg.type) {
      case 'session.created':
      case 'session.updated':
        console.log('[voice] Session ready');
        if (!micStream) startMic();
        break;

      case 'input_audio_buffer.speech_started':
        if (isAiSpeaking) stopPlayback();
        if (window.kimiko) window.kimiko._speaker = 'user';
        if (!window.neron._gateAudio) setState('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        if (!window.neron._gateAudio) setState('thinking');
        break;

      /* ── Transcription completed ── */
      case 'conversation.item.input_audio_transcription.completed':
        console.log('[voice] Transcript:', msg.transcript);
        if (window.neron._onTranscript) {
          window.neron._onTranscript(msg.transcript || '');
        }
        break;

      case 'response.output_item.added':
        /* Suppress responses during recording/processing */
        if (window.neron._suppressResponse) break;
        if (msg.item && msg.item.type === 'function_call') {
          showTool(msg.item.name, 'running');
        }
        var t = msg.item && (msg.item.type || msg.item.content_type);
        if (t === 'message' || t === 'audio') {
          setState('speaking');
        }
        break;

      case 'response.function_call_arguments.done':
        if (window.neron._suppressResponse) break;
        showTool(msg.name, 'done');
        break;

      case 'response.output_audio.delta':
      case 'response.audio.delta':
        if (window.neron._suppressResponse) break;
        if (state !== 'speaking') setState('speaking');
        playChunk(msg.delta);
        break;

      case 'response.done':
        if (window.neron._suppressResponse) break;
        finishResponse();
        break;

      case 'error':
        console.error('[voice] Error:', msg.error);
        if (state === 'thinking' || state === 'speaking') {
          stopPlayback();
          setState('listening');
        }
        break;

      default:
        if (msg.type && !msg.type.includes('.delta'))
          console.log('[voice]', msg.type);
    }
  }

  /* ════════════════════════════════════════
     TOOL DISPLAY
     ════════════════════════════════════════ */
  var activeTools = {};

  function showTool(name, status) {
    if (!toolsEl || !name) return;
    var label = name.replace(/_/g, ' ');
    if (status === 'running') {
      var pill = document.createElement('span');
      pill.className = 'tool-pill';
      pill.textContent = label;
      pill.dataset.name = name;
      toolsEl.appendChild(pill);
      activeTools[name] = pill;
    } else if (status === 'done' && activeTools[name]) {
      activeTools[name].classList.add('tool-done');
    }
  }

  function clearTools() {
    if (!toolsEl) return;
    var pills = toolsEl.querySelectorAll('.tool-pill');
    for (var i = 0; i < pills.length; i++) pills[i].classList.add('tool-fade');
    setTimeout(function () {
      if (toolsEl) toolsEl.innerHTML = '';
      activeTools = {};
    }, 400);
  }

  /* ════════════════════════════════════════
     MICROPHONE (AudioWorklet → PCM16)
     ════════════════════════════════════════ */
  async function startMic() {
    if (micStream) return; /* already running */
    try {
      audioCtx = new AudioContext({ sampleRate: RATE });

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: RATE, channelCount: 1,
          echoCancellation: true, noiseSuppression: true, autoGainControl: true
        }
      });

      var code =
        'class P extends AudioWorkletProcessor {\n' +
        '  process(inputs) {\n' +
        '    var ch = inputs[0] && inputs[0][0];\n' +
        '    if (!ch) return true;\n' +
        '    var pcm = new Int16Array(ch.length), sum = 0;\n' +
        '    for (var i = 0; i < ch.length; i++) {\n' +
        '      var s = Math.max(-1, Math.min(1, ch[i]));\n' +
        '      pcm[i] = s < 0 ? s * 32768 : s * 32767;\n' +
        '      sum += s * s;\n' +
        '    }\n' +
        '    this.port.postMessage({ p: pcm.buffer, r: Math.sqrt(sum / ch.length) }, [pcm.buffer]);\n' +
        '    return true;\n' +
        '  }\n' +
        '}\n' +
        'registerProcessor("pcm16", P);';

      var blob = new Blob([code], { type: 'application/javascript' });
      var blobUrl = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);

      var src = audioCtx.createMediaStreamSource(micStream);
      var worklet = new AudioWorkletNode(audioCtx, 'pcm16');

      worklet.port.onmessage = function (e) {
        /* Soft-muted: drop the frame entirely, pin the visible mic level to 0
           so the inner sphere goes quiet. */
        if (isMuted) {
          if (window.kimiko) window.kimiko._micLevel = 0;
          return;
        }

        var rms = e.data.r;
        if (window.kimiko) window.kimiko._micLevel = Math.min(1, rms * 4);

        /* Don't send while AI speaks — echo prevention */
        if (isAiSpeaking) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
          var bytes = new Uint8Array(e.data.p);
          var bin = String.fromCharCode.apply(null, bytes);
          ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(bin) }));
        }
      };

      src.connect(worklet);
      var mute = audioCtx.createGain();
      mute.gain.value = 0;
      worklet.connect(mute);
      mute.connect(audioCtx.destination);

      setState('listening');
      console.log('[voice] Mic active');
    } catch (e) {
      console.error('[voice] Mic error:', e);
    }
  }

  /* ════════════════════════════════════════
     AUDIO PLAYBACK (gapless PCM16 queue)
     ════════════════════════════════════════ */
  function playChunk(b64) {
    if (!b64) return;
    if (!audioCtx) audioCtx = new AudioContext({ sampleRate: RATE });

    /* Lazy-create the analyser the first time we play AI audio. */
    if (!aiAnalyser) {
      aiAnalyser = audioCtx.createAnalyser();
      aiAnalyser.fftSize = 256;
      aiAnalyser.smoothingTimeConstant = 0.2;
      aiAnalyser.connect(audioCtx.destination);
      aiLevelBins = new Uint8Array(aiAnalyser.frequencyBinCount);
    }

    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var int16 = new Int16Array(bytes.buffer);

    var f32 = new Float32Array(int16.length);
    for (var i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768;

    /* _aiLevel is driven by the per-frame analyser loop below — do NOT set
       it from chunk RMS here. The old path froze the value after all chunks
       finished decoding but before they finished playing.                    */
    if (window.kimiko) window.kimiko._speaker = 'ai';
    isAiSpeaking = true;

    var buf = audioCtx.createBuffer(1, f32.length, RATE);
    buf.getChannelData(0).set(f32);

    var node = audioCtx.createBufferSource();
    node.buffer = buf;
    node.connect(aiAnalyser);

    var now = audioCtx.currentTime;
    if (nextPlayTime < now) nextPlayTime = now + 0.05;
    node.start(nextPlayTime);
    nextPlayTime += buf.duration;

    sources.push(node);
    node.onended = function () {
      sources = sources.filter(function (s) { return s !== node; });
      if (sources.length === 0) {
        isAiSpeaking = false;
        if (window.kimiko) {
          window.kimiko._aiLevel = 0;
          window.kimiko._speaker = 'idle';
        }
      }
    };
  }

  function stopPlayback() {
    sources.forEach(function (s) { try { s.stop(); } catch (e) {} });
    sources = [];
    nextPlayTime = 0;
    isAiSpeaking = false;
    if (window.kimiko) { window.kimiko._aiLevel = 0; window.kimiko._speaker = 'idle'; }
  }

  /* ════════════════════════════════════════
     RESPONSE LIFECYCLE
     ════════════════════════════════════════ */
  function finishResponse() {
    awaitPlaybackEnd(0);
  }

  function awaitPlaybackEnd(elapsed) {
    if (sources.length === 0 || elapsed > 15000) {
      if (elapsed > 15000) {
        console.warn('[voice] Playback timeout — forcing recovery');
        stopPlayback();
      }
      isAiSpeaking = false;
      if (window.kimiko) { window.kimiko._aiLevel = 0; window.kimiko._speaker = 'idle'; }
      if (state !== 'idle') setState('listening');
      setTimeout(clearTools, 1500);
    } else {
      setTimeout(function () { awaitPlaybackEnd(elapsed + 100); }, 100);
    }
  }

  /* ════════════════════════════════════════
     UI STATE
     ════════════════════════════════════════ */
  var stateMap = {
    idle:       ['Tap to connect',        '',   'Start Conversation', false],
    connecting: ['Connecting\u2026',      '',   'Connecting\u2026',    false],
    ready:      ['Connected',             'on', 'Ready',               false],
    listening:  ['Listening',             'on', 'Listening\u2026',     true],
    thinking:   ['Thinking\u2026',        '',   'Processing\u2026',    true],
    speaking:   ['Speaking',              'on', 'AI Speaking\u2026',   true],
    muted:      ['Muted \u00b7 tap to listen', '', 'Muted',            false]
  };

  function setState(s) {
    state = s;
    var cfg = stateMap[s] || stateMap.idle;
    if (statusPill) { statusPill.textContent = cfg[0]; statusPill.dataset.s = cfg[1]; }
    if (micLabel) micLabel.textContent = cfg[2];
    if (micBtn) micBtn.classList.toggle('mic-active', cfg[3]);
    if (s === 'thinking') clearTools();
  }

  /* ── Cleanup ── */
  function cleanup() {
    if (micStream) micStream.getTracks().forEach(function (t) { t.stop(); });
    micStream = null;
    stopPlayback();
    if (audioCtx) { try { audioCtx.close(); } catch (e) {} }
    audioCtx = null;
    /* Analyser is bound to the closed audioCtx — drop it so the next
       playChunk after a reconnect lazily builds a fresh one on the new ctx. */
    aiAnalyser = null;
    aiLevelBins = null;
  }

  /* ════════════════════════════════════════
     RECORDING MODE API
     ════════════════════════════════════════ */

  /* Send session.update to toggle VAD on/off */
  window.neron.setVAD = function(enabled) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      var msg = sessionMsg(enabled ? 'server_vad' : null);
      ws.send(JSON.stringify(msg));
      console.log('[voice] VAD ' + (enabled ? 'enabled' : 'disabled'));
    }
  };

  /* Commit audio buffer (triggers transcription in manual mode) */
  window.neron.commitAudio = function() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      /* Cancel any auto-response xAI might generate from the committed audio */
      ws.send(JSON.stringify({ type: 'response.cancel' }));
      console.log('[voice] Audio committed + response cancelled');
    }
  };

  window.neron.clearAudioBuffer = function() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
    }
  };

  window.neron.sendTextToGrok = async function(text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
      await new Promise(function(resolve) {
        var check = setInterval(function() {
          if (state === 'listening' || state === 'ready') {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: text }]
      }
    }));
    ws.send(JSON.stringify({ type: 'response.create' }));
  };

  window.neron.isConnected = function() { return ws && ws.readyState === WebSocket.OPEN; };
  window.neron.getState = function() { return state; };
  window.neron.stopAiPlayback = function() { stopPlayback(); };
  window.neron.connect = connect;

  /* ── Mute API ──
     muteVoice: stop sending mic audio to the server, pin _micLevel to 0,
                disable server VAD, wipe any buffered audio, cut off any
                currently-playing AI reply, put UI into 'muted' state.
     unmuteVoice: flip back to normal listening (re-enables VAD).
     toggleMute: the one recording.js and the nav switcher call. */
  window.neron.muteVoice = function() {
    if (state === 'muted') return;
    isMuted = true;
    if (isAiSpeaking) stopPlayback();
    if (window.neron.setVAD) window.neron.setVAD(false);
    if (window.neron.clearAudioBuffer) window.neron.clearAudioBuffer();
    if (window.kimiko) {
      window.kimiko._micLevel = 0;
      window.kimiko._aiLevel = 0;
      window.kimiko._speaker = 'idle';
    }
    setState('muted');
  };
  window.neron.unmuteVoice = function() {
    if (!isMuted && state !== 'muted') return;
    isMuted = false;
    if (window.neron.setVAD) window.neron.setVAD(true);
    setState('listening');
  };
  window.neron.toggleMute = function() {
    if (state === 'muted' || isMuted) window.neron.unmuteVoice();
    else window.neron.muteVoice();
  };
  window.neron.isMuted = function() { return isMuted; };

  /* ── Button (hidden, triggered programmatically) ── */
  if (micBtn) {
    micBtn.addEventListener('click', function () {
      if (state === 'idle') connect();
    });
  }

  /* ── Auto-connect on page load ── */
  connect();

  /* ── Live AI level loop ──
     Reads the AnalyserNode every rAF frame, averages the frequency bins,
     normalises to 0..1, and writes window.kimiko._aiLevel. When nothing
     is playing through the analyser the bins are ~0, so the level decays
     naturally — no manual decay needed. */
  (function readAiLevel() {
    requestAnimationFrame(readAiLevel);
    if (!aiAnalyser || !aiLevelBins || !window.kimiko) return;
    aiAnalyser.getByteFrequencyData(aiLevelBins);
    var s = 0;
    for (var i = 0; i < aiLevelBins.length; i++) s += aiLevelBins[i];
    window.kimiko._aiLevel = (s / aiLevelBins.length) / 255;
  })();

})();
