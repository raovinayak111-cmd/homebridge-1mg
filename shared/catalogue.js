// Mock medicine catalogue for the HomeBridge prototype.
// Brand names are used only to make the demo realistic. PRICES ARE ILLUSTRATIVE, NOT REAL 1MG PRICES.

export const CATALOGUE = [
  { id: 'amlong5', brand: 'Amlong 5', salt: 'Amlodipine', strength: '5 mg', drug_class: 'Calcium channel blocker', pack_size: 15, price_inr: 60, is_generic: false },
  { id: 'amlodipine5g', brand: 'Amlodipine 5 (Generic)', salt: 'Amlodipine', strength: '5 mg', drug_class: 'Calcium channel blocker', pack_size: 15, price_inr: 18, is_generic: true },
  { id: 'glycomet500', brand: 'Glycomet 500', salt: 'Metformin', strength: '500 mg', drug_class: 'Biguanide', pack_size: 20, price_inr: 35, is_generic: false },
  { id: 'metformin1000a', brand: 'Metformin 1000 (Brand A)', salt: 'Metformin', strength: '1000 mg', drug_class: 'Biguanide', pack_size: 15, price_inr: 70, is_generic: false },
  { id: 'metformin1000g', brand: 'Metformin 1000 (Generic)', salt: 'Metformin', strength: '1000 mg', drug_class: 'Biguanide', pack_size: 15, price_inr: 30, is_generic: true },
  { id: 'atorva40', brand: 'Atorva 40', salt: 'Atorvastatin', strength: '40 mg', drug_class: 'Statin', pack_size: 15, price_inr: 250, is_generic: false },
  { id: 'atorvastatin40g', brand: 'Atorvastatin 40 (Generic)', salt: 'Atorvastatin', strength: '40 mg', drug_class: 'Statin', pack_size: 15, price_inr: 70, is_generic: true },
  { id: 'losar50', brand: 'Losar 50', salt: 'Losartan', strength: '50 mg', drug_class: 'ARB', pack_size: 10, price_inr: 90, is_generic: false },
  { id: 'telma40', brand: 'Telma 40', salt: 'Telmisartan', strength: '40 mg', drug_class: 'ARB', pack_size: 15, price_inr: 240, is_generic: false },
  { id: 'telmisartan40g', brand: 'Telmisartan 40 (Generic)', salt: 'Telmisartan', strength: '40 mg', drug_class: 'ARB', pack_size: 15, price_inr: 60, is_generic: true },
  { id: 'lasix40', brand: 'Lasix 40', salt: 'Furosemide', strength: '40 mg', drug_class: 'Loop diuretic', pack_size: 15, price_inr: 20, is_generic: false },
  { id: 'aldactone25', brand: 'Aldactone 25', salt: 'Spironolactone', strength: '25 mg', drug_class: 'Potassium-sparing diuretic', pack_size: 15, price_inr: 55, is_generic: false },
  { id: 'pan40', brand: 'Pan 40', salt: 'Pantoprazole', strength: '40 mg', drug_class: 'Proton pump inhibitor', pack_size: 15, price_inr: 160, is_generic: false },
  { id: 'pantoprazole40g', brand: 'Pantoprazole 40 (Generic)', salt: 'Pantoprazole', strength: '40 mg', drug_class: 'Proton pump inhibitor', pack_size: 15, price_inr: 40, is_generic: true },
  { id: 'ecosprin75', brand: 'Ecosprin 75', salt: 'Aspirin', strength: '75 mg', drug_class: 'Antiplatelet', pack_size: 14, price_inr: 5, is_generic: false },
  { id: 'shelcal500', brand: 'Shelcal 500', salt: 'Calcium + Vitamin D3', strength: '500 mg', drug_class: 'Supplement', pack_size: 15, price_inr: 120, is_generic: false },
  { id: 'glimepiride1', brand: 'Amaryl 1', salt: 'Glimepiride', strength: '1 mg', drug_class: 'Sulfonylurea', pack_size: 30, price_inr: 150, is_generic: false },
  { id: 'rosuvas10', brand: 'Rosuvas 10', salt: 'Rosuvastatin', strength: '10 mg', drug_class: 'Statin', pack_size: 15, price_inr: 280, is_generic: false },
  { id: 'clopilet75', brand: 'Clopilet 75', salt: 'Clopidogrel', strength: '75 mg', drug_class: 'Antiplatelet', pack_size: 15, price_inr: 110, is_generic: false },
  { id: 'thyronorm50', brand: 'Thyronorm 50', salt: 'Levothyroxine', strength: '50 mcg', drug_class: 'Thyroid hormone', pack_size: 100, price_inr: 180, is_generic: false },
];

const norm = (s = '') => String(s).toLowerCase().replace(/tab(let)?\.?\s/g, '').replace(/[^a-z0-9]/g, '');
const num = (s = '') => (String(s).match(/[\d.]+/) || [''])[0];

// Find a catalogue entry from a free-text brand or salt + strength.
export function matchCatalogue(name = '', strength = '') {
  const n = norm(name);
  if (!n) return null;
  // 1. exact brand
  let hit = CATALOGUE.find((c) => norm(c.brand) === n);
  if (hit) return hit;
  // 2. brand prefix (e.g. "Telma 40 tablet")
  hit = CATALOGUE.find((c) => n.startsWith(norm(c.brand)) || norm(c.brand).startsWith(n));
  if (hit) return hit;
  // 3. salt + strength
  const s = num(strength) || num(name);
  const bySalt = CATALOGUE.filter((c) => n.includes(norm(c.salt)) || norm(c.salt).includes(n.replace(/\d+/g, '')));
  if (bySalt.length) {
    const sameStrength = bySalt.filter((c) => num(c.strength) === s);
    const pool = sameStrength.length ? sameStrength : bySalt;
    return pool.find((c) => !c.is_generic) || pool[0];
  }
  return null;
}

// Purchasable options for a salt + strength, cheapest first.
export function optionsFor(salt, strength) {
  const s = num(strength);
  return CATALOGUE.filter((c) => norm(c.salt) === norm(salt) && (!s || num(c.strength) === s)).sort(
    (a, b) => a.price_inr / a.pack_size - b.price_inr / b.pack_size
  );
}
