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
  expandAll: string;
  collapseAll: string;
  allHintBefore: string;
  allHintAfter: string;
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
    expandAll: "Expand all",
    collapseAll: "Collapse",
    allHintBefore: "Showing all ",
    allHintAfter: " stops, each on its usual route. Zoom in to read the names.",
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
    expandAll: "सर्व उघडा",
    collapseAll: "मिटवा",
    allHintBefore: "सर्व ",
    allHintAfter: " टप्पे दाखवले आहेत, प्रत्येक त्याच्या नेहमीच्या वाटेवर. नावे वाचण्यासाठी मोठे करा.",
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

interface OutlookStrings {
  heading: string;
  pay: string;
  growth: string;
  effort: string;
  perMonth: string;
  perYear: string;
  lakh: string;
  basicPay: string;
  startingBasic: string;
  levelGrowth: string;
  source: string;
  noPay: string;
  noGrowth: string;
  nextStep: string;
  levels: [string, string, string, string, string];
  noCourse: string;
  oneCourse: string;
  manyCourses: string;
  examOnWay: string;
  veryCompetitive: string;
  experience: string;
  oneIn: string;
  applicantsSelected: string;
  passed: string;
  ratingNote: string;
  kinds: Record<"level" | "rule" | "notice" | "employer" | "ncs" | "aggregator", string>;
}

export const OUTLOOK_STRINGS: Record<Lang, OutlookStrings> = {
  en: {
    heading: "Pay and difficulty",
    pay: "Pay",
    growth: "Pay growth",
    effort: "How hard to get in",
    perMonth: "a month",
    perYear: "a year",
    lakh: "lakh",
    basicPay: "before allowances",
    startingBasic: "Starting basic pay, Pay Level",
    levelGrowth: "Pay rises by a 3% increment each year, and a promotion moves you up to a higher pay level.",
    source: "source",
    noPay: "No reliable published figure yet.",
    noGrowth: "No published figure for later pay.",
    nextStep: "Usual next step,",
    levels: ["Easier", "Moderate", "Demanding", "Hard", "Very hard"],
    noCourse: "No college course needed on the usual route",
    oneCourse: "One college course on the usual route",
    manyCourses: "Two or more college courses on the usual route",
    examOnWay: "An entrance or qualifying exam on the way",
    veryCompetitive: "A very competitive exam: fewer than 1 in 200 applicants selected",
    experience: "Needs work experience in another job first",
    oneIn: "1 in",
    applicantsSelected: "applicants selected",
    passed: "passed",
    ratingNote: "A guide, not an official rating: worked out from the usual route on this map and published exam figures.",
    kinds: {
      level: "Central government pay rules",
      rule: "Official pay rules",
      notice: "Public employer's notice",
      employer: "Employer's published terms",
      ncs: "National Career Service indicative range",
      aggregator: "Salary-survey website estimate",
    },
  },
  mr: {
    heading: "पगार आणि अवघडपणा",
    pay: "पगार",
    growth: "पगारवाढ",
    effort: "मिळवणे किती अवघड",
    perMonth: "दरमहा",
    perYear: "दरवर्षी",
    lakh: "लाख",
    basicPay: "भत्त्यांशिवाय",
    startingBasic: "सुरुवातीचे मूळ वेतन, वेतन स्तर",
    levelGrowth: "दरवर्षी ३% वेतनवाढ मिळते, आणि बढतीनंतर वरच्या वेतन स्तरावर जाता येते.",
    source: "स्रोत",
    noPay: "अजून विश्वसनीय प्रकाशित आकडा नाही.",
    noGrowth: "पुढील पगाराचा प्रकाशित आकडा नाही.",
    nextStep: "नेहमीचा पुढचा टप्पा,",
    levels: ["सोपे", "मध्यम", "मेहनतीचे", "कठीण", "खूप कठीण"],
    noCourse: "नेहमीच्या वाटेवर महाविद्यालयीन अभ्यासक्रम लागत नाही",
    oneCourse: "नेहमीच्या वाटेवर एक महाविद्यालयीन अभ्यासक्रम",
    manyCourses: "नेहमीच्या वाटेवर दोन किंवा अधिक अभ्यासक्रम",
    examOnWay: "वाटेत प्रवेश किंवा पात्रता परीक्षा",
    veryCompetitive: "खूप स्पर्धात्मक परीक्षा: २०० अर्जदारांपैकी एकापेक्षा कमी निवडले जातात",
    experience: "आधी दुसऱ्या नोकरीचा अनुभव लागतो",
    oneIn: "",
    applicantsSelected: "अर्जदारांपैकी एक निवडला गेला",
    passed: "उत्तीर्ण",
    ratingNote: "हे मार्गदर्शन आहे, अधिकृत मूल्यांकन नाही: या नकाशावरील नेहमीची वाट आणि प्रकाशित परीक्षा-आकड्यांवरून काढलेले.",
    kinds: {
      level: "केंद्र सरकारचे वेतन नियम",
      rule: "अधिकृत वेतन नियम",
      notice: "सार्वजनिक नियोक्त्याची सूचना",
      employer: "नियोक्त्याच्या प्रकाशित अटी",
      ncs: "नॅशनल करिअर सर्व्हिसचा अंदाजित पगार",
      aggregator: "पगार-सर्वेक्षण संकेतस्थळाचा अंदाज",
    },
  },
};
