"""
generate_portrait_gif.py

Fetches the user's GitHub avatar and builds an animated GIF portrait card
with a pixel-glitch / RGB-split effect playing over the photo, framed in
the same terminal-window style as the rest of the profile. GIFs render
reliably in GitHub READMEs (unlike SVGs with embedded <image> data, which
GitHub's sanitizer can strip).

Requires: pip install Pillow requests
Env vars: GH_USERNAME
"""

import io
import os
import random
import urllib.request

from PIL import Image, ImageDraw, ImageFont, ImageChops

USERNAME = os.environ.get("GH_USERNAME", "code-by-adi7")

CARD_W, CARD_H = 380, 420
AVATAR_SIZE = 112
AVATAR_CENTER = (190, 140)
AVATAR_RADIUS = 56

BG_TOP = (18, 24, 28)
BG_BOTTOM = (10, 14, 17)
ACCENT = (95, 179, 163)
TEXT_MAIN = (232, 236, 233)
TEXT_DIM = (92, 107, 112)
TERMINAL_BG = (13, 18, 21)


def fetch_avatar():
    url = f"https://avatars.githubusercontent.com/{USERNAME}?size={AVATAR_SIZE}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = resp.read()
        img = Image.open(io.BytesIO(data)).convert("RGB")
        return img.resize((AVATAR_SIZE, AVATAR_SIZE))
    except Exception as e:
        print(f"Falling back to local mock avatar (fetch failed: {e})")
        img = Image.open("mock_avatar.png").convert("RGB")
        return img.resize((AVATAR_SIZE, AVATAR_SIZE))


def circle_mask(size):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size, size), fill=255)
    return mask


def rgb_split(img, offset):
    r, g, b = img.split()
    r = ImageChops.offset(r, offset, random.randint(-3, 3))
    b = ImageChops.offset(b, -offset, random.randint(-3, 3))
    return Image.merge("RGB", (r, g, b))


def pixel_slice_glitch(img, intensity=0.5):
    """Shift several horizontal bands sideways for a datamosh look, plus
    a chance of a full-width color-block glitch bar for extra punch."""
    out = img.copy()
    w, h = out.size
    num_slices = random.randint(4, 8)
    for _ in range(num_slices):
        band_h = random.randint(6, 18)
        y = random.randint(0, h - band_h)
        shift = random.randint(-22, 22)
        band = out.crop((0, y, w, y + band_h))
        shifted = Image.new("RGB", band.size, ACCENT)
        shifted.paste(band, (shift, 0))
        out.paste(shifted, (0, y))

    # occasional solid glitch bar in a bold color for extra visual punch
    if random.random() < 0.7:
        bar_h = random.randint(5, 10)
        y = random.randint(0, h - bar_h)
        bar_color = random.choice([(255, 46, 99), (95, 220, 192), (255, 159, 28)])
        draw = ImageDraw.Draw(out)
        draw.rectangle((0, y, w, y + bar_h), fill=bar_color)

    # slight pixelation pass for a chunkier, more "digital" glitch look
    if intensity > 0.6:
        small = out.resize((w // 6, h // 6), Image.NEAREST)
        pixelated = small.resize((w, h), Image.NEAREST)
        out = Image.blend(out, pixelated, 0.35)

    return out


def build_frame(avatar_clean, glitch_level):
    """glitch_level: 0.0 = clean, 1.0 = max glitch"""
    card = Image.new("RGB", (CARD_W, CARD_H), BG_BOTTOM)
    draw = ImageDraw.Draw(card)

    # vertical gradient background
    for y in range(CARD_H):
        t = y / CARD_H
        r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
        draw.line([(0, y), (CARD_W, y)], fill=(r, g, b))

    # tab bar
    draw.rectangle((0, 0, CARD_W, 34), fill=(16, 22, 25))
    for i, color in enumerate([(224, 96, 90), (224, 185, 90), (95, 191, 111)]):
        draw.ellipse((18 + i * 18 - 5, 17 - 5, 18 + i * 18 + 5, 17 + 5), fill=color)

    try:
        font_sm = ImageFont.load_default()
        font_med = ImageFont.load_default()
    except Exception:
        font_sm = font_med = None

    draw.text((190, 15), "whoami.sh", fill=TEXT_DIM, anchor="mm", font=font_sm)

    # avatar ring
    rx, ry = AVATAR_CENTER
    ring_r = AVATAR_RADIUS + 10
    draw.ellipse((rx - ring_r, ry - ring_r, rx + ring_r, ry + ring_r), outline=ACCENT, width=3)

    # build glitched avatar
    avatar = avatar_clean
    if glitch_level > 0.05:
        offset = int(10 * glitch_level)
        avatar = rgb_split(avatar, offset)
        avatar = pixel_slice_glitch(avatar, glitch_level)

    mask = circle_mask(AVATAR_SIZE)
    paste_pos = (rx - AVATAR_SIZE // 2, ry - AVATAR_SIZE // 2)
    card.paste(avatar, paste_pos, mask)

    # name + handle
    draw.text((190, 228), "Adithya", fill=TEXT_MAIN, anchor="mm", font=font_med)
    draw.text((190, 250), f"@{USERNAME}", fill=TEXT_DIM, anchor="mm", font=font_sm)

    # terminal block
    draw.rounded_rectangle((28, 272, 352, 392), radius=6, fill=TERMINAL_BG, outline=(31, 42, 46))
    lines = [
        ("$ whoami", ACCENT),
        ("BCA student - building things", TEXT_MAIN),
        ("across web, systems & data", TEXT_MAIN),
        ("$ status", ACCENT),
        ("learning in public, one repo at a time", TEXT_MAIN),
    ]
    y = 296
    for text, color in lines:
        draw.text((46, y), text, fill=color, font=font_sm)
        y += 22

    return card


def main():
    avatar = fetch_avatar()

    # Frame schedule: mostly clean, brief glitch bursts, matching the
    # earlier SVG timing (glitch beats around 55-61% and 90-96% of a loop)
    glitch_schedule = [0.0] * 5 + [0.7, 1.0, 0.9, 0.4] + [0.0] * 5 + [0.6, 1.0, 0.8] + [0.0] * 3

    frames = [build_frame(avatar, g) for g in glitch_schedule]

    # duration per frame in ms; hold clean frames longer, glitch frames shorter
    durations = [400 if g == 0.0 else 90 for g in glitch_schedule]

    frames[0].save(
        "portrait.gif",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
    )
    print("Wrote portrait.gif")


if __name__ == "__main__":
    main()
