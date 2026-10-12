/* Starter packs in Recall's own import format (parsed by Core.parseMarkdown). */
window.STARTERS = [
  {
    id: 'it-basics',
    title: 'IT-Grundbegriffe für Produktleute',
    desc: 'Web & APIs, Git, Cloud & DevOps, Datenbanken, Architektur',
    md: `# IT > Web & APIs

## Zusammenfassung

Eine **API** ist die Schnittstelle, über die Programme miteinander sprechen. Das **Frontend** ist, was Nutzer sehen; das **Backend** ist die Logik und Datenhaltung dahinter. Beide reden meist über **REST-APIs** mit **JSON**. Wenn Entwickler von Latenz, Endpoints oder Rate Limits sprechen, geht es um Geschwindigkeit und Belastbarkeit dieser Schnittstellen.

## Karten

Was ist eine API? :: Eine definierte Schnittstelle, über die eine Software Funktionen oder Daten einer anderen nutzen kann – wie eine Speisekarte, aus der man bestellt, ohne die Küche zu kennen.
Was ist der Unterschied zwischen Frontend und Backend? :: Frontend ist alles, was Nutzer sehen und bedienen (Oberfläche). Backend ist die Logik, Datenverarbeitung und Speicherung im Hintergrund.
Was ist ein Endpoint? :: Eine konkrete Adresse einer API, unter der eine bestimmte Funktion erreichbar ist, z. B. /orders für Bestellungen.
Was bedeutet REST? :: Ein verbreiteter Stil für Web-APIs: Ressourcen haben URLs, und man nutzt Standard-HTTP-Methoden wie GET (lesen), POST (anlegen), PUT/PATCH (ändern) und DELETE (löschen).
Was ist JSON? :: Ein textbasiertes, gut lesbares Datenformat, in dem APIs meist Daten austauschen, z. B. {"name": "Anna", "alter": 30}.
Was bedeutet Latenz? :: Die Verzögerung zwischen einer Anfrage und der Antwort – je höher, desto träger fühlt sich das Produkt an.
Was ist ein Rate Limit? :: Eine Obergrenze, wie oft ein Client eine API in einem Zeitraum aufrufen darf – schützt vor Überlastung und Missbrauch.
Was bedeuten die HTTP-Status 404 und 500? :: 404: die angefragte Ressource wurde nicht gefunden. 500: ein Fehler auf dem Server – das Problem liegt im Backend, nicht beim Nutzer.

# IT > Softwareentwicklung & Git

## Zusammenfassung

Entwickler speichern Code in **Git**: Änderungen werden als **Commits** festgehalten, auf **Branches** entwickelt und per **Pull Request** geprüft (**Code Review**) und gemergt. **Technische Schulden** entstehen, wenn man kurzfristig Abkürzungen nimmt; **Refactoring** räumt auf, ohne das Verhalten zu ändern. **Automatisierte Tests** sichern ab, dass nichts kaputtgeht.

## Karten

Was ist Git? :: Ein Versionskontrollsystem, das jede Änderung am Code nachvollziehbar speichert und paralleles Arbeiten mehrerer Personen ermöglicht.
Was ist ein Commit? :: Ein gespeicherter Schnappschuss von Änderungen mit kurzer Beschreibung – ein Schritt in der Historie des Codes.
Was ist ein Branch? :: Eine separate Entwicklungslinie, auf der man Änderungen isoliert baut, ohne den Hauptzweig zu stören.
Was ist ein Pull Request (PR)? :: Ein Vorschlag, Änderungen aus einem Branch in den Hauptzweig zu übernehmen – inklusive Review durch Kolleg:innen.
Was passiert bei einem Merge? :: Die Änderungen eines Branches werden mit dem Zielbranch zusammengeführt.
Was ist Technical Debt (technische Schulden)? :: Die Folgekosten schneller, unsauberer Lösungen: Später dauert jede Änderung länger und ist fehleranfälliger, bis man aufräumt.
Was ist Refactoring? :: Den Code intern verbessern (lesbarer, einfacher), ohne dass sich das sichtbare Verhalten ändert.
Wozu dienen automatisierte Tests? :: Sie prüfen per Code, ob Funktionen noch wie erwartet arbeiten, und fangen Fehler bei Änderungen früh ab.

# IT > Cloud & DevOps

## Zusammenfassung

Statt eigener Server nutzt man oft **Cloud**-Anbieter wie AWS, Azure oder Google Cloud. **CI/CD** baut, testet und veröffentlicht Änderungen automatisch. Mit **Feature Flags** lassen sich Funktionen ein- und ausschalten, ohne neu zu deployen, und **Monitoring** zeigt, ob alles läuft. Läuft ein Release schief, hilft ein **Rollback**.

## Karten

Was ist Cloud Computing? :: Rechenleistung, Speicher und Dienste werden bei Bedarf über das Internet gemietet, statt eigene Server zu betreiben.
Was bedeutet CI/CD? :: Continuous Integration/Delivery: Code-Änderungen werden automatisch zusammengeführt, getestet und bereitgestellt.
Was ist ein Deployment? :: Das Ausrollen einer neuen Softwareversion in eine Umgebung, z. B. Test oder Produktion.
Was ist ein Feature Flag? :: Ein Schalter im Code, der eine Funktion ein- oder ausschaltet – so kann man Features schrittweise ausrollen oder schnell zurücknehmen.
Was ist ein Rollback? :: Das Zurücksetzen auf die vorherige, funktionierende Version, wenn ein Release Probleme macht.
Was bedeutet Staging? :: Eine Testumgebung, die der Produktion möglichst ähnelt und in der vor dem Release geprüft wird.
Was ist Monitoring? :: Systeme laufend beobachten (Fehler, Auslastung, Antwortzeiten), um Probleme früh zu erkennen und zu verstehen.

# IT > Datenbanken

## Zusammenfassung

Datenbanken speichern die Daten eines Produkts. **SQL**-Datenbanken organisieren sie in Tabellen mit festem Schema, **NoSQL**-Datenbanken sind flexibler. Ein **Index** macht Abfragen schneller, ein **Cache** hält häufig genutzte Daten bereit. **Migrationen** ändern die Struktur kontrolliert.

## Karten

Was ist der Unterschied zwischen SQL und NoSQL? :: SQL-Datenbanken speichern Daten in Tabellen mit festem Schema und Beziehungen; NoSQL-Datenbanken sind flexibler (z. B. Dokumente) und skalieren oft leichter.
Was ist ein Datenbankindex? :: Eine Zusatzstruktur, die das Finden von Daten stark beschleunigt – wie ein Stichwortverzeichnis im Buch (kostet etwas Speicher und Schreibzeit).
Was ist ein Cache? :: Ein schneller Zwischenspeicher für häufig benötigte Daten, damit sie nicht jedes Mal neu berechnet oder geladen werden müssen.
Was ist eine Datenbank-Migration? :: Ein kontrolliertes Skript, das die Struktur der Datenbank ändert (z. B. eine neue Spalte) – nachvollziehbar und wiederholbar.

# IT > Architektur

## Zusammenfassung

In einem **Monolith** steckt alles in einer Anwendung; bei **Microservices** ist das System in kleine, unabhängig lieferbare Dienste geteilt. Das macht Teams unabhängiger, aber den Betrieb komplexer. **Skalierung** beschreibt, wie ein System mit mehr Last umgeht, und ein **Single Point of Failure** ist eine Schwachstelle, deren Ausfall alles lahmlegt.

## Karten

Was ist der Unterschied zwischen Monolith und Microservices? :: Monolith: eine große Anwendung, einfach zu starten, aber schwer zu teilen. Microservices: viele kleine, unabhängig deploybare Dienste – mehr Flexibilität, aber mehr Betriebsaufwand.
Was bedeutet Skalierung? :: Ein System so betreiben, dass es mit mehr Nutzern oder Daten zurechtkommt – durch größere Server (vertikal) oder mehr Server (horizontal).
Was ist eine Abhängigkeit (Dependency)? :: Etwas, auf das ein Teil des Systems angewiesen ist, z. B. eine Bibliothek oder ein anderer Dienst; ändert es sich, kann es das eigene Produkt beeinflussen.
Was ist ein Single Point of Failure? :: Eine Komponente, deren Ausfall das ganze System lahmlegt – Architekten versuchen, solche Stellen zu vermeiden.
`
  },
  {
    id: 'pm-basics',
    title: 'Produktmanagement-Basics',
    desc: 'Rolle, Discovery, Priorisierung, Agile, Metriken',
    md: `# Produktmanagement > Grundlagen & Rolle

## Zusammenfassung

Produktmanager:innen sorgen dafür, dass das Team **das Richtige** baut: etwas, das für Nutzer wertvoll, technisch machbar und für das Unternehmen tragfähig ist. Statt nur Features abzuliefern, geht es um **Outcomes**, also messbare Wirkung. Ein **MVP** hilft, Annahmen früh mit echten Nutzern zu prüfen.

## Karten

Was ist die Kernaufgabe von Produktmanagement? :: Sicherstellen, dass das Team Produkte baut, die Nutzern echten Wert bieten und gleichzeitig für das Unternehmen funktionieren.
Was unterscheidet Product Owner und Product Manager? :: Der Product Owner (Scrum-Rolle) verantwortet Backlog und Priorisierung im Team. Der Product Manager denkt breiter: Strategie, Markt, Roadmap. In der Praxis überschneiden sich die Rollen oft.
Was ist der Unterschied zwischen Output und Outcome? :: Output ist, was geliefert wird (Features). Outcome ist die messbare Veränderung im Nutzerverhalten oder Geschäftsergebnis.
Was ist ein MVP? :: Das kleinste Produkt, mit dem man eine Annahme mit echten Nutzern prüfen und daraus lernen kann – kein halbfertiges Endprodukt.
Was bedeutet Product-Market-Fit? :: Das Produkt löst ein echtes Problem für eine Zielgruppe so gut, dass sie es nutzt, behält und weiterempfiehlt.
Welche drei Dimensionen muss ein gutes Produkt vereinen? :: Wünschenswert (Nutzer), machbar (Technik) und wirtschaftlich tragfähig (Business).

# Produktmanagement > Discovery & Research

## Zusammenfassung

In der **Discovery** findet das Team heraus, welche Probleme sich zu lösen lohnen, bevor es baut. Man führt **Nutzerinterviews**, formuliert **Hypothesen** und testet sie früh und günstig, z. B. mit **A/B-Tests**. **Delivery** setzt das Validierte um. Beides läuft idealerweise parallel.

## Karten

Was ist der Unterschied zwischen Discovery und Delivery? :: Discovery: herausfinden, was gebaut werden sollte (Probleme und Lösungen validieren). Delivery: es zuverlässig bauen und ausliefern.
Was ist eine Hypothese im Produktkontext? :: Eine überprüfbare Annahme, z. B. „Wenn wir X tun, steigt Y, weil Z“ – sie wird mit Daten oder Tests bestätigt oder widerlegt.
Wie führt man ein gutes Nutzerinterview? :: Offene Fragen nach konkretem Verhalten in der Vergangenheit stellen („Erzähl vom letzten Mal, als …“), nicht nach Meinungen oder Wünschen, und nichts verkaufen.
Was sind Jobs to be Done (JTBD)? :: Ein Ansatz, der fragt, welchen „Job“ Nutzer in einer Situation erledigen wollen, statt nach Demografie zu segmentieren.
Was ist ein A/B-Test? :: Zwei Varianten werden zufällig verschiedenen Nutzergruppen gezeigt, um mit Daten zu sehen, welche besser abschneidet.
Was ist eine Persona? :: Ein fiktives, aus Recherche abgeleitetes Profil einer typischen Nutzergruppe, das dem Team hilft, deren Bedürfnisse im Blick zu behalten.

# Produktmanagement > Priorisierung

## Zusammenfassung

Ressourcen sind begrenzt, deshalb wird priorisiert. Frameworks wie **RICE**, **MoSCoW** oder das **Kano-Modell** machen Entscheidungen nachvollziehbar. Wichtig: Nicht das Framework entscheidet, sondern die Begründung dahinter. Eine **Roadmap** zeigt, welche Themen in welcher Reihenfolge angegangen werden, das **Backlog** sammelt alles Offene.

## Karten

Was bedeutet RICE? :: Priorisierungs-Score: (Reach × Impact × Confidence) ÷ Effort – wie viele Nutzer betroffen sind, wie stark die Wirkung ist, wie sicher die Schätzung ist und wie hoch der Aufwand.
Was ist MoSCoW? :: Einteilung in Must have, Should have, Could have und Won't have – hilft, den Umfang für einen Zeitraum festzulegen.
Was ist das Kano-Modell? :: Unterscheidet Basis-, Leistungs- und Begeisterungsmerkmale: Fehlende Basics frustrieren, Begeisterungsmerkmale überraschen positiv.
Was ist eine Roadmap? :: Ein Plan, der zeigt, welche Themen oder Probleme das Team in welcher Reihenfolge angeht – idealerweise nach Zielen statt nach festen Feature-Terminen.
Was ist ein Backlog? :: Die priorisierte Liste aller offenen Aufgaben, Ideen und Anforderungen für ein Produkt.

# Produktmanagement > Agile & Delivery

## Zusammenfassung

Agile Teams arbeiten in kurzen Zyklen (**Sprints**) und liefern in kleinen Schritten. In **Scrum** gibt es feste Rituale: Planning, Daily, Review und Retrospektive. **User Stories** beschreiben Anforderungen aus Nutzersicht, die **Definition of Done** legt fest, wann etwas fertig ist. **Story Points** und **Velocity** helfen bei der Planung, nicht beim Vergleich von Teams.

## Karten

Was ist ein Sprint? :: Ein fest begrenzter Zeitraum (meist 1–4 Wochen), in dem das Team einen vereinbarten Umfang umsetzt.
Was ist eine User Story? :: Eine Anforderung aus Nutzersicht, typischerweise: „Als [Rolle] möchte ich [Ziel], damit [Nutzen].“
Was ist die Definition of Done? :: Die gemeinsam vereinbarte Checkliste, die erfüllt sein muss, damit eine Aufgabe als fertig gilt (z. B. getestet, reviewed, dokumentiert).
Was sind Story Points? :: Eine relative Größe für den Gesamtaufwand einer Aufgabe (Komplexität, Unsicherheit, Umfang) – keine Stunden.
Was bedeutet Velocity? :: Die Menge an Story Points, die ein Team im Schnitt pro Sprint schafft – dient der Planung, nicht dem Vergleich von Teams.
Wofür ist die Retrospektive da? :: Das Team reflektiert, was gut lief und was nicht, und vereinbart konkrete Verbesserungen für den nächsten Sprint.
Was ist Backlog Refinement? :: Regelmäßiges Klären, Schneiden und Schätzen von Backlog-Einträgen, damit sie bereit für die Umsetzung sind.

# Produktmanagement > Metriken & Analytics

## Zusammenfassung

Gute Produktarbeit braucht Zahlen. Die **North Star Metric** bündelt den Kernwert des Produkts, **OKRs** verbinden Ziele mit messbaren Ergebnissen. **Retention** und **Churn** zeigen, ob Nutzer bleiben. Vorsicht vor **Vanity Metrics**, die gut aussehen, aber keine Entscheidung leiten.

## Karten

Was ist eine North Star Metric? :: Die eine Kennzahl, die den Kernnutzen des Produkts für Nutzer am besten abbildet und langfristiges Wachstum anzeigt.
Was sind OKRs? :: Objectives and Key Results: ein ambitioniertes, qualitatives Ziel (Objective) mit 2–5 messbaren Ergebnissen (Key Results).
Was ist Retention? :: Der Anteil der Nutzer, der nach einem bestimmten Zeitraum noch aktiv ist – zeigt, ob das Produkt Wert liefert.
Was bedeutet Churn? :: Die Rate, mit der Kunden oder Nutzer ein Produkt verlassen oder kündigen.
Was ist eine Vanity Metric? :: Eine Zahl, die gut aussieht, aber keine Entscheidungen leitet oder mit Wert verknüpft ist, z. B. reine Downloads oder Seitenaufrufe.
Was ist die Conversion Rate? :: Der Anteil der Nutzer, die eine gewünschte Aktion abschließen (z. B. Anmeldung oder Kauf), bezogen auf alle, die die Chance dazu hatten.
`
  },
  {
    id: 'comm-basics',
    title: 'Kommunikation: Auf den Punkt',
    desc: 'Strukturen für klare Antworten und Rückfragen im Team',
    md: `# Kommunikation > Auf den Punkt

## Zusammenfassung

Gute Kommunikation heißt: **Antwort zuerst**, dann die Begründung. Wer das Wichtigste in einem Satz sagen kann, hat es verstanden. Strukturen wie das **Pyramidenprinzip**, **SCQA** oder **BLUF** helfen, auch unter Zeitdruck klar zu bleiben. Nachfragen, wenn man etwas nicht versteht, ist ein Zeichen von Professionalität – entscheidend ist, wie man fragt.

## Karten

Was besagt das Pyramidenprinzip? :: Mit der Kernaussage beginnen, dann 2–3 stützende Argumente, darunter die Details – der Zuhörer bekommt zuerst das Wichtigste.
Was bedeutet SCQA? :: Situation, Complication, Question, Answer: erst die bekannte Lage, dann das Problem, die sich daraus ergebende Frage und schließlich die Antwort.
Was bedeutet BLUF? :: Bottom Line Up Front: Das Ergebnis oder die Bitte steht im ersten Satz, Hintergründe folgen danach.
Wie fasst man in drei Sätzen zusammen? :: 1) Kernaussage, 2) wichtigster Grund oder Beleg, 3) was jetzt passieren soll (nächster Schritt oder Entscheidung).
Wie fragt man höflich nach, wenn man Fachsprache nicht versteht? :: Zum Beispiel: „Kannst du das kurz für jemanden ohne Technik-Hintergrund erklären?“ oder „Was heißt das konkret für Nutzer und Zeitplan?“
Welche Rückfragen klären Aufwandsaussagen aus der Entwicklung? :: „Was ist die größte Unsicherheit?“, „Was lässt sich in kleinere Schritte schneiden?“, „Was wäre eine einfachere Variante?“ und „Welche Annahmen stecken in der Schätzung?“
`
  }
];
