import re

FILE = r"c:\Users\Acer\OneDrive\Desktop\Fishtail-Work\pdf-editor\components\PdfEditor.tsx"

with open(FILE, encoding="utf-8") as f:
    content = f.read()

original = content

# ── Fix 1: onDragStart ───────────────────────────────────────────────────────
# We want to replace:
# onDragStart={() => {
#    // Keep moved existing text visible while dragging.
#    setSelectedId(ta.id);
# }}
# with our new version.
drag_start_pattern = re.compile(
    r"onDragStart=\{\(\) => \{\s*// Keep moved existing text visible while dragging\.\s*setSelectedId\(ta\.id\);\s*\}\}",
    re.MULTILINE
)

new_drag_start = """onDragStart={() => {
                                                                            setSelectedId(ta.id);
                                                                            if (ta.isExisting) {
                                                                                updateAnnotation(ta.id, { forceVisible: true } as any);
                                                                                requestRedactOriginal(ta.id, ta.page);
                                                                            }
                                                                        }}"""

if drag_start_pattern.search(content):
    content = drag_start_pattern.sub(new_drag_start, content, count=1)
    print("✓ Fix 1 applied: onDragStart updated")
else:
    print("✗ Fix 1 FAILED: onDragStart pattern not found")


# ── Fix 2: onClick ───────────────────────────────────────────────────────────
click_pattern = re.compile(
    r"onClick=\{\(e:\s*any\)\s*=>\s*\{\s*e\.stopPropagation\(\);\s*setSelectedId\(ta\.id\);\s*// Do not enter editing mode automatically on first click if existing\s*if\s*\(!ta\.isExisting\)\s*updateAnnotation\(ta\.id,\s*\{\s*editing:\s*true\s*\}\s*as\s*any\);\s*\}\}",
    re.MULTILINE
)

new_click = """onClick={(e: any) => {
                                                                            e.stopPropagation();
                                                                            setSelectedId(ta.id);
                                                                            if (!ta.isExisting) {
                                                                                updateAnnotation(ta.id, { editing: true } as any);
                                                                            } else {
                                                                                updateAnnotation(ta.id, { forceVisible: true } as any);
                                                                                requestRedactOriginal(ta.id, ta.page);
                                                                            }
                                                                        }}"""

if click_pattern.search(content):
    content = click_pattern.sub(new_click, content, count=1)
    print("✓ Fix 2 applied: onClick updated")
else:
    print("✗ Fix 2 FAILED: onClick pattern not found")


if content != original:
    with open(FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print("\n✓ File saved successfully")
else:
    print("\n✗ No changes made")
