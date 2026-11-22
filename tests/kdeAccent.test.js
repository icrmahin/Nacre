'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildNacreCustomizations,
    getKdeGlobalsPath,
    isKdeSession,
    parseColorValue,
    parseKdeGlobals,
    parsePortalAccent,
} = require('../kdeAccent');

function relativeLuminance(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first, second) {
    const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

test('parses KDE decimal RGB accent values', () => {
    assert.equal(parseColorValue('61, 174, 233'), '#3DAEE9');
});

test('parses KDE hex accent values', () => {
    assert.equal(parseColorValue('#3daee9'), '#3DAEE9');
});

test('uses the explicit General AccentColor before the selection fallback', () => {
    const config = [
        '[General]',
        'AccentColor=61,174,233',
        '',
        '[Colors:Selection]',
        'BackgroundNormal=255,0,0',
    ].join('\n');
    assert.equal(parseKdeGlobals(config), '#3DAEE9');
});

test('falls back to the active selection color when AccentColor is absent', () => {
    const config = [
        '[General]',
        'ColorScheme=BreezeDark',
        '',
        '[Colors:Selection]',
        'BackgroundNormal=255, 0, 0',
    ].join('\n');
    assert.equal(parseKdeGlobals(config), '#FF0000');
});

test('parses the KDE appearance portal D-Bus RGB tuple', () => {
    assert.equal(parsePortalAccent('(<(0.2392157, 0.6823529, 0.9137255)>,)'), '#3DAEE9');
});

test('also accepts array-shaped portal backends and hex string variants', () => {
    assert.equal(parsePortalAccent('(<[0.2392157, 0.6823529, 0.9137255]>,)'), '#3DAEE9');
    assert.equal(parsePortalAccent('(<"#3DAEE9">,)'), '#3DAEE9');
});

test('rejects malformed portal and config colors', () => {
    assert.equal(parsePortalAccent('()'), null);
    assert.equal(parsePortalAccent('(<(-0.1, 0.2, 0.3)>,)'), null);
    assert.equal(parsePortalAccent('(<(0.2, 0.3, 1.1)>,)'), null);
    assert.equal(parseKdeGlobals('[General]\nAccentColor=not-a-color'), null);
    assert.equal(parseColorValue('999, 20, 30'), null);
});

test('detects a KDE session without matching unrelated desktop names', () => {
    assert.equal(isKdeSession({ XDG_CURRENT_DESKTOP: 'KDE' }), true);
    assert.equal(isKdeSession({ XDG_CURRENT_DESKTOP: 'GNOME' }), false);
    assert.equal(isKdeSession({ KDE_SESSION_VERSION: '6' }), true);
});

test('resolves kdeglobals below XDG_CONFIG_HOME', () => {
    assert.equal(
        getKdeGlobalsPath({ XDG_CONFIG_HOME: '/tmp/test-config' }, '/home/test'),
        '/tmp/test-config/kdeglobals',
    );
});

test('generates adaptive UI colors without changing Nacre syntax roles or editor canvas', () => {
    const colors = buildNacreCustomizations('#3DAEE9');
    assert.equal(colors['editor.background'], '#121212');
    assert.notEqual(colors['sideBar.background'], '#242527');
    assert.equal(colors['activityBar.activeBorder'], '#3DAEE9');
    assert.equal(colors['tab.activeBorder'], '#3DAEE9');
    assert.equal(colors['button.background'], '#3DAEE9');
    assert.equal(colors['sideBarSectionHeader.background'], colors['sideBar.background']);
    assert.equal(colors['sideBarStickyScroll.border'], colors['sideBar.border']);
    assert.equal(Object.hasOwn(colors, 'editor.foreground'), false);
    assert.equal(Object.hasOwn(colors, 'terminal.ansiBlue'), false);
    assert.equal(Object.hasOwn(colors, 'editor.tokenColorCustomizations'), false);
    assert.deepEqual(buildNacreCustomizations('invalid'), {});
});


test('keeps unusually dark wallpaper accents visible and maintains text contrast', () => {
    const colors = buildNacreCustomizations('#000000');
    assert.notEqual(colors['button.background'], '#000000');
    assert.ok(contrastRatio(colors['textLink.foreground'], colors['sideBar.background']) >= 4.5);
    assert.ok(contrastRatio(colors['button.foreground'], colors['button.background']) >= 4.5);
});
