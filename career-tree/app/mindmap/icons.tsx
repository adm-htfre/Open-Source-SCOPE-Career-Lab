import { createElement } from "react";
import {
  Atom,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Camera,
  ClipboardList,
  Cog,
  Cpu,
  Database,
  DraftingCompass,
  Dumbbell,
  Factory,
  FlaskConical,
  Gauge,
  GraduationCap,
  HardHat,
  Headset,
  IndianRupee,
  Landmark,
  Laptop,
  Lock,
  Microscope,
  Music,
  Palette,
  PenLine,
  Plane,
  Scale,
  School,
  ScrollText,
  Server,
  Shield,
  ShieldCheck,
  Split,
  Sprout,
  Stethoscope,
  Store,
  TrendingUp,
  Truck,
  Users,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { V2NodeType } from "@/lib/v2/types";

/** The picture inside each bubble shows the field; the bubble colour shows the kind. */

const BY_ID: Record<string, LucideIcon> = {
  "school_stage:class-10": School,
  "stream:arts-humanities": Palette,
  "stream:commerce": IndianRupee,
  "stream:science-pcb": Microscope,
  "stream:science-pcm": Atom,
  "stream:science-pcmb": FlaskConical,
  "diploma:polytechnic": Cog,
  "training:iti": Wrench,
  "exam:agniveer": Shield,
  "exam:ssc-gd": ShieldCheck,
  "exam:ssc-mts-exam": ClipboardList,
};

const BY_FIELD: [RegExp, LucideIcon][] = [
  [/supply chain|logistic|procure|purchas|warehous|distribution/, Truck],
  [/security|data protection|privacy/, Lock],
  [/semiconductor|\bchip|integrated circuit|hardware/, Cpu],
  [/reliab|validation|quality|\bqa\b|software test|tester/, Gauge],
  [/human resources|\bhr\b|recruit/, Users],
  [/technical writer|manuals/, PenLine],
  [/it support|help desk|technical assistance/, Headset],
  [/systems administrator|\bservers?\b|solutions architect/, Server],
  [/data engineer|data warehous|business intelligence|database/, Database],
  [/manufactur|production manager|factory/, Factory],
  [/architect|b\.arch|\bnata\b|planning/, DraftingCompass],
  [/medic|mbbs|doctor|nurs|surge|dental|\bbds\b|pharma|physio|health|\bneet\b|ayurved|homeo|hospital|clinic|paramedic/, Stethoscope],
  [/\blaw\b|ll\.?b|legal|judge|judicia|advocate|\bclat\b/, Scale],
  [/pilot|aviation|aircraft|airline|cabin crew/, Plane],
  [/army|navy|air force|defen[cs]e|agniveer|\bnda\b|police|constable|soldier|paramilitary|coast guard|\bcapf\b/, Shield],
  [/agri|farm|horticult|veterinar|forest|dairy|fisher/, Sprout],
  [/hotel|hospitality|chef|culinary|tourism|catering/, UtensilsCrossed],
  [/journalis|media|mass comm|film|photograph/, Camera],
  [/music|dance|theatre|performing/, Music],
  [/sport|fitness|yoga|physical education/, Dumbbell],
  [/teach|b\.ed|d\.el\.ed|education|professor|lecturer|tutor|school/, BookOpen],
  [/design|fashion|animation|fine art|\bart\b|\barts\b/, Palette],
  [/computer|software|\bbca\b|\bmca\b|\bdata\b|developer|cyber|\bweb\b|programm|information technology/, Laptop],
  [/electric|electron/, Zap],
  [/construction|civil engineer/, HardHat],
  [/engineer|b\.tech|b\.e\.|technolog|mechanic|\bjee\b|polytechnic/, Cog],
  [/account|bank|financ|commerce|b\.com|chartered|\btax|audit|econom|insurance|company secretary|actuar/, IndianRupee],
  [/manage|\bmba\b|\bbba\b|business|marketing|sales/, TrendingUp],
  [/scien|b\.sc|research|physics|chemistry|biolog|laborator/, FlaskConical],
  [/civil service|\bupsc\b|government|railway|\bssc\b|public service|clerk/, Landmark],
];

const BY_TYPE: Record<V2NodeType, LucideIcon> = {
  school_stage: School,
  stream: Split,
  exam: ClipboardList,
  degree: GraduationCap,
  diploma: ScrollText,
  certification: BadgeCheck,
  training: Wrench,
  job_role: Briefcase,
  government_service: Landmark,
  entrepreneurship: Store,
};

function iconFor(node: { id: string; type: V2NodeType; title: string; description: string }): LucideIcon {
  const known = BY_ID[node.id];
  if (known) return known;
  for (const text of [node.title.toLowerCase(), node.description.toLowerCase()]) {
    for (const [pattern, icon] of BY_FIELD) {
      if (pattern.test(text)) return icon;
    }
  }
  return BY_TYPE[node.type];
}

type IconNode = Parameters<typeof iconFor>[0];

/** The picture for a node. */
export function NodeIcon({ node, ...props }: { node: IconNode } & LucideProps) {
  return createElement(iconFor(node), { "aria-hidden": true, ...props });
}
