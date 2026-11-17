// POST /api/reconcile
// Server-side only: the Gemini API key lives in the GEMINI_API_KEY environment variable and never reaches the browser.

import { matchCatalogue } from '../shared/catalogue.js';
import { enforceRules } from '../shared/rules.js';

const MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);
const MAX_BYTES = 4 * 1024 * 1024;
const hits = new Map(); // best-effort per-instance rate limit

const EXTRACT_PROMPT = `You extract structured data from a hospital discharge summary for a pharmacy app.
Return ONLY JSON with this shape:
{
 "is_discharge_summary": boolean,
 "patient_label": string|null, "hospital": string|null, "doctor": string|null,
 "discharge_date": "YYYY-MM-DD"|null,
 "diagnosis": [string],
 "discharge_medicines": [{"name": string, "salt": string, "strength": string|null, "dose_pattern": "e.g. 1-0-1"|null, "timing": string|null, "course_days": number|null, "source_quote": string}],
 "stopped_medicines": [{"name": string, "salt": string, "strength": string|null, "source_quote": string}],
 "follow_ups": [{"name": string, "type": "lab_test"|"doctor_visit"|"other", "due_in_days": number|null, "source_quote": string}],
 "red_flags": [string],
 "diet_activity": [string]
}
Rules:
- dose_pattern is morning-afternoon-night counts like 1-0-1. Convert OD=1-0-0 (morning), BD=1-0-1, TDS=1-1-1, HS/bedtime=0-0-1.
- "continue" with no duration: course_days = 30.
- source_quote must be copied VERBATIM from the document (one line).
- Never invent anything. Use null when a value is missing.
- If the document is not a discharge summary or prescription from a hospital, set is_discharge_summary=false and leave lists empty.`;

const RECONCILE_PROMPT = `You are a medication-reconciliation assistant for a pharmacy app. You do not give medical advice; you compare two lists and flag differences for a pharmacist and the family to verify.
Inputs: DISCHARGE (medicines on discharge + explicitly stopped medicines, from a hospital discharge summary) and HOME (medicines the family already has). Each item includes salt, strength and drug_class where known.
For EVERY medicine in DISCHARGE or HOME return exactly one item with one status:
- CONTINUE: same salt and same strength/dose in both lists (merge them into ONE item).
- DOSE_CHANGED: same salt, different strength or dose pattern (merge into ONE item).
- NEW: only on the discharge list.
- STOP: on the home list AND the summary explicitly stops/discontinues it.
- POSSIBLE_DUPLICATE: a home medicine with a DIFFERENT salt but the SAME drug_class as a discharge medicine, when the summary does not explicitly stop it.
- ASK_DOCTOR: a home medicine not mentioned in the summary at all, or anything unclear.
Hard rules: STOP only if explicitly stopped. A home medicine absent from the summary is ASK_DOCTOR (or POSSIBLE_DUPLICATE per the rule above). Never invent doses, durations or tests: use null. Copy source_quote verbatim from the summary; for home-only items use "Home list: <brand> · <dose>".
Write reasons for a worried family member: plain words, under 40 words, no jargon. reason_hi must be simple Hindi in Devanagari (medicine names may stay in English).
For POSSIBLE_DUPLICATE and ASK_DOCTOR write doctor_question (under 40 words, names the medicine and the reason) and doctor_question_hi.
Return ONLY JSON:
{"items":[{"display_name":string,"salt":string,"strength":string|null,"drug_class":string|null,"status":string,"home_entry":string|null,"discharge_entry":string|null,"dose_pattern":string|null,"timing":string|null,"course_days":number|null,"home_stock":number,"reason_en":string,"reason_hi":string,"source_quote":string,"confidence":"high"|"medium"|"low","needs_clarification":boolean,"doctor_question":string|null,"doctor_question_hi":string|null,"related_to":string|null}],
 "red_flags_hi":[string], "diet_activity_hi":[string]}
home_entry format: "<brand> · <dose_pattern>". home_stock = tablets at home for that item (0 if none). For CONTINUE/DOSE_CHANGED/NEW use the discharge dose_pattern, timing and course_days.`;

