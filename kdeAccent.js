'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

const PORTAL_DESTINATION = 'org.freedesktop.portal.Desktop';
const PORTAL_OBJECT_PATH = '/org/freedesktop/portal/desktop';
const PORTAL_INTERFACE = 'org.freedesktop.portal.Settings';
const CONFIG_FILE = 'kdeglobals';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function hexToRgb(value) {
    if (typeof value !== 'string') return null;
    const hex = value.trim().replace(/^#/, '');
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
    const normalized = hex.length === 3
        ? hex.split('').map(char => char + char).join('')
        : hex;
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    };
}

function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map(value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function parseColorValue(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    const hexMatch = trimmed.match(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) return rgbToHex(hexToRgb(trimmed));

    // KConfig stores accent and selection colors as decimal R,G,B values.
    const components = trimmed.split(/[\s,;]+/).filter(Boolean).map(Number);
    if (components.length < 3 || components.slice(0, 3).some(number => !Number.isFinite(number))) {
        return null;
    }

    const [r, g, b] = components;
    if ([r, g, b].some(number => number < 0 || number > 255)) return null;
    return rgbToHex({ r, g, b });
}

function readIniValue(contents, requestedSection, requestedKey) {
    let section = '';
    for (const rawLine of String(contents).split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith(';')) continue;

        const sectionMatch = line.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
            section = sectionMatch[1].trim();
            continue;
        }

        if (section !== requestedSection) continue;
        const separator = line.indexOf('=');
        if (separator < 0) continue;

        const key = line.slice(0, separator).trim();
        if (key === requestedKey) return line.slice(separator + 1).trim();
    }
    return null;
}

function parseKdeGlobals(contents) {
    const explicitAccent = parseColorValue(readIniValue(contents, 'General', 'AccentColor'));
    if (explicitAccent) return explicitAccent;

    // Older schemes may expose their current highlight through Selection.
    return parseColorValue(readIniValue(contents, 'Colors:Selection', 'BackgroundNormal'));
}

function parsePortalAccent(output) {
    const value = String(output ?? '');
    // KDE returns the accent as a D-Bus (ddd) struct. Accept arrays as well for
    // compatible portal backends and test fixtures.
    const numericTuple = value.match(/[\[(]\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*,\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*,\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*[\])]/i);
    if (numericTuple) {
        const channels = numericTuple.slice(1, 4).map(Number);
        // The appearance portal specifies normalized sRGB components in [0, 1].
        if (channels.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 1)) return null;
        const normalized = channels.map(channel => Math.round(channel * 255));
        return rgbToHex({ r: normalized[0], g: normalized[1], b: normalized[2] });
    }

    // Some portal implementations may return a string variant instead of a numeric tuple.
    const hex = value.match(/#[0-9a-f]{6}\b/i);
    return hex ? hex[0].toUpperCase() : null;
}

function isKdeSession(environment = process.env) {
    const desktop = String(environment.XDG_CURRENT_DESKTOP ?? '');
    return /(^|[:;])KDE([:;]|$)/i.test(desktop)
        || String(environment.KDE_FULL_SESSION ?? '').toLowerCase() === 'true'
        || Boolean(environment.KDE_SESSION_VERSION);
}

function getKdeGlobalsPath(environment = process.env, homeDirectory = os.homedir()) {
    const configHome = environment.XDG_CONFIG_HOME && path.isAbsolute(environment.XDG_CONFIG_HOME)
        ? environment.XDG_CONFIG_HOME
        : path.join(homeDirectory, '.config');
    return path.join(configHome, CONFIG_FILE);
}

function readPortalAccent() {
    return new Promise(resolve => {
        execFile(
            'gdbus',
            [
                'call',
                '--session',
                '--dest', PORTAL_DESTINATION,
                '--object-path', PORTAL_OBJECT_PATH,
                '--method', `${PORTAL_INTERFACE}.Read`,
                'org.freedesktop.appearance',
                'accent-color',
            ],
            { encoding: 'utf8', timeout: 1500, maxBuffer: 16 * 1024 },
            (error, stdout) => resolve(error ? null : parsePortalAccent(stdout)),
        );
    });
}

