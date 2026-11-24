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


  const uiTextKeys = [
    'foreground', 'disabledForeground', 'descriptionForeground',
    'sideBar.foreground', 'sideBarTitle.foreground',
    'activityBar.foreground', 'activityBar.inactiveForeground',
    'tab.activeForeground', 'tab.inactiveForeground', 'tab.unfocusedActiveForeground',
    'panelTitle.activeForeground', 'panelTitle.inactiveForeground',
    'editor.foreground', 'editorLineNumber.foreground', 'editorLineNumber.activeForeground',
    'input.foreground', 'quickInput.foreground', 'menu.foreground',
    'list.activeSelectionForeground', 'list.inactiveSelectionForeground', 'list.focusForeground',
    'list.activeSelectionIconForeground', 'list.inactiveSelectionIconForeground',
    'editor.selectionForeground', 'breadcrumb.foreground', 'breadcrumb.focusForeground',
    'breadcrumb.activeSelectionForeground', 'menu.selectionForeground', 'menubar.selectionForeground',
    'titleBar.activeForeground', 'titleBar.inactiveForeground',
    'settings.headerForeground', 'commandCenter.foreground', 'commandCenter.activeForeground',
  ];
  const selectionPairs = [
    ['list.activeSelectionForeground', 'list.activeSelectionBackground'],
    ['list.inactiveSelectionForeground', 'list.inactiveSelectionBackground'],
    ['editor.selectionForeground', 'editor.selectionBackground'],
    ['menu.selectionForeground', 'menu.selectionBackground'],
    ['menubar.selectionForeground', 'menubar.selectionBackground'],
    ['breadcrumb.activeSelectionForeground', 'breadcrumb.activeSelectionBackground'],
  ];
  for (const entry of themes.slice(1)) {
    const relative = entry.path?.replace(/^\.\//, '');
    const theme = relative ? readJson(relative) : null;
    if (!theme) continue;
    for (const key of uiTextKeys) {
      if (theme.colors?.[key] !== '#E6E9EF') {
        fail(entry.label + ': expected neutral #E6E9EF text for ' + key + ', found ' + theme.colors?.[key]);
      }
    }
    for (const [foregroundKey, backgroundKey] of selectionPairs) {
      const foreground = theme.colors?.[foregroundKey];
      const background = theme.colors?.[backgroundKey];
      if (foreground && background && foreground.toLowerCase() === background.toLowerCase()) {
        fail(entry.label + ': selected text is invisible for ' + foregroundKey);
      }
    }
  }
  pass('All seven flavor themes use one neutral text color with readable selection states');

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

  const expectedAccents = {
    mocha: '#cba6f7', grove: '#a7c080', ember: '#fe8019',
    tide: '#7e9cd8', abyss: '#80cbc4', nocturne: '#719cd6', jade: '#2dd5b7',
  };
  for (const [slug, accent] of Object.entries(expectedAccents)) {
    const fileRoot = path.join(root, 'icons/build', slug, 'files');
    const folderRoot = path.join(root, 'icons/build', slug, 'folders');
    const scan = directory => {
      let contents = '';
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) contents += scan(fullPath);
        else if (entry.isFile() && entry.name.endsWith('.svg')) contents += fs.readFileSync(fullPath, 'utf8').toLowerCase();
      }
      return contents;
    };
    if (!exists(path.relative(root, fileRoot)) || !exists(path.relative(root, folderRoot))) {
      fail('Missing generated icon assets for ' + slug);
      continue;
    }
    if (!scan(fileRoot).includes(accent)) fail(slug + ': file SVGs do not use their flavor accent');
    if (!scan(folderRoot).includes(accent)) fail(slug + ': folder SVGs do not use their flavor accent');
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

const mainFolderRoot = path.join(root, 'icons/build/main/folders');
if (exists('icons/build/main/folders/nacre-folder.svg')) {
  const svgFiles = [];
  const collectSvgFiles = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collectSvgFiles(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.svg')) svgFiles.push(fullPath);
    }
  };
  collectSvgFiles(mainFolderRoot);
  const defaultBluePalette = ['#7897ba', '#8ca9cc', '#aee33e', '#f16b52', '#ff896f'];
  const offenders = svgFiles.filter(file => {
    const svg = fs.readFileSync(file, 'utf8').toLowerCase();
    return defaultBluePalette.some(color => svg.includes(color));
  });
  if (offenders.length) fail('Main Nacre folder artwork still contains default blue/lime/orange palette colors: ' + offenders.length + ' SVG(s)');
  else pass('All main Nacre folder artwork uses neutralized default folder colors');
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
