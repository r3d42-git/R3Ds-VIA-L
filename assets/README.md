# App icon

`AppIcon.png` was created with the built-in image generation tool. `AppIcon.icns` is its macOS icon representation, generated with `sips` and `iconutil` at the standard 16–1024 pixel sizes. Both are included under the project license.

Design prompt: A native macOS squircle in midnight navy, with a large off-white mechanical keycap and turquoise/cobalt keycaps behind it. A cyan branching connection symbol represents connecting a keyboard to two tools. Sculpted depth, no text, no VIA/Vial logos, transparent outside the tile.

`entitlements.plist` grants only JIT execution for Electron under Hardened Runtime. Remote renderer sandboxing and app permission policy remain separate controls.
