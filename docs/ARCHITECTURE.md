# Architecture

Nacre is a Visual Studio Code extension whose manifest contributes one color theme, one file icon theme, one product icon theme, and a small runtime feature for inline color-value decorations.

## Extension manifest

`package.json` is the source of truth for the extension ID (`icrmahin.nacre`), version (`1.0.0`), VS Code engine range, extension icon, activation, settings, and theme contribution paths. The package name is `nacre`; the publisher is `icrmahin`.

## Color theme

`themes/nacre-color-theme.json` contains two distinct parts:

- `colors`: VS Code workbench color identifiers for the editor, sidebars, panels, widgets, menus, status/title bars, lists, terminal, and other UI surfaces.
- `tokenColors`: TextMate scope rules that define syntax highlighting.

Only one color theme is declared in the `contributes.themes` array.

## File icon theme

`themes/nacre-file-icons.json` maps file extensions, exact file names, language IDs, and folder names to icon definitions. SVG drawings are stored in `icons/files/` and `icons/folders/`. The icon-theme JSON uses relative paths to these assets.

## Product icon theme

`themes/nacre-product-icons.json` maps product-icon IDs to font codepoints. `themes/nacre-ui-icons.woff2` contains the corresponding glyph font. The font ID referenced by the definitions is `nacre-ui-icons`.

## Runtime extension code

`extension.js` implements two runtime features. It retains the existing inline color-value highlighter and coordinates KDE accent synchronization when Nacre is the active theme. `kdeAccent.js` reads the current accent from the freedesktop appearance portal, falls back to KDE's `kdeglobals` file, watches for palette changes, and derives theme-scoped workbench color overrides. The overrides are written to `workbench.colorCustomizations` under `[Nacre]`; syntax token rules are not changed.

## Validation

`scripts/validate.mjs` performs static validation of the manifest and local asset references. It does not launch VS Code or prove visual rendering behavior.
