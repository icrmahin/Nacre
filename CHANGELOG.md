# Changelog

## 1.0.3 — Nacre Core design system and final icon polish

- Redesigned the original Nacre Core around its own Signal / Noise visual language: graphite surfaces, warm bone text, Signal Vermilion, brass, soft moss, sea glass and warm amber.
- Reworked all 221 TextMate rule colors and all 35 semantic-token mappings around a deliberate language-role hierarchy; retained the existing grammar scope coverage.
- Added the Nacre Core design-system specification and representative TypeScript, React, Dart, Python, HTML, CSS and JSON syntax fixtures.
- Added Nacre Tokyo Night and Nacre One Dark Pro as independently selectable palette adaptations, each with its own manually selectable matching file icon theme.
- Preserved the nine existing palette flavors, neutral interface text readability and manual color/icon pairing.
- Preserved the original grayscale folder treatment and flavor-matched embedded folder sub-icons.
- Kept desktop-accent synchronization exclusive to the exact active color theme name Nacre.
- Kept package version at 1.0.3; this branch is for local test-build review and is not a Marketplace release.

## 1.0.2 — Independent palette and icon flavors

- Preserved the original Nacre editor, workbench, syntax palette, product icons and desktop-accent behavior.
- Updated the main Nacre folder artwork to neutral graphite tones that blend with the dark workbench.
- Added seven independently selectable color flavors: Nacre Mocha, Grove, Ember, Tide, Abyss, Nocturne and Jade.
- Added seven matching, independently selectable file icon themes with flavor-specific accents.
- Kept color-theme and file-icon selection manual and independent; no setting is switched automatically.
- Kept desktop-accent tinting exclusive to the exact active color theme name Nacre.
- Unified normal VS Code UI and editor base text across all seven flavors to the same neutral white (`#E6E9EF`), fixing selected-row, tab and menu text contrast.

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
