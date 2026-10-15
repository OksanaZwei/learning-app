/* Recall – UI. All data stays on this device (localStorage). */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'recall.v1';
  const esc = C.esc;
  const md = C.renderMd;
  const $ = (s) => document.querySelector(s);

  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
  };

  // name, accent, text accent, soft fill, page background, line, hero from, hero to
  const ACCENTS = {
    zucker: ['Rosa & Gelb', '#f6a9c6', '#b03d70', '#fde4ee', '#fff8ee', '#f3e4d0', '#ffe0ec', '#fff0b3'],
    flieder: ['Flieder', '#bba6f0', '#5b3fb0', '#ece5fb', '#f8f4fd', '#e6ddf5', null, null],
    mint: ['Mint', '#9fe0cb', '#1f7a64', '#ddf5ec', '#f1faf6', '#d3ebe1', null, null],
    rosa: ['Rosa', '#f4b0cb', '#b03d70', '#fbe3ee', '#fef4f8', '#f3dce6', null, null],
    himmel: ['Himmel', '#a8d0f5', '#2b6cb0', '#e0eefc', '#f2f8fe', '#d8e6f5', null, null],
    pfirsich: ['Pfirsich', '#f8c49a', '#b0612a', '#fdebdb', '#fff6ee', '#f5e3d2', null, null]
  };
  function applyAccent() {
    const a = ACCENTS[S.settings.accent] || ACCENTS.zucker;
    const r = document.documentElement.style;
    r.setProperty('--accent', a[1]); r.setProperty('--accent-ink', a[2]); r.setProperty('--accent-soft', a[3]);
    r.setProperty('--soft', a[3]); r.setProperty('--hero-a', a[6] || a[3]); r.setProperty('--hero-b', a[7] || '#fff0dc'); r.setProperty('--peach', a[7] || '#fff0dc'); r.setProperty('--bg', a[4]); r.setProperty('--line', a[5]);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', a[4]);
  }

  /* ---------- state ---------- */
  let S = load();
  function load() {
    const fresh = { decks: [], terms: [], log: {}, tlog: {}, comm: [], settings: { newPerSession: 9999, tasksPerDay: 5, day: 0 }, seeded: true, lastTopic: null, cx: {} };
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.decks)) {
        const o = Object.assign(fresh, s);
        o.settings = Object.assign({ newPerSession: 9999, tasksPerDay: 5, day: 0 }, s.settings || {});
        o.settings.newPerSession = 9999;
        o.cx = o.cx || {};
        o.tlog = o.tlog || {};
        o.decks.forEach((d) => { if (d.parent === undefined) d.parent = null; if (typeof d.summary !== 'string') d.summary = ''; });
        o.terms = o.terms || [];
        o.comm = o.comm || [];
        return o;
      }
    } catch (e) { /* ignore */ }
    return fresh;
  }
  function save(clean) {
    if (!clean && !S.dirty) S.dirty = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Speichern fehlgeschlagen – Speicher voll?'); }
  }
  // Early versions created empty starter areas; remove them once if they are still completely empty.
  if (!S.cleaned) {
    const old = ['Produktmanagement', 'IT', 'Kommunikation', 'Grundlagen & Rolle', 'Discovery & Research', 'Strategie & Roadmap', 'Priorisierung', 'Agile & Delivery', 'Metriken & Analytics', 'Stakeholder & Kommunikation', 'Web & APIs', 'Softwareentwicklung & Git', 'Cloud & DevOps', 'Datenbanken', 'Architektur', 'Sicherheit', 'Netzwerke & Internet', 'Auf den Punkt'];
    const kids = (id) => S.decks.filter((d) => d.parent === id);
    const empty = (d) => !d.cards.length && !(d.summary && d.summary.trim()) && kids(d.id).every(empty);
    const gone = new Set();
    const mark = (d) => { gone.add(d.id); kids(d.id).forEach(mark); };
    S.decks.filter((d) => d.parent === null && old.includes(d.name) && empty(d)).forEach(mark);
    S.decks = S.decks.filter((d) => !gone.has(d.id));
    S.cleaned = true;
    save(true);
  }

  applyAccent();

  const deckById = (id) => S.decks.find((d) => d.id === id);
  const agg = (id) => C.aggregate(S.decks, id, Date.now(), S.settings.newPerSession);
  const openTerms = () => S.terms.filter((t) => !t.done);
  const topicPaths = () => C.flatTopics(S.decks).filter((t) => t.depth > 0).map((t) => t.label.split(' › ').join(' > '));
  const dayKey = (d) => {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  function streak() {
    let n = 0;
    const d = new Date();
    if (!S.log[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (S.log[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function topicOpts(selected, exclude, rootLabel) {
    let h = rootLabel != null ? '<option value="">' + esc(rootLabel) + '</option>' : '';
    C.flatTopics(S.decks).forEach((t) => {
      if (exclude && exclude.includes(t.id)) return;
      h += '<option value="' + t.id + '"' + (t.id === selected ? ' selected' : '') + '>' + esc(t.label) + '</option>';
    });
    return h;
  }
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  /* ---------- view state ---------- */
  let V = { name: 'home' };
  let ST = null; // card session
  let QZ = null; // quiz
  let EX = null; // explain session
  let PT = null; // "auf den Punkt" exercise
  let TK = null; // daily task session
  let IM = { decks: [], tab: '', target: '', keep: false };
  const COMM = window.COMM_EX || [];

  const here = () => ({ name: V.name, id: V.id, tab: V.tab });
  function go(name, params) {
    V = Object.assign({ name }, params || {});
    render();
    window.scrollTo(0, 0);
  }
  function back(from) { go(from && from.name ? from.name : 'home', from || {}); }

  const FOCUS = ['study', 'quiz', 'explain', 'point', 'tasks'];
  function render() {
    const fn = {
      home: viewHome, learn: viewLearn, topics: viewTopics, topic: viewTopic, read: viewRead, search: viewSearch, study: viewStudy, quiz: viewQuiz,
      explain: viewExplain, point: viewPoint, tasks: viewTasks, words: viewWords, comm: viewComm, import: viewImport, backup: viewBackup, options: viewOptions
    }[V.name];
    $('#view').innerHTML = fn();
    const focus = FOCUS.includes(V.name);
    $('#tabs').hidden = focus;
    $('#app').classList.toggle('focus', focus);
    const tab = { home: 'home', learn: 'home', topics: 'topics', topic: 'topics', read: 'topics', search: 'topics', words: 'words', comm: 'comm', import: 'import', backup: 'backup', options: 'options' }[V.name];
    document.querySelectorAll('#tabs button').forEach((b) => {
      const on = b.dataset.t === tab;
      b.classList.toggle('on', on);
      if (on) { const bar = $('#tabs'); bar.scrollLeft = b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2; }
    });
    const n = openTerms().length;
    const tb = $('#tabs [data-t=words] .tb');
    if (tb) { tb.textContent = n; tb.hidden = !n; }
  }

  /* ---------- home ---------- */
  function topicRow(d) {
    const a = agg(d.id);
    const sub = [];
    if (a.topics) sub.push(plural(a.topics, 'Thema', 'Themen'));
    if (a.total || !a.tasks) sub.push(plural(a.total, 'Karte', 'Karten'));
    if (a.tasks) sub.push(plural(a.tasks, 'Aufgabe', 'Aufgaben'));
    return '<button class="item" data-a="open-topic" data-id="' + d.id + '"><div class="grow"><div class="t">' + esc(d.name) +
      '</div><div class="s">' + sub.join(' · ') + '</div></div><span class="badge' + (a.todo ? '' : ' zero') + '">' + a.todo + '</span>' + ICON.chev + '</button>';
  }

  function taskInfo() {
    return { planned: S.settings.tasksPerDay || 5, done: S.tlog[dayKey()] || 0 };
  }
  const hasLearning = () => S.decks.some((d) => d.cards.length);

  function viewHome() {
    const ti = taskInfo();
    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const open = openTerms().length;
    let sub, btn;
    if (!hasLearning()) {
      sub = 'Noch nichts zum Lernen. Importiere zuerst eine Notiz.';
      btn = '<button class="btn primary" data-a="tab" data-t="import">Zum Import</button>';
    } else {
      sub = ti.done >= ti.planned ? 'Das Geplante ist geschafft. Mehr geht immer.' : 'Heute geplant: ' + plural(ti.planned, 'Aufgabe', 'Aufgaben') + (ti.done ? '. Schon ' + ti.done + ' geschafft.' : '.');
      btn = '<button class="btn primary" data-a="open-learn">Lernen starten</button>';
    }
    return '<p class="eyebrow" style="margin:4px 0 14px">' + esc(today) + '</p>' +
      '<section class="go"><i class="c1"></i><i class="c2"></i><i class="c3"></i><h2>Bereit?</h2><p>' + sub + '</p>' + btn + '</section>' +
      '<button class="item" style="margin-top:12px" data-a="add-term"><div class="grow"><div class="t">+ Wort merken</div></div></button>' +
      (open ? '<button class="item" style="margin-top:10px" data-a="tab" data-t="words"><div class="grow"><div class="t">' + (open === 1 ? '1 Wort wartet' : open + ' Wörter warten') + '</div><div class="s">auf eine Erklärung</div></div>' + ICON.chev + '</button>' : '') +
      (backupDue() ? '<button class="item" style="margin-top:10px" data-a="tab" data-t="backup"><div class="grow"><div class="t">Zeit für ein Backup</div><div class="s">' + esc(backupLabel()) + '</div></div>' + ICON.chev + '</button>' : '');
  }

  function viewLearn() {
    const rows = [
      ['🎲', 'Gemischt', 'Aufgaben und Karten aus allen Themen', 'start-tasks', '#fde4ee'],
      ['🧩', 'Rätsel', 'Rätsel und Fehler finden', 'start-riddles', '#fff0b3'],
      ['✅', 'Quiz', 'Antworten auswählen', 'start-quiz-all', '#ddf5ec'],
      ['💬', 'Fachgespräch', 'Text kopieren und im Chat üben', 'copy-sparring', '#ece5fb']
    ];
    return '<button class="back" data-a="tab" data-t="home">' + ICON.back + 'Zurück</button>' +
      '<h1 style="margin-bottom:16px">Was möchtest du üben?</h1><div class="list">' +
      rows.map((r) => '<button class="item" data-a="' + r[3] + '"><span class="ic" style="background:' + r[4] + '">' + r[0] + '</span><div class="grow"><div class="t">' + r[1] + '</div><div class="s">' + r[2] + '</div></div>' + ICON.chev + '</button>').join('') + '</div>';
  }

  function topicsBody(q) {
    if (q && q.trim()) return searchResults(q);
    const tops = C.childrenOf(S.decks, null);
    return tops.length
      ? '<div class="list">' + tops.map(topicRow).join('') + '</div>'
      : '<div class="empty"><p>Hier ist noch nichts. Lege ein Thema an, zum Beispiel „IT“, oder importiere eine Notiz.</p></div>';
  }

  function viewTopics() {
    const q = V.q || '';
    return '<header class="top"><h1>Themen</h1></header>' +
      '<input id="tp-q" type="text" placeholder="Suchen" value="' + esc(q) + '" autocomplete="off" style="margin-bottom:14px">' +
      '<div id="tp-body">' + topicsBody(q) + '</div>' +
      '<div class="row" style="margin-top:16px"><button class="btn primary" data-a="new-topic" data-parent="">+ Neues Thema</button></div>';
  }

  function viewComm() {
    const offset = new Date().getTimezoneOffset() * 60000;
    const day = Math.floor((Date.now() - offset) / 864e5);
    const todayEx = COMM[day % COMM.length];
    if (!todayEx) return '<header class="top"><h1>Kommunikation</h1></header><div class="empty"><p>Keine Übungen gefunden.</p></div>';
    const n = (S.cx || {})[dayKey()] || 0;
    return '<header class="top"><h1>Kommunikation</h1></header>' +
      '<section class="hero"><p class="eyebrow">Übung des Tages</p><div class="big" style="font-size:26px">' + esc(todayEx.name) + '</div><p class="muted">' + esc(todayEx.desc) + (n ? ' · heute schon ' + n + ' geübt' : '') + '</p>' +
      '<button class="btn primary" data-a="start-comm" data-id="' + todayEx.id + '">Starten</button></section>' +
      '<section><div class="sec-head"><h2>Alle Übungen</h2></div><div class="list">' +
      COMM.map((e) => '<button class="item" data-a="start-comm" data-id="' + e.id + '"><div class="grow"><div class="t">' + esc(e.name) + '</div><div class="s">' + esc(e.desc) + '</div></div>' + ICON.chev + '</button>').join('') + '</div></section>' +
      '<p class="hint">Du sprichst die Antwort, am besten laut oder per Diktat. Danach bewertest du dich selbst.</p>';
  }

  /* ---------- topic ---------- */
  function crumbs(id) {
    const chain = [];
    let cur = deckById(id);
    while (cur) { chain.unshift(cur); cur = cur.parent ? deckById(cur.parent) : null; }
    const parts = chain.slice(0, -1).map((d) => '<span>›</span><button class="crumb" data-a="open-topic" data-id="' + d.id + '">' + esc(d.name) + '</button>');
    return '<nav class="crumbs"><button class="crumb" data-a="tab" data-t="home">Start</button>' + parts.join('') + '</nav>';
  }

  function dueLabel(c, now) {
    if (C.isNew(c)) return 'Neu';
    if (c.due <= now) return 'Fällig';
    const d = Math.ceil((c.due - now) / 864e5);
    return 'in ' + d + (d === 1 ? ' Tag' : ' Tagen');
  }

  function viewTopic() {
    const t = deckById(V.id);
    if (!t) return viewTopics();
    const now = Date.now();
    const all = C.subtreeIds(S.decks, t.id).map(deckById);
    const nAny = all.reduce((a, d) => a + d.cards.length, 0);
    const nPlain = all.reduce((a, d) => a + d.cards.filter((c) => !C.isTask(c)).length, 0);
    const kids = C.childrenOf(S.decks, t.id);
    const sum = (t.summary || '').trim();
    const parent = t.parent ? deckById(t.parent) : null;
    const backBtn = parent
      ? '<button class="back" data-a="open-topic" data-id="' + parent.id + '">' + ICON.back + esc(parent.name) + '</button>'
      : '<button class="back" data-a="tab" data-t="topics">' + ICON.back + 'Themen</button>';
    const rows = t.cards.map((c) => '<button class="item" data-a="edit-card" data-id="' + c.id + '"><div class="grow"><div class="t">' + esc(C.plain(c.front, 110)) +
      '</div><div class="s">' + dueLabel(c, now) + '</div></div>' + ICON.chev + '</button>').join('');
    return backBtn + '<h1 style="margin-bottom:14px">' + esc(t.name) + '</h1>' +
      (sum ? '<div class="sum md reading">' + md(sum) + '</div>' : '<p class="muted">Noch keine Zusammenfassung.</p>') +
      '<div class="acts"><button class="btn primary" data-a="practice-topic"' + (nAny ? '' : ' disabled') + '>Üben</button>' +
      '<button class="btn ghost" data-a="start-quiz" data-id="' + t.id + '"' + (nPlain > 1 ? '' : ' disabled') + '>Quiz</button></div>' +
      (kids.length ? '<section><div class="sec-head"><h2>Themen</h2></div><div class="list">' + kids.map(topicRow).join('') + '</div></section>' : '') +
      (t.cards.length ? '<details><summary>' + plural(t.cards.length, 'Aufgabe oder Karte', 'Aufgaben und Karten') + ' ansehen</summary><div class="list" style="margin-top:10px">' + rows + '</div></details>' : '') +
      '<details><summary>Mehr</summary><div class="row" style="margin-top:12px">' +
      '<button class="btn ghost sm" data-a="new-topic" data-parent="' + t.id + '">+ Unterthema</button>' +
      '<button class="btn ghost sm" data-a="edit-card" data-id="">+ Karte</button>' +
      '<button class="btn ghost sm" data-a="edit-summary">Zusammenfassung bearbeiten</button>' +
      '<button class="btn ghost sm" data-a="explain-topic"' + (nPlain ? '' : ' disabled') + '>Erklär-Training</button>' +
      '<button class="btn ghost sm" data-a="copy-tutor">Lerngespräch kopieren</button>' +
      '<button class="btn ghost sm" data-a="exp-md">Als Markdown speichern</button>' +
      '<button class="btn ghost sm" data-a="edit-topic">Umbenennen / Verschieben</button>' +
      '<button class="btn danger sm" data-a="del-topic">Löschen</button></div></details>';
  }

  /* ---------- read ---------- */
  function viewRead() {
    const t = deckById(V.id);
    if (!t) return viewHome();
    const tab = V.tab || 'sum';
    const ids = C.subtreeIds(S.decks, t.id);
    let body = '';
    if (tab === 'sum') {
      const parts = ids.map(deckById).filter((d) => d.summary && d.summary.trim());
      body = parts.length
        ? parts.map((d) => '<article class="doc"><p class="eyebrow">' + esc(C.pathOf(S.decks, d.id).join(' › ')) + '</p><h2>' + esc(d.name) + '</h2><div class="md reading">' + md(d.summary) + '</div></article>').join('')
        : '<div class="empty"><p>Hier gibt es noch keine Zusammenfassung.</p><button class="btn ghost sm" data-a="edit-summary-from-read">Eintragen</button></div>';
    } else {
      const parts = ids.map(deckById).filter((d) => d.cards.length);
      body = parts.length
        ? parts.map((d) => '<h3 class="gl">' + esc(d.name) + '</h3>' + d.cards.map((c) => '<div class="term"><div class="md"><strong>' + md(c.front).replace(/^<p>|<\/p>$/g, '') + '</strong></div><div class="md">' + md(c.back) + '</div></div>').join('')).join('')
        : '<div class="empty"><p>Noch keine Karten.</p></div>';
    }
    return '<button class="back" data-a="open-topic" data-id="' + t.id + '">' + ICON.back + esc(t.name) + '</button>' +
      '<header class="top"><div><p class="eyebrow">Nachlesen</p><h1>' + esc(t.name) + '</h1></div></header>' +
      '<div class="seg two"><button data-a="read-tab" data-t="sum" class="' + (tab === 'sum' ? 'on' : '') + '">Zusammenfassung</button><button data-a="read-tab" data-t="gl" class="' + (tab === 'gl' ? 'on' : '') + '">Glossar</button></div>' +
      '<div style="margin-top:20px">' + body + '</div>';
  }

  /* ---------- search ---------- */
  function snippet(text, q) {
    const p = C.plain(text);
    const i = p.toLowerCase().indexOf(q);
    if (i < 0) return p.slice(0, 120);
    return (i > 40 ? '…' : '') + p.slice(Math.max(0, i - 40), i + 90) + (p.length > i + 90 ? '…' : '');
  }
  function searchResults(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return '<p class="muted small">Mindestens 2 Zeichen. Durchsucht Themen, Zusammenfassungen, Karten und Wörter.</p>';
    const rows = [];
    S.decks.forEach((d) => {
      const path = C.pathOf(S.decks, d.id).join(' › ');
      if (d.name.toLowerCase().includes(q)) rows.push(['open-topic', d.id, d.name, 'Thema · ' + path]);
      if (d.summary && d.summary.toLowerCase().includes(q)) rows.push(['read', d.id, d.name, 'Zusammenfassung · ' + snippet(d.summary, q)]);
      d.cards.forEach((c) => {
        if ((c.front + ' ' + c.back).toLowerCase().includes(q)) rows.push(['open-topic', d.id, C.plain(c.front, 100), 'Karte · ' + path + ' · ' + snippet(c.back, q)]);
      });
    });
    S.terms.forEach((t) => { if ((t.term + ' ' + (t.ctx || '')).toLowerCase().includes(q)) rows.push(['open-term', t.id, t.term, 'Wort · ' + (t.done ? 'erledigt' : 'offen')]); });
    if (!rows.length) return '<p class="muted small">Nichts gefunden.</p>';
    return '<div class="list">' + rows.slice(0, 30).map((r) => '<button class="item" data-a="' + r[0] + '" data-id="' + r[1] + '"><div class="grow"><div class="t">' + esc(r[2]) + '</div><div class="s">' + esc(r[3]) + '</div></div>' + ICON.chev + '</button>').join('') + '</div>';
  }
  function viewSearch() {
    return '<button class="back" data-a="tab" data-t="home">' + ICON.back + 'Start</button><header class="top"><div><h1>Suche</h1></div></header>' +
      '<input id="sr-q" type="text" placeholder="Begriff, Thema, Notiz …" value="' + esc(V.q || '') + '" autocomplete="off">' +
      '<div id="sr-res" style="margin-top:18px">' + searchResults(V.q || '') + '</div>';
  }

  /* ---------- card study ---------- */
  function cur(sess) {
    if (!sess || !sess.queue.length) return null;
    const e = sess.queue[0];
    if (e.label) return { deck: null, card: e.card, e };
    const deck = deckById(e.d);
    const card = deck && deck.cards.find((c) => c.id === e.c);
    return card ? { deck, card, e } : null;
  }

  function sessionHead(sess, closeAction) {
    const pct = Math.round((sess.done / sess.total) * 100);
    return '<div class="study-top"><button class="x" data-a="' + closeAction + '" aria-label="Beenden">' + ICON.x + '</button><div class="bar"><i style="width:' + pct + '%"></i></div><span class="count">' + sess.done + '/' + sess.total + '</span></div>';
  }

  function viewStudy() {
    if (!ST) return viewHome();
    const x = cur(ST);
    if (!x) {
      return '<div class="done"><div class="big"><i class="dot"></i></div><h1>Geschafft.</h1><p class="muted" style="margin:10px 0 26px">' + ST.total + ' Karten durch' + (ST.again ? ', ' + ST.again + 'x nochmal' : '') + '.</p><button class="btn primary block" data-a="end-study">Zurück</button></div>';
    }
    const now = Date.now();
    let html = sessionHead(ST, 'end-study') + '<div class="flash" data-a="reveal"><div class="lab">Frage</div><div class="md">' + md(x.card.front) + '</div>';
    if (ST.show) html += '<hr><div class="lab a">Antwort</div><div class="md">' + md(x.card.back) + '</div>';
    html += '</div>';
    if (!ST.show) {
      html += '<button class="btn primary block" style="margin-top:16px" data-a="reveal">Antwort zeigen</button>';
    } else {
      const names = ['Nochmal', 'Schwer', 'Gut', 'Leicht'];
      const cls = ['again', '', '', 'easy'];
      html += '<div class="rate">' + names.map((n, r) => '<button class="' + cls[r] + '" data-a="rate" data-r="' + r + '">' + n + '<small>' + C.fmtInterval(x.card, r, now) + '</small></button>').join('') + '</div>';
    }
    return html;
  }

  function startStudy(deckIds) {
    const now = Date.now();
    const queue = [];
    deckIds.forEach((id) => {
      const d = deckById(id);
      if (d) C.buildQueue(d.cards, now, S.settings.newPerSession).forEach((c) => queue.push({ d: d.id, c: c.id }));
    });
    if (!queue.length) return toast('Nichts fällig.');
    ST = { queue, total: queue.length, done: 0, show: false, again: 0, from: here() };
    go('study');
  }

  function applyRating(deck, card, r) {
    const i = deck.cards.findIndex((c) => c.id === card.id);
    deck.cards[i] = C.schedule(card, r, Date.now());
    const k = dayKey();
    S.log[k] = (S.log[k] || 0) + 1;
    save();
  }

  function rate(r) {
    const x = cur(ST);
    if (!x) return;
    applyRating(x.deck, x.card, r);
    const e = ST.queue.shift();
    if (r === 0) { ST.again++; ST.queue.push(e); } else ST.done++;
    ST.show = false;
    render();
  }

  /* ---------- quiz ---------- */
  function startQuiz(topicId) {
    const pool = [];
    (topicId ? C.subtreeIds(S.decks, topicId) : S.decks.map((d) => d.id)).forEach((i) => { const d = deckById(i); d.cards.filter((c) => !C.isTask(c)).forEach((c) => pool.push({ d: d.id, c })); });
    const picks = C.shuffle(pool).slice(0, 10);
    const items = picks.map((p) => {
      const others = C.shuffle(pool.filter((o) => o.c.id !== p.c.id && C.plain(o.c.back) !== C.plain(p.c.back)))
        .sort((a, b) => (b.d === p.d) - (a.d === p.d)).slice(0, 3);
      return { did: p.d, cid: p.c.id, opts: C.shuffle([p].concat(others)).map((o) => ({ id: o.c.id, text: o.c.back })) };
    }).filter((it) => it.opts.length >= 2);
    if (!items.length) return toast('Für ein Quiz brauchst du mindestens 2 Karten mit unterschiedlichen Antworten.');
    QZ = { topic: topicId || '', items, i: 0, score: 0, picked: null, wrong: [], from: here() };
    go('quiz');
  }

  function viewQuiz() {
    if (!QZ) return viewHome();
    if (QZ.i >= QZ.items.length) {
      const total = QZ.items.length;
      return '<div class="done"><div class="big">' + QZ.score + '<span style="font-size:.4em;margin:.5em 0 0 .15em;color:var(--mute)">/' + total + '</span></div>' +
        '<h1>' + (QZ.score === total ? 'Perfekt.' : QZ.score >= total / 2 ? 'Gut gemacht.' : 'Dranbleiben.') + '</h1>' +
        '<p class="muted" style="margin:10px 0 26px">' + (QZ.wrong.length ? 'Falsche Karten kommen bald wieder in deine Wiederholung.' : 'Alles richtig beantwortet.') + '</p>' +
        '<div class="stack"><button class="btn primary block" data-a="start-quiz" data-id="' + QZ.topic + '">Neues Quiz</button><button class="btn ghost block" data-a="end-quiz">Zurück</button></div></div>';
    }
    const it = QZ.items[QZ.i];
    const deck = deckById(it.did);
    const card = deck.cards.find((c) => c.id === it.cid);
    const letters = ['A', 'B', 'C', 'D'];
    let html = sessionHead({ done: QZ.i, total: QZ.items.length }, 'end-quiz') +
      '<div class="flash" style="min-height:0"><div class="lab">Frage</div><div class="md">' + md(card.front) + '</div></div><div class="opts">';
    it.opts.forEach((o, k) => {
      let cls = '';
      if (QZ.picked != null) { if (o.id === it.cid) cls = ' ok'; else if (o.id === QZ.picked) cls = ' bad'; }
      html += '<button class="opt' + cls + '" data-a="pick" data-id="' + o.id + '"' + (QZ.picked != null ? ' disabled' : '') + '><span class="k">' + letters[k] + '</span><div class="md">' + md(C.plain(o.text, 160)) + '</div></button>';
    });
    html += '</div>';
    if (QZ.picked != null) {
      if (QZ.picked !== it.cid) html += '<div class="reveal"><b>Richtig:</b><div class="md" style="margin-top:6px">' + md(card.back) + '</div></div>';
      html += '<button class="btn primary block" style="margin-top:16px" data-a="next-q">' + (QZ.i + 1 >= QZ.items.length ? 'Ergebnis' : 'Weiter') + '</button>';
    }
    return html;
  }

  function pick(id) {
    if (!QZ || QZ.picked != null) return;
    const it = QZ.items[QZ.i];
    const deck = deckById(it.did);
    const i = deck.cards.findIndex((c) => c.id === it.cid);
    const card = deck.cards[i];
    QZ.picked = id;
    if (id === it.cid) {
      QZ.score++;
      if (!C.isNew(card) && card.due <= Date.now()) deck.cards[i] = C.schedule(card, 2, Date.now());
    } else {
      QZ.wrong.push(it.cid);
      deck.cards[i] = C.schedule(card, 0, Date.now());
    }
    save();
    render();
  }

  /* ---------- daily tasks ---------- */
  function startTasks(opts) {
    opts = opts || {};
    const now = Date.now();
    const decks = opts.ids ? opts.ids.map(deckById).filter(Boolean) : S.decks;
    const riddle = (c) => ['Rätsel', 'Fehler finden'].includes(C.taskType(c));
    const lookup = (e) => { const d = deckById(e.d); return d && d.cards.find((c) => c.id === e.c); };
    let tq = C.pickTasks(decks, now, 60, 0);
    if (opts.riddles) tq = tq.filter((e) => { const c = lookup(e); return c && riddle(c); });
    if (!tq.length) {
      const any = [];
      decks.forEach((d) => d.cards.filter((c) => C.isTask(c) && (!opts.riddles || riddle(c))).forEach((c) => any.push({ d: d.id, c: c.id, due: c.due || 0 })));
      tq = any.sort((a, b) => a.due - b.due).map((x) => ({ d: x.d, c: x.c }));
    }
    let cq = [];
    if (!opts.riddles) {
      decks.forEach((d) => C.buildQueue(d.cards, now, 9999).forEach((c) => cq.push({ d: d.id, c: c.id })));
      cq = C.shuffle(cq);
    }
    const queue = [];
    while (queue.length < 5 && (tq.length || cq.length)) {
      if (tq.length) queue.push(tq.shift());
      if (queue.length < 5 && cq.length) queue.push(cq.shift());
    }
    if (!queue.length) return toast(opts.riddles ? 'Noch keine Rätsel vorhanden.' : 'Hier gibt es noch nichts zu üben.');
    TK = { queue, total: queue.length, done: 0, ok: 0, half: 0, no: 0, phase: 'ask', text: '', from: here(), opts };
    go('tasks');
  }

  function startComm(id) {
    const ex = COMM.find((e) => e.id === id);
    if (!ex) return;
    const queue = C.shuffle(ex.prompts.slice()).slice(0, 3).map((p, i) => ({ card: { id: 'cm' + i }, label: ex.name, text: p, how: ex.how }));
    TK = { queue, total: queue.length, done: 0, ok: 0, half: 0, no: 0, phase: 'ask', text: '', from: here(), comm: ex.id };
    go('tasks');
  }

  function viewTasks() {
    if (!TK) return viewHome();
    const x = cur(TK);
    if (!x) {
      const again = TK.comm
        ? '<button class="btn ghost block" data-a="start-comm" data-id="' + TK.comm + '">Noch eine Runde</button>'
        : '<button class="btn ghost block" data-a="restart-tasks">Noch 5</button>';
      return '<div class="done"><div class="big"><i class="dot"></i></div><h1>Geschafft.</h1><p class="muted" style="margin:10px 0 26px">' + plural(TK.total, TK.comm ? 'Übung' : 'Aufgabe', TK.comm ? 'Übungen' : 'Aufgaben') + ': ' + TK.ok + ' geschafft' +
        (TK.half ? ', ' + TK.half + ' halb' : '') + (TK.no ? ', ' + TK.no + ' kommen wieder' : '') + '.</p>' +
        '<div class="stack">' + again + '<button class="btn primary block" data-a="end-tasks">Zurück</button></div></div>';
    }
    const isT = C.isTask(x.card);
    const lab = x.e.label || (isT ? C.taskType(x.card) : 'Frage');
    const text = x.e.text || (isT ? C.taskText(x.card) : x.card.front);
    const sol = x.e.how || x.card.back;
    let html = sessionHead(TK, 'end-tasks') + '<div class="flash" style="min-height:0"><div class="lab">' + esc(lab) + '</div><div class="md">' + md(text) + '</div></div>';
    if (TK.phase === 'ask') {
      html += '<textarea id="tk-text" rows="5" style="margin-top:14px" placeholder="Tippe auf das Mikrofon deiner Tastatur und sprich deine Antwort …">' + esc(TK.text) + '</textarea>' +
        '<div class="row" style="margin-top:12px;align-items:center"><button class="btn primary" data-a="tk-show">' + (x.e.how ? 'Tipp zeigen' : 'Lösung zeigen') + '</button><button class="link" style="color:var(--mute)" data-a="tk-show">Weiß ich nicht</button></div>';
    } else {
      html += (TK.text ? '<div class="flash" style="min-height:0;margin-top:12px"><div class="lab">Deine Antwort</div><div style="white-space:pre-wrap;font-size:17px">' + esc(TK.text) + '</div></div>' : '') +
        '<div class="flash" style="min-height:0;margin-top:12px"><div class="lab a">' + (x.e.how ? 'So geht’s' : 'Lösung') + '</div><div class="md">' + md(sol) + '</div></div>' +
        '<p class="hint" style="text-align:center">Wie ist es gelaufen? Sei ehrlich, daran richtet sich, wann es wiederkommt.</p>' +
        '<div class="row nowrap" style="margin-top:10px"><button class="btn primary grow" data-a="tk-rate" data-r="ok">Geschafft</button><button class="btn ghost grow" data-a="tk-rate" data-r="half">Halb</button><button class="btn ghost grow" data-a="tk-rate" data-r="no">Nicht</button></div>';
    }
    return html;
  }

  function rateTask(result) {
    const x = cur(TK);
    if (!x) return;
    const k = dayKey();
    if (x.e.label) {
      S.cx = S.cx || {};
      S.cx[k] = (S.cx[k] || 0) + 1;
      S.log[k] = (S.log[k] || 0) + 1;
    } else if (C.isTask(x.card)) {
      const i = x.deck.cards.findIndex((c) => c.id === x.card.id);
      x.deck.cards[i] = C.scheduleTask(x.card, result, Date.now());
      if (result === 'no') {
        // a failed task returns tomorrow; meanwhile a different task of the same topic is tried next
        const sib = x.deck.cards.find((c) => C.isTask(c) && C.isNew(c) && c.id !== x.card.id && !c.boost);
        if (sib) sib.boost = true;
      }
      S.log[k] = (S.log[k] || 0) + 1;
      S.tlog[k] = (S.tlog[k] || 0) + 1;
    } else {
      applyRating(x.deck, x.card, result === 'ok' ? 2 : result === 'half' ? 1 : 0);
      S.tlog[k] = (S.tlog[k] || 0) + 1;
    }
    save();
    TK.queue.shift();
    TK.done++;
    TK[result]++;
    TK.phase = 'ask'; TK.text = '';
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- explain mode ---------- */
  function startExplain(ids) {
    const now = Date.now();
    let queue = [];
    ids.forEach((id) => {
      const d = deckById(id);
      if (d) C.buildQueue(d.cards, now, S.settings.newPerSession).forEach((c) => queue.push({ d: d.id, c: c.id, practice: false }));
    });
    queue = queue.slice(0, 8);
    if (!queue.length) {
      const all = [];
      ids.forEach((id) => { const d = deckById(id); if (d) d.cards.filter((c) => !C.isTask(c)).forEach((c) => all.push({ d: d.id, c: c.id, practice: true })); });
      queue = C.shuffle(all).slice(0, 6);
    }
    if (!queue.length) return toast('Keine Karten zum Erklären vorhanden.');
    EX = { queue, total: queue.length, done: 0, attempt: 1, phase: 'write', text: '', hard: 0, from: here() };
    go('explain');
  }

  function viewExplain() {
    if (!EX) return viewHome();
    const x = cur(EX);
    if (!x) {
      return '<div class="done"><div class="big"><i class="dot"></i></div><h1>Gut erklärt.</h1><p class="muted" style="margin:10px 0 26px">' + EX.total + ' Karten erklärt' +
        (EX.hard ? ', bei ' + EX.hard + ' brauchte es Nachfragen' : '') + '. Was nicht sofort saß, kommt bald wieder.</p><button class="btn primary block" data-a="end-explain">Zurück</button></div>';
    }
    let html = sessionHead(EX, 'end-explain');
    if (EX.phase === 'write') {
      html += '<div class="flash" style="min-height:0"><div class="lab">Erkläre in eigenen Worten</div><div class="md">' + md(x.card.front) + '</div></div>';
      if (EX.attempt > 1) html += '<div class="reveal"><b>Nachgefragt</b><p style="margin-top:4px">' + esc(C.FOLLOWUPS[(EX.attempt - 2) % C.FOLLOWUPS.length]) + '</p></div>';
      html += '<textarea id="ex-text" rows="6" style="margin-top:14px" placeholder="Schreib so, wie du es einem Kollegen erklären würdest …">' + esc(EX.text) + '</textarea>' +
        '<button class="btn primary block" style="margin-top:12px" data-a="ex-check">Prüfen</button>' +
        '<div style="text-align:center;margin-top:8px"><button class="link" style="color:var(--mute)" data-a="ex-skip">Weiß ich nicht</button></div>';
    } else {
      html += '<div class="flash" style="min-height:0"><div class="lab">Deine Erklärung</div><div style="white-space:pre-wrap;font-size:17px">' + (EX.text ? esc(EX.text) : '<span class="muted">—</span>') + '</div>' +
        '<hr><div class="lab a">Referenz</div><div class="md">' + md(x.card.back) + '</div></div>' +
        '<p class="hint" style="text-align:center">Vergleiche die Kernaussagen, nicht den Wortlaut.</p>' +
        '<div class="row nowrap" style="margin-top:16px"><button class="btn primary grow" data-a="ex-ok">Genau so</button><button class="btn ghost grow" data-a="ex-more">Noch nicht ganz</button></div>';
    }
    return html;
  }

  function finishExplain(ok) {
    const x = cur(EX);
    if (!x) return;
    if (!x.e.practice) applyRating(x.deck, x.card, C.explainRating(EX.attempt, ok));
    if (EX.attempt > 1) EX.hard++;
    EX.queue.shift();
    EX.done++;
    EX.attempt = 1; EX.phase = 'write'; EX.text = '';
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- "auf den Punkt" ---------- */
  const CHECKS = ['Die Antwort steht im ersten Satz', 'Ein Gedanke pro Satz, keine Füllwörter', 'Auch ohne Fachjargon verständlich', 'Das Wichtigste ist drin'];

  function pointReference(t) {
    const sum = (t.summary || '').trim();
    if (sum) return md(sum);
    const cards = [];
    C.subtreeIds(S.decks, t.id).forEach((i) => deckById(i).cards.forEach((c) => { if (!C.isTask(c)) cards.push(c); }));
    if (!cards.length) return '<p class="muted">Noch keine Zusammenfassung oder Karten als Vergleich – ergänze sie im Thema.</p>';
    return '<ul>' + cards.slice(0, 6).map((c) => '<li><strong>' + esc(C.plain(c.front, 90)) + '</strong> ' + esc(C.plain(c.back, 160)) + '</li>').join('') + '</ul>';
  }

  function viewPoint() {
    if (!PT) return viewHome();
    const t = deckById(PT.id);
    if (!t) return viewHome();
    const n = C.wordCount(PT.text);
    let html = '<div class="study-top"><button class="x" data-a="end-point" aria-label="Beenden">' + ICON.x + '</button><div class="bar"><i style="width:' + (PT.phase === 'write' ? 33 : 80) + '%"></i></div></div>';
    if (PT.phase === 'write') {
      html += '<div class="flash" style="min-height:0"><div class="lab">Auf den Punkt</div><div class="md"><p>Erkläre <strong>' + esc(t.name) + '</strong> aus dem Gedächtnis in höchstens <strong>' + PT.limit + ' Wörtern</strong>. Die Antwort kommt zuerst.</p></div></div>' +
        '<textarea id="pt-text" rows="7" style="margin-top:14px" placeholder="Beginne mit dem Kern …">' + esc(PT.text) + '</textarea>' +
        '<p id="pt-count" class="counter' + (n > PT.limit ? ' over' : '') + '">' + n + ' / ' + PT.limit + ' Wörter</p>' +
        '<button class="btn primary block" data-a="pt-compare">Vergleichen</button>';
    } else {
      const inLimit = n <= PT.limit && n > 0;
      html += '<div class="flash" style="min-height:0"><div class="lab">Dein Text · ' + n + ' Wörter</div><div style="white-space:pre-wrap;font-size:17px">' + esc(PT.text) + '</div><hr><div class="lab a">Zum Vergleich</div><div class="md" style="font-size:16px">' + pointReference(t) + '</div></div>' +
        '<div class="checks"><div class="check static"><span class="box' + (inLimit ? ' on' : '') + '"></span><span>Im Wortlimit (' + PT.limit + ')</span></div>' +
        CHECKS.map((c, i) => '<label class="check"><input type="checkbox" id="pt-c' + i + '"><span class="box"></span><span>' + esc(c) + '</span></label>').join('') + '</div>' +
        '<button class="btn primary block" style="margin-top:16px" data-a="pt-done">Fertig</button>';
    }
    return html;
  }

  /* ---------- words ---------- */
  function ageLabel(ms) {
    const d = Math.floor((Date.now() - ms) / 864e5);
    return d <= 0 ? 'heute' : d === 1 ? 'gestern' : 'vor ' + d + ' Tagen';
  }
  function addTerm(term, ctx) {
    term = String(term || '').trim();
    if (!term) return false;
    if (S.terms.some((t) => !t.done && t.term.toLowerCase() === term.toLowerCase())) { toast('Schon gemerkt.'); return false; }
    S.terms.push({ id: C.uid(), term, ctx: String(ctx || '').trim(), added: Date.now(), done: false });
    save();
    return true;
  }
  function viewWords() {
    const open = openTerms().slice().reverse();
    const done = S.terms.filter((t) => t.done).slice().reverse();
    const row = (t) => '<button class="item" data-a="open-term" data-id="' + t.id + '"><div class="grow"><div class="t">' + esc(t.term) + '</div>' + (t.ctx ? '<div class="s">' + esc(t.ctx) + '</div>' : '') + '</div>' + ICON.chev + '</button>';
    return '<header class="top"><h1>Wörter</h1></header>' +
      '<div class="add"><input id="w-term" type="text" placeholder="Wort diktieren" autocomplete="off"><button class="btn primary" data-a="add-term-inline">Merken</button></div>' +
      (open.length
        ? '<p class="cnt">' + (open.length === 1 ? '1 wartet' : open.length + ' warten') + ' auf eine Erklärung</p><div class="list">' + open.map(row).join('') + '</div>' +
          '<div class="row" style="margin-top:18px"><button class="btn primary" data-a="terms-prompt">Erklärung holen</button></div><p class="hint">Der Text wird kopiert. Füge ihn im Chat mit Claude ein.</p>'
        : '<p class="muted">Noch keine Wörter gemerkt.</p>') +
      (done.length ? '<details style="margin-top:20px"><summary>Erledigt (' + done.length + ')</summary><div class="list" style="margin-top:10px">' + done.map(row).join('') + '</div></details>' : '');
  }

  /* ---------- import ---------- */
  function viewImport() {
    let prev = '';
    if (IM.decks.length) {
      const n = IM.decks.reduce((a, d) => a + d.cards.length, 0);
      prev = '<div class="sec-head"><h2>Vorschau</h2><span class="muted small">' + plural(n, 'Eintrag', 'Einträge') + '</span></div><div class="list">' +
        IM.decks.map((d) => '<div class="item"><div class="grow"><div class="t">' + esc(d.path.join(' › ')) + '</div><div class="s">' + plural(d.cards.length, 'Aufgabe oder Karte', 'Aufgaben und Karten') + (d.summary ? ' · mit Zusammenfassung' : '') + '</div></div></div>').join('') +
        '</div><div class="row" style="margin-top:14px"><button class="btn primary" data-a="im-commit">Importieren</button><button class="btn ghost" data-a="im-clear">Verwerfen</button></div>';
    }
    return '<header class="top"><h1>Import</h1></header><p class="muted small" style="margin-bottom:18px">Notiz oder Aufgaben aus dem Chat einlesen.</p>' +
      (IM.decks.length ? prev :
        '<div class="list"><label class="item" for="im-file" style="cursor:pointer"><span class="ic" style="background:#fde4ee">📄</span><div class="grow"><div class="t">Datei auswählen</div><div class="s">Markdown-Datei aus „Dateien“</div></div></label>' +
        '<button class="item" data-a="im-tab" data-t="text"><span class="ic" style="background:#fff0b3">📋</span><div class="grow"><div class="t">Text einfügen</div><div class="s">Kopierten Text einsetzen</div></div></button></div>' +
        (IM.tab === 'text' ? '<textarea id="im-text" class="mono" rows="9" style="margin-top:14px" placeholder="Hier einfügen …"></textarea><div class="row" style="margin-top:12px"><button class="btn primary" data-a="im-parse-text">Weiter</button></div>' : '')) +
      '<input id="im-file" type="file" multiple accept=".md,.markdown,.txt,.json,text/*,application/json">';
  }

  async function readFileText(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
  }

  function readImportOpts() {
    const t = $('#im-target'), k = $('#im-keep');
    if (t) IM.target = t.value;
    if (k) IM.keep = k.checked;
  }

  function parseInput(text, name) {
    let decks = C.parseAny(text, name);
    const isJson = /^\s*[[{]/.test(text);
    if (IM.keep && !isJson) {
      const body = C.noteBody(text);
      if (body) {
        if (!decks.length) {
          const p = C.splitPath(name || 'Import');
          decks = [{ path: p, name: p[p.length - 1], summary: body, cards: [] }];
        } else if (decks.length === 1 && !decks[0].summary) decks[0].summary = body;
      }
    }
    if (IM.target) {
      const pre = C.pathOf(S.decks, IM.target);
      decks.forEach((d) => { if (d.path.length === 1) d.path = pre.concat(d.path); });
    }
    return decks;
  }

  function setPreview(decks) {
    IM.decks = decks;
    if (!decks.length) toast('Keine Karten erkannt – siehe Formate unten.');
    render();
  }

  function commitImport(decks) {
    const r = C.mergeDecks(S.decks, decks);
    let resolved = 0;
    S.terms.forEach((t) => { if (!t.done && C.termCovered(t.term, r.fronts)) { t.done = true; t.doneAt = Date.now(); resolved++; } });
    const onlyTasks = decks.length && decks.every((d) => d.cards.length && d.cards.every((c) => C.isTask(c)));
    save();
    toast((onlyTasks ? plural(r.added, 'Aufgabe', 'Aufgaben') : plural(r.added, 'Karte', 'Karten')) + ' importiert' + (r.skipped ? ' (' + plural(r.skipped, 'Duplikat', 'Duplikate') + ')' : '') + (resolved ? ' · ' + plural(resolved, 'Wort', 'Wörter') + ' erledigt' : ''));
    return r;
  }

  /* ---------- more ---------- */
  function viewBackup() {
    const total = S.decks.reduce((a, d) => a + d.cards.length, 0);
    return '<header class="top"><h1>Backup</h1></header>' +
      '<p class="muted small" style="margin-bottom:16px">' + plural(S.decks.length, 'Thema', 'Themen') + ' · ' + plural(total, 'Eintrag', 'Einträge') + ' · ' + plural(S.terms.length, 'Wort', 'Wörter') +
      '. Alles liegt nur auf diesem Gerät. ' + esc(backupLabel()) + '</p>' +
      '<div class="stack"><button class="btn primary block" data-a="exp-all-json">Backup sichern</button>' +
      '<label class="btn ghost block" for="restore" style="margin:0">Backup einspielen</label><input id="restore" type="file" accept=".json,application/json">' +
      '<button class="btn ghost block" data-a="exp-all-md">Alles als Markdown speichern</button></div>' +
      '<p class="hint" style="margin-top:14px">Tipp: Im Teilen-Menü „Mail“ wählen und die Datei an dich selbst schicken. Auf einem neuen Handy spielst du sie hier wieder ein.</p>';
  }

  function viewOptions() {
    const cur = ACCENTS[S.settings.accent] ? S.settings.accent : 'zucker';
    return '<header class="top"><h1>Optionen</h1></header>' +
      '<section><div class="sec-head"><h2>Farbe</h2></div><div class="row">' + Object.keys(ACCENTS).map((k) => '<button class="swatch' + (cur === k ? ' on' : '') + '" data-a="accent" data-c="' + k + '" aria-label="' + ACCENTS[k][0] + '" style="background:' + (k === 'zucker' ? 'linear-gradient(135deg,#f6a9c6 50%,#ffe07a 50%)' : ACCENTS[k][1]) + '"></button>').join('') + '</div></section>' +
      '<section><div class="sec-head"><h2>Plan</h2></div><label for="tasksper" style="margin-top:0">Geplant pro Tag (Aufgaben)</label><input id="tasksper" type="number" min="1" max="100" inputmode="numeric" value="' + S.settings.tasksPerDay + '">' +
      '<p class="hint">Das ist nur dein Ziel. Du kannst jederzeit mehr lernen, nichts wird gesperrt.</p></section>' +
      '<section><div class="sec-head"><h2>Prompts</h2></div><p class="hint" style="margin-top:0">Diese Texte kopierst du in den Chat mit Claude. Tippe einen an, um ihn zu lesen oder zu ändern.</p><div class="list">' + C.PROMPT_ORDER.map((k) => '<button class="item" data-a="edit-prompt" data-k="' + k + '"><span class="grow"><b>' + C.PROMPT_DEFAULTS[k].name + '</b>' + (S.prompts && S.prompts[k] && S.prompts[k].trim() ? '<br><small>geändert</small>' : '') + '</span></button>').join('') + '</div></section>' +
      '<section style="margin-top:34px"><button class="btn danger block" data-a="reset">Alle Daten löschen</button></section>' +
      '<p class="tiny">Recall · läuft offline · keine Konten, kein Tracking</p>';
  }

  /* ---------- sheet / toast ---------- */
  function sheet(html) {
    const s = $('#sheet');
    s.innerHTML = '<div class="backdrop" data-a="close-sheet"></div><div class="panel">' + html + '</div>';
    s.hidden = false;
    requestAnimationFrame(() => s.classList.add('open'));
  }
  function closeSheet() {
    const s = $('#sheet');
    s.classList.remove('open');
    setTimeout(() => { s.hidden = true; s.innerHTML = ''; }, 180);
  }
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- files / share ---------- */
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-+|-+$/g, '') || 'thema';

  async function saveFile(name, text, type) {
    const file = new File([text], name, { type: type || 'text/plain' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  }

  const WEEK = 7 * 864e5;
  function backupDue() {
    const has = S.decks.some((d) => d.cards.length || (d.summary && d.summary.trim())) || S.terms.length;
    return !!(has && S.dirty > 0 && Date.now() - (S.lastBackup || S.dirty) > WEEK);
  }
  function backupLabel() {
    if (!S.lastBackup) return 'Noch kein Backup gemacht.';
    const n = Math.floor((Date.now() - S.lastBackup) / 864e5);
    return 'Letztes Backup: ' + (n <= 0 ? 'heute' : n === 1 ? 'gestern' : 'vor ' + n + ' Tagen') + '.';
  }

  function b64u(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  async function encodeShare(decks) {
    const json = JSON.stringify({ v: 2, d: decks.map((d) => ({ p: d.path, s: d.summary || '', c: d.cards.map((c) => [c.front, c.back]) })) });
    let bytes = new TextEncoder().encode(json), p = 'p';
    if ('CompressionStream' in window) {
      const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(cs).arrayBuffer());
      p = 'z';
    }
    return p + b64u(bytes);
  }
  async function decodeShare(str) {
    let u8 = unb64u(str.slice(1));
    if (str[0] === 'z') {
      const ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      u8 = new Uint8Array(await new Response(ds).arrayBuffer());
    }
    const o = JSON.parse(new TextDecoder().decode(u8));
    return o.d.map((d) => {
      const path = d.p || C.splitPath(d.n || 'Import');
      return { path, name: path[path.length - 1], summary: d.s || '', cards: d.c.map((x) => ({ front: x[0], back: x[1] })) };
    });
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }
  async function copyPrompt(text, msg) { toast((await copyText(text)) ? (msg || 'Prompt kopiert – in Claude einfügen') : 'Kopieren nicht möglich'); }

  function toRaw(url) {
    const m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    return m ? 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3] : url;
  }

  function subtreeDecks(id) {
    return C.subtreeIds(S.decks, id).map(deckById).filter((d) => d.cards.length || (d.summary && d.summary.trim()))
      .map((d) => ({ path: C.pathOf(S.decks, d.id), name: d.name, summary: d.summary || '', cards: d.cards }));
  }

  function tutorPrompt(id) {
    const t = deckById(id);
    const cards = [];
    C.subtreeIds(S.decks, id).forEach((i) => deckById(i).cards.forEach((c) => { if (!C.isTask(c)) cards.push(c); }));
    const sums = C.subtreeIds(S.decks, id).map(deckById).filter((d) => d.summary && d.summary.trim()).map((d) => d.summary.trim()).join('\n\n');
    return C.buildTutorPrompt(t.name, C.pathOf(S.decks, id), sums, cards, S.prompts);
  }

  function sparringPrompt(id) {
    const t = deckById(id);
    const cards = [];
    C.subtreeIds(S.decks, id).forEach((i) => deckById(i).cards.forEach((c) => { if (!C.isTask(c)) cards.push(c); }));
    const sums = C.subtreeIds(S.decks, id).map(deckById).filter((d) => d.summary && d.summary.trim()).map((d) => d.summary.trim()).join('\n\n');
    return C.buildSparringPrompt(t.name, C.pathOf(S.decks, id), sums, cards, S.prompts);
  }

  /* ---------- actions ---------- */
  const A = {
    tab(el) { if (el.dataset.t === 'import') IM = { decks: [], tab: '', target: '', keep: false }; go(el.dataset.t, {}); },
    'open-topic': (el) => { closeSheet(); go('topic', { id: el.dataset.id }); },
    read: (el) => go('read', { id: el.dataset.id || V.id, tab: 'sum' }),
    'read-tab'(el) { V.tab = el.dataset.t; render(); },
    'go-search'() { go('search', { q: '' }); setTimeout(() => { const i = $('#sr-q'); if (i) i.focus(); }, 60); },
    'study-all': () => { startStudy(S.decks.map((d) => d.id)); },
    'study-topic': () => startStudy(C.subtreeIds(S.decks, V.id)),
    'explain-topic': () => startExplain(C.subtreeIds(S.decks, V.id)),
    reveal() { if (ST && !ST.show) { ST.show = true; render(); } },
    rate: (el) => rate(+el.dataset.r),
    'end-study'() { const f = ST && ST.from; ST = null; back(f); },
    'open-learn': () => go('learn'),
    'start-tasks': () => startTasks({}),
    'restart-tasks': () => startTasks(TK && TK.opts ? TK.opts : {}),
    'start-riddles': () => startTasks({ riddles: true }),
    'practice-topic': () => startTasks({ ids: C.subtreeIds(S.decks, V.id) }),
    'start-quiz-all': () => startQuiz(null),
    'start-comm': (el) => startComm(el.dataset.id),
    'tk-show'() { if (!TK) return; const t = $('#tk-text'); TK.text = t ? t.value.trim() : TK.text; TK.phase = 'show'; render(); window.scrollTo(0, 0); },
    'tk-rate': (el) => rateTask(el.dataset.r),
    'end-tasks'() { const f = TK && TK.from; TK = null; back(f); },
    'start-quiz': (el) => startQuiz(el.dataset.id || null),
    pick: (el) => pick(el.dataset.id),
    'next-q'() { QZ.i++; QZ.picked = null; render(); window.scrollTo(0, 0); },
    'end-quiz'() { const f = QZ && QZ.from; QZ = null; back(f); },
    'close-sheet': closeSheet,

    /* explain */
    'ex-check'() {
      const v = $('#ex-text').value.trim();
      if (v.length < 3) return toast('Schreib wenigstens einen Satz – oder tippe auf „Weiß ich nicht“.');
      EX.text = v; EX.phase = 'check'; render(); window.scrollTo(0, 0);
    },
    'ex-skip'() { EX.text = ''; EX.phase = 'check'; render(); },
    'ex-ok': () => finishExplain(true),
    'ex-more'() {
      if (EX.attempt >= 3) return finishExplain(false);
      EX.attempt++; EX.phase = 'write'; EX.text = ''; render(); window.scrollTo(0, 0);
    },
    'end-explain'() { const f = EX && EX.from; EX = null; back(f); },

    /* practice */
    'start-explain'() {
      const ids = V.topic ? C.subtreeIds(S.decks, V.topic) : S.decks.map((d) => d.id);
      startExplain(ids);
    },
    'start-point'() {
      let id = V.topic;
      if (!id) {
        const cands = S.decks.filter((d) => d.cards.length || (d.summary && d.summary.trim()));
        if (!cands.length) return toast('Lege zuerst Karten oder eine Zusammenfassung an.');
        id = cands[Math.floor(Math.random() * cands.length)].id;
      }
      const ids = C.subtreeIds(S.decks, id);
      if (!ids.some((i) => { const d = deckById(i); return d.cards.length || (d.summary && d.summary.trim()); })) return toast('In diesem Thema gibt es noch nichts zum Vergleichen.');
      PT = { id, limit: V.limit || 40, text: '', phase: 'write', from: here() };
      go('point');
    },
    'pt-compare'() {
      const v = $('#pt-text').value.trim();
      if (C.wordCount(v) < 3) return toast('Schreib mindestens einen kurzen Satz.');
      PT.text = v; PT.phase = 'check'; render(); window.scrollTo(0, 0);
    },
    'pt-done'() {
      const n = C.wordCount(PT.text);
      let score = n <= PT.limit && n > 0 ? 1 : 0;
      CHECKS.forEach((c, i) => { const el = $('#pt-c' + i); if (el && el.checked) score++; });
      S.comm.push({ t: Date.now(), topic: deckById(PT.id).name, limit: PT.limit, words: n, score, max: 5 });
      S.comm = S.comm.slice(-30);
      save();
      toast('Ergebnis: ' + score + '/5');
      const f = PT.from; PT = null; back(f);
    },
    'end-point'() { const f = PT && PT.from; PT = null; back(f); },
    'copy-tutor': () => copyPrompt(tutorPrompt(V.id)),
    'copy-tutor-pr'() { if (!V.topic) return toast('Wähle oben erst ein Thema.'); copyPrompt(tutorPrompt(V.topic)); },
    'copy-coach'() { const t = V.topic && deckById(V.topic); copyPrompt(C.buildCoachPrompt(t ? t.name : '', S.prompts)); },
    'copy-article-prompt': () => copyPrompt(C.buildArticlePrompt(topicPaths(), S.prompts)),

    /* topics */
    'new-topic'(el) {
      const parent = el.dataset.parent || '';
      sheet('<h3>' + (parent ? 'Neues Unterthema' : 'Neuer Bereich oder Thema') + '</h3><label for="f-name" style="margin-top:0">Name</label><input id="f-name" type="text" placeholder="z. B. Netzwerke">' +
        '<label for="f-parent">Liegt unter</label><select id="f-parent">' + topicOpts(parent, null, 'Oberste Ebene (Bereich)') + '</select>' +
        '<div class="row"><button class="btn primary grow" data-a="save-topic-new">Anlegen</button></div>');
      setTimeout(() => { const i = $('#f-name'); if (i) i.focus(); }, 250);
    },
    'save-topic-new'() {
      const name = $('#f-name').value.trim();
      if (!name) return;
      const d = { id: C.uid(), name, parent: $('#f-parent').value || null, summary: '', cards: [] };
      S.decks.push(d); save(); closeSheet(); go('topic', { id: d.id });
    },
    'edit-topic'() {
      const t = deckById(V.id);
      sheet('<h3>Thema bearbeiten</h3><label for="f-name" style="margin-top:0">Name</label><input id="f-name" type="text" value="' + esc(t.name) + '">' +
        '<label for="f-parent">Liegt unter</label><select id="f-parent">' + topicOpts(t.parent || '', C.subtreeIds(S.decks, t.id), 'Oberste Ebene (Bereich)') + '</select>' +
        '<div class="row"><button class="btn primary grow" data-a="save-topic-edit">Speichern</button></div>');
    },
    'save-topic-edit'() {
      const name = $('#f-name').value.trim();
      if (!name) return;
      const t = deckById(V.id);
      t.name = name; t.parent = $('#f-parent').value || null;
      save(); closeSheet(); render();
    },
    'del-topic'() {
      const t = deckById(V.id);
      const a = agg(t.id);
      if (!confirm('„' + t.name + '“' + (a.topics ? ' mit ' + plural(a.topics, 'Unterthema', 'Unterthemen') : '') + ' und ' + plural(a.total, 'Karte', 'Karten') + ' löschen?')) return;
      const ids = C.subtreeIds(S.decks, t.id);
      const parent = t.parent;
      S.decks = S.decks.filter((d) => !ids.includes(d.id));
      save();
      if (parent && deckById(parent)) go('topic', { id: parent }); else go('home');
    },
    'edit-summary'() {
      const t = deckById(V.id);
      sheet('<h3>Zusammenfassung</h3><textarea id="f-sum" class="mono" rows="14" placeholder="Stichpunkte, Merksätze, Erklärungen …">' + esc(t.summary || '') + '</textarea>' +
        '<p class="hint">Markdown wird unterstützt (Überschriften ###, Listen, Code). Tipp: Claude schreibt dir Zusammenfassungen – Prompt unter Import.</p>' +
        '<div class="row"><button class="btn primary grow" data-a="save-summary">Speichern</button></div>');
    },
    'edit-summary-from-read'() { A['edit-summary'](); },
    'save-summary'() { deckById(V.id).summary = $('#f-sum').value.trim(); save(); closeSheet(); render(); },
    'edit-card'(el) {
      const t = deckById(V.id);
      const c = el.dataset.id ? t.cards.find((x) => x.id === el.dataset.id) : null;
      sheet('<h3>' + (c ? 'Karte bearbeiten' : 'Neue Karte') + '</h3><label for="f-front" style="margin-top:0">Vorderseite (Frage)</label><textarea id="f-front" rows="3">' + esc(c ? c.front : '') + '</textarea>' +
        '<label for="f-back">Rückseite (Antwort)</label><textarea id="f-back" rows="5">' + esc(c ? c.back : '') + '</textarea><p class="hint">Markdown wird unterstützt (fett, Code, Listen).</p>' +
        '<div class="row"><button class="btn primary grow" data-a="save-card" data-id="' + (c ? c.id : '') + '">Speichern</button>' + (c ? '<button class="btn danger" data-a="del-card" data-id="' + c.id + '">Löschen</button>' : '') + '</div>');
    },
    'save-card'(el) {
      const f = $('#f-front').value.trim(), b = $('#f-back').value.trim();
      if (!f || !b) return toast('Vorder- und Rückseite ausfüllen.');
      const t = deckById(V.id);
      if (el.dataset.id) { const c = t.cards.find((x) => x.id === el.dataset.id); c.front = f; c.back = b; } else t.cards.push(C.newCard(f, b));
      save(); closeSheet(); render();
    },
    'del-card'(el) { const t = deckById(V.id); t.cards = t.cards.filter((x) => x.id !== el.dataset.id); save(); closeSheet(); render(); },

    /* export / share */
    'exp-md'() {
      const t = deckById(V.id);
      const text = C.subtreeIds(S.decks, t.id).map(deckById).filter((d) => d.cards.length || (d.summary && d.summary.trim()))
        .map((d) => C.toMarkdown(d, C.pathOf(S.decks, d.id))).join('\n');
      if (!text) return toast('Nichts zu exportieren.');
      saveFile(slug(t.name) + '.md', text, 'text/markdown');
    },
    'exp-json'() { const t = deckById(V.id); saveFile(slug(t.name) + '.json', JSON.stringify(C.toBackup(S.decks, C.subtreeIds(S.decks, t.id)), null, 2), 'application/json'); },
    async 'share-link'() {
      const t = deckById(V.id);
      const decks = subtreeDecks(t.id);
      if (!decks.length) return toast('Nichts zu teilen.');
      const url = location.origin + location.pathname + '#import=' + (await encodeShare(decks));
      if (navigator.share) { try { await navigator.share({ title: t.name, text: 'Recall: ' + t.name, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      toast((await copyText(url)) ? (url.length > 8000 ? 'Link kopiert (sehr lang – besser als Datei teilen)' : 'Link kopiert') : 'Kopieren nicht möglich');
    },
    async 'exp-all-json'() {
      const ok = await saveFile('recall-backup-' + dayKey() + '.json', JSON.stringify(C.toBackup(S.decks, null, { terms: S.terms, log: S.log }), null, 2), 'application/json');
      if (ok) { S.lastBackup = Date.now(); S.dirty = 0; save(true); render(); toast('Backup erstellt – speichere es in Mail, Dateien oder OneDrive'); }
    },
    'copy-sparring'() { if (!V.topic) return copyPrompt(C.buildSparringPrompt('', null, '', [], S.prompts), 'Text kopiert – im Chat mit Claude einfügen'); copyPrompt(sparringPrompt(V.topic), 'Text kopiert – im Chat mit Claude einfügen'); },
    'exp-all-md'() {
      const text = S.decks.filter((d) => d.cards.length || (d.summary && d.summary.trim())).map((d) => C.toMarkdown(d, C.pathOf(S.decks, d.id))).join('\n');
      if (!text) return toast('Noch nichts zu exportieren.');
      saveFile('recall-' + dayKey() + '.md', text, 'text/markdown');
    },
    reset() {
      if (!confirm('Wirklich ALLE Themen, Karten, Wörter und den Lernfortschritt löschen? Das kann nicht rückgängig gemacht werden.')) return;
      S = { decks: [], terms: [], log: {}, tlog: {}, comm: [], settings: { newPerSession: 20, tasksPerDay: 5, day: 0 }, seeded: true, lastTopic: null }; save(); go('home');
    },

    /* words */
    'add-term'() {
      sheet('<h3>Begriff merken</h3><label for="s-term" style="margin-top:0">Begriff</label><input id="s-term" type="text" autocomplete="off" placeholder="z. B. Idempotenz"><label for="s-ctx">Kontext (optional)</label><input id="s-ctx" type="text" autocomplete="off" placeholder="Wer hat es gesagt, worum ging es?">' +
        '<div class="row"><button class="btn primary grow" data-a="save-term-sheet">Merken</button></div>');
      setTimeout(() => { const i = $('#s-term'); if (i) i.focus(); }, 250);
    },
    'save-term-sheet'() { if (addTerm($('#s-term').value, $('#s-ctx').value)) { closeSheet(); toast('Gemerkt – unter Wörter nachlesen.'); render(); } },
    'add-term-inline'() {
      if (addTerm($('#w-term').value, ($('#w-ctx') || {}).value)) { render(); const i = $('#w-term'); if (i) i.focus(); } else if (!$('#w-term').value.trim()) toast('Erst einen Begriff eintippen.');
    },
    'bulk-add'() {
      const lines = $('#w-bulk').value.split('\n').map((l) => l.trim()).filter(Boolean);
      let n = 0;
      lines.forEach((l) => { if (addTerm(l, '')) n++; });
      if (n) toast(plural(n, 'Begriff', 'Begriffe') + ' gemerkt');
      render();
    },
    'terms-prompt'() { copyPrompt(C.buildTermsPrompt(openTerms(), topicPaths(), S.prompts), 'Prompt kopiert – in Claude einfügen, Antwort unter Import einfügen'); },
    'open-term'(el) {
      const t = S.terms.find((x) => x.id === el.dataset.id);
      if (!t) return;
      const flat = C.flatTopics(S.decks);
      const def = S.lastTopic && deckById(S.lastTopic) ? S.lastTopic : (flat.find((x) => x.depth > 0) || flat[0] || {}).id;
      sheet('<h3>' + esc(t.term) + '</h3>' + (t.ctx ? '<p class="muted small">' + esc(t.ctx) + '</p>' : '') + (t.done ? '<p class="muted small">Erledigt.</p>' : '') +
        '<label for="t-front">Frage für die Karte</label><input id="t-front" type="text" value="' + esc('Was ist ' + t.term + '?') + '">' +
        '<label for="t-back">Erklärung in eigenen Worten</label><textarea id="t-back" rows="4" placeholder="nachgelesen oder von Claude erklärt bekommen …"></textarea>' +
        '<label for="t-topic">Thema</label><select id="t-topic">' + topicOpts(def) + '</select>' +
        '<div class="row"><button class="btn primary grow" data-a="term-card" data-id="' + t.id + '">Karte anlegen</button></div>' +
        '<div class="row"><button class="btn ghost sm" data-a="term-prompt1" data-id="' + t.id + '">Prompt für Claude</button>' +
        (t.done ? '<button class="btn ghost sm" data-a="term-reopen" data-id="' + t.id + '">Wieder öffnen</button>' : '<button class="btn ghost sm" data-a="term-done" data-id="' + t.id + '">Erledigt</button>') +
        '<button class="btn danger sm" data-a="term-del" data-id="' + t.id + '">Löschen</button></div>');
    },
    'term-card'(el) {
      const t = S.terms.find((x) => x.id === el.dataset.id);
      const front = $('#t-front').value.trim(), back = $('#t-back').value.trim(), tid = $('#t-topic').value;
      if (!tid || !deckById(tid)) return toast('Lege zuerst ein Thema an.');
      if (!front || !back) return toast('Frage und Erklärung ausfüllen – oder den Prompt für Claude nutzen.');
      deckById(tid).cards.push(C.newCard(front, back));
      t.done = true; t.doneAt = Date.now(); S.lastTopic = tid;
      save(); closeSheet(); render(); toast('Karte angelegt');
    },
    'term-prompt1'(el) { const t = S.terms.find((x) => x.id === el.dataset.id); copyPrompt(C.buildTermsPrompt([t], topicPaths(), S.prompts), 'Prompt kopiert – in Claude einfügen'); },
    'term-done'(el) { const t = S.terms.find((x) => x.id === el.dataset.id); t.done = true; t.doneAt = Date.now(); save(); closeSheet(); render(); },
    'term-reopen'(el) { const t = S.terms.find((x) => x.id === el.dataset.id); t.done = false; save(); closeSheet(); render(); },
    'term-del'(el) { S.terms = S.terms.filter((x) => x.id !== el.dataset.id); save(); closeSheet(); render(); },

    /* import */
    'im-tab'(el) { readImportOpts(); IM.tab = el.dataset.t; IM.decks = []; render(); },
    'im-parse-text'() { readImportOpts(); setPreview(parseInput($('#im-text').value, 'Import')); },
    async 'im-parse-url'() {
      readImportOpts();
      const url = $('#im-url').value.trim();
      if (!url) return;
      try {
        const m = url.match(/#import=([pz][A-Za-z0-9_-]+)$/);
        if (m) return setPreview(await decodeShare(m[1]));
        const res = await fetch(toRaw(url));
        if (!res.ok) throw new Error(res.status);
        const name = decodeURIComponent(url.split('?')[0].split('/').pop() || '').replace(/\.[^.]+$/, '') || 'Import';
        setPreview(parseInput(await res.text(), name));
      } catch (e) { toast('Link konnte nicht geladen werden (privat oder blockiert?).'); }
    },
    'im-commit'() { commitImport(IM.decks); IM = { decks: [], tab: '', target: '', keep: false }; go('home'); },
    'im-clear'() { IM.decks = []; render(); },
    'edit-prompt'(el) {
      const k = el.dataset.k, d = C.PROMPT_DEFAULTS[k];
      sheet('<h2>' + d.name + '</h2>' + (d.vars ? '<p class="hint">Platzhalter, die die App ausfüllt: ' + d.vars + '</p>' : '') +
        '<textarea id="pr-text" rows="14" style="width:100%">' + C.esc(C.promptText(k, S.prompts)) + '</textarea>' +
        '<div class="row" style="margin-top:12px"><button class="btn" data-a="save-prompt" data-k="' + k + '">Speichern</button><button class="btn ghost" data-a="reset-prompt" data-k="' + k + '">Zurücksetzen</button><button class="btn ghost" data-a="copy-prompt-text">Kopieren</button><button class="btn ghost" data-a="close-sheet">Abbrechen</button></div>');
    },
    'copy-prompt-text'() { copyPrompt($('#pr-text').value); },
    'save-prompt'(el) {
      const v = $('#pr-text').value; S.prompts = S.prompts || {};
      if (v.trim() === C.PROMPT_DEFAULTS[el.dataset.k].text.trim()) delete S.prompts[el.dataset.k]; else S.prompts[el.dataset.k] = v;
      save(); closeSheet(); render(); toast('Gespeichert');
    },
    'reset-prompt'(el) { if (S.prompts) delete S.prompts[el.dataset.k]; save(); closeSheet(); render(); toast('Zurückgesetzt'); },
    accent(el) { S.settings.accent = el.dataset.c; save(); applyAccent(); render(); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    const fn = A[el.dataset.a];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'im-file') {
      readImportOpts();
      const out = [];
      for (const f of t.files) {
        try { out.push(...parseInput(await readFileText(f), f.name.replace(/\.[^.]+$/, ''))); } catch (err) { /* skip */ }
      }
      setPreview(out);
    } else if (t.id === 'im-target' || t.id === 'im-keep') {
      readImportOpts();
    } else if (t.id === 'pr-topic') {
      V.topic = t.value;
    } else if (t.id === 'pr-limit') {
      V.limit = +t.value;
    } else if (t.id === 'restore') {
      const f = t.files[0];
      if (!f) return;
      try {
        const text = await readFileText(f);
        const decks = C.parseAny(text, 'Import');
        let terms = 0;
        try {
          const o = JSON.parse(text);
          if (o && Array.isArray(o.terms)) o.terms.forEach((x) => { if (x && x.term && !S.terms.some((y) => y.term.toLowerCase() === String(x.term).toLowerCase())) { S.terms.push(Object.assign({ id: C.uid(), added: Date.now(), done: false, ctx: '' }, x)); terms++; } });
        } catch (err) { /* not json */ }
        if (!decks.length && !terms) return toast('Keine Daten in der Datei gefunden.');
        commitImport(decks);
        render();
      } catch (err) { toast('Datei konnte nicht gelesen werden.'); }
    } else if (t.id === 'tasksper') {
      S.settings.tasksPerDay = Math.max(1, Math.min(100, parseInt(t.value, 10) || 5)); save();
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'tk-text' && TK) {
      TK.text = t.value;
    } else if (t.id === 'pt-text' && PT) {
      PT.text = t.value;
      const n = C.wordCount(t.value);
      const el = $('#pt-count');
      if (el) { el.textContent = n + ' / ' + PT.limit + ' Wörter'; el.classList.toggle('over', n > PT.limit); }
    } else if (t.id === 'sr-q') {
      V.q = t.value;
      $('#sr-res').innerHTML = searchResults(t.value);
    } else if (t.id === 'tp-q') {
      V.q = t.value;
      $('#tp-body').innerHTML = topicsBody(t.value);
    }
  });

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (e.key === 'Enter' && e.target.id === 'w-term') { e.preventDefault(); A['add-term-inline'](); return; }
    if (V.name !== 'study' || !ST || /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || !$('#sheet').hidden) return;
    if (!ST.show && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); A.reveal(); }
    else if (ST.show && /^[1-4]$/.test(e.key)) rate(+e.key - 1);
  });

  /* ---------- share-link on load ---------- */
  let pending = null;
  async function handleHash() {
    const m = location.hash.match(/^#import=([pz][A-Za-z0-9_-]+)$/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    try {
      const decks = await decodeShare(m[1]);
      const n = decks.reduce((a, d) => a + d.cards.length, 0);
      pending = decks;
      sheet('<h3>Importieren?</h3><p class="muted">' + plural(decks.length, 'Thema', 'Themen') + ' mit ' + plural(n, 'Karte', 'Karten') + ': ' + esc(decks.map((d) => d.path.join(' › ')).join(', ')) +
        '</p><div class="row"><button class="btn primary grow" data-a="hash-ok">Importieren</button><button class="btn ghost" data-a="close-sheet">Abbrechen</button></div>');
    } catch (e) { toast('Der Link ist ungültig.'); }
  }
  A['hash-ok'] = () => { commitImport(pending || []); pending = null; closeSheet(); go('home'); };
  window.addEventListener('hashchange', handleHash);

  /* ---------- boot ---------- */
  render();
  handleHash();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
