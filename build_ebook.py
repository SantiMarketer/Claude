#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de un ebook infantil ilustrado en PDF, escrito en Python puro
(solo biblioteca estandar). Dibuja ilustraciones vectoriales (planetas con
sombreado 3D, sol, cohete, astronauta, cometa, estrellas), degradados
(sombreados axiales y radiales) y transparencias, y maqueta el texto con
fuentes estandar y medicion de anchos (metricas AFM) para un wrapping y
centrado correctos.

Tema: "Aventura por el Espacio" - un viaje por el Sistema Solar.
"""

import math
import zlib

# --------------------------------------------------------------------------
# Tamano de pagina (A4 vertical, en puntos PostScript: 1 pt = 1/72 pulgada)
# --------------------------------------------------------------------------
W, H = 595.276, 841.89

# --------------------------------------------------------------------------
# Metricas de fuentes (ancho de cada caracter por 1000 unidades de em)
# Solo usamos Helvetica y Helvetica-Bold para que el calculo sea exacto.
# --------------------------------------------------------------------------
_HELV = {
    32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
    40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
    48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
    56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
    64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
    72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
    80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
    88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
    96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278,
    103: 556, 104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833,
    110: 556, 111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278,
    117: 556, 118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334,
    124: 260, 125: 334, 126: 584,
}
_HELVB = {
    32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238,
    40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
    48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
    56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611,
    64: 975, 65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
    72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778,
    80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
    88: 667, 89: 667, 90: 611, 91: 333, 92: 278, 93: 333, 94: 584, 95: 556,
    96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333,
    103: 611, 104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889,
    110: 611, 111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333,
    117: 611, 118: 556, 119: 778, 120: 556, 121: 556, 122: 500, 123: 389,
    124: 280, 125: 389, 126: 584,
}
# Acentos y signos en espanol: usan el ancho de su letra base.
def _add_accents(tbl):
    base = {
        225: 97, 233: 101, 237: 105, 243: 111, 250: 117, 241: 110, 252: 117,
        193: 65, 201: 69, 205: 73, 211: 79, 218: 85, 209: 78, 220: 85,
        191: 63, 161: 33, 171: 556, 187: 556, 8212: 1000, 8211: 556,
        8216: 39, 8217: 39, 8220: 355, 8221: 355, 176: 400, 8226: 350,
    }
    for cp, ref in base.items():
        tbl[cp] = ref if ref > 200 else tbl.get(ref, 556)
    return tbl

_add_accents(_HELV)
_add_accents(_HELVB)
WIDTHS = {"F1": _HELV, "F2": _HELVB, "F3": _HELV}  # F3 = Helvetica-Oblique


def text_width(s, font, size):
    tbl = WIDTHS[font]
    total = 0
    for ch in s:
        total += tbl.get(ord(ch), 556)
    return total / 1000.0 * size


# --------------------------------------------------------------------------
# Utilidades de formato / escape
# --------------------------------------------------------------------------
def fnum(x):
    if isinstance(x, int):
        return str(x)
    return ("%.3f" % x).rstrip("0").rstrip(".")


def esc_text(s):
    """Codifica a cp1252 (WinAnsi) y escapa parentesis y backslash."""
    b = s.encode("cp1252", "replace")
    b = b.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
    return b


# --------------------------------------------------------------------------
# Lienzo: acumula operadores de un content stream y registra recursos
# (sombreados) que necesita la pagina.
# --------------------------------------------------------------------------
class Canvas:
    def __init__(self, pdf):
        self.pdf = pdf
        self.buf = bytearray()
        self.shadings = []  # lista de (nombre, cuerpo_dict_bytes)
        self._sh_n = 0

    def raw(self, s):
        if isinstance(s, str):
            s = s.encode("latin-1")
        self.buf += s
        self.buf += b"\n"

    # --- estado grafico ---
    def save(self):
        self.raw("q")

    def restore(self):
        self.raw("Q")

    def alpha(self, a):
        self.raw("/GS%d gs" % self.pdf.gstate(a))

    def line_width(self, w):
        self.raw("%s w" % fnum(w))

    def fill_color(self, c):
        self.raw("%s %s %s rg" % (fnum(c[0]), fnum(c[1]), fnum(c[2])))

    def stroke_color(self, c):
        self.raw("%s %s %s RG" % (fnum(c[0]), fnum(c[1]), fnum(c[2])))

    def line_cap_round(self):
        self.raw("1 J")
        self.raw("1 j")

    # --- rutas basicas ---
    def rect(self, x, y, w, h, fill=None, stroke=None, lw=1):
        self.save()
        if fill:
            self.fill_color(fill)
        if stroke:
            self.stroke_color(stroke)
            self.line_width(lw)
        self.raw("%s %s %s %s re" % (fnum(x), fnum(y), fnum(w), fnum(h)))
        if fill and stroke:
            self.raw("B")
        elif fill:
            self.raw("f")
        elif stroke:
            self.raw("S")
        self.restore()

    def _bezier_circle(self, cx, cy, rx, ry):
        k = 0.5522847498
        ox, oy = rx * k, ry * k
        self.raw("%s %s m" % (fnum(cx + rx), fnum(cy)))
        self.raw("%s %s %s %s %s %s c" % (fnum(cx + rx), fnum(cy + oy), fnum(cx + ox), fnum(cy + ry), fnum(cx), fnum(cy + ry)))
        self.raw("%s %s %s %s %s %s c" % (fnum(cx - ox), fnum(cy + ry), fnum(cx - rx), fnum(cy + oy), fnum(cx - rx), fnum(cy)))
        self.raw("%s %s %s %s %s %s c" % (fnum(cx - rx), fnum(cy - oy), fnum(cx - ox), fnum(cy - ry), fnum(cx), fnum(cy - ry)))
        self.raw("%s %s %s %s %s %s c" % (fnum(cx + ox), fnum(cy - ry), fnum(cx + rx), fnum(cy - oy), fnum(cx + rx), fnum(cy)))
        self.raw("h")

    def circle(self, cx, cy, r, fill=None, stroke=None, lw=1):
        self.ellipse(cx, cy, r, r, fill, stroke, lw)

    def ellipse(self, cx, cy, rx, ry, fill=None, stroke=None, lw=1):
        self.save()
        if fill:
            self.fill_color(fill)
        if stroke:
            self.stroke_color(stroke)
            self.line_width(lw)
        self._bezier_circle(cx, cy, rx, ry)
        if fill and stroke:
            self.raw("B")
        elif fill:
            self.raw("f")
        elif stroke:
            self.raw("S")
        self.restore()

    def clip_circle(self, cx, cy, r):
        self._bezier_circle(cx, cy, r, r)
        self.raw("W n")

    def clip_ellipse(self, cx, cy, rx, ry):
        self._bezier_circle(cx, cy, rx, ry)
        self.raw("W n")

    def clip_rect(self, x, y, w, h):
        self.raw("%s %s %s %s re" % (fnum(x), fnum(y), fnum(w), fnum(h)))
        self.raw("W n")

    def polygon(self, pts, fill=None, stroke=None, lw=1, close=True):
        self.save()
        if fill:
            self.fill_color(fill)
        if stroke:
            self.stroke_color(stroke)
            self.line_width(lw)
        self.raw("%s %s m" % (fnum(pts[0][0]), fnum(pts[0][1])))
        for p in pts[1:]:
            self.raw("%s %s l" % (fnum(p[0]), fnum(p[1])))
        if close:
            self.raw("h")
        if fill and stroke:
            self.raw("B")
        elif fill:
            self.raw("f")
        elif stroke:
            self.raw("S")
        self.restore()

    def line(self, x1, y1, x2, y2, color, lw=1, dash=None):
        self.save()
        self.stroke_color(color)
        self.line_width(lw)
        self.line_cap_round()
        if dash:
            self.raw("[%s] 0 d" % " ".join(fnum(d) for d in dash))
        self.raw("%s %s m %s %s l S" % (fnum(x1), fnum(y1), fnum(x2), fnum(y2)))
        self.restore()

    # --- sombreados (gradientes) ---
    def _add_axial(self, x0, y0, x1, y1, c0, c1):
        self._sh_n += 1
        name = "Sh%d" % self._sh_n
        body = (
            "<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [%s %s %s %s] "
            "/Domain [0 1] /Extend [true true] /Function << /FunctionType 2 "
            "/Domain [0 1] /C0 [%s %s %s] /C1 [%s %s %s] /N 1 >> >>"
            % (fnum(x0), fnum(y0), fnum(x1), fnum(y1),
               fnum(c0[0]), fnum(c0[1]), fnum(c0[2]),
               fnum(c1[0]), fnum(c1[1]), fnum(c1[2]))
        )
        self.shadings.append((name, body))
        return name

    def _add_radial(self, x0, y0, r0, x1, y1, r1, c0, c1):
        self._sh_n += 1
        name = "Sh%d" % self._sh_n
        body = (
            "<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [%s %s %s %s %s %s] "
            "/Domain [0 1] /Extend [true true] /Function << /FunctionType 2 "
            "/Domain [0 1] /C0 [%s %s %s] /C1 [%s %s %s] /N 1 >> >>"
            % (fnum(x0), fnum(y0), fnum(r0), fnum(x1), fnum(y1), fnum(r1),
               fnum(c0[0]), fnum(c0[1]), fnum(c0[2]),
               fnum(c1[0]), fnum(c1[1]), fnum(c1[2]))
        )
        self.shadings.append((name, body))
        return name

    def gradient_vertical(self, x, y, w, h, c_top, c_bottom):
        name = self._add_axial(0, y + h, 0, y, c_top, c_bottom)
        self.save()
        self.clip_rect(x, y, w, h)
        self.raw("/%s sh" % name)
        self.restore()

    def gradient_rect(self, x, y, w, h, c0, c1, angle="v"):
        if angle == "v":
            name = self._add_axial(0, y + h, 0, y, c0, c1)
        else:
            name = self._add_axial(x, 0, x + w, 0, c0, c1)
        self.save()
        self.clip_rect(x, y, w, h)
        self.raw("/%s sh" % name)
        self.restore()

    def sphere(self, cx, cy, r, c_light, c_dark, hlx=0.35, hly=0.35):
        """Esfera con sombreado radial para dar volumen (aspecto 3D)."""
        name = self._add_radial(cx - r * hlx, cy + r * hly, 0, cx, cy, r * 1.5, c_light, c_dark)
        self.save()
        self.clip_circle(cx, cy, r)
        self.raw("/%s sh" % name)
        self.restore()

    def glow(self, cx, cy, r, color, max_alpha=0.5):
        """Halo suave alrededor de un punto (varias capas translucidas)."""
        layers = 6
        for i in range(layers, 0, -1):
            rr = r * i / layers
            a = max_alpha * (1 - (i - 1) / layers) * 0.6
            self.save()
            self.alpha(a)
            self.circle(cx, cy, rr, fill=color)
            self.restore()

    # --- texto ---
    def text(self, x, y, s, font, size, color, char_space=0):
        self.save()
        self.fill_color(color)
        self.raw("BT")
        if char_space:
            self.raw("%s Tc" % fnum(char_space))
        self.raw("/%s %s Tf" % (font, fnum(size)))
        self.raw("%s %s Td" % (fnum(x), fnum(y)))
        self.buf += b"(" + esc_text(s) + b") Tj\n"
        self.raw("ET")
        self.restore()

    def text_center(self, cx, y, s, font, size, color, char_space=0):
        tw = text_width(s, font, size)
        if char_space:
            tw += char_space * (len(s) - 1)
        self.text(cx - tw / 2.0, y, s, font, size, color, char_space)

    def text_center_shadow(self, cx, y, s, font, size, color, shadow, dx=1.6, dy=-1.6):
        self.text_center(cx + dx, y + dy, s, font, size, shadow)
        self.text_center(cx, y, s, font, size, color)

    def wrap(self, s, font, size, max_w):
        words = s.split(" ")
        lines, cur = [], ""
        for wd in words:
            trial = wd if not cur else cur + " " + wd
            if text_width(trial, font, size) <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = wd
        if cur:
            lines.append(cur)
        return lines

    def paragraph(self, x, y_top, s, font, size, color, leading, max_w, align="left"):
        """Dibuja un parrafo (admite \n) y devuelve la y inferior."""
        y = y_top
        for block in s.split("\n"):
            if block == "":
                y -= leading
                continue
            for ln in self.wrap(block, font, size, max_w):
                if align == "center":
                    self.text_center(x + max_w / 2.0, y, ln, font, size, color)
                else:
                    self.text(x, y, ln, font, size, color)
                y -= leading
        return y


# --------------------------------------------------------------------------
# Documento PDF: gestiona objetos, fuentes, gstates y la escritura final.
# --------------------------------------------------------------------------
class PDF:
    def __init__(self):
        self.objs = []                  # cuerpos de objeto (bytes)
        self.cat = self._reserve()      # 1: catalogo
        self.pages_obj = self._reserve()  # 2: arbol de paginas
        self.page_ids = []
        self.fonts = {}
        self.gstates = {}
        self._init_fonts()

    def _reserve(self):
        self.objs.append(None)
        return len(self.objs)

    def _set(self, num, body):
        self.objs[num - 1] = body

    def _add(self, body):
        self.objs.append(body)
        return len(self.objs)

    def _init_fonts(self):
        defs = [("F1", "Helvetica"), ("F2", "Helvetica-Bold"), ("F3", "Helvetica-Oblique")]
        for name, base in defs:
            num = self._add(
                ("<< /Type /Font /Subtype /Type1 /BaseFont /%s "
                 "/Encoding /WinAnsiEncoding >>" % base).encode("latin-1")
            )
            self.fonts[name] = num

    def gstate(self, alpha):
        key = round(alpha, 3)
        if key not in self.gstates:
            idx = len(self.gstates) + 1
            num = self._add(
                ("<< /Type /ExtGState /ca %s /CA %s >>" % (fnum(key), fnum(key))).encode("latin-1")
            )
            self.gstates[key] = (idx, num)
        return self.gstates[key][0]

    def add_page(self, canvas):
        # objetos de sombreado de la pagina
        sh_entries = []
        for name, body in canvas.shadings:
            snum = self._add(body.encode("latin-1"))
            sh_entries.append((name, snum))

        stream = bytes(canvas.buf)
        comp = zlib.compress(stream, 9)
        content_body = (
            b"<< /Length " + str(len(comp)).encode() + b" /Filter /FlateDecode >>\nstream\n"
            + comp + b"\nendstream"
        )
        content_num = self._add(content_body)

        font_res = " ".join("/%s %d 0 R" % (n, self.fonts[n]) for n in self.fonts)
        gs_res = " ".join("/GS%d %d 0 R" % (idx, num) for (idx, num) in self.gstates.values())
        parts = [
            "<< /Type /Page /Parent %d 0 R" % self.pages_obj,
            "/MediaBox [0 0 %s %s]" % (fnum(W), fnum(H)),
            "/Contents %d 0 R" % content_num,
            "/Resources << /Font << %s >>" % font_res,
        ]
        if gs_res:
            parts.append("/ExtGState << %s >>" % gs_res)
        if sh_entries:
            sh_res = " ".join("/%s %d 0 R" % (n, num) for (n, num) in sh_entries)
            parts.append("/Shading << %s >>" % sh_res)
        parts.append(">> >>")
        page_num = self._add(" ".join(parts).encode("latin-1"))
        self.page_ids.append(page_num)
        return page_num

    def finalize(self):
        kids = " ".join("%d 0 R" % pid for pid in self.page_ids)
        self._set(self.pages_obj,
                  ("<< /Type /Pages /Count %d /Kids [%s] >>" % (len(self.page_ids), kids)).encode("latin-1"))
        self._set(self.cat,
                  ("<< /Type /Catalog /Pages %d 0 R >>" % self.pages_obj).encode("latin-1"))

    def write(self, path):
        self.finalize()
        out = bytearray()
        out += b"%PDF-1.7\n"
        out += b"%\xe2\xe3\xcf\xd3\n"
        offsets = [0] * (len(self.objs) + 1)
        for i, body in enumerate(self.objs, start=1):
            offsets[i] = len(out)
            out += ("%d 0 obj\n" % i).encode("latin-1")
            out += body if isinstance(body, (bytes, bytearray)) else body.encode("latin-1")
            out += b"\nendobj\n"
        xref_pos = len(out)
        n = len(self.objs) + 1
        out += ("xref\n0 %d\n" % n).encode("latin-1")
        out += b"0000000000 65535 f \n"
        for i in range(1, n):
            out += ("%010d 00000 n \n" % offsets[i]).encode("latin-1")
        out += b"trailer\n"
        out += ("<< /Size %d /Root %d 0 R >>\n" % (n, self.cat)).encode("latin-1")
        out += b"startxref\n"
        out += ("%d\n" % xref_pos).encode("latin-1")
        out += b"%%EOF\n"
        with open(path, "wb") as f:
            f.write(out)
        return len(out)



# ==========================================================================
# PALETA DE COLORES
# ==========================================================================
def rgb(r, g, b):
    return (r / 255.0, g / 255.0, b / 255.0)

NIGHT_TOP = rgb(13, 16, 51)
NIGHT_BOT = rgb(48, 24, 88)
DEEP_TOP = rgb(20, 12, 60)
DEEP_BOT = rgb(70, 30, 110)
WHITE = rgb(255, 255, 255)
CREAM = rgb(255, 248, 230)
SOFT = rgb(225, 230, 255)
GOLD = rgb(255, 209, 102)
ORANGE = rgb(255, 140, 66)
RED = rgb(239, 71, 58)
SUNYEL = rgb(255, 224, 120)
SUNCORE = rgb(255, 250, 220)
INK = rgb(30, 25, 60)
LAVENDER = rgb(199, 186, 255)
STARC = rgb(255, 252, 235)

# Colores de planetas: (luz, oscuro)
P_MERCURY = (rgb(190, 185, 178), rgb(105, 98, 92))
P_VENUS = (rgb(247, 220, 150), rgb(180, 120, 50))
P_EARTH_OC = (rgb(120, 200, 255), rgb(20, 70, 150))
P_MOON = (rgb(235, 235, 238), rgb(120, 122, 135))
P_MARS = (rgb(240, 130, 80), rgb(150, 45, 25))
P_JUP = (rgb(240, 215, 180), rgb(150, 100, 60))
P_SAT = (rgb(245, 225, 170), rgb(170, 130, 70))
P_URA = (rgb(190, 240, 240), rgb(70, 150, 165))
P_NEP = (rgb(120, 160, 255), rgb(30, 50, 160))
P_PLU = (rgb(225, 205, 185), rgb(140, 110, 95))


# ==========================================================================
# HELPERS DE ILUSTRACION DE ALTO NIVEL
# ==========================================================================
class Rng:
    """PRNG determinista (congruencial lineal) para campos de estrellas
    reproducibles, sin depender del modulo random."""
    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFF

    def next(self):
        self.s = (1103515245 * self.s + 12345) & 0x7FFFFFFF
        return self.s

    def rand(self):
        return self.next() / float(0x7FFFFFFF)

    def between(self, a, b):
        return a + (b - a) * self.rand()


def five_star(c, cx, cy, r, color, rot=-90):
    pts = []
    for i in range(10):
        ang = math.radians(rot + i * 36)
        rr = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    c.polygon(pts, fill=color)


def sparkle(c, cx, cy, r, color, alpha=1.0):
    """Destello de 4 puntas (estilo brillo)."""
    c.save()
    if alpha < 1:
        c.alpha(alpha)
    pts = [
        (cx, cy + r), (cx + r * 0.16, cy + r * 0.16),
        (cx + r, cy), (cx + r * 0.16, cy - r * 0.16),
        (cx, cy - r), (cx - r * 0.16, cy - r * 0.16),
        (cx - r, cy), (cx - r * 0.16, cy + r * 0.16),
    ]
    c.polygon(pts, fill=color)
    c.restore()


def starfield(c, n, seed, x0=0, y0=0, x1=W, y1=H, bright=True):
    rng = Rng(seed)
    for _ in range(n):
        x = rng.between(x0, x1)
        y = rng.between(y0, y1)
        r = rng.between(0.5, 1.8)
        a = rng.between(0.35, 1.0)
        c.save()
        c.alpha(a)
        c.circle(x, y, r, fill=STARC)
        c.restore()
    if bright:
        rng2 = Rng(seed + 7)
        for _ in range(max(3, n // 14)):
            x = rng2.between(x0 + 20, x1 - 20)
            y = rng2.between(y0 + 20, y1 - 20)
            r = rng2.between(2.2, 4.2)
            sparkle(c, x, y, r, STARC, alpha=rng2.between(0.6, 1.0))


def night_background(c, top=NIGHT_TOP, bot=NIGHT_BOT, stars=150, seed=1):
    c.gradient_vertical(0, 0, W, H, top, bot)
    starfield(c, stars, seed)


def sun(c, cx, cy, r, rays=True):
    if rays:
        c.save()
        c.alpha(0.85)
        nray = 16
        for i in range(nray):
            ang = math.radians(i * (360.0 / nray))
            r1 = r * 1.15
            r2 = r * (1.55 if i % 2 == 0 else 1.38)
            wgt = r * 0.10
            ax, ay = math.cos(ang), math.sin(ang)
            px, py = -ay, ax
            pts = [
                (cx + ax * r1 + px * wgt, cy + ay * r1 + py * wgt),
                (cx + ax * r2, cy + ay * r2),
                (cx + ax * r1 - px * wgt, cy + ay * r1 - py * wgt),
            ]
            c.polygon(pts, fill=GOLD)
        c.restore()
    c.glow(cx, cy, r * 1.7, GOLD, max_alpha=0.45)
    c.sphere(cx, cy, r, SUNCORE, ORANGE, hlx=0.2, hly=0.25)
    c.save()
    c.clip_circle(cx, cy, r)
    c.alpha(0.5)
    c.circle(cx - r * 0.35, cy + r * 0.3, r * 0.22, fill=SUNYEL)
    c.circle(cx + r * 0.3, cy - r * 0.25, r * 0.18, fill=ORANGE)
    c.restore()


def planet(c, cx, cy, r, colors, glow_color=None, features=None):
    if glow_color:
        c.glow(cx, cy, r * 1.45, glow_color, max_alpha=0.30)
    c.sphere(cx, cy, r, colors[0], colors[1])
    if features:
        c.save()
        c.clip_circle(cx, cy, r)
        features(c, cx, cy, r)
        c.restore()
    # borde inferior sutil para asentar la esfera
    c.save()
    c.alpha(0.18)
    c.circle(cx, cy, r, stroke=colors[1], lw=r * 0.06)
    c.restore()


def craters(spots):
    def f(c, cx, cy, r):
        for (dx, dy, rr, shade) in spots:
            x, y = cx + dx * r, cy + dy * r
            c.save()
            c.alpha(0.5)
            c.circle(x, y, rr * r, fill=shade)
            c.alpha(0.4)
            c.circle(x - rr * r * 0.2, y + rr * r * 0.2, rr * r * 0.6, fill=WHITE)
            c.restore()
    return f


def earth_features(c, cx, cy, r):
    land = rgb(86, 184, 110)
    land2 = rgb(60, 150, 90)
    c.save()
    c.alpha(0.95)
    # continentes esquematicos
    c.ellipse(cx - r * 0.30, cy + r * 0.25, r * 0.34, r * 0.26, fill=land)
    c.ellipse(cx + r * 0.35, cy - r * 0.05, r * 0.30, r * 0.40, fill=land2)
    c.ellipse(cx - r * 0.05, cy - r * 0.45, r * 0.26, r * 0.20, fill=land)
    c.ellipse(cx + r * 0.10, cy + r * 0.45, r * 0.18, r * 0.16, fill=land2)
    c.restore()
    # nubes
    c.save()
    c.alpha(0.45)
    c.ellipse(cx - r * 0.45, cy - r * 0.2, r * 0.30, r * 0.12, fill=WHITE)
    c.ellipse(cx + r * 0.25, cy + r * 0.4, r * 0.26, r * 0.10, fill=WHITE)
    c.restore()


def gas_bands(palette):
    def f(c, cx, cy, r):
        n = len(palette)
        band_h = (2 * r) / n
        y = cy - r
        for i, col in enumerate(palette):
            c.save()
            c.alpha(0.55)
            c.rect(cx - r, y, 2 * r, band_h + 0.5, fill=col)
            c.restore()
            y += band_h
    return f


def red_spot(c, cx, cy, r):
    c.save()
    c.alpha(0.8)
    c.ellipse(cx + r * 0.25, cy - r * 0.18, r * 0.22, r * 0.14, fill=rgb(214, 90, 60))
    c.restore()


def ring(c, cx, cy, r, rx_out, ry_out, rx_in, ry_in, color, tilt_front=True):
    """Anillo (corona eliptica) con relleno even-odd; el planeta debe
    dibujarse ENTRE la parte trasera y delantera del anillo."""
    # parte trasera (mitad superior)
    c.save()
    c.clip_rect(cx - rx_out, cy, 2 * rx_out, ry_out + 2)
    c.save()
    c.fill_color(color)
    c._bezier_circle(cx, cy, rx_out, ry_out)
    c._bezier_circle(cx, cy, rx_in, ry_in)
    c.raw("f*")
    c.restore()
    c.restore()


def ring_front(c, cx, cy, rx_out, ry_out, rx_in, ry_in, color):
    c.save()
    c.clip_rect(cx - rx_out, cy - ry_out - 2, 2 * rx_out, ry_out + 2)
    c.save()
    c.fill_color(color)
    c._bezier_circle(cx, cy, rx_out, ry_out)
    c._bezier_circle(cx, cy, rx_in, ry_in)
    c.raw("f*")
    c.restore()
    c.restore()


def saturn(c, cx, cy, r):
    rx_o, ry_o = r * 1.95, r * 0.62
    rx_i, ry_i = r * 1.28, r * 0.40
    ring_color = rgb(214, 188, 130)
    ring(c, cx, cy, r, rx_o, ry_o, rx_i, ry_i, ring_color)
    planet(c, cx, cy, r, P_SAT, glow_color=GOLD,
           features=gas_bands([rgb(245,225,170), rgb(225,200,140), rgb(240,220,165), rgb(215,190,130)]))
    ring_front(c, cx, cy, rx_o, ry_o, rx_i, ry_i, ring_color)


def rocket(c, cx, cy, scale=1.0, angle_deg=0.0):
    """Cohete simpatico. Dibuja con una rotacion sencilla alrededor de (cx,cy)."""
    a = math.radians(angle_deg)
    ca, sa = math.cos(a), math.sin(a)

    def P(px, py):
        x, y = px * scale, py * scale
        return (cx + x * ca - y * sa, cy + x * sa + y * ca)

    body = rgb(245, 246, 250)
    body_dark = rgb(205, 210, 225)
    accent = RED
    win = rgb(120, 205, 255)
    # llamas
    c.polygon([P(-13, -40), P(0, -78), P(13, -40)], fill=ORANGE)
    c.polygon([P(-8, -40), P(0, -64), P(8, -40)], fill=GOLD)
    # aletas
    c.polygon([P(-15, -20), P(-30, -46), P(-15, -8)], fill=accent)
    c.polygon([P(15, -20), P(30, -46), P(15, -8)], fill=accent)
    # cuerpo (capsula)
    c.save()
    pts = [P(-15, -40), P(-15, 12), P(0, 40), P(15, 12), P(15, -40)]
    c.polygon(pts, fill=body)
    c.restore()
    # sombra lateral del cuerpo
    c.save()
    c.alpha(0.25)
    c.polygon([P(4, -40), P(4, 16), P(15, 12), P(15, -40)], fill=body_dark)
    c.restore()
    # punta roja
    c.polygon([P(-15, 12), P(0, 40), P(15, 12)], fill=accent)
    # ventana
    wx, wy = P(0, -8)
    c.circle(wx, wy, 9 * scale, fill=win, stroke=accent, lw=2.4 * scale)
    c.save()
    c.alpha(0.6)
    c.circle(wx - 2.6 * scale, wy + 2.6 * scale, 3.2 * scale, fill=WHITE)
    c.restore()


def astronaut(c, cx, cy, scale=1.0):
    suit = rgb(244, 246, 252)
    suit_sh = rgb(206, 212, 228)
    visor = rgb(40, 60, 110)
    s = scale
    # mochila
    c.rect(cx - 20 * s, cy - 26 * s, 40 * s, 44 * s, fill=suit_sh)
    # brazos
    c.save()
    c.line_cap_round()
    c.line(cx - 16 * s, cy + 6 * s, cx - 34 * s, cy - 8 * s, suit, lw=13 * s)
    c.line(cx + 16 * s, cy + 6 * s, cx + 36 * s, cy + 14 * s, suit, lw=13 * s)
    c.restore()
    # piernas
    c.save()
    c.line_cap_round()
    c.line(cx - 8 * s, cy - 18 * s, cx - 16 * s, cy - 44 * s, suit, lw=14 * s)
    c.line(cx + 8 * s, cy - 18 * s, cx + 18 * s, cy - 42 * s, suit, lw=14 * s)
    c.restore()
    # cuerpo
    c.ellipse(cx, cy - 2 * s, 22 * s, 26 * s, fill=suit)
    # casco
    c.circle(cx, cy + 30 * s, 22 * s, fill=suit)
    c.circle(cx, cy + 30 * s, 15 * s, fill=visor)
    c.save()
    c.alpha(0.55)
    c.ellipse(cx - 5 * s, cy + 35 * s, 6 * s, 8 * s, fill=rgb(120, 180, 255))
    c.restore()
    # detalle pecho
    c.circle(cx, cy - 2 * s, 4 * s, fill=GOLD)


def comet(c, cx, cy, scale=1.0):
    s = scale
    # cola
    for i, (ln, al, col) in enumerate([(150, 0.20, rgb(150,200,255)),
                                       (120, 0.30, rgb(180,220,255)),
                                       (90, 0.45, WHITE)]):
        c.save()
        c.alpha(al)
        c.polygon([(cx, cy + 12 * s), (cx + ln * s, cy + 38 * s),
                   (cx + ln * s, cy - 30 * s), (cx, cy - 12 * s)], fill=col)
        c.restore()
    # nucleo
    c.glow(cx, cy, 26 * s, rgb(180, 220, 255), max_alpha=0.5)
    c.sphere(cx, cy, 14 * s, WHITE, rgb(150, 190, 240))


def saucer(c, cx, cy, s=1.0):
    dome = rgb(180, 235, 255)
    body = rgb(150, 160, 200)
    body2 = rgb(110, 120, 165)
    c.ellipse(cx, cy, 36 * s, 12 * s, fill=body2)
    c.ellipse(cx, cy + 2 * s, 30 * s, 9 * s, fill=body)
    c.save()
    c.clip_rect(cx - 24 * s, cy + 4 * s, 48 * s, 22 * s)
    c.circle(cx, cy + 2 * s, 16 * s, fill=dome)
    c.restore()
    for dx in (-22, -8, 8, 22):
        c.circle(cx + dx * s, cy - 1 * s, 2.4 * s, fill=GOLD)


def planet_chip(c, cx, cy, r, colors):
    """Mini planeta decorativo."""
    c.sphere(cx, cy, r, colors[0], colors[1])


# ---- marco y pie de pagina reutilizables ----
def page_number(c, n, color=SOFT):
    c.text_center(W / 2.0, 28, str(n), "F2", 11, color)
    c.save()
    c.alpha(0.5)
    c.line(W / 2 - 40, 44, W / 2 - 14, 44, color, lw=1)
    c.line(W / 2 + 14, 44, W / 2 + 40, 44, color, lw=1)
    c.restore()


def badge(c, cx, cy, text, color=GOLD, tcolor=INK, w=None):
    tw = text_width(text, "F2", 12)
    if w is None:
        w = tw + 34
    c.save()
    c.fill_color(color)
    # capsula redondeada (rectangulo con semicirculos)
    h = 26
    x = cx - w / 2
    y = cy - h / 2
    rr = h / 2
    c.rect(x + rr, y, w - 2 * rr, h, fill=color)
    c.circle(x + rr, y + rr, rr, fill=color)
    c.circle(x + w - rr, y + rr, rr, fill=color)
    c.restore()
    c.text_center(cx, cy - 4, text, "F2", 12, tcolor)


def info_card(c, x, y, w, h, title, body, accent=GOLD, fill=rgb(255, 255, 255)):
    """Tarjeta semitransparente con titulo y texto (sobre fondo oscuro)."""
    c.save()
    c.alpha(0.12)
    c.rect(x, y, w, h, fill=WHITE)
    c.restore()
    c.save()
    c.alpha(0.85)
    c.rect(x, y + h - 6, w, 6, fill=accent)
    c.restore()
    c.text(x + 16, y + h - 30, title, "F2", 15, accent)
    c.paragraph(x + 16, y + h - 52, body, "F1", 11.5, SOFT, 16, w - 32)



# ==========================================================================
# MAQUETACION DE PAGINA
# ==========================================================================
MARGIN = 54
CONTENT_W = W - 2 * MARGIN


def title_block(c, title, y=H - 96, size=33, color=GOLD):
    c.text_center_shadow(W / 2.0, y, title, "F2", size, color, INK, dx=2, dy=-2)


def subtitle(c, text, y, color=LAVENDER, size=14):
    c.text_center(W / 2.0, y, text, "F3", size, color)


def fact_lines(c, x, y, items, size=12.5, leading=17, max_w=300,
               color=SOFT, bullet=GOLD, gap=9):
    for it in items:
        sparkle(c, x + 4, y + size * 0.32, 4.4, bullet)
        yy = y
        for ln in c.wrap(it, "F1", size, max_w - 20):
            c.text(x + 18, yy, ln, "F1", size, color)
            yy -= leading
        y = yy - gap
    return y


def divider(c, cx, y, w=120, color=GOLD):
    c.save()
    c.alpha(0.8)
    c.line(cx - w / 2, y, cx + w / 2, y, color, lw=1.4)
    c.restore()
    five_star(c, cx, y, 5, color)


# ==========================================================================
# PAGINAS
# ==========================================================================
def page_cover(pdf):
    c = Canvas(pdf)
    c.gradient_vertical(0, 0, W, H, rgb(8, 10, 40), rgb(64, 26, 96))
    starfield(c, 220, seed=42)
    # planeta grande abajo a la derecha (horizonte)
    planet(c, W + 60, -40, 260, P_NEP, glow_color=rgb(120, 160, 255))
    # sol/estrella resplandeciente arriba izquierda
    c.glow(95, H - 120, 150, GOLD, max_alpha=0.4)
    sun(c, 95, H - 120, 46)
    # planetas decorativos
    planet_chip(c, 470, H - 150, 30, P_SAT)
    ring(c, 470, H - 150, 30, 30 * 1.9, 30 * 0.6, 30 * 1.25, 30 * 0.38, rgb(214, 188, 130))
    ring_front(c, 470, H - 150, 30 * 1.9, 30 * 0.6, 30 * 1.25, 30 * 0.38, rgb(214, 188, 130))
    planet_chip(c, 150, 250, 22, P_MARS)
    # cohete subiendo en el centro
    rocket(c, W / 2.0, 300, scale=1.7, angle_deg=18)
    comet(c, 430, 470, scale=0.7)

    # titulo
    c.text_center_shadow(W / 2.0, H - 320, "AVENTURA", "F2", 56, GOLD, rgb(120, 50, 20), dx=3, dy=-3)
    c.text_center_shadow(W / 2.0, H - 380, "POR EL ESPACIO", "F2", 40, CREAM, rgb(120, 50, 20), dx=2.5, dy=-2.5)
    divider(c, W / 2.0, H - 410, w=200)
    c.text_center(W / 2.0, H - 442, "Un viaje magico por nuestro Sistema Solar", "F3", 16, LAVENDER)
    # cinta inferior
    badge(c, W / 2.0, 150, "Para pequenos exploradores del universo", color=GOLD, tcolor=INK)
    c.text_center(W / 2.0, 92, "Libro ilustrado para ninas y ninos curiosos", "F1", 11.5, SOFT)
    pdf.add_page(c)


def page_intro(pdf):
    c = Canvas(pdf)
    night_background(c, stars=120, seed=3)
    title_block(c, "Hola, pequeno explorador", y=H - 92, size=30)
    divider(c, W / 2.0, H - 118)
    astronaut(c, W / 2.0, H - 250, scale=1.25)
    body = (
        "Levanta la vista en una noche despejada. Esos puntitos brillantes "
        "que ves son estrellas, planetas y mundos lejanos que esperan ser "
        "descubiertos.\n"
        "En este libro vas a viajar muy, muy lejos: visitaremos el Sol y los "
        "ocho planetas, saltaremos sobre la Luna, cruzaremos un cinturon de "
        "rocas y seguiremos la cola brillante de un cometa.\n"
        "Ponte el casco, abrocha el cinturon y prepara tu curiosidad. "
        "La cuenta atras ya empieza... 3... 2... 1... despegamos!"
    )
    c.paragraph(MARGIN + 10, H - 360, body, "F1", 13.5, SOFT, 20, CONTENT_W - 20, align="center")
    # firma simpatica
    badge(c, W / 2.0, 150, "Tu nave: la imaginacion", color=LAVENDER, tcolor=INK)
    page_number(c, 2)
    pdf.add_page(c)


def page_what(pdf):
    c = Canvas(pdf)
    night_background(c, top=rgb(10, 12, 46), bot=rgb(40, 20, 80), stars=90, seed=11)
    title_block(c, "Que es el Sistema Solar?", y=H - 90, size=27)
    subtitle(c, "Una gran familia que gira alrededor del Sol", H - 116)

    # texto en la parte superior
    body = (
        "El Sistema Solar es el vecindario donde vivimos en el espacio. "
        "En el centro esta el Sol, una estrella enorme y caliente.\n\n"
        "A su alrededor giran ocho planetas, sus lunas, y millones de "
        "asteroides y cometas. Todos viajan en circulos llamados orbitas, "
        "como los caballitos de un tiovivo gigante.\n\n"
        "La fuerza que los mantiene unidos se llama gravedad: es como una "
        "cuerda invisible que tira de todo hacia el Sol."
    )
    c.paragraph(MARGIN, H - 150, body, "F1", 12.5, SOFT, 18, CONTENT_W)

    # diagrama de orbitas centrado en la mitad inferior
    sx, sy = W / 2.0, 245
    orbit_color = rgb(150, 160, 220)
    vf = 0.52
    chips = [
        (46, P_MERCURY, 4.5), (64, P_VENUS, 6.5), (84, P_EARTH_OC, 7),
        (104, P_MARS, 5.5), (128, P_JUP, 13), (152, P_SAT, 11),
        (172, P_URA, 8), (192, P_NEP, 8),
    ]
    for (rad, col, pr) in chips:
        c.save()
        c.alpha(0.30)
        c.ellipse(sx, sy, rad, rad * vf, stroke=orbit_color, lw=1.1)
        c.restore()
    sun(c, sx, sy, 30, rays=True)
    import math as _m
    angles = [200, 35, 150, 300, 80, 250, 20, 130]
    for (rad, col, pr), ang in zip(chips, angles):
        a = _m.radians(ang)
        px = sx + rad * _m.cos(a)
        py = sy + rad * vf * _m.sin(a)
        planet_chip(c, px, py, pr, col)
    page_number(c, 3)
    pdf.add_page(c)


def page_sun(pdf):
    c = Canvas(pdf)
    c.gradient_vertical(0, 0, W, H, rgb(40, 16, 60), rgb(120, 50, 30))
    starfield(c, 70, seed=5, bright=False)
    title_block(c, "El Sol", y=H - 92)
    subtitle(c, "La estrella que da luz y calor a todos", H - 118)
    sun(c, W / 2.0, H - 248, 82)
    body = (
        "El Sol es una estrella gigante hecha de gases muy calientes. "
        "Es tan grande que dentro cabrian mas de un millon de Tierras."
    )
    c.paragraph(MARGIN, H - 405, body, "F1", 13, CREAM, 19, CONTENT_W, align="center")
    y = fact_lines(c, MARGIN, H - 462, [
        "Su luz tarda unos 8 minutos en llegar hasta nosotros.",
        "Nos da el calor que necesitan las plantas y los animales.",
        "Nunca, jamas, debemos mirarlo directamente: cuida tus ojos.",
        "Es la estrella mas cercana a la Tierra.",
    ], max_w=CONTENT_W, color=CREAM)
    info_card(c, MARGIN, 120, CONTENT_W, 86, "Dato asombroso",
              "En el corazon del Sol hace tanto calor que cabrian millones de "
              "hogueras juntas. Por suerte esta a 150 millones de kilometros!",
              accent=GOLD)
    page_number(c, 4)
    pdf.add_page(c)



# --- plantilla reutilizable para paginas de planetas/mundos ---
PCX, PCY = W - 152, H - 250


def world_page(pdf, num, title, sub, draw, intro, facts, curio_title, curio_body,
               top=NIGHT_TOP, bot=NIGHT_BOT, seed=1, intro_w=250, curio_accent=GOLD):
    c = Canvas(pdf)
    night_background(c, top, bot, stars=85, seed=seed)
    title_block(c, title, y=H - 90, size=30)
    if sub:
        subtitle(c, sub, H - 116)
    draw(c)
    c.paragraph(MARGIN, H - 172, intro, "F1", 12.5, SOFT, 18, intro_w)
    fact_lines(c, MARGIN, H - 452, facts, max_w=CONTENT_W, color=SOFT)
    info_card(c, MARGIN, 116, CONTENT_W, 92, curio_title, curio_body, accent=curio_accent)
    page_number(c, num)
    pdf.add_page(c)


def page_mercury(pdf):
    def draw(c):
        planet(c, PCX, PCY, 70, P_MERCURY, glow_color=rgb(200, 195, 188),
               features=craters([(-0.3, 0.2, 0.18, rgb(90, 84, 78)),
                                  (0.25, -0.1, 0.12, rgb(90, 84, 78)),
                                  (0.05, 0.4, 0.09, rgb(90, 84, 78)),
                                  (-0.4, -0.35, 0.10, rgb(90, 84, 78))]))
    world_page(
        pdf, 5, "Mercurio", "El planeta mas pequeno y veloz", draw,
        "Mercurio es el planeta mas cercano al Sol y el mas pequeno de todos. "
        "Es un mundo de roca gris lleno de crateres, parecido a nuestra Luna.",
        ["De dia hace un calor abrasador y de noche un frio terrible.",
         "Es el mas rapido: corre alrededor del Sol en solo 88 dias.",
         "No tiene lunas ni aire para respirar."],
        "Sabias que?",
        "Un ano en Mercurio (una vuelta al Sol) dura menos de tres meses "
        "de los nuestros. Si vivieras alli, cumplirias anos muy a menudo!",
        top=rgb(20, 18, 40), bot=rgb(70, 50, 60), seed=21, curio_accent=rgb(200, 195, 188))


def page_venus(pdf):
    def draw(c):
        def swirls(c, cx, cy, r):
            c.save(); c.alpha(0.35)
            for dy in (-0.5, -0.2, 0.1, 0.4):
                c.ellipse(cx, cy + dy * r, r * 0.95, r * 0.10, fill=rgb(255, 240, 190))
            c.restore()
        planet(c, PCX, PCY, 78, P_VENUS, glow_color=rgb(255, 220, 150), features=swirls)
    world_page(
        pdf, 6, "Venus", "El gemelo brillante y ardiente", draw,
        "Venus es casi del mismo tamano que la Tierra, por eso a veces lo "
        "llaman su gemelo. Esta cubierto de nubes espesas y amarillentas.",
        ["Es el planeta mas caliente de todos, mas que Mercurio!",
         "Sus nubes atrapan el calor como una manta gigante.",
         "Brilla tanto que se ve como una estrella al amanecer."],
        "Curiosidad al reves",
        "Venus gira al reves que los demas planetas. Alli el Sol saldria por "
        "el oeste y se pondria por el este. Que raro, verdad?",
        top=rgb(40, 24, 30), bot=rgb(120, 80, 30), seed=22, curio_accent=P_VENUS[0])


def page_earth(pdf):
    def draw(c):
        planet(c, PCX, PCY, 80, P_EARTH_OC, glow_color=rgb(120, 200, 255),
               features=earth_features)
        planet_chip(c, PCX + 96, PCY + 70, 16, P_MOON)
        c.save(); c.alpha(0.3)
        c.ellipse(PCX, PCY, 120, 104, stroke=rgb(150, 200, 255), lw=1)
        c.restore()
    world_page(
        pdf, 7, "La Tierra", "Nuestro hogar azul en el espacio", draw,
        "La Tierra es nuestro planeta, el unico donde sabemos que hay vida. "
        "Tiene aire para respirar, agua para beber y la temperatura justa.",
        ["Casi tres partes de su superficie estan cubiertas de agua.",
         "Su aire nos protege como un escudo invisible.",
         "Da una vuelta sobre si misma cada dia: por eso hay dia y noche.",
         "Tiene una companera fiel: la Luna."],
        "Cuidemos la Tierra",
        "Es el unico hogar que tenemos. Ahorrar agua, plantar arboles y "
        "reciclar ayuda a que siga siendo un planeta bonito y sano.",
        top=rgb(10, 20, 55), bot=rgb(20, 70, 110), seed=23, curio_accent=P_EARTH_OC[0])


def page_moon(pdf):
    def draw(c):
        planet(c, PCX, PCY, 76, P_MOON, glow_color=rgb(235, 235, 245),
               features=craters([(-0.3, 0.25, 0.20, rgb(150, 152, 165)),
                                  (0.3, 0.05, 0.14, rgb(150, 152, 165)),
                                  (0.0, -0.35, 0.16, rgb(150, 152, 165)),
                                  (-0.15, -0.05, 0.09, rgb(150, 152, 165)),
                                  (0.42, -0.3, 0.08, rgb(150, 152, 165))]))
    world_page(
        pdf, 8, "La Luna", "La companera de la Tierra", draw,
        "La Luna es el mundo mas cercano a nosotros y la unica que han "
        "pisado los astronautas. Por eso a veces se ve grande y brillante.",
        ["No tiene luz propia: brilla porque refleja la del Sol.",
         "Cambia de forma cada noche: son las fases de la Luna.",
         "Alli pesarias seis veces menos y podrias dar saltos enormes."],
        "Huellas para siempre",
        "Como en la Luna no hay viento, las huellas que dejaron los "
        "astronautas hace mas de 50 anos siguen alli, intactas!",
        top=rgb(18, 20, 44), bot=rgb(48, 50, 80), seed=24, curio_accent=P_MOON[0])



def page_mars(pdf):
    def draw(c):
        def mars_feat(c, cx, cy, r):
            # casquetes polares
            c.save(); c.alpha(0.85)
            c.ellipse(cx, cy + r * 0.82, r * 0.42, r * 0.18, fill=WHITE)
            c.ellipse(cx, cy - r * 0.85, r * 0.30, r * 0.13, fill=WHITE)
            c.restore()
            c.save(); c.alpha(0.3)
            c.ellipse(cx - r * 0.2, cy, r * 0.5, r * 0.22, fill=rgb(120, 40, 20))
            c.restore()
        planet(c, PCX, PCY, 74, P_MARS, glow_color=rgb(240, 130, 80), features=mars_feat)
        planet_chip(c, PCX + 92, PCY - 64, 7, (rgb(180,160,150), rgb(90,75,70)))
    world_page(
        pdf, 9, "Marte", "El planeta rojo", draw,
        "Marte es un planeta de color rojizo porque su tierra esta llena de "
        "polvo oxidado, como el hierro viejo. Es frio y desertico.",
        ["Tiene el volcan mas alto de todo el Sistema Solar.",
         "Robots exploradores pasean por su superficie tomando fotos.",
         "Tiene dos lunitas pequenas: Fobos y Deimos.",
         "Quizas algun dia las personas viajen hasta alli."],
        "El monte gigante",
        "El Monte Olimpo de Marte es tres veces mas alto que el Everest. "
        "Es la montana mas grande conocida en todos los planetas!",
        top=rgb(40, 16, 24), bot=rgb(110, 45, 30), seed=25, curio_accent=P_MARS[0])


def page_jupiter(pdf):
    def draw(c):
        def jup_feat(c, cx, cy, r):
            gas_bands([rgb(245,225,195), rgb(200,160,120), rgb(240,215,180),
                       rgb(180,135,95), rgb(238,212,178), rgb(205,165,120)])(c, cx, cy, r)
            red_spot(c, cx, cy, r)
        planet(c, PCX, PCY, 92, P_JUP, glow_color=rgb(240, 215, 180), features=jup_feat)
    world_page(
        pdf, 10, "Jupiter", "El gigante del Sistema Solar", draw,
        "Jupiter es el planeta mas grande de todos: tan enorme que dentro "
        "cabrian mas de mil Tierras. Esta hecho casi todo de gas.",
        ["Tiene una tormenta gigante llamada la Gran Mancha Roja.",
         "Gira tan rapido que su dia dura solo unas 10 horas.",
         "Posee decenas de lunas; cuatro son muy grandes."],
        "Una tormenta enorme",
        "La Gran Mancha Roja es una tormenta tan grande que la Tierra "
        "entera cabria dentro. Lleva girando cientos de anos!",
        top=rgb(34, 24, 44), bot=rgb(120, 85, 55), seed=26, curio_accent=P_JUP[0])


def page_saturn(pdf):
    def draw(c):
        saturn(c, PCX, PCY - 6, 70)
    world_page(
        pdf, 11, "Saturno", "El planeta de los anillos", draw,
        "Saturno es famoso por sus preciosos anillos, que lo rodean como "
        "un sombrero gigante. Es el segundo planeta mas grande.",
        ["Sus anillos estan hechos de hielo, polvo y rocas.",
         "Es tan ligero que flotaria en una banera gigante de agua.",
         "Tiene muchisimas lunas; Titan es la mas grande."],
        "Anillos brillantes",
        "Los anillos de Saturno son anchisimos, pero tan finos que de canto "
        "casi no se ven. Estan hechos de millones de trocitos de hielo.",
        top=rgb(34, 28, 20), bot=rgb(110, 90, 45), seed=27, curio_accent=P_SAT[0])


def page_uranus(pdf):
    def draw(c):
        planet(c, PCX, PCY, 74, P_URA, glow_color=rgb(190, 240, 240))
        # anillos verticales (Urano gira de lado)
        col = rgb(170, 220, 225)
        c.save(); c.alpha(0.7)
        c.ellipse(PCX, PCY, 16, 104, stroke=col, lw=3)
        c.ellipse(PCX, PCY, 14, 92, stroke=col, lw=1.6)
        c.restore()
    world_page(
        pdf, 12, "Urano", "El planeta que rueda de lado", draw,
        "Urano es un mundo helado de color azul verdoso. Lo mas curioso es "
        "que gira tumbado, como una pelota que rueda por el suelo.",
        ["Esta tan lejos que se ve muy palido y frio.",
         "Sus anillos son finos y van de arriba a abajo.",
         "Tarda 84 anos terrestres en dar una vuelta al Sol."],
        "Verano larguisimo",
        "Como gira de lado, en algunos lugares de Urano el Sol no se pone "
        "durante muchos anos seguidos. Imagina un verano tan largo!",
        top=rgb(16, 34, 44), bot=rgb(40, 110, 120), seed=28, curio_accent=P_URA[0])


def page_neptune(pdf):
    def draw(c):
        def nep_feat(c, cx, cy, r):
            c.save(); c.alpha(0.4)
            c.ellipse(cx + r * 0.2, cy - r * 0.2, r * 0.22, r * 0.14, fill=rgb(20, 30, 90))
            c.ellipse(cx - r * 0.35, cy + r * 0.3, r * 0.16, r * 0.09, fill=WHITE)
            c.restore()
        planet(c, PCX, PCY, 76, P_NEP, glow_color=rgb(120, 160, 255), features=nep_feat)
    world_page(
        pdf, 13, "Neptuno", "El mundo azul y ventoso", draw,
        "Neptuno es el planeta mas lejano del Sol. Es de un azul intenso y "
        "muy, muy frio. Esta tan lejos que no se ve sin telescopio.",
        ["Tiene los vientos mas fuertes de todos los planetas.",
         "Esta tan lejos que el Sol se ve como una estrellita.",
         "Tarda 165 anos terrestres en rodear el Sol una vez."],
        "Vientos veloces",
        "En Neptuno soplan vientos mas rapidos que un avion a reaccion. "
        "Son las rachas mas veloces de todo el Sistema Solar!",
        top=rgb(10, 16, 50), bot=rgb(25, 45, 130), seed=29, curio_accent=P_NEP[0])


def page_pluto(pdf):
    def draw(c):
        planet(c, PCX, PCY, 50, P_PLU, glow_color=rgb(225, 205, 185))
        planet_chip(c, PCX + 78, PCY + 40, 18, (rgb(200,195,200), rgb(110,105,120)))
        # forma de corazon clarito (zona famosa de Pluton)
        c.save(); c.clip_circle(PCX, PCY, 50); c.alpha(0.6)
        c.ellipse(PCX - 12, PCY - 6, 14, 16, fill=rgb(245, 230, 210))
        c.ellipse(PCX + 8, PCY - 6, 14, 16, fill=rgb(245, 230, 210))
        c.polygon([(PCX - 24, PCY - 4), (PCX + 22, PCY - 4), (PCX - 2, PCY - 30)], fill=rgb(245, 230, 210))
        c.restore()
    world_page(
        pdf, 14, "Pluton", "El planeta enano del corazon", draw,
        "Pluton era el noveno planeta, pero los cientificos lo llamaron "
        "planeta enano porque es muy pequeno, mas que nuestra Luna.",
        ["Vive muy lejos, en una zona helada llena de mundos pequenos.",
         "Tiene una gran mancha con forma de corazon.",
         "Su luna Caronte es casi tan grande como el!"],
        "Familia de enanos",
        "Pluton no esta solo: hay otros planetas enanos como Ceres, Makemake "
        "y Eris. El Sistema Solar es mas grande de lo que parece!",
        top=rgb(14, 14, 38), bot=rgb(45, 35, 70), seed=30, curio_accent=P_PLU[0])



def page_asteroids(pdf):
    c = Canvas(pdf)
    night_background(c, top=rgb(14, 14, 40), bot=rgb(50, 30, 70), stars=80, seed=31)
    title_block(c, "Asteroides y Cometas", y=H - 90, size=27)
    subtitle(c, "Rocas viajeras y bolas de hielo brillante", H - 116)

    # cinturon de asteroides (arco de rocas)
    rng = Rng(99)
    cx0, cy0 = W / 2.0, H - 280
    for _ in range(60):
        ang = rng.between(math.radians(200), math.radians(340))
        rad = rng.between(150, 195)
        x = cx0 + rad * math.cos(ang)
        y = cy0 + rad * 0.5 * math.sin(ang) + 120
        rr = rng.between(1.5, 5)
        shade = rng.between(0.45, 0.8)
        c.save(); c.alpha(rng.between(0.6, 1.0))
        c.circle(x, y, rr, fill=rgb(int(150 * shade) + 60, int(140 * shade) + 55, int(130 * shade) + 50))
        c.restore()
    # un par de asteroides grandes
    planet_chip(c, W / 2 - 70, H - 250, 16, (rgb(170,160,150), rgb(80,72,66)))
    planet_chip(c, W / 2 + 80, H - 235, 12, (rgb(160,150,140), rgb(75,68,62)))
    comet(c, W / 2 + 120, H - 300, scale=0.9)

    info_card(c, MARGIN, H - 470, CONTENT_W, 96, "Los asteroides",
              "Son rocas de muchos tamanos que sobraron cuando se formaron los "
              "planetas. La mayoria viaja en grupo en un cinturon situado entre "
              "Marte y Jupiter, dando vueltas alrededor del Sol.",
              accent=rgb(190, 175, 150))
    info_card(c, MARGIN, H - 590, CONTENT_W, 96, "Los cometas",
              "Son como bolas de nieve sucia hechas de hielo y polvo. Cuando se "
              "acercan al Sol se calientan y forman una larga cola brillante que "
              "podemos ver cruzar el cielo. Algunos vuelven cada muchos anos.",
              accent=rgb(150, 200, 255))
    info_card(c, MARGIN, 120, CONTENT_W, 70, "Estrellas fugaces",
              "Cuando un trocito de roca entra en el aire de la Tierra se quema y "
              "deja una raya de luz. Eso es una estrella fugaz: pide un deseo!",
              accent=GOLD)
    page_number(c, 15)
    pdf.add_page(c)


def page_stars(pdf):
    c = Canvas(pdf)
    night_background(c, top=rgb(6, 8, 34), bot=rgb(30, 20, 70), stars=200, seed=33)
    title_block(c, "Estrellas y Constelaciones", y=H - 90, size=24)
    subtitle(c, "Dibujos secretos escondidos en el cielo", H - 116)

    # constelacion tipo Osa Mayor (el Carro)
    pts = [(150, H - 250), (210, H - 235), (270, H - 250), (330, H - 235),
           (360, H - 290), (300, H - 305), (250, H - 285)]
    c.save(); c.alpha(0.6)
    for i in range(len(pts) - 1):
        c.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], LAVENDER, lw=1.2)
    c.restore()
    for (x, y) in pts:
        c.glow(x, y, 10, STARC, max_alpha=0.5)
        five_star(c, x, y, 7, STARC)
    c.text(388, H - 292, "El Carro", "F3", 12, LAVENDER)

    body = (
        "Las estrellas son soles lejanos, muchos mas grandes que el nuestro, "
        "pero estan tan lejos que parecen puntitos de luz.\n\n"
        "Hace muchisimo tiempo, las personas unian las estrellas con lineas "
        "imaginarias y veian dibujos: animales, heroes y objetos. Esos dibujos "
        "se llaman constelaciones, y sirven para orientarse en la noche."
    )
    c.paragraph(MARGIN, H - 360, body, "F1", 12.5, SOFT, 18, CONTENT_W)
    y = fact_lines(c, MARGIN, H - 470, [
        "La estrella Polar senala siempre hacia el norte.",
        "Nuestro Sol tambien es una estrella, la mas cercana.",
        "Hay tantas estrellas que es imposible contarlas todas.",
        "La franja blanca del cielo es nuestra galaxia: la Via Lactea.",
    ], max_w=CONTENT_W, color=SOFT, bullet=LAVENDER)
    info_card(c, MARGIN, 118, CONTENT_W, 78, "Mira hacia arriba",
              "En una noche sin nubes y lejos de las luces de la ciudad, "
              "intenta encontrar una constelacion. Te sorprendera cuantas estrellas hay!",
              accent=LAVENDER)
    page_number(c, 16)
    pdf.add_page(c)


def page_astronauts(pdf):
    c = Canvas(pdf)
    night_background(c, top=rgb(10, 12, 46), bot=rgb(40, 24, 86), stars=120, seed=35)
    title_block(c, "Astronautas y Cohetes", y=H - 90, size=26)
    subtitle(c, "Valientes viajeros del espacio", H - 116)

    rocket(c, 150, H - 250, scale=1.5, angle_deg=10)
    astronaut(c, W - 160, H - 250, scale=1.15)
    saucer(c, W / 2.0, H - 175, s=0.8)

    body = (
        "Para salir al espacio hacen falta cohetes muy potentes, capaces de "
        "vencer la gravedad que nos sujeta al suelo.\n\n"
        "Los astronautas llevan trajes especiales que les dan aire para "
        "respirar y los protegen del frio y del calor. Algunos viven durante "
        "meses en la Estacion Espacial, un laboratorio que da vueltas a la Tierra."
    )
    c.paragraph(MARGIN, H - 360, body, "F1", 12.5, SOFT, 18, CONTENT_W)
    y = fact_lines(c, MARGIN, H - 470, [
        "En el espacio todo flota: hasta el agua forma bolitas en el aire.",
        "Los astronautas se entrenan muchos anos antes de viajar.",
        "Duermen atados con correas para no salir flotando.",
        "Desde alli, la Tierra se ve como una preciosa canica azul.",
    ], max_w=CONTENT_W, color=SOFT)
    info_card(c, MARGIN, 118, CONTENT_W, 78, "Tu tambien puedes",
              "Muchos astronautas eran ninos que miraban las estrellas y sonaban "
              "con el espacio. Si estudias y eres curioso, quien sabe a donde llegaras!",
              accent=GOLD)
    page_number(c, 17)
    pdf.add_page(c)


def page_funfacts(pdf):
    c = Canvas(pdf)
    night_background(c, top=rgb(28, 14, 54), bot=rgb(70, 30, 96), stars=110, seed=37)
    title_block(c, "Sabias que...?", y=H - 92, size=30)
    subtitle(c, "Datos asombrosos para presumir con tus amigos", H - 118)

    facts = [
        ("Saltos de gigante", "En la Luna pesarias seis veces menos. Podrias saltar como un superheroe!"),
        ("Silencio total", "En el espacio no hay aire, asi que no se oye ningun sonido."),
        ("Dias raros", "Un dia en Venus dura mas que su ano entero."),
        ("Lluvia rarisima", "En algunos planetas los cientificos creen que podria llover... cristal o metal!"),
        ("Mas lunas", "Jupiter y Saturno tienen decenas y decenas de lunas cada uno."),
        ("Viaje de luz", "La luz del Sol tarda 8 minutos en llegar a tus ojos."),
    ]
    cardw = (CONTENT_W - 20) / 2.0
    x0 = MARGIN
    y0 = H - 200
    chip_palettes = [P_SAT, P_MOON, P_VENUS, P_NEP, P_JUP, GOLD]
    for i, (t, b) in enumerate(facts):
        col = i % 2
        row = i // 2
        x = x0 + col * (cardw + 20)
        y = y0 - row * 150
        c.save(); c.alpha(0.12); c.rect(x, y - 124, cardw, 124, fill=WHITE); c.restore()
        c.save(); c.alpha(0.85); c.rect(x, y - 6, cardw, 6, fill=GOLD); c.restore()
        # icono planeta/estrella
        pal = chip_palettes[i]
        if isinstance(pal, tuple) and isinstance(pal[0], tuple):
            planet_chip(c, x + 26, y - 30, 13, pal)
        else:
            five_star(c, x + 26, y - 30, 13, GOLD)
        c.text(x + 48, y - 34, t, "F2", 13, GOLD)
        c.paragraph(x + 14, y - 56, b, "F1", 11, SOFT, 15, cardw - 26)
    page_number(c, 18)
    pdf.add_page(c)


def page_activity(pdf):
    c = Canvas(pdf)
    night_background(c, top=rgb(12, 16, 50), bot=rgb(44, 28, 84), stars=90, seed=39)
    title_block(c, "Pon a prueba tu mente", y=H - 92, size=27)
    subtitle(c, "Pequeno juego de explorador espacial", H - 118)

    qs = [
        "1. Cual es la estrella que nos da luz y calor?",
        "2. En que planeta vivimos tu y yo?",
        "3. Que planeta es famoso por sus anillos?",
        "4. Como se llama nuestra companera que vemos de noche?",
        "5. Cual es el planeta mas grande de todos?",
    ]
    y = H - 180
    for q in qs:
        c.save(); c.alpha(0.10); c.rect(MARGIN, y - 30, CONTENT_W, 40, fill=WHITE); c.restore()
        five_star(c, MARGIN + 18, y - 9, 6, GOLD)
        c.text(MARGIN + 36, y - 14, q, "F1", 12.5, SOFT)
        y -= 52

    # caja para dibujar
    c.text(MARGIN, y - 6, "Ahora dibuja tu propio planeta imaginario:", "F2", 13, GOLD)
    bx, by, bw, bh = MARGIN, 150, CONTENT_W, y - 40 - 150
    c.save(); c.alpha(0.08); c.rect(bx, by, bw, bh, fill=WHITE); c.restore()
    c.save(); c.alpha(0.6)
    c.rect(bx, by, bw, bh, stroke=LAVENDER, lw=1.5)
    c.restore()
    # estrellitas decorativas en las esquinas del recuadro
    for (sx, sy) in [(bx + 16, by + bh - 16), (bx + bw - 16, by + bh - 16),
                     (bx + 16, by + 16), (bx + bw - 16, by + 16)]:
        sparkle(c, sx, sy, 6, GOLD, alpha=0.8)

    c.save(); c.alpha(0.75)
    c.text_center(W / 2.0, 118, "Respuestas: 1) El Sol  2) La Tierra  3) Saturno  4) La Luna  5) Jupiter",
                  "F3", 10.5, LAVENDER)
    c.restore()
    page_number(c, 19)
    pdf.add_page(c)


def page_back(pdf):
    c = Canvas(pdf)
    c.gradient_vertical(0, 0, W, H, rgb(8, 10, 40), rgb(60, 26, 92))
    starfield(c, 240, seed=51)
    planet(c, -40, H + 30, 200, P_JUP, glow_color=rgb(240, 215, 180))
    sun(c, W - 88, 130, 38)
    comet(c, 118, H - 138, scale=0.7)

    c.text_center_shadow(W / 2.0, H - 205, "FIN", "F2", 64, GOLD, rgb(120, 50, 20), dx=3, dy=-3)
    divider(c, W / 2.0, H - 238, w=180)
    body = (
        "Y asi termina nuestro viaje por el espacio.\n"
        "Pero el universo es tan grande que siempre hay algo nuevo por "
        "descubrir. Sigue mirando el cielo, haciendo preguntas y sonando "
        "en grande.\n"
        "El siguiente gran explorador... podrias ser tu!"
    )
    c.paragraph(MARGIN + 20, H - 288, body, "F1", 13.5, SOFT, 21, CONTENT_W - 40, align="center")
    rocket(c, W / 2.0, 318, scale=1.45, angle_deg=-10)
    badge(c, W / 2.0, 168, "Gracias por viajar conmigo", color=GOLD, tcolor=INK)
    c.text_center(W / 2.0, 120, "Aventura por el Espacio", "F2", 12, LAVENDER)
    c.text_center(W / 2.0, 100, "Un libro para pequenos exploradores del universo", "F1", 10.5, SOFT)
    pdf.add_page(c)


# ==========================================================================
# MAIN
# ==========================================================================
def build(path="Aventura_por_el_Espacio.pdf"):
    pdf = PDF()
    page_cover(pdf)
    page_intro(pdf)
    page_what(pdf)
    page_sun(pdf)
    page_mercury(pdf)
    page_venus(pdf)
    page_earth(pdf)
    page_moon(pdf)
    page_mars(pdf)
    page_jupiter(pdf)
    page_saturn(pdf)
    page_uranus(pdf)
    page_neptune(pdf)
    page_pluto(pdf)
    page_asteroids(pdf)
    page_stars(pdf)
    page_astronauts(pdf)
    page_funfacts(pdf)
    page_activity(pdf)
    page_back(pdf)
    size = pdf.write(path)
    print("PDF generado: %s  (%d paginas, %d bytes)" % (path, len(pdf.page_ids), size))
    return path


if __name__ == "__main__":
    build()
