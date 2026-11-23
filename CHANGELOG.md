# Changelog

## Unreleased

- Added subtle desktop-accent tinting for TextMate and semantic syntax colors using a restrained 20% blend, visible without replacing the original token palette.
- Kept the existing Nacre token hierarchy and near-black editor canvas intact.
- Extended the existing system-accent setting to control both workbench and syntax tinting.
- Added tests for color blending, readability, user override preservation and restoration.


## 1.0.1 — KDE Plasma accent integration

- Added configurable KDE Plasma accent synchronization for Nacre workbench UI colors, enabled by default on KDE Linux sessions.
- Added portal-based accent detection with a `kdeglobals` fallback and automatic palette-change handling.
- Kept the editor canvas, syntax palette, icon themes, and bundled assets unchanged.

## 1.0.0 — Main release

- Established Nacre as the single color theme in this release.
- Set the editor background to `#121212` and primary workbench surfaces to `#242527`.
- Refined syntax highlighting for clearer token hierarchy with a restrained, vibrant palette.
- Included Nacre File Icons and Nacre Product Icons.
- Included inline highlighting for hex, RGB/RGBA, and HSL/HSLA color values.
- Preserved the source asset license notice and attribution.
