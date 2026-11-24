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

function transformHexColors(svg, colorMap) {
  return svg.replace(/#[0-9a-f]{6}\b/gi, value => colorMap[value.toLowerCase()] ?? value);
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function mix(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function copySvgTree(sourceRoot, destinationRoot, transform) {
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

const neutralFolderColors = {
  '#7897ba': '#555B62',
  '#aee33e': '#AEB6B5',
  '#24272c': '#17191C',
  '#30343a': '#202327',
  '#78818d': '#4A5057',
  '#aeb6b5': '#747C84',
  '#f16b52': '#8B9299',
  '#ff896f': '#AEB6B5',
};

const baseIconTheme = readJson(sourceIconThemePath);
fs.rmSync(buildRoot, { recursive: true, force: true });

const mainFolderCount = copySvgTree(
  sourceFolderIcons,
  path.join(buildRoot, 'main', 'folders'),
  svg => transformHexColors(svg, neutralFolderColors),
);

const mainTheme = structuredClone(baseIconTheme);
mainTheme.name = 'Nacre File Icons';
rewriteIconPaths(mainTheme, 'main');
writeJson(path.join(root, 'themes', 'nacre-main-file-icons.json'), mainTheme);

const fileIconCount = walkSvgFiles(sourceFileIcons).length;

for (const flavor of flavors) {
  const folderAccent = mix(flavor.accent, '#17191C', 0.28);
  const accentLight = mix(flavor.accent, '#FFFFFF', 0.2);
  const folderColorMap = {
    '#555b62': folderAccent,
    '#aeb6b5': accentLight,
    '#747c84': flavor.accent,
    '#8b9299': flavor.accent,
    '#4a5057': folderAccent,
    '#f16b52': flavor.accent,
    '#ff896f': accentLight,
  };
  const fileColorMap = {
    '#f16b52': flavor.accent,
    '#ff896f': accentLight,
    '#d95740': folderAccent,
  };

  const flavorRoot = path.join(buildRoot, flavor.slug);
  const transformedFiles = copySvgTree(
    sourceFileIcons,
    path.join(flavorRoot, 'files'),
    svg => transformHexColors(svg, fileColorMap),
  );
  const transformedFolders = copySvgTree(
    path.join(buildRoot, 'main', 'folders'),
    path.join(flavorRoot, 'folders'),
    svg => transformHexColors(svg, folderColorMap),
  );

  const theme = structuredClone(baseIconTheme);
  theme.name = 'Nacre ' + flavor.short + ' Icons';
  rewriteIconPaths(theme, flavor.slug);
  writeJson(
    path.join(root, 'themes', 'nacre-' + flavor.slug + '-file-icons.json'),
    theme,
  );

  if (transformedFiles !== fileIconCount || transformedFolders !== mainFolderCount) {
    throw new Error('Incomplete icon generation for ' + flavor.short);
  }
}

console.log(
  'Generated neutral Nacre folders and seven flavor icon themes (' +
  fileIconCount + ' file SVGs and ' + mainFolderCount + ' folder SVGs per flavor).',
);
