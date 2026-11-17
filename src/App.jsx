import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from './i18n.js';
import Icon from './Icon.jsx';
import { CATALOGUE } from '../shared/catalogue.js';
import { SAMPLE_SUMMARY, SAMPLE_HOME, SAMPLE_OUTPUT } from '../shared/sample.js';
import { STATUS_META, buildCart, buildSchedule, addDays, fmtDate, isOnHold } from '../shared/plan.js';

const FLOW = ['summary', 'home', 'processing', 'plan', 'clarify', 'cart', 'done'];
const DOTS = ['summary', 'home', 'plan', 'clarify', 'cart', 'done'];
const STATUS_ICON = { POSSIBLE_DUPLICATE: 'alert', ASK_DOCTOR: 'question', STOP: 'x', DOSE_CHANGED: 'dose', NEW: 'plus', CONTINUE: 'same' };
const PILL_COLORS = ['#0B6E64', '#C2410C', '#4338CA', '#B45309', '#BE185D', '#0369A1', '#4D7C0F', '#7C3AED', '#A16207', '#0F766E'];

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
  const scroller = useRef();
  const L = (k, v) => t(lang, k, v);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [step]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
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
      const j = await r.json().catch(() => ({ error: 'The server sent an unexpected response.' }));
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setResult(j);
    } catch (e) {
      setError(e.message);
    }
  };

  const colorOf = useMemo(() => {
    const map = new Map();
    (result?.items || []).forEach((it, i) => map.set(it.display_name, PILL_COLORS[i % PILL_COLORS.length]));
    return (name) => map.get(name) || PILL_COLORS[0];
  }, [result]);

  const pos = DOTS.indexOf(step === 'processing' ? 'home' : step);
  const ctx = { L, lang, result, colorOf };

  return (
    <div className="stage">
      <Rail />
      <div className="device">
        <div className="app" lang={lang === 'hi' ? 'hi' : 'en'}>
          <header className="bar">
            <button className="mark" onClick={reset} aria-label="HomeBridge, start again">
              <Logo />
              <span className="mark-text">
                <b>HomeBridge</b>
                <small>{L('appTag')}</small>
              </span>
            </button>
            <button className="lang" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>{L('langOther')}</button>
          </header>
          {pos >= 0 && (
            <div className="track" role="progressbar" aria-valuemin={1} aria-valuemax={DOTS.length} aria-valuenow={pos + 1} aria-label={L('stepOf', { n: pos + 1, t: DOTS.length })}>
              {DOTS.map((s, i) => <span key={s} className={i < pos ? 'done' : i === pos ? 'on' : ''} />)}
            </div>
          )}
          <main className="scroll" ref={scroller}>
            {step === 'landing' && <Landing {...ctx} onSample={startSample} onUpload={() => setStep('summary')} />}
            {step === 'summary' && <SummaryStep {...ctx} summary={summary} setSummary={setSummary} onBack={reset} onNext={() => setStep('home')} />}
            {step === 'home' && <HomeStep {...ctx} home={home} setHome={setHome} onBack={() => setStep('summary')} onNext={runReconcile} />}
            {step === 'processing' && (
              <Processing {...ctx} done={!!result} error={error} isSample={summary.isSample} onRetry={runReconcile}
                onCached={() => { setResult({ ...SAMPLE_OUTPUT, meta: { source: 'cached' } }); setError(null); }}
                onBack={() => setStep('home')} onFinish={() => setStep('plan')} />
            )}
            {step === 'plan' && result && <PlanStep {...ctx} onClarify={() => setStep('clarify')} onCart={() => setStep('cart')} />}
            {step === 'clarify' && result && <ClarifyStep {...ctx} flash={flash} onBack={() => setStep('plan')} onNext={() => setStep('cart')} />}
            {step === 'cart' && result && (
              <CartStep {...ctx} preferGeneric={preferGeneric} setPreferGeneric={setPreferGeneric} slot={slot} setSlot={setSlot}
                consultBooked={consultBooked} setConsultBooked={setConsultBooked}
                onBack={() => setStep(result.items.some((i) => isOnHold(i.status)) ? 'clarify' : 'plan')}
                onOrder={() => { setOrderId('HB-' + Math.floor(100000 + Math.random() * 899999)); setStep('done'); }} />
            )}
            {step === 'done' && result && <DoneStep {...ctx} orderId={orderId} slot={slot} consultBooked={consultBooked} onReset={reset} />}
          </main>
          {toast && <div className="toast" role="status">{toast}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- brand ---------- */

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#0B6E64" />
      <path d="M8 27c4-9 20-9 24 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13 27v-4.5M20 27v-6.5M27 27v-4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 29.5h28" stroke="#9FE3D6" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Rail() {
  return (
    <aside className="rail">
      <div className="rail-in">
        <span className="concept">Concept prototype for Tata 1mg</span>
        <h1 className="rail-title">HomeBridge</h1>
        <p className="rail-lede">
          Families leave hospital with a discharge summary that quietly changes the medicines already at home. HomeBridge uses AI to reconcile the two lists, catch duplicates and gaps, and turn the result into a 1mg order and a booked follow-up test.
        </p>
        <h2 className="rail-h">How the AI works</h2>
        <ol className="pipeline">
          <li><b>Read</b><span>Gemini extracts every medicine, stop instruction and follow-up from the PDF, photo or text, keeping the exact source line.</span></li>
          <li><b>Match</b><span>Code maps brand names to salts and drug families using the catalogue.</span></li>
          <li><b>Reconcile</b><span>Gemini compares both lists and explains each decision in English and Hindi.</span></li>
          <li><b>Guard</b><span>Safety rules run last: nothing is stopped without a written instruction, and same-family drugs are always flagged.</span></li>
        </ol>
        <p className="rail-foot">All data is synthetic. The patient, hospital and prices are fictional. Not an official 1mg product.</p>
        <a className="rail-link" href="https://github.com/raovinayak111-cmd/homebridge-1mg" target="_blank" rel="noreferrer"><Icon name="github" size={16} />Source on GitHub</a>
      </div>
    </aside>
  );
}

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 340 150" role="img" aria-label="A discharge summary and a home pill box joined by a bridge">
      <g transform="translate(14 14) rotate(-4 50 60)">
        <rect width="98" height="122" rx="8" fill="#fff" stroke="#C9D6D2" />
        <path d="M8 0h82a8 8 0 0 1 8 8v14H0V8a8 8 0 0 1 8-8z" fill="#1F4E79" />
        <rect x="10" y="8" width="44" height="5" rx="2.5" fill="#fff" opacity=".9" />
        {[34, 44, 54, 64, 74].map((y, i) => (
          <g key={y}>
            <circle cx="14" cy={y + 2} r="2.2" fill={['#B42318', '#0B6E64', '#6941C6', '#175CD3', '#0B6E64'][i]} />
            <rect x="20" y={y} width={[52, 60, 44, 58, 40][i]} height="4" rx="2" fill="#9AAAA6" />
          </g>
        ))}
        <rect x="10" y="90" width="34" height="4" rx="2" fill="#475467" />
        <rect x="10" y="99" width="62" height="4" rx="2" fill="#DCE3E1" />
        <rect x="10" y="108" width="48" height="4" rx="2" fill="#DCE3E1" />
      </g>
      <path d="M118 96C150 40 196 40 226 96" fill="none" stroke="#0B6E64" strokeWidth="3" strokeLinecap="round" />
      <path d="M112 100h120" stroke="#0E1B2C" strokeWidth="3" strokeLinecap="round" />
      {[138, 155, 172, 189, 206].map((x, i) => <path key={x} d={`M${x} 100V${[77, 64, 58, 63, 76][i]}`} stroke="#0B6E64" strokeWidth="2" strokeLinecap="round" />)}
      <g className="hero-pill">
        <rect x="160" y="40" width="24" height="11" rx="5.5" fill="#fff" stroke="#0E1B2C" strokeWidth="1.6" />
        <path d="M172 41v9" stroke="#0E1B2C" strokeWidth="1.6" />
        <path d="M172 41.2h6.5a4.3 4.3 0 0 1 0 8.6H172z" fill="#C2410C" />
      </g>
      <g transform="translate(234 40)">
        <rect width="92" height="74" rx="12" fill="#fff" stroke="#C9D6D2" />
        <path d="M12 0h68a12 12 0 0 1 12 12v4H0v-4A12 12 0 0 1 12 0z" fill="#E3F2EF" />
        {[0, 1, 2].map((c) => <rect key={c} x={8 + c * 27} y="22" width="22" height="44" rx="6" fill="#F3F7F6" stroke="#DCE3E1" />)}
        <circle cx="19" cy="34" r="4.5" fill="#0B6E64" /><circle cx="19" cy="45" r="4.5" fill="#C2410C" /><circle cx="19" cy="56" r="4.5" fill="#4338CA" />
        <circle cx="73" cy="34" r="4.5" fill="#B45309" /><circle cx="73" cy="45" r="4.5" fill="#0369A1" />
      </g>
    </svg>
  );
}

