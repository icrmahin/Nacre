# Build and release

## Requirements

- Node.js (current LTS recommended)
- npm through the Node.js installation
- `@vscode/vsce` (invoked with `npx`)

No runtime npm dependencies are declared by this extension. `extension.js` uses the VS Code extension API.

## Validate source

```bash
npm run validate
npm test
node --check extension.js
node --check kdeAccent.js
```

The validation script checks manifest identity/version, JSON syntax, contribution file paths, SVG icon paths, product icon font paths, and that exactly one color theme is contributed. It also reports the number of icon definitions and mappings. The Node test suite covers KDE color parsing, Plasma session detection, and generated workbench colors.

## Package a VSIX

From the repository root:

```bash
npx --yes @vscode/vsce package --out ./releases/icrmahin.nacre-1.0.1.vsix
```

The output path can be changed for local builds. Keep the `package.json` version aligned with the intended release. The GitHub Actions release workflow builds the VSIX from the tagged source and attaches it to the matching GitHub Release.

## Local installation

```bash
code --install-extension ./releases/icrmahin.nacre-1.0.0.vsix
```

Then select `Nacre`, `Nacre File Icons`, and `Nacre Product Icons` separately through the Command Palette.

## Release checklist

1. Update `CHANGELOG.md`.
2. Confirm theme contributions and paths in `package.json`.
3. Run `npm run validate`.
4. Build the VSIX with `vsce`.
5. Verify the VSIX archive and inspect `extension/package.json` and `extension.vsixmanifest`.
6. Install the package into a clean VS Code profile and test the three theme selectors.
7. Verify syntax in several languages and confirm file/folder/product icons render.
8. Generate SHA-256 checksums and attach the VSIX and source archive to the release.

The 1.0.0 artifact is retained as a historical release. The 1.0.1 package is generated from the current source by GitHub Actions; perform a clean-profile installation and live KDE Plasma test before marketplace publication.
