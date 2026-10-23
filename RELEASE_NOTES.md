VIA-L 0.2.4 ergänzt Venom und Wootility neben VIA und Vial.

- Alle vier Tastatur-Tools sind direkt über die App-Leiste erreichbar. Bei kleinen Fenstern benötigt die Leiste weniger Platz.
- Jedes Tool hat eigene Websitedaten, Zoom-Einstellungen und einen separaten Reset. Vorhandene Einstellungen bleiben erhalten.
- Wootility verwendet den WebHID-Verbindungsablauf der Webseite. Blockierte eingebettete Fremdseiten unterbrechen die Einrichtung nicht mehr mit einem externen Linkdialog; externe Hauptnavigationen benötigen weiterhin eine Bestätigung.

**Downloads:**

- **Apple Silicon:** `VIA-L-0.2.4-macOS-arm64.zip` für Macs mit Apple-Chip.
- **Intel:** `VIA-L-0.2.4-macOS-x64.zip` für Intel-Macs (x86_64).

Beide Varianten benötigen **macOS 13 oder neuer** und eine Internetverbindung. Sie sind mit Developer ID signiert und von Apple notarisiert; das Ticket ist an der jeweiligen App angeheftet. Zu jedem ZIP gehört eine SHA-256-Prüfsumme.

Zum Aktualisieren VIA-L regulär beenden, das zum Mac passende ZIP entpacken und **VIA-L.app** im Programme-Ordner ersetzen. Websitedaten und Einstellungen bleiben erhalten. Nach dem Neustart die Tastatur erneut autorisieren.

Geprüft: 19 automatisierte Tests, 23 App-Prüfungen, Fokus-/Reset-Verhalten und drei Fenstergrößen. Wooting 60HE+ und VENOM65HE wurden in der Geräteauswahl erkannt; die Auswahl wurde ohne Verbindung abgebrochen. Tatsächliches Lesen/Schreiben der Tastaturen und ein Start auf einem sauberen Zweit-Mac sind nicht Teil dieser Prüfung.
