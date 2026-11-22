# KDE Plasma accent synchronization

## What it does

When Nacre is selected as the active VS Code color theme on a Linux KDE Plasma session, the extension follows the current desktop accent color.

The adapter prefers the freedesktop appearance portal's `org.freedesktop.appearance` / `accent-color` setting (an RGB tuple of normalized values). KDE's portal implementation exposes the current palette highlight color; this is the preferred route for wallpaper-derived accents. If the portal query is unavailable, Nacre reads `AccentColor` from the `[General]` group in `~/.config/kdeglobals`, then falls back to `[Colors:Selection]` / `BackgroundNormal`.

For live updates it listens for the portal's `SettingChanged` signal through `gdbus monitor` and watches the directory containing `kdeglobals`. It does not poll continuously. The portal monitor is optional; the config watcher remains as a fallback.

## Design boundaries

The integration changes only VS Code workbench colors. The `#121212` editor canvas remains fixed, while graphite surfaces receive a subtle tint. Accent-derived colors are used for active tabs, selections, focus and border states, links, badges and primary buttons. Error, warning, success, diff and terminal ANSI colors are intentionally preserved.

All TextMate `tokenColors`, semantic token colors, file icon mappings, product icon mappings, SVG artwork and bundled fonts are untouched.

## Settings behavior

The feature is enabled by default on detected KDE Linux sessions. Disable it with:

```json
{
  "nacre.kdeAccent.enable": false
}
```

The extension writes a theme-scoped `[Nacre]` object to the global `workbench.colorCustomizations` setting. Other themes are unaffected. Before writing, it remembers the previous `[Nacre]` values in extension global state. Turning the feature off, or deactivating the extension, restores the previous values for the keys Nacre owns and leaves unrelated scoped customizations intact.

Because the dynamic colors must reach VS Code's workbench, this user-settings override is necessary; the theme JSON itself has no runtime variable mechanism. Users who maintain their own `[Nacre]` overrides for the same keys should disable KDE sync before editing those values.

## Limitations

- A static VS Code color-theme JSON file cannot directly subscribe to KDE, read wallpaper colors, or evaluate CSS-like variables. The extension provides the runtime bridge through `workbench.colorCustomizations`.
- The portal is the most accurate source. If it does not expose `accent-color`, the `kdeglobals` fallback may only reflect the accent/selection values currently stored by KDE.
- Some native window decorations and operating-system surfaces are outside VS Code's theme color API and will continue to follow KDE/Qt's own styling.
- Workspace- or folder-level `workbench.colorCustomizations` can take precedence over the global theme-scoped values and may hide some dynamic colors.
- Remote extension hosts may not share the local desktop's D-Bus session or KDE configuration. In that case, automatic detection may not be available.
- The behavior requires a Linux KDE session. Other Linux desktops and operating systems retain the normal static Nacre palette.

## Validation

The pure color parsing and palette-generation functions are tested with Node's built-in test runner. Live portal signaling and actual workbench rendering still require a real KDE Plasma desktop and VS Code session.
