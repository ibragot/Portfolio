"use client";

import { useState } from "react";
import { audio } from "./audio";
import { Stage } from "./Stages";

/* Aegis in miniature: the flagship attack from the README, one log line per step.
   Switch the three engines on and off and watch weak signals become one incident.
   The exfiltration comes from 10.0.9.95, an IP that is in no login event, so it only
   joins the incident when the entity graph links it back to the attacker. */

type Row = {
  t: string;
  src: string;
  text: string;
  tactic: string;
  sev: "high" | "medium";
  rule: boolean;
  ml: boolean;
  graph?: boolean; // reaches the identity only through the entity graph
};

const ROWS: Row[] = [
  { t: "14:03", src: "IdP", text: "service-account-17 token from 203.0.113.14 (VPS)", tactic: "Initial Access", sev: "medium", rule: true, ml: true },
  { t: "14:04", src: "IdP", text: "8 failed attempts to open an admin session", tactic: "Credential Access", sev: "medium", rule: true, ml: false },
  { t: "14:05", src: "AWS", text: "Admin session without MFA, AssumeRole ProdAdmin", tactic: "Privilege Escalation", sev: "high", rule: true, ml: true },
  { t: "14:07", src: "CloudTrail", text: "AttachRolePolicy AdministratorAccess, CreateAccessKey", tactic: "Persistence", sev: "high", rule: true, ml: false },
  { t: "14:08", src: "CloudTrail", text: "RunInstances p3.8xlarge, privileged hostPath pod", tactic: "Impact", sev: "medium", rule: false, ml: true },
  { t: "14:10", src: "App", text: "6x GetSecretValue, 40x GET /admin/export/customers", tactic: "Collection", sev: "high", rule: false, ml: true },
  { t: "14:11", src: "VPC flow", text: "10.0.9.95 → 203.0.113.242:443, 300 MB out", tactic: "Exfiltration", sev: "high", rule: true, ml: true, graph: true },
];

type Engine = "rule" | "ml" | "graph";
const ENGINES: { k: Engine; label: string; sub: string }[] = [
  { k: "rule", label: "Rules", sub: "23 YAML rules" },
  { k: "ml", label: "ML", sub: "4-model ensemble" },
  { k: "graph", label: "Graph", sub: "entity links" },
];

const band = (s: number) => (s >= 92 ? "CRITICAL" : s >= 65 ? "HIGH" : s >= 35 ? "MEDIUM" : s > 0 ? "LOW" : "QUIET");

function score(on: Record<Engine, boolean>) {
  const flagged = ROWS.map((r) => (on.rule && r.rule) || (on.ml && r.ml));
  const linked = ROWS.map((r, i) => flagged[i] && (!r.graph || on.graph));
  const inc = ROWS.filter((_, i) => linked[i]);
  const parts: { n: number; why: string }[] = [];
  if (inc.length) {
    const high = inc.some((r) => r.sev === "high");
    const tactics = new Set(inc.map((r) => r.tactic)).size;
    parts.push({ n: high ? 30 : 20, why: `highest alert severity is ${high ? "high" : "medium"}` });
    parts.push({ n: tactics * 3, why: `${tactics} ATT&CK tactic${tactics > 1 ? "s" : ""} observed` });
    if (tactics >= 3) parts.push({ n: 10, why: "tactics appear in kill-chain order" });
    if (inc.length > 1) parts.push({ n: Math.min(10, (inc.length - 1) * 2), why: `${inc.length - 1} more correlated alert${inc.length > 2 ? "s" : ""}` });
    if (on.ml && inc.some((r) => r.ml)) parts.push({ n: 7, why: "ML independently flagged the same identity" });
    if (linked[0]) parts.push({ n: 5, why: "source is a hosting-provider address" });
    if (linked[5]) parts.push({ n: 5, why: "a critical production asset is involved" });
    if (linked[6]) parts.push({ n: 10, why: "data left the network" });
  }
  const total = Math.min(100, parts.reduce((a, p) => a + p.n, 0));
  return { flagged, linked, parts, total };
}

