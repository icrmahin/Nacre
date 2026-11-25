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

const collectSvgPaths = relativeRoot => {
  const absoluteRoot = path.join(root, relativeRoot);
  const output = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
        output.push(path.relative(absoluteRoot, fullPath));
      }
    }
  };
  visit(absoluteRoot);
  return output.sort();
};

const accentFolderBodySvg = (svg, accent) => svg.replace(/<path\b[^>]*>/i, pathTag => pathTag.replace(
  /(\b(?:fill|stroke)\s*=\s*)(["'])(#[0-9a-f]{3,8})\2/gi,
  (match, prefix, quote) => prefix + quote + accent + quote,
));

const expectedThemeLabels = [
  'Nacre', 'Nacre Mocha', 'Nacre Grove', 'Nacre Ember',
  'Nacre Tide', 'Nacre Abyss', 'Nacre Nocturne', 'Nacre Jade',
  'Nacre Dusk', 'Nacre Alloy',
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
  { id: 'nacre-tokyo-night-icons', label: 'Nacre Dusk Icons', path: './themes/nacre-tokyo-night-file-icons.json', slug: 'tokyo-night' },
  { id: 'nacre-one-dark-icons', label: 'Nacre Alloy Icons', path: './themes/nacre-one-dark-file-icons.json', slug: 'one-dark' },
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
  } else pass('All ten color themes use the approved names and order');
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
  pass('All nine flavor themes use one neutral text color with readable selection states');

  const expectedFlavorAccents = {
    mocha: '#CBA6F7', grove: '#A7C080', ember: '#FE8019',
    tide: '#7E9CD8', abyss: '#80CBC4', nocturne: '#719CD6', jade: '#2DD5B7',
    'tokyo-night': '#7AA2F7', 'one-dark': '#61AFEF',
  };
  const sourceFolderPaths = collectSvgPaths('icons/folders');
  for (const [slug, accent] of Object.entries(expectedFlavorAccents)) {
    const variantRoot = 'icons/build/' + slug + '/folders';
    const variantPaths = collectSvgPaths(variantRoot);
    if (JSON.stringify(variantPaths) !== JSON.stringify(sourceFolderPaths)) {
      fail(slug + ': generated folder SVG inventory differs from the source');
      continue;
    }

    for (const relative of sourceFolderPaths) {
      const source = fs.readFileSync(path.join(root, 'icons/folders', relative), 'utf8');
      const generated = fs.readFileSync(path.join(root, variantRoot, relative), 'utf8');
      if (generated !== accentFolderBodySvg(source, accent)) {
        fail(slug + ': folder SVG changed outside its first body path: ' + relative);
      }
    }

    const sourceBadge = fs.readFileSync(
      path.join(root, 'icons/folders/filled/folder_src.variant.carbon.svg'),
      'utf8',
    ).toLowerCase();
    const generatedBadge = fs.readFileSync(
      path.join(root, variantRoot, 'filled/folder_src.variant.carbon.svg'),
      'utf8',
    ).toLowerCase();
    if (!generatedBadge.includes(accent.toLowerCase())) {
      fail(slug + ': src folder body is missing its flavor accent');
    }
    if (!generatedBadge.includes('#4775d1') || !sourceBadge.includes('#4775d1')) {
      fail(slug + ': original multicolor src sub-icon was changed');
    }
  }
  pass('All nine flavor folders accent only the folder body and preserve multicolor sub-icons');

  const sourceFilePaths = collectSvgPaths('icons/files');
  for (const [slug] of Object.entries(expectedFlavorAccents)) {
    const variantRoot = 'icons/build/' + slug + '/files';
    const variantPaths = collectSvgPaths(variantRoot);
    if (JSON.stringify(variantPaths) !== JSON.stringify(sourceFilePaths)) {
      fail(slug + ': generated file SVG inventory differs from the source');
      continue;
    }
    for (const relative of sourceFilePaths) {
      const source = fs.readFileSync(path.join(root, 'icons/files', relative), 'utf8');
      const generated = fs.readFileSync(path.join(root, variantRoot, relative), 'utf8');
      if (generated !== source) {
        fail(slug + ': file glyph was modified instead of copied unchanged: ' + relative);
        break;
      }
    }
  }
  pass('All nine flavor file icon sets are byte-identical to the original Nacre file glyphs');

  const iconThemes = pkg.contributes?.iconThemes ?? [];
  const actualShape = iconThemes.map(({ id, label, path }) => ({ id, label, path }));
  const expectedShape = expectedIconThemes.map(({ id, label, path }) => ({ id, label, path }));
  if (JSON.stringify(actualShape) !== JSON.stringify(expectedShape)) {
    fail('File icon themes are not registered in the expected order and paths');
  } else pass('Ten file icon themes are registered for manual selection');

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

if (pkg?.version !== '1.0.3') fail('The approved package version must remain exactly 1.0.3');
else pass('Package version remains unchanged at 1.0.3');

if (colorTheme) {
  if (colorTheme.name !== 'Nacre') fail('Original Nacre color theme name is not preserved');
  else pass('Original Nacre color theme name is preserved');
  if (colorTheme.colors?.foreground !== '#EAE7DF') fail('Nacre Core foreground must use warm bone');
  if (colorTheme.colors?.focusBorder !== '#F16B52') fail('Nacre Core must keep Signal Vermilion as its signature accent');
  if (colorTheme.semanticTokenColors?.keyword !== '#F16B52') fail('Nacre Core keyword semantics must use Signal Vermilion');
  if (colorTheme.semanticTokenColors?.function !== '#D7C68F') fail('Nacre Core function semantics must use brass');
  if (colorTheme.semanticTokenColors?.comment !== '#697577') fail('Nacre Core comments must use muted graphite');
  if (colorTheme.tokenColors?.length !== 221) fail('Nacre Core must retain all 221 TextMate rules');
  if (colorTheme.colors?.['editor.background'] !== '#15191B') fail('Nacre Core editor background must be #15191B');
  else pass('Nacre Core editor background is #15191B');
  if (colorTheme.colors?.['sideBar.background'] !== '#15191B') fail('Nacre Core sidebar background must be #15191B');
  else pass('Nacre Core sidebar background is #15191B');
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
  const coloredAssets = [];
  for (const file of svgFiles) {
    const svg = fs.readFileSync(file, 'utf8').toLowerCase();
    const colors = svg.match(/#[0-9a-f]{6}\b/g) ?? [];
    if (colors.some(color => {
      const red = parseInt(color.slice(1, 3), 16);
      const green = parseInt(color.slice(3, 5), 16);
      const blue = parseInt(color.slice(5, 7), 16);
      return Math.max(red, green, blue) - Math.min(red, green, blue) > 1;
    })) coloredAssets.push(file);
  }
  if (coloredAssets.length) {
    fail('Main Nacre folder artwork is not fully grayscale: ' + coloredAssets.length + ' SVG(s)');
  } else pass('All main Nacre folder artwork is neutral grayscale');

  const defaultFolder = fs.readFileSync(
    path.join(mainFolderRoot, 'nacre-folder.svg'),
    'utf8',
  ).toLowerCase();
  if (!defaultFolder.includes('#777777') || defaultFolder.includes('#17191c')) {
    fail('Main Nacre custom folder should use visible neutral gray rather than a near-black fill');
  } else pass('Main Nacre custom folder uses a visible gray fill');

  const sourceBadge = fs.readFileSync(
    path.join(mainFolderRoot, 'filled/folder_src.variant.carbon.svg'),
    'utf8',
  ).toLowerCase();
  if (!sourceBadge.includes('#d0d0d0') || sourceBadge.includes('#4775d1')) {
    fail('Main Nacre src folder badge must be neutral gray, not blue');
  } else pass('Main Nacre src folder sub-icon is neutral gray');
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
