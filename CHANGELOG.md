# Changelog

## 1.0.2 — Theme collection and adaptive Nacre accent

- Preserved the original Nacre theme, its workbench colors, syntax palette, file icons and product icons.
- Added seven independent fixed-color palettes: Catppuccin Mocha, Everforest Dark, Gruvbox Dark Medium, Kanagawa Wave, Material Ocean, Nightfox and Osaka Jade.
- Kept desktop-accent tinting exclusive to the original Nacre theme.
- Added a 20% wallpaper-responsive blend for Nacre TextMate and semantic syntax colors, with a minimum 4.5:1 contrast target.
- Added validation for all eight themes and tests for theme registration and accent-isolation behavior.

## 1.0.1 — KDE Plasma accent integration

- Added configurable KDE Plasma accent synchronization for Nacre workbench UI colors, enabled by default on KDE Linux sessions.
- Added portal-based accent detection with a `kdeglobals` fallback and automatic palette-change handling.
- Kept the editor canvas, syntax palette, icon themes and bundled assets unchanged.

## 1.0.0 — Main release

- Established Nacre as the single color theme in the original release.
- Set the editor background to `#121212` and primary workbench surfaces to `#242527`.
- Refined syntax highlighting for clearer token hierarchy with a restrained, vibrant palette.
- Included Nacre File Icons and Nacre Product Icons.
- Included inline highlighting for hex, RGB/RGBA and HSL/HSLA color values.
- Preserved the source asset license notice and attribution.
