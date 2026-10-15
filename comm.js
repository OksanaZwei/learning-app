/* Recall – Kommunikationsübungen (Startauswahl, später im Chat erweiterbar). */
window.COMM_EX = [
  {
    id: 'prep', name: 'Zufallsthema', desc: 'Eine Minute frei sprechen',
    how: 'Sprich ein bis zwei Minuten. Aufbau: Punkt (deine Aussage), Grund, Beispiel, Punkt (Aussage noch einmal).',
    prompts: [
      'Warum ist ein Backup wichtig?',
      'Warum sollte Code vor dem Zusammenführen von jemand anderem geprüft werden?',
      'Warum sind kurze Meetings besser als lange?',
      'Warum lohnt es sich, Fehler offen anzusprechen?',
      'Warum sollte man Passwörter nicht wiederverwenden?',
      'Warum ist Dokumentation wichtig?',
      'Warum sind kleine Releases besser als große?',
      'Warum sollte man nachfragen, wenn man etwas nicht versteht?',
      'Warum braucht ein Team gemeinsame Regeln?',
      'Warum sind automatische Tests nützlich?',
      'Warum ist Zuhören wichtiger als Reden?',
      'Warum sollte man Aufgaben schätzen, bevor man sie anfängt?',
      'Warum sind Logs hilfreich?',
      'Warum ist regelmäßiges Lernen besser als alles auf einmal?',
      'Warum ist der erste Satz in einem Meeting so wichtig?'
    ]
  },
  {
    id: 'pause', name: 'Pause vor der Antwort', desc: 'Ruhig und ohne Hast antworten',
    how: 'Atme ein, zähle innerlich bis zwei, dann sprich in ganzen Sätzen. Die Pause wirkt ruhig, nicht unsicher.',
    prompts: [
      'Was hast du gestern gelernt?',
      'Was ist dein wichtigstes Ziel diese Woche?',
      'Woran arbeitest du gerade?',
      'Was war zuletzt schwierig für dich?',
      'Was würdest du im Team gerne ändern?',
      'Welches Wort hast du heute neu gelernt?',
      'Wie würdest du jemandem deine Arbeit erklären?',
      'Was hat diese Woche gut geklappt?',
      'Was möchtest du gerne besser können?',
      'Wie bereitest du dich auf ein Meeting vor?',
      'Was möchtest du in einem Jahr können?',
      'Welche Frage würdest du gerne dem Senior stellen?',
      'Was war deine beste Entscheidung in letzter Zeit?',
      'Was hilft dir, dich zu konzentrieren?',
      'Was würdest du einem neuen Kollegen als Erstes sagen?'
    ]
  },
  {
    id: 'mirror', name: 'Zurückspiegeln', desc: 'Erst wiederholen, dann antworten',
    how: 'Sag in einem Satz, was du verstanden hast: „Du meinst, dass …?“ Erst danach antwortest du.',
    prompts: [
      'Kollege: „Der Build ist schon wieder rot, und ich weiß nicht, woran es liegt.“',
      'Kollegin: „Das Feature ist fast fertig, aber ich warte noch auf die Freigabe.“',
      'Chef: „Wir müssen das bis Freitag liefern, aber der Umfang ist noch unklar.“',
      'Kollege: „Ich glaube, wir sollten die Datenbank wechseln.“',
      'Kollegin: „Die Tests laufen lokal, aber nicht in der Pipeline.“',
      'Kunde: „Die Seite ist manchmal langsam, aber nicht immer.“',
      'Kollege: „Ich habe die Änderung gestern gemerged, und seitdem gibt es Fehler.“',
      'Kollegin: „Ich bin mir nicht sicher, ob wir dafür einen Webhook oder Polling nehmen.“',
      'Chef: „Ich brauche eine Schätzung, aber nur grob.“',
      'Kollege: „Das ist ein Problem mit den Berechtigungen, glaube ich.“',
      'Kollegin: „Wir haben zu viele Meetings, und niemand kommt zum Arbeiten.“',
      'Kollege: „Der Alarm ging heute Nacht dreimal los, aber es war nichts.“',
      'Kollegin: „Die Anforderung hat sich schon wieder geändert.“',
      'Kollege: „Ich würde das gerne erst lokal ausprobieren, bevor wir es ausrollen.“',
      'Kollegin: „Ich war im Urlaub und verstehe die neue Architektur nicht.“'
    ]
  },
  {
    id: 'analogy', name: 'Analogie', desc: 'Mit einem Alltagsvergleich erklären',
    how: 'Such etwas aus dem Alltag, das genauso funktioniert, und sag dazu, wo der Vergleich hinkt. Beispiel: Eine API ist wie ein Kellner: Du bestellst, er holt es aus der Küche.',
    prompts: [
      'Erkläre mit einem Alltagsvergleich: API',
      'Erkläre mit einem Alltagsvergleich: Datenbank',
      'Erkläre mit einem Alltagsvergleich: Cache',
      'Erkläre mit einem Alltagsvergleich: Warteschlange (Queue)',
      'Erkläre mit einem Alltagsvergleich: Webhook',
      'Erkläre mit einem Alltagsvergleich: Server',
      'Erkläre mit einem Alltagsvergleich: Firewall',
      'Erkläre mit einem Alltagsvergleich: Git-Branch',
      'Erkläre mit einem Alltagsvergleich: Container',
      'Erkläre mit einem Alltagsvergleich: Datenbank-Index',
      'Erkläre mit einem Alltagsvergleich: Load Balancer',
      'Erkläre mit einem Alltagsvergleich: Verschlüsselung',
      'Erkläre mit einem Alltagsvergleich: CI/CD-Pipeline',
      'Erkläre mit einem Alltagsvergleich: Backup',
      'Erkläre mit einem Alltagsvergleich: Cloud'
    ]
  },
  {
    id: 'laie', name: 'Für Laien erklären', desc: 'So, dass es jeder versteht',
    how: 'Keine Fachwörter. Kurze Sätze. Ein Beispiel aus dem Alltag. Frag dich am Ende: Hätte das auch jemand ohne IT verstanden?',
    prompts: [
      'Erkläre jemandem ohne IT-Wissen: Was ist die Cloud?',
      'Erkläre jemandem ohne IT-Wissen: Was ist ein Passwortmanager?',
      'Erkläre jemandem ohne IT-Wissen: Was passiert, wenn ich eine Webseite aufrufe?',
      'Erkläre jemandem ohne IT-Wissen: Was ist ein Bug?',
      'Erkläre jemandem ohne IT-Wissen: Was ist ein Update?',
      'Erkläre jemandem ohne IT-Wissen: Was ist eine Schnittstelle?',
      'Erkläre jemandem ohne IT-Wissen: Was ist eine Datenbank?',
      'Erkläre jemandem ohne IT-Wissen: Was ist künstliche Intelligenz?',
      'Erkläre jemandem ohne IT-Wissen: Was ist ein Server?',
      'Erkläre jemandem ohne IT-Wissen: Was ist ein Hackerangriff?',
      'Erkläre jemandem ohne IT-Wissen: Was ist ein Backup?',
      'Erkläre jemandem ohne IT-Wissen: Was bedeutet Verschlüsselung?',
      'Erkläre jemandem ohne IT-Wissen: Was ist ein Algorithmus?',
      'Erkläre jemandem ohne IT-Wissen: Was bedeutet Open Source?',
      'Erkläre jemandem ohne IT-Wissen: Was heißt „es ist deployed“?'
    ]
  },
  {
    id: 'change', name: 'Änderung erklären', desc: 'Drei Sätze: was, warum, wie',
    how: 'Satz 1: Was wurde geändert. Satz 2: Warum. Satz 3: Wie, oder was man prüfen sollte.',
    prompts: [
      'Der Button im Formular ist jetzt gesperrt, bis alle Pflichtfelder ausgefüllt sind.',
      'Die Suche liefert jetzt nur noch Ergebnisse aus dem aktuellen Jahr.',
      'Passwörter werden jetzt verschlüsselt in der Datenbank gespeichert.',
      'Die Startseite lädt jetzt halb so lange, weil Bilder kleiner sind.',
      'Fehlgeschlagene Zahlungen werden jetzt automatisch noch einmal versucht.',
      'Die Pipeline läuft jetzt nur noch, wenn alle Tests grün sind.',
      'Nutzer bekommen jetzt eine E-Mail, wenn ihr Konto gesperrt wird.',
      'Die Preise werden jetzt in Cent statt in Euro gespeichert.',
      'Ein neuer Alarm meldet sich, wenn die Datenbank fast voll ist.',
      'Die Anmeldung merkt sich jetzt das Gerät für 30 Tage.',
      'Der Export liefert jetzt auch eine CSV-Datei.',
      'Eine alte Schnittstelle wurde abgeschaltet.',
      'Die Konfiguration liegt jetzt nicht mehr im Code, sondern in der Umgebung.',
      'Die Fehlermeldung im Formular ist jetzt verständlicher formuliert.',
      'Die Anwendung startet jetzt in einem Container statt direkt auf dem Server.'
    ]
  },
  {
    id: 'filler', name: 'Füllwörter zählen', desc: 'Aufnehmen, zählen, noch einmal',
    how: 'Nimm dich mit der Sprachmemo-App auf, höre es an und zähle „äh“, „also“, „irgendwie“. Dann sprich es noch einmal und ersetze sie durch eine kurze Pause.',
    prompts: [
      'Erkläre eine Minute lang, was du heute gemacht hast.',
      'Erkläre eine Minute lang, wie du einen Arbeitstag planst.',
      'Erkläre eine Minute lang, wie du zur Arbeit kommst.',
      'Erkläre eine Minute lang, was an deiner Arbeit schwierig ist.',
      'Erkläre eine Minute lang, was ein Webhook ist.',
      'Erkläre eine Minute lang, was du über Bits und Bytes gelernt hast.',
      'Erkläre eine Minute lang, was ein Commit ist.',
      'Erkläre eine Minute lang, wie du etwas Neues lernst.',
      'Erkläre eine Minute lang, wie du ein Rezept kochst.',
      'Erkläre eine Minute lang, was du dir für nächste Woche vornimmst.',
      'Erkläre eine Minute lang, was eine Datenbank macht.',
      'Erkläre eine Minute lang, warum du IT lernst.',
      'Erkläre eine Minute lang, wie du mit Stress umgehst.',
      'Erkläre eine Minute lang, was ein Team gut macht.',
      'Erkläre eine Minute lang, was du gestern gelernt hast.'
    ]
  },
  {
    id: 'recap', name: 'Tagesrückblick', desc: 'Den Tag in zwei Sätzen',
    how: 'Satz 1: Was ist herausgekommen? Satz 2: Was kommt als Nächstes? Keine Fachwörter.',
    prompts: [
      'Fasse deinen Tag in zwei Sätzen zusammen, für deine Großmutter.',
      'Fasse deinen Tag in zwei Sätzen zusammen, für einen neuen Kollegen.',
      'Fasse deinen Tag in zwei Sätzen zusammen, für deine Chefin.',
      'Fasse deinen Tag in zwei Sätzen zusammen, für eine Freundin.',
      'Fasse deinen Tag in zwei Sätzen zusammen, für den Kunden.',
      'Fasse deine Woche in zwei Sätzen zusammen, für das Team.',
      'Fasse deinen Tag in zwei Sätzen zusammen, für den Senior-Entwickler.',
      'Fasse deinen Tag in zwei Sätzen zusammen, für jemanden ohne IT-Wissen.',
      'Fasse das, was du heute gelernt hast, in zwei Sätzen zusammen.',
      'Fasse das letzte Meeting in zwei Sätzen zusammen.',
      'Fasse deine wichtigste Aufgabe heute in zwei Sätzen zusammen.',
      'Fasse ein Problem, das du heute hattest, in zwei Sätzen zusammen.',
      'Fasse einen Erfolg dieser Woche in zwei Sätzen zusammen.',
      'Fasse deinen Plan für morgen in zwei Sätzen zusammen.',
      'Fasse das, was dir heute neu war, in zwei Sätzen zusammen.'
    ]
  }
];
