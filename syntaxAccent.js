'use strict';


// 2.5% was effectively invisible on most Nacre token colors. 10% keeps their identity while making the shift perceptible.
const TINT_RATIO = 0.10;

// A 20% blend gives distinct wallpaper accents a visible syntax effect while retaining each token's original role.
const TINT_RATIO = 0.20;

const TEXT_MATE_RULE_MARKER = '__nacreSystemAccentTint__:';
const MIN_EDITOR_CONTRAST = 4.5;
const EDITOR_BACKGROUND = '#0B0C0E';

function normalizeHex(value) {
    if (typeof value !== 'string') return null;
    const hex = value.trim().replace(/^#/, '');
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
    const normalized = hex.length === 3
        ? hex.split('').map(channel => channel + channel).join('')
        : hex;
    return `#${normalized.toUpperCase()}`;
}

function rgbChannels(hex) {
    return hex.slice(1).match(/../g).map(value => parseInt(value, 16));
}

function rgbToHex(channels) {
    return `#${channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function rgbToHsl([red, green, blue]) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    let saturation = 0;
    const lightness = (max + min) / 2;

    if (delta !== 0) {
        saturation = delta / (1 - Math.abs(2 * lightness - 1));
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue /= 6;
        if (hue < 0) hue += 1;
    }

    return { h: hue, s: saturation, l: lightness };
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
    return [
        (r + match) * 255,
        (g + match) * 255,
        (b + match) * 255,
    ];
}

function relativeLuminance(hex) {
    const channels = rgbChannels(hex).map(value => value / 255);
    const linear = channels.map(value => value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first, second) {
    const [lighter, darker] = [
        relativeLuminance(first),
        relativeLuminance(second),
    ].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

function ensureEditorContrast(color) {
    if (contrastRatio(color, EDITOR_BACKGROUND) >= MIN_EDITOR_CONTRAST) return color;

    const hsl = rgbToHsl(rgbChannels(color));
    for (let lightness = hsl.l; lightness <= 1; lightness += 0.005) {
        const candidate = rgbToHex(hslToRgb({ ...hsl, l: Math.min(lightness, 1) }));
        if (contrastRatio(candidate, EDITOR_BACKGROUND) >= MIN_EDITOR_CONTRAST) {
            return candidate;
        }
    }
    return '#FFFFFF';
}

function tintHexColor(baseColor, accentColor, ratio = TINT_RATIO) {
    const base = normalizeHex(baseColor);
    const accent = normalizeHex(accentColor);
    if (!base || !accent || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) return null;

    const baseChannels = rgbChannels(base);
    const accentChannels = rgbChannels(accent);
    const mixed = baseChannels.map((channel, index) => {
        const next = channel + (accentChannels[index] - channel) * ratio;
        return next;
    });
    return ensureEditorContrast(rgbToHex(mixed));
}

function buildNacreSyntaxCustomizations(theme, accentColor) {
    const accent = normalizeHex(accentColor);
    if (!accent || !theme || typeof theme !== 'object') {
        return { textMateRules: [], semanticRules: {} };
    }

    const textMateRules = [];
    for (const [index, rule] of (theme.tokenColors ?? []).entries()) {
        const scope = rule?.scope;
        const foreground = normalizeHex(rule?.settings?.foreground);
        if (!scope || !foreground) continue;

        textMateRules.push({
            name: `${TEXT_MATE_RULE_MARKER}${index}`,
            scope: Array.isArray(scope) ? [...scope] : scope,
            settings: {
                foreground: tintHexColor(foreground, accent),
            },
        });
    }

    const semanticRules = {};
    for (const [selector, definition] of Object.entries(theme.semanticTokenColors ?? {})) {
        const foreground = normalizeHex(
            typeof definition === 'string' ? definition : definition?.foreground,
        );
        if (!foreground) continue;
        semanticRules[selector] = {
            foreground: tintHexColor(foreground, accent),
        };
    }

    return { textMateRules, semanticRules };
}

function sameValue(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
}

function restoreTextMateRules(currentRules, previouslyApplied = []) {
    const appliedByName = new Map(
        previouslyApplied
            .filter(rule => rule && typeof rule.name === 'string')
            .map(rule => [rule.name, rule]),
    );

    return (Array.isArray(currentRules) ? currentRules : []).filter(rule => {
        const expected = appliedByName.get(rule?.name);
        return !expected || !sameValue(rule, expected);
    });
}

function mergeTextMateRules(currentRules, generatedRules, previouslyApplied = []) {
    const retained = restoreTextMateRules(currentRules, previouslyApplied);
    const existingNames = new Set(retained.map(rule => rule?.name).filter(Boolean));
    const applied = generatedRules.filter(rule => !existingNames.has(rule.name));

    return {
        rules: [...applied, ...retained],
        applied,
    };
}

function restoreSemanticRules(currentRules, previouslyApplied = {}) {
    const restored = { ...(currentRules && typeof currentRules === 'object' ? currentRules : {}) };
    for (const [selector, expected] of Object.entries(previouslyApplied)) {
        if (Object.prototype.hasOwnProperty.call(restored, selector) && sameValue(restored[selector], expected)) {
            delete restored[selector];
        }
    }
    return restored;
}

function mergeSemanticRules(currentRules, generatedRules, previouslyApplied = {}) {
    const retained = restoreSemanticRules(currentRules, previouslyApplied);
    const applied = {};

    for (const [selector, rule] of Object.entries(generatedRules)) {
        if (!Object.prototype.hasOwnProperty.call(retained, selector)) {
            applied[selector] = rule;
        }
    }

    return {
        rules: { ...applied, ...retained },
        applied,
    };
}

module.exports = {
    TINT_RATIO,
    TEXT_MATE_RULE_MARKER,
    buildNacreSyntaxCustomizations,
    contrastRatio,
    mergeSemanticRules,
    mergeTextMateRules,
    normalizeHex,
    restoreSemanticRules,
    restoreTextMateRules,
    tintHexColor,
};
