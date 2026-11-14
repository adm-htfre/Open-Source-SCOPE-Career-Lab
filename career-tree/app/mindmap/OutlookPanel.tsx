"use client";

import { selectionRate, type NodeOutlook, type PayRecord, type PayStage } from "@/lib/v2/job-outlook";
import { shortTitle } from "@/lib/v2/mind-map";
import { OUTLOOK_STRINGS, type Lang } from "./strings";

function digits(value: number, lang: Lang) {
  return value.toLocaleString(lang === "mr" ? "mr-IN-u-nu-deva" : "en-IN", { maximumFractionDigits: 2 });
}

/** "₹25,500–₹81,100 a month", or "₹4–29.5 lakh a year" for yearly sums. */
export function formatStage(stage: PayStage, lang: Lang): string {
  const t = OUTLOOK_STRINGS[lang];
  const lakh = stage.per === "year" && stage.min >= 100000;
  const show = (value: number) =>
    lakh ? digits(Math.round(value / 10000) / 10, lang) : `₹${digits(value, lang)}`;
  const range = stage.min === stage.max ? show(stage.min) : `${show(stage.min)}–${show(stage.max)}`;
  const amount = lakh ? `₹${range} ${t.lakh}` : range;
  return lang === "mr"
    ? `${stage.per === "month" ? t.perMonth : t.perYear} ${amount}`
    : `${amount} ${stage.per === "month" ? t.perMonth : t.perYear}`;
}

function Sources({ urls, label }: { urls: string[]; label: string }) {
  return (
    <span className="mm-out-sources">
      {urls.slice(0, 3).map((url, index) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
          {label}
          {urls.length > 1 ? ` ${index + 1}` : ""}
        </a>
      ))}
    </span>
  );
}

function PayLine({ pay, lang }: { pay: PayRecord; lang: Lang }) {
  const t = OUTLOOK_STRINGS[lang];
  const first = pay.stages[0];
  return (
    <>
      <p className="mm-out-figure-line">
        <span className="mm-out-figure">{formatStage(first, lang)}</span>
      </p>
      {pay.kind === "level" && pay.level ? (
        <p className="mm-out-meta">
          {t.startingBasic} {pay.level} · {t.basicPay} · {pay.asOf}
        </p>
      ) : (
        <p className="mm-out-meta">
          <span lang="en">{first.who}</span> · {pay.asOf}
        </p>
      )}
      <p className="mm-out-meta">
        {t.kinds[pay.kind]} · <Sources urls={pay.sources} label={t.source} />
      </p>
    </>
  );
}

export default function OutlookPanel({
  outlook,
  lang,
  onOpen,
}: {
  outlook: NodeOutlook;
  lang: Lang;
  onOpen: (id: string) => void;
}) {
  const t = OUTLOOK_STRINGS[lang];
  const { pay, next, odds, effort } = outlook;
  const later = pay && pay.stages.length > 1 ? pay.stages.slice(1) : [];
  const reasons: string[] = [];
  if (effort.courses === 0) reasons.push(t.noCourse);
  else reasons.push(effort.courses === 1 ? t.oneCourse : t.manyCourses);
  if (effort.exam === 2) reasons.push(t.veryCompetitive);
  else if (effort.exam === 1) reasons.push(t.examOnWay);
  if (effort.experience) reasons.push(t.experience);

  return (
    <section className="mm-out" aria-label={t.heading}>
      <div className="mm-out-block">
        <h3 className="mm-out-label">{t.pay}</h3>
        {pay ? <PayLine pay={pay} lang={lang} /> : <p className="mm-out-none">{t.noPay}</p>}
      </div>

      <div className="mm-out-block">
        <h3 className="mm-out-label">{t.growth}</h3>
        {later.length > 0 && (
          <ul className="mm-out-steps">
            {later.map((stage) => (
              <li key={stage.who}>
                <span lang="en">{stage.who}</span>: <strong>{formatStage(stage, lang)}</strong>
              </li>
            ))}
          </ul>
        )}
        {pay?.growth && (
          <p className="mm-out-text">
            {pay.kind === "level" ? t.levelGrowth : <span lang="en">{pay.growth.text}</span>}{" "}
            <Sources urls={pay.growth.sources} label={t.source} />
          </p>
        )}
        {!later.length && !pay?.growth && next && (
          <p className="mm-out-text">
            {t.nextStep}{" "}
            <button type="button" className="mm-out-link" onClick={() => onOpen(next.id)}>
              {shortTitle(next.title)}
            </button>
            : <strong>{formatStage(next.pay.stages[0], lang)}</strong>{" "}
            <span className="mm-out-meta-inline">({next.pay.asOf})</span>
          </p>
        )}
        {!later.length && !pay?.growth && !next && <p className="mm-out-none">{t.noGrowth}</p>}
      </div>

      <div className="mm-out-block">
        <h3 className="mm-out-label">{t.effort}</h3>
        <div className="mm-out-effort" aria-label={`${t.effort}: ${effort.score} / 5, ${t.levels[effort.score - 1]}`}>
          <span className="mm-out-dots" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((dot) => (
              <span key={dot} className={dot <= effort.score ? "mm-out-dot mm-out-dot-on" : "mm-out-dot"} />
            ))}
          </span>
          <strong>{t.levels[effort.score - 1]}</strong>
        </div>
        <ul className="mm-out-reasons">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        {odds.map(({ examId, examTitle, odds: record }) => {
          const rate = selectionRate(record);
          return (
            <p key={examId} className="mm-out-text">
              <strong lang="en">{shortTitle(examTitle)}:</strong>{" "}
              {rate !== null &&
                (record.kind === "selection"
                  ? `${t.oneIn} ${digits(Math.round(1 / rate), lang)} ${t.applicantsSelected}`
                  : `${digits(Math.round(rate * 100), lang)}% ${t.passed}`)}{" "}
              <span className="mm-out-meta-inline">({record.year})</span>{" "}
              <Sources urls={record.sources} label={t.source} />
            </p>
          );
        })}
        <p className="mm-out-note">{t.ratingNote}</p>
      </div>
    </section>
  );
}
