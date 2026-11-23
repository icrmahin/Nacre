'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

const PORTAL_DESTINATION = 'org.freedesktop.portal.Desktop';
const PORTAL_OBJECT_PATH = '/org/freedesktop/portal/desktop';
const PORTAL_INTERFACE = 'org.freedesktop.portal.Settings';
const CONFIG_FILE = 'kdeglobals';

const GNOME_ACCENTS = {
    blue: '#3584E4',
    teal: '#2190A4',
    green: '#3A944A',
    yellow: '#C88800',
    orange: '#ED5B00',
    red: '#E62D42',
    pink: '#D56199',
    purple: '#9141AC',
    slate: '#6F8396',
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function hexToRgb(value) {
    if (typeof value !== 'string') return null;
    const hex = value.trim().replace(/^#/, '');
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
    const normalized = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex;
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
    const components = trimmed.split(/[\s,;]+/).filter(Boolean).map(Number);
    if (components.length < 3 || components.slice(0, 3).some(number => !Number.isFinite(number))) return null;
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
        if (line.slice(0, separator).trim() === requestedKey) return line.slice(separator + 1).trim();
    }
    return null;
}

function parseKdeGlobals(contents) {
    const explicitAccent = parseColorValue(readIniValue(contents, 'General', 'AccentColor'));
    if (explicitAccent) return explicitAccent;
    return parseColorValue(readIniValue(contents, 'Colors:Selection', 'BackgroundNormal'));
}

function parsePortalAccent(output) {
    const value = String(output ?? '');
    const numericTuple = value.match(/[\[(]\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*,\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*,\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*[\])]/i);
    if (numericTuple) {
        const channels = numericTuple.slice(1, 4).map(Number);
        if (channels.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 1)) return null;
        return rgbToHex({
            r: channels[0] * 255,
            g: channels[1] * 255,
            b: channels[2] * 255,
        });
    }
    const hex = value.match(/#[0-9a-f]{6}\b/i);
    return hex ? hex[0].toUpperCase() : null;
}

function parseGnomeAccent(output) {
    const value = String(output ?? '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    return GNOME_ACCENTS[value] || parseColorValue(value);
}

function isKdeSession(environment = process.env) {
    const desktop = String(environment.XDG_CURRENT_DESKTOP ?? '');
    return /(^|[:;])KDE([:;]|$)/i.test(desktop)
        || String(environment.KDE_FULL_SESSION ?? '').toLowerCase() === 'true'
        || Boolean(environment.KDE_SESSION_VERSION);
}

function isGnomeSession(environment = process.env) {
    const desktop = String(environment.XDG_CURRENT_DESKTOP ?? '');
    return /(^|[:;])GNOME([:;]|$)/i.test(desktop)
        || String(environment.GDMSESSION ?? '').toLowerCase().includes('gnome');
}

function getKdeGlobalsPath(environment = process.env, homeDirectory = os.homedir()) {
    const configHome = environment.XDG_CONFIG_HOME && path.isAbsolute(environment.XDG_CONFIG_HOME)
        ? environment.XDG_CONFIG_HOME
        : path.join(homeDirectory, '.config');
    return path.join(configHome, CONFIG_FILE);
}

function execText(command, args, timeout = 1500) {
    return new Promise(resolve => {
        execFile(command, args, { encoding: 'utf8', timeout, maxBuffer: 16 * 1024 }, (error, stdout) => {
            resolve(error ? null : String(stdout ?? '').trim());
        });
    });
}

async function readPortalAccent() {
    const output = await execText('gdbus', [
        'call', '--session',
        '--dest', PORTAL_DESTINATION,
        '--object-path', PORTAL_OBJECT_PATH,
        '--method', `${PORTAL_INTERFACE}.Read`,
        'org.freedesktop.appearance',
        'accent-color',
    ]);
    return output ? parsePortalAccent(output) : null;
}

function readKdeConfigAccent() {
    try {
        return parseKdeGlobals(fs.readFileSync(getKdeGlobalsPath(), 'utf8'));
    } catch {
        return null;
    }
}

async function readGnomeAccent() {
    const output = await execText('gsettings', ['get', 'org.gnome.desktop.interface', 'accent-color']);
    return output ? parseGnomeAccent(output) : null;
}

async function readSystemAccentColor(environment = process.env) {
    if (process.platform !== 'linux') return null;
    const portalAccent = await readPortalAccent();
    if (portalAccent) return portalAccent;
    if (isKdeSession(environment)) return readKdeConfigAccent();
    if (isGnomeSession(environment)) return readGnomeAccent();
    return null;
}

function watchSystemAccentColor(onChange, environment = process.env) {
    let disposed = false;
    let directoryWatcher;
    let fallbackWatcher;
    let portalMonitor;
    let gsettingsMonitor;
    let refreshTimer;
    let lastAccent = null;
    let pendingPortalOutput = '';

    const refresh = async () => {
        if (disposed) return;
        const accent = await readSystemAccentColor(environment);
        if (!disposed && accent && accent !== lastAccent) {
            lastAccent = accent;
            onChange(accent);
        }
    };
    const scheduleRefresh = () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refresh, 180);
    };

    if (isKdeSession(environment)) {
        const configPath = getKdeGlobalsPath(environment);
        const configDirectory = path.dirname(configPath);
        try {
            directoryWatcher = fs.watch(configDirectory, { persistent: false }, (_event, filename) => {
                if (!filename || filename.toString() === CONFIG_FILE) scheduleRefresh();
            });
            directoryWatcher.on('error', () => {
                directoryWatcher?.close();
                directoryWatcher = null;
            });
        } catch {
            try {
                fallbackWatcher = scheduleRefresh;
                fs.watchFile(configPath, { interval: 1500, persistent: false }, fallbackWatcher);
            } catch {
                fallbackWatcher = null;
            }
        }
    }

    // The portal is the common source for GNOME and KDE when the backend exposes an accent.
    try {
        portalMonitor = spawn('gdbus', [
            'monitor', '--session',
            '--dest', PORTAL_DESTINATION,
            '--object-path', PORTAL_OBJECT_PATH,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
        portalMonitor.stdout.on('data', chunk => {
            pendingPortalOutput += chunk.toString();
            if (pendingPortalOutput.includes('org.freedesktop.appearance')
                && pendingPortalOutput.includes('accent-color')) {
                pendingPortalOutput = '';
                scheduleRefresh();
            } else if (pendingPortalOutput.length > 4096) {
                pendingPortalOutput = pendingPortalOutput.slice(-1024);
            }
        });
        portalMonitor.on('error', () => { portalMonitor = null; });
        portalMonitor.on('close', () => { portalMonitor = null; });
    } catch {
        portalMonitor = null;
    }

    // GNOME 47+ exposes the selected accent through GSettings. Monitor it as a fallback
    // for portal backends that do not forward the accent-color setting.
    if (isGnomeSession(environment)) {
        try {
            gsettingsMonitor = spawn('gsettings', [
                'monitor', 'org.gnome.desktop.interface', 'accent-color',
            ], { stdio: ['ignore', 'pipe', 'ignore'] });
            gsettingsMonitor.stdout.on('data', scheduleRefresh);
            gsettingsMonitor.on('error', () => { gsettingsMonitor = null; });
            gsettingsMonitor.on('close', () => { gsettingsMonitor = null; });
        } catch {
            gsettingsMonitor = null;
        }
    }

    return () => {
        disposed = true;
        clearTimeout(refreshTimer);
        directoryWatcher?.close();
        if (fallbackWatcher) fs.unwatchFile(getKdeGlobalsPath(environment), fallbackWatcher);
        for (const child of [portalMonitor, gsettingsMonitor]) {
            if (child && !child.killed) child.kill();
        }
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
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0; let s = 0;
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
    let r = 0; let g = 0; let b = 0;
    if (sector < 1) [r, g] = [chroma, second];
    else if (sector < 2) [r, g] = [second, chroma];
    else if (sector < 3) [g, b] = [chroma, second];
    else if (sector < 4) [g, b] = [second, chroma];
    else if (sector < 5) [r, b] = [second, chroma];
    else [r, b] = [chroma, second];
    const match = l - chroma / 2;
    return { r: (r + match) * 255, g: (g + match) * 255, b: (b + match) * 255 };
}

function hasAccessibleForeground(background) {
    return Math.max(
        contrastRatio(background, '#FFFFFF'),
        contrastRatio(background, '#151719'),
    ) >= 4.5;
}

function readableAccent(accent, surface = '#101113') {
    const isReadable = color =>
        contrastRatio(color, surface) >= 4.5 && hasAccessibleForeground(color);

    if (isReadable(accent)) return accent;

    const original = rgbToHsl(hexToRgb(accent));
    for (let lightness = original.l; lightness <= 1; lightness += 0.005) {
        const candidate = rgbToHex(hslToRgb({ ...original, l: Math.min(lightness, 1) }));
        if (isReadable(candidate)) return candidate;
    }
    return '#FFFFFF';
}

function buildNacreCustomizations(accentColor) {
    const accent = parseColorValue(accentColor);
    if (!accent) return {};

    const editor = '#0B0C0E';
    const surface = mixColors('#111214', accent, 0.035);
    const raisedSurface = mixColors('#17191C', accent, 0.05);
    const border = mixColors('#25282D', accent, 0.12);
    const uiAccent = readableAccent(accent, surface);
    const accentSurface = mixColors(surface, uiAccent, 0.20);
    const accentSelection = mixColors(editor, uiAccent, 0.28);
    const accentSoft = mixColors(editor, uiAccent, 0.16);
    const buttonForeground = bestContrastForeground(uiAccent);

    return {
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
        'menu.background': raisedSurface,
        'quickInput.background': raisedSurface,
        'editorWidget.background': raisedSurface,
        'editorHoverWidget.background': raisedSurface,
        'notifications.background': raisedSurface,
        'peekViewEditor.background': surface,
        'peekViewTitle.background': surface,
        'peekViewResult.background': surface,
        'peekViewEditorGutter.background': surface,
        'dropdown.background': raisedSurface,
        'settings.dropdownBackground': raisedSurface,
        'settings.numberInputBackground': editor,
        'settings.textInputBackground': editor,
        'breadcrumb.background': editor,
        'breadcrumbPicker.background': raisedSurface,
        'editorStickyScrollHover.background': surface,
        'debugToolBar.background': raisedSurface,
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
        'menu.selectionBorder': mixColors(surface, accent, 0.40),
        'menubar.selectionBorder': mixColors(surface, accent, 0.40),
        'editorIndentGuide.background': `${border}88`,
        'focusBorder': uiAccent,
        'contrastActiveBorder': uiAccent,
        'editorLink.activeForeground': uiAccent,
        'textLink.foreground': uiAccent,
        'textLink.activeForeground': uiAccent,
        'notificationLink.foreground': uiAccent,
        'progressBar.background': uiAccent,
        'sash.hoverBorder': uiAccent,
        'panelTitle.activeBorder': uiAccent,
        'activityBar.activeBorder': uiAccent,
        'activityBarTop.activeBorder': uiAccent,
        'tab.activeBorder': uiAccent,
        'tab.unfocusedActiveBorder': mixColors(surface, accent, 0.48),
        'inputOption.activeBorder': uiAccent,
        'listFilterWidget.outline': uiAccent,
        'commandCenter.activeBorder': uiAccent,
        'notebook.focusedCellBorder': uiAccent,
        'notebook.inactiveFocusedCellBorder': mixColors(surface, accent, 0.34),
        'editorBracketMatch.border': `${uiAccent}CC`,
        'editorBracketMatch.background': `${uiAccent}1C`,
        'editor.selectionBackground': accentSelection,
        'editor.lineHighlightBackground': mixColors(editor, accent, 0.025),
        'editorLineNumber.activeForeground': uiAccent,
        'editorIndentGuide.activeBackground': mixColors(border, accent, 0.36),
        'editor.selectionHighlightBackground': `${uiAccent}30`,
        'editor.findRangeHighlightBackground': accentSoft,
        'selection.background': accentSelection,
        'panel.dropBackground': `${uiAccent}22`,
        'inputOption.activeBackground': accentSurface,
        'list.activeSelectionBackground': accentSurface,
        'list.focusBackground': accentSurface,
        'quickInputList.focusBackground': accentSurface,
        'menu.selectionBackground': accentSurface,
        'menubar.selectionBackground': accentSurface,
        'editorSuggestWidget.selectedBackground': accentSurface,
        'peekViewResult.selectionBackground': accentSurface,
        'list.inactiveSelectionBackground': mixColors(surface, accent, 0.11),
        'list.dropBackground': `${accent}25`,
        'list.dropBetweenBackground': `${accent}25`,
        'activityBarBadge.background': uiAccent,
        'activityBarBadge.foreground': buttonForeground,
        'badge.background': accentSurface,
        'badge.foreground': '#F4F6FB',
        'quickInputList.focusIconForeground': uiAccent,
        'list.highlightForeground': uiAccent,
        'editorSuggestWidget.highlightForeground': uiAccent,
        'settings.modifiedItemIndicator': uiAccent,
        'settings.checkboxBackground': uiAccent,
        'settings.checkboxForeground': buttonForeground,
        'chat.slashCommandForeground': uiAccent,
        'chat.slashCommandBackground': accentSurface,
        'button.background': uiAccent,
        'button.foreground': buttonForeground,
        'button.hoverBackground': mixColors(uiAccent, buttonForeground, 0.12),
        'extensionButton.prominentBackground': uiAccent,
        'extensionButton.prominentForeground': buttonForeground,
        'extensionButton.prominentHoverBackground': mixColors(uiAccent, buttonForeground, 0.12),
        'statusBarItem.remoteHoverBackground': accentSurface,
        'statusBarItem.remoteHoverForeground': '#F4F6FB',
        'toolbar.hoverBackground': accentSurface,
        'toolbar.activeBackground': raisedSurface,
    };
}

module.exports = {
    buildNacreCustomizations,
    getKdeGlobalsPath,
    isGnomeSession,
    isKdeSession,
    parseColorValue,
    parseGnomeAccent,
    parseKdeGlobals,
    parsePortalAccent,
    readSystemAccentColor,
    watchSystemAccentColor,
};
