# Quality checks

## Automated source validation

Run `npm run validate`. The script verifies:

- `package.json` parses and uses package name `nacre`, publisher `icrmahin`, version `1.0.0`.
- Exactly one color theme is contributed.
- Every color, file-icon, and product-icon contribution points to an existing JSON file.
- All file icon SVG paths referenced by the file icon theme exist.
- The product icon font exists and the font ID used by glyph definitions is declared.
- Theme and icon JSON files parse successfully.

The GitHub Actions workflow runs these checks on pushes and pull requests.

## Checks recorded for 1.0.0

- Source JSON parsing: PASS
- Extension JavaScript syntax check: PASS
- Theme contribution paths: PASS
- File icon SVG paths: PASS
- Product icon font references: PASS
- VSIX archive integrity: PASS
- VSIX manifest and package identity: PASS
- Live VS Code installation/UI test: NOT PERFORMED

Static validation cannot guarantee identical rendering across VS Code versions, language extensions, semantic-token providers, or operating systems. Perform a live installation test before distributing a new build.
