'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildNacreCustomizations,
    isGnomeSession,
    isKdeSession,
    getKdeGlobalsPath,
    parseColorValue,
    parseGnomeAccent,
    parseKdeGlobals,
    parsePortalAccent,
} = require('../systemAccent');

function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(first, second) {
    const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

test('detects GNOME and KDE sessions without cross-matching', () => {
    assert.equal(isGnomeSession({ XDG_CURRENT_DESKTOP: 'GNOME' }), true);
    assert.equal(isGnomeSession({ XDG_CURRENT_DESKTOP: 'ubuntu:GNOME' }), true);
    assert.equal(isGnomeSession({ XDG_CURRENT_DESKTOP: 'KDE' }), false);
    assert.equal(isKdeSession({ XDG_CURRENT_DESKTOP: 'KDE' }), true);
    assert.equal(isKdeSession({ XDG_CURRENT_DESKTOP: 'GNOME' }), false);
});

test('maps GNOME named accent preferences to their system colors', () => {
    assert.equal(parseGnomeAccent("'blue'"), '#3584E4');
    assert.equal(parseGnomeAccent("'purple'"), '#9141AC');
    assert.equal(parseGnomeAccent("'green'"), '#3A944A');
    assert.equal(parseGnomeAccent("'default'"), null);
});

test('parses KDE RGB and hex color values', () => {
    assert.equal(parseColorValue('61, 174, 233'), '#3DAEE9');
    assert.equal(parseColorValue('#3daee9'), '#3DAEE9');
    assert.equal(parseColorValue('999, 20, 30'), null);
});

test('prefers KDE AccentColor and falls back to the selection color', () => {
    const explicit = [
        '[General]',
        'AccentColor=61,174,233',
        '',
        '[Colors:Selection]',
        'BackgroundNormal=255,0,0',
    ].join('\n');
    const fallback = [
        '[General]',
        'ColorScheme=BreezeDark',
        '',
        '[Colors:Selection]',
        'BackgroundNormal=255, 0, 0',
    ].join('\n');
    assert.equal(parseKdeGlobals(explicit), '#3DAEE9');
    assert.equal(parseKdeGlobals(fallback), '#FF0000');
});

test('resolves kdeglobals below XDG_CONFIG_HOME', () => {
    assert.equal(
        getKdeGlobalsPath({ XDG_CONFIG_HOME: '/tmp/test-config' }, '/home/test'),
        '/tmp/test-config/kdeglobals',
    );
});

test('accepts portal normalized RGB tuples and rejects invalid components', () => {
    assert.equal(parsePortalAccent('(<(0.2392157, 0.6823529, 0.9137255)>,)'), '#3DAEE9');
    assert.equal(parsePortalAccent('(<[0.2392157, 0.6823529, 0.9137255]>,)'), '#3DAEE9');
    assert.equal(parsePortalAccent('(<(0.2, 0.3, 1.1)>,)'), null);
    assert.equal(parsePortalAccent('()'), null);
});

test('derives a deep neutral editor with restrained accent-tinted chrome', () => {
    const colors = buildNacreCustomizations('#3584E4');
    assert.equal(colors['editor.background'], '#0B0C0E');
    assert.notEqual(colors['sideBar.background'], '#111214');
    assert.equal(colors['button.background'], '#3584E4');
    assert.equal(colors['activityBar.activeBorder'], '#3584E4');
    assert.equal(Object.hasOwn(colors, 'editor.foreground'), false);
    assert.equal(Object.hasOwn(colors, 'terminal.ansiBlue'), false);
});

test('preserves readable text and button contrast for dark desktop accents', () => {
    for (const accent of ['#000000', '#121212', '#252525', '#343434']) {
        const colors = buildNacreCustomizations(accent);
        assert.ok(
            contrast(colors['textLink.foreground'], colors['sideBar.background']) >= 4.5,
            `link contrast failed for ${accent}`,
        );
        assert.ok(
            contrast(colors['button.foreground'], colors['button.background']) >= 4.5,
            `button contrast failed for ${accent}`,
        );
    }
});

test('rejects malformed desktop colors', () => {
    assert.deepEqual(buildNacreCustomizations('not-a-color'), {});
});
