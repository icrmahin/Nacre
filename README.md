# Nacre for Visual Studio Code

**A dark theme collection by [icrmahin](https://github.com/icrmahin).**

Nacre is the original near-black graphite theme, now joined by seven independent palette flavors. Each flavor has a separately selectable file icon theme. The original Nacre editor, workbench and syntax palette remain intact.

## Color themes

Choose a color theme with **Preferences: Color Theme** in the VS Code Command Palette.

| Theme picker entry | Palette inspiration |
| --- | --- |
| **Nacre** | Original near-black graphite theme |
| **Nacre Mocha** | Catppuccin Mocha |
| **Nacre Grove** | Everforest Dark |
| **Nacre Ember** | Gruvbox Dark Medium |
| **Nacre Tide** | Kanagawa Wave |
| **Nacre Abyss** | Material Ocean |
| **Nacre Nocturne** | Nightfox |
| **Nacre Jade** | Osaka Jade |

The seven flavors are Nacre palette adaptations. They retain Nacre's language-scope coverage while using their own workbench, TextMate and semantic color palettes. They are not copies of the upstream extensions or their implementation code. See [third-party palette credits](THIRD-PARTY-THEMES.md).

Across all seven flavors, normal VS Code interface text and the editor's base foreground use one consistent neutral white (`#E6E9EF`). Selected text in lists, tabs, menus and editor selections uses the same foreground for readable contrast. Flavor-specific colors remain in syntax highlighting, links, interactive accents and matching icons.

## Matching file icon themes

Each color flavor has a matching file icon theme with its own accent palette:

| Color theme | File icon theme |
| --- | --- |
| **Nacre** | Nacre File Icons |
| **Nacre Mocha** | Nacre Mocha Icons |
| **Nacre Grove** | Nacre Grove Icons |
| **Nacre Ember** | Nacre Ember Icons |
| **Nacre Tide** | Nacre Tide Icons |
| **Nacre Abyss** | Nacre Abyss Icons |
| **Nacre Nocturne** | Nacre Nocturne Icons |
| **Nacre Jade** | Nacre Jade Icons |

**Pair them manually.** Color themes and file icon themes are independent VS Code settings. Selecting a color theme never changes the selected file icon theme, and selecting an icon theme never changes the color theme.

To pair them, open the Command Palette and run:

1. **Preferences: Color Theme** → choose a Nacre flavor
2. **Preferences: File Icon Theme** → choose its matching Nacre icon theme

The original Nacre file glyphs remain untouched. Its complete folder icon set uses neutral grayscale, including the small symbols embedded in named folders, and the default folder body is a visible medium gray rather than near-black. Each flavor icon theme recolors folder bodies and embedded sub-icons with that flavor's accent palette, while preserving light/dark contrast, glyph silhouettes and file/folder associations.

## Product icons

**Nacre Product Icons** remains a separate, independent VS Code contribution. It is not automatically changed when selecting a color or file icon theme.

Choose it with **Preferences: Product Icon Theme** → **Nacre Product Icons**.

## Nacre's desktop accent behavior

On supported Linux desktops, the main theme **Nacre** can follow the system accent from GNOME, KDE Plasma or a compatible Freedesktop appearance portal. It applies a restrained 20% blend to the existing TextMate and semantic syntax colors while preserving token roles and a minimum 4.5:1 contrast ratio against Nacre's near-black editor background.

**The accent integration only runs when the active color theme is exactly Nacre.** The seven alternative color themes keep their own fixed palettes. Changing a GNOME or KDE accent will not recolor Nacre Mocha, Grove, Ember, Tide, Abyss, Nocturne or Jade.

Control the behavior with the existing setting:

\`\`\`json
{
  "nacre.systemAccent.enable": true
}
\`\`\`

Set it to false to restore the original Nacre workbench and syntax palette. This setting does not change any flavor's fixed palette or file icon theme.

For desktop sources, fallback behavior and limitations, see [System accent synchronization](docs/SYSTEM-ACCENT.md).

## Other included features

### Inline color-value highlighting

The extension highlights supported color literals in visible text editors:

- Hex: #RGB, #RGBA, #RRGGBB and #RRGGBBAA
- RGB and RGBA
- HSL and HSLA

Toggle this feature with the setting nacre.colorHighlight.enable.

## Install

Search for **Nacre** by publisher **icrmahin** in the VS Code Extensions view.

The Visual Studio Marketplace listing is updated separately by the publisher. For local installation of the current source version, use **Actions → Build Nacre Test VSIX (No Release)** and install the generated VSIX. That workflow packages the extension for testing and does not publish it to the Marketplace.

## Build and validate

Requirements: Node.js 22 or later and npm.

\`\`\`bash
npm run build:icons
npm run validate
npm test
node --check extension.js
node --check systemAccent.js
node --check syntaxAccent.js
npx --yes @vscode/vsce package --out ./icrmahin.nacre-test.vsix
\`\`\`

The build step generates the seven flavor-specific file icon sets and the neutral Nacre folder artwork from the shared source SVGs. Validation and test commands also run this generator automatically.

Use **Actions → Build Nacre Test VSIX (No Release)** to package a development branch. The workflow uploads a test artifact and does not create a GitHub Release or publish to the Visual Studio Marketplace.

See [Build, test and release](docs/BUILD-AND-RELEASE.md) for the complete process.

## Repository structure

\`\`\`text
.
├── .github/workflows/       # validation, test VSIX and tag-based release workflows
├── docs/                    # design, architecture, attribution and release docs
├── icons/
│   ├── files/               # shared file glyph source SVGs
│   ├── folders/             # shared folder source SVGs
│   └── build/               # generated neutral and flavor-specific icon artwork
├── scripts/
│   ├── build-icon-themes.mjs
│   └── validate.mjs
├── tests/                   # unit and theme-collection tests
├── themes/                  # color themes and file/product icon maps
├── extension.js
├── systemAccent.js
├── syntaxAccent.js
├── package.json
├── CHANGELOG.md
├── LICENSE.txt
└── THIRD-PARTY-THEMES.md
\`\`\`

## Licensing

The included LICENSE.txt is retained with its original copyright notice. Palette sources and their license notices are listed in [THIRD-PARTY-THEMES.md](THIRD-PARTY-THEMES.md).

**ICRMAHIN** · [GitHub](https://github.com/icrmahin)
