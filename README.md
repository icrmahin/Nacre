# Nacre for Visual Studio Code

**A premium dark workspace by [icrmahin](https://github.com/icrmahin).**

Nacre pairs a deep `#121212` editor with restrained `#242527` graphite workspace surfaces. Its syntax palette is designed around a clear visual hierarchy: important language structure is easy to scan, related token roles stay coherent, and accents remain vivid without turning the editor into a rainbow.

![Nacre editor preview](media/nacre-preview.png)

## At a glance

| Item | Value |
| --- | --- |
| Extension ID | `icrmahin.nacre` |
| Version | `1.0.1` |
| Publisher / author | `icrmahin` / `ICRMAHIN` |
| Color theme | **Nacre** (single color variant) |
| File icon theme | **Nacre File Icons** |
| Product icon theme | **Nacre Product Icons** |
| Minimum VS Code engine | `^1.80.0` |
| License file | [`LICENSE.txt`](LICENSE.txt) |

## Install

### Install the packaged VSIX

Download the **icrmahin.nacre-1.0.1.vsix** asset from the [Nacre 1.0.1 GitHub Release](https://github.com/icrmahin/Nacre/releases/tag/v1.0.1), then run:

```bash
code --install-extension icrmahin.nacre-1.0.1.vsix
```

Alternatively, open **Extensions** in VS Code, select the `...` menu, choose **Install from VSIX...**, and select the downloaded file.

### Activate the themes

Use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and select:

1. **Preferences: Color Theme** → `Nacre`
2. **Preferences: File Icon Theme** → `Nacre File Icons`
3. **Preferences: Product Icon Theme** → `Nacre Product Icons`

The color, file-icon, and product-icon themes are independent VS Code contributions. Activate each one separately.

## Visual system

### Surfaces

| Surface | Color | Intent |
| --- | --- | --- |
| Editor | `#121212` | Deep neutral black without a blue or olive cast |
| Main workbench surfaces | `#242527` | Graphite separation for sidebars, panels, title/status chrome and widgets |
| Selection | `#34465D` | Restrained blue-gray selection contrast |
| Primary text | `#E6EDF3` | Cool, readable near-white |

The full workbench color map lives in [`themes/nacre-color-theme.json`](themes/nacre-color-theme.json).

### Syntax hierarchy

The syntax palette takes inspiration from the role clarity of GitHub's dark editor themes without copying their palette one-to-one.

| Token role | Color | Purpose |
| --- | --- | --- |
| Keywords and control flow | `#FF7B72` | Coral structural emphasis |
| Functions and callable symbols | `#D2A8FF` | Lavender behavior/action emphasis |
| Types, classes and type-like names | `#FFA657` | Warm amber identity |
| Properties, constants and numeric values | `#79C0FF` | Clear blue data/reference emphasis |
| Strings | `#A5D6FF` | Cooler, lighter blue distinction |
| HTML/CSS tags and components | `#7EE787` | Green markup/component emphasis |
| Variables and primary text | `#E6EDF3` | Neutral baseline |
| Comments | `#8B949E` | Lower-priority explanatory text |

The theme defines TextMate scopes for common language constructs and several language-specific cases. Individual language extensions can provide additional semantic-token scopes; VS Code may use those semantic tokens alongside TextMate rules.

## Included features

### Nacre color theme

A single maintained color theme. The previous experimental color variants are not included in this release.

### KDE Plasma adaptive workbench accent

On Linux KDE sessions, Nacre can follow the active Plasma accent color, including the wallpaper-derived accent when Plasma exposes it through the desktop appearance portal. It gently tints graphite workbench surfaces and applies the accent to selections, active tabs, focus borders, links, badges and primary buttons. The `#121212` editor canvas and all syntax token colors remain Nacre's own.

The integration is enabled by default and can be disabled with `nacre.kdeAccent.enable`. It uses the KDE appearance portal (`gdbus`) when available and falls back to the `~/.config/kdeglobals` accent/selection entries. The extension stores theme-scoped `[Nacre]` color customizations in VS Code's user settings while active, then restores the previous Nacre-scoped values when the feature is disabled or the extension deactivates.

See [`docs/KDE-ACCENT.md`](docs/KDE-ACCENT.md) for implementation details and limitations.

### Nacre File Icons

A file and folder icon theme with mappings for common file extensions, exact filenames, language IDs, and named folders. Its source mapping is [`themes/nacre-file-icons.json`](themes/nacre-file-icons.json); SVG assets are under [`icons/files/`](icons/files/) and [`icons/folders/`](icons/folders/).

### Nacre Product Icons

A separate product UI icon theme. It defines 171 product icon glyphs and loads the bundled `nacre-ui-icons.woff2` font through [`themes/nacre-product-icons.json`](themes/nacre-product-icons.json).

### Inline color-value highlighting

The extension code decorates supported color literals in visible text editors. It recognizes:

- Hex: `#RGB`, `#RGBA`, `#RRGGBB`, and `#RRGGBBAA`
- RGB/RGBA functional notation
- HSL/HSLA functional notation

Each recognized value receives a background matching the represented color and a calculated black or white foreground for legibility. The implementation debounces document-change updates and skips files larger than 500 KB.

Toggle the feature in VS Code settings:

```json
{
  "nacre.colorHighlight.enable": true
}
```

Set it to `false` to disable inline color decorations.

## Repository structure

```text
.
├── .github/workflows/validate.yml  # automated source validation
├── docs/                           # design, architecture and release docs
├── icons/
│   ├── files/                      # file-type SVG artwork
│   └── folders/                    # folder SVG artwork
├── media/                          # preview and extension icon
├── releases/                       # VSIX, source archive and release bundle
├── scripts/validate.mjs            # local package/asset validator
├── tests/kdeAccent.test.js          # KDE adapter unit tests
├── themes/
│   ├── nacre-color-theme.json      # workbench and syntax colors
│   ├── nacre-file-icons.json       # file/folder icon mappings
│   ├── nacre-product-icons.json    # product icon glyph map
│   └── nacre-ui-icons.woff2        # bundled product icon font
├── extension.js                    # extension lifecycle and feature coordination
├── kdeAccent.js                    # KDE accent detection and UI color derivation
├── package.json                    # VS Code extension manifest
├── CHANGELOG.md
└── LICENSE.txt
```

For deeper explanations, see [`docs/`](docs/README.md).

## Build from source

Requirements:

- Node.js (current LTS recommended)
- Visual Studio Code Extension Manager (`@vscode/vsce`)

Validate the manifest and all referenced local assets:

```bash
npm run validate
```

Package the extension:

```bash
npx --yes @vscode/vsce package --out ./releases/icrmahin.nacre-1.0.1.vsix
```

The extension version is kept in `package.json`. A release build should only be made after updating the changelog and checking the complete validation report. The `1.0.1` VSIX is generated by the GitHub Actions release workflow and attached to the matching GitHub Release.

## Validation status

The source validation script checks package identity, theme registrations, theme JSON, icon JSON, SVG paths, product-icon font references, and the one-color-theme release constraint. The release archive also contains the original QA summary and SHA-256 checksums.

A static package check is not the same as a live VS Code installation test. The `1.0.1` source is validated by GitHub Actions before packaging. Live installation and UI rendering should still be verified on the target VS Code version before marketplace publication.

## Attribution and licensing

The project package is published under the `icrmahin` identity. The included `LICENSE.txt` retains the upstream MIT copyright notice present in the supplied icon/theme source (`nionx01`, 2026). Do not remove or alter required upstream notices when redistributing the included assets. See [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).

## Author

**ICRMAHIN** · [GitHub](https://github.com/icrmahin)
