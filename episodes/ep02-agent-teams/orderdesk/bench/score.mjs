// Score every run against the 6 planted bugs: found, findings, time, cost/tokens.
// usage: node bench/score.mjs
import fs from "node:fs";
import path from "node:path";
const R = "bench/results";
const planted = JSON.parse(fs.readFileSync("bench/planted.json", "utf8"));
const times = Object.fromEntries(fs.readFileSync(`${R}/times.txt`, "utf8").trim().split("\n")
  .map((l) => l.match(/^(\S+) run (\d+): ([\d.]+)s/)).map((m) => [`${m[1]}-${m[2]}`, +m[3]]));
const found = (fs_) => Object.values(planted).filter((p) =>
  fs_.some((f) => new RegExp(p.file).test(f.file) && new RegExp(p.match, "i").test(f.title))).length;

function codexTokens(threadId) {          // main thread + every subagent thread
  const home = process.env.CODEX_HOME || path.join(process.env.HOME, ".codex");
  let total = 0;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    if (!p.endsWith(".jsonl")) return;
    const lines = fs.readFileSync(p, "utf8").split("\n");
    const meta = JSON.parse(lines[0]).payload;
    if (meta.session_id !== threadId && meta.id !== threadId) return;
    const last = lines.filter((l) => l.includes('"token_count"')).pop();
    if (last) { const u = JSON.parse(last).payload.info.total_token_usage; total += u.input_tokens + u.output_tokens; }
  });
  walk(path.join(home, "sessions"));
  return total;
}

const rows = {};
for (const key of Object.keys(times)) {
  const [setup] = key.split(/-(?=\d+$)/);
  let findings, cost = null, tokens;
  if (setup.startsWith("claude")) {
    const j = JSON.parse(fs.readFileSync(`${R}/${key}.json`, "utf8"));
    findings = j.structured_output.findings; cost = j.total_cost_usd;
    tokens = Object.values(j.modelUsage).reduce((s, m) => s + m.inputTokens + m.outputTokens + m.cacheReadInputTokens + m.cacheCreationInputTokens, 0);
  } else {
    findings = JSON.parse(fs.readFileSync(`${R}/${key}.last.json`, "utf8")).findings;
    const start = fs.readFileSync(`${R}/${key}.jsonl`, "utf8").split("\n").find((l) => l.includes("thread.started"));
    tokens = codexTokens(JSON.parse(start).thread_id);
  }
  (rows[setup] ??= []).push({ found: found(findings), n: findings.length, s: times[key], cost, tokens });
}
const avg = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
console.log("setup        runs  planted found   findings  time   cost      tokens");
for (const [setup, a] of Object.entries(rows)) {
  const perfect = a.filter((r) => r.found === 6).length;
  console.log(setup.padEnd(13) + String(a.length).padEnd(6) + `${avg(a, "found").toFixed(1)}/6 (${perfect}/${a.length} all)`.padEnd(18) +
    avg(a, "n").toFixed(1).padEnd(10) + `${avg(a, "s").toFixed(0)}s`.padEnd(7) +
    (a[0].cost === null ? "-" : `$${avg(a, "cost").toFixed(2)}`).padEnd(10) + `${(avg(a, "tokens") / 1000).toFixed(0)}k`);
}
