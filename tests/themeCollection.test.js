'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const expectedLabels = [
    'Nacre', 'Nacre Mocha', 'Nacre Grove', 'Nacre Ember',
    'Nacre Tide', 'Nacre Abyss', 'Nacre Nocturne', 'Nacre Jade',
];
const expectedIconThemes = [
    ['nacre-file-icons', 'Nacre File Icons', 'main'],
    ['nacre-mocha-icons', 'Nacre Mocha Icons', 'mocha'],
    ['nacre-grove-icons', 'Nacre Grove Icons', 'grove'],
    ['nacre-ember-icons', 'Nacre Ember Icons', 'ember'],
    ['nacre-tide-icons', 'Nacre Tide Icons', 'tide'],
    ['nacre-abyss-icons', 'Nacre Abyss Icons', 'abyss'],
    ['nacre-nocturne-icons', 'Nacre Nocturne Icons', 'nocturne'],
    ['nacre-jade-icons', 'Nacre Jade Icons', 'jade'],
];

test('registers Nacre and seven approved flavor names without slash separators', () => {
    const themes = pkg.contributes.themes;
    assert.deepEqual(themes.map(theme => theme.label), expectedLabels);
    assert.equal(new Set(themes.map(theme => theme.label)).size, 8);
    assert.ok(themes.every(theme => !theme.label.includes('/')));
});

test('each registered color theme has an independent valid dark theme file', () => {
    for (const contribution of pkg.contributes.themes) {
        const relative = contribution.path.replace(/^\.\//, '');
        const themePath = path.join(root, relative);
        assert.ok(fs.existsSync(themePath), 'missing ' + relative);
        const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
        assert.equal(theme.name, contribution.label);
        assert.equal(theme.type, 'dark');
        assert.match(theme.colors['editor.background'], /^#[\da-f]{6}$/i);
        assert.ok(theme.tokenColors.length >= 100);
        assert.ok(Object.keys(theme.semanticTokenColors).length >= 20);
    }
});

test('all eight color themes use distinct editor backgrounds', () => {
    const backgrounds = pkg.contributes.themes.map(contribution => {
        const theme = JSON.parse(fs.readFileSync(
            path.join(root, contribution.path.replace(/^\.\//, '')),
            'utf8',
        ));
        return theme.colors['editor.background'].toLowerCase();
    });
    assert.equal(new Set(backgrounds).size, 8);
});

test('registers eight separate file icon themes for manual pairing', () => {
    const actual = pkg.contributes.iconThemes.map(theme => [theme.id, theme.label]);
    assert.deepEqual(actual, expectedIconThemes.map(([id, label]) => [id, label]));
    assert.equal(new Set(pkg.contributes.iconThemes.map(theme => theme.path)).size, 8);
    assert.equal(pkg.contributes.productIconThemes.length, 1);
    assert.equal(pkg.contributes.productIconThemes[0].id, 'nacre-product-icons');
});

test('each flavor icon theme references its own generated file and folder SVG assets', () => {
    for (const [id, label, slug] of expectedIconThemes) {
        const contribution = pkg.contributes.iconThemes.find(theme => theme.id === id);
        assert.ok(contribution, 'missing icon theme ' + label);
        const theme = JSON.parse(fs.readFileSync(
            path.join(root, contribution.path.replace(/^\.\//, '')),
            'utf8',
        ));
        assert.equal(theme.name, label);
        const iconPaths = Object.values(theme.iconDefinitions)
            .filter(value => value.iconPath)
            .map(value => value.iconPath);
        assert.ok(iconPaths.length > 100);

        if (slug === 'main') {
            assert.ok(iconPaths.some(value => value.includes('../icons/build/main/folders/')));
            assert.ok(iconPaths.some(value => value.startsWith('../icons/files/')));
        } else {
            assert.ok(iconPaths.some(value => value.includes('../icons/build/' + slug + '/files/')));
            assert.ok(iconPaths.some(value => value.includes('../icons/build/' + slug + '/folders/')));
            assert.ok(iconPaths.every(value =>
                !value.startsWith('../icons/files/') && !value.startsWith('../icons/folders/')
            ));
        }

        for (const iconPath of iconPaths) {
            assert.ok(
                fs.existsSync(path.resolve(root, 'themes', iconPath)),
                label + ' has a missing asset: ' + iconPath,
            );
        }
    }
});

test('main Nacre folder artwork is neutral graphite rather than blue or orange', () => {
    const artwork = fs.readFileSync(
        path.join(root, 'icons/build/main/folders/nacre-folder.svg'),
        'utf8',
    ).toLowerCase();
    assert.ok(artwork.includes('#17191c'));
    assert.ok(!artwork.includes('#7897ba'));
    assert.ok(!artwork.includes('#aee33e'));
    assert.ok(!artwork.includes('#f16b52'));
});

test('original Nacre editor, sidebar and main theme identity remain unchanged', () => {
    const theme = JSON.parse(fs.readFileSync(path.join(root, 'themes/nacre-color-theme.json'), 'utf8'));
    assert.equal(theme.name, 'Nacre');
    assert.equal(theme.colors['editor.background'], '#0B0C0E');
    assert.equal(theme.colors['sideBar.background'], '#111214');
});

test('desktop accent remains isolated to Nacre and icon theme selection stays manual', () => {
    const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
    assert.match(extensionSource, /getConfiguration\('workbench'\)\.get\('colorTheme'\)\s*===\s*'Nacre'/);
    assert.doesNotMatch(extensionSource, /workbench\.iconTheme/);
    assert.equal(pkg.contributes.configuration.properties['nacre.systemAccent.enable'].default, true);
});
