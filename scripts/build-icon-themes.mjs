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

function getAccentShade(luminance, accent) {
  const light = mix(accent, '#FFFFFF', 0.24);
  const dark = mix(accent, '#15191B', 0.2);
  if (luminance >= 0.9) return '#FFFFFF';
  if (luminance <= 0.1) return '#15191B';
  if (luminance >= 0.62) return light;
  if (luminance <= 0.28) return dark;
  return accent;
}

function recolorColor(value, accent) {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (['none', 'transparent', 'currentcolor', 'white', 'black'].includes(lower)) return value;
  if (lower.startsWith('url(')) return value;

  const p3 = lower.match(/^color\(display-p3\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)$/);
  if (p3) {
    const [r, g, b] = p3.slice(1).map(Number);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return getAccentShade(luminance, accent);
  }

  const hex = lower.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (!hex) return value;
  let digits = hex[1];
  let alpha = '';
  if (digits.length === 4 || digits.length === 8) {
    alpha = digits.slice(-2);
    digits = digits.slice(0, -2);
  }
  if (digits.length === 3) digits = digits.split('').map(char => char + char).join('');
  const rgb = hexToRgb('#' + digits);
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  const shade = getAccentShade(luminance, accent);
  return alpha ? shade + alpha : shade;
}

function recolorFileSvg(svg, accent) {
  return svg
    .replace(/((?:fill|stroke|stop-color)\s*=\s*)(["'])(.*?)\2/gi, (match, prefix, quote, value) =>
      prefix + quote + recolorColor(value, accent) + quote)
    .replace(/(style\s*=\s*)(["'])(.*?)\2/gi, (match, prefix, quote, style) => {
      const recolored = style.replace(/((?:fill|stroke|stop-color)\s*:\s*)([^;]+)/gi, (declaration, property, value) =>
        property + recolorColor(value, accent));
      return prefix + quote + recolored + quote;
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
  '#7897ba': '#292D32',
  '#8ca9cc': '#747C84',
  '#aee33e': '#747C84',
  '#24272c': '#17191C',
  '#30343a': '#202327',
  '#78818d': '#4A5057',
  '#aeb6b5': '#747C84',
  '#f16b52': '#8B9299',
  '#ff896f': '#747C84',
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
    '#292d32': folderAccent,
    '#747c84': accentLight,
    '#8b9299': flavor.accent,
    '#4a5057': folderAccent,
    '#f16b52': flavor.accent,
    '#ff896f': accentLight,
  };
  const flavorRoot = path.join(buildRoot, flavor.slug);
  const transformedFiles = copySvgTree(
    sourceFileIcons,
    path.join(flavorRoot, 'files'),
    svg => recolorFileSvg(svg, flavor.accent),
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
