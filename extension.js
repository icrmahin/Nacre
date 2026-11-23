const vscode = require('vscode');
const {
    buildNacreCustomizations,
    readSystemAccentColor,
    watchSystemAccentColor,
} = require('./systemAccent');
const {
    buildNacreSyntaxCustomizations,
    mergeSemanticRules,
    mergeTextMateRules,
    restoreSemanticRules,
    restoreTextMateRules,
} = require('./syntaxAccent');
const nacreTheme = require('./themes/nacre-color-theme.json');

// ── State ──────────────────────────────────────────────────────────────────
let decorationTypeCache = new Map(); // "bgColor|fgColor" → TextEditorDecorationType
let editorTimeouts = new Map();      // editor URI → timeout id
let isEnabled = true;
let extensionContext;
let systemAccentWatcher;
let systemAccentGeneration = 0;

const ORIGINAL_SYSTEM_COLORS_KEY = 'nacre.systemAccent.originalScopedColors';
const LAST_SYSTEM_COLORS_KEY = 'nacre.systemAccent.lastAppliedColors';
const LAST_TEXT_MATE_RULES_KEY = 'nacre.systemAccent.lastAppliedTextMateRules';
const LAST_SEMANTIC_RULES_KEY = 'nacre.systemAccent.lastAppliedSemanticRules';
const NACRE_THEME_SCOPE = '[Nacre]';
const TEXT_MATE_CUSTOMIZATIONS_SETTING = 'editor.tokenColorCustomizations';
const SEMANTIC_CUSTOMIZATIONS_SETTING = 'editor.semanticTokenColorCustomizations';

const MAX_FILE_SIZE = 500000;        // 500 KB – skip very large files
const MAX_UNIQUE_COLORS = 500;       // max decoration types per update
const DEBOUNCE_MS = 200;

// ── Regex patterns ─────────────────────────────────────────────────────────
const HEX_RE    = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const RGB_RE    = /rgba?\(\s*(\d{1,3}%?)\s*[,\s]\s*(\d{1,3}%?)\s*[,\s]\s*(\d{1,3}%?)(?:\s*[,/]\s*(\d*\.?\d+%?))?\s*\)/gi;
const HSL_RE    = /hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)%\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)%(?:\s*[,/]\s*(\d*\.?\d+%?))?\s*\)/gi;

// ── Activation ─────────────────────────────────────────────────────────────
function activate(context) {
    extensionContext = context;
    isEnabled = vscode.workspace
        .getConfiguration('nacre.colorHighlight')
        .get('enable', true);

    // Decorate all currently visible editors
    if (isEnabled) {
        vscode.window.visibleTextEditors.forEach(e => scheduleUpdate(e, false));
    }

    // Active editor changed
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && isEnabled) scheduleUpdate(editor, false);
        })
    );

    // Document content changed
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document && isEnabled) {
                scheduleUpdate(editor, true);
            }
        })
    );

    // Visible editors changed (split view)
    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors(editors => {
            if (isEnabled) editors.forEach(e => scheduleUpdate(e, false));
        })
    );

    // Settings changed
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('nacre.colorHighlight.enable')) {
                isEnabled = vscode.workspace
                    .getConfiguration('nacre.colorHighlight')
                    .get('enable', true);

                if (isEnabled) {
                    vscode.window.visibleTextEditors.forEach(e => scheduleUpdate(e, false));
                } else {
                    disposeAllDecorations();
                }
            }

            if (event.affectsConfiguration('nacre.systemAccent.enable')) {
                const enabled = vscode.workspace
                    .getConfiguration('nacre.systemAccent')
                    .get('enable', true);
                if (enabled) {
                    void startSystemAccentSync(context);
                } else {
                    void stopSystemAccentSync(context);
                }
            }
        })
    );

    // Theme-specific overrides are only useful while Nacre is the active color theme.
    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(() => {
            void refreshSystemAccent(context, systemAccentGeneration);
        })
    );

    void startSystemAccentSync(context);
}

