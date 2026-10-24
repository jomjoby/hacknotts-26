# Paint

A simple Windows 7 style Paint. Open it from the start menu (**Paint**), with `openApp('paint')`, or by asking Clippy to "open paint".

- **Paint menu** (blue button): New, Open... (any picture), Save as PNG (downloads the picture), About, Exit
- **Quick access**: Save, Undo (Ctrl+Z), Redo (Ctrl+Y)
- **Tools**: Pencil, Fill with color, Text (click, type, Enter), Eraser (paints Color 2), Color picker (left-click sets Color 1, right-click Color 2)
- **Brushes**, **Shapes** (Line, Rectangle, Oval, Rounded rectangle; tick "Fill with Color 2" for solid shapes), **Size** (1, 3, 5, 8)
- **Colors**: the Windows 7 Paint palette and Edit colors. Click Color 1 or Color 2 first to choose which one the palette sets.
- Left-click draws with Color 1, right-click with Color 2. Drag the small square at the picture's corner to resize it.

Everything is in `paint.js` and `paint.css`; the icons are drawn in code (`images/paint.svg` is the start menu icon).