/* ---------- screens ---------- */

function Landing({ L, onSample, onUpload }) {
  return (
    <section className="screen landing">
      <HeroArt />
      <h1 className="display">{L('heroTitle')}</h1>
      <p className="lede">{L('heroBody')}</p>
      <ol className="how">
        <li><span className="how-n">1</span><div><b>{L('how1')}</b><small>{L('how1b')}</small></div></li>
        <li><span className="how-n">2</span><div><b>{L('how2')}</b><small>{L('how2b')}</small></div></li>
        <li><span className="how-n">3</span><div><b>{L('how3')}</b><small>{L('how3b')}</small></div></li>
      </ol>
      <div className="cta-stack">
        <button className="btn btn-primary btn-lg" onClick={onSample}><Icon name="spark" size={18} />{L('trySample')}</button>
        <button className="btn btn-quiet btn-lg" onClick={onUpload}>{L('uploadOwn')}</button>
      </div>
      <p className="note"><Icon name="shield" size={16} />{L('demoNote')}</p>
    </section>
  );
}

async function fileToPayload(file) {
  if (/^image\//.test(file.type)) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    return { name: file.name, mime: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl, size: Math.round(dataUrl.length * 0.75) };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { name: file.name, mime: file.type || 'application/pdf', data: btoa(bin), preview: null, size: file.size };
}

function SummaryStep({ L, summary, setSummary, onBack, onNext }) {
  const inputRef = useRef();
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const onFile = async (f, isSample = false) => {
    setErr(null);
    if (!f) return;
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type)) return setErr('Use a PDF, JPG or PNG file.');
    if (f.type === 'application/pdf' && f.size > 4 * 1024 * 1024) return setErr('This PDF is over 4 MB. Upload a photo of the pages or paste the text instead.');
    const p = await fileToPayload(f);
    setSummary({ ...summary, mode: 'upload', file: p, isSample });
  };

  const loadSampleFile = async (path, name, type) => {
    setLoading(true);
    try {
      const b = await fetch(path).then((r) => r.blob());
      await onFile(new File([b], name, { type }), true);
    } finally {
      setLoading(false);
    }
  };

  const ready = summary.mode === 'paste' ? summary.text.trim().length > 40 : !!summary.file;

  return (
    <section className="screen">
      <h2 className="title">{L('s1Title')}</h2>
      <p className="sub">{L('s1Sub')}</p>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={summary.mode === 'upload'} className={summary.mode === 'upload' ? 'on' : ''} onClick={() => setSummary({ ...summary, mode: 'upload' })}><Icon name="upload" size={16} />{L('upload')}</button>
        <button role="tab" aria-selected={summary.mode === 'paste'} className={summary.mode === 'paste' ? 'on' : ''} onClick={() => setSummary({ ...summary, mode: 'paste' })}><Icon name="text" size={16} />{L('paste')}</button>
      </div>

      {summary.mode === 'upload' ? (
        <div
          className={`drop ${summary.file ? 'has' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
        >
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files[0])} />
          {summary.file ? (
            <div className="filecard">
              {summary.file.preview ? <img src={summary.file.preview} alt="Preview of the uploaded summary" /> : <span className="pdfthumb"><Icon name="file" size={26} />PDF</span>}
              <div>
                <b>{summary.file.name}</b>
                <small>{Math.round(summary.file.size / 1024)} KB</small>
                <span className="linkish">{L('change')}</span>
              </div>
            </div>
          ) : (
            <>
              <span className="drop-ico"><Icon name="camera" size={24} /></span>
              <b>{L('chooseFile')}</b>
              <small>{L('chooseHint')}</small>
            </>
          )}
        </div>
      ) : (
        <textarea className="paste" rows={12} placeholder={L('pastePh')} value={summary.text} onChange={(e) => setSummary({ ...summary, text: e.target.value, isSample: false })} />
      )}
      {err && <p className="inline-error"><Icon name="alert" size={16} />{err}</p>}

      <div className="samples">
        <span>{L('samplesLead')}</span>
        <div className="sample-row">
          <button className="chip-btn" onClick={() => setSummary({ mode: 'paste', text: SAMPLE_SUMMARY, file: null, isSample: true })}><Icon name="text" size={15} />{L('sText')}</button>
          <button className="chip-btn" disabled={loading} onClick={() => loadSampleFile('/samples/sample-discharge-summary.pdf', 'sample-discharge-summary.pdf', 'application/pdf')}><Icon name="file" size={15} />{L('sPdf')}</button>
          <button className="chip-btn" disabled={loading} onClick={() => loadSampleFile('/samples/sample-discharge-photo.jpg', 'sample-discharge-photo.jpg', 'image/jpeg')}><Icon name="camera" size={15} />{L('sPhoto')}</button>
        </div>
      </div>

      <div className="dock">
        <button className="btn btn-quiet" onClick={onBack}><Icon name="back" size={18} />{L('back')}</button>
        <button className="btn btn-primary grow" disabled={!ready} onClick={onNext}>{L('next')}</button>
      </div>
    </section>
  );
}

const parseDose = (d) => {
  const p = String(d || '0-0-0').split('-').map((x) => parseFloat(x) || 0);
  return [p[0] || 0, p[1] || 0, p[2] || 0];
};

function HomeStep({ L, home, setHome, onBack, onNext }) {
  const [name, setName] = useState('');
  const add = () => {
    if (!name.trim()) return;
    setHome([...home, { name: name.trim(), dose: '1-0-0', stock: 10 }]);
    setName('');
  };
  const update = (i, patch) => setHome(home.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const cycle = (i, slotIdx) => {
    const d = parseDose(home[i].dose);
    d[slotIdx] = (d[slotIdx] + 1) % 3;
    update(i, { dose: d.join('-') });
  };
  const slots = [['sunrise', L('morningS')], ['sun', L('noonS')], ['moon', L('nightS')]];

  return (
    <section className="screen">
      <h2 className="title">{L('s2Title')}</h2>
      <p className="sub">{L('s2Sub')}</p>

      {home.length === 0 && (
        <div className="empty">
          <Icon name="box" size={28} />
          <p>{L('emptyHome')}</p>
          <button className="btn btn-soft" onClick={() => setHome(SAMPLE_HOME.map((h) => ({ ...h })))}>{L('loadSampleHome')}</button>
        </div>
      )}

      <ul className="box-list">
        {home.map((h, i) => {
          const d = parseDose(h.dose);
          return (
            <li key={i} className="strip">
              <div className="strip-top">
                <span className="strip-ico"><Icon name="pill" size={18} /></span>
                <input className="strip-name" value={h.name} onChange={(e) => update(i, { name: e.target.value })} aria-label="Medicine name" />
                <button className="icon-btn" onClick={() => setHome(home.filter((_, j) => j !== i))} aria-label={`${L('remove')} ${h.name}`}><Icon name="x" size={16} /></button>
              </div>
              <div className="strip-bottom">
                <div className="dose-toggles" role="group" aria-label="Dose">
                  {slots.map(([ic, label], s) => (
                    <button key={s} className={d[s] ? 'on' : ''} onClick={() => cycle(i, s)} aria-label={`${label}: ${d[s]}`} title={label}>
                      <Icon name={ic} size={15} />
                      <span>{d[s]}</span>
                    </button>
                  ))}
                </div>
                <div className="stepper">
                  <button onClick={() => update(i, { stock: Math.max(0, (h.stock || 0) - 1) })} aria-label="One fewer tablet"><Icon name="minus" size={14} /></button>
                  <input type="number" min="0" value={h.stock} onChange={(e) => update(i, { stock: Number(e.target.value) || 0 })} aria-label="Tablets left" />
                  <button onClick={() => update(i, { stock: (h.stock || 0) + 1 })} aria-label="One more tablet"><Icon name="plus" size={14} /></button>
                  <small>{L('left')}</small>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="adder">
        <input list="brands" placeholder={L('medPh')} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label={L('medPh')} />
        <button className="btn btn-soft" onClick={add} disabled={!name.trim()}><Icon name="plus" size={16} />{L('add')}</button>
        <datalist id="brands">{CATALOGUE.map((c) => <option key={c.id} value={c.brand} />)}</datalist>
      </div>

      <div className="dock">
        <button className="btn btn-quiet" onClick={onBack}><Icon name="back" size={18} />{L('back')}</button>
        <button className="btn btn-primary grow" onClick={onNext}><Icon name="spark" size={18} />{L('reconcile')}</button>
      </div>
    </section>
  );
}

function Processing({ L, done, error, isSample, onRetry, onCached, onBack, onFinish }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(onFinish, 650);
    return () => clearTimeout(id);
  }, [done]);
  const active = done ? 4 : [0, 4, 9, 14].filter((x) => secs >= x).length - 1;
  const steps = ['st1', 'st2', 'st3', 'st4'];

  return (
    <section className="screen processing">
      <div className="scan" aria-hidden="true">
        <div className="scan-sheet">
          {[70, 88, 62, 80, 54, 76, 90, 58, 66].map((w, i) => <span key={i} style={{ width: `${w}%` }} />)}
          {!error && <i className="scan-line" />}
        </div>
      </div>
      <h2 className="title center">{error ? L('failTitle') : L('s3Title')}</h2>
      {!error && (
        <>
          <ol className="progress-list">
            {steps.map((s, i) => (
              <li key={s} className={i < active ? 'done' : i === active ? 'on' : ''}>
                <span className="pl-dot">{i < active ? <Icon name="check" size={14} stroke={2.4} /> : i === active ? <span className="spinner" /> : null}</span>
                {L(s)}
              </li>
            ))}
          </ol>
          <p className="wait"><Icon name="clock" size={15} /><span><b>{secs}s.</b> {L('waitHint')}</span></p>
        </>
      )}
      {error && (
        <div className="error-card">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={onRetry}>{L('retry')}</button>
          {isSample && <button className="btn btn-soft" onClick={onCached}>{L('useCached')}</button>}
          <button className="btn btn-quiet" onClick={onBack}>{L('back')}</button>
        </div>
      )}
    </section>
  );
}

function StatusTag({ status, lang }) {
  const m = STATUS_META[status] || STATUS_META.ASK_DOCTOR;
  return <span className={`tag t-${m.tone}`}><Icon name={STATUS_ICON[status]} size={13} stroke={2.3} />{m[lang] || m.en}</span>;
}

function MedCard({ it, L, lang, colorOf, prominent }) {
  const [open, setOpen] = useState(false);
  const m = STATUS_META[it.status] || STATUS_META.ASK_DOCTOR;
  const reason = lang === 'hi' ? it.reason_hi || it.reason_en : it.reason_en;
  const isHome = /^home list/i.test(it.source_quote || '');
  return (
    <article className={`med ${prominent ? 'med-prom' : ''} m-${m.tone}`}>
      <header className="med-head">
        <span className="swatch" style={{ background: colorOf(it.display_name) }} aria-hidden="true" />
        <div className="med-name">
          <h4>{it.display_name}</h4>
          <small>{[it.salt, it.drug_class].filter(Boolean).join(', ')}</small>
        </div>
        <StatusTag status={it.status} lang={lang} />
      </header>
      <p className="med-reason">{reason}</p>
      <div className="delta">
        <div className={it.home_entry ? '' : 'nil'}><small>{L('before')}</small><span>{it.home_entry || L('notAtHome')}</span></div>
        <Icon name="chevron" size={16} className="delta-arrow" />
        <div className={it.discharge_entry || it.status === 'STOP' ? '' : 'nil'}><small>{L('now')}</small><span>{it.status === 'STOP' ? m[lang] : it.discharge_entry || L('notListed')}</span></div>
      </div>
      <button className="source-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name={open ? 'chevdown' : 'chevron'} size={14} />{open ? L('hideSource') : L('showSource')}
        <span className={`conf c-${it.confidence || 'medium'}`}>{L(`conf_${it.confidence || 'medium'}`)}</span>
      </button>
      {open && (
        <div className="source">
          <q>{it.source_quote}</q>
          {(isHome || it.quote_verified) && <small>{isHome ? L('fromHome') : <><Icon name="check" size={13} stroke={2.4} />{L('found')}</>}</small>}
          {it.rule_notes?.length > 0 && <small className="guard"><Icon name="shield" size={13} />{it.rule_notes.join(' ')}</small>}
        </div>
      )}
    </article>
  );
}

const titleCase = (s = '') => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : s);

function PlanStep({ L, lang, result, colorOf, onClarify, onCart }) {
  const items = result.items;
  const attention = items.filter((i) => isOnHold(i.status)).sort((a, b) => STATUS_META[a.status].order - STATUS_META[b.status].order);
  const changed = items.filter((i) => ['STOP', 'DOSE_CHANGED', 'NEW'].includes(i.status)).sort((a, b) => STATUS_META[a.status].order - STATUS_META[b.status].order);
  const same = items.filter((i) => i.status === 'CONTINUE');
  const order = ['POSSIBLE_DUPLICATE', 'ASK_DOCTOR', 'STOP', 'DOSE_CHANGED', 'NEW', 'CONTINUE'];
  const counts = order.map((s) => [s, items.filter((i) => i.status === s).length]).filter(([, n]) => n);
  const live = result.meta?.source === 'live';

  return (
    <section className="screen">
      <div className="plan-head">
        <h2 className="title">{L('s4Title')}</h2>
        <span className={`src ${live ? 'src-live' : ''}`} title={result.meta?.model ? `${result.meta.model}, ${(result.meta.ms / 1000).toFixed(1)}s` : ''}>
          {live && <i />}{live ? L('live') : L('cached')}
        </span>
      </div>
      <p className="sub">
        {result.patient_label || 'Patient'}. {L('dischargedOn')} {fmtDate(result.discharge_date, lang)}{result.hospital ? `, ${titleCase(result.hospital)}` : ''}.
      </p>

      <div className="ledger">
        <p className="ledger-n">{L('checkedN', { n: items.length })}</p>
        <div className="ledger-bar" role="img" aria-label={counts.map(([s, n]) => `${STATUS_META[s].en} ${n}`).join(', ')}>
          {counts.map(([s, n], i) => <span key={s} className={`seg-${STATUS_META[s].tone}`} style={{ flexGrow: n, animationDelay: `${i * 90}ms` }} />)}
        </div>
        <ul className="ledger-key">
          {counts.map(([s, n]) => <li key={s}><i className={`dot-${STATUS_META[s].tone}`} />{STATUS_META[s][lang]}<b>{n}</b></li>)}
        </ul>
      </div>

      {attention.length > 0 && (
        <div className="group group-alert">
          <h3 className="group-h"><Icon name="alert" size={18} />{L('secAttention')}</h3>
          {attention.map((it, i) => <MedCard key={i} it={it} L={L} lang={lang} colorOf={colorOf} prominent />)}
        </div>
      )}

      {changed.length > 0 && (
        <div className="group">
          <h3 className="group-h">{L('secChanged')}</h3>
          {changed.map((it, i) => <MedCard key={i} it={it} L={L} lang={lang} colorOf={colorOf} />)}
        </div>
      )}

      {same.length > 0 && (
        <div className="group">
          <h3 className="group-h">{L('secSame')}</h3>
          {same.map((it, i) => <MedCard key={i} it={it} L={L} lang={lang} colorOf={colorOf} />)}
        </div>
      )}

      <div className="dock">
        {attention.length > 0 ? (
          <button className="btn btn-primary grow" onClick={onClarify}><Icon name="steth" size={18} />{L('askAbout', { n: attention.length })}</button>
        ) : (
          <button className="btn btn-primary grow" onClick={onCart}>{L('toCart')}</button>
        )}
      </div>
    </section>
  );
}

function ClarifyStep({ L, lang, result, colorOf, flash, onBack, onNext }) {
  const flagged = result.items.filter((i) => isOnHold(i.status));
  const [copied, setCopied] = useState(null);
  const q = (it) => (lang === 'hi' ? it.doctor_question_hi || it.doctor_question : it.doctor_question);
  const all = flagged.map((it, i) => `${i + 1}. ${q(it)}`).join('\n');
  const wa = `https://wa.me/?text=${encodeURIComponent(`Questions about ${result.patient_label || 'the patient'}'s discharge medicines:\n${all}`)}`;
  const copy = async (text, i) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <section className="screen">
      <h2 className="title">{L('s5Title')}</h2>
      <p className="sub">{L('s5Sub')}</p>
      <ol className="questions">
        {flagged.map((it, i) => (
          <li key={i} className="question">
            <div className="q-head">
              <span className="swatch" style={{ background: colorOf(it.display_name) }} />
              <b>{it.display_name}</b>
              <StatusTag status={it.status} lang={lang} />
            </div>
            <p>{q(it)}</p>
            <button className="mini" onClick={() => copy(q(it), i)}><Icon name={copied === i ? 'check' : 'copy'} size={14} />{copied === i ? L('copied') : L('copy')}</button>
          </li>
        ))}
      </ol>
      <div className="cta-stack">
        <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={18} />{L('whatsapp')}</a>
        <button className="btn btn-soft" onClick={() => flash(L('pharmacistToast'))}><Icon name="phone" size={18} />{L('pharmacist')}</button>
      </div>
      <div className="dock">
        <button className="btn btn-quiet" onClick={onBack}><Icon name="back" size={18} />{L('back')}</button>
        <button className="btn btn-primary grow" onClick={onNext}>{L('toCart')}</button>
      </div>
    </section>
  );
}

function slotOptions(dueIso) {
  if (!dueIso) return [];
  return [0, 1].flatMap((d) => ['7–9 am', '9–11 am'].map((time) => ({ date: addDays(dueIso, d), time })));
}

function CartStep({ L, lang, result, colorOf, preferGeneric, setPreferGeneric, slot, setSlot, consultBooked, setConsultBooked, onBack, onOrder }) {
  const lines = useMemo(() => buildCart(result.items, preferGeneric), [result, preferGeneric]);
  const sum = (ls) => ls.reduce((s, l) => s + (l.price || 0), 0);
  const saving = useMemo(() => sum(buildCart(result.items, false)) - sum(buildCart(result.items, true)), [result]);
  const total = sum(lines);
  const lab = result.follow_ups.find((f) => f.type === 'lab_test');
  const visit = result.follow_ups.find((f) => f.type === 'doctor_visit');
  const labDue = lab ? addDays(result.discharge_date, lab.due_in_days) : null;
  const visitDue = visit ? addDays(result.discharge_date, visit.due_in_days) : null;

  return (
    <section className="screen">
      <h2 className="title">{L('s6Title')}</h2>
      <p className="sub">{L('s6Sub')}</p>

      {saving > 0 && (
        <label className="switch-row">
          <span>
            <b>{L('generic')}</b>
            <small>{preferGeneric ? L('genericOn', { x: saving }) : L('genericSave', { x: saving })}</small>
          </span>
          <input type="checkbox" checked={preferGeneric} onChange={(e) => setPreferGeneric(e.target.checked)} />
          <i className="switch" aria-hidden="true" />
        </label>
      )}

      {lines.length === 0 ? (
        <p className="empty-line">{L('nothingToBuy')}</p>
      ) : (
        <ul className="cart">
          {lines.map((l, i) => (
            <li key={i}>
              <span className="pack" style={{ '--c': colorOf(l.item.display_name) }} aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
              <div className="cart-main">
                <b>{l.chosen ? l.chosen.brand : l.item.display_name}</b>
                {l.chosen && <small>{L('stripsOf', { n: l.strips, p: l.chosen.pack_size })}</small>}
                {l.buy != null && <small className="calc">{L('need', { n: l.need })}{l.have ? `, ${L('have', { n: l.have })}` : ''}</small>}
                {l.note && <small className="warn-note">{l.note.startsWith('Dose') ? L('noteMissing') : L('noteCatalog')}</small>}
              </div>
              <div className="cart-side">
                <span className="price">{l.price ? `₹${l.price}` : ''}</span>
                <StatusTag status={l.item.status} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <div className="bill">
          <dl>
            <div><dt>{L('itemTotal')}</dt><dd>₹{total}</dd></div>
            <div><dt>{L('delivery')}</dt><dd className="free">{L('free')}</dd></div>
            <div className="bill-total"><dt>{L('toPay')}</dt><dd>₹{total}</dd></div>
          </dl>
          <p>{L('illus')}</p>
        </div>
      )}

      {(lab || visit) && <h3 className="group-h">{L('followUps')}</h3>}
      {lab && (
        <div className="followup">
          <div className="fu-head">
            <span className="fu-ico"><Icon name="flask" size={20} /></span>
            <div><b>{lab.name}</b><small>{L('due', { d: fmtDate(labDue, lang) })}</small></div>
          </div>
          <q className="fu-quote">{lab.source_quote}</q>
          <p className="fu-label">{L('pickSlot')}</p>
          <div className="slots">
            {slotOptions(labDue).map((s, i) => {
              const on = slot && slot.date === s.date && slot.time === s.time;
              return (
                <button key={i} className={on ? 'on' : ''} aria-pressed={!!on} onClick={() => setSlot(s)}>
                  <b>{fmtDate(s.date, lang).replace(/ \d{4}$/, '')}</b><small>{s.time}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {visit && (
        <div className="followup">
          <div className="fu-head">
            <span className="fu-ico"><Icon name="steth" size={20} /></span>
            <div><b>{visit.name}</b><small>{L('due', { d: fmtDate(visitDue, lang) })}</small></div>
            <button className={`btn btn-sm ${consultBooked ? 'btn-done' : 'btn-soft'}`} onClick={() => setConsultBooked(!consultBooked)}>
              {consultBooked ? <><Icon name="check" size={15} stroke={2.4} />{L('booked')}</> : L('bookConsult')}
            </button>
          </div>
        </div>
      )}

      <div className="dock dock-pay">
        <button className="btn btn-quiet square" onClick={onBack} aria-label={L('back')}><Icon name="back" size={18} /></button>
        <div className="pay-total"><small>{L('toPay')}</small><b>₹{total}</b></div>
        <button className="btn btn-primary grow" onClick={onOrder}>{L('placeOrder')}</button>
      </div>
    </section>
  );
}

function DoneStep({ L, lang, result, colorOf, orderId, slot, consultBooked, onReset }) {
  const sched = buildSchedule(result.items);
  const stops = result.items.filter((i) => i.status === 'STOP');
  const holds = result.items.filter((i) => isOnHold(i.status));
  const flags = lang === 'hi' && result.red_flags_hi?.length ? result.red_flags_hi : result.red_flags;
  const diet = lang === 'hi' && result.diet_activity_hi?.length ? result.diet_activity_hi : result.diet_activity;
  const visit = result.follow_ups.find((f) => f.type === 'doctor_visit');
  const compartments = [['morning', 'sunrise', L('morningS')], ['afternoon', 'sun', L('noonS')], ['night', 'moon', L('nightS')]];

  return (
    <section className="screen done">
      <div className="confirm">
        <span className="confirm-ico"><Icon name="check" size={26} stroke={2.6} /></span>
        <div>
          <h2 className="title">{L('s7Title')}</h2>
          <p className="sub">{L('orderNo', { id: orderId })}</p>
        </div>
      </div>
      {(slot || (consultBooked && visit)) && (
        <ul className="booked">
          {slot && <li><Icon name="flask" size={16} />{fmtDate(slot.date, lang)}, {slot.time}</li>}
          {consultBooked && visit && <li><Icon name="steth" size={16} />{visit.name}</li>}
        </ul>
      )}

      <div className="pillbox-wrap">
        <h3 className="group-h">{L('pillbox')}</h3>
        <p className="sub small">{L('pillboxSub')}</p>
        <div className="pillbox">
          {compartments.map(([key, ic, label]) => (
            <div key={key} className="compartment">
              <div className="comp-label"><Icon name={ic} size={18} /><span>{label}</span></div>
              <div className="comp-well">
                {sched[key].length === 0 && <span className="comp-empty">—</span>}
                {sched[key].map((x, i) => (
                  <span key={i} className="capsule" style={{ '--c': colorOf(x.item.display_name) }}>
                    <i aria-hidden="true" />
                    <span className="cap-text">
                      <span>{x.item.display_name}{x.qty > 1 && <b> ×{x.qty}</b>}</span>
                      {x.item.timing && <small>{x.item.timing}</small>}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {stops.length > 0 && (
        <div className="aside-list out">
          <h3 className="group-h"><Icon name="box" size={18} />{L('takeOut')}</h3>
          <ul>{stops.map((s, i) => <li key={i}>{(s.home_entry || s.display_name).split(' · ')[0]}</li>)}</ul>
        </div>
      )}
      {holds.length > 0 && (
        <div className="aside-list hold">
          <h3 className="group-h"><Icon name="question" size={18} />{L('onHold')}</h3>
          <ul>{holds.map((s, i) => <li key={i}>{s.display_name}</li>)}</ul>
        </div>
      )}
      {flags?.length > 0 && (
        <div className="emergency">
          <h3><Icon name="ambulance" size={20} />{L('redFlags')}</h3>
          <ul>{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
      {diet?.length > 0 && (
        <div className="aside-list care">
          <h3 className="group-h"><Icon name="leaf" size={18} />{L('diet')}</h3>
          <ul>{diet.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>
      )}
      <div className="cta-stack noprint">
        <button className="btn btn-primary" onClick={() => window.print()}><Icon name="print" size={18} />{L('print')}</button>
        <button className="btn btn-quiet" onClick={onReset}>{L('startOver')}</button>
      </div>
    </section>
  );
}
