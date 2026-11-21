# Inline color highlighting

Nacre's runtime extension adds a small visual preview to color values written in editor documents. It is implemented in `extension.js`.

## Supported formats

- Hex: `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`
- RGB: `rgb(...)` and `rgba(...)`, including comma/space-separated channels and percentage channels
- HSL: `hsl(...)` and `hsla(...)`

Matched ranges receive a decoration whose background is the parsed color. Foreground text is selected as black or white using a relative-luminance threshold to keep the value readable.

## Lifecycle and limits

- Decorations are applied to visible text editors at activation and when visible/active editors change.
- Active-document edits are debounced by 200 ms before recalculation.
- Files above 500 KB are skipped.
- The implementation has a guard for more than 500 unique decoration colors in one update.
- The feature is enabled by default.

## Setting

```json
{
  "nacre.colorHighlight.enable": true
}
```

Set to `false` to dispose existing decorations and disable future updates.
