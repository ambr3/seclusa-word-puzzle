#!/usr/bin/env python3
"""Regenerate the app icons.

    python3 tools/make_icons.py

Needs Pillow. The artwork is drawn at 1024 and downscaled, so the small sizes
stay crisp.

The design is the app in one mark, drawn in the app's own colours: black on
white, or white on black in the dark version -- the same rule the rest of the
app follows, that colour has to mean something or it is not there.

Replace `draw_mark` with your own. The four outputs are:

    static/icons/icon-192.png          purpose "any"
    static/icons/icon-512.png          purpose "any"
    static/icons/icon-maskable-512.png purpose "maskable"
    static/icons/icon.svg              the scalable one
"""

from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ICONS = HERE.parent / "static" / "icons"

SIZE = 1024
BG = (10, 10, 10, 255)
FG = (255, 255, 255, 255)


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def draw_mark(scale=1.0, colour=FG):
    """The mark, drawn on a transparent canvas of SIZE*scale."""
    s = int(SIZE * scale)
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # A plain rounded square, so the mark is a starting point and not a
    # finished design. Replace this with the app's own shape.
    inset = int(s * 0.26)
    d.rounded_rectangle(
        [inset, inset, s - inset, s - inset], radius=int(s * 0.08), fill=colour
    )
    return layer


def make_tile(scale, colour, size):
    """The mark on a solid field, clipped to a rounded square."""
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mark = draw_mark(scale, colour)
    out.paste(mark, (0, 0), mark)
    return out


def make_maskable(colour, size):
    """
    The maskable variant is not the same picture scaled down.

    Android may crop a launcher icon to a circle, a squircle or a rounded
    square, and anything outside the central 80% can be lost, so the mark is
    inset to 72% on a field that bleeds to all four edges.
    """
    out = Image.new("RGBA", (size, size), BG)
    inner = int(size * 0.72)
    mark = draw_mark(inner / SIZE, colour)
    off = (size - inner) // 2
    out.paste(mark, (off, off), mark)
    return out


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="REPLACE ME">
  <rect width="1024" height="1024" rx="200" fill="#0a0a0a"/>
  <rect x="266" y="266" width="492" height="492" rx="82" fill="#ffffff"/>
</svg>
"""


def main():
    ICONS.mkdir(parents=True, exist_ok=True)

    for size in (192, 512):
        tile = make_tile(1.0, FG, size)
        tile.save(ICONS / f"icon-{size}.png")

    make_maskable(FG, 512).save(ICONS / "icon-maskable-512.png")
    (ICONS / "icon.svg").write_text(SVG, encoding="utf-8")

    for name in ("icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon.svg"):
        print(f"static/icons/{name}")


if __name__ == "__main__":
    main()
