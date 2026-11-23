'use strict';

// A 20% blend gives distinct wallpaper accents a visible syntax effect while retaining each token's original role.
const TINT_RATIO = 0.20;
const TEXT_MATE_RULE_MARKER = '__nacreSystemAccentTint__:';

function normalizeHex(value) {
    if (typeof value !== 'string') return null;
    const hex = value.trim().replace(/^#/, '');
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
    const normalized = hex.length === 3
        ? hex.split('').map(channel => channel + channel).join('')
        : hex;
    return `#${normalized.toUpperCase()}`;
}

function tintHexColor(baseColor, accentColor, ratio = TINT_RATIO) {
    const base = normalizeHex(baseColor);
    const accent = normalizeHex(accentColor);
    if (!base || !accent || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) return null;

    const baseChannels = base.slice(1).match(/../g).map(value => parseInt(value, 16));
    const accentChannels = accent.slice(1).match(/../g).map(value => parseInt(value, 16));
    const mixed = baseChannels.map((channel, index) => {
        const next = channel + (accentChannels[index] - channel) * ratio;
        return Math.round(next).toString(16).padStart(2, '0');
    });

    return `#${mixed.join('').toUpperCase()}`;
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
    mergeSemanticRules,
    mergeTextMateRules,
    normalizeHex,
    restoreSemanticRules,
    restoreTextMateRules,
    tintHexColor,
};
