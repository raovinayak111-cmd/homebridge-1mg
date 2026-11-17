const P = {
  upload: <><path d="M12 15V4" /><path d="M7.5 8.5 12 4l4.5 4.5" /><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  file: <><path d="M14 3H6.5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V7.5z" /><path d="M14 3v4.5h4.5" /><path d="M8.5 12.5h7M8.5 16h5" /></>,
  camera: <><path d="M4 8h3l1.8-2.5h6.4L17 8h3v11H4z" /><circle cx="12" cy="13.2" r="3.3" /></>,
  text: <><path d="M5 6h14M5 10h14M5 14h10M5 18h7" /></>,
  pill: <><path d="M10.6 3.9a4.9 4.9 0 0 1 6.9 6.9l-6.7 6.7a4.9 4.9 0 0 1-6.9-6.9z" /><path d="m7.3 7.3 6.9 6.9" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7.5" /></>,
  alert: <><path d="M12 4 21 20H3z" /><path d="M12 10v4.2M12 17.2v.3" /></>,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6M12 16.8v.3" /></>,
  x: <><path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M6 12h12" /></>,
  dose: <><path d="M8 20V5M4.5 8.5 8 5l3.5 3.5M16 4v15M12.5 15.5 16 19l3.5-3.5" /></>,
  same: <><path d="M5 9.5h14M5 14.5h14" /></>,
  flask: <><path d="M9 3h6M10 3v6.2l-5 8.6A2.1 2.1 0 0 0 6.8 21h10.4a2.1 2.1 0 0 0 1.8-3.2l-5-8.6V3" /><path d="M7.3 15h9.4" /></>,
  steth: <><path d="M6 3v6a4 4 0 0 0 8 0V3" /><path d="M10 13v2a5 5 0 0 0 10 0v-2.3" /><circle cx="20" cy="10.7" r="2" /></>,
  chat: <><path d="M4 20 5.4 16A8 8 0 1 1 8.1 18.6z" /></>,
  phone: <><path d="M5.2 4h3.6l1.8 4.6-2.3 1.5a11 11 0 0 0 5.6 5.6l1.5-2.3 4.6 1.8v3.6a1 1 0 0 1-1 1.1A16 16 0 0 1 4.1 5.1 1 1 0 0 1 5.2 4z" /></>,
  print: <><path d="M7 8V3.5h10V8" /><path d="M6.5 17H4V9h16v8h-2.5" /><path d="M7 13.5h10V21H7z" /></>,
  sunrise: <><path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 5v3.5M5.4 10.4l1.8 1.4M18.6 10.4l-1.8 1.4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <><path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" /></>,
  chevron: <><path d="m9 6 6 6-6 6" /></>,
  chevdown: <><path d="m6 9 6 6 6-6" /></>,
  back: <><path d="m15 6-6 6 6 6" /></>,
  shield: <><path d="M12 3 19.5 6v5.5c0 4.6-3.2 7.8-7.5 9.5-4.3-1.7-7.5-4.9-7.5-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  box: <><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>,
  spark: <><path d="M12 3.5 13.7 9 19 10.7 13.7 12.4 12 18 10.3 12.4 5 10.7 10.3 9z" /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  ambulance: <><path d="M3 16.5V7h11v9.5M14 10h4l3 3.5v3h-2" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /><path d="M8.5 9.5v4M6.5 11.5h4" /></>,
  leaf: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19 13 11" /></>,
  github: <><path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0C6.6 2.1 5.6 2.4 5.6 2.4a4.5 4.5 0 0 0-.1 3.3 4.8 4.8 0 0 0-1.3 3.3c0 4.8 3 5.9 5.8 6.2a3 3 0 0 0-.8 2.3V21" /></>,
};

export default function Icon({ name, size = 20, stroke = 1.8, className = '' }) {
  return (
    <svg className={`ico ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
