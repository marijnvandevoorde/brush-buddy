#!/usr/bin/env python3
"""Composite each hero mascot onto a themed rounded card -> app icons.
Pure Python: decodes the hero PNGs, bilinear-scales, composites, writes icons."""
import struct, zlib, math, sys, os

# ---------- PNG decode ----------
def paeth(a, b, c):
    p = a + b - c; pa = abs(p - a); pb = abs(p - b); pc = abs(p - c)
    return a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)

def decode_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    pos = 8; idat = bytearray(); w = h = bd = ct = it = None
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos+4])[0]; typ = d[pos+4:pos+8]
        body = d[pos+8:pos+8+ln]; pos += 12 + ln
        if typ == b"IHDR":
            w, h, bd, ct, _, _, it = struct.unpack(">IIBBBBB", body)
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break
    assert bd == 8 and ct == 6 and it == 0, f"unsupported PNG {bd} {ct} {it}"
    raw = zlib.decompress(bytes(idat))
    stride = w * 4; prev = bytearray(stride); out = []; p = 0
    for _ in range(h):
        ft = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        for i in range(stride):
            a = line[i-4] if i >= 4 else 0
            b = prev[i]; c = prev[i-4] if i >= 4 else 0
            x = line[i]
            if ft == 1: x = (x + a) & 255
            elif ft == 2: x = (x + b) & 255
            elif ft == 3: x = (x + ((a + b) >> 1)) & 255
            elif ft == 4: x = (x + paeth(a, b, c)) & 255
            line[i] = x
        prev = line
        row = [(line[i], line[i+1], line[i+2], line[i+3]) for i in range(0, stride, 4)]
        out.append(row)
    return w, h, out

def sample(src, sw, sh, x, y):
    """bilinear sample source at float pixel (x,y); returns (r,g,b,a) floats."""
    if x < 0 or y < 0 or x > sw - 1 or y > sh - 1: return (0, 0, 0, 0)
    x0 = int(x); y0 = int(y); x1 = min(x0 + 1, sw - 1); y1 = min(y0 + 1, sh - 1)
    fx = x - x0; fy = y - y0
    p00 = src[y0][x0]; p10 = src[y0][x1]; p01 = src[y1][x0]; p11 = src[y1][x1]
    out = []
    for k in range(4):
        top = p00[k] * (1 - fx) + p10[k] * fx
        bot = p01[k] * (1 - fx) + p11[k] * fx
        out.append(top * (1 - fy) + bot * fy)
    return out

# ---------- PNG encode ----------
def write_png(path, rgba):
    h = len(rgba); w = len(rgba[0]); raw = bytearray()
    for row in rgba:
        raw.append(0)
        for px in row: raw += bytes(px)
    def chunk(t, dta): return struct.pack(">I", len(dta)) + t + dta + struct.pack(">I", zlib.crc32(t + dta) & 0xffffffff)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
        f.write(chunk(b"IEND", b""))

def lerp(a, b, t): return a + (b - a) * t
def lerp3(a, b, t): return tuple(lerp(a[i], b[i], t) for i in range(3))
def clamp(x, lo=0.0, hi=1.0): return lo if x < lo else hi if x > hi else x

# ---------- per-hero background palettes ----------
BG = {
    "fairy":        ((255, 243, 251), (198, 168, 236), (150, 110, 210)),
    "girl-dentist": ((236, 250, 252), (150, 205, 228), (70, 150, 190)),
    "boy-dentist":  ((234, 248, 252), (150, 200, 232), (70, 140, 195)),
    "girl-super":   ((255, 246, 228), (255, 176, 150), (225, 110, 120)),
    "boy-super":    ((233, 244, 255), (140, 175, 245), (70, 110, 205)),
}

def alpha_bbox(src, sw, sh, thr=16):
    minx, miny, maxx, maxy = sw, sh, -1, -1
    for y in range(sh):
        row = src[y]
        for x in range(sw):
            if row[x][3] > thr:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    return minx, miny, maxx, maxy

