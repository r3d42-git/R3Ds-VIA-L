VIA-L 0.2.3 ist ein Wartungsrelease für Apple Silicon und Intel.

- Die eingebettete Electron-Laufzeit wurde von 44.5.1 auf 44.7.0 aktualisiert. Sie bringt Fehlerkorrekturen und aktualisierte Chromium-Komponenten mit; die Bedienung von VIA-L bleibt unverändert.
- Build- und Testwerkzeuge wurden aktualisiert. Wöchentliche Abhängigkeitsüberwachung und zusätzliche Sicherheitsprüfungen unterstützen die weitere Wartung.

**Downloads:**

- **Apple Silicon:** `VIA-L-0.2.3-macOS-arm64.zip` für Macs mit Apple-Chip.
- **Intel:** `VIA-L-0.2.3-macOS-x64.zip` für Intel-Macs (x86_64).

Beide Varianten benötigen **macOS 13 oder neuer** und eine Internetverbindung. Sie sind mit Developer ID signiert und von Apple notarisiert; das Ticket ist an der jeweiligen App angeheftet. Zu jedem ZIP gehört eine SHA-256-Prüfsumme.

Zum Aktualisieren VIA-L regulär beenden, das zum Mac passende ZIP entpacken und **VIA-L.app** im Programme-Ordner ersetzen. Websitedaten und Einstellungen bleiben erhalten. Nach dem Neustart die Tastatur erneut autorisieren.

Build, automatisierte Funktionsprüfungen und die fertigen Pakete werden geprüft: Signatur, Notarisierung, Gatekeeper sowie sämtliche gebündelten Mach-O-Architekturen. Eine erneute vollständige WebHID-Hardwareabnahme auf einem physischen Intel-Mac ist nicht Teil dieser automatisierten Prüfung.

Details zur Laufzeit: [Electron 44.7.0 Release Notes](https://github.com/electron/electron/releases/tag/v44.7.0).
