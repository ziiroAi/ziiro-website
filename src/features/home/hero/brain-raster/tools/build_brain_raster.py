"""Build the homepage brain raster from the owner's hero reference picture.

    python build_brain_raster.py [--ref PATH] [--upscale edsr|lanczos] [--edsr-model PATH]

The reference picture is NOT in git: it lives on the agent bus at
.team/ziiro-fleet/reference-hero.png, which .gitignore excludes. Pass --ref
when that folder is not present; the script stops with a clear message
otherwise.

Run from anywhere; paths are resolved from the repo root. Tooling only, never
imported by the app. Needs a scratch venv OUTSIDE the repo:

    python3 -m venv /tmp/brain-venv
    /tmp/brain-venv/bin/pip install opencv-contrib-python-headless pillow numpy
    curl -L -o EDSR_x2.pb https://github.com/Saafke/EDSR_Tensorflow/raw/master/models/EDSR_x2.pb

plus `avifenc` and `cwebp` on PATH (Homebrew: libavif, webp).

Geometry is the hero's stage contract: C = (1487, 498) in reference px (the
same point as CORE in orbit/geometry.ts plus the stage origin (860, 83)), and
BrainLayer fills an 860 su square centred on C. So the master
is an 860 px square whose centre is C, upscaled to 1720 for DPR 2.

Steps
  1. Crop the left hemisphere (ref x 1057..1486) and build the hidden half by
     ROTATING it 180 deg about C. A mirror made a Rorschach
     fold that showed at every angle but 0; a rotation about C keeps the
     radial fibres radial and has no fold axis.
  2. Crossfade the real pixels right of C (up to the x = 1512 rule) into the
     rotated half over 22 px. Optionally (--wedge DEG) blend in the mirror
     inside +-DEG of the vertical axis, where rotation is discontinuous with
     the left half (the rim lobes can step there).
  3. Core: the white disc, frosted band and tick halo reach r ~65, and CoreDisc
     (its own layer above) covers r <= 62. Replace r < 70 with a radial
     extension of the ring at r = 78, softened toward the hub.
  4. Satellite ring (dotted, r 398) and its dots: inpaint only pixels in
     r 386..412 that are clearly darker than their local median. A blanket
     band inpaint planes the brain's top and bottom lobes flat.
  5. Upscale x2 (EDSR by default; lanczos + gentle unsharp as the fallback).
  6. Refit as ONE colour: the reference brain is cobalt rgb(0, 55, 251) at
     varying opacity (measured: fg std < 10 per channel at every alpha band),
     so solve per pixel for the alpha that reproduces the pixel over white.
     RGB is written as the constant, which costs nothing to encode.
  7. Feather alpha to zero from r 388 to 406 (beyond is track, threads, dots).
  8. Encode: AVIF 1720 (qalpha 60) and WebP 860 (alpha_q 65) into
     public/media/hero/.
"""
import argparse
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[6]  # tools/brain-raster/hero/home/features/src/<root>
DEFAULT_REF = ROOT / ".team/ziiro-fleet/reference-hero.png"  # gitignored bus folder
OUT = ROOT / "public/media/hero"
CX, CY, S = 1487, 498, 860
X0, Y0 = CX - S // 2, CY - S // 2
COBALT = np.array([0, 55, 251], np.float32)


def polar(size):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    dx, dy = xx + 0.5 - size / 2, yy + 0.5 - size / 2
    return np.hypot(dx, dy) * (S / size), np.arctan2(dy, dx)


