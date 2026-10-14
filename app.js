/* Recall – UI. All data stays on this device (localStorage). */
(function () {
  'use strict';
  const C = window.Core;
  const PACKS = window.STARTERS || [];
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

  // Suggested structure for a fresh install (empty topics, rename or delete as you like).
  const SEED = [
    ['Produktmanagement', ['Grundlagen & Rolle', 'Discovery & Research', 'Strategie & Roadmap', 'Priorisierung', 'Agile & Delivery', 'Metriken & Analytics', 'Stakeholder & Kommunikation']],
    ['IT', ['Web & APIs', 'Softwareentwicklung & Git', 'Cloud & DevOps', 'Datenbanken', 'Architektur', 'Sicherheit', 'Netzwerke & Internet']],
    ['Kommunikation', ['Auf den Punkt']]
  ];

  /* ---------- state ---------- */
  let S = load();
  function load() {
    const fresh = { decks: [], terms: [], log: {}, tlog: {}, comm: [], settings: { newPerSession: 20, tasksPerDay: 5, day: 0 }, seeded: false, lastTopic: null };
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.decks)) {
        const o = Object.assign(fresh, s);
        o.settings = Object.assign({ newPerSession: 20, tasksPerDay: 5, day: 0 }, s.settings || {});
        o.tlog = o.tlog || {};
        o.decks.forEach((d) => { if (d.parent === undefined) d.parent = null; if (typeof d.summary !== 'string') d.summary = ''; });
        o.terms = o.terms || [];
        o.comm = o.comm || [];
        if (s.decks.length) o.seeded = true;
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
  if (!S.seeded) {
    SEED.forEach((a) => { C.ensurePath(S.decks, [a[0]]); a[1].forEach((s) => C.ensurePath(S.decks, [a[0], s])); });
    S.seeded = true;
    save();
  }

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
  let IM = { decks: [], tab: 'text', target: '', keep: false };

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
      home: viewHome, topic: viewTopic, read: viewRead, search: viewSearch, study: viewStudy, quiz: viewQuiz,
      explain: viewExplain, point: viewPoint, tasks: viewTasks, words: viewWords, practice: viewPractice, import: viewImport, more: viewMore
    }[V.name];
    $('#view').innerHTML = fn();
    const focus = FOCUS.includes(V.name);
    $('#tabs').hidden = focus;
    $('#app').classList.toggle('focus', focus);
    const tab = { home: 'home', topic: 'home', read: 'home', search: 'home', words: 'words', practice: 'practice', import: 'import', more: 'more' }[V.name];
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
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
    const day = S.settings.day, limit = S.settings.tasksPerDay || 5;
    const cov = C.taskCoverage(S.decks, day);
    const done = S.tlog[dayKey()] || 0;
    const avail = cov.tasks ? C.pickTasks(S.decks, Date.now(), 50, day).length : 0;
    return { cov, done, limit, avail, left: Math.max(0, limit - done), day };
  }

  function taskHero(ti) {
    if (!ti.cov.tasks) return '';
    const n = Math.min(ti.left, ti.avail);
    const sub = ti.done + ' von ' + ti.limit + ' heute · Themen geübt: ' + ti.cov.practiced + ' von ' + ti.cov.open +
      (ti.cov.locked ? ' (' + ti.cov.locked + ' noch gesperrt)' : '');
    let btn;
    if (!ti.avail) btn = '<button class="btn primary block" disabled>Heute nichts offen</button>';
    else if (!ti.left) btn = '<button class="btn primary block" data-a="start-tasks" data-extra="1">Noch 5 Aufgaben</button>';
    else btn = '<button class="btn primary block" data-a="start-tasks">Aufgaben starten</button>';
    const dayRow = ti.cov.locked || ti.day
      ? '<div class="row nowrap" style="margin-top:10px;align-items:center"><span class="muted small" style="flex:1">Lernplan: Tag ' + (ti.day || '–') + '</span><button class="link" data-a="day-next">Tag ' + (ti.day + 1) + ' freischalten</button></div>' : '';
    return '<section class="hero"><p class="eyebrow">Tagesaufgaben</p><div class="big">' + n + (n ? '<i class="dot"></i>' : '') + '</div><p class="muted">' + sub + '</p>' + btn + dayRow + '</section>';
  }

  function viewHome() {
    const ti = taskInfo();
    const now = Date.now(), lim = S.settings.newPerSession;
    let todo = 0, due = 0, nw = 0;
    S.decks.forEach((d) => {
      const s = C.stats(d.cards, now);
      const n = Math.min(s.new, lim);
      due += s.due; nw += n; todo += s.due + n;
    });
    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const st = streak();
    const done = S.log[dayKey()] || 0;
    const open = openTerms().length;
    const tops = C.childrenOf(S.decks, null);
    const list = tops.length
      ? '<div class="list">' + tops.map(topicRow).join('') + '</div>'
      : '<div class="empty"><p>Noch keine Bereiche. Lege einen an oder importiere Karten.</p><div class="row" style="justify-content:center"><button class="btn primary" data-a="new-topic" data-parent="">Bereich anlegen</button></div></div>';
    return '<header class="top"><div><p class="eyebrow">' + esc(today) + '</p><h1>Recall</h1></div><div class="row nowrap" style="align-items:center">' +
      (st ? '<span class="pill"><i class="dot"></i>' + plural(st, 'Tag', 'Tage') + '</span>' : '') +
      '<button class="x" data-a="go-search" aria-label="Suche">' + ICON.search + '</button></div></header>' +
      (backupDue() ? '<button class="item" style="margin-bottom:14px" data-a="exp-all-json"><div class="grow"><div class="t">Zeit für ein Backup</div><div class="s">' + esc(backupLabel()) + ' Tippen, dann per Mail an dich selbst sichern.</div></div>' + ICON.chev + '</button>' : '') +
      taskHero(ti) +
      (ti.cov.tasks && !todo ? '' : '<section class="hero"><p class="eyebrow">' + (ti.cov.tasks ? 'Karten' : 'Heute dran') + '</p><div class="big">' + todo + (todo ? '<i class="dot"></i>' : '') + '</div>' +
      '<p class="muted">' + due + ' fällig · ' + nw + ' neu · ' + done + ' heute gelernt</p>' +
      '<button class="btn primary block" data-a="study-all"' + (todo ? '' : ' disabled') + '>' + (todo ? 'Jetzt lernen' : 'Alles erledigt') + '</button></section>') +
      '<div class="row nowrap" style="margin-bottom:14px"><button class="btn ghost grow" data-a="add-term">+ Begriff merken</button>' +
      '<button class="btn ghost grow" data-a="tab" data-t="practice">Üben</button></div>' +
      (open ? '<button class="item" style="margin-bottom:28px" data-a="tab" data-t="words"><div class="grow"><div class="t">' + plural(open, 'Begriff wartet', 'Begriffe warten') + ' auf Erklärung</div><div class="s">Nachlesen und Karten daraus machen</div></div>' + ICON.chev + '</button>' : '<div style="height:14px"></div>') +
      '<section><div class="sec-head"><h2>Bereiche</h2>' + (tops.length ? '<button class="link" data-a="new-topic" data-parent="">+ Neu</button>' : '') + '</div>' + list + '</section>';
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
    if (!t) return viewHome();
    const now = Date.now();
    const a = agg(t.id);
    const kids = C.childrenOf(S.decks, t.id);
    const sum = (t.summary || '').trim();
    const cards = t.cards.length
      ? '<div class="list">' + t.cards.map((c) => '<button class="item" data-a="edit-card" data-id="' + c.id + '"><div class="grow"><div class="t">' + esc(C.plain(c.front, 110)) +
          '</div><div class="s">' + dueLabel(c, now) + '</div></div>' + ICON.chev + '</button>').join('') + '</div>'
      : '<div class="empty"><p>' + (kids.length ? 'Die Karten liegen in den Unterthemen.' : 'Noch keine Karten in diesem Thema.') + '</p></div>';
    const summary = sum
      ? '<button class="item" data-a="read" data-id="' + t.id + '"><div class="grow"><div class="t">Zusammenfassung lesen</div><div class="s">' + esc(C.plain(sum, 130)) + '</div></div>' + ICON.chev + '</button>'
      : '<div class="empty"><p>Noch keine Zusammenfassung. Trag eigene Notizen ein oder lass dir eine von Claude schreiben (Import → Prompt).</p><button class="btn ghost sm" data-a="edit-summary">Eintragen</button></div>';
    return crumbs(t.id) +
      '<header class="top"><div><p class="eyebrow">' + (t.parent ? 'Thema' : 'Bereich') + '</p><h1>' + esc(t.name) + '</h1></div></header>' +
      '<div class="row nowrap"><button class="btn primary grow" data-a="study-topic"' + (a.todo ? '' : ' disabled') + '>Lernen</button>' +
      '<button class="btn ghost grow" data-a="explain-topic"' + (a.total ? '' : ' disabled') + '>Erklären</button>' +
      '<button class="btn ghost grow" data-a="start-quiz" data-id="' + t.id + '"' + (a.total > 1 ? '' : ' disabled') + '>Quiz</button></div>' +
      '<div class="stats"><div class="stat' + (a.due ? ' hot' : '') + '"><b>' + a.due + '</b><span>Fällig</span></div><div class="stat"><b>' + a.new + '</b><span>Neu</span></div><div class="stat"><b>' + a.mature + '</b><span>Gefestigt</span></div></div>' +
      '<section><div class="sec-head"><h2>Zusammenfassung</h2>' + (sum ? '<button class="link" data-a="edit-summary">Bearbeiten</button>' : '') + '</div>' + summary + '</section>' +
      '<section><div class="sec-head"><h2>Unterthemen</h2><button class="link" data-a="new-topic" data-parent="' + t.id + '">+ Unterthema</button></div>' +
      (kids.length ? '<div class="list">' + kids.map(topicRow).join('') + '</div>' : '<p class="muted small">Keine Unterthemen.</p>') + '</section>' +
      '<section><div class="sec-head"><h2>Karten (' + t.cards.length + ')</h2><button class="link" data-a="edit-card" data-id="">+ Karte</button></div>' + cards + '</section>' +
      '<section><div class="sec-head"><h2>Vertiefen</h2></div><p class="muted small" style="margin-bottom:12px">Der Tutor-Prompt gibt Claude dein Material und lässt dich im Chat so lange erklären, bis du es sicher kannst.</p>' +
      '<button class="btn ghost block" data-a="copy-tutor">Tutor-Prompt kopieren</button></section>' +
      '<section><div class="sec-head"><h2>Teilen &amp; Export</h2></div><div class="row"><button class="btn ghost sm" data-a="exp-md">Markdown (Obsidian)</button><button class="btn ghost sm" data-a="exp-json">JSON</button><button class="btn ghost sm" data-a="share-link">Link</button></div></section>' +
      '<section><div class="row"><button class="btn ghost sm" data-a="edit-topic">Umbenennen / Verschieben</button><button class="btn danger sm" data-a="del-topic">Löschen</button></div></section>';
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
    C.subtreeIds(S.decks, topicId).forEach((i) => { const d = deckById(i); d.cards.filter((c) => !C.isTask(c)).forEach((c) => pool.push({ d: d.id, c })); });
    const picks = C.shuffle(pool).slice(0, 10);
    const items = picks.map((p) => {
      const others = C.shuffle(pool.filter((o) => o.c.id !== p.c.id && C.plain(o.c.back) !== C.plain(p.c.back)))
        .sort((a, b) => (b.d === p.d) - (a.d === p.d)).slice(0, 3);
      return { did: p.d, cid: p.c.id, opts: C.shuffle([p].concat(others)).map((o) => ({ id: o.c.id, text: o.c.back })) };
    }).filter((it) => it.opts.length >= 2);
    if (!items.length) return toast('Für ein Quiz brauchst du mindestens 2 Karten mit unterschiedlichen Antworten.');
    QZ = { topic: topicId, items, i: 0, score: 0, picked: null, wrong: [], from: here() };
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
  function startTasks(extra) {
    const day = S.settings.day, limit = S.settings.tasksPerDay || 5;
    const left = extra ? 5 : Math.max(0, limit - (S.tlog[dayKey()] || 0));
    if (!left) return toast('Für heute reicht es. Morgen geht es weiter.');
    const queue = C.pickTasks(S.decks, Date.now(), left, day);
    if (!queue.length) return toast('Heute ist nichts offen.');
    TK = { queue, total: queue.length, done: 0, ok: 0, half: 0, no: 0, phase: 'ask', text: '', from: here() };
    go('tasks');
  }

  function viewTasks() {
    if (!TK) return viewHome();
    const x = cur(TK);
    if (!x) {
      const cov = C.taskCoverage(S.decks, S.settings.day);
      const more = C.pickTasks(S.decks, Date.now(), 1, S.settings.day).length;
      return '<div class="done"><div class="big"><i class="dot"></i></div><h1>Geschafft.</h1><p class="muted" style="margin:10px 0 26px">' + plural(TK.total, 'Aufgabe', 'Aufgaben') + ': ' + TK.ok + ' geschafft' +
        (TK.half ? ', ' + TK.half + ' halb' : '') + (TK.no ? ', ' + TK.no + ' kommen wieder' : '') + '.<br>Themen geübt: ' + cov.practiced + ' von ' + cov.open + '.</p>' +
        '<div class="stack">' + (more ? '<button class="btn ghost block" data-a="start-tasks" data-extra="1">Noch 5 Aufgaben</button>' : '') + '<button class="btn primary block" data-a="end-tasks">Zurück</button></div></div>';
    }
    let html = sessionHead(TK, 'end-tasks') + '<div class="flash" style="min-height:0"><div class="lab">' + esc(C.taskType(x.card)) + '</div><div class="md">' + md(C.taskText(x.card)) + '</div></div>';
    if (TK.phase === 'ask') {
      html += '<textarea id="tk-text" rows="5" style="margin-top:14px" placeholder="Tippe auf das Mikrofon deiner Tastatur und sprich deine Antwort …">' + esc(TK.text) + '</textarea>' +
        '<button class="btn primary block" style="margin-top:12px" data-a="tk-show">Lösung zeigen</button>' +
        '<div style="text-align:center;margin-top:8px"><button class="link" style="color:var(--mute)" data-a="tk-show">Weiß ich nicht</button></div>';
    } else {
      html += (TK.text ? '<div class="flash" style="min-height:0;margin-top:12px"><div class="lab">Deine Antwort</div><div style="white-space:pre-wrap;font-size:17px">' + esc(TK.text) + '</div></div>' : '') +
        '<div class="flash" style="min-height:0;margin-top:12px"><div class="lab a">Lösung</div><div class="md">' + md(x.card.back) + '</div></div>' +
        '<p class="hint" style="text-align:center">Wie ist es gelaufen? Sei ehrlich, daran richtet sich, wann es wiederkommt.</p>' +
        '<div class="row nowrap" style="margin-top:10px"><button class="btn primary grow" data-a="tk-rate" data-r="ok">Geschafft</button><button class="btn ghost grow" data-a="tk-rate" data-r="half">Halb</button><button class="btn ghost grow" data-a="tk-rate" data-r="no">Nicht</button></div>';
    }
    return html;
  }

  function rateTask(result) {
    const x = cur(TK);
    if (!x) return;
    const i = x.deck.cards.findIndex((c) => c.id === x.card.id);
    x.deck.cards[i] = C.scheduleTask(x.card, result, Date.now());
    if (result === 'no') {
      // a failed task returns tomorrow; meanwhile a different task of the same topic is tried next
      const sib = x.deck.cards.find((c) => C.isTask(c) && C.isNew(c) && c.id !== x.card.id && !c.boost);
      if (sib) sib.boost = true;
    }
    const k = dayKey();
    S.log[k] = (S.log[k] || 0) + 1;
    S.tlog[k] = (S.tlog[k] || 0) + 1;
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
    const row = (t) => '<button class="item" data-a="open-term" data-id="' + t.id + '"><div class="grow"><div class="t">' + esc(t.term) + '</div><div class="s">' + (t.ctx ? esc(t.ctx) + ' · ' : '') + ageLabel(t.added) + '</div></div>' + ICON.chev + '</button>';
    return '<header class="top"><div><p class="eyebrow">Unbekanntes festhalten</p><h1>Wörter</h1></div></header>' +
      '<div class="stack"><input id="w-term" type="text" placeholder="Begriff, den du nicht verstehst …" autocomplete="off">' +
      '<input id="w-ctx" type="text" placeholder="Kontext (optional): wer, wo, worum ging’s?" autocomplete="off">' +
      '<button class="btn primary block" data-a="add-term-inline">Merken</button></div>' +
      '<details><summary>Mehrere auf einmal</summary><textarea id="w-bulk" rows="5" style="margin-top:10px" placeholder="Ein Begriff pro Zeile"></textarea><div class="row"><button class="btn ghost sm" data-a="bulk-add">Hinzufügen</button></div></details>' +
      '<section style="margin-top:26px"><div class="sec-head"><h2>Offen (' + open.length + ')</h2>' + (open.length ? '<button class="link" data-a="terms-prompt">Alle an Claude</button>' : '') + '</div>' +
      (open.length ? '<div class="list">' + open.map(row).join('') + '</div><p class="hint">„Alle an Claude“ kopiert einen Prompt. Die Antwort fügst du unter Import ein – passende Wörter werden dann automatisch erledigt.</p>' : '<div class="empty"><p>Nichts offen. Hörst du im Meeting ein Wort, das du nicht sicher erklären kannst, tipp es hier ein.</p></div>') + '</section>' +
      (done.length ? '<details><summary>Erledigt (' + done.length + ')</summary><div class="list" style="margin-top:10px">' + done.map(row).join('') + '</div></details>' : '');
  }

  /* ---------- practice ---------- */
  function viewPractice() {
    const sel = V.topic || '';
    const lim = V.limit || 40;
    const hist = S.comm.slice(-5).reverse();
    return '<header class="top"><div><p class="eyebrow">Verstehen &amp; Kommunizieren</p><h1>Üben</h1></div></header>' +
      '<label for="pr-topic" style="margin-top:0">Thema</label><select id="pr-topic"><option value="">Alle Themen</option>' + topicOpts(sel) + '</select>' +
      '<section style="margin-top:26px"><div class="sec-head"><h2>Tagesaufgaben</h2></div><p class="muted small" style="margin-bottom:12px">Kleine Rätsel, Fehler, Situationen und Code-Aufgaben aus allen Themen. Du diktierst, siehst die Lösung und bewertest dich.</p>' +
      '<button class="btn primary block" data-a="start-tasks">Aufgaben starten</button></section>' +
      '<section style="margin-top:26px"><div class="sec-head"><h2>Erklären</h2></div><p class="muted small" style="margin-bottom:12px">Erkläre Karten in eigenen Worten. Sitzt es nicht, fragt die App nach – mit neuen Blickwinkeln – bis du es kannst.</p>' +
      '<button class="btn primary block" data-a="start-explain">Erklär-Training starten</button></section>' +
      '<section><div class="sec-head"><h2>Auf den Punkt</h2></div><p class="muted small" style="margin-bottom:12px">Fasse ein Thema aus dem Gedächtnis kurz zusammen – Antwort zuerst, ohne Jargon.</p>' +
      '<div class="row nowrap"><select id="pr-limit" style="width:auto">' + [20, 40, 60].map((n) => '<option value="' + n + '"' + (n === lim ? ' selected' : '') + '>' + n + ' Wörter</option>').join('') + '</select><button class="btn primary grow" data-a="start-point">Starten</button></div></section>' +
      '<section><div class="sec-head"><h2>Mit Claude üben</h2></div><p class="muted small" style="margin-bottom:12px">Für echtes Nachfragen und Feedback zu deinen eigenen Formulierungen: Prompt kopieren und in Claude einfügen.</p>' +
      '<div class="row"><button class="btn ghost sm" data-a="copy-tutor-pr">Tutor (Thema)</button><button class="btn ghost sm" data-a="copy-coach">Kommunikations-Coach</button></div></section>' +
      '<section><div class="sec-head"><h2>Dev-Sparring</h2></div><p class="muted small" style="margin-bottom:12px">Üben wie im echten Meeting: Claude spielt einen Senior-Entwickler, du antwortest, und es gibt direkt Feedback. Mit gewähltem Thema nutzt es deinen Lernstoff.</p>' +
      '<button class="btn primary block" data-a="copy-sparring">Sparring-Prompt kopieren</button></section>' +
      '<section><div class="sec-head"><h2>So lernst du am besten</h2></div>' +
      '<details><summary>1. Erst raten, dann nachlesen</summary><div class="md" style="margin-top:10px"><p>Antworte bei jeder Karte zuerst aus dem Kopf, auch wenn du unsicher bist. Das Abrufen prägt sich stärker ein als erneutes Lesen. Bewerte ehrlich: „Nochmal“ ist kein Fehler, sondern der Plan.</p></div></details>' +
      '<details><summary>2. Täglich 10 Minuten statt einmal lang</summary><div class="md" style="margin-top:10px"><p>Kurze Einheiten mit Pausen dazwischen bleiben besser hängen. Die App legt die Abstände für dich fest. Du musst nur kommen.</p></div></details>' +
      '<details><summary>3. In eigenen Worten erklären</summary><div class="md" style="margin-top:10px"><p>Was du ohne Fachsprache erklären kannst, hast du verstanden. Nutze das Erklär-Training und danach „Auf den Punkt“.</p></div></details>' +
      '<details><summary>4. Tun statt nur lesen</summary><div class="md" style="margin-top:10px"><p>Übe in Situationen: Dev-Sparring, Begriff aus dem Meeting direkt in <em>Wörter</em> eintragen, und beim nächsten Gespräch eine der Rückfragen aus dem Meeting-Toolkit wirklich stellen.</p></div></details></section>' +
      '<section><div class="sec-head"><h2>Meeting-Toolkit</h2></div>' +
      '<details><summary>Antwort zuerst (BLUF)</summary><div class="md" style="margin-top:10px"><p>Das Ergebnis oder die Bitte steht im ersten Satz.</p><ul><li>Statt: „Wir haben uns die Zahlen angeschaut und …“</li><li>Besser: „Wir sollten Feature X verschieben, weil …“</li></ul></div></details>' +
      '<details><summary>Drei Sätze, die immer funktionieren</summary><div class="md" style="margin-top:10px"><ul><li><strong>1.</strong> Kernaussage</li><li><strong>2.</strong> Wichtigster Grund oder Beleg</li><li><strong>3.</strong> Was jetzt passieren soll</li></ul></div></details>' +
      '<details><summary>Wenn du etwas nicht verstehst</summary><div class="md" style="margin-top:10px"><ul><li>„Kannst du das in einem Satz für jemanden ohne Technik-Hintergrund sagen?“</li><li>„Was heißt das konkret für Nutzer und Zeitplan?“</li><li>„Ich notiere mir den Begriff – hast du ein Beispiel?“</li></ul><p>Dann: Begriff in <em>Wörter</em> eintragen.</p></div></details>' +
      '<details><summary>Rückfragen zu Aufwandsschätzungen</summary><div class="md" style="margin-top:10px"><ul><li>„Was ist die größte Unsicherheit?“</li><li>„Was lässt sich in kleinere Schritte schneiden?“</li><li>„Gibt es eine einfachere Variante?“</li><li>„Welche Annahmen stecken in der Schätzung?“</li></ul></div></details></section>' +
      (hist.length ? '<section><div class="sec-head"><h2>Zuletzt</h2></div><div class="list">' + hist.map((h) => '<div class="item"><div class="grow"><div class="t">' + esc(h.topic) + '</div><div class="s">Auf den Punkt · ' + h.words + '/' + h.limit + ' Wörter · ' + ageLabel(h.t) + '</div></div><span class="badge' + (h.score >= 4 ? '' : ' zero') + '">' + h.score + '/' + h.max + '</span></div>').join('') + '</div></section>' : '');
  }

  /* ---------- import ---------- */
  function viewImport() {
    const t = IM.tab;
    const tabs = [['text', 'Text'], ['file', 'Datei'], ['link', 'Link']];
    let body = '';
    if (t === 'text') {
      body = '<label for="im-text">Markdown, JSON oder Obsidian-Notiz einfügen</label>' +
        '<textarea id="im-text" class="mono" rows="9" placeholder="# IT > Web &amp; APIs\n\n## Zusammenfassung\n…\n\n## Karten\nWas ist eine API? :: Eine Schnittstelle …"></textarea>' +
        '<details style="margin-top:10px"><summary>Notiz vom Laptop abfotografieren?</summary><div class="md" style="margin-top:10px"><ol><li>Kamera auf den Bildschirm richten.</li><li>Unten rechts auf das Text-Symbol tippen, dann <em>Alles auswählen</em> und <em>Kopieren</em>.</li><li>Hier einfügen und die Option „Gesamten Text als Zusammenfassung speichern“ anhaken.</li></ol><p>Für Karten: Prompt hier unter Import kopieren („Prompt kopieren“) und das Foto in Claude hochladen. Prüfe vorher, ob deine Firma das erlaubt.</p></div></details>';
    } else if (t === 'file') {
      body = '<label>Dateien aus Obsidian (.md), Text oder JSON-Backup</label><label class="btn ghost block" for="im-file" style="margin:0">Dateien auswählen</label>' +
        '<input id="im-file" type="file" multiple accept=".md,.markdown,.txt,.json,text/*,application/json"><p class="hint">Der Dateiname dient als Thema, wenn keine Überschrift # vorhanden ist.</p>';
    } else {
      body = '<label for="im-url">Link zu einer .md/.json-Datei oder Recall-Teilen-Link</label><input id="im-url" type="url" inputmode="url" placeholder="https://…" autocapitalize="off" autocorrect="off">' +
        '<p class="hint">Funktioniert mit öffentlichen Raw-Links (z. B. GitHub) und mit Links, die du in der App teilst.</p>';
    }
    const opts = '<label for="im-target">Einsortieren unter</label><select id="im-target"><option value="">Automatisch (nach Überschrift)</option>' + topicOpts(IM.target) + '</select>' +
      '<label class="check" style="margin-top:14px"><input type="checkbox" id="im-keep"' + (IM.keep ? ' checked' : '') + '><span class="box"></span><span>Gesamten Text zusätzlich als Zusammenfassung speichern <span class="muted small">(für Obsidian-Notizen zum Nachlesen)</span></span></label>';
    const go1 = t === 'file' ? '' : '<div class="row"><button class="btn primary grow" data-a="' + (t === 'text' ? 'im-parse-text' : 'im-parse-url') + '">' + (t === 'text' ? 'Vorschau' : 'Laden') + '</button></div>';
    let prev = '';
    if (IM.decks.length) {
      const n = IM.decks.reduce((a, d) => a + d.cards.length, 0);
      prev = '<div class="preview"><div class="sep"></div><div class="sec-head"><h2>Vorschau</h2><span class="muted small">' + plural(n, 'Karte', 'Karten') + '</span></div><div class="list">' +
        IM.decks.map((d) => '<div class="item"><div class="grow"><div class="t">' + esc(d.path.join(' › ')) + '</div><div class="s">' + plural(d.cards.length, 'Karte', 'Karten') + (d.summary ? ' · mit Zusammenfassung' : '') +
          (d.cards[0] ? ' · z. B. „' + esc(C.plain(d.cards[0].front, 50)) + '“' : '') + '</div></div></div>').join('') +
        '</div><div class="row"><button class="btn primary grow" data-a="im-commit">Importieren</button><button class="btn ghost" data-a="im-clear">Verwerfen</button></div></div>';
    }
    const packs = PACKS.length ? '<section style="margin-top:30px"><div class="sec-head"><h2>Starter-Pakete</h2></div><div class="list">' + PACKS.map((p, i) => {
      const n = C.parseMarkdown(p.md, p.title).reduce((a, d) => a + d.cards.length, 0);
      return '<div class="item"><div class="grow"><div class="t">' + esc(p.title) + '</div><div class="s">' + esc(p.desc) + ' · ' + plural(n, 'Karte', 'Karten') + '</div></div><button class="btn ghost sm" data-a="starter" data-i="' + i + '">Hinzufügen</button></div>';
    }).join('') + '</div></section>' : '';
    return '<header class="top"><div><p class="eyebrow">Neu</p><h1>Import</h1></div></header>' +
      '<div class="seg">' + tabs.map((x) => '<button data-a="im-tab" data-t="' + x[0] + '" class="' + (t === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
      body + opts + go1 + prev + packs +
      '<details style="margin-top:26px"><summary>Artikel → Zusammenfassung &amp; Karten</summary><p class="hint" style="margin:8px 0 10px">Prompt kopieren, den Artikel anhängen und an Claude geben. Die Antwort fügst du hier ein – inklusive Themenzuordnung und Zusammenfassung.</p><button class="btn ghost sm" data-a="copy-article-prompt">Prompt kopieren</button></details>' +
      '<details><summary>Welche Formate werden erkannt?</summary><pre># Bereich &gt; Thema\n\n## Zusammenfassung\nText zum Nachlesen (bis zur nächsten # oder ## Überschrift)\n\n## Karten\nFrage :: Antwort\n- Auch als Liste :: geht\n\nMehrzeilige Frage\n?\nAntwort über\nmehrere Zeilen\n\nQ: Frage\nA: Antwort</pre><p class="hint">Eine Überschrift mit einem # startet ein Thema (Pfad mit &gt;). Das :: braucht Leerzeichen drumherum. Codeblöcke bleiben erhalten, [[Wikilinks]] werden bereinigt.</p></details>';
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
    let gated = false;
    if (!S.settings.day && decks.some((d) => C.deckDay(d) > 0 && d.cards.some(C.isTask))) { S.settings.day = 1; gated = true; }
    save();
    toast(plural(r.added, 'Karte', 'Karten') + ' importiert' + (gated ? ' · Lernplan steht auf Tag 1' : '') + (r.skipped ? ' (' + plural(r.skipped, 'Duplikat', 'Duplikate') + ')' : '') + (resolved ? ' · ' + plural(resolved, 'Wort', 'Wörter') + ' erledigt' : ''));
    return r;
  }

  /* ---------- more ---------- */
  function viewMore() {
    const total = S.decks.reduce((a, d) => a + d.cards.length, 0);
    return '<header class="top"><div><p class="eyebrow">Daten &amp; Einstellungen</p><h1>Mehr</h1></div></header>' +
      '<section><div class="sec-head"><h2>Backup</h2></div><p class="muted small" style="margin-bottom:12px">' + plural(S.decks.length, 'Thema', 'Themen') + ' · ' + plural(total, 'Karte', 'Karten') + ' · ' + plural(S.terms.length, 'Wort', 'Wörter') +
      '. Alles liegt nur auf diesem Gerät. ' + esc(backupLabel()) + '</p>' +
      '<p class="muted small" style="margin-bottom:12px">Tipp: Im Teilen-Menü „Mail“ wählen und die Datei an dich selbst schicken. Auf einem neuen Handy lädst du sie hier wieder ein.</p>' +
      '<div class="row"><button class="btn primary grow" data-a="exp-all-json">Backup sichern</button><button class="btn ghost grow" data-a="exp-all-md">Alles als Markdown</button></div>' +
      '<div class="row"><label class="btn ghost block" for="restore" style="margin:0">Backup einspielen</label><input id="restore" type="file" accept=".json,application/json"></div></section>' +
      '<section><div class="sec-head"><h2>Lernen</h2></div><label for="tasksper" style="margin-top:0">Aufgaben pro Tag</label><input id="tasksper" type="number" min="1" max="30" inputmode="numeric" value="' + S.settings.tasksPerDay + '">' +
      '<label for="lday">Lernplan: ich bin bei Tag <span class="muted small">(0 = alle Aufgaben freigeschaltet)</span></label><input id="lday" type="number" min="0" max="999" inputmode="numeric" value="' + S.settings.day + '">' +
      '<label for="newper">Neue Karten pro Sitzung und Thema</label><input id="newper" type="number" min="0" max="200" inputmode="numeric" value="' + S.settings.newPerSession + '"></section>' +
      '<section><div class="sec-head"><h2>Gefahrenzone</h2></div><button class="btn danger block" data-a="reset">Alle Daten löschen</button></section>' +
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
    return C.buildTutorPrompt(t.name, C.pathOf(S.decks, id), sums, cards);
  }

  function sparringPrompt(id) {
    const t = deckById(id);
    const cards = [];
    C.subtreeIds(S.decks, id).forEach((i) => deckById(i).cards.forEach((c) => { if (!C.isTask(c)) cards.push(c); }));
    const sums = C.subtreeIds(S.decks, id).map(deckById).filter((d) => d.summary && d.summary.trim()).map((d) => d.summary.trim()).join('\n\n');
    return C.buildSparringPrompt(t.name, C.pathOf(S.decks, id), sums, cards);
  }

  /* ---------- actions ---------- */
  const A = {
    tab(el) { if (el.dataset.t === 'import') IM = { decks: [], tab: IM.tab, target: '', keep: false }; go(el.dataset.t, el.dataset.t === 'practice' ? { topic: V.topic, limit: V.limit } : {}); },
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
    'start-tasks': (el) => startTasks(el && el.dataset && el.dataset.extra),
    'tk-show'() { if (!TK) return; const t = $('#tk-text'); TK.text = t ? t.value.trim() : TK.text; TK.phase = 'show'; render(); window.scrollTo(0, 0); },
    'tk-rate': (el) => rateTask(el.dataset.r),
    'end-tasks'() { const f = TK && TK.from; TK = null; back(f); },
    'day-next'() { S.settings.day = (S.settings.day || 0) + 1; save(); render(); toast('Tag ' + S.settings.day + ' freigeschaltet.'); },
    'start-quiz': (el) => startQuiz(el.dataset.id),
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
    'copy-coach'() { const t = V.topic && deckById(V.topic); copyPrompt(C.buildCoachPrompt(t ? t.name : '')); },
    'copy-article-prompt': () => copyPrompt(C.buildArticlePrompt(topicPaths())),

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
    'copy-sparring'() { if (!V.topic) return copyPrompt(C.buildSparringPrompt('', null, '', []), 'Sparring-Prompt kopiert – in Claude einfügen'); copyPrompt(sparringPrompt(V.topic), 'Sparring-Prompt kopiert – in Claude einfügen'); },
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
      if (addTerm($('#w-term').value, $('#w-ctx').value)) { render(); const i = $('#w-term'); if (i) i.focus(); } else if (!$('#w-term').value.trim()) toast('Erst einen Begriff eintippen.');
    },
    'bulk-add'() {
      const lines = $('#w-bulk').value.split('\n').map((l) => l.trim()).filter(Boolean);
      let n = 0;
      lines.forEach((l) => { if (addTerm(l, '')) n++; });
      if (n) toast(plural(n, 'Begriff', 'Begriffe') + ' gemerkt');
      render();
    },
    'terms-prompt'() { copyPrompt(C.buildTermsPrompt(openTerms(), topicPaths()), 'Prompt kopiert – in Claude einfügen, Antwort unter Import einfügen'); },
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
    'term-prompt1'(el) { const t = S.terms.find((x) => x.id === el.dataset.id); copyPrompt(C.buildTermsPrompt([t], topicPaths()), 'Prompt kopiert – in Claude einfügen'); },
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
    'im-commit'() { commitImport(IM.decks); IM = { decks: [], tab: IM.tab, target: '', keep: false }; go('home'); },
    'im-clear'() { IM.decks = []; render(); },
    starter(el) {
      const p = PACKS[+el.dataset.i];
      if (!p) return;
      const r = commitImport(C.parseMarkdown(p.md, p.title));
      render();
      return r;
    }
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
      S.settings.tasksPerDay = Math.max(1, Math.min(30, parseInt(t.value, 10) || 5)); save();
    } else if (t.id === 'lday') {
      S.settings.day = Math.max(0, Math.min(999, parseInt(t.value, 10) || 0)); save();
    } else if (t.id === 'newper') {
      S.settings.newPerSession = Math.max(0, Math.min(200, parseInt(t.value, 10) || 0)); save();
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