function readConfigAccent() {
    const configPath = getKdeGlobalsPath();
    try {
        return parseKdeGlobals(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return null;
    }
}

async function readKdeAccentColor() {
    const portalAccent = await readPortalAccent();
    return portalAccent || readConfigAccent();
}

function watchKdeAccentColor(onChange) {
    let disposed = false;
    let directoryWatcher;
    let fallbackWatcher;
    let portalMonitor;
    let refreshTimer;
    let lastAccent = null;
    let pendingOutput = '';

    const refresh = async () => {
        if (disposed) return;
        const accent = await readKdeAccentColor();
        if (!disposed && accent && accent !== lastAccent) {
            lastAccent = accent;
            onChange(accent);
        }
    };

    const scheduleRefresh = () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refresh, 180);
    };

    const configPath = getKdeGlobalsPath();
    const configDirectory = path.dirname(configPath);

    // Watch the directory so atomic kdeglobals replacements are detected as well.
    try {
        directoryWatcher = fs.watch(configDirectory, { persistent: false }, (_event, filename) => {
            if (!filename || filename.toString() === CONFIG_FILE) scheduleRefresh();
        });
        directoryWatcher.on('error', () => {
            directoryWatcher?.close();
            directoryWatcher = null;
        });
    } catch {
        // Fall back to a low-frequency file watcher when directory watching is unavailable.
        try {
            fallbackWatcher = scheduleRefresh;
            fs.watchFile(configPath, { interval: 1500, persistent: false }, fallbackWatcher);
        } catch {
            fallbackWatcher = null;
        }
    }

    // Plasma's appearance portal emits this signal when the active palette changes.
    // The config-file watcher remains as a fallback for systems without gdbus/portal support.
    try {
        portalMonitor = spawn('gdbus', [
            'monitor',
            '--session',
            '--dest', PORTAL_DESTINATION,
            '--object-path', PORTAL_OBJECT_PATH,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });

        portalMonitor.stdout.on('data', chunk => {
            pendingOutput += chunk.toString();
            if (pendingOutput.includes('org.freedesktop.appearance') && pendingOutput.includes('accent-color')) {
                pendingOutput = '';
                scheduleRefresh();
            } else if (pendingOutput.length > 4096) {
                pendingOutput = pendingOutput.slice(-1024);
            }
        });
        portalMonitor.on('error', () => {
            portalMonitor = null;
        });
        portalMonitor.on('close', () => {
            portalMonitor = null;
        });
    } catch {
        portalMonitor = null;
    }

    return () => {
        disposed = true;
        clearTimeout(refreshTimer);
        directoryWatcher?.close();
        if (fallbackWatcher) fs.unwatchFile(configPath, fallbackWatcher);
        if (portalMonitor && !portalMonitor.killed) portalMonitor.kill();
    };
}

function mixColors(background, foreground, amount) {
    const base = hexToRgb(background);
    const tint = hexToRgb(foreground);
    if (!base || !tint) return background;
    const factor = clamp(amount, 0, 1);
    return rgbToHex({
        r: base.r + (tint.r - base.r) * factor,
        g: base.g + (tint.g - base.g) * factor,
        b: base.b + (tint.b - base.b) * factor,
    });
}

