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
    'Nacre Dusk', 'Nacre Alloy',
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
    ['nacre-tokyo-night-icons', 'Nacre Dusk Icons', 'tokyo-night'],
    ['nacre-one-dark-icons', 'Nacre Alloy Icons', 'one-dark'],
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
    assert.equal(new Set(backgrounds).size, 10);
});

test('registers ten separate file icon themes for manual pairing', () => {
    const actual = pkg.contributes.iconThemes.map(theme => [theme.id, theme.label]);
    assert.deepEqual(actual, expectedIconThemes.map(([id, label]) => [id, label]));
    assert.equal(new Set(pkg.contributes.iconThemes.map(theme => theme.path)).size, 10);
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

test('flavor folders accent only their body paths and preserve multicolor sub-icons', () => {
    const flavors = {
        mocha: '#CBA6F7', grove: '#A7C080', ember: '#FE8019',
        tide: '#7E9CD8', abyss: '#80CBC4', nocturne: '#719CD6', jade: '#2DD5B7',
        'tokyo-night': '#7AA2F7', 'one-dark': '#61AFEF',
    };
    const collect = directory => {
        const files = [];
        const visit = current => {
            for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
                const fullPath = path.join(current, entry.name);
                if (entry.isDirectory()) visit(fullPath);
                else if (entry.isFile() && entry.name.endsWith('.svg')) {
                    files.push(path.relative(directory, fullPath));
                }
            }
        };
        visit(directory);
        return files.sort();
    };
    const accentFirstPath = (svg, accent) => svg.replace(/<path\b[^>]*>/i, pathTag => pathTag.replace(
        /(\b(?:fill|stroke)\s*=\s*)(["'])(#[0-9a-f]{3,8})\2/gi,
        (match, prefix, quote) => prefix + quote + accent + quote,
    ));

    for (const [slug, accent] of Object.entries(flavors)) {
        const sourceRoot = path.join(root, 'icons/folders');
        const outputRoot = path.join(root, 'icons/build', slug, 'folders');
        const sourceFiles = collect(sourceRoot);
        assert.deepEqual(collect(outputRoot), sourceFiles, slug + ' folder SVG set differs from source');

        for (const relative of sourceFiles) {
            const source = fs.readFileSync(path.join(sourceRoot, relative), 'utf8');
            const generated = fs.readFileSync(path.join(outputRoot, relative), 'utf8');
            assert.equal(
                generated,
                accentFirstPath(source, accent),
                slug + ' recolored something outside the first folder-body path in ' + relative,
            );
        }

        const sourceBadge = fs.readFileSync(
            path.join(sourceRoot, 'filled/folder_src.variant.carbon.svg'),
            'utf8',
        ).toLowerCase();
        const generatedBadge = fs.readFileSync(
            path.join(outputRoot, 'filled/folder_src.variant.carbon.svg'),
            'utf8',
        ).toLowerCase();
        assert.ok(generatedBadge.includes(accent.toLowerCase()), slug + ' src folder body is not accented');
        assert.ok(generatedBadge.includes('#4775d1'), slug + ' lost the original multicolor code mark');
        assert.ok(sourceBadge.includes('#4775d1'), 'source src folder badge must remain untouched');

        const apiBadge = fs.readFileSync(
            path.join(outputRoot, 'filled/folder_api.variant.carbon.svg'),
            'utf8',
        ).toLowerCase();
        assert.ok(apiBadge.includes(accent.toLowerCase()), slug + ' API folder body is not accented');
        assert.ok(apiBadge.includes('#aee33e'), slug + ' lost the API folder's green sub-icon');

        const claudeBadge = fs.readFileSync(
            path.join(outputRoot, 'filled/folder_claude.variant.carbon.svg'),
            'utf8',
        ).toLowerCase();
        assert.ok(claudeBadge.includes('#f78c6c'), slug + ' lost the Claude folder's original sub-icon color');
    }
});

test('flavor file glyphs are copied byte-for-byte without accent tinting', () => {
    const flavors = [
        'mocha', 'grove', 'ember', 'tide', 'abyss',
        'nocturne', 'jade', 'tokyo-night', 'one-dark',
    ];
    const collect = directory => {
        const files = [];
        const visit = current => {
            for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
                const fullPath = path.join(current, entry.name);
                if (entry.isDirectory()) visit(fullPath);
                else if (entry.isFile() && entry.name.endsWith('.svg')) {
                    files.push(path.relative(directory, fullPath));
                }
            }
        };
        visit(directory);
        return files.sort();
    };

    const sourceRoot = path.join(root, 'icons/files');
    const sourceFiles = collect(sourceRoot);
    assert.ok(sourceFiles.length > 100);

    for (const slug of flavors) {
        const outputRoot = path.join(root, 'icons/build', slug, 'files');
        assert.deepEqual(collect(outputRoot), sourceFiles, slug + ' file SVG set differs from source');
        for (const relative of sourceFiles) {
            assert.equal(
                fs.readFileSync(path.join(outputRoot, relative), 'utf8'),
                fs.readFileSync(path.join(sourceRoot, relative), 'utf8'),
                slug + ' unexpectedly tinted file glyph ' + relative,
            );
        }
    }
});

test('extension buttons use each theme’s own accent, readable text and non-orange hover surfaces', () => {
    for (const contribution of pkg.contributes.themes) {
        const theme = JSON.parse(fs.readFileSync(
            path.join(root, contribution.path.replace(/^\.\//, '')),
            'utf8',
        ));
        const colors = theme.colors;
        const normalBackground = colors['button.secondaryBackground'] || colors['editor.background'];
        const normalForeground = colors.foreground;
        const hoverBackground = colors['editor.selectionBackground']
            || colors['list.activeSelectionBackground']
            || normalBackground;

        assert.equal(colors['extensionButton.background'], normalBackground, contribution.label);
        assert.equal(colors['extensionButton.foreground'], normalForeground, contribution.label);
        assert.equal(colors['extensionButton.hoverBackground'], hoverBackground, contribution.label);
        assert.equal(colors['extensionButton.prominentBackground'], normalBackground, contribution.label);
        assert.equal(colors['extensionButton.prominentForeground'], normalForeground, contribution.label);
        assert.equal(colors['extensionButton.prominentHoverBackground'], hoverBackground, contribution.label);
        assert.notEqual(
            colors['extensionButton.foreground'].toLowerCase(),
            '#15191b',
            contribution.label + ' uses dark/black text on the extension button',
        );
        assert.notEqual(
            colors['extensionButton.hoverBackground'].toLowerCase(),
            '#f16b52',
            contribution.label + ' still uses the old Nacre orange hover fill',
        );
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


test('Nacre Core has its own documented Signal / Noise syntax hierarchy', () => {
    const core = JSON.parse(fs.readFileSync(path.join(root, 'themes/nacre-color-theme.json'), 'utf8'));
    assert.equal(pkg.version, '1.0.3');
    assert.equal(core.colors['editor.background'], '#15191B');
    assert.equal(core.colors.foreground, '#EAE7DF');
    assert.equal(core.colors.focusBorder, '#F16B52');
    assert.equal(core.semanticTokenColors.keyword, '#F16B52');
    assert.equal(core.semanticTokenColors.function, '#D7C68F');
    assert.equal(core.semanticTokenColors.type, '#AEB6B5');
    assert.equal(core.semanticTokenColors.string, '#B9C8A5');
    assert.equal(core.semanticTokenColors.property, '#91B8AD');
    assert.equal(core.semanticTokenColors.number, '#D5A078');
    assert.equal(core.semanticTokenColors.comment, '#697577');
    assert.equal(core.tokenColors.length, 221);
    assert.equal(Object.keys(core.semanticTokenColors).length, 35);

    const ruleColor = name => core.tokenColors.find(rule => rule.name === name)?.settings?.foreground;
    assert.equal(ruleColor('Keyword'), '#F16B52');
    assert.equal(ruleColor('Variable'), '#EAE7DF');
    assert.equal(ruleColor('Function call'), '#D7C68F');
    assert.equal(ruleColor('Type'), '#AEB6B5');
    assert.equal(ruleColor('String'), '#B9C8A5');
    assert.equal(ruleColor('Number'), '#D5A078');
    assert.equal(ruleColor('Comment'), '#697577');
    assert.equal(ruleColor('JSON key'), '#91B8AD');

    const copiedPaletteColors = new Set([
        '#79c0ff', '#ffa657', '#ff7b72', '#d2a8ff', '#a5d6ff', '#7ee787',
    ]);
    for (const rule of core.tokenColors) {
        const color = rule.settings?.foreground?.toLowerCase();
        assert.ok(!copiedPaletteColors.has(color), 'Nacre Core still contains a legacy syntax color: ' + color);
    }
});

test('Tokyo Night and One Dark Pro remain recognizable palette adaptations', () => {
    const cases = [
        {
            path: 'themes/nacre-tokyo-night-color-theme.json',
            label: 'Nacre Dusk',
            background: '#1A1B26',
            keyword: '#BB9AF7',
            function: '#7AA2F7',
        },
        {
            path: 'themes/nacre-one-dark-pro-color-theme.json',
            label: 'Nacre Alloy',
            background: '#282C34',
            keyword: '#C678DD',
            function: '#61AFEF',
        },
    ];
    for (const item of cases) {
        const theme = JSON.parse(fs.readFileSync(path.join(root, item.path), 'utf8'));
        assert.equal(theme.name, item.label);
        assert.equal(theme.colors['editor.background'], item.background);
        assert.equal(theme.semanticTokenColors.keyword, item.keyword);
        assert.equal(theme.semanticTokenColors.function, item.function);
        assert.equal(theme.colors.foreground, '#E6E9EF');
    }
});

test('Nacre Core syntax fixtures cover representative language grammars', () => {
    const fixtures = [
        ['typescript.ts', ['interface', 'function', 'class']],
        ['react.tsx', ['useState', 'return', 'className']],
        ['dart.dart', ['enum', 'class', 'String']],
        ['python.py', ['dataclass', 'def', 'return']],
        ['markup.html', ['<main', 'class=', '<strong']],
        ['styles.css', ['.theme-preview', 'background:', 'transition:']],
        ['data.json', ['"name"', '"accent"', 'true']],
    ];
    for (const [file, markers] of fixtures) {
        const fullPath = path.join(root, 'tests/fixtures/syntax', file);
        assert.ok(fs.existsSync(fullPath), 'missing syntax fixture ' + file);
        const source = fs.readFileSync(fullPath, 'utf8');
        assert.ok(source.length > 40, file + ' is unexpectedly empty');
        for (const marker of markers) {
            assert.ok(source.includes(marker), file + ' is missing marker ' + marker);
        }
    }
});

test('desktop accent remains isolated to Nacre and icon theme selection stays manual', () => {
    const extensionSource = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
    assert.match(extensionSource, /getConfiguration\('workbench'\)\.get\('colorTheme'\)\s*===\s*'Nacre'/);
    assert.doesNotMatch(extensionSource, /workbench\.iconTheme/);
    assert.equal(pkg.contributes.configuration.properties['nacre.systemAccent.enable'].default, true);
});
