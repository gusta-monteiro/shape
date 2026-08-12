# Gera shape.ics — agenda assinável no iPhone (Calendário > Adicionar Assinatura).
# Espelha a rotação do app: âncora 12/08/2026 = Treino C; treinos seg/ter/qua/sex/sáb 20h,
# descanso ativo qui/dom, check-in domingo 08:30. Rode de novo se a âncora mudar em data.js.
from datetime import date, timedelta
import os

ANCHOR = date(2026, 8, 12)          # quarta = Treino C
ANCHOR_IDX = 2
SEQ = ['A', 'B', 'C', 'D']
NAMES = {'A': 'Upper 1', 'B': 'Lower 1', 'C': 'Upper 2', 'D': 'Lower 2'}
TRAIN_WD = {0, 1, 2, 4, 5}          # Python: 0=seg ... 6=dom
END = date(2026, 12, 31)

PHASES = [
    (date(2026, 8, 12), 'Início — Cutting Bloco 1'),
    (date(2026, 10, 12), 'Início — Diet Break (dieta de estabilização)'),
    (date(2026, 10, 19), 'Início — Cutting Bloco 2'),
    (date(2026, 12, 14), 'Início — Estabilização'),
]

def is_train(d):
    return d.weekday() in TRAIN_WD

def fmt(d, h, m):
    return f"{d.strftime('%Y%m%d')}T{h:02d}{m:02d}00"

events = []

def add(uid, dtstart, dtend, summary, desc='', allday=False, alarm_min=None):
    ev = ['BEGIN:VEVENT', f'UID:{uid}@gusta-monteiro.github.io', f'DTSTAMP:20260812T120000Z']
    if allday:
        ev += [f'DTSTART;VALUE=DATE:{dtstart}', f'DTEND;VALUE=DATE:{dtend}']
    else:
        ev += [f'DTSTART;TZID=America/Sao_Paulo:{dtstart}', f'DTEND;TZID=America/Sao_Paulo:{dtend}']
    ev.append(f'SUMMARY:{summary}')
    if desc:
        ev.append(f'DESCRIPTION:{desc}')
    if alarm_min:
        ev += ['BEGIN:VALARM', 'ACTION:DISPLAY', f'TRIGGER:-PT{alarm_min}M', f'DESCRIPTION:{summary}', 'END:VALARM']
    ev.append('END:VEVENT')
    events.append('\r\n'.join(ev))

train_count = 0   # dias de treino desde a âncora (exclusivo)
rest_count = 0    # descansos desde 13/08 (inclusive na iteração)
d = ANCHOR
while d <= END:
    if is_train(d):
        idx = (ANCHOR_IDX + train_count) % 4
        letter = SEQ[idx]
        add(f'shape-treino-{d.isoformat()}', fmt(d, 20, 0), fmt(d, 21, 30),
            f'Treino {letter} — {NAMES[letter]}',
            'Descanso 90–180s. Detalhes no app: https://gusta-monteiro.github.io/shape/',
            alarm_min=30)
        train_count += 1
    else:
        proto = 'A' if rest_count % 2 == 0 else 'B'
        add(f'shape-descanso-{d.isoformat()}', fmt(d, 20, 0), fmt(d, 20, 45),
            f'Descanso Ativo — Abs {proto} + Pantu {proto} + Antebraço',
            'Descansos 30–45s. Detalhes no app: https://gusta-monteiro.github.io/shape/',
            alarm_min=30)
        rest_count += 1
        if d.weekday() == 6:  # domingo: check-in de manhã
            add(f'shape-checkin-{d.isoformat()}', fmt(d, 8, 30), fmt(d, 8, 45),
                'Check-in — Peso em jejum + Fotos',
                'Pesar em jejum, fotos frente/lado/costas. Registrar no app.',
                alarm_min=None)
    d += timedelta(days=1)

for pd, label in PHASES:
    add(f'shape-fase-{pd.isoformat()}', pd.strftime('%Y%m%d'),
        (pd + timedelta(days=1)).strftime('%Y%m%d'), label, allday=True)

cal = '\r\n'.join([
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//shape//treino-dieta//PT',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Shape — Treino & Dieta',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'BEGIN:VTIMEZONE', 'TZID:America/Sao_Paulo', 'BEGIN:STANDARD',
    'DTSTART:19700101T000000', 'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300',
    'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
    *events, 'END:VCALENDAR', ''])

out = os.path.join(os.path.dirname(__file__), '..', 'shape.ics')
with open(out, 'w', encoding='utf-8', newline='') as f:
    f.write(cal)
print('shape.ics:', cal.count('BEGIN:VEVENT'), 'eventos')
