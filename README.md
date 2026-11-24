# Nacre for Visual Studio Code

**A dark theme collection by [icrmahin](https://github.com/icrmahin).**

Nacre is the main theme. It keeps its near-black `#0B0C0E` editor, graphite workbench, original syntax palette, file icons, and product icons. The extension also includes seven independent color-theme choices inspired by other well-known palettes.

## Color themes

Choose a theme with **Preferences: Color Theme** in the VS Code Command Palette.

| Theme picker entry | Palette direction |
| --- | --- |
| **Nacre** | Original near-black graphite theme with optional desktop-accent tinting |
| **Nacre / Catppuccin Mocha** | Soft mocha surfaces with pastel lavender, blue, peach and green |
| **Nacre / Everforest Dark** | Muted forest greens, warm parchment and earthy colors |
| **Nacre / Gruvbox Dark Medium** | Warm retro contrast, brown surfaces and bold muted colors |
| **Nacre / Kanagawa Wave** | Ink-like blue-grey surfaces with muted Japanese-inspired colors |
| **Nacre / Material Ocean** | Deep blue-black surfaces with cyan, lavender and coral accents |
| **Nacre / Nightfox** | Cool navy surfaces with blue, teal, violet and amber accents |
| **Nacre / Osaka Jade** | Deep green surfaces with jade, rose and yellow accents |

These seven entries are separate VS Code color themes. Selecting one does not replace or modify the original Nacre theme.

The alternative themes are palette adaptations using Nacre's existing language-scope coverage. They are not copies of the upstream extensions or their implementation code. See [third-party palette credits](THIRD-PARTY-THEMES.md).

## Nacre's desktop accent behavior

On supported Linux desktops, the main theme **Nacre** can follow the system accent from GNOME, KDE Plasma or a compatible Freedesktop appearance portal. It applies a restrained 20% blend to the existing TextMate and semantic syntax colors while preserving token roles and a minimum 4.5:1 contrast ratio against Nacre's near-black editor background.

**The accent integration only runs when the active color theme is exactly `Nacre`.** The seven alternative themes keep their own fixed colors. Changing a GNOME or KDE accent will not recolor Catppuccin, Everforest, Gruvbox, Kanagawa, Material, Nightfox or Osaka Jade.

Control the behavior with the existing setting:

```json
{
  "nacre.systemAccent.enable": true
}
```

Set it to `false` to restore the original Nacre workbench and syntax palette. This setting does not change the seven alternative palettes.

For desktop sources, fallback behavior and limitations, see [System accent synchronization](docs/SYSTEM-ACCENT.md).

## Included icon themes

Nacre File Icons and Nacre Product Icons remain separate VS Code contributions. Activate them independently:

1. **Preferences: File Icon Theme** → `Nacre File Icons`
2. **Preferences: Product Icon Theme** → `Nacre Product Icons`

The icon themes are unchanged by switching among the eight color themes.

## Other included features

### Inline color-value highlighting

The extension highlights supported color literals in visible text editors:

- Hex: `#RGB`, `#RGBA`, `#RRGGBB` and `#RRGGBBAA`
- RGB and RGBA
- HSL and HSLA

Toggle this feature with `nacre.colorHighlight.enable`.

## Install

Search for **Nacre** by publisher **icrmahin** in the VS Code Extensions view.

The Marketplace listing remains the published distribution channel. Version 1.0.2 is being prepared with the seven additional palette themes; until its official release is published, use the GitHub test-build workflow for local testing.

## Build and validate

Requirements: Node.js 22 or later, npm and `@vscode/vsce`.

```bash
npm run validate
npm test
node --check extension.js
node --check systemAccent.js
node --check syntaxAccent.js
npx --yes @vscode/vsce package --out ./icrmahin.nacre-test.vsix
```

Use **Actions → Build Nacre Test VSIX (No Release)** to package a development branch. The workflow uploads a test artifact and does not create a GitHub Release or publish to the Visual Studio Marketplace.

See [Build, test and release](docs/BUILD-AND-RELEASE.md) for the complete process.

## Repository structure

```text
.
├── .github/workflows/       # validation, test VSIX and tag-based release workflows
├── docs/                    # design, architecture, attribution and release docs
├── icons/                   # Nacre file and folder artwork
├── media/                   # extension icon and previews
├── scripts/validate.mjs     # manifest, theme and asset validator
├── tests/                   # unit and theme-collection tests
├── themes/                  # eight independent color themes and icon maps
├── extension.js             # extension lifecycle and feature coordination
├── systemAccent.js          # GNOME/KDE accent detection
├── syntaxAccent.js          # adaptive syntax tint generation
├── package.json
├── CHANGELOG.md
├── LICENSE.txt
└── THIRD-PARTY-THEMES.md
```

## Licensing

The included `LICENSE.txt` is retained with its original copyright notice. Palette sources and their license notices are listed in [THIRD-PARTY-THEMES.md](THIRD-PARTY-THEMES.md).

**ICRMAHIN** · [GitHub](https://github.com/icrmahin)