def render_master(hero, M):
    sw, sh, src = decode_png(f"hero-{hero}.png")
    top, bot, deep = BG[hero]
    # auto-crop to the character so every hero centers & sizes consistently.
    minx, miny, maxx, maxy = alpha_bbox(src, sw, sh)
    bw = maxx - minx + 1; bh = maxy - miny + 1
    # size to the maskable safe zone: cap both height and width.
    Hpx = 0.66 * M
    Wpx = Hpx * (bw / bh)
    if Wpx > 0.70 * M:
        Wpx = 0.70 * M; Hpx = Wpx * (bh / bw)
    cx = 0.5 * M
    top_y = 0.52 * M - Hpx / 2      # vertically centered (slightly low)
    left_x = cx - Wpx / 2
    rows = []
    for y in range(M):
        v = y / (M - 1)
        row = []
        for x in range(M):
            u = x / (M - 1)
            # background: vertical gradient + soft top radial highlight
            col = lerp3(top, bot, clamp(v * 1.05))
            g = math.exp(-(((u - 0.5) / 0.6) ** 2 + ((v - 0.2) / 0.5) ** 2))
            col = lerp3(col, (255, 255, 255), 0.35 * g)
            col = lerp3(col, deep, 0.18 * clamp((v - 0.55) / 0.6))
            # ground shadow ellipse under feet
            sh_e = math.exp(-((((u - 0.5) / 0.26) ** 2) + (((v - 0.86) / 0.055) ** 2)))
            col = lerp3(col, deep, 0.35 * sh_e)
            # character (with a soft drop shadow behind); map into cropped bbox
            sx = minx + (x - left_x) / Wpx * (bw - 1)
            sy = miny + (y - top_y) / Hpx * (bh - 1)
            # drop shadow: sample alpha slightly down-right offset
            osx = minx + (x - 0.012 * M - left_x) / Wpx * (bw - 1)
            osy = miny + (y - 0.014 * M - top_y) / Hpx * (bh - 1)
            sh_px = sample(src, sw, sh, osx, osy)
            if sh_px[3] > 0:
                col = lerp3(col, deep, 0.28 * (sh_px[3] / 255.0))
            px = sample(src, sw, sh, sx, sy)
            a = px[3] / 255.0
            if a > 0:
                col = lerp3(col, (px[0], px[1], px[2]), a)
            row.append(col)
        rows.append(row)
    return rows

def downsample(master, N):
    M = len(master); scale = M / N; out = []
    for j in range(N):
        y0 = int(j * scale); y1 = max(y0 + 1, int((j + 1) * scale))
        row = []
        for i in range(N):
            x0 = int(i * scale); x1 = max(x0 + 1, int((i + 1) * scale))
            r = gg = b = 0.0; n = 0
            for yy in range(y0, y1):
                mr = master[yy]
                for xx in range(x0, x1):
                    p = mr[xx]; r += p[0]; gg += p[1]; b += p[2]; n += 1
            row.append((r / n, gg / n, b / n))
        out.append(row)
    return out

def to_rgba(rows, radius_frac=0.0):
    N = len(rows); R = radius_frac * N; out = []
    for j in range(N):
        row = []
        for i in range(N):
            r, gg, b = rows[j][i]; a = 255.0
            if R > 0:
                cx = min(i + 0.5, N - (i + 0.5)); cy = min(j + 0.5, N - (j + 0.5))
                dx = max(R - cx, 0); dy = max(R - cy, 0)
                a = 255.0 * clamp(R - math.hypot(dx, dy) + 0.5)
            row.append((int(r + .5), int(gg + .5), int(b + .5), int(a + .5)))
        out.append(row)
    return out

# ---------- main ----------
heroes = sys.argv[1].split(",") if len(sys.argv) > 1 else list(BG)
out_dir = sys.argv[2] if len(sys.argv) > 2 else "icons"
M = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
os.makedirs(out_dir, exist_ok=True)
for hero in heroes:
    master = render_master(hero, M)
    write_png(f"{out_dir}/hero-{hero}-512.png",         to_rgba(downsample(master, 512), 0.22))
    write_png(f"{out_dir}/hero-{hero}-192.png",         to_rgba(downsample(master, 192), 0.22))
    write_png(f"{out_dir}/hero-{hero}-maskable-512.png",to_rgba(downsample(master, 512), 0.0))
    write_png(f"{out_dir}/hero-{hero}-apple-180.png",   to_rgba(downsample(master, 180), 0.0))
    write_png(f"{out_dir}/hero-{hero}-64.png",          to_rgba(downsample(master, 64), 0.22))
    print("wrote", hero)
print("done")
