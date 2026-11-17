// Fully synthetic demo case. Patient, hospital and doctor are fictional.

export const SAMPLE_SUMMARY = `SUNRISE MULTISPECIALITY HOSPITAL (fictional) - DISCHARGE SUMMARY
Patient: Ramesh K. (synthetic)   Age/Sex: 68/M   UHID: DEMO-0001
Admitted: 10-Nov-2026   Discharged: 14-Nov-2026
Consultant: Dr. A. Mehra (Cardiology, fictional)

Diagnosis: Acute decompensated heart failure (HFrEF, EF 35%).
Type 2 diabetes mellitus. Systemic hypertension.

Course in hospital: Admitted with breathlessness and pedal oedema.
Treated with IV diuretics. Symptoms improved.

Medications on discharge:
1. Tab Telmisartan 40 mg    1-0-0  after breakfast   x 30 days
2. Tab Furosemide 40 mg     1-0-0  morning           x 30 days
3. Tab Spironolactone 25 mg 1-0-0  after breakfast   x 30 days
4. Tab Metformin 1000 mg    1-0-1  after meals       x 30 days (dose increased)
5. Tab Atorvastatin 40 mg   0-0-1  bedtime           continue
6. Tab Pantoprazole 40 mg   1-0-0  before breakfast  x 14 days

Stopped: Tab Amlodipine 5 mg - discontinued.

Advice: Salt under 5 g/day. Fluid intake limited to 1.5 L/day.
Weigh daily at the same time.

Follow-up:
- KFT with serum electrolytes after 7 days.
- Review in Cardiology OPD after 10 days.

Return to emergency if: weight gain over 2 kg in 3 days,
increasing breathlessness, swelling of feet, fainting.`;

export const SAMPLE_HOME = [
  { name: 'Amlong 5', dose: '1-0-0', stock: 20 },
  { name: 'Glycomet 500', dose: '1-0-1', stock: 30 },
  { name: 'Atorva 40', dose: '0-0-1', stock: 10 },
  { name: 'Losar 50', dose: '1-0-0', stock: 15 },
  { name: 'Ecosprin 75', dose: '0-1-0', stock: 14 },
  { name: 'Shelcal 500', dose: '0-1-0', stock: 15 },
];

