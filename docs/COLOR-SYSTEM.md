# Color system

Nacre uses a near-black editor with a graphite workbench. The distinction is intentional: the editor stays quiet, while supporting UI surfaces remain visibly separated from it.

## Core surfaces

| Role | Color | Used for |
| --- | --- | --- |
| Editor | `#121212` | Main code canvas and selected editor surfaces |
| Workbench graphite | `#242527` | Sidebars, panels, activity/title/status surfaces, menus and widgets |
| Selection | `#34465D` | Text selection and related highlight states |
| Primary text | `#E6EDF3` | Main foreground text |
| Muted text | `#8B949E` | Comments and secondary UI labels |

The full VS Code color identifier list is maintained in `themes/nacre-color-theme.json`.

## Syntax roles

| Role | Color | Rationale |
| --- | --- | --- |
| Keywords / control flow | `#FF7B72` | Warm coral gives language structure a clear signal |
| Functions / callable symbols | `#D2A8FF` | Lavender separates behavior from declarations |
| Types / classes | `#FFA657` | Amber provides a distinct type and definition cue |
| Properties / constants / numbers | `#79C0FF` | Blue makes data access and literal values easy to scan |
| Strings | `#A5D6FF` | A lighter blue separates textual values from identifiers |
| Markup tags / components | `#7EE787` | Green gives markup structure its own family |
| Variables / baseline text | `#E6EDF3` | Neutral foreground prevents over-coloring |
| Comments | `#8B949E` | Lower emphasis preserves hierarchy |

The palette draws on the readability and role separation found in GitHub-style dark syntax systems, but uses Nacre's own combination of coral, lavender, amber, blue, green, and neutral text. The actual matching is defined by TextMate scopes in the theme JSON.

## Making changes

1. Edit `themes/nacre-color-theme.json`.
2. Keep related syntax scopes grouped by role.
3. Avoid assigning multiple unrelated token roles the same high-saturation color.
4. Run `npm run validate`.
5. Test representative TypeScript/JavaScript, JSX/TSX, JSON, HTML, CSS, Python, and Markdown files in VS Code.
