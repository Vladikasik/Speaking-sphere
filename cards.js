/* ═══ Extraction Cards — Vanilla JS + Swipe Engine ═══ */
/* Ported from extraction-cards.jsx (Variant A, 280px) */
(function () {
  'use strict';

  var WIDTH = 280;

  /* ── Lookup maps ── */
  var activityEmoji = {
    work: '\u{1F4BB}', study: '\u{1F4DA}', meeting: '\u{1F91D}', travel: '\u2708\uFE0F',
    admin: '\u{1F4CB}', socializing: '\u{1F37B}', exercise: '\u{1F3C3}', rest: '\u{1F9D8}',
    health: '\u{1F48A}', creative: '\u{1F3A8}', chores: '\u{1F9F9}'
  };
  var mealLabel = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
  var approxCalories = { soup: 250, bread: 130, apple: 52, oatmeal: 180, banana: 105, coffee: 5 };
  var urgencyColor = { today: '#ef4444', this_week: '#f59e0b', this_month: '#3b82f6', someday: '#6b7280' };
  var typeIcon = { task: '\u25CB', goal: '\u25CE', habit_intention: '\u21BB', question: '?', event: '\u25C7', decision: '\u2B21' };
  var statusIcon = { todo: '\u25CB', in_progress: '\u25D0', done: '\u25CF' };

  /* ── Helpers ── */
  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }

  function createCardShell(label, opts) {
    opts = opts || {};
    var card = el('div',
      'width:' + WIDTH + 'px;border-radius:24px;background:linear-gradient(to bottom,#000000,#111111);' +
      'border:1px solid ' + (opts.glow ? opts.glowColor : '#2a2a2a') + ';' +
      'position:relative;display:flex;flex-direction:column;overflow:hidden;' +
      'font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      (opts.glow ? 'box-shadow:0 0 60px ' + opts.glowColor + ',inset 0 0 40px ' + opts.glowColor + ';' : 'box-shadow:0 0 10px rgba(0,0,0,0.4);')
    );
    if (label) {
      var lw = el('div', 'padding:20px 20px 0;');
      var chip = el('span', 'display:inline-block;padding:4px 12px;border-radius:999px;' +
        'background:linear-gradient(to bottom,#151515,#1b1b1b);border:0.5px solid #252525;' +
        'color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.05em;', label);
      lw.appendChild(chip);
      card.appendChild(lw);
    }
    var content = el('div', 'display:flex;flex-direction:column;flex:1;padding:12px 20px 20px;');
    card.appendChild(content);
    card._content = content;
    return card;
  }

  function createConfidenceBar(value, color) {
    var wrap = el('div', 'margin-top:auto;padding-top:12px;display:flex;align-items:center;gap:8px;');
    var track = el('div', 'flex:1;height:3px;border-radius:3px;overflow:hidden;background:#1a1a1a;');
    var fill = el('div', 'height:100%;border-radius:3px;width:' + (value * 100) + '%;background:' + color + ';opacity:0.6;');
    track.appendChild(fill);
    wrap.appendChild(track);
    var lbl = el('span', 'font-size:9px;font-family:ui-monospace,SFMono-Regular,monospace;color:rgba(255,255,255,0.2);', Math.round(value * 100) + '%');
    wrap.appendChild(lbl);
    return wrap;
  }

  /* ═══ MOOD CARD ═══ */
  function createMoodCard(data) {
    var v = data.valence, e_ = data.energy;
    var card = createCardShell('mood');
    var c = card._content;
    var body = el('div', 'display:flex;flex-direction:column;gap:12px;flex:1;');

    var dotColor = v >= 0 && e_ >= 0 ? '#22c55e' : v < 0 && e_ >= 0 ? '#ef4444' : v >= 0 && e_ < 0 ? '#60a5fa' : '#a855f7';
    var quadrant = v >= 0 && e_ >= 0 ? 'Activated Pleasant' : v < 0 && e_ >= 0 ? 'Activated Unpleasant' : v >= 0 && e_ < 0 ? 'Calm Pleasant' : 'Calm Unpleasant';
    var x = ((v + 1) / 2) * 100;
    var y = ((1 - (e_ + 1) / 2)) * 100;

    /* Matrix */
    var matrix = el('div', 'position:relative;width:100%;padding-bottom:100%;overflow:hidden;background:#0a0a0a;border-radius:16px;');
    /* Cross lines */
    matrix.appendChild(el('div', 'position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.06);'));
    matrix.appendChild(el('div', 'position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(255,255,255,0.06);'));
    /* Corner labels */
    var corners = [['top:6px;left:8px', 'tense'], ['top:6px;right:8px', 'energized'], ['bottom:6px;left:8px', 'depleted'], ['bottom:6px;right:8px', 'serene']];
    corners.forEach(function (cn) {
      matrix.appendChild(el('span', 'position:absolute;' + cn[0] + ';font-size:7px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.12);', cn[1]));
    });
    /* Dot */
    var dot = el('div', 'position:absolute;width:14px;height:14px;border-radius:50%;left:' + x + '%;top:' + y + '%;transform:translate(-50%,-50%);background:' + dotColor + ';box-shadow:0 0 16px ' + dotColor + ',0 0 32px ' + dotColor + '66;');
    matrix.appendChild(dot);
    /* Pulse ring */
    var pulse = el('div', 'position:absolute;width:28px;height:28px;border-radius:50%;left:' + x + '%;top:' + y + '%;transform:translate(-50%,-50%);background:' + dotColor + '20;animation:moodPing 2s cubic-bezier(0,0,0.2,1) infinite;');
    matrix.appendChild(pulse);
    body.appendChild(matrix);

    /* Quadrant label */
    body.appendChild(el('div', 'font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:' + dotColor + ';', quadrant));

    /* Emotion chips */
    if (data.emotions && data.emotions.length > 0) {
      var chips = el('div', 'display:flex;flex-wrap:wrap;gap:4px;');
      data.emotions.forEach(function (em) {
        chips.appendChild(el('span', 'padding:2px 8px;border-radius:999px;font-size:11px;background:#1a1a1a;color:rgba(255,255,255,0.65);border:1px solid #252525;', em));
      });
      body.appendChild(chips);
    }

    /* Trigger */
    if (data.trigger) {
      body.appendChild(el('p', 'font-size:12px;line-height:1.4;color:rgba(255,255,255,0.4);', data.trigger));
    }

    body.appendChild(createConfidenceBar(data.confidence, dotColor));
    c.appendChild(body);
    return card;
  }

  /* ═══ FOOD CARD ═══ */
  function createFoodCard(data) {
    var card = createCardShell('food');
    var c = card._content;
    var body = el('div', 'display:flex;flex-direction:column;gap:12px;flex:1;');

    var totalCal = (data.items || []).reduce(function (s, it) { return s + (approxCalories[it.toLowerCase()] || 120); }, 0);

    /* Header */
    var hdr = el('div', 'display:flex;align-items:center;justify-content:space-between;');
    hdr.appendChild(el('span', 'font-size:17px;font-weight:500;color:#fff;', mealLabel[data.meal] || data.meal || 'Meal'));
    var cal = el('span', 'font-size:20px;font-weight:300;font-family:ui-monospace,SFMono-Regular,monospace;color:#f59e0b;');
    cal.textContent = '~' + totalCal;
    var calUnit = el('span', 'font-size:10px;margin-left:2px;color:rgba(255,255,255,0.25);', 'kcal');
    cal.appendChild(calUnit);
    hdr.appendChild(cal);
    body.appendChild(hdr);

    /* Items */
    var items = el('div', 'display:flex;flex-direction:column;gap:6px;');
    (data.items || []).forEach(function (item) {
      var itemCal = approxCalories[item.toLowerCase()] || 120;
      var pct = totalCal > 0 ? (itemCal / totalCal) * 100 : 0;
      var row = el('div', 'display:flex;align-items:center;gap:12px;');
      row.appendChild(el('span', 'font-size:13px;flex:1;text-transform:capitalize;color:rgba(255,255,255,0.65);', item));
      var bar = el('div', 'width:56px;height:5px;border-radius:3px;overflow:hidden;background:#1a1a1a;');
      bar.appendChild(el('div', 'height:100%;border-radius:3px;width:' + pct + '%;background:#f59e0b;opacity:' + (0.4 + pct / 200) + ';'));
      row.appendChild(bar);
      row.appendChild(el('span', 'font-size:11px;font-family:ui-monospace,SFMono-Regular,monospace;width:32px;text-align:right;color:rgba(255,255,255,0.3);', '' + itemCal));
      items.appendChild(row);
    });
    body.appendChild(items);

    /* Observation */
    if (data.observation) {
      var obs = el('div', 'padding:8px 12px;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:14px;');
      obs.appendChild(el('p', 'font-size:11px;line-height:1.5;color:rgba(255,255,255,0.4);', data.observation));
      body.appendChild(obs);
    }

    body.appendChild(createConfidenceBar(data.confidence, 'rgba(245,158,11,0.4)'));
    c.appendChild(body);
    return card;
  }

  /* ═══ BODY CARD ═══ */
  function createBodyCard(data) {
    var card = createCardShell('body');
    var c = card._content;
    var body = el('div', 'display:flex;flex-direction:column;gap:12px;flex:1;');

    var rows = [
      { icon: '\u26A1', label: 'physical', value: data.physical, color: '#60a5fa' },
      { icon: '\u{1F319}', label: 'sleep', value: data.sleep, color: '#a78bfa' },
      { icon: '\u{1F48A}', label: 'substance', value: data.substance, color: '#f87171' }
    ].filter(function (r) { return r.value; });

    var list = el('div', 'display:flex;flex-direction:column;gap:8px;');
    rows.forEach(function (r) {
      var row = el('div', 'display:flex;align-items:start;gap:12px;padding:8px 12px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:14px;');
      row.appendChild(el('span', 'font-size:16px;flex-shrink:0;margin-top:2px;', r.icon));
      var col = el('div', 'display:flex;flex-direction:column;gap:2px;');
      col.appendChild(el('span', 'font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:' + r.color + '80;', r.label));
      col.appendChild(el('span', 'font-size:13px;line-height:1.4;color:rgba(255,255,255,0.6);', r.value));
      row.appendChild(col);
      list.appendChild(row);
    });
    body.appendChild(list);
    body.appendChild(createConfidenceBar(data.confidence, 'rgba(96,165,250,0.4)'));
    c.appendChild(body);
    return card;
  }

  /* ═══ ACTIVITY CARD ═══ */
  function createActivityCard(activities) {
    var card = createCardShell('activities');
    var c = card._content;
    var body = el('div', 'display:flex;flex-direction:column;gap:8px;flex:1;');

    activities.forEach(function (act) {
      var row = el('div', 'display:flex;align-items:center;gap:12px;padding:8px 12px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:14px;');
      row.appendChild(el('span', 'font-size:18px;flex-shrink:0;', activityEmoji[act.activity_type] || '\u{1F4CC}'));
      var col = el('div', 'display:flex;flex-direction:column;flex:1;min-width:0;');
      var desc = el('span', 'font-size:13px;color:rgba(255,255,255,0.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', act.description);
      col.appendChild(desc);
      var meta = el('div', 'display:flex;align-items:center;gap:8px;margin-top:2px;');
      meta.appendChild(el('span', 'font-size:10px;color:rgba(255,255,255,0.25);', act.duration_estimate));
      if (act.location) meta.appendChild(el('span', 'font-size:10px;color:rgba(255,255,255,0.2);', '\u00B7 ' + act.location));
      col.appendChild(meta);
      row.appendChild(col);
      if (act.productivity_signal != null) {
        var circle = el('div', 'width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
          'font-size:9px;font-family:ui-monospace,SFMono-Regular,monospace;background:#1a1a1a;color:rgba(255,255,255,0.4);flex-shrink:0;',
          '' + Math.round(act.productivity_signal * 100));
        row.appendChild(circle);
      }
      body.appendChild(row);
    });

    c.appendChild(body);
    return card;
  }

  /* ═══ TODO CARD ═══ */
  function createTodoCard(tasks) {
    var card = createCardShell('tasks');
    var c = card._content;
    var body = el('div', 'display:flex;flex-direction:column;gap:8px;flex:1;');

    /* Counter */
    var doneCount = tasks.filter(function (t) { return t.status === 'done'; }).length;
    var counter = el('div', 'display:flex;align-items:center;justify-content:flex-end;margin-bottom:4px;');
    counter.appendChild(el('span', 'font-size:11px;font-family:ui-monospace,SFMono-Regular,monospace;color:rgba(255,255,255,0.2);', doneCount + '/' + tasks.length + ' done'));
    body.appendChild(counter);

    tasks.forEach(function (task) {
      var isDone = task.status === 'done';
      var isProgress = task.status === 'in_progress';
      var row = el('div', 'display:flex;align-items:start;gap:12px;padding:8px 12px;' +
        'background:' + (isProgress ? 'rgba(59,130,246,0.05)' : '#0a0a0a') + ';' +
        'border:1px solid ' + (isProgress ? 'rgba(59,130,246,0.15)' : '#1a1a1a') + ';' +
        'border-radius:14px;opacity:' + (isDone ? '0.45' : '1') + ';');

      /* Status icon */
      var iconColor = isDone ? '#22c55e' : isProgress ? '#3b82f6' : 'rgba(255,255,255,0.2)';
      row.appendChild(el('span', 'font-size:14px;flex-shrink:0;margin-top:2px;font-family:ui-monospace,SFMono-Regular,monospace;color:' + iconColor + ';', statusIcon[task.status] || '\u25CB'));

      var col = el('div', 'display:flex;flex-direction:column;flex:1;min-width:0;');
      col.appendChild(el('span', 'font-size:13px;line-height:1.4;color:' + (isDone ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)') + ';text-decoration:' + (isDone ? 'line-through' : 'none') + ';', task.content));

      var meta = el('div', 'display:flex;align-items:center;gap:8px;margin-top:4px;');
      var typeBadge = el('span', 'font-size:9px;text-transform:uppercase;letter-spacing:0.05em;padding:2px 6px;background:#151515;color:rgba(255,255,255,0.25);border-radius:6px;',
        (typeIcon[task.type] || '') + ' ' + (task.type || '').replace('_', ' '));
      meta.appendChild(typeBadge);
      if (task.urgency) {
        meta.appendChild(el('span', 'width:6px;height:6px;border-radius:50%;flex-shrink:0;background:' + (urgencyColor[task.urgency] || '#6b7280') + ';'));
        meta.appendChild(el('span', 'font-size:9px;color:rgba(255,255,255,0.2);', task.urgency.replace('_', ' ')));
      }
      col.appendChild(meta);
      row.appendChild(col);
      body.appendChild(row);
    });

    c.appendChild(body);
    return card;
  }

  /* ═══ REFLECTION CARD ═══ */
  function createReflectionCard(reflections) {
    var card = createCardShell('reflections', { glow: true, glowColor: 'rgba(168,85,247,0.25)' });
    var c = card._content;
    var body = el('div', 'display:flex;flex-direction:column;gap:16px;flex:1;position:relative;');

    /* Ambient orbs */
    var orb1 = el('div', 'position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;' +
      'background:radial-gradient(circle,rgba(168,85,247,0.12) 0%,transparent 70%);filter:blur(20px);pointer-events:none;');
    var orb2 = el('div', 'position:absolute;bottom:-20px;left:-30px;width:90px;height:90px;border-radius:50%;' +
      'background:radial-gradient(circle,rgba(236,72,153,0.08) 0%,transparent 70%);filter:blur(16px);pointer-events:none;');
    body.appendChild(orb1);
    body.appendChild(orb2);

    var items = el('div', 'display:flex;flex-direction:column;gap:20px;position:relative;z-index:1;');
    reflections.forEach(function (ref) {
      var item = el('div', 'display:flex;flex-direction:column;gap:8px;');
      item.appendChild(el('p', 'font-size:15px;line-height:1.5;font-weight:300;font-style:italic;color:rgba(255,255,255,0.85);text-shadow:0 0 30px rgba(168,85,247,0.3);',
        '\u201C' + ref.content + '\u201D'));

      var tags = el('div', 'display:flex;align-items:center;gap:8px;');
      if (ref.domain) {
        tags.appendChild(el('span', 'padding:2px 8px;border-radius:999px;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;' +
          'background:rgba(168,85,247,0.08);color:rgba(168,85,247,0.6);border:1px solid rgba(168,85,247,0.15);', ref.domain));
      }
      if (ref.actionability) {
        tags.appendChild(el('span', 'padding:2px 8px;border-radius:999px;font-size:9px;' +
          'background:rgba(168,85,247,0.05);color:rgba(168,85,247,0.4);border:1px solid rgba(168,85,247,0.1);', ref.actionability.replace('_', ' ')));
      }
      item.appendChild(tags);

      if (ref.source) {
        item.appendChild(el('span', 'font-size:10px;font-style:italic;color:rgba(255,255,255,0.2);', '\u2014 ' + ref.source));
      }
      items.appendChild(item);
    });
    body.appendChild(items);
    c.appendChild(body);
    return card;
  }

  /* ═══ PEOPLE CARD (simple, not in handoff but useful) ═══ */
  function createPeopleCard(people) {
    var card = createCardShell('people');
    var c = card._content;
    var body = el('div', 'display:flex;flex-direction:column;gap:8px;flex:1;');
    people.forEach(function (p) {
      var row = el('div', 'display:flex;align-items:center;gap:12px;padding:8px 12px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:14px;');
      row.appendChild(el('span', 'font-size:16px;flex-shrink:0;', '\u{1F464}'));
      var col = el('div', 'display:flex;flex-direction:column;gap:2px;');
      col.appendChild(el('span', 'font-size:13px;font-weight:500;color:rgba(255,255,255,0.8);', p.name));
      if (p.context) col.appendChild(el('span', 'font-size:11px;color:rgba(255,255,255,0.4);', p.context));
      row.appendChild(col);
      body.appendChild(row);
    });
    c.appendChild(body);
    return card;
  }

  /* ═══ BUILD CARD LIST FROM EXTRACTION ═══ */
  function buildCards(extraction) {
    var cards = [];
    if (extraction.mood) {
      cards.push({ type: 'mood', el: createMoodCard(extraction.mood) });
    }
    if (extraction.body && (extraction.body.physical || extraction.body.sleep || extraction.body.substance)) {
      cards.push({ type: 'body', el: createBodyCard(extraction.body) });
    }
    if (extraction.food && extraction.food.items && extraction.food.items.length > 0) {
      cards.push({ type: 'food', el: createFoodCard(extraction.food) });
    }
    if (extraction.activities && extraction.activities.length > 0) {
      cards.push({ type: 'activities', el: createActivityCard(extraction.activities) });
    }
    if (extraction.goals_tasks && extraction.goals_tasks.length > 0) {
      cards.push({ type: 'tasks', el: createTodoCard(extraction.goals_tasks) });
    }
    if (extraction.reflections && extraction.reflections.length > 0) {
      cards.push({ type: 'reflections', el: createReflectionCard(extraction.reflections) });
    }
    if (extraction.people && extraction.people.length > 0) {
      cards.push({ type: 'people', el: createPeopleCard(extraction.people) });
    }
    return cards;
  }

  /* ═══ SWIPE ENGINE ═══ */
  /* Cards are absolutely positioned inside #cardOverlay (fullscreen fixed div).
     Each card is centered with left:50%;top:50%;transform:translate(-50%,-50%).
     Dragging offsets the translateX. Swipe animates off-screen. Simple. */

  function showCards(extraction, onComplete) {
    var cards = buildCards(extraction);
    if (cards.length === 0) { onComplete([]); return; }

    var overlay = document.getElementById('cardOverlay');
    var counter = document.getElementById('swipeCounter');

    /* Clear and show overlay */
    while (overlay.firstChild && overlay.firstChild !== counter) overlay.removeChild(overlay.firstChild);
    overlay.classList.add('active');

    var idx = 0;
    var results = [];
    var dragging = false;
    var startX = 0, startTime = 0, dragCard = null;

    /* Place all cards into overlay */
    for (var i = cards.length - 1; i >= 0; i--) {
      var c = cards[i].el;
      c.style.cssText += ';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'touch-action:none;user-select:none;-webkit-user-select:none;will-change:transform;' +
        'transition:transform 0.15s,opacity 0.15s;';
      overlay.appendChild(c);
    }

    function layout() {
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i].el;
        if (i < idx) { c.style.display = 'none'; continue; }
        var off = i - idx;
        if (off > 2) { c.style.display = 'none'; continue; }
        c.style.display = '';
        c.style.zIndex = '' + (cards.length - i);
        c.style.pointerEvents = off === 0 ? 'auto' : 'none';
        c.style.opacity = '' + (1 - off * 0.25);
        c.style.transform = off === 0
          ? 'translate(-50%,-50%)'
          : 'translate(-50%,calc(-50% + ' + (off * 10) + 'px)) scale(' + (1 - off * 0.04) + ')';
      }
      counter.textContent = (idx + 1) + ' / ' + cards.length;
    }

    layout();

    function swipe(dir) {
      var c = cards[idx].el;
      var tx = dir === 'right' ? 'calc(-50% + 400px)' : 'calc(-50% - 400px)';
      var rot = dir === 'right' ? '15deg' : '-15deg';
      c.style.transition = 'transform 0.35s ease-in, opacity 0.35s';
      c.style.transform = 'translate(' + tx + ',-50%) rotate(' + rot + ')';
      c.style.opacity = '0';

      results.push({ type: cards[idx].type, direction: dir });
      idx++;

      setTimeout(function () {
        c.style.display = 'none';
        if (idx >= cards.length) {
          cleanup();
          overlay.classList.remove('active');
          onComplete(results);
        } else {
          layout();
        }
      }, 350);
    }

    /* Gesture: pointer events */
    function onDown(e) {
      if (idx >= cards.length) return;
      var top = cards[idx].el;
      if (!top.contains(e.target) && e.target !== top) return;
      dragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startTime = Date.now();
      dragCard = top;
      dragCard.style.transition = 'none';
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging || !dragCard) return;
      var cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      var dx = cx - startX;
      dragCard.style.transform = 'translate(calc(-50% + ' + dx + 'px),-50%) rotate(' + (dx * 0.06) + 'deg)';
      dragCard.style.opacity = '' + (1 - Math.min(Math.abs(dx) / 120, 1) * 0.15);
    }
    function onUp(e) {
      if (!dragging || !dragCard) return;
      dragging = false;
      var cx = e.clientX || (e.changedTouches && e.changedTouches[0].clientX) || 0;
      var dx = cx - startX;
      var vel = Math.abs(dx) / ((Date.now() - startTime) || 1);

      dragCard.style.transition = 'transform 0.15s,opacity 0.15s';
      if (Math.abs(dx) > 80 || (vel > 0.5 && Math.abs(dx) > 30)) {
        swipe(dx > 0 ? 'right' : 'left');
      } else {
        dragCard.style.transform = 'translate(-50%,-50%)';
        dragCard.style.opacity = '1';
      }
      dragCard = null;
    }

    /* Bind both touch + pointer for iOS compat */
    overlay.addEventListener('pointerdown', onDown);
    overlay.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchend', onUp);

    function cleanup() {
      overlay.removeEventListener('pointerdown', onDown);
      overlay.removeEventListener('touchstart', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('touchend', onUp);
    }
  }

  /* ── Inject keyframe for mood pulse animation ── */
  var style = document.createElement('style');
  style.textContent = '@keyframes moodPing{0%{transform:translate(-50%,-50%) scale(1);opacity:0.6}75%,100%{transform:translate(-50%,-50%) scale(2.5);opacity:0}}';
  document.head.appendChild(style);

  /* ── Public API ── */
  window.neron = window.neron || {};
  window.neron.cards = { show: showCards, build: buildCards };

})();
