import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const pass = message => console.log('PASS  ' + message);
const fail = message => failures.push(message);
const readJson = relativePath => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    fail(relativePath + ': ' + error.message);
    return null;
  }
};
const exists = relativePath => fs.existsSync(path.join(root, relativePath));

const expectedThemeLabels = [
  'Nacre', 'Nacre Mocha', 'Nacre Grove', 'Nacre Ember',
  'Nacre Tide', 'Nacre Abyss', 'Nacre Nocturne', 'Nacre Jade',
];
const expectedIconThemes = [
  { id: 'nacre-file-icons', label: 'Nacre File Icons', path: './themes/nacre-main-file-icons.json', slug: 'main' },
  { id: 'nacre-mocha-icons', label: 'Nacre Mocha Icons', path: './themes/nacre-mocha-file-icons.json', slug: 'mocha' },
  { id: 'nacre-grove-icons', label: 'Nacre Grove Icons', path: './themes/nacre-grove-file-icons.json', slug: 'grove' },
  { id: 'nacre-ember-icons', label: 'Nacre Ember Icons', path: './themes/nacre-ember-file-icons.json', slug: 'ember' },
  { id: 'nacre-tide-icons', label: 'Nacre Tide Icons', path: './themes/nacre-tide-file-icons.json', slug: 'tide' },
  { id: 'nacre-abyss-icons', label: 'Nacre Abyss Icons', path: './themes/nacre-abyss-file-icons.json', slug: 'abyss' },
  { id: 'nacre-nocturne-icons', label: 'Nacre Nocturne Icons', path: './themes/nacre-nocturne-file-icons.json', slug: 'nocturne' },
  { id: 'nacre-jade-icons', label: 'Nacre Jade Icons', path: './themes/nacre-jade-file-icons.json', slug: 'jade' },
];

const pkg = readJson('package.json');

if (pkg) {
  if (pkg.name !== 'nacre') fail('Expected package name "nacre", found "' + pkg.name + '"');
  else pass('Package name is nacre');
  if (pkg.publisher !== 'icrmahin') fail('Expected publisher "icrmahin", found "' + pkg.publisher + '"');
  else pass('Publisher is icrmahin');
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version ?? '')) fail('Invalid semantic version: ' + pkg.version);
  else pass('Package version is ' + pkg.version);

  const themes = pkg.contributes?.themes ?? [];
  const actualLabels = themes.map(theme => theme.label);
  if (JSON.stringify(actualLabels) !== JSON.stringify(expectedThemeLabels)) {
    fail('Color themes are not registered in the expected order: ' + actualLabels.join(', '));
  } else pass('All eight color themes use the approved names and order');
  if (new Set(actualLabels).size !== actualLabels.length) fail('Color theme labels must be unique');
  else pass('Color theme labels are unique');

  for (const entry of themes) {
    const relative = entry.path?.replace(/^\.\//, '');
    if (!relative || !exists(relative)) {
      fail('Color theme contribution path missing: ' + entry.path);
      continue;
    }
    const theme = readJson(relative);
    if (!theme) continue;
    if (theme.name !== entry.label) fail(relative + ': name does not match manifest label');
    if (theme.type !== 'dark') fail(relative + ': expected a dark theme');
    if (!theme.colors?.['editor.background']) fail(relative + ': editor.background is missing');
    if (!Array.isArray(theme.tokenColors) || theme.tokenColors.length < 100) {
      fail(relative + ': expected the complete Nacre TextMate scope set');
    }
    if (!theme.semanticTokenColors || Object.keys(theme.semanticTokenColors).length < 20) {
      fail(relative + ': semantic token colors are missing or incomplete');
    }
  }

  const iconThemes = pkg.contributes?.iconThemes ?? [];
  const actualShape = iconThemes.map(({ id, label, path }) => ({ id, label, path }));
  const expectedShape = expectedIconThemes.map(({ id, label, path }) => ({ id, label, path }));
  if (JSON.stringify(actualShape) !== JSON.stringify(expectedShape)) {
    fail('File icon themes are not registered in the expected order and paths');
  } else pass('Eight file icon themes are registered for manual selection');

  for (const entry of iconThemes) {
    const relative = entry.path?.replace(/^\.\//, '');
    if (!relative || !exists(relative)) {
      fail('File icon theme contribution path missing: ' + entry.path);
      continue;
    }
    const iconTheme = readJson(relative);
    if (!iconTheme) continue;
    if (iconTheme.name !== entry.label) fail(relative + ': icon theme name does not match its label');
    const iconPaths = Object.values(iconTheme.iconDefinitions ?? {})
      .filter(value => value.iconPath)
      .map(value => value.iconPath);
    if (iconPaths.length === 0) fail(relative + ': no SVG icon paths found');
    for (const iconPath of iconPaths) {
      const resolved = path.resolve(root, 'themes', iconPath);
      if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
        fail(relative + ': missing SVG reference ' + iconPath);
      }
    }
    const flavor = expectedIconThemes.find(item => item.label === entry.label);
    if (flavor?.slug === 'main') {
      if (!iconPaths.some(value => value.includes('../icons/build/main/folders/'))) {
        fail('Main Nacre icon theme does not use neutral folder artwork');
      }
    } else if (flavor) {
      if (!iconPaths.some(value => value.includes('../icons/build/' + flavor.slug + '/files/'))) {
        fail(entry.label + ': file icons are not flavor-specific');
      }
      if (!iconPaths.some(value => value.includes('../icons/build/' + flavor.slug + '/folders/'))) {
        fail(entry.label + ': folder icons are not flavor-specific');
      }
    }
  }

  const productIconThemes = pkg.contributes?.productIconThemes ?? [];
  if (productIconThemes.length !== 1 ||
      productIconThemes[0].id !== 'nacre-product-icons' ||
      productIconThemes[0].path !== './themes/nacre-product-icons.json') {
    fail('The original Nacre Product Icons contribution must remain unchanged');
  } else pass('Original Nacre Product Icons contribution is preserved');

  const accentSetting = pkg.contributes?.configuration?.properties?.['nacre.systemAccent.enable'];
  if (accentSetting?.default !== true) fail('nacre.systemAccent.enable must remain enabled by default');
  else pass('System accent integration remains enabled by default');
}