export function AegisStage() {
  const [on, setOn] = useState<Record<Engine, boolean>>({ rule: true, ml: false, graph: false });
  const { flagged, linked, parts, total } = score(on);
  const level = band(total);
  const orphan = flagged[6] && !linked[6];

  const toggle = (k: Engine, i: number) => {
    const next = { ...on, [k]: !on[k] };
    setOn(next);
    if (band(score(next).total) === "CRITICAL" && level !== "CRITICAL") audio.rankUp();
    else audio.blip(next[k] ? 3 + i : i);
  };

  // Mini entity graph: graph-only edges stay dashed until the graph engine is on
  const lit = (i: number) => linked[i];
  return (
    <Stage
      hint="Switch the engines on and watch 7 weak signals become one incident"
      note="Simplified replay of Aegis's flagship scenario. All telemetry is synthetic and every IP is from a reserved documentation range."
    >
      <div className="ag">
        <div className="ag-left">
          <div className="ag-engines" role="group" aria-label="Detection engines">
            {ENGINES.map((e, i) => (
              <button key={e.k} className="ag-engine" aria-pressed={on[e.k]} onClick={() => toggle(e.k, i)}>
                <b>{e.label}</b>
                <small>{e.sub}</small>
              </button>
            ))}
          </div>
          <ol className="ag-log" aria-label="Log events">
            {ROWS.map((r, i) => (
              <li key={r.t} data-flag={flagged[i]} data-in={linked[i]} data-orphan={flagged[i] && !linked[i]}>
                <span className="ag-time">{r.t}</span>
                <span className="ag-src">{r.src}</span>
                <span className="ag-text">{r.text}</span>
                <span className="ag-tags">
                  {on.rule && r.rule && <i data-k="rule">RULE</i>}
                  {on.ml && r.ml && <i data-k="ml">ML</i>}
                  {r.graph && on.graph && flagged[i] && <i data-k="graph">GRAPH</i>}
                </span>
              </li>
            ))}
          </ol>
          <p className="ag-orphan" data-on={orphan} aria-live="polite">
            {orphan
              ? "10.0.9.95 is in no login event. Without the graph, the exfiltration is an orphan alert."
              : on.graph && flagged[6]
                ? "Graph: service-account-17 created i-0attacker9f3c, which has IP 10.0.9.95."
                : " "}
          </p>
        </div>

        <div className="ag-card" data-level={level}>
          <div className="ag-head">
            <span>Incident #484</span>
            <b>{level}</b>
          </div>
          <div className="ag-score">
            <b>{total}</b>
            <span>/ 100 risk</span>
          </div>
          <div className="ag-meter">
            <i style={{ width: `${total}%` }} />
          </div>
          <svg className="ag-graph" viewBox="0 0 244 92" role="img" aria-label="Entity graph of the incident">
            <line className="ag-edge" data-on={lit(0)} x1="24" y1="46" x2="78" y2="14" />
            <line className="ag-edge" data-on={lit(2)} x1="24" y1="46" x2="78" y2="78" />
            <line className="ag-edge" data-on={lit(4)} x1="24" y1="46" x2="128" y2="46" />
            <line className="ag-edge" data-graph="true" data-on={lit(6)} x1="128" y1="46" x2="178" y2="46" />
            <line className="ag-edge" data-graph="true" data-on={lit(6)} x1="178" y1="46" x2="232" y2="46" />
            <g className="ag-node" data-on={linked.some(Boolean)} data-main="true">
              <circle cx="24" cy="46" r="8" />
              <text x="24" y="66" textAnchor="middle">svc-acct-17</text>
            </g>
            <g className="ag-node" data-on={lit(0)}>
              <circle cx="78" cy="14" r="4.5" />
              <text x="86" y="17">203.0.113.14</text>
            </g>
            <g className="ag-node" data-on={lit(2)}>
              <circle cx="78" cy="78" r="4.5" />
              <text x="86" y="81">ProdAdmin</text>
            </g>
            <g className="ag-node" data-on={lit(4)}>
              <circle cx="128" cy="46" r="5" />
              <text x="128" y="36" textAnchor="middle">i-0attacker</text>
            </g>
            <g className="ag-node" data-on={lit(6)} data-hot="true">
              <circle cx="178" cy="46" r="5" />
              <text x="178" y="62" textAnchor="middle">10.0.9.95</text>
            </g>
            <g className="ag-node" data-on={lit(6)} data-hot="true">
              <circle cx="232" cy="46" r="5" />
              <text x="240" y="36" textAnchor="end">203.0.113.242</text>
            </g>
          </svg>
          <ul className="ag-parts" aria-live="polite">
            {parts.length ? (
              parts.map((p) => (
                <li key={p.why}>
                  <b>+{p.n}</b>
                  <span>{p.why}</span>
                </li>
              ))
            ) : (
              <li className="ag-empty">No engine is on, so nothing is flagged.</li>
            )}
          </ul>
        </div>
      </div>
    </Stage>
  );
}
