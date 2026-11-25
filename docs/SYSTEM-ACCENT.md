# System accent synchronization

## What it does

When the active VS Code color theme is exactly **Nacre**, the extension can use the desktop's current accent color to tint selected workbench surfaces, interactive states and syntax foregrounds. It is enabled by default and controlled by one setting:

```json
{
  "nacre.systemAccent.enable": true
}
```

Nacre Core uses Graphite 950 (`#15191B`) as its editor canvas. Existing TextMate and semantic syntax foregrounds receive a visible but restrained 20% blend toward the desktop accent. The original token roles and hierarchy remain intact, and generated foregrounds are adjusted to preserve a minimum 4.5:1 contrast ratio against the editor background.

## Alternative themes are not tinted

The extension contributes nine additional fixed-color themes:

- Nacre Mocha
- Nacre Grove
- Nacre Ember
- Nacre Tide
- Nacre Abyss
- Nacre Nocturne
- Nacre Jade
- Nacre Dusk
- Nacre Alloy

System accent synchronization checks that the active theme name is exactly `Nacre`. These nine alternatives have their own static workbench, TextMate and semantic palettes. Changing the desktop accent does not recolor them. File icons and product icons are also independent of system accent synchronization.

## Accent sources

- **GNOME 47 and later:** Nacre reads `org.gnome.desktop.interface accent-color` through GSettings. It monitors that key for changes. The Freedesktop appearance portal is a fallback when the GSettings value is unavailable.
- **KDE Plasma:** Nacre prefers the Freedesktop appearance portal's `org.freedesktop.appearance / accent-color` setting. If the portal cannot provide a value, it reads `AccentColor` from `[General]` in `~/.config/kdeglobals`, then falls back to `[Colors:Selection] / BackgroundNormal`.
- **Other Linux desktops:** Nacre can use the appearance portal when it exposes the standardized accent-color setting. Otherwise the static palette remains in effect.

The portal returns normalized RGB components. GNOME returns a named accent preference such as `blue`, `teal` or `purple`. Nacre converts either representation to an sRGB color.

## Live updates

Nacre monitors the GNOME GSettings key on GNOME sessions, the portal's `SettingChanged` signal, and the KDE configuration directory when running Plasma. It does not continuously poll desktop settings.

For GNOME versions that do not expose the GSettings accent key, the portal fallback may still work if the desktop portal backend implements the setting. If no supported source returns an accent, Nacre does not invent or sample a wallpaper color; it uses the static Nacre Core palette.

## Workbench and syntax behavior

The runtime integration writes theme-scoped `[Nacre]` entries into VS Code's global `workbench.colorCustomizations` setting. Syntax colors are adapted through theme-scoped `editor.tokenColorCustomizations` and `editor.semanticTokenColorCustomizations` settings.

Before applying the dynamic palette, Nacre stores the original workbench values and tracks the exact syntax rules it adds. Turning the feature off restores workbench values and removes only unchanged generated syntax rules. Existing user TextMate rules and semantic rules are preserved; explicit user semantic rules take priority over generated rules.

Workspace-level color customizations can take precedence over global values. Remote extension hosts may not share the local desktop's D-Bus session or configuration, so local desktop detection may not be available in remote windows.

## Validation boundaries

Unit tests cover desktop detection, color parsing, workbench palette generation, syntax tint generation, accent-to-syntax differences, contrast, user-override preservation and cleanup behavior. Automated CI cannot verify actual desktop portal signals or VS Code rendering. Those require live GNOME or KDE sessions with the packaged VSIX installed.
