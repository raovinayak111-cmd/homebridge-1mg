import { optionsFor } from './catalogue.js';

export const STATUS_META = {
  POSSIBLE_DUPLICATE: { en: 'Possible duplicate', hi: 'संभावित डुप्लिकेट', tone: 'danger', icon: '⚠', order: 0 },
  ASK_DOCTOR: { en: 'Ask doctor', hi: 'डॉक्टर से पूछें', tone: 'warn', icon: '?', order: 1 },
  STOP: { en: 'Stop', hi: 'बंद करें', tone: 'stop', icon: '✕', order: 2 },
  DOSE_CHANGED: { en: 'Dose changed', hi: 'खुराक बदली', tone: 'info', icon: '↕', order: 3 },
  NEW: { en: 'New', hi: 'नई दवा', tone: 'new', icon: '+', order: 4 },
  CONTINUE: { en: 'Continue', hi: 'जारी रखें', tone: 'ok', icon: '✓', order: 5 },
};

export function unitsPerDay(pattern) {
  if (!pattern) return null;
  const parts = String(pattern)
    .replace(/½/g, '0.5')
    .split(/[-–]/)
    .map((p) => parseFloat(p.trim()));
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((a, b) => a + b, 0);
}

export const isToGive = (s) => s === 'NEW' || s === 'DOSE_CHANGED' || s === 'CONTINUE';
export const isOnHold = (s) => s === 'ASK_DOCTOR' || s === 'POSSIBLE_DUPLICATE';

// Build the cart: only what is missing for the course.
export function buildCart(items, preferGeneric) {
  const lines = [];
  for (const it of items) {
    if (!isToGive(it.status)) continue;
    const perDay = unitsPerDay(it.dose_pattern);
    const days = it.course_days;
    const options = optionsFor(it.salt, it.strength);
    if (!perDay || !days) {
      lines.push({ item: it, needs: null, buy: null, options, chosen: null, note: 'Dose or duration not specified. Confirm with the pharmacist.' });
      continue;
    }
    const need = Math.ceil(perDay * days);
    const have = it.status === 'CONTINUE' ? Number(it.home_stock || 0) : 0;
    const buy = Math.max(0, need - have);
    if (buy === 0) continue;
    if (!options.length) {
      lines.push({ item: it, need, have, buy, options, chosen: null, note: 'Not in the demo catalogue.' });
      continue;
    }
    const branded = options.find((o) => !o.is_generic);
    const chosen = preferGeneric ? options[0] : branded || options[0];
    const strips = Math.ceil(buy / chosen.pack_size);
    lines.push({ item: it, need, have, buy, options, chosen, strips, price: strips * chosen.price_inr, hasGeneric: options.some((o) => o.is_generic) });
  }
  return lines;
}

const SLOT_NAMES = ['morning', 'afternoon', 'night'];

export function buildSchedule(items) {
  const slots = { morning: [], afternoon: [], night: [] };
  for (const it of items) {
    if (!isToGive(it.status) || !it.dose_pattern) continue;
    const parts = String(it.dose_pattern).split(/[-–]/).map((p) => parseFloat(p.replace('½', '0.5')));
    parts.slice(0, 3).forEach((n, i) => {
      if (n > 0) slots[SLOT_NAMES[i]].push({ item: it, qty: n });
    });
  }
  return slots;
}

export function addDays(iso, days) {
  if (!iso || days == null) return null;
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso, lang = 'en') {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
