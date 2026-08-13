# Gera os ícones do PWA (fundo escuro full-bleed, halter vermelho).
from PIL import Image, ImageDraw
import os

BG = (14, 18, 16, 255)
BG_EDGE = (9, 11, 10, 255)
ACCENT = (255, 107, 87, 255)
ACCENT_SOFT = (255, 189, 176, 255)

S = 1024
img = Image.new('RGBA', (S, S), BG)
d = ImageDraw.Draw(img)

# vinheta radial simples
for i in range(60):
    r = S * (0.72 + i * 0.005)
    alpha = int(2 + i * 1.2)
    d.ellipse([S/2 - r, S/2 - r, S/2 + r, S/2 + r], outline=(*BG_EDGE[:3], alpha), width=14)

# halter desenhado na horizontal em camada própria, depois rotacionado
glyph = Image.new('RGBA', (S, S), (0, 0, 0, 0))
g = ImageDraw.Draw(glyph)
cy = S / 2
bar_w, bar_h = 640, 56
g.rounded_rectangle([S/2 - bar_w/2, cy - bar_h/2, S/2 + bar_w/2, cy + bar_h/2], radius=bar_h/2, fill=ACCENT_SOFT)

def plate(cx, w, h):
    g.rounded_rectangle([cx - w/2, cy - h/2, cx + w/2, cy + h/2], radius=w/2.2, fill=ACCENT)

# placas: externa menor, interna maior, de cada lado
plate(S/2 - 245, 92, 380)
plate(S/2 - 150, 92, 300)
plate(S/2 + 150, 92, 300)
plate(S/2 + 245, 92, 380)

glyph = glyph.rotate(-32, resample=Image.BICUBIC, center=(S/2, S/2))
img.alpha_composite(glyph)

out = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(out, exist_ok=True)
for size, name in [(1024, 'icon-1024.png'), (512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
    img.resize((size, size), Image.LANCZOS).convert('RGB').save(os.path.join(out, name), 'PNG')
    print('ok', name)
