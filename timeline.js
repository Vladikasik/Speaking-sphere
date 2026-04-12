/* ═══ Timeline View + Nav Switcher (vanilla) ═══ */
/* Hardcoded history of voice notes rendered as a left-spine timeline.
   Each entry is a dark card with trimmed note text + mini-indicator dots.
   Tapping expands the card to reveal the full note + full extraction cards
   (reuses window.neron.cards.build() from cards.js).                     */
(function () {
  'use strict';

  /* ══════════════════════════════════════════
     HARDCODED DATA — 5 days, 1-2 entries each
     Dates descend from today (Apr 12, 2026) back
     ══════════════════════════════════════════ */
  var TIMELINE_DATA = [
    {
      date: 'April 12, 2026',
      dateShort: 'Apr 12',
      entries: [
        {
          time: '09:15',
          note: 'Woke up earlier than usual, had oatmeal with coffee. Feeling pretty calm, went for a short walk around the block before starting work. Noticed the cherry tree on the corner has started blooming.',
          extraction: {
            mood: { valence: 0.5, energy: 0.2, emotions: ['calm', 'hopeful'], trigger: 'morning walk', confidence: 0.82 },
            food: { meal: 'breakfast', items: ['oatmeal', 'coffee'], observation: 'light, energizing', confidence: 0.78 },
            body: { physical: 'rested, a bit stiff in the shoulders', sleep: '7h, good quality', confidence: 0.7 }
          }
        },
        {
          time: '14:40',
          note: 'Long meeting with the design team about the new onboarding flow. Got some good feedback on the sphere interaction. Need to follow up with Sarah about the copy tweaks by tomorrow, and revise the interaction spec this week.',
          extraction: {
            goals_tasks: [
              { content: 'Follow up with Sarah on copy tweaks', type: 'task', status: 'todo', urgency: 'today' },
              { content: 'Revise sphere interaction spec', type: 'task', status: 'in_progress', urgency: 'this_week' }
            ],
            activities: [
              { activity_type: 'meeting', description: 'Design review — onboarding flow', duration_estimate: '1h 20m', productivity_signal: 0.75 }
            ],
            people: [
              { name: 'Sarah', context: 'design team, copy owner' }
            ]
          }
        }
      ]
    },
    {
      date: 'April 11, 2026',
      dateShort: 'Apr 11',
      entries: [
        {
          time: '08:50',
          note: 'Pretty rough morning — didn\u2019t sleep well, head is foggy. Skipped breakfast, only coffee. Trying to push through but I know I\u2019ll crash later.',
          extraction: {
            mood: { valence: -0.3, energy: -0.5, emotions: ['tired', 'foggy'], trigger: 'poor sleep', confidence: 0.74 },
            body: { physical: 'foggy, low energy', sleep: '~5h, restless', substance: 'coffee only', confidence: 0.82 },
            food: { meal: 'breakfast', items: ['coffee'], observation: 'skipping food probably a mistake', confidence: 0.9 }
          }
        },
        {
          time: '21:10',
          note: 'Actually turned the day around. Took a nap at 3, then had a really productive session in the evening finishing the timeline design. Reflecting on how much sleep genuinely drives everything else.',
          extraction: {
            reflections: [
              { content: 'Sleep is the single biggest upstream variable in how my day goes', domain: 'health', actionability: 'high_actionability', source: 'personal experience' }
            ],
            activities: [
              { activity_type: 'rest', description: 'Afternoon nap', duration_estimate: '40m', productivity_signal: 0.9 },
              { activity_type: 'work', description: 'Timeline design session', duration_estimate: '2h', productivity_signal: 0.85 }
            ],
            mood: { valence: 0.6, energy: 0.4, emotions: ['satisfied', 'focused'], trigger: 'nap + deep work', confidence: 0.8 }
          }
        }
      ]
    },
    {
      date: 'April 10, 2026',
      dateShort: 'Apr 10',
      entries: [
        {
          time: '12:30',
          note: 'Lunch with Marcus at the new ramen place on Castro. Talked about the startup idea he\u2019s been kicking around. He seems serious this time. Asked me to help with the pitch deck next week.',
          extraction: {
            food: { meal: 'lunch', items: ['ramen', 'gyoza'], observation: 'rich, filling', confidence: 0.85 },
            people: [
              { name: 'Marcus', context: 'friend, considering launching a startup' }
            ],
            goals_tasks: [
              { content: 'Help Marcus with pitch deck', type: 'task', status: 'todo', urgency: 'this_week' }
            ],
            activities: [
              { activity_type: 'socializing', description: 'Lunch with Marcus', duration_estimate: '1h 15m', location: 'Castro', productivity_signal: 0.4 }
            ]
          }
        }
      ]
    },
    {
      date: 'April 8, 2026',
      dateShort: 'Apr 8',
      entries: [
        {
          time: '07:30',
          note: 'Morning run, 5k, felt great. First time I\u2019ve hit that pace in months. The weather finally turned.',
          extraction: {
            activities: [
              { activity_type: 'exercise', description: 'Morning 5k run', duration_estimate: '28m', productivity_signal: 0.9 }
            ],
            body: { physical: 'strong, good breathing', confidence: 0.88 },
            mood: { valence: 0.7, energy: 0.8, emotions: ['energized', 'proud'], confidence: 0.85 }
          }
        },
        {
          time: '19:45',
          note: 'Dinner at home, made pasta with some vegetables from the farmers market. Watched half an episode and then just wanted to read. Finished the chapter on habit stacking.',
          extraction: {
            food: { meal: 'dinner', items: ['pasta', 'vegetables'], observation: 'home-cooked, balanced', confidence: 0.9 },
            reflections: [
              { content: 'Habit stacking works best when the anchor is already automatic', domain: 'productivity', actionability: 'medium_actionability', source: 'book — Atomic Habits' }
            ]
          }
        }
      ]
    },
    {
      date: 'April 6, 2026',
      dateShort: 'Apr 6',
      entries: [
        {
          time: '11:00',
          note: 'Stuck on the voice agent integration all morning. Grok realtime is finicky about the audio buffer timing. Need to experiment with commit intervals and maybe ask in the xAI dev forum.',
          extraction: {
            goals_tasks: [
              { content: 'Experiment with Grok audio buffer commit intervals', type: 'task', status: 'in_progress', urgency: 'today' },
              { content: 'Post question in xAI dev forum', type: 'task', status: 'todo', urgency: 'this_week' }
            ],
            mood: { valence: -0.1, energy: 0.1, emotions: ['frustrated', 'focused'], trigger: 'integration bug', confidence: 0.7 }
          }
        }
      ]
    }
  ];

  /* ══════════════════════════════════════════
     INDICATOR COLORS — mirror cards.js colors
     ══════════════════════════════════════════ */
  var INDICATOR_COLORS = {
    mood:        '#22c55e',
    body:        '#60a5fa',
    food:        '#f59e0b',
    activities:  '#9ca3af',
    goals_tasks: '#3b82f6',
    reflections: '#a855f7',
    people:      '#06b6d4'
  };
  var INDICATOR_LABELS = {
    mood: 'mood',
    body: 'body',
    food: 'food',
    activities: 'activity',
    goals_tasks: 'tasks',
    reflections: 'reflect',
    people: 'people'
  };
  /* Order shown in the indicator row */
  var INDICATOR_ORDER = ['mood', 'body', 'food', 'activities', 'goals_tasks', 'reflections', 'people'];

  /* ── Helpers ── */
  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function trim(s, max) {
    if (!s || s.length <= max) return s;
    /* Cut at a word boundary if possible */
    var cut = s.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    if (sp > max * 0.6) cut = cut.slice(0, sp);
    return cut + '\u2026';
  }

  function typesInExtraction(ext) {
    if (!ext) return [];
    var out = [];
    INDICATOR_ORDER.forEach(function (k) {
      var v = ext[k];
      if (!v) return;
      if (Array.isArray(v) && v.length === 0) return;
      /* body/food/mood have object values — show if any real field */
      if (k === 'body' && !(v.physical || v.sleep || v.substance)) return;
      if (k === 'food' && (!v.items || v.items.length === 0)) return;
      out.push(k);
    });
    return out;
  }

  /* ══════════════════════════════════════════
     ENTRY CARD
     ══════════════════════════════════════════ */
  var TRIM_LENGTH = 140;

  function buildEntryCard(entry) {
    var wrap = el('div', 'tl-entry');

    var time = el('div', 'tl-time', entry.time);
    wrap.appendChild(time);

    var card = el('div', 'tl-card');

    var note = el('p', 'tl-card-note', trim(entry.note, TRIM_LENGTH));
    card.appendChild(note);

    var indicators = el('div', 'tl-card-indicators');
    var types = typesInExtraction(entry.extraction);
    if (types.length === 0) {
      indicators.appendChild(el('span', 'tl-hint', 'no extractions'));
    } else {
      types.forEach(function (t) {
        var dot = el('span', 'tl-dot');
        dot.style.background = INDICATOR_COLORS[t];
        dot.style.color = INDICATOR_COLORS[t];
        indicators.appendChild(dot);
      });
      indicators.appendChild(el('span', 'tl-hint', 'tap to expand'));
    }
    card.appendChild(indicators);

    var expand = el('div', 'tl-expand');
    var expandInner = el('div', 'tl-expand-inner');
    expand.appendChild(expandInner);
    card.appendChild(expand);

    var built = false;
    card.addEventListener('click', function () {
      var isExpanded = card.classList.toggle('expanded');
      if (isExpanded) {
        if (!built) {
          /* Reuse the cards.js card builders (mood matrix, food, body, etc.) */
          if (window.neron && window.neron.cards && window.neron.cards.build) {
            var builtCards = window.neron.cards.build(entry.extraction);
            builtCards.forEach(function (c) { expandInner.appendChild(c.el); });
          }
          built = true;
        }
        note.textContent = entry.note;
        indicators.querySelector('.tl-hint').textContent = 'tap to collapse';
        /* Measure after DOM is appended */
        requestAnimationFrame(function () {
          expand.style.maxHeight = expand.scrollHeight + 'px';
        });
      } else {
        note.textContent = trim(entry.note, TRIM_LENGTH);
        if (indicators.querySelector('.tl-hint')) {
          indicators.querySelector('.tl-hint').textContent = 'tap to expand';
        }
        expand.style.maxHeight = '0px';
      }
    });

    wrap.appendChild(card);
    return wrap;
  }

  /* ══════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════ */
  function renderTimeline() {
    var list = document.getElementById('timelineList');
    if (!list) return;
    /* Idempotent */
    list.innerHTML = '';
    TIMELINE_DATA.forEach(function (day) {
      var dayEl = el('div', 'tl-day');
      var pill = el('div', 'tl-date-pill', day.dateShort);
      dayEl.appendChild(pill);
      day.entries.forEach(function (entry) {
        dayEl.appendChild(buildEntryCard(entry));
      });
      list.appendChild(dayEl);
    });
  }

  /* ══════════════════════════════════════════
     NAV SWITCHER
     ══════════════════════════════════════════ */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    /* Default view */
    if (!document.body.dataset.view) document.body.dataset.view = 'sphere';

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('.nav-seg');
      if (!btn) return;
      var v = btn.dataset.view;
      if (!v) return;
      document.body.dataset.view = v;
      nav.querySelectorAll('.nav-seg').forEach(function (s) {
        s.classList.toggle('active', s === btn);
      });
      /* Leaving the sphere view → mute the voice so the agent isn't left
         "always listening" while the user is reading the timeline or the
         graph. Stays muted on return — user taps the sphere to resume. */
      if (v !== 'sphere' && window.neron && window.neron.muteVoice) {
        window.neron.muteVoice();
      }
    });
  }

  /* ══════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════ */
  function boot() {
    initNav();
    renderTimeline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ── Public API (for debugging) ── */
  window.neron = window.neron || {};
  window.neron.timeline = {
    data: TIMELINE_DATA,
    render: renderTimeline
  };

})();
