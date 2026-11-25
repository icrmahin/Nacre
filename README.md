# Nacre for Visual Studio Code

**An original dark theme system by [icrmahin](https://github.com/icrmahin).**

Nacre has one original core design and nine optional palette flavors. Its file and folder icon system is shared across the collection, with independently selectable flavor-matched file icon themes.

## Nacre Core — Signal / Noise

**Nacre** is the original theme, not a port of another theme. Its visual language is built around a quiet graphite workspace, warm neutral code, and one controlled signal accent.

| Role | Color | Use |
| --- | --- | --- |
| Signal Vermilion | \`#F16B52\` | Keywords, control flow, focus, active indicators |
| Warm Bone | \`#EAE7DF\` | Primary code and interface text |
| Mineral | \`#AEB6B5\` | Types, punctuation and supporting structure |
| Graphite | \`#697577\` | Comments and low-priority information |
| Brass | \`#D7C68F\` | Functions and callable declarations |
| Soft Moss | \`#B9C8A5\` | Strings |
| Sea Glass | \`#91B8AD\` | Properties, object keys and namespaces |
| Warm Amber | \`#D5A078\` | Numbers, booleans and constants |

The workspace uses three intentional graphite levels: \`#15191B\` for the editor and primary surfaces, \`#22282A\` for raised surfaces, and \`#353C3E\` for borders and selection structure.

### Syntax hierarchy

Nacre Core is not a rainbow theme. Color has a job:

- Variables and ordinary code stay warm and quiet.
- Keywords and control flow use the Signal accent sparingly.
- Functions use brass; types use mineral gray.
- Strings use soft moss; properties and object keys use sea glass.
- Numbers and constants use warm amber.
- Comments recede into graphite without becoming unreadable.
- Operators and punctuation remain neutral so the code's structure stays visible.

The theme preserves 221 TextMate rules and 35 semantic-token mappings across its existing language coverage. See [Nacre Design System](docs/NACRE-DESIGN-SYSTEM.md) for the full token-role specification.

## Color themes

Choose a color theme with **Preferences: Color Theme** in the VS Code Command Palette.

| Theme picker entry | Palette inspiration |
| --- | --- |
| **Nacre** | Original Signal / Noise design |
| **Nacre Mocha** | Catppuccin Mocha |
| **Nacre Grove** | Everforest Dark |
| **Nacre Ember** | Gruvbox Dark Medium |
| **Nacre Tide** | Kanagawa Wave |
| **Nacre Abyss** | Material Ocean |
| **Nacre Nocturne** | Nightfox |
| **Nacre Jade** | Osaka Jade |
| **Nacre Tokyo Night** | Tokyo Night |
| **Nacre One Dark Pro** | One Dark Pro |

Nacre Core is the authored identity. The nine flavors are separate palette adaptations for people who prefer familiar color families. They reuse Nacre's scope coverage and do not bundle upstream extension implementation code, artwork or fonts. See [third-party palette credits](THIRD-PARTY-THEMES.md).

All flavor themes keep one consistent neutral foreground (\`#E6E9EF\`) for normal editor and VS Code interface text. Flavor accents remain in syntax, links and interactive accents; selection foregrounds remain readable against their selection backgrounds.

## Matching file icon themes

Every color theme has a separately selectable file icon theme:

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
| **Nacre Tokyo Night** | Nacre Tokyo Icons |
| **Nacre One Dark Pro** | Nacre One Dark Icons |

**Pair them manually.** Color themes and file icon themes are independent VS Code settings. Selecting a color theme never changes the selected file icon theme.

To pair them, open the Command Palette:

1. **Preferences: Color Theme** → choose a Nacre theme
2. **Preferences: File Icon Theme** → choose its matching Nacre icon theme

The original Nacre folder set is neutral grayscale. Flavor file icon themes recolor file glyphs, folder bodies and embedded folder marks with the corresponding flavor accent. File associations and icon silhouettes stay consistent.

## Product icons

**Nacre Product Icons** remains a separate VS Code contribution. Select it through **Preferences: Product Icon Theme**. It is not switched automatically with either color or file icon themes.

## Nacre desktop accent

On supported Linux desktops, the extension can apply a restrained 20% desktop-accent blend to Nacre Core's workbench and syntax colors. It only runs when the active color theme is exactly **Nacre**. All nine flavor themes retain fixed palettes.

Control it with the existing setting:

\`\`\`json
{
  "nacre.systemAccent.enable": true
}
\`\`\`

Set it to \`false\` to restore the static Nacre Core palette. The integration does not recolor icons or flavor themes. See [System accent synchronization](docs/SYSTEM-ACCENT.md).

## Other features

- Inline highlighting for hex, RGB/RGBA and HSL/HSLA color values, controlled by \`nacre.colorHighlight.enable\`.
- GNOME and KDE desktop-accent synchronization for Nacre Core.
- A reusable icon build that creates the main neutral folder set and all nine flavor-specific icon sets.

## Build and test

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

The syntax review samples are in \`tests/fixtures/syntax/\`. Open them in VS Code with **Nacre** active to inspect TypeScript, TSX, Dart, Python, HTML, CSS and JSON highlighting.

Use **Actions → Build Nacre Test VSIX (No Release)** to package a development branch. It uploads a test artifact and does not create a GitHub Release or publish to the Visual Studio Marketplace.

See [Build, test and release](docs/BUILD-AND-RELEASE.md) for the process.

## Licensing

The extension's original license is retained in \`LICENSE.txt\`. Palette inspirations and their license notices are documented in [THIRD-PARTY-THEMES.md](THIRD-PARTY-THEMES.md).

**ICRMAHIN** · [GitHub](https://github.com/icrmahin)
