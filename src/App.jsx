import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from './i18n.js';
import { CATALOGUE } from '../shared/catalogue.js';
import { SAMPLE_SUMMARY, SAMPLE_HOME, SAMPLE_OUTPUT } from '../shared/sample.js';
import { STATUS_META, buildCart, buildSchedule, addDays, fmtDate, isOnHold } from '../shared/plan.js';

const STEPS = ['landing', 'summary', 'home', 'processing', 'plan', 'clarify', 'cart', 'done'];

export default function App() {
  const [step, setStep] = useState('landing');
  const [lang, setLang] = useState('en');
  const [summary, setSummary] = useState({ mode: 'upload', text: '', file: null, isSample: false });
  const [home, setHome] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preferGeneric, setPreferGeneric] = useState(true);
  const [slot, setSlot] = useState(null);
  const [consultBooked, setConsultBooked] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [toast, setToast] = useState(null);
  const L = (k) => t(lang, k);

  useEffect(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [step]);
  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const startSample = () => {
    setSummary({ mode: 'paste', text: SAMPLE_SUMMARY, file: null, isSample: true });
    setHome(SAMPLE_HOME.map((h) => ({ ...h })));
    setStep('summary');
  };

  const reset = () => {
    setStep('landing');
    setSummary({ mode: 'upload', text: '', file: null, isSample: false });
    setHome([]);
    setResult(null);
    setError(null);
    setSlot(null);
    setConsultBooked(false);
    setOrderId(null);
  };

  const runReconcile = async () => {
    setStep('processing');
    setError(null);
    setResult(null);
    try {
      const body = { home };
      if (summary.mode === 'paste') body.summaryText = summary.text;
      else if (summary.file) body.file = { mime: summary.file.mime, data: summary.file.data };
      const r = await fetch('/api/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({ error: 'Unexpected server response.' }));
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setResult(j);
    } catch (e) {
      setError(e.message);
    }
  };

  const useCached = () => {
    setResult({ ...SAMPLE_OUTPUT, meta: { source: 'cached' } });
    setError(null);
  };

  return (
    <div className="shell">
      <div className="phone">
        <Header lang={lang} setLang={setLang} step={step} onHome={reset} L={L} />
        <main className="content">
          {step === 'landing' && <Landing L={L} onSample={startSample} onUpload={() => setStep('summary')} />}
          {step === 'summary' && <SummaryStep L={L} summary={summary} setSummary={setSummary} onBack={() => setStep('landing')} onNext={() => setStep('home')} />}
          {step === 'home' && <HomeStep L={L} home={home} setHome={setHome} onBack={() => setStep('summary')} onNext={runReconcile} />}
          {step === 'processing' && (
            <Processing L={L} done={!!result} error={error} isSample={summary.isSample} onRetry={runReconcile} onCached={useCached} onBack={() => setStep('home')} onFinish={() => setStep('plan')} />
          )}
          {step === 'plan' && result && <PlanStep L={L} lang={lang} result={result} onClarify={() => setStep('clarify')} onCart={() => setStep('cart')} />}
          {step === 'clarify' && result && <ClarifyStep L={L} lang={lang} result={result} flash={flash} onBack={() => setStep('plan')} onNext={() => setStep('cart')} />}
          {step === 'cart' && result && (
            <CartStep
              L={L} lang={lang} result={result} preferGeneric={preferGeneric} setPreferGeneric={setPreferGeneric}
              slot={slot} setSlot={setSlot} consultBooked={consultBooked} setConsultBooked={setConsultBooked}
              onBack={() => setStep(result.items.some((i) => isOnHold(i.status)) ? 'clarify' : 'plan')}
              onOrder={() => { setOrderId('HB' + Math.floor(100000 + Math.random() * 899999)); setStep('done'); }}
            />
          )}
          {step === 'done' && result && <DoneStep L={L} lang={lang} result={result} orderId={orderId} slot={slot} consultBooked={consultBooked} onReset={reset} />}
        </main>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </div>
  );
}