def clean_1x(ref, wedge_deg=0.0):
    left = ref[Y0:Y0 + S, X0:CX].copy()
    full = np.concatenate([left, left[::-1, ::-1]], axis=1)   # 180 deg about C
    if wedge_deg > 0:
        mirror = np.concatenate([left, left[:, ::-1]], axis=1)
        yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
        dx, dy = xx + 0.5 - 430, yy + 0.5 - 430
        off_axis = np.degrees(np.arctan2(np.abs(dx), np.abs(dy)))   # 0 on the vertical axis
        w = np.clip(1 - off_axis / wedge_deg, 0, 1)
        w = (w * w * (3 - 2 * w) * (dx > 0))[..., None]
        full = full * (1 - w) + mirror * w

    seam = 22
    orig_right = ref[Y0:Y0 + S, CX:CX + seam]
    for k in range(seam):
        w = 0.5 * (1 + np.cos(np.pi * (k + 0.5) / seam))
        full[:, 430 + k] = w * orig_right[:, k] + (1 - w) * full[:, 430 + k]

    r, th = polar(S)
    r_fill, r_src, r_blend = 70.0, 78.0, 76.0
    mapx = (430 + r_src * np.cos(th) - 0.5).astype(np.float32)
    mapy = (430 + r_src * np.sin(th) - 0.5).astype(np.float32)
    radial = cv2.remap(full, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    glow = np.clip(1 - r / r_fill, 0, 1)[..., None] ** 1.5
    radial = radial * (1 - 0.35 * glow) + np.array([236, 240, 255], np.float32) * (0.35 * glow)
    soft = cv2.GaussianBlur(radial, (0, 0), 2.5)
    radial = radial * (1 - 0.6 * glow) + soft * (0.6 * glow)
    wcore = np.clip((r_blend - r) / (r_blend - r_fill), 0, 1)[..., None]
    wcore = wcore * wcore * (3 - 2 * wcore)
    full = full * (1 - wcore) + radial * wcore

    full8 = np.clip(full, 0, 255).astype(np.uint8)
    luma = cv2.cvtColor(full8, cv2.COLOR_RGB2GRAY)
    dark = (cv2.medianBlur(luma, 11).astype(np.int16) - luma.astype(np.int16)) > 10
    band = (dark & (r > 386) & (r < 412)).astype(np.uint8) * 255
    band = cv2.dilate(band, np.ones((3, 3), np.uint8), iterations=1)
    return cv2.inpaint(full8, band, 4, cv2.INPAINT_TELEA)


def upscale(img8, method, model):
    if method == "edsr":
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        sr.readModel(str(model))
        sr.setModel("edsr", 2)
        return cv2.cvtColor(sr.upsample(cv2.cvtColor(img8, cv2.COLOR_RGB2BGR)), cv2.COLOR_BGR2RGB)
    up = np.asarray(Image.fromarray(img8).resize((S * 2, S * 2), Image.LANCZOS)).astype(np.float32)
    blur = cv2.GaussianBlur(up, (0, 0), 1.2)
    return np.clip(up + 0.45 * (up - blur), 0, 255).astype(np.uint8)


def to_alpha(rgb8, size):
    u = rgb8.astype(np.float32)
    if u.shape[0] != size:
        u = cv2.resize(u, (size, size), interpolation=cv2.INTER_AREA)
    u = np.clip(u * (255.0 / 254.0), 0, 255)  # the reference's white point is ~254
    den = 255 - COBALT
    a = np.clip(((255 - u) * den).sum(2) / (den * den).sum(), 0, 1)
    r, _ = polar(size)
    fe = np.clip((406 - r) / (406 - 388), 0, 1)
    a = a * fe * fe * (3 - 2 * fe)
    a = np.where(a < 0.012, 0, a)
    rgba = np.zeros((size, size, 4), np.uint8)
    rgba[..., :3] = COBALT.astype(np.uint8)
    rgba[..., 3] = np.round(a * 255)
    return rgba


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default=str(DEFAULT_REF), help="the 1536x1024 hero reference picture")
    ap.add_argument("--upscale", choices=["edsr", "lanczos"], default="edsr")
    ap.add_argument("--edsr-model", default="EDSR_x2.pb")
    ap.add_argument("--work", default="/tmp/brain-raster-work")
    ap.add_argument("--wedge", type=float, default=0.0, help="mirror wedge half-angle at the join, degrees (0 = off)")
    ap.add_argument("--out", default=str(OUT), help="where the encoded files go (default public/media/hero)")
    args = ap.parse_args()
    out = Path(args.out)
    work = Path(args.work)
    work.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)

    raw = cv2.imread(args.ref)
    if raw is None or raw.shape[:2] != (1024, 1536):
        raise SystemExit(f"need the 1536x1024 hero reference picture; could not use {args.ref} (see --ref)")
    ref = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB).astype(np.float32)
    clean = clean_1x(ref, args.wedge)
    Image.fromarray(clean).save(work / "clean-1x.png")
    up = upscale(clean, args.upscale, args.edsr_model)

    m1720, m860 = work / "brain-1720.png", work / "brain-860.png"
    Image.fromarray(up).save(work / "up-2x.png")
    Image.fromarray(to_alpha(up, 1720), "RGBA").save(m1720)
    Image.fromarray(to_alpha(clean, 860), "RGBA").save(m860)

    subprocess.run(["avifenc", "-q", "90", "--qalpha", "60", "-s", "2", "-j", "8",
                    str(m1720), str(out / "brain-raster-1720.avif")], check=True, capture_output=True)
    subprocess.run(["cwebp", "-quiet", "-q", "90", "-alpha_q", "65", "-alpha_filter", "best", "-m", "6",
                    str(m860), "-o", str(out / "brain-raster-860.webp")], check=True)
    for f in ("brain-raster-1720.avif", "brain-raster-860.webp"):
        print(f"{f}: {(out / f).stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
