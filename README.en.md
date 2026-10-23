# R3Ds VIA-L

<img src="assets/AppIcon.png" alt="R3Ds VIA-L" width="128">

[Deutsch](README.md)

**R3Ds VIA-L**, or **VIA-L** for short, brings [VIA](https://usevia.app/), [Vial](https://vial.rocks/), [Venom](https://venom.how/), and [Wootility](https://wootility.io/) into a standalone macOS app. Connect your compatible keyboard, remap keys, and manage layouts through each tool's familiar interface. Switch between VIA, Vial, Venom, and Wootility directly in the app.

VIA-L loads the **online versions** of all four tools and adds a local WebHID device chooser. An internet connection is required. VIA-L is an independent project and is not affiliated with any of the four original projects.

New in version 0.2.5: maintenance and security update with Electron 44.9.1. VIA, Vial, Venom, and Wootility retain their existing functionality.

Version 0.2.5 was successfully tested in practice with **VIA, Vial, Venom, and Wootility**.

**Downloads for version 0.2.5:** [Apple Silicon (arm64)](https://github.com/r3d42-git/R3Ds-VIA-L/releases/download/v0.2.5/VIA-L-0.2.5-macOS-arm64.zip) · [Intel (x64)](https://github.com/r3d42-git/R3Ds-VIA-L/releases/download/v0.2.5/VIA-L-0.2.5-macOS-x64.zip) · macOS 13 or later · signed and notarized by Apple.

Check ** → About This Mac**: choose Apple Silicon for an Apple chip, or Intel for an Intel processor. Both ZIPs contain the same app built for the respective processor.

Extract the ZIP and move **VIA-L.app** to your Applications folder. Updates are available from the release page. To update, quit the app and replace it; website data and preferences are preserved.

## Use

1. Choose VIA, Vial, Venom, or Wootility in the top bar. Switching closes the previous website view; unsaved changes on that site may be lost.
2. Request a connection on the original site: **“Authorize device +”** in VIA, **“Start Vial”** in Vial, **“Connect”** in Venom, or the device initialization and browser permission steps in Wootility. Select the offered device in VIA-L, then choose **Connect**. No device is granted without this selection.
3. Remap keys and adjust layouts directly in the selected tool.
4. Use each tool's import and export functions. To load a VIA JSON file, use VIA's sideload feature.

The app toolbar is intentionally outside the tab sequence while testing keys and is operated with a pointer. Settings and the device chooser remain keyboard accessible. Resetting website data requires entering the exact tool name; it affects only that tool.

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
npm run test:window # window startup with real and simulated small work areas
npm run package:mac # local app bundle for the current Mac
npm run package:mac -- --arch=x64 # local Intel app bundle
npm run package:mac -- --arch=arm64 # local Apple Silicon app bundle
```

`npm start` builds the TypeScript code and launches Electron. Downloading Electron for the first time and loading the websites require internet access. Test profiles are separate from the regular user profile.

VIA-L starts on the display under the pointer at **1676 × 1124** macOS points when its usable work area permits. Otherwise, the window is independently limited to fit and centered, accounting for the menu bar and Dock. The target size is recalculated on every launch, ignoring manually saved window bounds. Preferences, zoom, and website data are preserved.

## Security and data

The online sites run in isolated web views without Node integration or an app preload. Document navigation is restricted to each site's HTTPS origin. External links require confirmation before opening in the default browser. Each site has its own persistent Chromium partition. Switching closes the previous view. WebHID is allowed only for the active tool with an explicit device choice; other permissions are denied by default.

Preferences, zoom, and website data are stored locally in the user profile. VIA-L has no separate cloud, telemetry, or background service. The online sites may use their own resources and services; their operators control that data processing. Resetting a tool clears its website data and switches to a fresh partition. A full app restart requires granting device access again.

VIA-L continues to use the existing **Keyboard Web Tools** macOS profile for existing installations. Renaming the app does not move or delete profile data, and the technical partition names remain unchanged.

## License and third parties

VIA-L source code is licensed under [GPL-3.0-or-later](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled software and the independent online services. Report bugs or ideas through [GitHub Issues](https://github.com/r3d42-git/R3Ds-VIA-L/issues).

Build, signing and publication procedure: [RELEASE.md](RELEASE.md).
