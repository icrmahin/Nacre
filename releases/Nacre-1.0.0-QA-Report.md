# Nacre 1.0.0 Main Theme — QA Report

## Build identity
- Extension ID: `icrmahin.nacre`
- Package name: `nacre`
- Version: `1.0.0` (unchanged)
- Color themes contributed: 1 (`Nacre`)
- File icon theme: `Nacre File Icons`
- Product icon theme: `Nacre Product Icons`

## Requested changes
- Editor background: `#121212`.
- Main surrounding surfaces: `#242527`.
- Syntax colors strengthened with clearer role separation: coral keywords, lavender functions, amber type names, blue properties/constants, cool-blue strings, neutral variables.
- Removed Nacre Vivid, Nacre Rose and Nacre OLED color-theme contributions and their JSON files.
- File icon and product icon assets/mappings preserved.

## Validation
- Package JSON parses: PASS
- Main theme JSON parses: PASS
- Extension JavaScript syntax: PASS
- Theme registration paths exist: PASS
- File/product icon contribution paths exist: PASS
- VSIX archive integrity: PASS
- VSIX manifest identity matches package metadata: PASS
- Live VS Code installation: NOT TESTED

## Preservation comparison
- All `icons/files/` SVGs and `icons/folders/` SVGs are carried from the latest Folder/OLED source unchanged.
- File icon mapping JSON unchanged.
- Product icon mapping JSON and WOFF2 font unchanged.

- SVG assets preserved unchanged: 489 / 489
- SVG asset differences: 0
- File icon mapping unchanged: True
- Product icon mapping unchanged: True
- Product icon font unchanged: True

- File icon mapping exact match: True
- Product icon mapping exact match: True
- Product icon font exact match: True
