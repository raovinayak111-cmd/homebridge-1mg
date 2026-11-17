"""Generate the synthetic sample discharge summary (PDF) and a tilted 'phone photo' of it.
Run: python3 scripts/make_samples.py  (outputs to public/samples/)
"""
import os, random, subprocess
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'samples')
os.makedirs(OUT, exist_ok=True)
pdf_path = os.path.join(OUT, 'sample-discharge-summary.pdf')

W, H = A4
c = canvas.Canvas(pdf_path, pagesize=A4)
c.setTitle('Sample discharge summary (synthetic)')

def header():
    c.setFillColor(HexColor('#1f4e79'))
    c.rect(0, H - 32 * mm, W, 32 * mm, fill=1, stroke=0)
    c.setFillColor(HexColor('#ffffff'))
    c.setFont('Helvetica-Bold', 17)
    c.drawString(18 * mm, H - 15 * mm, 'SUNRISE MULTISPECIALITY HOSPITAL')
    c.setFont('Helvetica', 9)
    c.drawString(18 * mm, H - 21 * mm, '(Fictional hospital for a product demo)  ·  12 Lake View Road, Lucknow  ·  Tel 0522-000000')
    c.setFont('Helvetica-Bold', 11)
    c.drawString(18 * mm, H - 28 * mm, 'DISCHARGE SUMMARY')
    c.setFillColor(HexColor('#000000'))

def footer(n):
    c.setFont('Helvetica-Oblique', 7.5)
    c.setFillColor(HexColor('#888888'))
    c.drawString(18 * mm, 10 * mm, 'SYNTHETIC DOCUMENT - NOT A REAL PATIENT. Created for the HomeBridge prototype (concept for Tata 1mg).')
    c.drawRightString(W - 18 * mm, 10 * mm, f'Page {n} of 1')
    c.setFillColor(HexColor('#000000'))

header()
y = H - 44 * mm
c.setFont('Helvetica', 10)
rows = [
    ('Patient', 'Ramesh K. (synthetic)', 'UHID', 'DEMO-0001'),
    ('Age / Sex', '68 / M', 'Ward', 'Cardiology - 3B'),
    ('Admitted', '10-Nov-2026', 'Discharged', '14-Nov-2026'),
    ('Consultant', 'Dr. A. Mehra (Cardiology, fictional)', '', ''),
]
for a, b, cc, d in rows:
    c.setFont('Helvetica-Bold', 9.5); c.drawString(18 * mm, y, a + ':')
    c.setFont('Helvetica', 9.5); c.drawString(45 * mm, y, b)
    if cc:
        c.setFont('Helvetica-Bold', 9.5); c.drawString(120 * mm, y, cc + ':')
        c.setFont('Helvetica', 9.5); c.drawString(145 * mm, y, d)
    y -= 6 * mm
c.line(18 * mm, y + 2 * mm, W - 18 * mm, y + 2 * mm)
y -= 4 * mm

def section(title, lines, mono=False):
    global y
    c.setFont('Helvetica-Bold', 10.5)
    c.drawString(18 * mm, y, title)
    y -= 5.5 * mm
    c.setFont('Courier' if mono else 'Helvetica', 9.5 if mono else 10)
    for ln in lines:
        c.drawString(20 * mm, y, ln)
        y -= 5 * mm
    y -= 3 * mm

section('Diagnosis:', ['Acute decompensated heart failure (HFrEF, EF 35%).', 'Type 2 diabetes mellitus. Systemic hypertension.'])
section('Course in hospital:', ['Admitted with breathlessness and pedal oedema.', 'Treated with IV diuretics. Symptoms improved.'])
section('Medications on discharge:', [
    '1. Tab Telmisartan 40 mg    1-0-0  after breakfast   x 30 days',
    '2. Tab Furosemide 40 mg     1-0-0  morning           x 30 days',
    '3. Tab Spironolactone 25 mg 1-0-0  after breakfast   x 30 days',
    '4. Tab Metformin 1000 mg    1-0-1  after meals       x 30 days (dose increased)',
    '5. Tab Atorvastatin 40 mg   0-0-1  bedtime           continue',
    '6. Tab Pantoprazole 40 mg   1-0-0  before breakfast  x 14 days',
], mono=True)
section('Stopped:', ['Tab Amlodipine 5 mg - discontinued.'])
section('Advice:', ['Salt under 5 g/day. Fluid intake limited to 1.5 L/day.', 'Weigh daily at the same time.'])
section('Follow-up:', ['- KFT with serum electrolytes after 7 days.', '- Review in Cardiology OPD after 10 days.'])
section('Return to emergency if:', ['Weight gain over 2 kg in 3 days, increasing breathlessness,', 'swelling of feet, fainting.'])
y -= 8 * mm
c.setFont('Helvetica', 10)
c.drawString(130 * mm, y, 'Dr. A. Mehra')
c.setFont('Helvetica', 8.5)
c.drawString(130 * mm, y - 4.5 * mm, 'MD, DM (Cardiology) - fictional')
footer(1)
c.save()
print('wrote', pdf_path)

# --- phone photo of page 1: render, tilt, add shadow + lighting gradient + slight blur
tmp = os.path.join(OUT, '_p1')
subprocess.run(['pdftoppm', '-r', '110', '-f', '1', '-l', '1', '-png', pdf_path, tmp], check=True)
page = Image.open(tmp + '-1.png').convert('RGB')
os.remove(tmp + '-1.png')
bg = Image.new('RGB', (page.width + 240, page.height + 200), (122, 104, 86))  # wooden table tone
noise = Image.effect_noise(bg.size, 18).convert('L')
bg = Image.composite(bg, Image.new('RGB', bg.size, (104, 88, 72)), noise)
shadow = Image.new('L', bg.size, 0)
ImageDraw.Draw(shadow).rectangle([132, 118, 132 + page.width, 118 + page.height], fill=150)
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
bg.paste((40, 30, 20), mask=shadow)
rot = page.rotate(-3.2, expand=True, fillcolor=(0, 0, 0))
mask = page.convert('L').point(lambda p: 255).rotate(-3.2, expand=True, fillcolor=0)
bg.paste(rot, (110, 90), mask)
# uneven lighting
grad = Image.linear_gradient('L').resize(bg.size).point(lambda v: int(v * 0.7))
bg = Image.composite(ImageEnhance.Brightness(bg).enhance(0.86), bg, grad)
bg = bg.filter(ImageFilter.GaussianBlur(0.6))
photo_path = os.path.join(OUT, 'sample-discharge-photo.jpg')
bg.save(photo_path, quality=80)
print('wrote', photo_path, bg.size)
