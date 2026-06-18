# -*- coding: utf-8 -*-
"""
El Gran Viaje de Estela por el Espacio
=======================================
Generador de un ebook infantil ilustrado (PDF) sobre el Sistema Solar.

Todas las ilustraciones son vectoriales, dibujadas a mano con reportlab
(gradientes, esferas 3D, anillos, personajes). No usa imagenes externas.

Uso:
    python3 generar_ebook.py
Salida:
    El_Gran_Viaje_de_Estela.pdf
"""

import os
import math
import random

from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ---------------------------------------------------------------------------
# Configuracion general
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
OUTPUT = os.path.join(HERE, "El_Gran_Viaje_de_Estela.pdf")

# Pagina cuadrada tipo album infantil (10 x 10 pulgadas)
W = 720.0
H = 720.0
MARGIN = 54.0

# ---------------------------------------------------------------------------
# Fuentes (con alternativa por si falla la descarga)
# ---------------------------------------------------------------------------
def _register_fonts():
    title, body, body_bold = "Helvetica-Bold", "Helvetica", "Helvetica-Bold"
    try:
        pdfmetrics.registerFont(TTFont("Baloo", os.path.join(FONT_DIR, "Baloo2.ttf")))
        title = "Baloo"
    except Exception as exc:  # pragma: no cover
        print("Aviso: no se pudo cargar Baloo2:", exc)
    try:
        pdfmetrics.registerFont(TTFont("Comic", os.path.join(FONT_DIR, "ComicNeue-Regular.ttf")))
        pdfmetrics.registerFont(TTFont("ComicBd", os.path.join(FONT_DIR, "ComicNeue-Bold.ttf")))
        body, body_bold = "Comic", "ComicBd"
    except Exception as exc:  # pragma: no cover
        print("Aviso: no se pudo cargar Comic Neue:", exc)
    return title, body, body_bold


TITLE_FONT, BODY_FONT, BODY_BOLD = _register_fonts()

# ---------------------------------------------------------------------------
# Paleta de colores
# ---------------------------------------------------------------------------
SPACE_TOP = HexColor("#05060f")
SPACE_MID = HexColor("#141a3f")
SPACE_BOT = HexColor("#2a1b54")
PANEL = HexColor("#10132e")
INK = HexColor("#fdfdff")
CREAM = HexColor("#fff4d6")
GOLD = HexColor("#ffd35b")
PINK = HexColor("#ff8fb1")
AQUA = HexColor("#8be8ff")


def mix(c1, c2, t):
    """Interpola linealmente entre dos colores reportlab."""
    return Color(
        c1.red + (c2.red - c1.red) * t,
        c1.green + (c2.green - c1.green) * t,
        c1.blue + (c2.blue - c1.blue) * t,
    )


# ---------------------------------------------------------------------------
# Utilidades de dibujo de bajo nivel
# ---------------------------------------------------------------------------
def vertical_gradient(c, colors, positions=None, x=0, y=0, w=W, h=H):
    """Rellena un rectangulo con un gradiente vertical."""
    c.saveState()
    p = c.beginPath()
    p.rect(x, y, w, h)
    c.clipPath(p, stroke=0, fill=0)
    c.linearGradient(x, y + h, x, y, colors, positions, extend=True)
    c.restoreState()


def clip_circle(c, cx, cy, r):
    p = c.beginPath()
    p.circle(cx, cy, r)
    c.clipPath(p, stroke=0, fill=0)


def sphere(c, cx, cy, r, colors, positions=None, lx=-0.32, ly=0.34, edge=1.75):
    """Dibuja una esfera con aspecto 3D usando un gradiente radial.

    El punto de luz se situa en (lx, ly) en fracciones del radio.
    """
    c.saveState()
    clip_circle(c, cx, cy, r)
    c.radialGradient(cx + lx * r, cy + ly * r, r * edge, colors, positions, extend=True)
    c.restoreState()


def glow(c, cx, cy, r, color, layers=14, spread=2.2, max_alpha=0.40):
    """Halo suave alrededor de un cuerpo, de fuera (tenue) a dentro (intenso)."""
    c.saveState()
    for i in range(layers):
        frac = i / float(layers - 1)            # 0 (exterior) -> 1 (interior)
        rr = r * (spread - (spread - 1.0) * frac)
        c.setFillColor(color)
        c.setFillAlpha(max_alpha * frac * frac)
        c.circle(cx, cy, rr, stroke=0, fill=1)
    c.restoreState()


def sparkle(c, x, y, s, color=INK, alpha=1.0):
    """Estrella de 4 puntas (destello)."""
    c.saveState()
    c.setFillColor(color)
    c.setFillAlpha(alpha)
    p = c.beginPath()
    waist = s * 0.16
    p.moveTo(x, y + s)
    p.lineTo(x + waist, y + waist)
    p.lineTo(x + s, y)
    p.lineTo(x + waist, y - waist)
    p.lineTo(x, y - s)
    p.lineTo(x - waist, y - waist)
    p.lineTo(x - s, y)
    p.lineTo(x - waist, y + waist)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()


def star_5(c, cx, cy, r, color=GOLD, rot=90, alpha=1.0):
    """Estrella clasica de 5 puntas."""
    c.saveState()
    c.setFillColor(color)
    c.setFillAlpha(alpha)
    p = c.beginPath()
    for i in range(10):
        ang = math.radians(rot + i * 36)
        rad = r if i % 2 == 0 else r * 0.42
        px = cx + rad * math.cos(ang)
        py = cy + rad * math.sin(ang)
        if i == 0:
            p.moveTo(px, py)
        else:
            p.lineTo(px, py)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()


def starfield(c, rnd, count=90, x0=0, y0=0, x1=W, y1=H):
    """Dispersa estrellas pequenas con tamano y brillo variables."""
    c.saveState()
    for _ in range(count):
        x = rnd.uniform(x0, x1)
        y = rnd.uniform(y0, y1)
        s = rnd.random()
        if s > 0.93:
            sparkle(c, x, y, rnd.uniform(4, 8),
                    color=rnd.choice([INK, GOLD, AQUA]), alpha=rnd.uniform(0.7, 1))
        else:
            c.setFillColor(INK)
            c.setFillAlpha(rnd.uniform(0.25, 0.95))
            c.circle(x, y, rnd.uniform(0.6, 2.1), stroke=0, fill=1)
    c.restoreState()


