"""Slice the Marriage Report asset sheet into individual transparent PNGs.

    python scripts/assets/crop-assets.py           # write public/**
    python scripts/assets/crop-assets.py --check   # verify outputs exist, write nothing

Committed so it can be re-run when the sheet is regenerated. Every coordinate
lives in asset-manifest.json; this file holds only the mechanics. See the
manifest's own "_doc" for what is deliberately NOT extracted and why.

Requires Pillow (pip install Pillow). Not part of the app build - assets are
committed, so nobody needs Python to build or run the frontend.
"""

import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST = pathlib.Path(__file__).with_name("asset-manifest.json")

MIN_RUN = 12   # ignore detected specks narrower than this
GUTTER = 5     # consecutive background columns that separate two icons
PAD = 2        # keep a little glow around each icon


def detect_boxes(band, luma_min):
    """Bounding box per icon across a horizontal band.

    Icons are unevenly spaced (Saturn's rings are ~2x the width of Ketu), so we
    threshold to a column profile and split on runs of background columns rather
    than assuming a uniform grid.
    """
    px = band.convert("L").load()
    w, h = band.size
    mask = [[px[x, y] >= luma_min for y in range(h)] for x in range(w)]

    runs, start, gap = [], None, 0
    for x in range(w):
        if any(mask[x]):
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= GUTTER:
                if x - gap - start >= MIN_RUN:
                    runs.append((start, x - gap))
                start, gap = None, 0
    if start is not None and w - start >= MIN_RUN:
        runs.append((start, w))

    boxes = []
    for x0, x1 in runs:
        ys = [y for y in range(h) if any(mask[x][y] for x in range(x0, x1))]
        if ys:
            boxes.append((x0, ys[0], x1, ys[-1] + 1))
    return boxes


def key_background(img, lo, hi):
    """Ramp alpha by luminance so the flat black drops out and glows feather."""
    img = img.convert("RGBA")
    lum = img.convert("L")
    span = max(hi - lo, 1)
    alpha = lum.point(lambda v: 0 if v <= lo else 255 if v >= hi else int((v - lo) * 255 / span))
    img.putalpha(alpha)
    return img


def crop(sheet, box, alpha, out_path):
    x0, y0, x1, y1 = box
    piece = sheet.crop((max(x0 - PAD, 0), max(y0 - PAD, 0),
                        min(x1 + PAD, sheet.width), min(y1 + PAD, sheet.height)))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # alpha null = keep every pixel. For art whose SUBJECT is the darkest thing in the crop
    # (a silhouette on a lit background), any luminance ramp keys the subject away and leaves
    # the glow behind it - the exact inverse of what keying is for.
    out = piece.convert("RGBA") if alpha is None else key_background(piece, alpha[0], alpha[1])
    out.save(out_path)
    return piece.size


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    out_dir = ROOT / manifest["outDir"]

    if "--check" in sys.argv:
        missing = [o for s in manifest["sections"] for o in s["outputs"]
                   if not (out_dir / f"{o}.png").exists()]
        if missing:
            sys.exit("missing assets:\n  " + "\n  ".join(missing))
        print(f"all {sum(len(s['outputs']) for s in manifest['sections'])} assets present")
        return

    # Sections may name their own `sheet` (there is more than one design sheet now, each
    # with its own coordinate space). Loaded lazily and cached, so re-slicing one report
    # only requires that report's sheet to still be on disk.
    sheets = {}

    def load_sheet(path_str):
        if path_str not in sheets:
            path = pathlib.Path(path_str)
            if not path.exists():
                sys.exit(f"source sheet not found: {path}\n"
                         "Assets are committed, so this only matters when re-slicing a new sheet.")
            sheets[path_str] = Image.open(path).convert("RGB")
        return sheets[path_str]

    def section_sheet(section):
        """A section's `sheet` is a name in the manifest's `sheets` map; absent means the
        default top-level `sheet` (the Marriage sheet, whose sections predate the map)."""
        name = section.get("sheet")
        if name is None:
            return load_sheet(manifest["sheet"])
        if name not in manifest["sheets"]:
            sys.exit(f"[{section['name']}] unknown sheet {name!r}; "
                     f"known: {', '.join(k for k in manifest['sheets'] if not k.startswith('_'))}")
        return load_sheet(manifest["sheets"][name])

    for section in manifest["sections"]:
        outputs, alpha = section["outputs"], section["alpha"]
        sheet = section_sheet(section)

        if "rect" in section:
            boxes = [tuple(section["rect"])]
        else:
            x0, y0, x1, y1 = section["band"]
            boxes = [(x0 + b[0], y0 + b[1], x0 + b[2], y0 + b[3])
                     for b in detect_boxes(sheet.crop((x0, y0, x1, y1)), section["luma"])]

        # Fail loudly rather than silently mapping the wrong artwork onto a name -
        # a shifted band would otherwise ship Saturn's icon as "rahu".
        if len(boxes) != len(outputs):
            sys.exit(f"[{section['name']}] detected {len(boxes)} icons, manifest names "
                     f"{len(outputs)} ({', '.join(outputs)}). Adjust the band or luma.")

        for box, name in zip(boxes, outputs):
            w, h = crop(sheet, box, alpha, out_dir / f"{name}.png")
            print(f"  {name}.png  {w}x{h}")


main()
