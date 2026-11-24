import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => failures.push(message);
const readJson = (relativePath) => {
  const fullPath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return null;
  }
};
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const expectedThemeLabels = [
  'Nacre',
  'Nacre / Catppuccin Mocha',
  'Nacre / Everforest Dark',
  'Nacre / Gruvbox Dark Medium',
  'Nacre / Kanagawa Wave',
  'Nacre / Material Ocean',
  'Nacre / Nightfox',
  'Nacre / Osaka Jade',
];

const pkg = readJson('package.json');

if (pkg) {
  if (pkg.name !== 'nacre') fail(`Expected package name "nacre", found "${pkg.name}"`);
  else pass('Package name is nacre');
  if (pkg.publisher !== 'icrmahin') fail(`Expected publisher "icrmahin", found "${pkg.publisher}"`);
  else pass('Publisher is icrmahin');
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version ?? '')) {
    fail(`Expected a valid semantic version, found "${pkg.version}"`);
  } else pass(`Package version is ${pkg.version}`);

  const themes = pkg.contributes?.themes ?? [];
  const actualLabels = themes.map((theme) => theme.label);
  if (JSON.stringify(actualLabels) !== JSON.stringify(expectedThemeLabels)) {
    fail(`Expected the main Nacre theme followed by seven named palette themes; found: ${actualLabels.join(', ')}`);
  } else pass('All eight color themes are registered in the expected order');

  if (new Set(actualLabels).size !== actualLabels.length) {
    fail('Color theme labels must be unique');
  } else pass('Color theme labels are unique');

  for (const entry of themes) {
    const relative = entry.path?.replace(/^\.\//, '');
    if (!relative || !exists(relative)) {
      fail(`Color theme contribution path missing: ${entry.path}`);
      continue;
    }

    const theme = readJson(relative);
    if (!theme) continue;
    if (theme.name !== entry.label) {
      fail(`${relative}: theme name "${theme.name}" does not match manifest label "${entry.label}"`);
    } else pass(`Theme JSON matches manifest label: ${entry.label}`);

    if (theme.type !== 'dark') fail(`${relative}: expected a dark theme`);
    if (!theme.colors?.['editor.background']) fail(`${relative}: editor.background is missing`);
    if (!Array.isArray(theme.tokenColors) || theme.tokenColors.length < 100) {
      fail(`${relative}: expected the full Nacre TextMate scope set`);
    }
    if (!theme.semanticTokenColors || Object.keys(theme.semanticTokenColors).length < 20) {
      fail(`${relative}: semantic token colors are missing or incomplete`);
    }
  }

  for (const [kind, entries] of Object.entries({
    fileIcon: pkg.contributes?.iconThemes ?? [],
    productIcon: pkg.contributes?.productIconThemes ?? [],
  })) {
    for (const entry of entries) {
      const relative = entry.path?.replace(/^\.\//, '');
      if (!relative || !exists(relative)) fail(`${kind} contribution path missing: ${entry.path}`);
      else pass(`${kind} contribution exists: ${relative}`);
      if (relative?.endsWith('.json')) readJson(relative);
    }
  }

  const accentSetting = pkg.contributes?.configuration?.properties?.['nacre.systemAccent.enable'];
  if (accentSetting?.default !== true) {
    fail('nacre.systemAccent.enable must remain enabled by default');
  } else pass('System accent integration remains enabled by default');
}

const fileIcons = readJson('themes/nacre-file-icons.json');
if (fileIcons) {
  let iconPaths = 0;
  for (const [iconId, definition] of Object.entries(fileIcons.iconDefinitions ?? {})) {
    if (!definition.iconPath) continue;
    iconPaths += 1;
    const resolved = path.resolve(root, 'themes', definition.iconPath);
    if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
      fail(`Missing SVG for ${iconId}: ${definition.iconPath}`);
    }
  }
  if (iconPaths > 0) pass(`${iconPaths} file icon SVG references resolve`);
  else fail('No file icon SVG references found');
}

const productIcons = readJson('themes/nacre-product-icons.json');
if (productIcons) {
  const fonts = productIcons.fonts ?? [];
  const fontIds = new Set(fonts.map((font) => font.id));
  let checkedFonts = 0;
  for (const font of fonts) {
    for (const source of font.src ?? []) {
      const resolved = path.resolve(root, 'themes', source.path);
      if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
        fail(`Missing product icon font: ${source.path}`);
      } else checkedFonts += 1;
    }
  }
  for (const [iconId, definition] of Object.entries(productIcons.iconDefinitions ?? {})) {
    if (definition.fontId && !fontIds.has(definition.fontId)) {
      fail(`Product icon ${iconId} references undeclared font ${definition.fontId}`);
    }
  }
  if (checkedFonts > 0) pass(`${checkedFonts} product icon font file reference(s) resolve`);
  else fail('No product icon font file references found');
}

const colorTheme = readJson('themes/nacre-color-theme.json');
if (colorTheme) {
  if (colorTheme.name !== 'Nacre') fail('Original color theme JSON name is not Nacre');
  else pass('Original Nacre theme name is preserved');
  if (colorTheme.colors?.['editor.background'] !== '#0B0C0E') {
    fail(`Original Nacre editor background should be #0B0C0E, found ${colorTheme.colors?.['editor.background']}`);
  } else pass('Original Nacre editor background is preserved');
  if (colorTheme.colors?.['sideBar.background'] !== '#111214') {
    fail(`Original Nacre sidebar background should be #111214, found ${colorTheme.colors?.['sideBar.background']}`);
  } else pass('Original Nacre sidebar background is preserved');
}

const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
if (/get\('colorTheme'\)\s*===\s*'Nacre'/.test(extensionSource)) {
  pass('Desktop accent synchronization is limited to the original Nacre theme');
} else {
  fail('Desktop accent synchronization must remain gated to the original Nacre theme only');
}

const thirdPartyAttribution = 'THIRD-PARTY-THEMES.md';
if (exists(thirdPartyAttribution)) pass('Third-party palette attribution file exists');
else fail('Missing third-party palette attribution file');

if (failures.length) {
  console.error(`\n${failures.length} validation issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('\nNacre source validation passed.');
}
