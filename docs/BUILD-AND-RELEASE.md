# Build, test and release

## Requirements

- Node.js 22 or later
- npm through the Node.js installation
- `@vscode/vsce` (invoked with `npx`)

The extension has no runtime npm dependencies. It uses the VS Code extension API and Node.js built-ins.

## Validate locally

Run the same core checks used by GitHub Actions:

```bash
npm run build:icons
npm run validate
npm test
node --check extension.js
node --check systemAccent.js
node --check syntaxAccent.js
```

npm run build:icons generates the neutral Nacre folder artwork and nine flavor-specific file icon sets from the shared SVG sources. Validation checks the ten color theme registrations, ten independently selectable file icon contributions, all generated SVG paths, Nacre Core palette roles and token coverage, neutral grayscale across every original Nacre folder SVG, flavor-colored embedded folder sub-icons, product-icon font references, and the rule that desktop-accent synchronization belongs only to the original Nacre theme. The prevalidate and pretest npm hooks run the icon generator automatically. Unit tests cover GNOME/KDE detection, accent parsing, workbench palette generation, syntax tinting, contrast, restoration and variant isolation.

## Build a local VSIX

```bash
npm run build:icons
npx --yes @vscode/vsce package --out ./icrmahin.nacre-test.vsix
```

Install it:

```bash
code --install-extension ./icrmahin.nacre-test.vsix --force
```

Alternatively, in VS Code open Extensions, select the `...` menu, choose **Install from VSIX...**, then select the package.

## Build a test VSIX on GitHub without publishing

Use **Actions → Build Nacre Test VSIX (No Release) → Run workflow**. Select the development branch `feat/nacre-core-original-design` in the branch selector and start the workflow.

The workflow runs validation and tests, packages the selected branch, and uploads a ZIP artifact containing the VSIX. Download it from the completed run's **Artifacts** section and extract the `.vsix`. The artifact expires after 14 days. This workflow does not create a GitHub Release, push a tag or publish to the Marketplace.

## Official release

The official release workflow is tag-only. It cannot be started with the manual **Run workflow** button. After the implementation has passed local theme-picker and visual testing and the release has been approved:

1. Update `CHANGELOG.md` and the package version.
2. Run the local validation and test commands.
3. Merge the approved changes into `main`.
4. Create and push a matching version tag such as `v1.0.3`.
5. The release workflow validates that the tag matches `package.json`, packages the VSIX and attaches it to a GitHub Release.

A successful test-artifact build is not an official release and does not publish to the Visual Studio Marketplace.
