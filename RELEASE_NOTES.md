VIA-L 0.2.5 ist ein Wartungs- und Sicherheitsupdate.

- Wartungs- und Sicherheitsupdate: Electron 44.7.0 → 44.9.1; darin werden kompromittierte eMudhra-Zwischenzertifikate gesperrt.
- Playwright 1.64.0 → 1.64.1 aktualisiert (nur Testwerkzeug).
- Die App-Funktionen bleiben unverändert.

**Downloads:**

- Apple Silicon: `VIA-L-0.2.5-macOS-arm64.zip`.
- Intel: `VIA-L-0.2.5-macOS-x64.zip`.

Beide Varianten benötigen **macOS 13 oder neuer** und eine Internetverbindung. Sie sind mit Developer ID signiert, von Apple notarisiert und mit angeheftetem Ticket geprüft. Zu jedem ZIP gehört eine SHA-256-Prüfsumme. Zum Aktualisieren VIA-L regulär beenden, das passende ZIP entpacken und **VIA-L.app** im Programme-Ordner ersetzen. Websitedaten und Einstellungen bleiben erhalten; nach dem Neustart die Tastatur erneut autorisieren.

Automatisiert am 0.2.5-Quellstand geprüft: 19 Tests, 23 App-Prüfungen, Fokus-/Reset-Verhalten und drei Fenstergrößen erfolgreich. npm audit meldet keine bekannten Schwachstellen.

**Erfolgreich in der Praxis getestet:** Der Nutzer hat den neuen 0.2.5-Build mit **VIA, Vial, Venom und Wootility** geprüft und bestätigt, dass alle vier Tools funktionieren.
