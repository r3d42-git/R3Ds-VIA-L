# R3Ds VIA-L

<img src="assets/AppIcon.png" alt="R3Ds VIA-L" width="128">

[Deutsch](README.md)

**R3Ds VIA-L**, or **VIA-L** for short, is an independent macOS app for the **online versions** of [VIA](https://usevia.app/) and [Vial](https://vial.rocks/). It loads their original websites in an embedded Chromium view and provides a local WebHID device chooser. VIA-L is not affiliated with VIA or Vial. Their websites and keyboard configuration tools are not bundled with this repository or app. An internet connection is required.

Version **0.2.0** targets Apple Silicon and macOS 13 or later. Once published, a signed and notarized ZIP will be available from [Releases](https://github.com/r3d42-git/R3Ds-VIA-L/releases/latest). There is no automatic updater. Check the release page for updates and quit the app before replacing it. Website data and preferences remain in the existing macOS user profile.

## Use

1. Choose VIA or Vial in the top bar. Switching closes the previous website view; unsaved changes on that site may be lost.
2. Request a connection on the original site: **“Authorize device +”** in VIA or **“Start Vial”** in Vial. Select the offered device in VIA-L, then choose **Connect**. No device is granted without this selection.
3. Use each website's own import and export functions. To load a VIA JSON file, use VIA's original sideload feature. VIA-L does not parse or alter layout files itself.

The app toolbar is intentionally outside the tab sequence while testing keys and is operated with a pointer. Settings and the device chooser remain keyboard accessible. Resetting website data requires entering the exact tool name; it affects only that tool.

A user has tried a VIA connection, VIA JSON sideloading, and Vial in the app. A complete write and restore test across keyboard models and firmware has not been established. Before changing a keyboard, back up its existing layout with a known working tool and verify that it can be restored.

## Development

Requirements: macOS, Node.js 22.12 or later, and npm. Development currently takes place on Apple Silicon.

```sh
npm ci
npm start
```

```sh
npm test            # build and focused policy/state tests
npm run test:app    # runtime test using an isolated development profile
npm run test:focus  # focus and reset test using an isolated development profile
npm run package:mac # local app bundle
```

`npm start` builds the TypeScript code and launches Electron. Downloading Electron for the first time and loading the websites require internet access. Test profiles are separate from the regular user profile.

## Security and data

The online sites run in isolated web views without Node integration or an app preload. Document navigation is restricted to each site's HTTPS origin. External links require confirmation before opening in the default browser. Each site has its own persistent Chromium partition. Switching closes the previous view. WebHID is allowed only for the active tool with an explicit device choice; other permissions are denied by default.

Preferences, window size, zoom, and website data are stored locally in the user profile. VIA-L has no separate cloud, telemetry, or background service. The online sites may use their own resources and services; their operators control that data processing. Resetting a tool clears its website data and switches to a fresh partition. A full app restart requires granting device access again.

VIA-L continues to use the existing **Keyboard Web Tools** macOS profile for existing installations. Renaming the app does not move or delete profile data, and the technical partition names remain unchanged.

## License and third parties

VIA-L source code is licensed under [GPL-3.0-or-later](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled software and the independent online services. Report bugs or ideas through [GitHub Issues](https://github.com/r3d42-git/R3Ds-VIA-L/issues).

Build, signing and publication procedure: [RELEASE.md](RELEASE.md).
