# R3Ds VIA-L

<img src="assets/AppIcon.png" alt="R3Ds VIA-L" width="128">

[English](README.en.md)

**R3Ds VIA-L**, kurz **VIA-L**, ist eine eigenständige macOS-App für die **Online-Versionen** von [VIA](https://usevia.app/) und [Vial](https://vial.rocks/). Sie lädt die Originalseiten in einer eingebetteten Chromium-Ansicht und stellt eine lokale Auswahl für WebHID-Geräte bereit. VIA-L ist ein unabhängiges Projekt und gehört weder zu VIA noch zu Vial. Die Webseiten und ihre Tastaturfunktionen sind nicht Teil dieses Repositories oder der App. Eine Internetverbindung ist erforderlich.

Die aktuelle Version ist **0.2.0** für Apple Silicon ab macOS 13. Das signierte und notarisierte ZIP wird nach Veröffentlichung unter [Releases](https://github.com/r3d42-git/R3Ds-VIA-L/releases/latest) angeboten. Es gibt keinen automatischen Updater. Für neue Versionen die Release-Seite prüfen und die App nach regulärem Beenden austauschen. Websitedaten und Einstellungen bleiben im bisherigen macOS-Benutzerprofil erhalten.

## Verwendung

1. VIA oder Vial in der oberen Leiste wählen. Beim Wechsel wird die bisherige Webansicht geschlossen; ungesicherte Änderungen auf der Webseite können verloren gehen.
2. Auf der Originalseite eine Verbindung anfordern: bei VIA über **„Gerät autorisieren +“**, bei Vial über **„Start Vial“**. In VIA-L das angebotene Gerät markieren und **„Verbinden“** wählen. Die Auswahl gibt kein Gerät ohne Bestätigung frei.
3. Import und Export mit den Funktionen der jeweiligen Webseite durchführen. Für eine VIA-JSON-Datei die originale Sideload-Funktion von VIA verwenden. VIA-L interpretiert oder verändert Layoutdateien nicht selbst.

Die App-Leiste ist während eines Tastentests bewusst aus der Tab-Reihenfolge genommen und per Maus bedienbar. Einstellungen und Geräteauswahl bleiben per Tastatur bedienbar. Beim Löschen von Websitedaten muss der Name des betroffenen Tools exakt eingegeben werden. Der Reset betrifft nur dieses Tool.

Ein Nutzer hat die Verbindung mit VIA, das Sideloading einer VIA-JSON-Datei und Vial in der App erprobt. Eine vollständige Prüfung des Schreibens und Wiederherstellens eines Tastaturlayouts für verschiedene Geräte und Firmwarestände liegt nicht vor. Vor Änderungen an einer Tastatur das bestehende Layout mit einem bewährten Werkzeug sichern und die Wiederherstellung prüfen.

## Entwicklung

Voraussetzungen: macOS, Node.js ab 22.12 und npm. Der Prototyp wird auf Apple Silicon entwickelt.

```sh
npm ci
npm start
```

```sh
npm test            # Build und gezielte Tests für Regeln und Zustände
npm run test:app    # Laufzeittest mit isoliertem Entwicklungsprofil
npm run test:focus  # Fokus- und Reset-Test mit isoliertem Entwicklungsprofil
npm run package:mac # lokales App-Bundle
```

`npm start` baut den TypeScript-Code und startet Electron. Der erste Bezug von Electron und die beiden Webseiten erfordern Internetzugriff. Tests mit Testprofilen verwenden eine eigene Datenablage und greifen nicht auf das reguläre Benutzerprofil zu.

## Schutz und Daten

Die Online-Seiten laufen in isolierten Webansichten ohne Node-Integration oder App-Preload. Dokumentnavigation ist auf die jeweilige HTTPS-Origin beschränkt. Externe Links benötigen eine Bestätigung, bevor der Standardbrowser sie öffnet. Jede Seite erhält eine eigene persistente Chromium-Partition. Der Wechsel schließt die vorherige Webansicht. WebHID wird nur für das aktive Tool und eine konkrete Geräteauswahl zugelassen; andere Berechtigungen werden standardmäßig abgelehnt.

Einstellungen, Fenstergröße, Zoom und Websitedaten werden lokal im Benutzerprofil gespeichert. VIA-L hat keine eigene Cloud, keine eigene Telemetrie und keinen Hintergrunddienst. Die Online-Seiten können eigene Ressourcen und Dienste nutzen; deren Datenverarbeitung liegt bei den jeweiligen Betreibern. Der Reset in den Einstellungen löscht die Daten des gewählten Tools und wechselt zu einer neuen Partition. Nach einem vollständigen App-Neustart ist eine erneute Gerätefreigabe erforderlich.

VIA-L nutzt für bestehende Installationen weiterhin das bisherige macOS-Profil **Keyboard Web Tools**. Bei der Umbenennung werden Profildaten weder verschoben noch gelöscht. Die technischen Partitionsnamen bleiben aus demselben Grund erhalten.

## Lizenz und Drittanbieter

Der Quellcode von VIA-L steht unter [GPL-3.0-or-later](LICENSE). Hinweise zu gebündelter Software und zu den unabhängigen Online-Angeboten stehen in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Fehler und Vorschläge können über [GitHub Issues](https://github.com/r3d42-git/R3Ds-VIA-L/issues) gemeldet werden.

Build-, Signatur- und Veröffentlichungsablauf: [RELEASE.md](RELEASE.md).