// ── desktop accent integration ──────────────────────────────────────────
function isNacreActive() {
    return vscode.workspace.getConfiguration('workbench').get('colorTheme') === 'Nacre';
}

function stopSystemAccentWatcher() {
    systemAccentGeneration += 1;
    if (systemAccentWatcher) {
        systemAccentWatcher();
        systemAccentWatcher = undefined;
    }
}

async function startSystemAccentSync(context) {
    stopSystemAccentWatcher();

    const enabled = vscode.workspace
        .getConfiguration('nacre.systemAccent')
        .get('enable', true);

    if (process.platform !== 'linux' || !enabled) {
        await restoreSystemCustomizations(context);
        return;
    }

    const generation = systemAccentGeneration;
    systemAccentWatcher = watchSystemAccentColor(() => {
        void refreshSystemAccent(context, generation);
    });
    await refreshSystemAccent(context, generation);
}

async function refreshSystemAccent(context, generation) {
    if (generation !== systemAccentGeneration || process.platform !== 'linux') return;
    if (!vscode.workspace.getConfiguration('nacre.systemAccent').get('enable', true)) return;
    if (!isNacreActive()) return;

    const accent = await readSystemAccentColor();
    if (generation !== systemAccentGeneration || !isNacreActive()) return;
    if (!accent) {
        await restoreSystemCustomizations(context);
        return;
    }

    await applySystemCustomizations(context, accent);
}