function relativeLuminance(color) {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;
    const linear = channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

function contrastRatio(first, second) {
    const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
    return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

function bestContrastForeground(background) {
    return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#151719')
        ? '#FFFFFF'
        : '#151719';
}

function rgbToHsl({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r: h = ((g - b) / delta) % 6; break;
            case g: h = (b - r) / delta + 2; break;
            default: h = (r - g) / delta + 4; break;
        }
        h /= 6;
        if (h < 0) h += 1;
    }
    return { h, s, l };
}

function hslToRgb({ h, s, l }) {
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const sector = h * 6;
    const second = chroma * (1 - Math.abs((sector % 2) - 1));
    let r = 0;
    let g = 0;
    let b = 0;

    if (sector < 1) [r, g] = [chroma, second];
    else if (sector < 2) [r, g] = [second, chroma];
    else if (sector < 3) [g, b] = [chroma, second];
    else if (sector < 4) [g, b] = [second, chroma];
    else if (sector < 5) [r, b] = [second, chroma];
    else [r, b] = [chroma, second];

    const match = l - chroma / 2;
    return {
        r: (r + match) * 255,
        g: (g + match) * 255,
        b: (b + match) * 255,
    };
}

function readableAccent(accent, surface = '#121212') {
    if (contrastRatio(accent, surface) >= 4.5) return accent;
    const original = rgbToHsl(hexToRgb(accent));
    for (let lightness = original.l; lightness <= 1; lightness += 0.005) {
        const candidate = rgbToHex(hslToRgb({ ...original, l: Math.min(lightness, 1) }));
        if (contrastRatio(candidate, surface) >= 4.5) return candidate;
    }
    return '#FFFFFF';
}

function buildNacreCustomizations(accentColor) {
    const accent = parseColorValue(accentColor);
    if (!accent) return {};

    const editor = '#121212';
    const surface = mixColors('#242527', accent, 0.055);
    const raisedSurface = mixColors('#2B2D31', accent, 0.085);
    const border = mixColors('#3A3D42', accent, 0.22);
    // Keep normal KDE accents exact; lift unusually dark accents for usable UI contrast.
    const uiAccent = readableAccent(accent, surface);
    const accentSurface = mixColors(surface, uiAccent, 0.27);
    const accentSelection = mixColors(editor, uiAccent, 0.36);
    const accentSoft = mixColors(editor, uiAccent, 0.20);
    const linkAccent = uiAccent;
    const hoverAccent = mixColors(uiAccent, bestContrastForeground(uiAccent), 0.12);
    const buttonForeground = bestContrastForeground(uiAccent);

    return {
        // Nacre keeps its near-black canvas; supporting graphite surfaces receive a restrained tint.
        'editor.background': editor,
        'sideBar.background': surface,
        'sideBarSectionHeader.background': surface,
        'panel.background': surface,
        'activityBar.background': surface,
        'activityBarTop.background': surface,
        'titleBar.activeBackground': surface,
        'titleBar.inactiveBackground': surface,
        'statusBar.background': surface,
        'statusBar.noFolderBackground': surface,
        'editorGroupHeader.tabsBackground': surface,
        'tab.inactiveBackground': surface,
        'menu.background': surface,
        'quickInput.background': surface,
        'editorWidget.background': surface,
        'editorHoverWidget.background': surface,
        'notifications.background': surface,
        'peekViewEditor.background': surface,
        'peekViewTitle.background': surface,
        'peekViewResult.background': surface,
        'peekViewEditorGutter.background': surface,
        'dropdown.background': surface,
        'settings.dropdownBackground': surface,
        'settings.numberInputBackground': editor,
        'settings.textInputBackground': editor,
        'breadcrumb.background': editor,
        'breadcrumbPicker.background': raisedSurface,
        'editorStickyScrollHover.background': surface,
        'debugToolBar.background': surface,

        // Separators and outlines follow the same hue without becoming high-saturation blocks.
        'contrastBorder': border,
        'widget.border': border,
        'sideBar.border': border,
        'sideBarSectionHeader.border': border,
        'sideBarStickyScroll.border': border,
        'sideBarActivityBarTop.border': border,
        'panel.border': border,
        'merge.border': border,
        'editorGroup.border': border,
        'activityBar.border': border,
        'tab.border': border,
        'titleBar.border': border,
        'statusBar.border': border,
        'editorWidget.border': border,
        'editorWidget.resizeBorder': border,
        'editorHoverWidget.border': border,
        'peekView.border': border,
        'input.border': border,
        'dropdown.border': border,
        'editorSuggestWidget.border': border,
        'notificationToast.border': border,
        'menu.separatorBackground': border,
        'menu.selectionBorder': mixColors(surface, accent, 0.55),
        'menubar.selectionBorder': mixColors(surface, accent, 0.55),
        'editorIndentGuide.background': `${border}88`,

        // Accent is reserved for focus, selection, active navigation and primary actions.
        'focusBorder': linkAccent,
        'contrastActiveBorder': linkAccent,
        'editorLink.activeForeground': linkAccent,
        'textLink.foreground': linkAccent,
        'textLink.activeForeground': linkAccent,
        'notificationLink.foreground': linkAccent,
        'progressBar.background': uiAccent,
        'sash.hoverBorder': uiAccent,
        'panelTitle.activeBorder': uiAccent,
        'activityBar.activeBorder': uiAccent,
        'activityBarTop.activeBorder': uiAccent,
        'tab.activeBorder': uiAccent,
        'tab.unfocusedActiveBorder': mixColors(surface, accent, 0.65),
        'inputOption.activeBorder': uiAccent,
        'listFilterWidget.outline': uiAccent,
        'commandCenter.activeBorder': uiAccent,
        'notebook.focusedCellBorder': uiAccent,
        'notebook.inactiveFocusedCellBorder': mixColors(surface, accent, 0.5),
        'editorBracketMatch.border': `${uiAccent}CC`,
        'editorBracketMatch.background': `${uiAccent}22`,
        'editor.selectionBackground': accentSelection,
        'editor.lineHighlightBackground': mixColors(editor, accent, 0.035),
        'editorLineNumber.activeForeground': linkAccent,
        'editorIndentGuide.activeBackground': mixColors(border, accent, 0.55),
        'editor.selectionHighlightBackground': `${uiAccent}38`,
        'editor.findRangeHighlightBackground': accentSoft,
        'selection.background': accentSelection,
        'panel.dropBackground': `${uiAccent}28`,
        'inputOption.activeBackground': accentSurface,
        'list.activeSelectionBackground': accentSurface,
        'list.focusBackground': accentSurface,
        'quickInputList.focusBackground': accentSurface,
        'menu.selectionBackground': accentSurface,
        'menubar.selectionBackground': accentSurface,
        'editorSuggestWidget.selectedBackground': accentSurface,
        'peekViewResult.selectionBackground': accentSurface,
        'list.inactiveSelectionBackground': mixColors(surface, accent, 0.17),
        'list.dropBackground': `${accent}30`,
        'list.dropBetweenBackground': `${accent}30`,
        'activityBarBadge.background': uiAccent,
        'activityBarBadge.foreground': buttonForeground,
        'badge.background': accentSurface,
        'badge.foreground': '#F4F6FB',
        'quickInputList.focusIconForeground': linkAccent,
        'list.highlightForeground': linkAccent,
        'editorSuggestWidget.highlightForeground': linkAccent,
        'settings.modifiedItemIndicator': uiAccent,
        'settings.checkboxBackground': uiAccent,
        'settings.checkboxForeground': buttonForeground,
        'chat.slashCommandForeground': linkAccent,
        'chat.slashCommandBackground': accentSurface,

        // Primary buttons use the KDE accent, contrast-adjusted only when it is unusually dark.
        'button.background': uiAccent,
        'button.foreground': buttonForeground,
        'button.hoverBackground': hoverAccent,
        'extensionButton.prominentBackground': uiAccent,
        'extensionButton.prominentForeground': buttonForeground,
        'extensionButton.prominentHoverBackground': hoverAccent,
        'statusBarItem.remoteHoverBackground': accentSurface,
        'statusBarItem.remoteHoverForeground': '#F4F6FB',
        'toolbar.hoverBackground': accentSurface,
        'toolbar.activeBackground': raisedSurface,
    };
}

module.exports = {
    buildNacreCustomizations,
    getKdeGlobalsPath,
    isKdeSession,
    parseColorValue,
    parseKdeGlobals,
    parsePortalAccent,
    readKdeAccentColor,
    watchKdeAccentColor,
};
