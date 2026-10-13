"""Render the hero brain's still from the running dev server.

    python render_brain_still.py [--url http://localhost:8081/] [--out DIR]

HeroBrain.tsx's recipe, done by the app itself, so the still cannot drift from
the live scene: the home page opens at a desktop size, at 2x, with reduced
motion (the live brain then holds its start pose, START_YAW and START_PITCH,
and does not turn), and the brain box is pinned to 800 css px square with the
rest of the page hidden. SplineBrain sets the scene up exactly as on the site
(framing, quiet scene, material) for that box, and its canvas is captured at
1600 square. Written to public/media as hero-brain.{avif,webp} (1600) and
hero-brain-800.{avif,webp}: AVIF at quality 60, WebP at 80.

Needs the dev server running, Python with `playwright` (and its Chromium) and
`pillow`, and `avifenc` and `cwebp` on PATH (Homebrew: libavif, webp). The
browser needs WebGL; on macOS it runs on the GPU through ANGLE's Metal
backend. Tooling only, never imported by the app.
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[6]  # tools/brain-raster/hero/home/features/src/<root>
BOX = 800  # css px, the still's box (HeroBrain.tsx)
DPR = 2
# The brain box pinned top left at BOX square, over a page with nothing else showing.
PIN = f"""
.cb-stage__brain {{ position: fixed !important; left: 0 !important; top: 0 !important;
  width: {BOX}px !important; height: {BOX}px !important; z-index: 2147483647 !important; }}
body * {{ visibility: hidden !important; }}
.cb-stage__brain, .cb-stage__brain * {{ visibility: visible !important; }}
"""
INJECT = "document.addEventListener('DOMContentLoaded', () => {"\
         " const s = document.createElement('style'); s.textContent = %r; document.head.appendChild(s); });"
# After the live scene is up: its 700ms crossfade, then the render settling
# (under reduced motion it draws the pose and sleeps after 1.2s).
SETTLE_MS = 3000


def capture(url: str, png: Path) -> None:
    args = ["--ignore-gpu-blocklist", "--enable-gpu"]
    if sys.platform == "darwin":
        args.append("--use-angle=metal")
    with sync_playwright() as p:
        browser = p.chromium.launch(args=args)
        page = browser.new_page(viewport={"width": 1536, "height": 1024}, device_scale_factor=DPR,
                                reduced_motion="reduce")
        page.add_init_script(INJECT % PIN)
        page.goto(url)
        try:
            page.wait_for_selector(".glass-brain[data-live]", state="attached", timeout=30000)
        except Exception as e:
            raise SystemExit(f"the live brain never came up at {url} (dev server down, or no WebGL?): {e}")
        page.wait_for_timeout(SETTLE_MS)
        page.locator(".glass-brain-canvas").screenshot(path=str(png))
        browser.close()


def check(img: Image.Image) -> None:
    size = BOX * DPR
    if img.size != (size, size):
        raise SystemExit(f"captured {img.size}, expected {size} square: is the box pinned?")
    lum = img.convert("L")
    corners = [lum.getpixel(c) for c in [(0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1)]]
    if min(corners) < 250 or lum.getextrema()[0] > 60:
        raise SystemExit(f"capture does not look like the brain on white (corners {corners}, min {lum.getextrema()[0]})")


def encode(png: Path, out: Path, stem: str) -> None:
    subprocess.run(["avifenc", "-q", "60", "-s", "4", str(png), str(out / f"{stem}.avif")],
                   check=True, capture_output=True)
    subprocess.run(["cwebp", "-quiet", "-q", "80", "-m", "6", str(png), "-o", str(out / f"{stem}.webp")], check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8081/")
    ap.add_argument("--out", default=str(ROOT / "public/media"))
    args = ap.parse_args()
    out = Path(args.out)
    with tempfile.TemporaryDirectory() as tmp:
        full = Path(tmp) / "hero-brain.png"
        capture(args.url, full)
        img = Image.open(full).convert("RGB")
        check(img)
        img.save(full)
        half = Path(tmp) / "hero-brain-800.png"
        img.resize((BOX, BOX), Image.LANCZOS).save(half)
        encode(full, out, "hero-brain")
        encode(half, out, "hero-brain-800")
    for f in ("hero-brain.avif", "hero-brain.webp", "hero-brain-800.avif", "hero-brain-800.webp"):
        print(f"{f}: {(out / f).stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
