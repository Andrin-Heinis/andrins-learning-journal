import { promises as fs } from "fs";
import path from "path";

const CURRENT_YEAR_LABEL = "Year 3";
const YEAR_START = new Date("2025-07-28T00:00:00");

function toDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function apprenticeWeek(d, start) {
  const ms = 86400000;
  const diff = Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / ms
  );
  return Math.floor(diff / 7) + 1;
}

const now = new Date();
const week = apprenticeWeek(now, YEAR_START);
const dateStr = toDDMMYYYY(now);

const base = "public/content/3.Journal";
const yearDir = path.join(base, CURRENT_YEAR_LABEL);
const weekDir = path.join(yearDir, `Week ${week}`);
await fs.mkdir(weekDir, { recursive: true });

let existing = 0;
if (now.getDay() !== 1) {
  existing = await fs
    .readdir(weekDir)
    .then((a) => a.filter((x) => x.endsWith(".md")).length)
    .catch(() => 0);
}

const number = existing + 1;
const filename = `${number}.${dateStr}.md`;
const full = path.join(weekDir, filename);

const fm = `---\ntitle: ${dateStr}\ndate: ${now.getFullYear()}-${pad(
  now.getMonth() + 1
)}-${pad(now.getDate())}\nnavigation:\n  icon: i-lucide-notebook-pen\ndescription: ""\n---\n\n`;
await fs.writeFile(full, fm, "utf8");

// jetzt index.json raw bearbeiten
const INDEX_PATH = path.join("public", "index.json");
const newPath = `  "content/3.Journal/${CURRENT_YEAR_LABEL}/Week ${week}/${filename}"`;

let content = await fs.readFile(INDEX_PATH, "utf8");

// letztes `]` suchen und davor einfügen
const idx = content.lastIndexOf("]");
if (idx === -1) throw new Error("index.json kaputt");

let before = content.slice(0, idx).trimEnd();
if (!before.endsWith("[")) {
  before += ",";
}
const after = content.slice(idx);

const updated = `${before}\n${newPath}\n${after}`;

await fs.writeFile(INDEX_PATH, updated, "utf8");

console.log(`created: ${full.replace(/\\/g, "/")}`);
console.log(`indexed: ${newPath}`);
