"""
Patch PdfEditor.tsx to fix the text visibility bug:
1. onDragStart: call requestRedactOriginal + set forceVisible immediately
2. onClick: for existing text, set forceVisible + call requestRedactOriginal
3. color condition: remove selectedId check (rely only on isMoved/isRedacted)
"""
import re

FILE = r"c:\Users\Acer\OneDrive\Desktop\Fishtail-Work\pdf-editor\components\PdfEditor.tsx"

with open(FILE, encoding="utf-8") as f:
    content = f.read()

original = content

# ── Fix 1: onDragStart ───────────────────────────────────────────────────────
# Find the onDragStart block for text annotations and add forceVisible + redact
OLD_DRAG_START = (
    "onDragStart={() => {\n"
    "                                                                             // Keep moved existing text visible while dragging.\n"
    "                                                                             setSelectedId(ta.id);\n"
    "                                                                         }}"
)
NEW_DRAG_START = (
    "onDragStart={() => {\n"
    "                                                                             setSelectedId(ta.id);\n"
    "                                                                             // Immediately erase from PDF canvas so overlay shows during drag\n"
    "                                                                             if (ta.isExisting) {\n"
    "                                                                                 updateAnnotation(ta.id, { forceVisible: true } as any);\n"
    "                                                                                 requestRedactOriginal(ta.id, ta.page);\n"
    "                                                                             }\n"
    "                                                                         }}"
)

if OLD_DRAG_START in content:
    content = content.replace(OLD_DRAG_START, NEW_DRAG_START, 1)
    print("✓ Fix 1 applied: onDragStart updated")
else:
    print("✗ Fix 1 FAILED: onDragStart pattern not found")

# ── Fix 2: onClick ───────────────────────────────────────────────────────────
OLD_CLICK = (
    "onClick={(e: any) => {\n"
    "                                                                             e.stopPropagation();\n"
    "                                                                             setSelectedId(ta.id);\n"
    "                                                                             // Do not enter editing mode automatically on first click if existing\n"
    "                                                                             if (!ta.isExisting) updateAnnotation(ta.id, { editing: true } as any);\n"
    "                                                                         }}"
)
NEW_CLICK = (
    "onClick={(e: any) => {\n"
    "                                                                             e.stopPropagation();\n"
    "                                                                             setSelectedId(ta.id);\n"
    "                                                                             if (!ta.isExisting) {\n"
    "                                                                                 updateAnnotation(ta.id, { editing: true } as any);\n"
    "                                                                             } else {\n"
    "                                                                                 // Single-click on existing: erase from PDF canvas so overlay text is visible\n"
    "                                                                                 updateAnnotation(ta.id, { forceVisible: true } as any);\n"
    "                                                                                 requestRedactOriginal(ta.id, ta.page);\n"
    "                                                                             }\n"
    "                                                                         }}"
)

if OLD_CLICK in content:
    content = content.replace(OLD_CLICK, NEW_CLICK, 1)
    print("✓ Fix 2 applied: onClick updated")
else:
    print("✗ Fix 2 FAILED: onClick pattern not found")

# ── Fix 3: color condition ───────────────────────────────────────────────────
OLD_COLOR = 'color: (!isMoved && !isRedacted && selectedId !== ta.id) ? "transparent" : (ta.color || "#000000"),'
NEW_COLOR = 'color: (!isMoved && !isRedacted) ? "transparent" : (ta.color || "#000000"),'

if OLD_COLOR in content:
    content = content.replace(OLD_COLOR, NEW_COLOR, 1)
    print("✓ Fix 3 applied: color condition simplified")
else:
    print("✗ Fix 3 FAILED: color condition not found")

if content != original:
    with open(FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print("\n✓ File saved successfully")
else:
    print("\n✗ No changes made – check patterns above")