function Header({ lang, setLang, step, onHome, L }) {
  const idx = STEPS.indexOf(step);
  return (
    <header className="topbar">
      <div className="brandrow">
        <button className="brand" onClick={onHome} aria-label="Start over">
          <span className="logo" aria-hidden>
            <svg viewBox="0 0 32 32" width="28" height="28"><rect width="32" height="32" rx="8" fill="#FF6F61" /><path d="M8 17l8-7 8 7v7H8z" fill="#fff" /><path d="M14 19h4v5h-4z" fill="#FF6F61" /></svg>
          </span>
          <span>
            <b>HomeBridge</b>
            <small>{L('tagline')}</small>
          </span>
        </button>
        <button className="langbtn" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>{L('lang')}</button>
      </div>
      {idx > 0 && (
        <div className="progress" aria-hidden>
          <div style={{ width: `${(idx / (STEPS.length - 1)) * 100}%` }} />
        </div>
      )}
    </header>
  );
}

function Landing({ L, onSample, onUpload }) {
  return (
    <section className="screen">
      <div className="banner warn small">{L('demoBanner')}</div>
      <div className="hero">
        <h1>{L('heroTitle')}</h1>
        <p>{L('heroBody')}</p>
      </div>
      <ul className="benefits">
        <li><span>⚠</span>{L('b1')}</li>
        <li><span>❝</span>{L('b2')}</li>
        <li><span>🛒</span>{L('b3')}</li>
      </ul>
      <div className="stack">
        <button className="btn primary big" onClick={onSample}>{L('trySample')}</button>
        <button className="btn ghost big" onClick={onUpload}>{L('uploadOwn')}</button>
      </div>
      <p className="fineprint">{L('concept')}</p>
    </section>
  );
}

async function fileToPayload(file) {
  const isImage = /^image\//.test(file.type);
  if (isImage) {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(file);
    });
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    return { name: file.name, mime: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl, size: Math.round(dataUrl.length * 0.75) };
  }
  const buf = await file.arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { name: file.name, mime: file.type || 'application/pdf', data: btoa(bin), preview: null, size: file.size };
}

function SummaryStep({ L, summary, setSummary, onBack, onNext }) {
  const inputRef = useRef();
  const [err, setErr] = useState(null);
  const onFile = async (f) => {
    setErr(null);
    if (!f) return;
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type)) return setErr('Use a PDF, JPG or PNG file.');
    if (f.type === 'application/pdf' && f.size > 4 * 1024 * 1024) return setErr('PDF is over 4 MB. Try a photo or paste the text.');
    const p = await fileToPayload(f);
    setSummary({ ...summary, mode: 'upload', file: p, isSample: /sample/i.test(f.name) });
  };
  const ready = summary.mode === 'paste' ? summary.text.trim().length > 40 : !!summary.file;
  return (
    <section className="screen">
      <h2>{L('s1Title')}</h2>
      <p className="muted">{L('s1Sub')}</p>
      <div className="seg">
        <button className={summary.mode === 'upload' ? 'on' : ''} onClick={() => setSummary({ ...summary, mode: 'upload' })}>{L('upload')}</button>
        <button className={summary.mode === 'paste' ? 'on' : ''} onClick={() => setSummary({ ...summary, mode: 'paste' })}>{L('paste')}</button>
      </div>
      {summary.mode === 'upload' ? (
        <div className="drop" onClick={() => inputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files[0])} />
          {summary.file ? (
            <div className="filechip">
              {summary.file.preview ? <img src={summary.file.preview} alt="" /> : <span className="pdf">PDF</span>}
              <div>
                <b>{summary.file.name}</b>
                <small>{Math.round(summary.file.size / 1024)} KB · tap to change</small>
              </div>
            </div>
          ) : (
            <>
              <div className="dropicon">⬆</div>
              <b>{L('chooseFile')}</b>
              <small>PDF, JPG or PNG · up to 4 MB</small>
            </>
          )}
        </div>
      ) : (
        <textarea className="paste" rows={12} placeholder={L('pastePh')} value={summary.text} onChange={(e) => setSummary({ ...summary, text: e.target.value, isSample: false })} />
      )}
      {err && <div className="banner danger small">{err}</div>}
      <button className="link" onClick={() => setSummary({ mode: 'paste', text: SAMPLE_SUMMARY, file: null, isSample: true })}>{L('useSample')}</button>
      <p className="fineprint left">
        {L('sampleFiles')} <a href="/samples/sample-discharge-summary.pdf" download>PDF</a> · <a href="/samples/sample-discharge-photo.jpg" download>phone photo</a>
      </p>
      <div className="navrow">
        <button className="btn ghost" onClick={onBack}>{L('back')}</button>
        <button className="btn primary" disabled={!ready} onClick={onNext}>{L('next')}</button>
      </div>
    </section>
  );
}

