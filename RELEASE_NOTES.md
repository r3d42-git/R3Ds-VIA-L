VIA-L 0.2.7 ist ein Wartungsrelease mit aktualisierter Laufzeit: Electron 45.0.0 (zuvor 44.9.1), Chromium 156.0.8078.48 und Node.js 24.22.0. Änderungen an der Anwendungslogik gab es nicht.

- Die Paketierung unterstützt jetzt auch Electrons verzögerten Binärdownload nach einer frischen Installation der Build-Abhängigkeiten.
- Der Nutzer hat den Electron-45-Testbuild mit **VIA, Vial, Venom und Wootility** geprüft und bestätigt, dass alle vier Tools funktionieren.
- Bekannter Hinweis: Wootility benötigt in der Nutzerumgebung derzeit zwei Verbindungsversuche, auch nach vollständigem Beenden und Neustart. Die Ursache ist noch ungeklärt. Der Wartungsrelease wird auf Wunsch des Nutzers veröffentlicht; das Verhalten wird für eine spätere gezielte Untersuchung beschrieben.

Mit Electron 45 geprüft: 23 Tests, 23 App-Prüfungen, Fokus-/Reset-Verhalten und drei Fenstergrößen erfolgreich. Vials originale Speichern-/Laden-Funktionen wurden mit nativen Dateidialogen und einer synthetischen Unicode-Layoutdatei geprüft; der Inhalt blieb bytegenau erhalten. `npm audit` meldet keine bekannten Schwachstellen.

**Downloads:**

- Apple Silicon: `VIA-L-0.2.7-macOS-arm64.zip`.
- Intel: `VIA-L-0.2.7-macOS-x64.zip`.

Beide Varianten benötigen **macOS 13 oder neuer** und eine Internetverbindung. Sie sind mit Developer ID signiert, von Apple notarisiert und mit angeheftetem Ticket geprüft. Zu jedem ZIP gehört eine SHA-256-Prüfsumme. Zum Aktualisieren VIA-L regulär beenden, das passende ZIP entpacken und **VIA-L.app** im Programme-Ordner ersetzen. Websitedaten und Einstellungen bleiben erhalten; nach dem Neustart die Tastatur erneut autorisieren.
