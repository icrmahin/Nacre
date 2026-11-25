# Nacre Core Design System

## Purpose

Nacre Core is the authored visual identity of the extension. It is designed around **Signal / Noise**: a quiet graphite workspace, warm neutral code, and one intentional signal color.

The nine palette flavors are optional alternatives. They do not define the Core design language.

## 1. Foundations

### Surface palette

| Token | Value | Application |
| --- | --- | --- |
| Graphite 950 | \`#15191B\` | Editor, primary workspace and main chrome |
| Graphite 900 | \`#22282A\` | Raised surfaces, hover surfaces and secondary panels |
| Graphite 800 | \`#353C3E\` | Borders, selection structure and active guides |
| Graphite 600 | \`#697577\` | Muted information and comments |
| Mineral | \`#AEB6B5\` | Secondary text, types and neutral structure |
| Warm Bone | \`#EAE7DF\` | Primary code and interface text |

### Signal and syntax accents

| Token | Value | Meaning |
| --- | --- | --- |
| Signal Vermilion | \`#F16B52\` | Keywords, control flow, focus and active indicators |
| Signal Hover | \`#FF896F\` | Hover emphasis for signal-driven controls |
| Brass | \`#D7C68F\` | Functions and callable declarations |
| Soft Moss | \`#B9C8A5\` | Strings and literal text |
| Sea Glass | \`#91B8AD\` | Properties, object keys, modules and namespaces |
| Warm Amber | \`#D5A078\` | Numbers, booleans, constants and escapes |
| Warm Parameter | \`#D7CFC0\` | Parameters and argument values |
| Error | \`#E47777\` | Errors and destructive diff states |
| Success | \`#A8B89A\` | Added content and successful diff states |

These colors are roles, not a rainbow. A language element uses the same role across languages wherever the grammar provides a corresponding scope.

## 2. Syntax hierarchy

| Code role | TextMate / semantic role | Core color |
| --- | --- | --- |
| Ordinary variables and plain code | \`variable\`, \`variable.readonly\` | Warm Bone |
| Parameters and arguments | \`variable.parameter\`, \`parameter.declaration\` | Warm Parameter |
| Keywords, modifiers and control flow | \`keyword\`, \`storage.*\`, \`operator.controlFlow\` | Signal Vermilion |
| Functions and methods | \`entity.name.function\`, \`function\`, \`method\` | Brass |
| Classes, interfaces, enums and types | \`entity.name.type\`, \`class\`, \`interface\`, \`type\` | Mineral |
| Strings | \`string\` | Soft Moss |
| Properties and object keys | \`property\`, \`property.declaration\`, JSON/YAML/TOML keys | Sea Glass |
| Numbers, booleans and constants | \`constant.numeric\`, \`number\`, \`boolean\` | Warm Amber |
| Comments and block quotes | \`comment\` | Graphite 600 |
| Operators and punctuation | \`operator\`, \`punctuation\` | Mineral |
| Modules and namespaces | \`module\`, \`namespace\` | Sea Glass |
| Decorators and attributes | \`decorator\`, \`annotation\`, markup attributes | Brass |
| Markup tags and control symbols | HTML/XML tags and template control markers | Signal Vermilion |
| Regex literals | \`regexp\`, \`string.regexp\` | Sea Glass |
| Markdown headings and links | \`markup.heading\`, link scopes | Signal / Sea Glass |

### Design rules

1. **Signal is scarce.** Coral is reserved for language control and active interaction. It is not the default color for every important-looking token.
2. **Functions are warm.** Brass distinguishes actions and call sites from the structure around them.
3. **Types are structural.** Classes and interfaces are mineral, not a second high-saturation accent.
4. **Values are calm.** Strings use soft moss; numeric values use warm amber; object properties use sea glass.
5. **Noise recedes.** Comments and guides are muted but maintain readable contrast.
6. **Punctuation stays quiet.** Operators and delimiters should support parsing, not compete with language semantics.
7. **No language-specific rainbow.** TypeScript, Dart, Python, CSS, HTML and data formats follow the same role map.

## 3. Workbench hierarchy

- **Editor and primary chrome:** Graphite 950.
- **Raised panels, hover surfaces and widgets:** Graphite 900.
- **Borders, guides and selection structure:** Graphite 800.
- **Primary text:** Warm Bone.
- **Supporting text and icons:** Mineral.
- **Low-priority text:** Graphite 600.
- **Focus, active tabs and primary actions:** Signal Vermilion.
- **Warnings and modified states:** Brass / Warm Amber.
- **Errors:** Error.
- **Added or successful states:** Success.

Selection backgrounds use a graphite surface rather than the accent itself. Foregrounds remain independent of their backgrounds so list, editor, menu and breadcrumb selections remain readable.

## 4. Semantic token contract

The theme retains 35 semantic token selectors. Their principal role families are:

- Variables and parameters: Warm Bone / Warm Parameter.
- Types, interfaces, enums, structs and classes: Mineral.
- Functions and methods: Brass.
- Comments: Graphite 600.
- Numbers, enum members and booleans: Warm Amber.
- Strings: Soft Moss.
- Regex: Sea Glass.
- Modules, namespaces and properties: Sea Glass.
- Decorators: Brass.
- Keywords and control flow: Signal Vermilion.

TextMate coverage remains at 221 rules. The original scope set is retained; the colors are remapped by role rather than replacing language support.

## 5. Palette flavors

The following themes are fixed palette adaptations, not Nacre Core syntax variants:

- Nacre Mocha — Catppuccin Mocha
- Nacre Grove — Everforest Dark
- Nacre Ember — Gruvbox Dark Medium
- Nacre Tide — Kanagawa Wave
- Nacre Abyss — Material Ocean
- Nacre Nocturne — Nightfox
- Nacre Jade — Osaka Jade
- Nacre Tokyo Night — Tokyo Night
- Nacre One Dark Pro — One Dark Pro

Flavor UI foregrounds retain the shared neutral \`#E6E9EF\` text treatment for normal interface and editor text. Their syntax accents remain specific to each flavor. Each flavor has a separately selectable matching file icon theme.

The palette inspirations are attributed in [THIRD-PARTY-THEMES.md](../THIRD-PARTY-THEMES.md). Nacre does not bundle upstream theme implementation code, SVG artwork, fonts or source extension assets.

## 6. Desktop accent behavior

Desktop accent synchronization is exclusive to the active color theme name **Nacre**. It applies a restrained 20% blend to the Core workbench and syntax roles, retains role distinctions, and preserves foreground contrast. The nine fixed-color flavors are not tinted.

The implementation is theme-scoped and restores only the values and rules it owns. See [System accent synchronization](SYSTEM-ACCENT.md).

## 7. Visual regression samples

Open the files in \`tests/fixtures/syntax/\` with the **Nacre** color theme active:

- \`typescript.ts\` and \`react.tsx\`
- \`dart.dart\`
- \`python.py\`
- \`markup.html\`
- \`styles.css\`
- \`data.json\`

Review declaration, variable, parameter, function, type, keyword, string, numeric, property, markup, comment, punctuation and selection hierarchy. The fixtures support manual VS Code rendering review; automated tests also assert the role colors, TextMate count, semantic count and fixture coverage.

## 8. Non-goals

- Do not recolor every syntax token with a unique accent.
- Do not use gradients as a substitute for hierarchy.
- Do not copy another theme's full token assignment system into Nacre Core.
- Do not change file or folder icon silhouettes as part of palette work.
- Do not automatically switch the file icon theme when a color theme is selected.
- Do not tint alternative palette flavors with the desktop accent.
