import type { Metadata } from "next";
import { Archivo, Mukta, Source_Serif_4, Tiro_Devanagari_Marathi } from "next/font/google";
import { v2Graph } from "@/lib/v2/data";
import { buildMindMap } from "@/lib/v2/mind-map";
import MindMapView from "./MindMapView";
import "./mindmap.css";

// SCOPE "paper and highlighter" type system, scoped to this route.
const serif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-mm-serif",
});
const caps = Archivo({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-mm-caps",
});
const marathiSerif = Tiro_Devanagari_Marathi({
  subsets: ["devanagari"],
  weight: "400",
  variable: "--font-mm-mr-serif",
});
const marathiSans = Mukta({
  subsets: ["devanagari"],
  weight: ["500", "700"],
  variable: "--font-mm-mr-sans",
});

export const metadata: Metadata = {
  title: "Career Mind Map – Open Every Route from Class 10",
  description:
    "A mind map of the Career Tree graph: start at Class 10 and open one branch at a time through streams, exams, degrees, and careers. English and Marathi.",
  alternates: { canonical: "/mindmap" },
};

export default function MindMapPage() {
  return (
    <div
      className={`${serif.variable} ${caps.variable} ${marathiSerif.variable} ${marathiSans.variable}`}
    >
      <MindMapView model={buildMindMap(v2Graph)} />
    </div>
  );
}
