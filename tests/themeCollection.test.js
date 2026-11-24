'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const expectedLabels = [
    'Nacre',
    'Nacre / Catppuccin Mocha',
    'Nacre / Everforest Dark',
    'Nacre / Gruvbox Dark Medium',
    'Nacre / Kanagawa Wave',
    'Nacre / Material Ocean',
    'Nacre / Nightfox',
    'Nacre / Osaka Jade',
];

test('registers the original Nacre theme first, followed by seven standalone palettes', () => {
    const themes = pkg.contributes.themes;
    assert.deepEqual(themes.map(theme => theme.label), expectedLabels);
    assert.equal(new Set(themes.map(theme => theme.label)).size, 8);
});

test('each registered theme has its own valid color-theme file', () => {
    for (const contribution of pkg.contributes.themes) {
        const relative = contribution.path.replace(/^\.\//, '');
        const themePath = path.join(root, relative);
        assert.ok(fs.existsSync(themePath), `missing ${relative}`);

        const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
        assert.equal(theme.name, contribution.label);
        assert.equal(theme.type, 'dark');
        assert.match(theme.colors['editor.background'], /^#[\da-f]{6}$/i);
        assert.ok(theme.tokenColors.length >= 100);
        assert.ok(Object.keys(theme.semanticTokenColors).length >= 20);
    }
});

test('all seven alternative themes use distinct editor backgrounds', () => {
    const backgrounds = pkg.contributes.themes.map(contribution => {
        const theme = JSON.parse(
            fs.readFileSync(path.join(root, contribution.path.replace(/^\.\//, '')), 'utf8'),
        );
        return theme.colors['editor.background'].toLowerCase();
    });
    assert.equal(new Set(backgrounds).size, 8);
});

test('the original Nacre editor and sidebar colors remain unchanged', () => {
    const mainTheme = JSON.parse(
        fs.readFileSync(path.join(root, 'themes/nacre-color-theme.json'), 'utf8'),
    );
    assert.equal(mainTheme.name, 'Nacre');
    assert.equal(mainTheme.colors['editor.background'], '#0B0C0E');
    assert.equal(mainTheme.colors['sideBar.background'], '#111214');
});

test('system accent integration is gated to the exact original Nacre theme name', () => {
    const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
    assert.match(
        extensionSource,
        /getConfiguration\('workbench'\)\.get\('colorTheme'\)\s*===\s*'Nacre'/,
    );
    assert.equal(pkg.contributes.configuration.properties['nacre.systemAccent.enable'].default, true);
});
