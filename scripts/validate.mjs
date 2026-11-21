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
const pkg = readJson('package.json');

if (pkg) {
  if (pkg.name !== 'nacre') fail(`Expected package name "nacre", found "${pkg.name}"`);
  else pass('Package name is nacre');
  if (pkg.publisher !== 'icrmahin') fail(`Expected publisher "icrmahin", found "${pkg.publisher}"`);
  else pass('Publisher is icrmahin');
  if (pkg.version !== '1.0.0') fail(`Expected release version 1.0.0, found "${pkg.version}"`);
  else pass('Version is 1.0.0');

  const themes = pkg.contributes?.themes ?? [];
  if (themes.length !== 1 || themes[0]?.label !== 'Nacre') {
    fail(`Expected exactly one color theme named Nacre; found ${themes.length}`);
  } else pass('Exactly one color theme is contributed: Nacre');

  for (const [kind, entries] of Object.entries({
    color: themes,
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
  if (colorTheme.name !== 'Nacre') fail('Color theme JSON name is not Nacre');
  else pass('Color theme JSON name is Nacre');
  if (colorTheme.colors?.['editor.background'] !== '#121212') {
    fail(`Editor background should be #121212, found ${colorTheme.colors?.['editor.background']}`);
  } else pass('Editor background is #121212');
  if (colorTheme.colors?.['sideBar.background'] !== '#242527') {
    fail(`Sidebar background should be #242527, found ${colorTheme.colors?.['sideBar.background']}`);
  } else pass('Sidebar background is #242527');
}

if (failures.length) {
  console.error(`\n${failures.length} validation issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('\nNacre source validation passed.');
}