# ---------------------------------------------------------------------------
# Texto
# ---------------------------------------------------------------------------
def wrap_text(text, font, size, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(trial, font, size) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def text_panel(c, title, body, x=MARGIN, y=46, w=W - 2 * MARGIN,
               title_size=27, body_size=15.5, accent=GOLD):
    """Panel redondeado semitransparente con titulo y parrafo."""
    pad = 22
    leading = body_size * 1.32
    inner_w = w - 2 * pad
    lines = []
    for para in body.split("\n"):
        lines.extend(wrap_text(para, BODY_FONT, body_size, inner_w) or [""])

    title_block = title_size + 14 if title else 0
    h = pad * 2 + title_block + len(lines) * leading

    # sombra y panel
    c.saveState()
    c.setFillColor(HexColor("#000000"))
    c.setFillAlpha(0.28)
    c.roundRect(x + 4, y - 4, w, h, 22, stroke=0, fill=1)
    c.setFillColor(PANEL)
    c.setFillAlpha(0.86)
    c.roundRect(x, y, w, h, 22, stroke=0, fill=1)
    # borde brillante
    c.setStrokeColor(accent)
    c.setStrokeAlpha(0.85)
    c.setLineWidth(2)
    c.roundRect(x, y, w, h, 22, stroke=1, fill=0)
    c.restoreState()

    cursor_y = y + h - pad
    if title:
        c.setFillColor(accent)
        c.setFont(TITLE_FONT, title_size)
        c.drawCentredString(x + w / 2, cursor_y - title_size + 4, title)
        cursor_y -= title_block
    c.setFillColor(INK)
    c.setFont(BODY_FONT, body_size)
    for ln in lines:
        c.drawCentredString(x + w / 2, cursor_y - body_size, ln)
        cursor_y -= leading
    return h


def page_number(c, n, color=None):
    c.saveState()
    c.setFillColor(color or HexColor("#9aa3d8"))
    c.setFont(BODY_FONT, 11)
    c.drawCentredString(W / 2, 22, str(n))
    c.restoreState()


print("Base del generador cargada. Fuentes:", TITLE_FONT, BODY_FONT, BODY_BOLD)



# ===========================================================================
# CUERPOS CELESTES
# ===========================================================================
def draw_sun(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#ff9d2f"), layers=18, spread=2.6, max_alpha=0.5)
    glow(c, cx, cy, r, HexColor("#ffe27a"), layers=10, spread=1.5, max_alpha=0.55)
    # rayos
    c.saveState()
    c.setFillColor(HexColor("#ffd24d"))
    c.setFillAlpha(0.55)
    for i in range(16):
        ang = math.radians(i * 22.5)
        p = c.beginPath()
        a = 0.10
        p.moveTo(cx + (r + 6) * math.cos(ang - a), cy + (r + 6) * math.sin(ang - a))
        p.lineTo(cx + (r + 46) * math.cos(ang), cy + (r + 46) * math.sin(ang))
        p.lineTo(cx + (r + 6) * math.cos(ang + a), cy + (r + 6) * math.sin(ang + a))
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    c.restoreState()
    sphere(c, cx, cy, r,
           [HexColor("#fff6c8"), HexColor("#ffd23d"), HexColor("#ff8a1e"), HexColor("#f26a12")],
           positions=[0, 0.45, 0.82, 1], lx=-0.2, ly=0.2)
    # manchas solares suaves
    c.saveState()
    clip_circle(c, cx, cy, r)
    rnd = random.Random(7)
    c.setFillColor(HexColor("#f2740f"))
    for _ in range(7):
        a = rnd.uniform(0, 2 * math.pi)
        d = rnd.uniform(0, r * 0.78)
        sx, sy = cx + d * math.cos(a), cy + d * math.sin(a)
        c.setFillAlpha(rnd.uniform(0.15, 0.30))
        c.circle(sx, sy, rnd.uniform(r * 0.06, r * 0.14), stroke=0, fill=1)
    c.restoreState()


def _craters(c, cx, cy, r, base, dark, n=11, seed=1):
    rnd = random.Random(seed)
    c.saveState()
    clip_circle(c, cx, cy, r)
    for _ in range(n):
        a = rnd.uniform(0, 2 * math.pi)
        d = rnd.uniform(0, r * 0.82)
        sx, sy = cx + d * math.cos(a), cy + d * math.sin(a)
        cr = rnd.uniform(r * 0.07, r * 0.18)
        c.setFillColor(dark)
        c.setFillAlpha(0.55)
        c.circle(sx, sy, cr, stroke=0, fill=1)
        c.setFillColor(base)
        c.setFillAlpha(0.5)
        c.circle(sx - cr * 0.18, sy + cr * 0.18, cr * 0.7, stroke=0, fill=1)
    c.restoreState()


def draw_mercury(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#c9b9a6"), layers=8, spread=1.4, max_alpha=0.25)
    sphere(c, cx, cy, r,
           [HexColor("#d9cab8"), HexColor("#9a8a78"), HexColor("#5f5347")],
           positions=[0, 0.55, 1])
    _craters(c, cx, cy, r, HexColor("#cdbda9"), HexColor("#5d5044"), n=14, seed=3)


def draw_venus(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#ffcf87"), layers=12, spread=1.7, max_alpha=0.40)
    sphere(c, cx, cy, r,
           [HexColor("#fff1c9"), HexColor("#f3c160"), HexColor("#c98a2a")],
           positions=[0, 0.5, 1])
    # bandas de nubes en remolino
    c.saveState()
    clip_circle(c, cx, cy, r)
    c.setStrokeColor(HexColor("#fff0c0"))
    for i in range(7):
        c.setStrokeAlpha(0.25)
        c.setLineWidth(r * 0.10)
        yy = cy - r + (i + 0.5) * (2 * r / 7)
        c.ellipse(cx - r * 1.2, yy - r * 0.16, cx + r * 1.2, yy + r * 0.16, stroke=1, fill=0)
    c.restoreState()


def draw_earth(c, cx, cy, r):
    glow(c, cx, cy, r, AQUA, layers=12, spread=1.7, max_alpha=0.45)
    # oceano
    sphere(c, cx, cy, r,
           [HexColor("#bfeaff"), HexColor("#3aa0e6"), HexColor("#143e8c")],
           positions=[0, 0.5, 1])
    c.saveState()
    clip_circle(c, cx, cy, r)
    # continentes (manchas verdes)
    rnd = random.Random(21)
    greens = [HexColor("#54b96b"), HexColor("#3f9a57"), HexColor("#73c97f")]
    for _ in range(9):
        gx = cx + rnd.uniform(-r * 0.8, r * 0.8)
        gy = cy + rnd.uniform(-r * 0.8, r * 0.8)
        c.setFillColor(rnd.choice(greens))
        c.setFillAlpha(0.95)
        p = c.beginPath()
        pts = rnd.randint(6, 9)
        rr = rnd.uniform(r * 0.18, r * 0.40)
        for k in range(pts):
            ang = 2 * math.pi * k / pts
            rad = rr * rnd.uniform(0.5, 1.1)
            px, py = gx + rad * math.cos(ang), gy + rad * math.sin(ang)
            p.moveTo(px, py) if k == 0 else p.lineTo(px, py)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    # casquetes polares
    c.setFillColor(INK)
    c.setFillAlpha(0.9)
    c.ellipse(cx - r * 0.6, cy + r * 0.74, cx + r * 0.6, cy + r * 1.02, stroke=0, fill=1)
    c.ellipse(cx - r * 0.55, cy - r * 1.02, cx + r * 0.55, cy - r * 0.78, stroke=0, fill=1)
    # nubes
    c.setFillColor(INK)
    for _ in range(7):
        gx = cx + rnd.uniform(-r * 0.8, r * 0.8)
        gy = cy + rnd.uniform(-r * 0.8, r * 0.8)
        c.setFillAlpha(rnd.uniform(0.30, 0.55))
        for k in range(4):
            c.circle(gx + k * r * 0.10, gy + rnd.uniform(-3, 3),
                     rnd.uniform(r * 0.07, r * 0.12), stroke=0, fill=1)
    c.restoreState()


def draw_moon(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#dfe3ee"), layers=8, spread=1.4, max_alpha=0.25)
    sphere(c, cx, cy, r,
           [HexColor("#f3f3f7"), HexColor("#c5c8d4"), HexColor("#888da0")],
           positions=[0, 0.55, 1])
    _craters(c, cx, cy, r, HexColor("#e4e6ee"), HexColor("#82869a"), n=15, seed=9)


def draw_mars(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#ff7b4d"), layers=10, spread=1.6, max_alpha=0.35)
    sphere(c, cx, cy, r,
           [HexColor("#ffb38a"), HexColor("#d2592f"), HexColor("#7d2a16")],
           positions=[0, 0.5, 1])
    _craters(c, cx, cy, r, HexColor("#e07a4c"), HexColor("#6e2614"), n=9, seed=4)
    # casquete polar
    c.saveState()
    clip_circle(c, cx, cy, r)
    c.setFillColor(INK)
    c.setFillAlpha(0.85)
    c.ellipse(cx - r * 0.5, cy + r * 0.76, cx + r * 0.5, cy + r * 1.04, stroke=0, fill=1)
    c.restoreState()


def draw_jupiter(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#e8b483"), layers=12, spread=1.7, max_alpha=0.40)
    sphere(c, cx, cy, r,
           [HexColor("#f6e2c4"), HexColor("#d9a972"), HexColor("#9a6638")],
           positions=[0, 0.5, 1])
    c.saveState()
    clip_circle(c, cx, cy, r)
    bands = ["#e9cfa6", "#caa066", "#e3c190", "#b07c44", "#ddb37e", "#a06b3a", "#e9cfa6"]
    n = len(bands)
    for i, col in enumerate(bands):
        yy = cy - r + (i + 0.5) * (2 * r / n)
        c.setFillColor(HexColor(col))
        c.setFillAlpha(0.85)
        bh = r / n * 1.18
        c.ellipse(cx - r * 1.1, yy - bh, cx + r * 1.1, yy + bh, stroke=0, fill=1)
    # Gran Mancha Roja
    c.setFillColor(HexColor("#c0432a"))
    c.setFillAlpha(0.92)
    c.ellipse(cx + r * 0.12, cy - r * 0.34, cx + r * 0.62, cy - r * 0.04, stroke=0, fill=1)
    c.setFillColor(HexColor("#e57a52"))
    c.setFillAlpha(0.7)
    c.ellipse(cx + r * 0.20, cy - r * 0.29, cx + r * 0.54, cy - r * 0.09, stroke=0, fill=1)
    c.restoreState()


def _ring_band(c, cx, cy, rx, ry, which):
    """Dibuja los anillos (which='back' arco trasero / 'front' arco delantero)."""
    c.saveState()
    p = c.beginPath()
    if which == "back":
        p.rect(0, cy, W, H - cy)        # mitad superior
    else:
        p.rect(0, 0, W, cy)             # mitad inferior
    c.clipPath(p, stroke=0, fill=0)
    rings = [
        (1.00, 0.62, "#e9dcc0", 0.95, 7),
        (0.86, 0.53, "#cdb583", 0.95, 9),
        (0.74, 0.46, "#f1e6cb", 0.9, 5),
        (0.66, 0.41, "#b9a06d", 0.8, 4),
    ]
    for fx, fy, col, alpha, lw in rings:
        c.setStrokeColor(HexColor(col))
        c.setStrokeAlpha(alpha)
        c.setLineWidth(lw)
        c.ellipse(cx - rx * fx, cy - ry * fy, cx + rx * fx, cy + ry * fy, stroke=1, fill=0)
    c.restoreState()


def draw_saturn(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#f4dca0"), layers=10, spread=1.5, max_alpha=0.32)
    rx, ry = r * 2.05, r * 2.05
    _ring_band(c, cx, cy, rx, ry, "back")
    sphere(c, cx, cy, r,
           [HexColor("#fbeec4"), HexColor("#e7c87f"), HexColor("#a9803f")],
           positions=[0, 0.5, 1])
    c.saveState()
    clip_circle(c, cx, cy, r)
    for i, col in enumerate(["#f3e2b4", "#dcb877", "#efdca6", "#c79a55"]):
        yy = cy - r + (i + 0.5) * (2 * r / 4)
        c.setFillColor(HexColor(col))
        c.setFillAlpha(0.6)
        c.ellipse(cx - r * 1.1, yy - r * 0.22, cx + r * 1.1, yy + r * 0.22, stroke=0, fill=1)
    c.restoreState()
    _ring_band(c, cx, cy, rx, ry, "front")


def draw_uranus(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#a8f0ec"), layers=10, spread=1.6, max_alpha=0.38)
    sphere(c, cx, cy, r,
           [HexColor("#d7fbf6"), HexColor("#86d9d6"), HexColor("#3f8f9c")],
           positions=[0, 0.5, 1])
    # anillos verticales tenues (Urano gira de lado)
    c.saveState()
    c.setStrokeColor(HexColor("#cdeef0"))
    for fx in (1.55, 1.4, 1.25):
        c.setStrokeAlpha(0.35)
        c.setLineWidth(2.2)
        c.ellipse(cx - r * 0.42 * fx / 1.55, cy - r * fx, cx + r * 0.42 * fx / 1.55, cy + r * fx,
                  stroke=1, fill=0)
    c.restoreState()


def draw_neptune(c, cx, cy, r):
    glow(c, cx, cy, r, HexColor("#5f8bff"), layers=12, spread=1.7, max_alpha=0.42)
    sphere(c, cx, cy, r,
           [HexColor("#bcd3ff"), HexColor("#3a63d6"), HexColor("#1b2c84")],
           positions=[0, 0.5, 1])
    c.saveState()
    clip_circle(c, cx, cy, r)
    # gran mancha oscura
    c.setFillColor(HexColor("#1a2a72"))
    c.setFillAlpha(0.8)
    c.ellipse(cx - r * 0.5, cy + r * 0.05, cx - r * 0.08, cy + r * 0.4, stroke=0, fill=1)
    # rachas de nubes blancas
    c.setStrokeColor(INK)
    for yy in (cy + r * 0.45, cy - r * 0.3):
        c.setStrokeAlpha(0.4)
        c.setLineWidth(r * 0.05)
        c.ellipse(cx - r * 1.05, yy - r * 0.05, cx + r * 1.05, yy + r * 0.05, stroke=1, fill=0)
    c.restoreState()



# ===========================================================================
# PERSONAJES Y ELEMENTOS
# ===========================================================================
def draw_astronaut(c, cx, cy, s=1.0, face_color=HexColor("#f6c8a0")):
    """Estela, la pequena astronauta. (cx,cy) = centro del casco."""
    c.saveState()
    c.translate(cx, cy)
    c.scale(s, s)

    # --- cuerpo / traje (debajo del casco) ---
    c.setFillColor(HexColor("#eef1f7"))
    c.setStrokeColor(HexColor("#c2c8d8"))
    c.setLineWidth(2)
    # mochila
    c.setFillColor(HexColor("#d7dce8"))
    c.roundRect(-34, -150, 68, 90, 14, stroke=1, fill=1)
    # torso
    c.setFillColor(HexColor("#f3f5fb"))
    c.roundRect(-44, -150, 88, 96, 22, stroke=1, fill=1)
    # brazos
    for sgn in (-1, 1):
        c.setFillColor(HexColor("#eef1f7"))
        c.roundRect(sgn * 44 - (28 if sgn < 0 else 0), -132, 28, 70, 14, stroke=1, fill=1)
        # guante
        c.setFillColor(PINK)
        c.circle(sgn * 58, -130, 13, stroke=1, fill=1)
    # piernas / botas
    for sgn in (-1, 1):
        c.setFillColor(HexColor("#eef1f7"))
        c.roundRect(sgn * 26 - 16, -206, 32, 64, 12, stroke=1, fill=1)
        c.setFillColor(PINK)
        c.roundRect(sgn * 26 - 18, -214, 38, 22, 10, stroke=1, fill=1)
    # panel de control en el pecho
    c.setFillColor(HexColor("#39406a"))
    c.roundRect(-22, -120, 44, 30, 7, stroke=0, fill=1)
    for i, col in enumerate(["#ff6b6b", "#ffd35b", "#7ef0a0"]):
        c.setFillColor(HexColor(col))
        c.circle(-12 + i * 12, -105, 4.2, stroke=0, fill=1)

    # --- casco ---
    c.setFillColor(HexColor("#f3f5fb"))
    c.setStrokeColor(HexColor("#c2c8d8"))
    c.setLineWidth(3)
    c.circle(0, 0, 58, stroke=1, fill=1)
    # visor
    c.setFillColor(HexColor("#2a3566"))
    c.circle(0, 2, 44, stroke=0, fill=1)
    # cara dentro del visor
    c.setFillColor(face_color)
    c.circle(0, -2, 30, stroke=0, fill=1)
    # flequillo
    c.setFillColor(HexColor("#6a3d22"))
    p = c.beginPath()
    p.moveTo(-30, 6)
    p.curveTo(-26, 34, 26, 34, 30, 6)
    p.curveTo(16, 20, -16, 20, -30, 6)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    # ojos
    c.setFillColor(HexColor("#2a2a3a"))
    c.circle(-11, -2, 4.6, stroke=0, fill=1)
    c.circle(11, -2, 4.6, stroke=0, fill=1)
    c.setFillColor(INK)
    c.circle(-9.4, -0.4, 1.7, stroke=0, fill=1)
    c.circle(12.6, -0.4, 1.7, stroke=0, fill=1)
    # mejillas y sonrisa
    c.setFillColor(PINK)
    c.setFillAlpha(0.6)
    c.circle(-17, -12, 5, stroke=0, fill=1)
    c.circle(17, -12, 5, stroke=0, fill=1)
    c.setFillAlpha(1)
    c.setStrokeColor(HexColor("#9a3b3b"))
    c.setLineWidth(2.4)
    p = c.beginPath()
    p.moveTo(-10, -16)
    p.curveTo(-4, -22, 4, -22, 10, -16)
    c.drawPath(p, fill=0, stroke=1)
    # reflejo del visor
    c.setFillColor(INK)
    c.setFillAlpha(0.18)
    c.ellipse(-40, 6, -14, 40, stroke=0, fill=1)
    c.setFillAlpha(1)
    # antena
    c.setStrokeColor(HexColor("#c2c8d8"))
    c.setLineWidth(3)
    c.line(40, 40, 52, 60)
    c.setFillColor(GOLD)
    c.circle(53, 62, 5, stroke=0, fill=1)
    c.restoreState()


def draw_rocket(c, cx, cy, s=1.0):
    """Cohete con Estela mirando por la ventanilla."""
    c.saveState()
    c.translate(cx, cy)
    c.scale(s, s)
    # llamas
    for col, w, h in [("#ff8a1e", 34, 90), ("#ffd23d", 22, 64), ("#fff1b8", 11, 40)]:
        c.setFillColor(HexColor(col))
        p = c.beginPath()
        p.moveTo(-w, -70)
        p.curveTo(-w * 0.4, -70 - h, w * 0.4, -70 - h, w, -70)
        p.curveTo(w * 0.5, -56, -w * 0.5, -56, -w, -70)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    # aletas
    c.setFillColor(HexColor("#e8506b"))
    for sgn in (-1, 1):
        p = c.beginPath()
        p.moveTo(sgn * 34, -36)
        p.lineTo(sgn * 74, -78)
        p.lineTo(sgn * 34, -8)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    # cuerpo
    c.setFillColor(HexColor("#f3f5fb"))
    c.setStrokeColor(HexColor("#cdd3e2"))
    c.setLineWidth(2)
    p = c.beginPath()
    p.moveTo(-38, -70)
    p.lineTo(-38, 40)
    p.curveTo(-38, 110, 38, 110, 38, 40)
    p.lineTo(38, -70)
    p.curveTo(14, -86, -14, -86, -38, -70)
    c.drawPath(p, fill=1, stroke=1)
    # punta
    c.setFillColor(HexColor("#e8506b"))
    p = c.beginPath()
    p.moveTo(-38, 40)
    p.curveTo(-38, 124, 38, 124, 38, 40)
    p.curveTo(10, 60, -10, 60, -38, 40)
    c.drawPath(p, fill=1, stroke=0)
    # franja
    c.setFillColor(HexColor("#8be8ff"))
    c.rect(-38, -16, 76, 14, stroke=0, fill=1)
    # ventanilla
    c.setFillColor(HexColor("#2a3566"))
    c.circle(0, 24, 26, stroke=0, fill=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(4)
    c.circle(0, 24, 26, stroke=1, fill=0)
    # carita en la ventanilla
    c.setFillColor(HexColor("#f6c8a0"))
    c.circle(0, 20, 16, stroke=0, fill=1)
    c.setFillColor(HexColor("#6a3d22"))
    p = c.beginPath()
    p.moveTo(-16, 24)
    p.curveTo(-14, 40, 14, 40, 16, 24)
    p.curveTo(8, 32, -8, 32, -16, 24)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(HexColor("#2a2a3a"))
    c.circle(-6, 20, 2.6, stroke=0, fill=1)
    c.circle(6, 20, 2.6, stroke=0, fill=1)
    c.setStrokeColor(HexColor("#9a3b3b"))
    c.setLineWidth(1.8)
    p = c.beginPath()
    p.moveTo(-5, 13)
    p.curveTo(-2, 10, 2, 10, 5, 13)
    c.drawPath(p, fill=0, stroke=1)
    c.restoreState()


def draw_robot(c, cx, cy, s=1.0):
    """Cometa, el robot ayudante flotante."""
    c.saveState()
    c.translate(cx, cy)
    c.scale(s, s)
    # antena
    c.setStrokeColor(HexColor("#9fb0d8"))
    c.setLineWidth(3)
    c.line(0, 34, 0, 52)
    c.setFillColor(PINK)
    c.circle(0, 56, 6, stroke=0, fill=1)
    # cuerpo
    c.setFillColor(HexColor("#cfd8ee"))
    c.setStrokeColor(HexColor("#9fb0d8"))
    c.setLineWidth(2)
    c.roundRect(-36, -40, 72, 76, 22, stroke=1, fill=1)
    # pantalla / cara
    c.setFillColor(HexColor("#1f2747"))
    c.roundRect(-28, -22, 56, 48, 14, stroke=0, fill=1)
    c.setFillColor(AQUA)
    c.circle(-11, 6, 7, stroke=0, fill=1)
    c.circle(11, 6, 7, stroke=0, fill=1)
    c.setFillColor(INK)
    c.circle(-9, 8, 2.4, stroke=0, fill=1)
    c.circle(13, 8, 2.4, stroke=0, fill=1)
    c.setStrokeColor(AQUA)
    c.setLineWidth(2.4)
    p = c.beginPath()
    p.moveTo(-9, -8)
    p.curveTo(-3, -13, 3, -13, 9, -8)
    c.drawPath(p, fill=0, stroke=1)
    # bracitos
    c.setStrokeColor(HexColor("#9fb0d8"))
    c.setLineWidth(4)
    c.line(-36, 0, -52, 12)
    c.line(36, 0, 52, 12)
    c.setFillColor(PINK)
    c.circle(-54, 13, 5, stroke=0, fill=1)
    c.circle(54, 13, 5, stroke=0, fill=1)
    c.restoreState()


def draw_comet(c, cx, cy, s=1.0):
    c.saveState()
    # cola
    for col, w, alpha in [("#8be8ff", 230, 0.30), ("#bff3ff", 150, 0.45), ("#ffffff", 80, 0.7)]:
        c.setFillColor(HexColor(col))
        c.setFillAlpha(alpha)
        p = c.beginPath()
        p.moveTo(cx, cy - w * 0.12 * s)
        p.lineTo(cx - w * s, cy + w * 0.5 * s)
        p.lineTo(cx, cy + w * 0.12 * s)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    c.setFillAlpha(1)
    glow(c, cx, cy, 26 * s, HexColor("#bdf0ff"), layers=10, spread=1.8, max_alpha=0.5)
    sphere(c, cx, cy, 24 * s,
           [HexColor("#ffffff"), HexColor("#bfe8f5"), HexColor("#7fb4c9")], positions=[0, 0.5, 1])
    c.restoreState()


def draw_asteroid_belt(c, cx, cy, rnd):
    """Banda diagonal de rocas espaciales."""
    c.saveState()
    for _ in range(46):
        t = rnd.uniform(0, 1)
        x = cx - 250 + t * 500 + rnd.uniform(-26, 26)
        y = cy + 150 - t * 300 + rnd.uniform(-26, 26)
        rr = rnd.uniform(5, 22)
        col = rnd.choice(["#8a8172", "#a59a86", "#6f675a", "#bcae98"])
        sphere(c, x, y, rr, [HexColor("#d7cdb8"), HexColor(col), HexColor("#4f4a40")],
               positions=[0, 0.55, 1])
    c.restoreState()


def draw_galaxy(c, cx, cy, rnd):
    """Espiral de la Via Lactea."""
    c.saveState()
    glow(c, cx, cy, 70, HexColor("#cdbcff"), layers=14, spread=2.4, max_alpha=0.4)
    for arm in range(2):
        base = arm * math.pi
        for i in range(160):
            t = i / 160.0
            ang = base + t * 3.4 * math.pi
            rad = 18 + t * 200
            x = cx + rad * math.cos(ang)
            y = cy + rad * math.sin(ang) * 0.62
            col = rnd.choice(["#ffffff", "#bcd0ff", "#e8c8ff", "#9fb6ff", "#fff0c0"])
            c.setFillColor(HexColor(col))
            c.setFillAlpha(max(0.12, 1 - t))
            c.circle(x, y, rnd.uniform(0.8, 3.0) * (1 - t * 0.6), stroke=0, fill=1)
    # nucleo
    sphere(c, cx, cy, 30, [HexColor("#fff6d8"), HexColor("#ffd98a"), HexColor("#d99a3a")],
           positions=[0, 0.5, 1])
    c.setFillAlpha(1)
    c.restoreState()


def draw_constellation(c, cx, cy, points, color=GOLD):
    c.saveState()
    c.setStrokeColor(color)
    c.setStrokeAlpha(0.7)
    c.setLineWidth(2)
    for i in range(len(points) - 1):
        c.line(cx + points[i][0], cy + points[i][1],
               cx + points[i + 1][0], cy + points[i + 1][1])
    for px, py in points:
        star_5(c, cx + px, cy + py, 11, color=CREAM)
        glow(c, cx + px, cy + py, 7, GOLD, layers=6, spread=1.8, max_alpha=0.5)
    c.restoreState()



# ===========================================================================
# CONSTRUCCION DE PAGINAS
# ===========================================================================
def bg(c, rnd, stars=95):
    vertical_gradient(c, [SPACE_TOP, SPACE_MID, SPACE_BOT], positions=[0, 0.55, 1])
    starfield(c, rnd, count=stars)


def small_star_bullet(c, x, y):
    star_5(c, x, y, 7, color=GOLD)


def planet_page(c, n, title, body, draw_fn, r=122, accent=GOLD,
                cy=438, with_rocket=True):
    rnd = random.Random(n * 17 + 3)
    bg(c, rnd)
    draw_fn(c, W / 2, cy, r)
    if with_rocket:
        draw_rocket(c, W - 96, 596, 0.46)
    text_panel(c, title, body, accent=accent)
    page_number(c, n)
    c.showPage()


# --- Pagina 1: Portada -----------------------------------------------------
def page_cover(c):
    rnd = random.Random(1)
    bg(c, rnd, stars=120)
    # planetas decorativos
    draw_saturn(c, 120, 150, 40)
    draw_earth(c, 612, 168, 34)
    draw_mars(c, 96, 600, 26)
    # destellos grandes
    sparkle(c, 600, 470, 14, color=GOLD)
    sparkle(c, 180, 360, 10, color=AQUA)
    # cohete protagonista
    c.saveState()
    c.translate(W / 2 + 8, 360)
    c.rotate(-18)
    draw_rocket(c, 0, 0, 1.15)
    c.restoreState()
    draw_robot(c, 196, 300, 0.7)

    # titulo
    c.setFillColor(GOLD)
    c.setFont(TITLE_FONT, 50)
    c.drawCentredString(W / 2, 636, "EL GRAN VIAJE")
    c.setFillColor(INK)
    c.setFont(TITLE_FONT, 33)
    c.drawCentredString(W / 2, 596, "de Estela")
    # cinta del subtitulo
    c.setFillColor(PINK)
    c.roundRect(W / 2 - 150, 540, 300, 40, 20, stroke=0, fill=1)
    c.setFillColor(HexColor("#3a1430"))
    c.setFont(TITLE_FONT, 21)
    c.drawCentredString(W / 2, 550, "por el Espacio")
    # pie
    c.setFillColor(HexColor("#cdd3ee"))
    c.setFont(BODY_FONT, 15)
    c.drawCentredString(W / 2, 86, "Un viaje por el Sistema Solar para pequeños exploradores")
    c.showPage()


# --- Pagina 2: Conoce a Estela --------------------------------------------
def page_meet(c):
    rnd = random.Random(2)
    bg(c, rnd)
    draw_astronaut(c, W / 2 - 70, 470, 1.05)
    draw_robot(c, W / 2 + 150, 430, 0.95)
    sparkle(c, 150, 600, 12, color=GOLD)
    sparkle(c, 590, 560, 9, color=AQUA)
    text_panel(
        c,
        "Conoce a Estela",
        "Estela es una niña muy curiosa a la que le encanta mirar las "
        "estrellas desde su ventana.\n"
        "Esta noche, con su robot Cometa, construye un cohete brillante "
        "para visitar todos los planetas.\n"
        "¡Cuenta conmigo: 3... 2... 1... DESPEGAMOS!",
        accent=PINK,
    )
    page_number(c, 2)
    c.showPage()


# --- Pagina 17: Datos curiosos --------------------------------------------
def page_facts(c):
    rnd = random.Random(17)
    bg(c, rnd)
    draw_robot(c, W / 2, 590, 0.9)
    c.setFillColor(GOLD)
    c.setFont(TITLE_FONT, 34)
    c.drawCentredString(W / 2, 500, "¿Sabías que...?")

    facts = [
        "Un día en Venus dura más que un año entero en Venus.",
        "En Júpiter cabrían más de mil planetas Tierra.",
        "Saturno es tan ligero que flotaría en una bañera gigante.",
        "El Sol es tan grande que dentro cabrían un millón de Tierras.",
        "En Marte el cielo se vuelve rosado al atardecer.",
        "Neptuno tiene los vientos más veloces de todo el Sistema Solar.",
    ]
    # panel
    x, y, w = MARGIN, 70, W - 2 * MARGIN
    h = 390
    c.saveState()
    c.setFillColor(PANEL); c.setFillAlpha(0.86)
    c.roundRect(x, y, w, h, 22, stroke=0, fill=1)
    c.setStrokeColor(AQUA); c.setStrokeAlpha(0.85); c.setLineWidth(2)
    c.roundRect(x, y, w, h, 22, stroke=1, fill=0)
    c.restoreState()
    cy = y + h - 34
    for f in facts:
        small_star_bullet(c, x + 34, cy + 4)
        c.setFillColor(INK)
        c.setFont(BODY_FONT, 16)
        for k, ln in enumerate(wrap_text(f, BODY_FONT, 16, w - 80)):
            c.drawString(x + 54, cy - k * 21, ln)
            if k:
                cy -= 21
        cy -= 58
    page_number(c, 17)
    c.showPage()


# --- Pagina 19: Juega y aprende -------------------------------------------
def page_quiz(c):
    rnd = random.Random(19)
    bg(c, rnd)
    draw_astronaut(c, W - 130, 250, 0.5)
    c.setFillColor(GOLD)
    c.setFont(TITLE_FONT, 34)
    c.drawCentredString(W / 2, 632, "Juega y aprende")
    c.setFillColor(HexColor("#cdd3ee"))
    c.setFont(BODY_FONT, 15)
    c.drawCentredString(W / 2, 600, "¿Cuánto recuerdas de nuestro viaje?")

    questions = [
        "1. ¿Cuál es el planeta rojo?",
        "2. ¿Qué planeta tiene anillos brillantes?",
        "3. ¿Cómo se llama nuestra estrella?",
        "4. ¿En qué planeta vivimos nosotros?",
        "5. ¿Cuál es el planeta más grande de todos?",
    ]
    x, y, w = MARGIN, 150, W - 2 * MARGIN
    h = 408
    c.saveState()
    c.setFillColor(PANEL); c.setFillAlpha(0.86)
    c.roundRect(x, y, w, h, 22, stroke=0, fill=1)
    c.setStrokeColor(GOLD); c.setStrokeAlpha(0.85); c.setLineWidth(2)
    c.roundRect(x, y, w, h, 22, stroke=1, fill=0)
    c.restoreState()
    cy = y + h - 44
    for q in questions:
        small_star_bullet(c, x + 34, cy + 4)
        c.setFillColor(INK)
        c.setFont(BODY_BOLD, 17)
        c.drawString(x + 54, cy, q)
        cy -= 64
    # respuestas
    c.setFillColor(HexColor("#9aa3d8"))
    c.setFont(BODY_FONT, 12)
    c.drawCentredString(W / 2, y + 18,
                        "Respuestas: Marte - Saturno - el Sol - la Tierra - Júpiter")
    page_number(c, 19)
    c.showPage()


# --- Pagina 20: Contraportada ---------------------------------------------
def page_back(c):
    rnd = random.Random(20)
    bg(c, rnd, stars=120)
    draw_galaxy(c, W / 2, 470, random.Random(99))
    draw_astronaut(c, W / 2, 250, 0.62)
    c.setFillColor(GOLD)
    c.setFont(TITLE_FONT, 34)
    c.drawCentredString(W / 2, 156, "Sigue explorando")
    text_panel(
        c,
        "",
        "El universo es enorme y está lleno de maravillas por descubrir. "
        "Cada estrella del cielo guarda una historia.\n"
        "Gracias por viajar con Estela y Cometa. ¡Hasta la próxima aventura!",
        y=46, accent=AQUA,
    )
    page_number(c, 20)
    c.showPage()


# ===========================================================================
# CONTENIDO DE LOS PLANETAS
# ===========================================================================
PLANET_PAGES = [
    (3, "El Sol, nuestra estrella", draw_sun, GOLD, 118,
     "El Sol es una estrella gigante de gas ardiente. Nos regala luz y "
     "calor para que en la Tierra haya vida.\n"
     "Es tan brillante que nunca debemos mirarlo directamente. ¡Su luz "
     "tarda 8 minutos en llegar hasta nosotros!"),
    (4, "Mercurio, el más veloz", draw_mercury, HexColor("#d9c4a8"), 96,
     "Mercurio es el planeta más pequeño y el más cercano al Sol. "
     "Corre tan rápido que da una vuelta al Sol en solo 88 días.\n"
     "Su superficie está llena de cráteres, como la Luna."),
    (5, "Venus, la estrella del alba", draw_venus, HexColor("#ffcf87"), 116,
     "Venus es casi del tamaño de la Tierra, pero es el planeta más "
     "caliente de todos por sus espesas nubes.\n"
     "Brilla tanto que a veces lo vemos como una estrella al amanecer."),
    (6, "La Tierra, nuestro hogar", draw_earth, AQUA, 122,
     "La Tierra es el único planeta donde sabemos que hay vida. Tiene "
     "agua, aire y mil colores.\n"
     "Es nuestra casa en el espacio: por eso debemos cuidarla mucho."),
    (7, "La Luna, amiga de la Tierra", draw_moon, HexColor("#dfe3ee"), 110,
     "La Luna gira alrededor de la Tierra y nos acompaña cada noche. "
     "No tiene aire, por eso las huellas de los astronautas siguen allí.\n"
     "Ella mueve el mar y crea las mareas."),
    (8, "Marte, el planeta rojo", draw_mars, HexColor("#ff8a5c"), 116,
     "Marte es rojo porque su tierra tiene polvo de hierro oxidado. "
     "Allí está el volcán más alto de todo el Sistema Solar.\n"
     "Pequeños robots lo exploran buscando señales de agua."),
    (10, "Júpiter, el gigante", draw_jupiter, HexColor("#e8b483"), 128,
     "Júpiter es el planeta más grande de todos: es una bola enorme de "
     "gas con muchas lunas a su alrededor.\n"
     "Su Gran Mancha Roja es una tormenta más grande que la Tierra."),
    (11, "Saturno y sus anillos", draw_saturn, HexColor("#f4dca0"), 96,
     "Saturno es famoso por sus preciosos anillos hechos de hielo y "
     "rocas que giran a su alrededor.\n"
     "Es tan ligero que, si hubiera una bañera gigante, ¡flotaría!"),
    (12, "Urano, el planeta tumbado", draw_uranus, HexColor("#a8f0ec"), 116,
     "Urano gira de lado, como si rodara por el espacio. Su color verde "
     "azulado viene de un gas llamado metano.\n"
     "Es un mundo helado y muy, muy frío."),
    (13, "Neptuno, el más lejano", draw_neptune, HexColor("#7fa0ff"), 116,
     "Neptuno es el planeta más lejano del Sol y tiene un color azul "
     "intenso.\n"
     "Sopla los vientos más veloces del Sistema Solar y tarda 165 años "
     "en dar una vuelta al Sol."),
]


def page_asteroids(c):
    rnd = random.Random(9)
    bg(c, rnd)
    draw_asteroid_belt(c, W / 2, 430, random.Random(900))
    draw_rocket(c, W / 2, 470, 0.6)
    text_panel(
        c, "El cinturón de asteroides",
        "Entre Marte y Júpiter flotan millones de rocas espaciales: es el "
        "cinturón de asteroides.\n"
        "Son trocitos que sobraron cuando se formaron los planetas. ¡Estela "
        "tiene que esquivarlos con cuidado!",
        accent=HexColor("#cbbfa6"),
    )
    page_number(c, 9)
    c.showPage()


def page_comet(c):
    rnd = random.Random(14)
    bg(c, rnd)
    draw_comet(c, 470, 470, 1.0)
    draw_rocket(c, 150, 300, 0.55)
    text_panel(
        c, "Cometas, viajeros con cola",
        "Los cometas son bolas de hielo y polvo que viajan por el espacio. "
        "Cuando se acercan al Sol, ¡les crece una cola brillante!\n"
        "La cola siempre apunta en sentido contrario al Sol.",
        accent=AQUA,
    )
    page_number(c, 14)
    c.showPage()


def page_stars(c):
    rnd = random.Random(15)
    bg(c, rnd, stars=140)
    # Osa Mayor estilizada
    draw_constellation(c, 250, 470,
                       [(-150, 40), (-90, 60), (-30, 50), (20, 30),
                        (70, 70), (120, 40), (60, -10)])
    draw_robot(c, 560, 360, 0.6)
    text_panel(
        c, "Estrellas y constelaciones",
        "Las estrellas son soles muy lejanos. Hace mucho, las personas "
        "unieron sus puntos formando dibujos: las constelaciones.\n"
        "La Estrella Polar siempre señala el norte y guía a los viajeros.",
        accent=GOLD,
    )
    page_number(c, 15)
    c.showPage()


def page_galaxy(c):
    rnd = random.Random(16)
    bg(c, rnd, stars=80)
    draw_galaxy(c, W / 2, 450, random.Random(160))
    draw_rocket(c, 150, 250, 0.5)
    text_panel(
        c, "La Vía Láctea",
        "Todas nuestras estrellas viven juntas en una gran familia llamada "
        "galaxia: la Vía Láctea.\n"
        "Tiene miles de millones de estrellas y, desde la Tierra, se ve "
        "como un río de luz en el cielo.",
        accent=HexColor("#cdbcff"),
    )
    page_number(c, 16)
    c.showPage()


def page_home(c):
    rnd = random.Random(18)
    bg(c, rnd)
    draw_earth(c, W / 2, 470, 120)
    c.saveState()
    c.translate(W / 2 + 150, 380)
    c.rotate(150)
    draw_rocket(c, 0, 0, 0.55)
    c.restoreState()
    text_panel(
        c, "De regreso a casa",
        "Después de tan largo viaje, Estela y Cometa vuelven a la Tierra, "
        "la pelota azul más bonita del espacio.\n"
        "Cansada y feliz, Estela cierra los ojos soñando con su próxima "
        "aventura entre las estrellas.",
        accent=AQUA,
    )
    page_number(c, 18)
    c.showPage()


# ===========================================================================
# MAIN
# ===========================================================================
def build():
    c = canvas.Canvas(OUTPUT, pagesize=(W, H))
    c.setTitle("El Gran Viaje de Estela por el Espacio")
    c.setAuthor("Creado para SantiMarketer")
    c.setSubject("Ebook infantil sobre el Sistema Solar")

    page_cover(c)                 # 1
    page_meet(c)                  # 2

    by_num = {}
    for num, title, fn, accent, r, body in PLANET_PAGES:
        by_num[num] = (title, fn, accent, r, body)

    # 3..8 planetas
    for n in (3, 4, 5, 6, 7, 8):
        title, fn, accent, r, body = by_num[n]
        planet_page(c, n, title, body, fn, r=r, accent=accent)

    page_asteroids(c)             # 9

    for n in (10, 11, 12, 13):
        title, fn, accent, r, body = by_num[n]
        planet_page(c, n, title, body, fn, r=r, accent=accent)

    page_comet(c)                 # 14
    page_stars(c)                 # 15
    page_galaxy(c)                # 16
    page_facts(c)                 # 17
    page_home(c)                  # 18
    page_quiz(c)                  # 19
    page_back(c)                  # 20

    c.save()
    print("PDF generado:", OUTPUT)


if __name__ == "__main__":
    build()