async function applySystemCustomizations(context, accent) {
    const colors = buildNacreCustomizations(accent);
    if (!Object.keys(colors).length) return;

    const workbench = vscode.workspace.getConfiguration('workbench');
    const inspected = workbench.inspect('colorCustomizations');
    const globalColors = inspected?.globalValue && typeof inspected.globalValue === 'object'
        ? inspected.globalValue
        : {};
    const themeScope = '[Nacre]';

    let original = context.globalState.get(ORIGINAL_SYSTEM_COLORS_KEY);
    if (!original) {
        const hadScope = Object.prototype.hasOwnProperty.call(globalColors, themeScope);
        original = {
            hadScope,
            value: hadScope && globalColors[themeScope] && typeof globalColors[themeScope] === 'object'
                ? globalColors[themeScope]
                : {},
        };
        await context.globalState.update(ORIGINAL_SYSTEM_COLORS_KEY, original);
    }

    const nextGlobalColors = {
        ...globalColors,
        [themeScope]: {
            ...(globalColors[themeScope] ?? {}),
            ...colors,
        },
    };

    if (JSON.stringify(nextGlobalColors) !== JSON.stringify(globalColors)) {
        await workbench.update(
            'colorCustomizations',
            nextGlobalColors,
            vscode.ConfigurationTarget.Global,
        );
    }
    await context.globalState.update(LAST_SYSTEM_COLORS_KEY, colors);
    await applySyntaxCustomizations(context, accent);
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readGlobalThemeSetting(settingId) {
    const configuration = vscode.workspace.getConfiguration();
    const inspected = configuration.inspect(settingId);
    const globalValue = isPlainObject(inspected?.globalValue)
        ? inspected.globalValue
        : {};
    const scope = isPlainObject(globalValue[NACRE_THEME_SCOPE])
        ? globalValue[NACRE_THEME_SCOPE]
        : {};

    return { configuration, globalValue, scope };
}

async function writeGlobalThemeSetting(settingId, state, nextScope) {
    const nextGlobalValue = { ...state.globalValue };
    if (Object.keys(nextScope).length > 0) {
        nextGlobalValue[NACRE_THEME_SCOPE] = nextScope;
    } else {
        delete nextGlobalValue[NACRE_THEME_SCOPE];
    }

    if (JSON.stringify(nextGlobalValue) === JSON.stringify(state.globalValue)) return;
    await state.configuration.update(
        settingId,
        Object.keys(nextGlobalValue).length > 0 ? nextGlobalValue : undefined,
        vscode.ConfigurationTarget.Global,
    );
}

async function applySyntaxCustomizations(context, accent) {
    const generated = buildNacreSyntaxCustomizations(nacreTheme, accent);
    if (!generated.textMateRules.length && !Object.keys(generated.semanticRules).length) {
        await restoreSyntaxCustomizations(context);
        return;
    }

    const textMateState = readGlobalThemeSetting(TEXT_MATE_CUSTOMIZATIONS_SETTING);
    const previousTextMateRules = context.globalState.get(LAST_TEXT_MATE_RULES_KEY, []);
    const currentTextMateRules = Array.isArray(textMateState.scope.textMateRules)
        ? textMateState.scope.textMateRules
        : [];
    const nextTextMate = mergeTextMateRules(
        currentTextMateRules,
        generated.textMateRules,
        previousTextMateRules,
    );
    const nextTextMateScope = { ...textMateState.scope };
    if (nextTextMate.rules.length > 0) {
        nextTextMateScope.textMateRules = nextTextMate.rules;
    } else {
        delete nextTextMateScope.textMateRules;
    }
    await writeGlobalThemeSetting(
        TEXT_MATE_CUSTOMIZATIONS_SETTING,
        textMateState,
        nextTextMateScope,
    );
    await context.globalState.update(LAST_TEXT_MATE_RULES_KEY, nextTextMate.applied);

    const semanticState = readGlobalThemeSetting(SEMANTIC_CUSTOMIZATIONS_SETTING);
    const previousSemanticRules = context.globalState.get(LAST_SEMANTIC_RULES_KEY, {});
    const currentSemanticRules = isPlainObject(semanticState.scope.rules)
        ? semanticState.scope.rules
        : {};
    const nextSemantic = mergeSemanticRules(
        currentSemanticRules,
        generated.semanticRules,
        previousSemanticRules,
    );
    const nextSemanticScope = { ...semanticState.scope };
    if (Object.keys(nextSemantic.rules).length > 0) {
        nextSemanticScope.rules = nextSemantic.rules;
    } else {
        delete nextSemanticScope.rules;
    }
    await writeGlobalThemeSetting(
        SEMANTIC_CUSTOMIZATIONS_SETTING,
        semanticState,
        nextSemanticScope,
    );
    await context.globalState.update(LAST_SEMANTIC_RULES_KEY, nextSemantic.applied);
}

async function restoreSyntaxCustomizations(context) {
    const previousTextMateRules = context.globalState.get(LAST_TEXT_MATE_RULES_KEY, []);
    if (Array.isArray(previousTextMateRules) && previousTextMateRules.length > 0) {
        const textMateState = readGlobalThemeSetting(TEXT_MATE_CUSTOMIZATIONS_SETTING);
        const currentRules = Array.isArray(textMateState.scope.textMateRules)
            ? textMateState.scope.textMateRules
            : [];
        const restoredRules = restoreTextMateRules(currentRules, previousTextMateRules);
        const nextScope = { ...textMateState.scope };
        if (restoredRules.length > 0) nextScope.textMateRules = restoredRules;
        else delete nextScope.textMateRules;
        await writeGlobalThemeSetting(TEXT_MATE_CUSTOMIZATIONS_SETTING, textMateState, nextScope);
    }
    await context.globalState.update(LAST_TEXT_MATE_RULES_KEY, undefined);

    const previousSemanticRules = context.globalState.get(LAST_SEMANTIC_RULES_KEY, {});
    if (isPlainObject(previousSemanticRules) && Object.keys(previousSemanticRules).length > 0) {
        const semanticState = readGlobalThemeSetting(SEMANTIC_CUSTOMIZATIONS_SETTING);
        const currentRules = isPlainObject(semanticState.scope.rules)
            ? semanticState.scope.rules
            : {};
        const restoredRules = restoreSemanticRules(currentRules, previousSemanticRules);
        const nextScope = { ...semanticState.scope };
        if (Object.keys(restoredRules).length > 0) nextScope.rules = restoredRules;
        else delete nextScope.rules;
        await writeGlobalThemeSetting(SEMANTIC_CUSTOMIZATIONS_SETTING, semanticState, nextScope);
    }
    await context.globalState.update(LAST_SEMANTIC_RULES_KEY, undefined);
}

async function restoreSystemCustomizations(context) {
    const original = context.globalState.get(ORIGINAL_SYSTEM_COLORS_KEY);
    const lastApplied = context.globalState.get(LAST_SYSTEM_COLORS_KEY);

    if (original && lastApplied) {
        const workbench = vscode.workspace.getConfiguration('workbench');
        const inspected = workbench.inspect('colorCustomizations');
        const globalColors = inspected?.globalValue && typeof inspected.globalValue === 'object'
            ? inspected.globalValue
            : {};
        const currentScope = { ...(globalColors[NACRE_THEME_SCOPE] ?? {}) };

        // Restore only keys owned by this integration; leave other scoped customizations intact.
        for (const key of Object.keys(lastApplied)) {
            if (Object.prototype.hasOwnProperty.call(original.value ?? {}, key)) {
                currentScope[key] = original.value[key];
            } else {
                delete currentScope[key];
            }
        }

        const nextGlobalColors = { ...globalColors };
        if (original.hadScope || Object.keys(currentScope).length > 0) {
            nextGlobalColors[NACRE_THEME_SCOPE] = currentScope;
        } else {
            delete nextGlobalColors[NACRE_THEME_SCOPE];
        }

        await workbench.update(
            'colorCustomizations',
            nextGlobalColors,
            vscode.ConfigurationTarget.Global,
        );
        await context.globalState.update(ORIGINAL_SYSTEM_COLORS_KEY, undefined);
        await context.globalState.update(LAST_SYSTEM_COLORS_KEY, undefined);
    }

    await restoreSyntaxCustomizations(context);
}

async function stopSystemAccentSync(context) {
    stopSystemAccentWatcher();
    await restoreSystemCustomizations(context);
}

// ── Deactivation ───────────────────────────────────────────────────────────
async function deactivate() {
    stopSystemAccentWatcher();
    disposeAllDecorations();
    for (const id of editorTimeouts.values()) clearTimeout(id);
    editorTimeouts.clear();

    if (extensionContext) {
        await restoreSystemCustomizations(extensionContext);
        extensionContext = undefined;
    }
}

// ── Scheduling / debounce ──────────────────────────────────────────────────
function scheduleUpdate(editor, debounce) {
    const key = editor.document.uri.toString();

    if (editorTimeouts.has(key)) {
        clearTimeout(editorTimeouts.get(key));
        editorTimeouts.delete(key);
    }

    if (debounce) {
        editorTimeouts.set(key, setTimeout(() => {
            editorTimeouts.delete(key);
            updateDecorations(editor);
        }, DEBOUNCE_MS));
    } else {
        updateDecorations(editor);
    }
}

// ── Core decoration logic ──────────────────────────────────────────────────
function updateDecorations(editor) {
    if (!editor) return;

    const text = editor.document.getText();

    // Skip huge files
    if (text.length > MAX_FILE_SIZE) {
        disposeAllDecorations();
        return;
    }

    const matches = findColorMatches(text);

    // Group by resolved color key
    const groups = new Map(); // colorKey → { bg, fg, ranges[] }

    for (const m of matches) {
        if (!m.rgba) continue;
        const { r, g, b, a } = m.rgba;

        const bg = a < 1
            ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
            : `#${hex2(r)}${hex2(g)}${hex2(b)}`;

        const eff = a < 1
            ? { r: Math.round(r * a), g: Math.round(g * a), b: Math.round(b * a) }
            : { r, g, b };
        const fg = contrastColor(eff.r, eff.g, eff.b);
        const key = `${bg}|${fg}`;

        const start = editor.document.positionAt(m.index);
        const end   = editor.document.positionAt(m.index + m.text.length);

        if (!groups.has(key)) groups.set(key, { bg, fg, ranges: [] });
        groups.get(key).ranges.push({ range: new vscode.Range(start, end) });
    }

    // Guard: too many unique colors
    if (groups.size > MAX_UNIQUE_COLORS) {
        disposeAllDecorations();
        return;
    }

    // Dispose old, apply new
    disposeAllDecorations();

    for (const [key, g] of groups) {
        const dt = getOrCreateDecorationType(g.bg, g.fg, key);
        editor.setDecorations(dt, g.ranges);
    }
}

// ── Decoration type cache ──────────────────────────────────────────────────
function getOrCreateDecorationType(bg, fg, key) {
    if (!decorationTypeCache.has(key)) {
        decorationTypeCache.set(key, vscode.window.createTextEditorDecorationType({
            backgroundColor: bg,
            color: fg,
            borderRadius: '3px',
            border: `1px solid ${bg}`
        }));
    }
    return decorationTypeCache.get(key);
}

function disposeAllDecorations() {
    for (const dt of decorationTypeCache.values()) dt.dispose();
    decorationTypeCache.clear();
}

// ── Color matching ─────────────────────────────────────────────────────────
function findColorMatches(text) {
    const results = [];
    const patterns = [
        { re: new RegExp(HEX_RE.source, 'gi'),  parse: parseHex },
        { re: new RegExp(RGB_RE.source, 'gi'),   parse: parseRgb },
        { re: new RegExp(HSL_RE.source, 'gi'),   parse: parseHsl },
    ];

    for (const { re, parse } of patterns) {
        let m;
        while ((m = re.exec(text)) !== null) {
            const rgba = parse(m);
            if (rgba) results.push({ text: m[0], index: m.index, rgba });
        }
    }
    return results;
}

// ── Parsers ────────────────────────────────────────────────────────────────
function parseHex(m) {
    const h = m[0].slice(1);
    let r, g, b, a = 1;

    switch (h.length) {
        case 3:
            r = parseInt(h[0] + h[0], 16);
            g = parseInt(h[1] + h[1], 16);
            b = parseInt(h[2] + h[2], 16);
            break;
        case 4:
            r = parseInt(h[0] + h[0], 16);
            g = parseInt(h[1] + h[1], 16);
            b = parseInt(h[2] + h[2], 16);
            a = parseInt(h[3] + h[3], 16) / 255;
            break;
        case 6:
            r = parseInt(h.slice(0, 2), 16);
            g = parseInt(h.slice(2, 4), 16);
            b = parseInt(h.slice(4, 6), 16);
            break;
        case 8:
            r = parseInt(h.slice(0, 2), 16);
            g = parseInt(h.slice(2, 4), 16);
            b = parseInt(h.slice(4, 6), 16);
            a = parseInt(h.slice(6, 8), 16) / 255;
            break;
        default:
            return null;
    }

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b, a };
}

