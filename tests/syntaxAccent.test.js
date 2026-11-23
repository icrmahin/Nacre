'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const theme = require('../themes/nacre-color-theme.json');
const {
    TINT_RATIO,
    TEXT_MATE_RULE_MARKER,
    buildNacreSyntaxCustomizations,
    mergeSemanticRules,
    mergeTextMateRules,
    restoreSemanticRules,
    restoreTextMateRules,
    tintHexColor,
} = require('../syntaxAccent');

function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(value => value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
    const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

test('tints a syntax color by exactly 2.5% toward the desktop accent', () => {
    assert.equal(TINT_RATIO, 0.10);
    assert.equal(tintHexColor('#E6EDF3', '#F16B52'), '#E7E0E3');
    assert.equal(tintHexColor('#A5D6FF', '#3584E4'), '#9BCCFC');
    assert.equal(tintHexColor('#fff', '#000'), '#E6E6E6');
});

test('rejects invalid colors and invalid blend ratios', () => {
    assert.equal(tintHexColor('#GGGGGG', '#F16B52'), null);
    assert.equal(tintHexColor('#FFFFFF', 'invalid'), null);
    assert.equal(tintHexColor('#FFFFFF', '#000000', -0.1), null);
    assert.equal(tintHexColor('#FFFFFF', '#000000', 1.1), null);
});

test('builds theme-scoped TextMate overrides for every colored syntax scope', () => {
    const generated = buildNacreSyntaxCustomizations(theme, '#F16B52');
    const expectedCount = theme.tokenColors.filter(rule => rule?.scope && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(rule?.settings?.foreground ?? '')).length;

    assert.equal(generated.textMateRules.length, expectedCount);
    assert.ok(generated.textMateRules.length > 150);
    assert.ok(generated.textMateRules.every(rule => rule.name.startsWith(TEXT_MATE_RULE_MARKER)));
    assert.ok(generated.textMateRules.every(rule => rule.scope && /^#[\da-f]{6}$/i.test(rule.settings.foreground)));
    assert.equal(generated.textMateRules.some(rule => rule.scope === undefined), false);
});

test('adapts semantic tokens using the same blend while preserving role differences', () => {
    const generated = buildNacreSyntaxCustomizations(theme, '#F16B52');
    assert.ok(Object.keys(generated.semanticRules).length >= 20);
    assert.equal(
        generated.semanticRules.keyword.foreground,
        tintHexColor(theme.semanticTokenColors.keyword, '#F16B52'),
    );
    assert.notEqual(
        generated.semanticRules.keyword.foreground,
        generated.semanticRules.function.foreground,
    );
    assert.notEqual(
        generated.semanticRules.type.foreground,
        generated.semanticRules.string.foreground,
    );
});

test('keeps tinted syntax colors comfortably readable on Nacre near-black', () => {
    for (const accent of ['#000000', '#3584E4', '#F16B52', '#FFFF00', '#FFFFFF']) {
        const generated = buildNacreSyntaxCustomizations(theme, accent);
        const colors = [
            ...generated.textMateRules.map(rule => rule.settings.foreground),
            ...Object.values(generated.semanticRules).map(rule => rule.foreground),
        ];
        assert.ok(colors.length > 150);
        for (const color of new Set(colors)) {
            assert.ok(
                contrast(color, '#0B0C0E') >= 4.5,
                `${color} fell below 4.5:1 contrast for accent ${accent}`,
            );
        }
    }
});

test('does not mutate the source theme and safely handles invalid input', () => {
    const before = JSON.stringify(theme);
    assert.deepEqual(
        buildNacreSyntaxCustomizations(theme, 'not-a-color'),
        { textMateRules: [], semanticRules: {} },
    );
    assert.equal(JSON.stringify(theme), before);
});

test('replaces only its own TextMate rules and preserves user customizations', () => {
    const originalUserRule = { scope: 'comment', settings: { foreground: '#00FF00' } };
    const firstGenerated = { name: TEXT_MATE_RULE_MARKER + '1', scope: 'keyword', settings: { foreground: '#FF0000' } };
    const changedGenerated = { ...firstGenerated, settings: { foreground: '#EE0000' } };
    const first = mergeTextMateRules([originalUserRule], [firstGenerated]);
    assert.deepEqual(first.rules, [firstGenerated, originalUserRule]);

    const updated = mergeTextMateRules(first.rules, [changedGenerated], first.applied);
    assert.deepEqual(updated.rules, [changedGenerated, originalUserRule]);
    assert.deepEqual(restoreTextMateRules(updated.rules, updated.applied), [originalUserRule]);

    const userEditedTint = { ...changedGenerated, settings: { foreground: '#00FFFF' } };
    assert.deepEqual(
        restoreTextMateRules([userEditedTint, originalUserRule], [changedGenerated]),
        [userEditedTint, originalUserRule],
    );
});

test('adds semantic tint rules without replacing user rules and restores only unchanged generated rules', () => {
    const userRule = { foreground: '#00FF00' };
    const generated = {
        keyword: { foreground: '#FF0000' },
        function: { foreground: '#0000FF' },
    };
    const first = mergeSemanticRules({ keyword: userRule }, generated);
    assert.deepEqual(first.rules, { function: generated.function, keyword: userRule });
    assert.deepEqual(first.applied, { function: generated.function });

    const changed = { function: { foreground: '#0000EE' } };
    const updated = mergeSemanticRules(first.rules, changed, first.applied);
    assert.deepEqual(updated.rules, { function: changed.function, keyword: userRule });
    assert.deepEqual(restoreSemanticRules(updated.rules, updated.applied), { keyword: userRule });

    const userEditedRule = { function: { foreground: '#00FFFF' } };
    assert.deepEqual(
        restoreSemanticRules(userEditedRule, { function: generated.function }),
        userEditedRule,
    );
});
