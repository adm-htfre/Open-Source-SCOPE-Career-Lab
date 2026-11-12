import type { V2NodeType } from "@/lib/v2/types";

export type Lang = "en" | "mr";

interface Strings {
  eyebrow: string;
  headlineBefore: string;
  headlineMark: string;
  headlineAfter: string;
  searchPlaceholder: string;
  noResults: string;
  guideOnly: string;
  hint: string;
  legend: string;
  groups: { start: string; study: string; exam: string; work: string };
  examGate: string;
  lateral: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  close: string;
  nextSteps: string;
  endOfRoute: string;
  waysIn: string;
  englishNote: string;
  readGuide: string;
  openExplorer: string;
  railBrand: string;
  back: string;
  forward: string;
  language: string;
}

export const STRINGS: Record<Lang, Strings> = {
  en: {
    eyebrow: "Career Tree · Mind map",
    headlineBefore: "Every route starts at ",
    headlineMark: "Class 10",
    headlineAfter: "",
    searchPlaceholder: "Find a course, exam or career",
    noResults: "Nothing found. Try another word.",
    guideOnly: "Guide",
    hint: "Tap a picture to open it.",
    legend: "Key",
    groups: { start: "School", study: "Study", exam: "Exam", work: "Work" },
    examGate: "Through an exam",
    lateral: "Sideways move",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Start again",
    close: "Close",
    nextSteps: "next steps",
    endOfRoute: "End of this route",
    waysIn: "ways to get here",
    englishNote: "",
    readGuide: "Read the guide",
    openExplorer: "Open in explorer",
    railBrand: "Where the path goes",
    back: "Back one step",
    forward: "Forward one step",
    language: "Language",
  },
  mr: {
    eyebrow: "करिअर ट्री · विचार नकाशा",
    headlineBefore: "प्रत्येक वाट ",
    headlineMark: "दहावी",
    headlineAfter: "पासून सुरू होते",
    searchPlaceholder: "अभ्यासक्रम, परीक्षा किंवा करिअर शोधा",
    noResults: "काही सापडले नाही. दुसरा शब्द वापरून पहा.",
    guideOnly: "मार्गदर्शक",
    hint: "उघडण्यासाठी चित्रावर टॅप करा.",
    legend: "सूची",
    groups: { start: "शाळा", study: "शिक्षण", exam: "परीक्षा", work: "काम" },
    examGate: "परीक्षेतून",
    lateral: "बाजूचा बदल",
    zoomIn: "मोठे करा",
    zoomOut: "लहान करा",
    reset: "पुन्हा सुरू करा",
    close: "बंद करा",
    nextSteps: "पुढचे टप्पे",
    endOfRoute: "या वाटेचा शेवट",
    waysIn: "इथे येण्याच्या वाटा",
    englishNote: "करिअरची नावे आणि माहिती सध्या इंग्रजीत आहे.",
    readGuide: "मार्गदर्शक वाचा",
    openExplorer: "एक्सप्लोररमध्ये उघडा",
    railBrand: "वाट कुठे जाते",
    back: "एक टप्पा मागे",
    forward: "एक टप्पा पुढे",
    language: "भाषा",
  },
};

export const TYPE_LABELS: Record<Lang, Record<V2NodeType, string>> = {
  en: {
    school_stage: "School stage",
    stream: "Stream",
    exam: "Exam",
    degree: "Degree",
    diploma: "Diploma",
    certification: "Certification",
    training: "Training",
    job_role: "Job",
    government_service: "Government service",
    entrepreneurship: "Own business",
  },
  mr: {
    school_stage: "शालेय टप्पा",
    stream: "शाखा",
    exam: "परीक्षा",
    degree: "पदवी",
    diploma: "पदविका",
    certification: "प्रमाणपत्र",
    training: "प्रशिक्षण",
    job_role: "नोकरी",
    government_service: "सरकारी सेवा",
    entrepreneurship: "स्वतःचा व्यवसाय",
  },
};

/**
 * Marathi titles for the root and its first ring only. Every other title
 * comes from the canonical registry, which is English.
 */
export const MARATHI_TITLES: Record<string, string> = {
  "school_stage:class-10": "इयत्ता दहावी",
  "stream:arts-humanities": "कला शाखा (११वी व १२वी)",
  "stream:commerce": "वाणिज्य शाखा (११वी व १२वी)",
  "stream:science-pcb": "विज्ञान शाखा — पीसीबी (भौतिकशास्त्र, रसायनशास्त्र, जीवशास्त्र)",
  "stream:science-pcm": "विज्ञान शाखा — पीसीएम (भौतिकशास्त्र, रसायनशास्त्र, गणित)",
  "stream:science-pcmb": "विज्ञान शाखा — पीसीएमबी (भौतिक, रसायन, गणित, जीवशास्त्र)",
  "diploma:polytechnic": "पॉलिटेक्निक पदविका (अभियांत्रिकी)",
  "training:iti": "आयटीआय (औद्योगिक प्रशिक्षण संस्था)",
  "exam:agniveer": "अग्निवीर भरती (भूदल / नौदल / हवाई दल)",
  "exam:ssc-gd": "एसएससी जीडी कॉन्स्टेबल",
  "exam:ssc-mts-exam": "एसएससी एमटीएस परीक्षा",
};