function parseRgb(m) {
    let r = component(m[1], 255);
    let g = component(m[2], 255);
    let b = component(m[3], 255);
    let a = m[4] ? component(m[4], 1) : 1;

    if (r == null || g == null || b == null) return null;

    r = clamp(Math.round(r), 0, 255);
    g = clamp(Math.round(g), 0, 255);
    b = clamp(Math.round(b), 0, 255);
    a = clamp(a, 0, 1);
    return { r, g, b, a };
}

function parseHsl(m) {
    const h = parseFloat(m[1]) / 360;
    const s = parseFloat(m[2]) / 100;
    const l = parseFloat(m[3]) / 100;
    const a = m[4] ? component(m[4], 1) : 1;

    if (isNaN(h) || isNaN(s) || isNaN(l)) return null;

    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a: clamp(a, 0, 1) };
}

// ── Color math helpers ─────────────────────────────────────────────────────
function component(val, max) {
    if (val == null) return null;
    val = String(val).trim();
    return val.endsWith('%') ? (parseFloat(val) / 100) * max : parseFloat(val);
}

function hslToRgb(h, s, l) {
    if (s === 0) {
        const v = Math.round(l * 255);
        return { r: v, g: v, b: v };
    }

    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
        r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        g: Math.round(hue2rgb(p, q, h) * 255),
        b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
}

function contrastColor(r, g, b) {
    const toLinear = c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return lum > 0.179 ? '#000000' : '#ffffff';
}

function hex2(n) { return n.toString(16).padStart(2, '0'); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Exports ────────────────────────────────────────────────────────────────
module.exports = { activate, deactivate };
