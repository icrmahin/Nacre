# System accent synchronization

## What it does

When Nacre is the active VS Code color theme on Linux, the extension can use the desktop's current accent color to tint selected workbench surfaces and interactive states. This integration is enabled by default and can be disabled with the single setting:

```json
{
  "nacre.systemAccent.enable": false
}
```

The editor canvas stays near-black (`#0B0C0E`). Syntax token colors, terminal ANSI colors, file icons, product icons and their bundled artwork are not recolored by the desktop accent integration.

## Accent sources

- **GNOME 47 and later:** Nacre reads `org.gnome.desktop.interface accent-color` through GSettings. It monitors that key for changes. The Freedesktop appearance portal is a fallback when the GSettings value is unavailable.
- **KDE Plasma:** Nacre prefers the Freedesktop appearance portal's `org.freedesktop.appearance / accent-color` setting. If the portal cannot provide a value, it reads `AccentColor` from `[General]` in `~/.config/kdeglobals`, then falls back to `[Colors:Selection] / BackgroundNormal`.
- **Other Linux desktops:** Nacre can use the appearance portal when it exposes the standardized accent-color setting. Otherwise the static Nacre palette remains in effect.

The portal returns normalized RGB components. GNOME returns a named accent preference such as `blue`, `teal`, or `purple`. Nacre converts either representation to an sRGB color.

## Live updates

Nacre monitors the GNOME GSettings key on GNOME sessions, the portal's `SettingChanged` signal, and the KDE configuration directory when running Plasma. It does not continuously poll the desktop settings.

For GNOME versions that do not expose the GSettings accent key, the portal fallback may still work if the desktop portal backend implements the setting. If no supported source returns an accent, Nacre does not invent or sample a wallpaper color; it uses its static palette.

## Workbench behavior

The runtime integration writes theme-scoped `[Nacre]` entries into VS Code's global `workbench.colorCustomizations` setting. Other color themes are unaffected. Workbench surfaces receive a restrained tint; focus, link, selection and active-navigation states use the derived accent. Primary action fills receive a separate contrast adjustment where needed to keep their foreground readable.

Before applying the dynamic palette, Nacre stores the existing `[Nacre]` values in extension global state. Turning the feature off restores those previous values for keys owned by the integration and leaves unrelated scoped customizations intact. Users who maintain their own `[Nacre]` overrides for the same color keys should disable system accent synchronization before editing those values.

Workspace-level color customizations can take precedence over global values. Remote extension hosts may not share the local desktop's D-Bus session or configuration, so local desktop detection may not be available in remote windows.

## Validation boundaries

Unit tests cover desktop detection, color parsing, palette generation and contrast calculations. Automated CI cannot verify the actual desktop portal, GNOME/KDE settings signals or VS Code workbench rendering. Those require a live GNOME or KDE session with the packaged VSIX installed.