const productIcons = readJson('themes/nacre-product-icons.json');
if (productIcons) {
  const fonts = productIcons.fonts ?? [];
  const fontIds = new Set(fonts.map(font => font.id));
  let checkedFonts = 0;
  for (const font of fonts) {
    for (const source of font.src ?? []) {
      const resolved = path.resolve(root, 'themes', source.path);
      if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
        fail('Missing product icon font: ' + source.path);
      } else checkedFonts += 1;
    }
  }
  for (const [iconId, definition] of Object.entries(productIcons.iconDefinitions ?? {})) {
    if (definition.fontId && !fontIds.has(definition.fontId)) {
      fail('Product icon ' + iconId + ' references undeclared font ' + definition.fontId);
    }
  }
  if (checkedFonts > 0) pass(checkedFonts + ' product icon font file reference(s) resolve');
  else fail('No product icon font file references found');
}

const colorTheme = readJson('themes/nacre-color-theme.json');
if (colorTheme) {
  if (colorTheme.name !== 'Nacre') fail('Original Nacre color theme name is not preserved');
  else pass('Original Nacre color theme name is preserved');
  if (colorTheme.colors?.['editor.background'] !== '#0B0C0E') fail('Original Nacre editor background must remain #0B0C0E');
  else pass('Original Nacre editor background is preserved');
  if (colorTheme.colors?.['sideBar.background'] !== '#111214') fail('Original Nacre sidebar background must remain #111214');
  else pass('Original Nacre sidebar background is preserved');
}

const mainFolderArtwork = 'icons/build/main/folders/nacre-folder.svg';
if (exists(mainFolderArtwork)) {
  const svg = fs.readFileSync(path.join(root, mainFolderArtwork), 'utf8').toLowerCase();
  if (svg.includes('#7897ba') || svg.includes('#aee33e') || svg.includes('#f16b52')) {
    fail('Main Nacre folder artwork still contains blue, lime or orange accent colors');
  } else pass('Main Nacre folder artwork uses a neutral graphite palette');
} else fail('Generated neutral Nacre folder artwork is missing');

const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
if (/get\('colorTheme'\)\s*===\s*'Nacre'/.test(extensionSource)) {
  pass('Desktop accent synchronization remains limited to the original Nacre theme');
} else fail('Desktop accent synchronization must remain gated to the exact Nacre theme name');
if (/workbench\.iconTheme/.test(extensionSource)) fail('Extension code must not automatically change the selected file icon theme');
else pass('File icon theme pairing remains entirely manual');

if (exists('THIRD-PARTY-THEMES.md')) pass('Third-party palette attribution file exists');
else fail('Missing third-party palette attribution file');

if (failures.length) {
  console.error('\n' + failures.length + ' validation issue(s):');
  for (const failure of failures) console.error('- ' + failure);
  process.exitCode = 1;
} else {
  console.log('\nNacre source validation passed.');
}
