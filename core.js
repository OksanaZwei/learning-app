/* Recall – core logic (no DOM). Runs in the browser and in Node (for tests). */
(function (root) {
  'use strict';

  const DAY = 864e5;
  const MIN = 6e4;

  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

  /* ---------- cards & scheduling ---------- */

  function newCard(front, back) {
    return { id: uid(), front: String(front).trim(), back: String(back).trim(), ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0, last: 0 };
  }

  function normalizeCard(c) {
    const base = newCard(c.front != null ? c.front : (c.question != null ? c.question : c.q || ''),
                         c.back != null ? c.back : (c.answer != null ? c.answer : c.a || ''));
    if (c.id) base.id = String(c.id);
    ['ease', 'interval', 'reps', 'lapses', 'due', 'last'].forEach((k) => {
      if (typeof c[k] === 'number' && isFinite(c[k])) base[k] = c[k];
    });
    return base;
  }

  const isNew = (c) => !c.last;

  // rating: 0 = Nochmal, 1 = Schwer, 2 = Gut, 3 = Leicht
  function schedule(card, rating, now) {
    now = now == null ? Date.now() : now;
    const c = Object.assign({}, card, { last: now });
    if (rating === 0) {
      c.lapses += 1;
      c.reps = 0;
      c.ease = Math.max(1.3, c.ease - 0.2);
      c.interval = 0;
      c.due = now + 10 * MIN;
      return c;
    }
    let days;
    if (rating === 1) {
      days = c.reps === 0 ? 1 : Math.max(1, Math.round(c.interval * 1.2));
      c.ease = Math.max(1.3, c.ease - 0.15);
    } else if (rating === 2) {
      days = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.interval * c.ease);
      days = Math.max(days, c.interval + 1);
    } else {
      days = c.reps === 0 ? 3 : Math.round(Math.max(c.interval, 1) * c.ease * 1.3);
      days = Math.max(days, c.interval + 2);
      c.ease += 0.15;
    }
    c.reps += 1;
    c.interval = days;
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    c.due = d.getTime();
    return c;
  }

  function fmtInterval(card, rating, now) {
    if (rating === 0) return '10 Min';
    const d = schedule(card, rating, now).interval;
    if (d < 30) return d + ' T';
    if (d < 365) return Math.round(d / 30) + ' Mon';
    return (d / 365).toFixed(1).replace('.', ',') + ' J';
  }

  /* ---------- mini tasks ("[Typ] Aufgabe :: Lösung") ---------- */
  // A card whose front starts with "[Typ]" is a task (riddle, find the error, situation, ...).
  // Tasks are kept out of the normal card queues and played in the daily task mode.
  const TASK_RE = /^\s*\[([^\[\]\n]{2,30})\]\s*/;
  const taskType = (c) => { const m = String(c.front).match(TASK_RE); return m ? m[1].trim() : null; };
  const isTask = (c) => !!taskType(c);
  const taskText = (c) => String(c.front).replace(TASK_RE, '');
  // Decks named "Tag 12 ..." belong to day 12 of the learning plan.
  const deckDay = (d) => { const m = String(d.name).match(/^\s*Tag\s*0*(\d+)/i); return m ? +m[1] : 0; };

  function taskDecks(decks, day) {
    return decks.filter((d) => d.cards.some(isTask)).map((d) => ({ d, locked: !!(day > 0 && deckDay(d) > day) }));
  }

  // Picks up to n tasks: failed ones first, then due reviews and new tasks alternating,
  // preferring topics that were practiced longest ago; one task per topic; never the same type twice in a row.
  function pickTasks(decks, now, n, day) {
    now = now == null ? Date.now() : now;
    n = n == null ? 5 : n;
    const items = [];
    taskDecks(decks, day).forEach(({ d, locked }, di) => {
      if (locked) return;
      d.cards.forEach((c) => { if (isTask(c)) items.push({ d: d.id, c: c.id, type: taskType(c), card: c, di }); });
    });
    const lastBy = {};
    items.forEach((it) => { lastBy[it.d] = Math.max(lastBy[it.d] || 0, it.card.last || 0); });
    const open = (it) => isNew(it.card) || it.card.due <= now;
    const boost = items.filter((it) => it.card.boost && open(it));
    const due = items.filter((it) => !it.card.boost && !isNew(it.card) && it.card.due <= now).sort((a, b) => a.card.due - b.card.due);
    const fresh = items.filter((it) => !it.card.boost && isNew(it.card)).sort((a, b) => (lastBy[a.d] - lastBy[b.d]) || (a.di - b.di));
    const out = [];
    const used = new Set();
    boost.slice(0, Math.min(2, n)).forEach((it) => { out.push(it); used.add(it.d); });
    const lists = [due, fresh];
    const take = (list) => {
      for (let i = 0; i < list.length; i++) {
        if (!used.has(list[i].d)) { const it = list.splice(i, 1)[0]; used.add(it.d); out.push(it); return true; }
      }
      return false;
    };
    let k = 0, stuck = 0;
    while (out.length < n && stuck < 2) { if (take(lists[k % 2])) stuck = 0; else stuck++; k++; }
    if (out.length < n) {
      due.concat(fresh).filter((it) => out.indexOf(it) < 0).slice(0, n - out.length).forEach((it) => out.push(it));
    }
    const res = [];
    const pool = out.slice();
    while (pool.length) {
      const prev = res.length ? res[res.length - 1].type : null;
      let i = pool.findIndex((it) => it.type !== prev);
      if (i < 0) i = 0;
      res.push(pool.splice(i, 1)[0]);
    }
    return res.map((it) => ({ d: it.d, c: it.c, type: it.type }));
  }

  // result: 'ok' (geschafft), 'half' (halb), 'no' (nicht). "no" comes back tomorrow.
  function scheduleTask(card, result, now) {
    now = now == null ? Date.now() : now;
    const r = result === 'ok' ? 2 : result === 'half' ? 1 : 0;
    const c = schedule(card, r, now);
    delete c.boost;
    if (r === 0) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 1);
      c.due = d.getTime();
    }
    return c;
  }

  function taskCoverage(decks, day) {
    const r = { topics: 0, open: 0, practiced: 0, locked: 0, tasks: 0 };
    taskDecks(decks, day).forEach(({ d, locked }) => {
      const t = d.cards.filter(isTask);
      r.topics++; r.tasks += t.length;
      if (locked) { r.locked++; return; }
      r.open++;
      if (t.some((c) => !isNew(c))) r.practiced++;
    });
    return r;
  }

  function buildQueue(cards, now, newLimit) {
    now = now == null ? Date.now() : now;
    cards = cards.filter((c) => !isTask(c));
    const due = cards.filter((c) => !isNew(c) && c.due <= now).sort((a, b) => a.due - b.due);
    const fresh = cards.filter(isNew).slice(0, newLimit == null ? 20 : newLimit);
    return due.concat(fresh);
  }

  function stats(cards, now) {
    now = now == null ? Date.now() : now;
    cards = cards.filter((c) => !isTask(c));
    let due = 0, nw = 0, mature = 0;
    cards.forEach((c) => {
      if (isNew(c)) nw++;
      else if (c.due <= now) due++;
      if (!isNew(c) && c.interval >= 21) mature++;
    });
    return { total: cards.length, due, new: nw, mature };
  }

  /* ---------- topics (tree of decks) ---------- */
  // deck = { id, name, parent: id|null, summary: markdown, cards: [] }

  const childrenOf = (decks, id) => decks.filter((d) => (d.parent || null) === (id || null));

  function subtreeIds(decks, id) {
    const out = [id];
    const walk = (p) => childrenOf(decks, p).forEach((c) => { out.push(c.id); walk(c.id); });
    walk(id);
    return out;
  }

  function pathOf(decks, id) {
    const names = [];
    const seen = new Set();
    let cur = decks.find((d) => d.id === id);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      names.unshift(cur.name);
      cur = cur.parent ? decks.find((d) => d.id === cur.parent) : null;
    }
    return names;
  }

  function aggregate(decks, id, now, newLimit) {
    const ids = subtreeIds(decks, id);
    const r = { total: 0, due: 0, new: 0, mature: 0, todo: 0, tasks: 0, topics: ids.length - 1 };
    ids.forEach((i) => {
      const d = decks.find((x) => x.id === i);
      const s = stats(d.cards, now);
      r.tasks += d.cards.filter(isTask).length;
      r.total += s.total; r.due += s.due; r.new += s.new; r.mature += s.mature;
      r.todo += s.due + Math.min(s.new, newLimit == null ? 20 : newLimit);
    });
    return r;
  }

  // Preorder list of all topics with labels like "IT › Netzwerke".
  function flatTopics(decks) {
    const out = [];
    const walk = (p, depth) => childrenOf(decks, p).forEach((d) => {
      out.push({ id: d.id, label: pathOf(decks, d.id).join(' \u203a '), depth });
      walk(d.id, depth + 1);
    });
    walk(null, 0);
    return out;
  }

  function ensurePath(decks, path) {
    let parent = null, deck = null;
    path.forEach((raw) => {
      const name = String(raw).trim();
      deck = decks.find((d) => (d.parent || null) === parent && d.name.trim().toLowerCase() === name.toLowerCase());
      if (!deck) { deck = { id: uid(), name, parent, summary: '', cards: [] }; decks.push(deck); }
      parent = deck.id;
    });
    return deck;
  }

  /* ---------- text helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function renderMd(src) {
    const parts = String(src).split(/(```[\s\S]*?```)/g);
    return parts.map((p, i) => {
      if (i % 2) {
        const code = p.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').replace(/\n$/, '');
        return '<pre><code>' + esc(code) + '</code></pre>';
      }
      let s = esc(p);
      s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1');
      s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
      s = s.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
      const out = [];
      let inList = false;
      s.split('\n').forEach((line) => {
        let m;
        if ((m = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/))) {
          if (!inList) { out.push('<ul>'); inList = true; }
          out.push('<li>' + m[1] + '</li>');
          return;
        }
        if (inList) { out.push('</ul>'); inList = false; }
        if ((m = line.match(/^(#{1,4})\s+(.*)$/))) out.push('<h4>' + m[2] + '</h4>');
        else if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) out.push('<hr>');
        else if ((m = line.match(/^\s*&gt;\s?(.*)$/))) out.push('<blockquote>' + m[1] + '</blockquote>');
        else if (line.trim()) out.push('<p>' + line + '</p>');
      });
      if (inList) out.push('</ul>');
      return out.join('');
    }).join('');
  }

  function plain(md, max) {
    let s = String(md)
      .replace(/```[^\n]*\n?([\s\S]*?)```/g, ' $1 ')
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[`*]|==/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (max && s.length > max) s = s.slice(0, max - 1).trimEnd() + '\u2026';
    return s;
  }

  function clean(s) {
    return String(s)
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/(^|\s)#flashcards?(\/\S*)?(?=\s|$)/gi, '$1')
      .trim();
  }

  const wordCount = (s) => { const t = String(s).trim(); return t ? t.split(/\s+/).length : 0; };

  /* ---------- Markdown import ---------- */
  // Card syntax (Obsidian friendly):
  //   Frage :: Antwort            (one line, list markers allowed, spaces around "::")
  //   Frage ... \n?\n Antwort ... (multi-line, "?" on its own line, ends at blank line)
  //   Q: Frage \n A: Antwort      (also F:/Frage: and Antwort:)
  // "# Bereich > Thema" starts a topic (path with ">" or "/").
  // "## Zusammenfassung" stores text up to the next "#"/"##" heading as the topic summary.

  const SUMMARY_HEAD = /^##\s+(zusammenfassung|summary|tl;dr|kurzfassung)\s*$/i;

  function splitPath(s) {
    return String(s).split(/\s+(?:>|\/|\u203a)\s+/).map(clean).filter(Boolean);
  }

  function parseMarkdown(text, fallbackName) {
    text = String(text).replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
    text = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    const lines = text.split('\n');
    const decks = [];
    let cur = null;

    const deck = (path) => {
      let p = path && path.length ? path : splitPath(fallbackName || 'Import');
      if (!p.length) p = ['Import'];
      cur = { path: p, name: p[p.length - 1], summary: '', cards: [] };
      decks.push(cur);
    };
    const add = (f, b) => {
      f = clean(f); b = clean(b);
      if (!f || !b) return;
      if (!cur) deck();
      cur.cards.push({ front: f, back: b });
    };

    function readBlock(start) {
      const out = [];
      let fence = false, i = start;
      for (; i < lines.length; i++) {
        const l = lines[i];
        const isFence = /^\s*```/.test(l);
        if (!fence && !isFence && (l.trim() === '' || /^#{1,6}\s/.test(l))) break;
        if (isFence) fence = !fence;
        out.push(l);
      }
      return { block: out, next: i };
    }

    // "Frage :: Antwort" – needs spaces around "::" so that code like std::vector is not a card.
    const COLON = /^\s*(?:[-*+]\s+|\d+\.\s+)?(.+?)\s+::\s+(.+)$/;
    function parseColon(lines2) {
      let fence = false;
      for (const l of lines2) {
        if (/^\s*```/.test(l)) { fence = !fence; continue; }
        if (fence) continue;
        const m = l.match(COLON);
        if (m) add(m[1], m[2]);
      }
    }

    function parseBlock(block) {
      // 1) "?" separator (single-line "::" cards directly above the question are kept)
      const q = block.findIndex((l) => l.trim() === '?');
      if (q > 0 && q < block.length - 1) {
        let s = q;
        while (s > 0 && !COLON.test(block[s - 1])) s--;
        if (s > 0) parseColon(block.slice(0, s));
        if (s < q) add(block.slice(s, q).join('\n'), block.slice(q + 1).join('\n'));
        return;
      }
      // 2) Q: / A:
      let mode = null, f = [], b = [], found = false;
      const flush = () => { if (f.length && b.length) add(f.join('\n'), b.join('\n')); f = []; b = []; };
      for (const l of block) {
        let m;
        if ((m = l.match(/^\s*(?:Q|F|Frage)\s*:\s*(.*)$/i))) { flush(); mode = 'f'; f = [m[1]]; found = true; }
        else if (mode && (m = l.match(/^\s*(?:A|Antwort)\s*:\s*(.*)$/i))) { mode = 'b'; b = [m[1]]; }
        else if (mode === 'f') f.push(l);
        else if (mode === 'b') b.push(l);
      }
      flush();
      if (found) return;
      // 3) "Frage :: Antwort" lines
      parseColon(block);
    }

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const h = line.match(/^#\s+(.+?)\s*#*\s*$/);
      if (h) { deck(splitPath(h[1])); i++; continue; }
      if (SUMMARY_HEAD.test(line)) {
        i++;
        const buf = [];
        let fence = false;
        for (; i < lines.length; i++) {
          const l = lines[i];
          if (/^\s*```/.test(l)) fence = !fence;
          if (!fence && /^#{1,2}\s/.test(l)) break;
          buf.push(l);
        }
        if (!cur) deck();
        const s = buf.join('\n').trim();
        cur.summary = cur.summary ? cur.summary + '\n\n' + s : s;
        continue;
      }
      if (line.trim() === '' || /^#{2,6}\s/.test(line)) { i++; continue; }
      const r = readBlock(i);
      i = r.next > i ? r.next : i + 1;
      parseBlock(r.block);
    }
    return decks.filter((d) => d.cards.length || d.summary);
  }

  // Body of an Obsidian note without front matter and the leading "# Title".
  function noteBody(text) {
    return String(text).replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '')
      .replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^\s*#\s+.+\n/, '').trim();
  }

  // Headings of level 1-2 inside a summary would end it on re-import; demote them (not inside code).
  function demoteHeadings(md) {
    return String(md).split(/(```[\s\S]*?```)/g)
      .map((p, i) => (i % 2 ? p : p.replace(/^#{1,2}(\s)/gm, '###$1'))).join('');
  }

  function toMarkdown(deck, path) {
    const hasSum = !!(deck.summary && deck.summary.trim());
    let out = '# ' + (path && path.length ? path.join(' > ') : deck.name) + '\n\n';
    if (hasSum) out += '## Zusammenfassung\n\n' + demoteHeadings(deck.summary.trim()) + '\n\n';
    if (deck.cards.length) {
      if (hasSum) out += '## Karten\n\n';
      // keep card order: consecutive one-liners are grouped, multi-line cards get blank lines around them
      const chunks = [];
      let run = [];
      const flush = () => { if (run.length) { chunks.push(run.join('\n')); run = []; } };
      deck.cards.forEach((c) => {
        if (!/\n/.test(c.front) && !/\n/.test(c.back)) run.push(c.front + ' :: ' + c.back);
        else { flush(); chunks.push(c.front + '\n?\n' + c.back); }
      });
      flush();
      out += chunks.join('\n\n') + '\n';
    }
    return out.replace(/\n+$/, '\n');
  }

  /* ---------- JSON import / export ---------- */

  function fromJSON(obj) {
    let decks;
    if (Array.isArray(obj)) {
      decks = obj.length && (obj[0].cards || obj[0].name) ? obj : [{ name: 'Import', cards: obj }];
    } else if (obj && Array.isArray(obj.decks)) decks = obj.decks;
    else if (obj && Array.isArray(obj.cards)) decks = [obj];
    else return [];
    return decks.map((d) => {
      const path = Array.isArray(d.path) && d.path.length ? d.path.map(String) : splitPath(d.name || d.title || 'Import');
      return {
        path: path.length ? path : ['Import'],
        name: String(d.name || path[path.length - 1] || 'Import'),
        summary: typeof d.summary === 'string' ? d.summary : '',
        cards: (d.cards || []).map(normalizeCard).filter((c) => c.front && c.back)
      };
    }).filter((d) => d.cards.length || d.summary);
  }

  function parseAny(text, fallbackName) {
    const t = String(text).trim();
    if (t[0] === '{' || t[0] === '[') {
      try { return fromJSON(JSON.parse(t)); } catch (e) { /* fall through to markdown */ }
    }
    return parseMarkdown(text, fallbackName);
  }

  function toBackup(decks, ids, extra) {
    const list = (ids ? decks.filter((d) => ids.includes(d.id)) : decks).map((d) => ({
      id: d.id, name: d.name, path: pathOf(decks, d.id), summary: d.summary || '', cards: d.cards
    }));
    return Object.assign({ app: 'recall', version: 2, exported: new Date().toISOString(), decks: list }, extra || {});
  }

  // Merge incoming decks (path-based) into the tree. Same path = same topic, duplicate cards are skipped.
  function mergeDecks(existing, incoming) {
    let added = 0, skipped = 0;
    const before = existing.length;
    const fronts = [];
    const usedIds = new Set();
    existing.forEach((d) => d.cards.forEach((c) => usedIds.add(c.id)));
    incoming.forEach((inc) => {
      const path = inc.path && inc.path.length ? inc.path : [inc.name];
      const d = ensurePath(existing, path);
      const sum = inc.summary && inc.summary.trim();
      if (sum) {
        if (!d.summary) d.summary = sum;
        else if (!d.summary.includes(sum)) d.summary += '\n\n---\n\n' + sum;
      }
      const seen = new Set(d.cards.map((c) => c.front + '\u0000' + c.back));
      (inc.cards || []).forEach((c) => {
        const card = normalizeCard(c);
        const key = card.front + '\u0000' + card.back;
        if (seen.has(key)) { skipped++; return; }
        if (usedIds.has(card.id)) card.id = uid();
        usedIds.add(card.id);
        seen.add(key);
        d.cards.push(card);
        fronts.push(card.front);
        added++;
      });
    });
    return { added, skipped, created: existing.length - before, fronts };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- glossary (unknown words) ---------- */

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\u00e4\u00f6\u00fc\u00df+#. ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function termCovered(term, fronts) {
    const t = norm(term);
    return !!t && fronts.some((f) => norm(f).includes(t));
  }

  /* ---------- "Erklären" mode ---------- */

  const FOLLOWUPS = [
    'Erkl\u00e4re es so, dass es jemand ohne IT-Hintergrund versteht.',
    'Gib ein konkretes Beispiel aus einem echten Produkt oder dem Team-Alltag.',
    'Was passiert, wenn es fehlt oder schiefgeht \u2013 und warum ist das wichtig?',
    'Worin unterscheidet es sich von einem verwandten Begriff?'
  ];

  // attempts = how many tries it took; ok = finally explained well. Returns a schedule rating.
  function explainRating(attempts, ok) {
    if (!ok) return 0;
    return attempts <= 1 ? 2 : attempts === 2 ? 1 : 0;
  }

  /* ---------- prompts for working with Claude in the chat ---------- */

  // Editable prompt templates. {{platzhalter}} are filled in by the builders below.
  const PROMPT_DEFAULTS = {
    chat: {
      name: 'Anweisung für den Chat',
      vars: '',
      text: 'Ich lerne IT und AWS, um mit Senior-Entwickler:innen auf Augenhöhe zu sprechen. Ich entscheide, was ich lerne, du schlägst nur vor. Ich diktiere meine Antworten auf dem Handy. Stelle deshalb immer nur EINE Frage auf einmal.\n\n' +
        'Ablauf:\n' +
        '1. Frage mich kurz, welches Thema ich heute lernen will (ein Vorschlag aus meinem Plan oder etwas anderes).\n' +
        '2. Erkläre in kleinen Schritten mit Beispielen aus der Praxis. Lass mich zwischendurch in eigenen Worten antworten. Erfinde keine Details zu meinem Projekt. Wenn du etwas nicht weißt, sag es.\n' +
        '3. Die Einheit dauert so lange, bis ich „Ende“ sage. Frage nicht nach jedem Abschnitt, ob es genug ist.\n' +
        '4. Am Ende gibst du mir NUR zu dem, was wir wirklich besprochen haben, EINEN Markdown-Codeblock in genau diesem Format:\n\n' +
        '# IT > <Bereich> > <Thema>\n\n## Zusammenfassung\n(5–8 Stichpunkte, Kernaussage zuerst)\n\n## Aufgaben\n[Art] Aufgabe :: Lösung\n(eine Zeile pro Aufgabe, mindestens 12, mit Leerzeichen um „::“. Arten: Rätsel, Fehler finden, Situation, Code lesen, Zuordnen, Wahr oder falsch, Shell, SQL. Erklär-Aufgaben nur selten.)\n\n## Karten\nFrage :: Antwort\n(6–10 kurze Karten mit einem Satz als Antwort, für das Quiz)\n\n' +
        '5. Danach: neue Wörter als Liste „Wort :: Erklärung“, eine Zeile für meinen Lernstand und ein Vorschlag fürs nächste Thema.\n' +
        '6. Schreibe nie Aufgaben im Voraus für Themen, die wir nicht besprochen haben.\n\n' +
        'Kommunikation: Wenn ich Kommunikation üben will (Zufallsthema, Pause vor der Antwort, Zurückspiegeln, Analogie, Für Laien erklären, Änderung erklären, Füllwörter zählen, Tagesrückblick), gib mir am Ende ebenfalls einen Codeblock mit „# Kommunikation > <Übung>“ und Aufgaben im Format „[Übung] Aufgabe :: Tipp“.\n\n' +
        'Mein Lernstand und Plan stehen unten (falls vorhanden):\n'
    },
    tutor: {
      name: 'Lerngespräch (Tutor)',
      vars: '{{thema}}, {{material}}',
      text: 'Du bist mein geduldiger Tutor für das Thema „{{thema}}“. Ich will es wirklich verstehen und mit eigenen Worten erklären können – im Gespräch mit Entwickler:innen.\n\n' +
        'So gehst du vor:\n1. Stelle immer nur EINE Frage und warte auf meine Antwort.\n' +
        '2. Bewerte kurz (richtig / teilweise / falsch) und nenne die Lücke in einem Satz.\n' +
        '3. Frage nach, bis ich es verständlich erkläre: anderes Beispiel, ohne Fachsprache, was passiert wenn es fehlt, Abgrenzung zu Ähnlichem.\n' +
        '4. Erst wenn ich es sicher kann, gehe zur nächsten Frage.\n' +
        '5. Am Ende: Liste meine Lücken als Karten im Format „Frage :: Antwort“, damit ich sie importieren kann.\n\n' +
        '{{material}}Starte mit der ersten Frage.'
    },
    sparring: {
      name: 'Fachgespräch',
      vars: '{{thema}}, {{material}}',
      text: 'Du bist ein erfahrener Senior-Entwickler in meinem Team und mein Gesprächspartner. Ich will mit dir auf Augenhöhe über „{{thema}}“ sprechen können.\n\n' +
        'Ich lerne am besten durch Tun, nicht durch Lesen. Deshalb:\n' +
        '1. Starte direkt mit einer realistischen Situation aus dem Arbeitsalltag (z. B. ein Ausfall ist passiert, eine Schätzung steht zur Diskussion, ein Fehler muss gesucht werden). Keine Vorlesung vorweg.\n' +
        '2. Sprich wie ein echter Entwickler, mit Fachbegriffen, aber nie unfreundlich. Stelle EINE Frage oder Aussage pro Nachricht und warte auf mich.\n' +
        '3. Nach meiner Antwort: erst kurz im Spiel bleiben (reagiere als Entwickler), dann in einem eigenen Absatz „Coach:“ Feedback: Was war gut? Welcher Begriff fehlte oder war falsch? Welche bessere Rückfrage hätte ich stellen können?\n' +
        '4. Wenn ich einen Begriff nicht kenne, erkläre ihn in 2 Sätzen mit Alltagsvergleich und lass ihn mich danach selbst in eigenen Worten wiederholen.\n' +
        '5. Steigere die Schwierigkeit langsam. Wechsle auch mal das Thema, damit ich nicht nur Auswendiges abrufe.\n' +
        '6. Am Ende (wenn ich „Ende“ schreibe): Liste meine Lücken als Aufgaben im Format „[Situation] Aufgabe :: Lösung“ unter einer Zeile „# IT > Bereich > Thema“, damit ich sie in meine Lern-App importieren kann.\n\n' +
        '{{material}}Starte jetzt mit der ersten Situation.'
    },
    terms: {
      name: 'Wörter erklären lassen',
      vars: '{{begriffe}}, {{themenliste}}',
      text: 'Ich habe diese Begriffe von Entwickler:innen gehört, die ich nicht sicher verstehe:\n\n{{begriffe}}\n\n' +
        'Erkläre sie so, dass ich sie im Meeting richtig einordnen und selbst erklären kann.\n\n' +
        'Gib NUR einen Markdown-Codeblock in genau diesem Format aus (pro Thema ein Block):\n\n' +
        '# Bereich > Thema\n\n## Zusammenfassung\n(2–4 Sätze: wie hängen die Begriffe zusammen, was bedeuten sie in der Praxis)\n\n## Karten\nWas ist <Begriff>? :: Definition in 1–2 Sätzen mit Alltagsvergleich\nWoran erkenne ich im Gespräch, dass <Begriff> gemeint ist, und was frage ich nach? :: ...\n\n' +
        'Regeln: Ordne in passende Themen ein, bevorzugt aus: {{themenliste}}. Keine Fachsprache ohne Erklärung, Code in Backticks.'
    },
    article: {
      name: 'Artikel zusammenfassen',
      vars: '{{themenliste}}',
      text: 'Du bist mein Lerncoach. Ich lerne IT, um Fachgespräche mit Entwickler:innen sicher zu verstehen.\n\n' +
        'Aufgabe: Fasse den folgenden Artikel zusammen und erstelle Karteikarten.\n\n' +
        'Gib NUR einen Markdown-Codeblock in genau diesem Format aus:\n\n' +
        '# Bereich > Thema\n\n## Zusammenfassung\n(5–8 Stichpunkte, Kernaussage zuerst, Fachbegriffe kurz erklärt)\n\n## Karten\nFrage :: Antwort\nFrage :: Antwort\n\n' +
        'Regeln:\n- Ordne den Inhalt einem Thema zu, bevorzugt aus dieser Liste: {{themenliste}}\n' +
        '- Höchstens 15 Karten, eine Idee pro Karte, Antworten in 1–2 Sätzen\n' +
        '- Keine Ja/Nein-Fragen, Code in Backticks\n\nArtikel:\n'
    },
    coach: {
      name: 'Kommunikationscoach',
      vars: '{{thema}}',
      text: 'Du bist mein Kommunikationscoach. Ich will Dinge auf den Punkt bringen – klar, kurz, Antwort zuerst – besonders im Austausch mit Entwickler:innen (Thema: {{thema}}).\n\n' +
        'Ablauf:\n1. Gib mir ein realistisches Szenario (z. B. Status-Update, Rückfrage an das Dev-Team, Absage an jemanden).\n' +
        '2. Ich antworte in höchstens 3 Sätzen.\n' +
        '3. Du gibst Feedback zu: Antwort zuerst? Länge? Klarheit? Verständlichkeit ohne Jargon? Dann eine bessere Version zum Vergleich.\n' +
        '4. Danach das nächste, etwas schwierigere Szenario.\n\nStarte mit Szenario 1.'
    }
  };
  const PROMPT_ORDER = ['chat', 'tutor', 'sparring', 'terms', 'article', 'coach'];

  function promptText(id, custom) {
    const c = custom && typeof custom[id] === 'string' ? custom[id] : '';
    return c.trim() ? c : PROMPT_DEFAULTS[id].text;
  }
  function fillPrompt(tpl, vars) {
    return String(tpl).replace(/\{\{(\w+)\}\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m));
  }
  function materialBlock(title, summary, cards, sumMax, cardMax, fMax, bMax) {
    const mats = [];
    if (summary && summary.trim()) mats.push('Zusammenfassung:\n' + summary.trim().slice(0, sumMax));
    if (cards && cards.length) mats.push('Karten:\n' + cards.slice(0, cardMax).map((c) => '- ' + plain(c.front, fMax) + ' :: ' + plain(c.back, bMax)).join('\n'));
    return mats.length ? title + '\n\n' + mats.join('\n\n') + '\n\n' : '';
  }

  function buildChatPrompt(custom) { return promptText('chat', custom); }

  function buildArticlePrompt(paths, custom) {
    const list = paths && paths.length ? paths.slice(0, 40).join('; ') : 'IT > Web & APIs';
    return fillPrompt(promptText('article', custom), { themenliste: list });
  }

  function buildTermsPrompt(terms, paths, custom) {
    const list = paths && paths.length ? paths.slice(0, 40).join('; ') : 'IT > Web & APIs';
    const items = terms.map((t) => '- ' + t.term + (t.ctx ? ' (Kontext: ' + t.ctx + ')' : '')).join('\n');
    return fillPrompt(promptText('terms', custom), { begriffe: items, themenliste: list });
  }

  function buildTutorPrompt(name, path, summary, cards, custom) {
    return fillPrompt(promptText('tutor', custom), {
      thema: path && path.length ? path.join(' > ') : name,
      material: materialBlock('Mein Material:', summary, cards, 2500, 25, 140, 220)
    });
  }

  function buildCoachPrompt(name, custom) {
    return fillPrompt(promptText('coach', custom), { thema: name || 'IT und Kommunikation' });
  }

  function buildSparringPrompt(name, path, summary, cards, custom) {
    return fillPrompt(promptText('sparring', custom), {
      thema: path && path.length ? path.join(' > ') : (name || 'IT'),
      material: materialBlock('Mein bisheriger Lernstoff (nutze ihn, aber geh gern darüber hinaus):', summary, cards, 2000, 20, 120, 180)
    });
  }

  const api = {
    uid, newCard, normalizeCard, isNew, schedule, fmtInterval, buildQueue, stats,
    isTask, taskType, taskText, deckDay, pickTasks, scheduleTask, taskCoverage,
    childrenOf, subtreeIds, pathOf, aggregate, flatTopics, ensurePath,
    esc, renderMd, plain, clean, wordCount, splitPath, parseMarkdown, noteBody, demoteHeadings, toMarkdown,
    fromJSON, parseAny, toBackup, mergeDecks, shuffle, termCovered,
    FOLLOWUPS, explainRating,
    buildArticlePrompt, buildTermsPrompt, buildTutorPrompt, buildCoachPrompt, buildSparringPrompt,
    buildChatPrompt, PROMPT_DEFAULTS, PROMPT_ORDER, promptText
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
