VIA-L 0.2.6 behebt das Speichern und Laden von Vial-Layouts im `.vil`-Format.

- Vial konnte ausgewählte Layoutdateien zuvor wegen verweigerter Dateisystemberechtigung als Dateien mit 0 Byte speichern. Die aktive Vial-Ansicht darf nun einzelne, im Dateidialog ausgewählte Dateien lesen und schreiben. Der Zugriff auf Verzeichnisse bleibt gesperrt.
- Der Nutzer hat den korrigierten lokalen Build getestet und für gut befunden. Bestätigt ist der Vial-Layout-Fix.
- Die ausschließlich für die Paketierung verwendete Abhängigkeit `undici` wurde auf die Sicherheitskorrektur 7.30.1 aktualisiert. Electron bleibt bei 44.9.1.

Automatisiert geprüft: 20 Tests, 23 App-Prüfungen, Fokus-/Reset-Verhalten und drei Fenstergrößen erfolgreich. `npm audit` meldet keine bekannten Schwachstellen.

**Downloads:**

- Apple Silicon: `VIA-L-0.2.6-macOS-arm64.zip`.
- Intel: `VIA-L-0.2.6-macOS-x64.zip`.

Beide Varianten benötigen **macOS 13 oder neuer** und eine Internetverbindung. Sie sind mit Developer ID signiert, von Apple notarisiert und mit angeheftetem Ticket geprüft. Zu jedem ZIP gehört eine SHA-256-Prüfsumme. Zum Aktualisieren VIA-L regulär beenden, das passende ZIP entpacken und **VIA-L.app** im Programme-Ordner ersetzen. Websitedaten und Einstellungen bleiben erhalten; nach dem Neustart die Tastatur erneut autorisieren.