async function callGemini({ system, parts }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('GEMINI_API_KEY is not set on the server.'), { code: 'NO_KEY' });
  let lastErr;
  for (const model of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        lastErr = new Error(`Gemini ${model} ${r.status}: ${t.slice(0, 200)}`);
        if ([400, 404, 429, 500, 503].includes(r.status)) continue;
        throw lastErr;
      }
      const j = await r.json();
      const text = (j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      return { json: parseJson(text), model };
    } catch (e) {
      lastErr = e;
      if (e.code === 'NO_KEY') throw e;
    }
  }
  throw lastErr || new Error('All models failed');
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Model did not return JSON');
  }
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 30;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'local';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Try again in an hour or use the sample case.' });

  const started = Date.now();
  try {
    const { summaryText, file, home = [] } = req.body || {};
    if (!summaryText && !file) return res.status(400).json({ error: 'Add a discharge summary first.' });
    if (file && Math.ceil((file.data || '').length * 0.75) > MAX_BYTES) return res.status(413).json({ error: 'File is over 4 MB. Try a smaller photo or paste the text.' });
    if (file && !/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.mime || '')) return res.status(415).json({ error: 'Use a PDF, JPG or PNG file.' });

    // Step 1: extract the discharge summary
    const parts = [{ text: 'Extract this discharge summary.' }];
    if (summaryText) parts.push({ text: summaryText.slice(0, 30000) });
    if (file) parts.push({ inline_data: { mime_type: file.mime, data: file.data } });
    const { json: extracted, model } = await callGemini({ system: EXTRACT_PROMPT, parts });

    if (extracted.is_discharge_summary === false) {
      return res.status(422).json({ error: "This doesn't look like a discharge summary. Try another file or use the sample." });
    }

    // Step 2: normalise brands to salts with the catalogue (code, not AI)
    const enrich = (m) => {
      const c = matchCatalogue(m.name || m.salt, m.strength);
      return { ...m, salt: m.salt || c?.salt || null, strength: m.strength || c?.strength || null, drug_class: c?.drug_class || m.drug_class || null, catalogue_match: c ? c.brand : null };
    };
    extracted.discharge_medicines = (extracted.discharge_medicines || []).map((m) => {
      const c = matchCatalogue(m.salt || m.name, m.strength);
      return { ...m, drug_class: c?.drug_class || null };
    });
    extracted.stopped_medicines = (extracted.stopped_medicines || []).map((m) => {
      const c = matchCatalogue(m.salt || m.name, m.strength);
      return { ...m, drug_class: c?.drug_class || null };
    });
    const homeNorm = home
      .filter((h) => h && h.name)
      .slice(0, 25)
      .map((h) => enrich({ name: String(h.name).slice(0, 60), dose: String(h.dose || '').slice(0, 12), stock: Number(h.stock) || 0 }));

    // Step 3: reconcile + explain (AI)
    const payload = {
      DISCHARGE: { discharge_medicines: extracted.discharge_medicines, stopped_medicines: extracted.stopped_medicines },
      HOME: homeNorm.map((h) => ({ brand: h.name, salt: h.salt, strength: h.strength, drug_class: h.drug_class, dose_pattern: h.dose, tablets_at_home: h.stock, in_catalogue: !!h.catalogue_match })),
      RED_FLAGS: extracted.red_flags || [],
      DIET_ACTIVITY: extracted.diet_activity || [],
    };
    const { json: rec } = await callGemini({ system: RECONCILE_PROMPT, parts: [{ text: JSON.stringify(payload) }] });

    // Step 4: deterministic safety rules
    const checked = enforceRules({ result: rec, extracted, home: homeNorm, summaryText });

    return res.status(200).json({
      patient_label: extracted.patient_label,
      hospital: extracted.hospital,
      doctor: extracted.doctor,
      discharge_date: extracted.discharge_date,
      diagnosis: extracted.diagnosis || [],
      items: checked.items,
      follow_ups: extracted.follow_ups || [],
      red_flags: extracted.red_flags || [],
      red_flags_hi: rec.red_flags_hi || [],
      diet_activity: extracted.diet_activity || [],
      diet_activity_hi: rec.diet_activity_hi || [],
      meta: { source: 'live', model, ms: Date.now() - started },
    });
  } catch (e) {
    console.error(e);
    const noKey = e.code === 'NO_KEY';
    return res.status(noKey ? 503 : 502).json({ error: noKey ? 'AI is not configured on the server yet.' : 'The AI could not finish this time.', detail: String(e.message || e).slice(0, 300) });
  }
}
