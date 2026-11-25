import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceIconThemePath = path.join(root, 'themes', 'nacre-file-icons.json');
const sourceFileIcons = path.join(root, 'icons', 'files');
const sourceFolderIcons = path.join(root, 'icons', 'folders');
const buildRoot = path.join(root, 'icons', 'build');

const flavors = [
  { slug: 'mocha', short: 'Mocha', accent: '#CBA6F7' },
  { slug: 'grove', short: 'Grove', accent: '#A7C080' },
  { slug: 'ember', short: 'Ember', accent: '#FE8019' },
  { slug: 'tide', short: 'Tide', accent: '#7E9CD8' },
  { slug: 'abyss', short: 'Abyss', accent: '#80CBC4' },
  { slug: 'nocturne', short: 'Nocturne', accent: '#719CD6' },
  { slug: 'jade', short: 'Jade', accent: '#2DD5B7' },
  { slug: 'tokyo-night', short: 'Dusk', accent: '#7AA2F7' },
  { slug: 'one-dark', short: 'Alloy', accent: '#61AFEF' },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function walkSvgFiles(directory) {
  if (!fs.existsSync(directory)) throw new Error('Missing icon source directory: ' + directory);
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkSvgFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) output.push(fullPath);
  }
  return output;
}

function copySvgTree(sourceRoot, destinationRoot, transform = svg => svg) {
  const files = walkSvgFiles(sourceRoot);
  for (const sourcePath of files) {
    const relative = path.relative(sourceRoot, sourcePath);
    const destinationPath = path.join(destinationRoot, relative);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    const source = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, transform(source, relative));
  }
  return files.length;
}

function rewriteIconPaths(iconTheme, flavorSlug) {
  for (const definition of Object.values(iconTheme.iconDefinitions ?? {})) {
    if (!definition.iconPath) continue;
    if (flavorSlug === 'main') {
      definition.iconPath = definition.iconPath.replace(
        '../icons/folders/',
        '../icons/build/main/folders/',
      );
    } else {
      definition.iconPath = definition.iconPath
        .replace('../icons/files/', '../icons/build/' + flavorSlug + '/files/')
        .replace('../icons/folders/', '../icons/build/' + flavorSlug + '/folders/');
    }
  }
}

// The first path in each folder SVG is the folder body. Recolor only that
// shape; all later paths are embedded folder marks and retain their source
// colors (including multicolor language/tool glyphs).
function accentFolderBodySvg(svg, accent) {
  return svg.replace(/<path\b[^>]*>/i, pathTag => pathTag.replace(
    /(\b(?:fill|stroke)\s*=\s*)(["'])(#[0-9a-f]{3,8})\2/gi,
    (match, prefix, quote) => prefix + quote + accent + quote,
  ));
}

const neutralFolderColors = {
  '#7897ba': '#888888',
  '#8ca9cc': '#A3A3A3',
  '#aee33e': '#D0D0D0',
  '#24272c': '#777777',
  '#303236': '#777777',
  '#30343a': '#888888',
  '#78818d': '#A5A5A5',
  '#aeb6b5': '#D0D0D0',
  '#4775d1': '#D0D0D0',
  '#f16b52': '#D0D0D0',
  '#ff896f': '#D0D0D0',
};

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function neutralizeFolderSvg(svg) {
  return svg.replace(/#[0-9a-f]{6}\b/gi, value => {
    const lower = value.toLowerCase();
    if (neutralFolderColors[lower]) return neutralFolderColors[lower];

    const { r, g, b } = hexToRgb(lower);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma > 3) return '#D0D0D0';

    const gray = Math.round((r + g + b) / 3);
    const lifted = gray < 96 ? 119 : gray < 144 ? 144 : gray < 196 ? 176 : 208;
    return '#' + lifted.toString(16).padStart(2, '0').repeat(3);
  });
}

const baseIconTheme = readJson(sourceIconThemePath);
fs.rmSync(buildRoot, { recursive: true, force: true });

const mainFolderCount = copySvgTree(
  sourceFolderIcons,
  path.join(buildRoot, 'main', 'folders'),
  svg => neutralizeFolderSvg(svg),
);

const mainTheme = JSON.parse(JSON.stringify(baseIconTheme));
mainTheme.name = 'Nacre File Icons';
rewriteIconPaths(mainTheme, 'main');
writeJson(path.join(root, 'themes', 'nacre-main-file-icons.json'), mainTheme);

const fileIconCount = walkSvgFiles(sourceFileIcons).length;

for (const flavor of flavors) {
  const flavorRoot = path.join(buildRoot, flavor.slug);

  // Variant file glyphs are identical to the original Nacre file glyphs.
  const copiedFiles = copySvgTree(
    sourceFileIcons,
    path.join(flavorRoot, 'files'),
  );

  // Variant folders use the flavor accent on the folder body only. Embedded
  // folder sub-icons retain their original multicolor artwork.
  const accentedFolders = copySvgTree(
    sourceFolderIcons,
    path.join(flavorRoot, 'folders'),
    svg => accentFolderBodySvg(svg, flavor.accent),
  );

  const theme = JSON.parse(JSON.stringify(baseIconTheme));
  theme.name = 'Nacre ' + flavor.short + ' Icons';
  rewriteIconPaths(theme, flavor.slug);
  writeJson(
    path.join(root, 'themes', 'nacre-' + flavor.slug + '-file-icons.json'),
    theme,
  );

  if (copiedFiles !== fileIconCount || accentedFolders !== walkSvgFiles(sourceFolderIcons).length) {
    throw new Error('Incomplete icon generation for ' + flavor.short);
  }
}

console.log(
  'Generated neutral Nacre folders and nine flavor icon themes (' +
  fileIconCount + ' unchanged file SVGs and ' + mainFolderCount + ' folder SVGs per flavor).',
);
