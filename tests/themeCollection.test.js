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
    'Nacre Tokyo Night', 'Nacre One Dark Pro',
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
    ['nacre-tokyo-night-icons', 'Nacre Tokyo Icons', 'tokyo-night'],
    ['nacre-one-dark-icons', 'Nacre One Dark Icons', 'one-dark'],
];

test('registers Nacre and nine approved flavor names without slash separators', () => {
    const themes = pkg.contributes.themes;
    assert.deepEqual(themes.map(theme => theme.label), expectedLabels);
    assert.equal(new Set(themes.map(theme => theme.label)).size, 10);
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


test('all nine flavor themes use one neutral white for normal UI and editor text', () => {
    const textKeys = [
        'foreground',
        'disabledForeground',
        'descriptionForeground',
        'sideBar.foreground',
        'sideBarTitle.foreground',
        'activityBar.foreground',
        'activityBar.inactiveForeground',
        'tab.activeForeground',
        'tab.inactiveForeground',
        'tab.unfocusedActiveForeground',
        'panelTitle.activeForeground',
        'panelTitle.inactiveForeground',
        'editor.foreground',
        'editorLineNumber.foreground',
        'editorLineNumber.activeForeground',
        'input.foreground',
        'quickInput.foreground',
        'menu.foreground',
        'list.activeSelectionForeground',
        'list.inactiveSelectionForeground',
        'list.focusForeground',
        'list.activeSelectionIconForeground',
        'list.inactiveSelectionIconForeground',
        'editor.selectionForeground',
        'breadcrumb.foreground',
        'breadcrumb.focusForeground',
        'breadcrumb.activeSelectionForeground',
        'menu.selectionForeground',
        'menubar.selectionForeground',
        'titleBar.activeForeground',
        'titleBar.inactiveForeground',
        'settings.headerForeground',
        'commandCenter.foreground',
        'commandCenter.activeForeground',
    ];
    const expected = '#E6E9EF';

    for (const contribution of pkg.contributes.themes.slice(1)) {
        const theme = JSON.parse(fs.readFileSync(
            path.join(root, contribution.path.replace(/^\.\//, '')),
            'utf8',
        ));
        for (const key of textKeys) {
            assert.equal(
                theme.colors[key],
                expected,
                contribution.label + ' has an inconsistent text color for ' + key,
            );
        }
    }
});

test('selected text foregrounds never reuse the corresponding selection background', () => {
    const pairs = [
        ['list.activeSelectionForeground', 'list.activeSelectionBackground'],
        ['list.inactiveSelectionForeground', 'list.inactiveSelectionBackground'],
        ['editor.selectionForeground', 'editor.selectionBackground'],
        ['menu.selectionForeground', 'menu.selectionBackground'],
        ['menubar.selectionForeground', 'menubar.selectionBackground'],
        ['breadcrumb.activeSelectionForeground', 'breadcrumb.activeSelectionBackground'],
    ];

    for (const contribution of pkg.contributes.themes.slice(1)) {
        const theme = JSON.parse(fs.readFileSync(
            path.join(root, contribution.path.replace(/^\.\//, '')),
            'utf8',
        ));
        for (const [foregroundKey, backgroundKey] of pairs) {
            const foreground = theme.colors[foregroundKey];
            const background = theme.colors[backgroundKey];
            if (foreground && background) {
                assert.notEqual(
                    foreground.toLowerCase(),
                    background.toLowerCase(),
                    contribution.label + ' has invisible selected text in ' + foregroundKey,
                );
            }
        }
    }
});

test('all ten color themes use distinct editor backgrounds', () => {
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

test('all main Nacre folder artwork is grayscale and visible on the dark workbench', () => {
    const folderRoot = path.join(root, 'icons/build/main/folders');
    const files = [];
    const visit = directory => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(fullPath);
            else if (entry.isFile() && entry.name.endsWith('.svg')) files.push(fullPath);
        }
    };
    visit(folderRoot);
    assert.ok(files.length > 100);

    for (const file of files) {
        const artwork = fs.readFileSync(file, 'utf8').toLowerCase();
        const colors = artwork.match(/#[0-9a-f]{6}\b/g) || [];
        for (const color of colors) {
            const red = parseInt(color.slice(1, 3), 16);
            const green = parseInt(color.slice(3, 5), 16);
            const blue = parseInt(color.slice(5, 7), 16);
            assert.ok(
                Math.max(red, green, blue) - Math.min(red, green, blue) <= 1,
                file + ' still contains a colored folder detail: ' + color,
            );
        }
    }

    const defaultFolder = fs.readFileSync(path.join(folderRoot, 'nacre-folder.svg'), 'utf8').toLowerCase();
    assert.ok(defaultFolder.includes('#777777'));
    assert.ok(!defaultFolder.includes('#17191c'));

    const sourceBadge = fs.readFileSync(
        path.join(folderRoot, 'filled/folder_src.variant.carbon.svg'),
        'utf8',
    ).toLowerCase();
    assert.ok(sourceBadge.includes('#d0d0d0'));
    assert.ok(!sourceBadge.includes('#4775d1'));
});

test('each flavor applies its accent to folder bodies and embedded sub-icons', () => {
    const flavors = {
        mocha: '#cba6f7', grove: '#a7c080', ember: '#fe8019',
        tide: '#7e9cd8', abyss: '#80cbc4', nocturne: '#719cd6', jade: '#2dd5b7',
        'tokyo-night': '#7aa2f7', 'one-dark': '#61afef',
    };
    const mix = (hexA, hexB, amount) => {
        const a = [1, 3, 5].map(index => parseInt(hexA.slice(index, index + 2), 16));
        const b = [1, 3, 5].map(index => parseInt(hexB.slice(index, index + 2), 16));
        return '#' + a.map((value, index) =>
            Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, '0')
        ).join('');
    };
    for (const [slug, accent] of Object.entries(flavors)) {
        const artwork = fs.readFileSync(
            path.join(root, 'icons/build', slug, 'folders/nacre-folder.svg'),
            'utf8',
        ).toLowerCase();
        assert.ok(artwork.includes(accent), slug + ' folder body is missing its flavor accent');

        const sourceBadge = fs.readFileSync(
            path.join(root, 'icons/build', slug, 'folders/filled/folder_src.variant.carbon.svg'),
            'utf8',
        ).toLowerCase();
        const expectedBadgeAccent = mix(accent, '#ffffff', 0.24);
        assert.ok(
            sourceBadge.includes(expectedBadgeAccent),
            slug + ' source-folder sub-icon is missing its lighter flavor accent',
        );
        assert.ok(!sourceBadge.includes('#4775d1'), slug + ' still contains the source blue sub-icon');
        assert.ok(!sourceBadge.includes('#d0d0d0'), slug + ' still contains an uncolored gray sub-icon');
    }
});

test('each flavor uses its accent across generated file glyphs', () => {
    const flavors = {
        mocha: '#cba6f7', grove: '#a7c080', ember: '#fe8019',
        tide: '#7e9cd8', abyss: '#80cbc4', nocturne: '#719cd6', jade: '#2dd5b7',
        'tokyo-night': '#7aa2f7', 'one-dark': '#61afef',
    };
    const collect = directory => {
        let content = '';
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) content += collect(fullPath);
            else if (entry.isFile() && entry.name.endsWith('.svg')) {
                content += fs.readFileSync(fullPath, 'utf8').toLowerCase();
            }
        }
        return content;
    };
    for (const [slug, accent] of Object.entries(flavors)) {
        const fileContent = collect(path.join(root, 'icons/build', slug, 'files'));
        assert.ok(fileContent.includes(accent), slug + ' file icons are missing their flavor accent');
        assert.ok(!fileContent.includes('color(display-p3 .28 .46 .82)'), slug + ' retains the source blue P3 color');
    }
});

test('original Nacre editor, sidebar and main theme identity remain unchanged', () => {
    const theme = JSON.parse(fs.readFileSync(path.join(root, 'themes/nacre-color-theme.json'), 'utf8'));
    assert.equal(theme.name, 'Nacre');
    assert.equal(theme.colors['editor.background'], '#15191B');
    assert.equal(theme.colors['sideBar.background'], '#15191B');
    assert.equal(theme.colors.foreground, '#EAE7DF');
    assert.equal(theme.colors.focusBorder, '#F16B52');
    assert.equal(theme.semanticTokenColors.keyword, '#F16B52');
    assert.equal(theme.semanticTokenColors.function, '#D7C68F');
    assert.equal(theme.semanticTokenColors.comment, '#697577');
    assert.ok(theme.tokenColors.length >= 220);
});

test('desktop accent remains isolated to Nacre and icon theme selection stays manual', () => {
    const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
    assert.match(extensionSource, /getConfiguration\('workbench'\)\.get\('colorTheme'\)\s*===\s*'Nacre'/);
    assert.doesNotMatch(extensionSource, /workbench\.iconTheme/);
    assert.equal(pkg.contributes.configuration.properties['nacre.systemAccent.enable'].default, true);
});
