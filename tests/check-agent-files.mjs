// Offline check of the agent files. Run: node tests/check-agent-files.mjs
import { readFileSync, existsSync } from "node:fs";
let failed = 0;
const fail = (m) => { console.error("FAIL:", m); failed++; };
const read = (p) => { if (!existsSync(p)) { fail(`${p} missing`); return ""; } return readFileSync(p, "utf8"); };

const MCP = "https://proofprice.com/api/mcp";
const TOOLS = ["pricepaid_check_price", "pricepaid_coverage"];
const MUST = ["price_type", "attribution", "sample", "period", "status"];

const skill = read("skills/proofprice/SKILL.md");
const fm = skill.match(/^---\nname: (.+)\ndescription: (.+)\n---\n/);
if (!fm) fail("SKILL.md needs frontmatter with name and description");
else {
  if (fm[1] !== "proofprice") fail("SKILL.md name must be proofprice");
  if (fm[2].length > 1024) fail("SKILL.md description over 1024 characters");
}
const mdc = read(".cursor/rules/proofprice.mdc");
if (!/^---\ndescription: .+\nalwaysApply: (true|false)\n---\n/.test(mdc)) fail("proofprice.mdc frontmatter");

for (const [name, text] of [["SKILL.md", skill], ["AGENTS.md", read("AGENTS.md")], ["proofprice.mdc", mdc]]) {
  if (!text.includes(MCP)) fail(`${name} must name ${MCP}`);
  for (const t of TOOLS) if (!text.includes(t)) fail(`${name} must name ${t}`);
  for (const w of MUST) if (!text.includes(w)) fail(`${name} must mention ${w}`);
  if (!/never call a posted|never call a posted, asking or averaged price|Never call a posted/i.test(text)) fail(`${name} must say never call a posted price paid`);
  if (/\b(api[_-]?key|secret|token)\b/i.test(text.replace(/no key/gi, ""))) fail(`${name} mentions a key/secret/token`);
  if (/\$\d|USD|per call|0\.10/i.test(text)) fail(`${name} must not carry prices (the free MCP address has no plans)`);
}
if (failed) { console.error(`${failed} problem(s)`); process.exit(1); }
console.log("agent files OK");
