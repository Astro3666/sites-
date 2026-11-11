#!/usr/bin/env python3
"""Turn a car wash's logo (photo, screenshot or file) into the three images a business folder needs.

    python3 scripts/prepare-logo.py <logo image> <slug> [options]

Writes to businesses/<slug>/:
    logo.png      trimmed, background removed (transparent), up to 2400 px wide. Used on the Wallet card.
    logo-web.png  the same, 600 px wide. Used on the website and dashboard.
    mark.png      512x512 square icon on the card colour. Used as the Wallet icon.

Options:
    --keep-bg            keep the logo's own background (for logos that are a filled badge)
    --tolerance N        how close to the background colour a pixel must be to be removed (default 40)
    --whiten             recolour dark parts of the logo to white, for dark logos on the dark card
    --mark-crop X,Y,W,H  use this part of the trimmed logo for the square icon (e.g. just the letters)
    --card "#111113"     card colour behind the square icon (default: business.json colors.card, else #111113)

Needs Pillow (pip install pillow).
"""
import argparse
import json
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def corner_colour(im):
    """Most common colour among the border pixels: that is the background."""
    w, h = im.size
    px = im.load()
    counts = {}
    for x in range(w):
        for y in (0, h - 1):
            c = px[x, y][:3]
            counts[c] = counts.get(c, 0) + 1
    for y in range(h):
        for x in (0, w - 1):
            c = px[x, y][:3]
            counts[c] = counts.get(c, 0) + 1
    return max(counts, key=counts.get)


def remove_background(im, bg, tol):
    """Make pixels near the background colour transparent, with a soft edge, and undo the
    background's tint on the edge pixels so they don't show a halo."""
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
            if d <= tol:
                px[x, y] = (0, 0, 0, 0)
            elif d <= tol * 2.5:
                alpha = (d - tol) / (tol * 1.5)
                # un-mix the background: c = alpha*fg + (1-alpha)*bg
                fg = [max(0, min(255, round((c - (1 - alpha) * bc) / alpha))) for c, bc in zip((r, g, b), bg)]
                px[x, y] = (fg[0], fg[1], fg[2], round(a * alpha))
    return im


def whiten(im):
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and (0.2126 * r + 0.7152 * g + 0.0722 * b) < 90:
                px[x, y] = (255, 255, 255, a)
    return im


def mean_luma(im):
    px = im.load()
    w, h = im.size
    tot = n = 0
    for y in range(0, h, max(1, h // 200)):
        for x in range(0, w, max(1, w // 200)):
            r, g, b, a = px[x, y]
            if a > 128:
                tot += 0.2126 * r + 0.7152 * g + 0.0722 * b
                n += 1
    return tot / n if n else 255


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('image')
    ap.add_argument('slug')
    ap.add_argument('--keep-bg', action='store_true')
    ap.add_argument('--tolerance', type=int, default=40)
    ap.add_argument('--whiten', action='store_true')
    ap.add_argument('--mark-crop')
    ap.add_argument('--card')
    a = ap.parse_args()

    out = os.path.join(ROOT, 'businesses', a.slug)
    os.makedirs(out, exist_ok=True)
    card = a.card
    if not card:
        try:
            card = json.load(open(os.path.join(out, 'business.json')))['colors']['card']
        except (OSError, KeyError, ValueError):
            card = '#111113'

    im = Image.open(a.image)
    im.load()
    im = im.convert('RGBA')
    if not a.keep_bg:
        bg = corner_colour(im)
        print(f'Background colour {"#%02X%02X%02X" % bg}: removing it')
        im = remove_background(im, bg, a.tolerance)
    if a.whiten:
        im = whiten(im)
    box = im.getbbox()
    if not box:
        sys.exit('Nothing left after removing the background; try --keep-bg or a lower --tolerance')
    im = im.crop(box)
    pad = round(max(im.size) * 0.02)
    framed = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    framed.paste(im, (pad, pad))
    im = framed
    if im.width > 2400:
        im = im.resize((2400, round(im.height * 2400 / im.width)), Image.LANCZOS)
    im.save(os.path.join(out, 'logo.png'))
    web = im.resize((600, max(1, round(im.height * 600 / im.width))), Image.LANCZOS) if im.width > 600 else im
    web.save(os.path.join(out, 'logo-web.png'))

    src = im
    if a.mark_crop:
        x, y, w, h = (int(v) for v in a.mark_crop.split(','))
        src = im.crop((x, y, x + w, y + h))
    mark = Image.new('RGBA', (512, 512), hex_rgb(card) + (255,))
    k = min(400 / src.width, 400 / src.height)
    fit = src.resize((max(1, round(src.width * k)), max(1, round(src.height * k))), Image.LANCZOS)
    mark.alpha_composite(fit, ((512 - fit.width) // 2, (512 - fit.height) // 2))
    mark.convert('RGB').save(os.path.join(out, 'mark.png'))

    print(f'Wrote {out}/logo.png ({im.width}x{im.height}), logo-web.png, mark.png')
    if im.width / im.height < 2:
        print('Note: the logo is nearly square. It will show small on the Wallet card (max 50 pt tall).')
    if mean_luma(im) < 70 and not a.whiten:
        print('Warning: the logo is mostly dark and may be hard to see on the dark card. Try --whiten.')


if __name__ == '__main__':
    main()
