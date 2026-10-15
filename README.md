# Recall

Private Lern-App (PWA) für IT und Produktmanagement: Themenbaum, Zusammenfassungen zum Nachlesen,
Karteikarten mit Wiederholungsplan, Wortspeicher, Erklär-Training, Quiz und Kommunikationsübungen.
Alle Daten bleiben auf dem Handy (localStorage). Kein Konto, kein Tracking, kein Build-Schritt.

## Aufbau der App

| Tab | Zweck |
|---|---|
| **Start** | Heute fällige Karten, Bereiche (Produktmanagement, IT, Kommunikation) mit Unterthemen, Suche |
| **Wörter** | Unbekannte Begriffe aus Meetings sofort festhalten, später erklären lassen und zu Karten machen |
| **Üben** | Erklär-Training (fragt nach), „Auf den Punkt“ (kurz zusammenfassen), Meeting-Toolkit, Prompts für Claude |
| **Import** | Obsidian-Notizen, Dateien, Links, Artikel → Karten |
| **Mehr** | Backup, Export, Einstellungen |

Jedes **Thema** hat: Zusammenfassung (Nachlesen + Glossar), Karten, Unterthemen, Lernen, Erklären, Quiz.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html`, `styles.css` | Oberfläche (hell, Schwarz/Weiß/Grau, rote Akzente) |
| `core.js` | Logik: Themenbaum, Wiederholungsplan, Import/Export, Prompts |
| `app.js` | Ansichten und Bedienung |
| `sw.js`, `manifest.webmanifest`, `*.png` (Icons) | Offline-Betrieb und Installation aufs Handy |

## Aufs Handy bringen

1. Ordner in dein Git-Repo legen und bei einem Static-Host veröffentlichen (kostenlos, z. B. Cloudflare Pages oder Netlify; GitHub Pages geht bei privaten Repos nur mit bezahltem Plan). Die Seite enthält nur Code, keine Lerndaten.
2. Adresse auf dem Handy öffnen.
   - iPhone: Safari → Teilen → **Zum Home-Bildschirm**
   - Android: Chrome → ⋮ → **App installieren**
3. Danach läuft sie offline wie eine App.

Lokal testen: `python3 -m http.server 8000` im Ordner, dann `http://localhost:8000`.

## Tagesaufgaben (Mini-Aufgaben statt Karten)

Zeilen im Format `[Art] Aufgabe :: Lösung` sind Aufgaben (z. B. `[Rätsel]`, `[Fehler finden]`, `[Situation]`, `[Code lesen]`). Sie erscheinen nicht in den Karten-Sitzungen, sondern als **Tagesaufgaben** auf dem Start:

- Pro Tag höchstens 5 (einstellbar unter **Mehr**), die Arten wechseln sich ab.
- Du diktierst die Antwort (Mikrofon der Tastatur), siehst die Lösung und bewertest dich: *Geschafft*, *Halb*, *Nicht*. Nicht Geschaffte kommen am nächsten Tag wieder, davor wird eine andere Aufgabe desselben Themas versucht.
- Themen, die am längsten nicht dran waren, kommen zuerst. Auf dem Start siehst du, wie viele Themen schon geübt sind.
- Die Aufgaben kommen aus deinen echten Lerneinheiten: Claude gibt sie dir am Ende jeder Einheit als Markdown-Block, den du unter **Import** einfügst.

## Karten-Format (Obsidian-kompatibel)

```
# Bereich > Thema

## Zusammenfassung
Text zum Nachlesen (bis zur nächsten # oder ## Überschrift)

## Karten
Frage :: Antwort
- Auch in Listen :: funktioniert

Mehrzeilige Frage
?
Antwort über
mehrere Zeilen

Q: Frage
A: Antwort
```

- `# A > B` legt Thema B unter Bereich A an; mehrere `#`-Überschriften pro Datei sind möglich.
- `::` braucht Leerzeichen drumherum (so bleibt `std::vector` im Text unangefährdet).
- Codeblöcke (```) bleiben erhalten, `[[Wikilinks]]` werden bereinigt, `#flashcards` wird entfernt.
- Beim Import kannst du ein Zielthema wählen und den ganzen Text zusätzlich als Zusammenfassung speichern (für Obsidian-Notizen, die du nachlesen willst).
- Export: pro Thema (inkl. Unterthemen) als `.md` im selben Format oder als JSON; Gesamt-Backup unter **Mehr**.

## Workflows mit Claude (kostenlos, im Chat)

- **Artikel → Zusammenfassung + Karten:** Import → „Prompt kopieren“, Artikel anhängen, Antwort einfügen.
- **Unbekannte Wörter:** Wörter → „Alle an Claude“, Antwort unter Import einfügen. Passende Wörter werden automatisch erledigt.
- **Wirklich verstehen:** Thema → „Tutor-Prompt kopieren“. Claude fragt im Chat nach, bis du es erklären kannst, und liefert am Ende Karten für deine Lücken.
- **Kommunikation:** Üben → „Kommunikations-Coach“ für Feedback zu deinen Formulierungen.

Das App-eigene Erklär-Training und „Auf den Punkt“ funktionieren ohne KI: Du vergleichst deine Antwort selbst mit der Referenz; bei „noch nicht ganz“ kommt eine Nachfrage mit neuem Blickwinkel.

## Hinweise

- Auf dem iPhone hat die installierte App einen eigenen Speicher, getrennt von Safari. Importiere deshalb direkt in der installierten App und mach regelmäßig ein Backup (**Mehr → Backup**).
- Teilen-Links (`…#import=…`) in das Feld **Import → Link** der installierten App einfügen.
- Raw-Links aus privaten GitHub-Repos lassen sich nicht laden; dafür Datei-Import nutzen.


## Reiter
Start · Themen · Wörter · Kommunikation · Import · Backup · Optionen.
Keine Vorlagen mehr. Unter Optionen → Prompts kannst du alle Texte für den Chat ansehen, ändern und zurücksetzen.
Dateien: index.html, styles.css, core.js, comm.js, app.js, sw.js, manifest.webmanifest, 3 Icons.
