// Deterministic safety rules applied AFTER the AI reconciles.
// The model proposes; this code makes sure the hard rules from the PRD always hold.

const norm = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const squash = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const STATUSES = ['CONTINUE', 'DOSE_CHANGED', 'NEW', 'STOP', 'POSSIBLE_DUPLICATE', 'ASK_DOCTOR'];

const sameSalt = (a, b) => a && b && (norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a)));
const realClass = (c) => c && !/supplement|unknown|vitamin/i.test(c);

export function enforceRules({ result, extracted, home, summaryText }) {
  const items = Array.isArray(result.items) ? result.items.map((x) => ({ ...x })) : [];
  const stopped = extracted.stopped_medicines || [];
  const discharge = extracted.discharge_medicines || [];
  const summary = squash(summaryText || '');

  for (const it of items) {
    if (!STATUSES.includes(it.status)) it.status = 'ASK_DOCTOR';
    it.rule_notes = [];

    // Rule 1: STOP only when the summary explicitly stops it.
    if (it.status === 'STOP') {
      const explicit = stopped.some((s) => sameSalt(s.salt || s.name, it.salt || it.display_name)) || /stop|discontinu|replace|withdraw|बंद/i.test(it.source_quote || '');
      if (!explicit) {
        it.status = 'ASK_DOCTOR';
        it.needs_clarification = true;
        it.rule_notes.push('Changed from Stop: the summary does not explicitly stop this medicine.');
      }
    }

    // Rule 2: a home medicine absent from the summary is never Continue/Stop by inference.
    const fromHomeOnly = it.home_entry && !it.discharge_entry;
    const inDischarge = discharge.some((d) => sameSalt(d.salt || d.name, it.salt));
    const inStopped = stopped.some((s) => sameSalt(s.salt || s.name, it.salt));
    if (fromHomeOnly && !inDischarge && !inStopped && !['ASK_DOCTOR', 'POSSIBLE_DUPLICATE'].includes(it.status)) {
      it.rule_notes.push(`Changed from ${it.status}: not mentioned in the discharge summary.`);
      it.status = 'ASK_DOCTOR';
      it.needs_clarification = true;
    }

    // Rule 3: same drug class in discharge list (different salt, no explicit stop) => possible duplicate.
    if (fromHomeOnly && !inStopped && realClass(it.drug_class)) {
      const clash = discharge.find((d) => realClass(d.drug_class) && norm(d.drug_class) === norm(it.drug_class) && !sameSalt(d.salt, it.salt));
      if (clash && it.status !== 'POSSIBLE_DUPLICATE') {
        it.rule_notes.push(`Same drug class (${it.drug_class}) as ${clash.name || clash.salt} on the discharge list.`);
        it.status = 'POSSIBLE_DUPLICATE';
        it.needs_clarification = true;
        it.related_to = it.related_to || clash.name || clash.salt;
      }
    }

    // Rule 4: low confidence on a home-only item goes to the doctor.
    if (it.confidence === 'low' && fromHomeOnly && it.status !== 'POSSIBLE_DUPLICATE') {
      it.status = 'ASK_DOCTOR';
      it.needs_clarification = true;
    }

    // Rule 5: verify the quoted source line really appears in the summary (text input only).
    if (summary && it.source_quote && !/^home list/i.test(it.source_quote)) {
      const q = squash(it.source_quote).replace(/^\d+\.\s*/, '');
      it.quote_verified = q.length > 6 && summary.includes(q);
    }

    if (it.needs_clarification && !it.doctor_question) {
      it.doctor_question = `Please confirm: should ${it.display_name} be continued, stopped or changed after discharge?`;
    }
  }

  // Rule 6: every medicine from either list must appear exactly once.
  for (const d of discharge) {
    if (!items.some((it) => sameSalt(it.salt, d.salt || d.name) && it.discharge_entry)) {
      if (items.some((it) => sameSalt(it.salt, d.salt || d.name))) continue;
      items.push({
        display_name: d.name, salt: d.salt, strength: d.strength, drug_class: d.drug_class || null, status: 'NEW',
        home_entry: null, discharge_entry: d.source_quote || d.name, dose_pattern: d.dose_pattern, timing: d.timing,
        course_days: d.course_days, home_stock: 0, reason_en: 'On the discharge list only.', reason_hi: 'केवल डिस्चार्ज सूची में है।',
        source_quote: d.source_quote, confidence: 'medium', needs_clarification: false, doctor_question: null, rule_notes: ['Added by safety check: the AI missed this medicine.'],
      });
    }
  }
  for (const h of home) {
    const covered = items.some((it) => (it.home_entry && norm(it.home_entry).includes(norm(h.name))) || (h.salt && sameSalt(it.salt, h.salt) && it.home_entry));
    if (!covered) {
      items.push({
        display_name: h.name, salt: h.salt || null, strength: h.strength || null, drug_class: h.drug_class || null, status: 'ASK_DOCTOR',
        home_entry: `${h.name} · ${h.dose || ''}`, discharge_entry: null, dose_pattern: h.dose, timing: null, course_days: null,
        home_stock: h.stock || 0, reason_en: 'At home but not matched to the discharge summary. Confirm with the doctor.',
        reason_hi: 'घर पर है पर डिस्चार्ज सारांश से मेल नहीं खाई। डॉक्टर से पूछें।', source_quote: `Home list: ${h.name}`,
        confidence: 'low', needs_clarification: true, doctor_question: `Should ${h.name} continue after discharge? It is not mentioned in the summary.`,
        rule_notes: ['Added by safety check: the AI missed this home medicine.'],
      });
    }
  }

  return { ...result, items };
}