// Golden answer: what the AI should produce for the sample case.
// Used as a fallback if the live AI call fails, and as the test oracle.
export const SAMPLE_OUTPUT = {
  patient_label: 'Ramesh K. (synthetic), 68/M',
  hospital: 'Sunrise Multispeciality Hospital (fictional)',
  doctor: 'Dr. A. Mehra (Cardiology)',
  discharge_date: '2026-11-14',
  diagnosis: ['Acute decompensated heart failure (HFrEF, EF 35%)', 'Type 2 diabetes mellitus', 'Systemic hypertension'],
  items: [
    {
      display_name: 'Telmisartan 40 mg', salt: 'Telmisartan', strength: '40 mg', drug_class: 'ARB', status: 'NEW',
      home_entry: null, discharge_entry: 'Tab Telmisartan 40 mg 1-0-0 after breakfast x 30 days',
      dose_pattern: '1-0-0', timing: 'after breakfast', course_days: 30, home_stock: 0,
      reason_en: 'New blood-pressure and heart medicine started in hospital. Losar 50 at home belongs to the same drug family, so check the duplicate alert before giving both.',
      reason_hi: 'अस्पताल में शुरू की गई नई BP और दिल की दवा। घर पर रखी Losar 50 इसी दवा-परिवार की है, इसलिए दोनों देने से पहले डुप्लिकेट चेतावनी देखें।',
      source_quote: '1. Tab Telmisartan 40 mg    1-0-0  after breakfast   x 30 days',
      confidence: 'high', needs_clarification: false, doctor_question: null, related_to: 'Losar 50',
    },
    {
      display_name: 'Losar 50', salt: 'Losartan', strength: '50 mg', drug_class: 'ARB', status: 'POSSIBLE_DUPLICATE',
      home_entry: 'Losar 50 · 1-0-0', discharge_entry: null,
      dose_pattern: '1-0-0', timing: null, course_days: null, home_stock: 15,
      reason_en: 'Losartan (at home) and the new Telmisartan are both ARBs, the same drug family. The summary does not say to stop Losar. Two medicines from one family are usually not meant to be taken together.',
      reason_hi: 'घर की Losartan और नई Telmisartan दोनों एक ही दवा-परिवार (ARB) की हैं। सारांश में Losar बंद करने की बात नहीं लिखी है। एक ही परिवार की दो दवाएँ आमतौर पर साथ नहीं दी जातीं।',
      source_quote: '1. Tab Telmisartan 40 mg    1-0-0  after breakfast   x 30 days',
      confidence: 'high', needs_clarification: true,
      doctor_question: 'The discharge summary starts Telmisartan 40 mg. Should Losar 50 (Losartan), which he took before admission, now be stopped?',
      doctor_question_hi: 'डिस्चार्ज सारांश में Telmisartan 40 mg शुरू की गई है। क्या भर्ती से पहले ली जा रही Losar 50 (Losartan) अब बंद करनी है?',
      related_to: 'Telmisartan 40 mg',
    },
    {
      display_name: 'Amlong 5', salt: 'Amlodipine', strength: '5 mg', drug_class: 'Calcium channel blocker', status: 'STOP',
      home_entry: 'Amlong 5 · 1-0-0', discharge_entry: 'Stopped: Tab Amlodipine 5 mg - discontinued',
      dose_pattern: '1-0-0', timing: null, course_days: null, home_stock: 20,
      reason_en: 'The discharge summary clearly says Amlodipine is discontinued. Take Amlong 5 out of the medicine box.',
      reason_hi: 'डिस्चार्ज सारांश में साफ लिखा है कि Amlodipine बंद कर दी गई है। Amlong 5 को दवा के डिब्बे से निकाल दें।',
      source_quote: 'Stopped: Tab Amlodipine 5 mg - discontinued.',
      confidence: 'high', needs_clarification: false, doctor_question: null,
    },
    {
      display_name: 'Metformin 1000 mg', salt: 'Metformin', strength: '1000 mg', drug_class: 'Biguanide', status: 'DOSE_CHANGED',
      home_entry: 'Glycomet 500 · 1-0-1', discharge_entry: 'Tab Metformin 1000 mg 1-0-1 after meals x 30 days (dose increased)',
      dose_pattern: '1-0-1', timing: 'after meals', course_days: 30, home_stock: 0,
      reason_en: 'Same sugar medicine, but the dose went up from 500 mg to 1000 mg, twice a day. The 500 mg strips at home are the old strength.',
      reason_hi: 'शुगर की वही दवा, पर खुराक 500 mg से बढ़कर 1000 mg हो गई है, दिन में दो बार। घर पर रखी 500 mg की स्ट्रिप पुरानी खुराक की है।',
      source_quote: '4. Tab Metformin 1000 mg    1-0-1  after meals       x 30 days (dose increased)',
      confidence: 'high', needs_clarification: false, doctor_question: null,
    },
    {
      display_name: 'Atorvastatin 40 mg', salt: 'Atorvastatin', strength: '40 mg', drug_class: 'Statin', status: 'CONTINUE',
      home_entry: 'Atorva 40 · 0-0-1', discharge_entry: 'Tab Atorvastatin 40 mg 0-0-1 bedtime continue',
      dose_pattern: '0-0-1', timing: 'bedtime', course_days: 30, home_stock: 10,
      reason_en: 'Same medicine and same dose as before (Atorva 40 is Atorvastatin 40 mg). Keep giving it at bedtime.',
      reason_hi: 'पहले जैसी ही दवा और वही खुराक (Atorva 40 = Atorvastatin 40 mg)। रात को सोते समय देते रहें।',
      source_quote: '5. Tab Atorvastatin 40 mg   0-0-1  bedtime           continue',
      confidence: 'high', needs_clarification: false, doctor_question: null,
    },
    {
      display_name: 'Furosemide 40 mg', salt: 'Furosemide', strength: '40 mg', drug_class: 'Loop diuretic', status: 'NEW',
      home_entry: null, discharge_entry: 'Tab Furosemide 40 mg 1-0-0 morning x 30 days',
      dose_pattern: '1-0-0', timing: 'morning', course_days: 30, home_stock: 0,
      reason_en: 'New water tablet started in hospital to reduce fluid build-up. Give it in the morning.',
      reason_hi: 'शरीर में जमा पानी कम करने के लिए अस्पताल में शुरू की गई नई दवा। सुबह दें।',
      source_quote: '2. Tab Furosemide 40 mg     1-0-0  morning           x 30 days',
      confidence: 'high', needs_clarification: false, doctor_question: null,
    },
    {
      display_name: 'Spironolactone 25 mg', salt: 'Spironolactone', strength: '25 mg', drug_class: 'Potassium-sparing diuretic', status: 'NEW',
      home_entry: null, discharge_entry: 'Tab Spironolactone 25 mg 1-0-0 after breakfast x 30 days',
      dose_pattern: '1-0-0', timing: 'after breakfast', course_days: 30, home_stock: 0,
      reason_en: 'New heart medicine started in hospital. The 7-day blood test (KFT with electrolytes) is planned to monitor it.',
      reason_hi: 'अस्पताल में शुरू की गई नई दिल की दवा। इसकी निगरानी के लिए 7 दिन बाद खून की जाँच (KFT और इलेक्ट्रोलाइट) तय है।',
      source_quote: '3. Tab Spironolactone 25 mg 1-0-0  after breakfast   x 30 days',
      confidence: 'high', needs_clarification: false, doctor_question: null,
    },
    {
      display_name: 'Pantoprazole 40 mg', salt: 'Pantoprazole', strength: '40 mg', drug_class: 'Proton pump inhibitor', status: 'NEW',
      home_entry: null, discharge_entry: 'Tab Pantoprazole 40 mg 1-0-0 before breakfast x 14 days',
      dose_pattern: '1-0-0', timing: 'before breakfast', course_days: 14, home_stock: 0,
      reason_en: 'New stomach-protection tablet for 14 days only. Give it before breakfast.',
      reason_hi: 'पेट की सुरक्षा के लिए नई दवा, सिर्फ 14 दिन के लिए। नाश्ते से पहले दें।',
      source_quote: '6. Tab Pantoprazole 40 mg   1-0-0  before breakfast  x 14 days',
      confidence: 'high', needs_clarification: false, doctor_question: null,
    },
    {
      display_name: 'Ecosprin 75', salt: 'Aspirin', strength: '75 mg', drug_class: 'Antiplatelet', status: 'ASK_DOCTOR',
      home_entry: 'Ecosprin 75 · 0-1-0', discharge_entry: null,
      dose_pattern: '0-1-0', timing: null, course_days: null, home_stock: 14,
      reason_en: 'He was taking this before admission, but the discharge summary does not mention it at all. Do not guess: confirm with the doctor whether to continue.',
      reason_hi: 'भर्ती से पहले वे यह दवा ले रहे थे, पर डिस्चार्ज सारांश में इसका कोई ज़िक्र नहीं है। अंदाज़ा न लगाएँ: डॉक्टर से पूछें कि जारी रखनी है या नहीं।',
      source_quote: 'Home list: Ecosprin 75 · 0-1-0 (not mentioned in the discharge summary)',
      confidence: 'high', needs_clarification: true,
      doctor_question: 'Should Ecosprin 75 (Aspirin) continue? He took it before admission, but it is not mentioned in the discharge summary.',
      doctor_question_hi: 'क्या Ecosprin 75 (Aspirin) जारी रखनी है? वे इसे भर्ती से पहले ले रहे थे, पर डिस्चार्ज सारांश में इसका ज़िक्र नहीं है।',
    },
    {
      display_name: 'Shelcal 500', salt: 'Calcium + Vitamin D3', strength: '500 mg', drug_class: 'Supplement', status: 'ASK_DOCTOR',
      home_entry: 'Shelcal 500 · 0-1-0', discharge_entry: null,
      dose_pattern: '0-1-0', timing: null, course_days: null, home_stock: 15,
      reason_en: 'A supplement he took before admission that the summary does not mention. Confirm with the doctor before continuing.',
      reason_hi: 'भर्ती से पहले ली जा रही सप्लीमेंट, जिसका सारांश में ज़िक्र नहीं है। जारी रखने से पहले डॉक्टर से पूछ लें।',
      source_quote: 'Home list: Shelcal 500 · 0-1-0 (not mentioned in the discharge summary)',
      confidence: 'high', needs_clarification: true,
      doctor_question: 'Should Shelcal 500 (calcium + vitamin D3) continue? It is not mentioned in the discharge summary.',
      doctor_question_hi: 'क्या Shelcal 500 (कैल्शियम + विटामिन D3) जारी रखनी है? डिस्चार्ज सारांश में इसका ज़िक्र नहीं है।',
    },
  ],
  follow_ups: [
    { name: 'KFT with serum electrolytes', type: 'lab_test', due_in_days: 7, source_quote: '- KFT with serum electrolytes after 7 days.' },
    { name: 'Cardiology OPD review', type: 'doctor_visit', due_in_days: 10, source_quote: '- Review in Cardiology OPD after 10 days.' },
  ],
  red_flags: ['Weight gain over 2 kg in 3 days', 'Increasing breathlessness', 'Swelling of feet', 'Fainting'],
  red_flags_hi: ['3 दिन में 2 kg से ज़्यादा वज़न बढ़ना', 'साँस फूलना बढ़ना', 'पैरों में सूजन', 'बेहोशी'],
  diet_activity: ['Salt under 5 g/day', 'Fluid intake limited to 1.5 L/day', 'Weigh daily at the same time'],
  diet_activity_hi: ['नमक 5 ग्राम/दिन से कम', 'पानी/तरल 1.5 लीटर/दिन तक सीमित', 'रोज़ एक ही समय पर वज़न लें'],
};