function HomeStep({ L, home, setHome, onBack, onNext }) {
  const [draft, setDraft] = useState({ name: '', dose: '', stock: '' });
  const add = () => {
    if (!draft.name.trim()) return;
    setHome([...home, { name: draft.name.trim(), dose: draft.dose.trim() || '1-0-0', stock: Number(draft.stock) || 0 }]);
    setDraft({ name: '', dose: '', stock: '' });
  };
  const update = (i, k, v) => setHome(home.map((h, j) => (j === i ? { ...h, [k]: k === 'stock' ? Number(v) || 0 : v } : h)));
  return (
    <section className="screen">
      <h2>{L('s2Title')}</h2>
      <p className="muted">{L('s2Sub')}</p>
      {home.length === 0 && (
        <>
          <button className="link" onClick={() => setHome(SAMPLE_HOME.map((h) => ({ ...h })))}>{L('loadSampleHome')}</button>
          <p className="fineprint left">{L('noHome')}</p>
        </>
      )}
      <ul className="medlist">
        {home.map((h, i) => (
          <li key={i} className="medrow">
            <span className="pill" aria-hidden>💊</span>
            <input className="mname" value={h.name} onChange={(e) => update(i, 'name', e.target.value)} aria-label="Medicine" />
            <input className="mdose" value={h.dose} onChange={(e) => update(i, 'dose', e.target.value)} aria-label="Dose" />
            <input className="mstock" type="number" min="0" value={h.stock} onChange={(e) => update(i, 'stock', e.target.value)} aria-label="Tablets left" />
            <button className="x" onClick={() => setHome(home.filter((_, j) => j !== i))} aria-label={`Remove ${h.name}`}>×</button>
          </li>
        ))}
      </ul>
      <div className="addrow">
        <input list="brands" placeholder={L('medName')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input placeholder={L('dose')} value={draft.dose} onChange={(e) => setDraft({ ...draft, dose: e.target.value })} />
        <input type="number" min="0" placeholder={L('stock')} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
        <button className="btn small" onClick={add}>{L('add')}</button>
        <datalist id="brands">{CATALOGUE.map((c) => <option key={c.id} value={c.brand} />)}</datalist>
      </div>
      <div className="navrow">
        <button className="btn ghost" onClick={onBack}>{L('back')}</button>
        <button className="btn primary" onClick={onNext}>✨ {L('reconcile')}</button>
      </div>
    </section>
  );
}

function Processing({ L, done, error, isSample, onRetry, onCached, onBack, onFinish }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1800);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (done) {
      setTick(4);
      const id = setTimeout(onFinish, 700);
      return () => clearTimeout(id);
    }
  }, [done]);
  const steps = ['st1', 'st2', 'st3', 'st4'];
  const active = done ? 4 : Math.min(tick, 3);
  return (
    <section className="screen center">
      <h2>{L('s3Title')}</h2>
      {!error && (
        <ul className="steps">
          {steps.map((s, i) => (
            <li key={s} className={i < active ? 'done' : i === active ? 'active' : ''}>
              <span className="dot">{i < active ? '✓' : i === active ? <span className="spin" /> : i + 1}</span>
              {L(s)}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div className="errorbox">
          <b>{L('failTitle')}</b>
          <p>{error}</p>
          <div className="stack">
            <button className="btn primary" onClick={onRetry}>{L('retry')}</button>
            {isSample && <button className="btn ghost" onClick={onCached}>{L('useCached')}</button>}
            <button className="link" onClick={onBack}>{L('back')}</button>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status, lang }) {
  const m = STATUS_META[status] || STATUS_META.ASK_DOCTOR;
  return <span className={`badge ${m.tone}`}><i>{m.icon}</i>{m[lang] || m.en}</span>;
}

function MedCard({ it, lang, L }) {
  const [open, setOpen] = useState(it.status === 'POSSIBLE_DUPLICATE' || it.status === 'STOP');
  const reason = lang === 'hi' ? it.reason_hi || it.reason_en : it.reason_en;
  return (
    <article className={`card tone-${(STATUS_META[it.status] || {}).tone}`}>
      <button className="cardhead" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <b>{it.display_name}</b>
          <small>{[it.salt, it.strength, it.drug_class].filter(Boolean).join(' · ')}</small>
        </div>
        <StatusBadge status={it.status} lang={lang} />
      </button>
      <p className="reason">{reason}</p>
      <div className="compare">
        <div><small>{L('home')}</small><span>{it.home_entry || '—'}</span></div>
        <div className="arrow">→</div>
        <div><small>{L('hospital')}</small><span>{it.discharge_entry || '—'}</span></div>
      </div>
      {open && (
        <div className="sourcebox">
          <small>
            {L('source')}
            {it.quote_verified && <em className="ok"> ✓ {L('verified')}</em>}
            <em className={`conf ${it.confidence}`}> · {it.confidence} {L('confidence')}</em>
          </small>
          <code>{it.source_quote || '—'}</code>
          {it.rule_notes?.length > 0 && <small className="rulenote">🛡 {it.rule_notes.join(' ')}</small>}
        </div>
      )}
      {!open && <button className="link tiny" onClick={() => setOpen(true)}>{L('source')} ▾</button>}
    </article>
  );
}

function PlanStep({ L, lang, result, onClarify, onCart }) {
  const items = [...result.items].sort((a, b) => (STATUS_META[a.status]?.order ?? 9) - (STATUS_META[b.status]?.order ?? 9));
  const flagged = items.filter((i) => isOnHold(i.status));
  const counts = Object.keys(STATUS_META).map((s) => [s, items.filter((i) => i.status === s).length]).filter(([, n]) => n);
  return (
    <section className="screen">
      <div className="titlerow">
        <h2>{L('s4Title')}</h2>
        <SourceTag meta={result.meta} L={L} />
      </div>
      <div className="patient">
        <b>{result.patient_label || 'Patient'}</b>
        <small>{[result.hospital, `${L('discharged')} ${fmtDate(result.discharge_date, lang)}`].filter(Boolean).join(' · ')}</small>
      </div>
      {flagged.length > 0 && (
        <button className="banner danger alertbtn" onClick={onClarify}>
          <b>⚠ {flagged.length} {flagged.length === 1 ? L('alertsTitle') : L('alertsTitleMany')}</b>
          <span>{flagged.map((f) => f.display_name).join(', ')} →</span>
        </button>
      )}
      <div className="chips">
        {counts.map(([s, n]) => <span key={s} className={`chip ${STATUS_META[s].tone}`}>{STATUS_META[s][lang]} {n}</span>)}
      </div>
      {items.map((it, i) => <MedCard key={i} it={it} lang={lang} L={L} />)}
      <div className="navrow sticky">
        {flagged.length > 0 ? (
          <button className="btn primary wide" onClick={onClarify}>{L('resolve')} ({flagged.length})</button>
        ) : (
          <button className="btn primary wide" onClick={onCart}>{L('toCart')}</button>
        )}
      </div>
    </section>
  );
}

function SourceTag({ meta, L }) {
  if (!meta) return null;
  return meta.source === 'live' ? (
    <span className="srctag live" title={`${meta.model} · ${(meta.ms / 1000).toFixed(1)}s`}>● {L('live')}</span>
  ) : (
    <span className="srctag cached">{L('cached')}</span>
  );
}

function ClarifyStep({ L, lang, result, flash, onBack, onNext }) {
  const flagged = result.items.filter((i) => isOnHold(i.status));
  const [copied, setCopied] = useState(null);
  const q = (it) => (lang === 'hi' ? it.doctor_question_hi || it.doctor_question : it.doctor_question);
  const all = flagged.map((it, i) => `${i + 1}. ${q(it)}`).join('\n');
  const wa = `https://wa.me/?text=${encodeURIComponent(`Questions about ${result.patient_label || 'my father'}'s discharge medicines:\n${all}`)}`;
  const copy = async (text, i) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <section className="screen">
      <h2>{L('s5Title')}</h2>
      <p className="muted">{L('s5Sub')}</p>
      {flagged.map((it, i) => (
        <article key={i} className={`card tone-${STATUS_META[it.status].tone}`}>
          <div className="cardhead static">
            <b>{it.display_name}</b>
            <StatusBadge status={it.status} lang={lang} />
          </div>
          <blockquote className="question">{q(it)}</blockquote>
          <button className="btn small ghost" onClick={() => copy(q(it), i)}>{copied === i ? `✓ ${L('copied')}` : L('copy')}</button>
        </article>
      ))}
      <p className="fineprint left">{L('onHoldNote')}</p>
      <div className="stack">
        <a className="btn whatsapp" href={wa} target="_blank" rel="noreferrer">{L('whatsapp')}</a>
        <button className="btn ghost" onClick={() => flash(L('pharmacistToast'))}>📞 {L('pharmacist')}</button>
      </div>
      <div className="navrow">
        <button className="btn ghost" onClick={onBack}>{L('back')}</button>
        <button className="btn primary" onClick={onNext}>{L('toCart')}</button>
      </div>
    </section>
  );
}

function slotOptions(dueIso) {
  if (!dueIso) return [];
  return [0, 1].flatMap((d) => ['07:00–09:00', '09:00–11:00'].map((time) => ({ date: addDays(dueIso, d), time })));
}

function CartStep({ L, lang, result, preferGeneric, setPreferGeneric, slot, setSlot, consultBooked, setConsultBooked, onBack, onOrder }) {
  const lines = useMemo(() => buildCart(result.items, preferGeneric), [result, preferGeneric]);
  const total = lines.reduce((s, l) => s + (l.price || 0), 0);
  const lab = result.follow_ups.find((f) => f.type === 'lab_test');
  const visit = result.follow_ups.find((f) => f.type === 'doctor_visit');
  const labDue = lab ? addDays(result.discharge_date, lab.due_in_days) : null;
  const visitDue = visit ? addDays(result.discharge_date, visit.due_in_days) : null;
  return (
    <section className="screen">
      <h2>{L('s6Title')}</h2>
      <p className="muted">{L('s6Sub')}</p>
      <label className="toggle">
        <input type="checkbox" checked={preferGeneric} onChange={(e) => setPreferGeneric(e.target.checked)} />
        <span />
        {L('generic')}
      </label>
      {lines.length === 0 && <div className="banner ok small">{L('nothingToBuy')}</div>}
      <ul className="cart">
        {lines.map((l, i) => (
          <li key={i}>
            <div className="cartmain">
              <b>{l.chosen ? l.chosen.brand : l.item.display_name}</b>
              <small>
                {l.item.salt} {l.item.strength} · <StatusBadge status={l.item.status} lang={lang} />
              </small>
              {l.buy != null && (
                <small className="calc">
                  {L('need')} {l.need} {L('tabs')}{l.have ? ` − ${L('have')} ${l.have}` : ''} = {L('buy')} {l.buy}
                  {l.chosen ? ` → ${l.strips} ${L('strips')} × ${l.chosen.pack_size}` : ''}
                </small>
              )}
              {l.note && <small className="warnnote">{l.note}</small>}
            </div>
            <div className="price">{l.price ? `₹${l.price}` : '—'}</div>
          </li>
        ))}
      </ul>
      {lines.length > 0 && (
        <div className="totalrow"><span>{L('total')}</span><b>₹{total}</b></div>
      )}

      {(lab || visit) && <h3>{L('followUps')}</h3>}
      {lab && (
        <article className="card">
          <div className="cardhead static">
            <div><b>🧪 {lab.name}</b><small>{L('due')} {fmtDate(labDue, lang)} · day {lab.due_in_days}</small></div>
          </div>
          <code className="mini">{lab.source_quote}</code>
          <small className="muted">{L('pickSlot')}</small>
          <div className="slots">
            {slotOptions(labDue).map((s, i) => (
              <button key={i} className={slot && slot.date === s.date && slot.time === s.time ? 'on' : ''} onClick={() => setSlot(s)}>
                {fmtDate(s.date, lang)}<br /><small>{s.time}</small>
              </button>
            ))}
          </div>
        </article>
      )}
      {visit && (
        <article className="card">
          <div className="cardhead static">
            <div><b>🩺 {visit.name}</b><small>{L('due')} {fmtDate(visitDue, lang)} · day {visit.due_in_days}</small></div>
            <button className={`btn small ${consultBooked ? 'okbtn' : 'ghost'}`} onClick={() => setConsultBooked(!consultBooked)}>{consultBooked ? `✓ ${L('booked')}` : L('bookConsult')}</button>
          </div>
        </article>
      )}
      <div className="navrow sticky">
        <button className="btn ghost" onClick={onBack}>{L('back')}</button>
        <button className="btn primary" onClick={onOrder}>{L('placeOrder')}{total ? ` · ₹${total}` : ''}</button>
      </div>
    </section>
  );
}

function DoneStep({ L, lang, result, orderId, slot, consultBooked, onReset }) {
  const sched = buildSchedule(result.items);
  const stops = result.items.filter((i) => i.status === 'STOP');
  const holds = result.items.filter((i) => isOnHold(i.status));
  const flags = lang === 'hi' && result.red_flags_hi?.length ? result.red_flags_hi : result.red_flags;
  const diet = lang === 'hi' && result.diet_activity_hi?.length ? result.diet_activity_hi : result.diet_activity;
  return (
    <section className="screen printable">
      <div className="success">
        <div className="tick">✓</div>
        <h2>{L('s7Title')}</h2>
        <p>{L('orderDone')} · #{orderId}</p>
        {slot && <small>🧪 {fmtDate(slot.date, lang)} {slot.time}</small>}
        {consultBooked && <small>🩺 {L('booked')}</small>}
      </div>
      <h3>{L('schedule')}</h3>
      <div className="schedule">
        {['morning', 'afternoon', 'night'].map((s) => (
          <div key={s} className="slotcol">
            <b>{s === 'morning' ? '🌅' : s === 'afternoon' ? '☀️' : '🌙'} {L(s)}</b>
            {sched[s].length === 0 && <small className="muted">—</small>}
            {sched[s].map((x, i) => (
              <div key={i} className="dose">
                <span>{x.item.display_name}</span>
                <small>{x.qty > 1 ? `${x.qty} tabs · ` : ''}{x.item.timing || ''}</small>
              </div>
            ))}
          </div>
        ))}
      </div>
      {stops.length > 0 && (
        <>
          <h3>{L('removeBox')}</h3>
          <ul className="plainlist stoplist">{stops.map((s, i) => <li key={i}>✕ {s.display_name}</li>)}</ul>
        </>
      )}
      {holds.length > 0 && (
        <>
          <h3>{L('onHold')}</h3>
          <ul className="plainlist holdlist">{holds.map((s, i) => <li key={i}>⏸ {s.display_name}</li>)}</ul>
        </>
      )}
      {flags?.length > 0 && (
        <div className="banner danger">
          <b>🚑 {L('redFlags')}</b>
          <ul>{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
      {diet?.length > 0 && (
        <>
          <h3>{L('diet')}</h3>
          <ul className="plainlist">{diet.map((d, i) => <li key={i}>• {d}</li>)}</ul>
        </>
      )}
      <div className="stack noprint">
        <button className="btn primary" onClick={() => window.print()}>{L('download')}</button>
        <button className="btn ghost" onClick={onReset}>{L('startOver')}</button>
      </div>
      <p className="fineprint">{L('concept')}</p>
    </section>
  );
}
