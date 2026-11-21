# Icon themes

Nacre ships two separately selectable icon themes. Their artwork, mapping definitions, and font files are part of the extension package.

## Nacre File Icons

Contribution ID: `nacre-file-icons`  
Display label: `Nacre File Icons`  
Definition file: `themes/nacre-file-icons.json`

The mapping currently contains:

- 396 icon definitions
- 449 file-extension mappings
- 391 exact filename mappings
- 145 folder-name mappings
- 143 expanded-folder-name mappings

The file theme references 252 SVGs in `icons/files/` and 237 SVGs in `icons/folders/`. Folder variants include filled and expanded/open states.

## Nacre Product Icons

Contribution ID: `nacre-product-icons`  
Display label: `Nacre Product Icons`  
Definition file: `themes/nacre-product-icons.json`

The product theme defines 171 glyph IDs and references the bundled font at `themes/nacre-ui-icons.woff2`, using font ID `nacre-ui-icons`. Product icons replace VS Code's product UI glyphs where the corresponding IDs are recognized by the editor.

## Preservation guidance

Do not rename an SVG or WOFF2 file without updating its matching reference. File icon paths are relative to `themes/nacre-file-icons.json`; the product font path is relative to `themes/nacre-product-icons.json`. Run `npm run validate` after changes.
