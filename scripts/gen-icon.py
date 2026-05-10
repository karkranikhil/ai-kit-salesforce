"""
AI-Kit for Salesforce — VS Code extension icon
Dark navy hex + glowing blue border + white cloud + </> in Salesforce blue + sparkles
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

SIZE = 512
OUT = os.path.join(os.path.dirname(__file__), '..', 'packages', 'vscode-extension', 'images', 'icon.png')

def hex_pts(cx, cy, r, offset=30):
    return [(cx + r*math.cos(math.radians(60*i+offset)),
             cy + r*math.sin(math.radians(60*i+offset))) for i in range(6)]

def sparkle(draw, x, y, r, color):
    pts = []
    for i in range(8):
        a = math.radians(45*i - 90)
        rad = r if i%2==0 else r*0.2
        pts.append((x + rad*math.cos(a), y + rad*math.sin(a)))
    draw.polygon(pts, fill=color)

cx, cy = SIZE//2, SIZE//2
HEX_R = 210

# ── Stage 1: outer glow on transparent canvas ────────────────────────────────
glow_img = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
gd = ImageDraw.Draw(glow_img)
gd.polygon(hex_pts(cx, cy, HEX_R+22), fill=(0, 120, 255, 90))
glow_img = glow_img.filter(ImageFilter.GaussianBlur(28))

img = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
img = Image.alpha_composite(img, glow_img)

# ── Stage 2: hex body — solid deep navy ──────────────────────────────────────
hex_layer = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
ImageDraw.Draw(hex_layer).polygon(hex_pts(cx, cy, HEX_R), fill=(8, 15, 52, 255))
img = Image.alpha_composite(img, hex_layer)

# ── Stage 3: inner blue vignette (darker at edges, lighter toward center) ─────
vignette = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
vd = ImageDraw.Draw(vignette)
for i in range(35):
    t = i/35
    r = int(HEX_R*(1 - t*0.9))
    vd.polygon(hex_pts(cx, cy, r), fill=(15, 35+int(55*t), 110+int(50*t), int(14*(1-t))))
img = Image.alpha_composite(img, vignette)

# ── Stage 4: hex border ───────────────────────────────────────────────────────
border_layer = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
bd = ImageDraw.Draw(border_layer)
pts = hex_pts(cx, cy, HEX_R)
for j in range(6):
    bd.line([pts[j], pts[(j+1)%6]], fill=(0, 140, 255, 160), width=9)
    bd.line([pts[j], pts[(j+1)%6]], fill=(100, 200, 255, 255), width=4)
img = Image.alpha_composite(img, border_layer)

# ── Stage 5: cloud shape ──────────────────────────────────────────────────────
# Shadow first
shadow_layer = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
sd = ImageDraw.Draw(shadow_layer)
sy = 8  # shadow offset
sd.ellipse([cx-82, cy-18+sy, cx+82, cy+82+sy], fill=(0,30,100,80))
sd.ellipse([cx-92, cy+16+sy, cx+8,  cy+92+sy], fill=(0,30,100,80))
sd.ellipse([cx+8,  cy+16+sy, cx+92, cy+92+sy], fill=(0,30,100,80))
sd.ellipse([cx-68, cy-58+sy, cx+12, cy+22+sy], fill=(0,30,100,80))
sd.ellipse([cx-12, cy-76+sy, cx+68, cy+4+sy],  fill=(0,30,100,80))
sd.rectangle([cx-88, cy+52+sy, cx+88, cy+84+sy], fill=(0,30,100,80))
img = Image.alpha_composite(img, shadow_layer.filter(ImageFilter.GaussianBlur(10)))

# Cloud body
cloud_layer = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
cd_draw = ImageDraw.Draw(cloud_layer)
cw = (245, 250, 255, 255)
cd_draw.ellipse([cx-82, cy-18, cx+82, cy+82], fill=cw)
cd_draw.ellipse([cx-92, cy+16, cx+8,  cy+92], fill=cw)
cd_draw.ellipse([cx+8,  cy+16, cx+92, cy+92], fill=cw)
cd_draw.ellipse([cx-68, cy-58, cx+12, cy+22], fill=cw)
cd_draw.ellipse([cx-12, cy-76, cx+68, cy+4],  fill=cw)
cd_draw.rectangle([cx-90, cy+52, cx+90, cy+85], fill=cw)
img = Image.alpha_composite(img, cloud_layer)

# ── Stage 6: </> brackets ────────────────────────────────────────────────────
bracket_layer = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
draw = ImageDraw.Draw(bracket_layer)

bc  = (20, 90, 215, 255)
th  = 21       # line thickness
h2  = 50       # half-height
yc  = cy + 32  # vertical center on cloud

# < left bracket
lx_tip, lx_open = cx-58, cx-20
draw.line([(lx_open, yc-h2), (lx_tip, yc)],   fill=bc, width=th)
draw.line([(lx_open, yc+h2), (lx_tip, yc)],   fill=bc, width=th)

# > right bracket
rx_tip, rx_open = cx+58, cx+20
draw.line([(rx_open, yc-h2), (rx_tip, yc)],   fill=bc, width=th)
draw.line([(rx_open, yc+h2), (rx_tip, yc)],   fill=bc, width=th)

# / slash  (forward slash between brackets)
draw.line([(cx+16, yc-h2-4), (cx-16, yc+h2+4)], fill=bc, width=th)

# round caps
cap = th//2
for px, py in [(lx_open,yc-h2),(lx_tip,yc),(lx_open,yc+h2),
               (rx_open,yc-h2),(rx_tip,yc),(rx_open,yc+h2),
               (cx+16,yc-h2-4),(cx-16,yc+h2+4)]:
    draw.ellipse([px-cap,py-cap,px+cap,py+cap], fill=bc)

img = Image.alpha_composite(img, bracket_layer)

# ── Stage 7: sparkles ────────────────────────────────────────────────────────
sp_layer = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
sp_draw  = ImageDraw.Draw(sp_layer)
sc = (200, 235, 255, 255)
sparkle(sp_draw, cx+112, cy-108, 19, sc)
sparkle(sp_draw, cx-120, cy-75,  12, sc)
sparkle(sp_draw, cx+85,  cy-142, 12, sc)
sparkle(sp_draw, cx-58,  cy-132,  7, sc)
sparkle(sp_draw, cx+138, cy-32,   7, sc)
img = Image.alpha_composite(img, sp_layer)

# ── Stage 8: downsample 4x → 128×128 ─────────────────────────────────────────
final = img.resize((128, 128), Image.LANCZOS)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
final.save(OUT, 'PNG')
print(f'Icon saved → {OUT}')
