const CURRENT_YEAR_LABEL = "Year 3";
const YEAR_START = new Date("2025-07-28T00:00:00");

function apprenticeWeek(d, start) {
  const msPerDay = 86400000;
  const diff = Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      msPerDay
  );
  return Math.floor(diff / 7) + 1;
}

const groups = [
  { title: "Classes", icon: "fa-regular fa-calendar", prefix: "1.Classes" },
  { title: "Grades", icon: "fa-solid fa-graduation-cap", prefix: "2.Grades" },
  { title: "Journal", icon: "fa-solid fa-book", prefix: "3.Journal" },
];

const nocache = { cache: "no-store", headers: { "Cache-Control": "no-store" } };

const enc = (p) => {
  const [path, query] = p.split("?");
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return query ? `${encoded}?${query}` : encoded;
};

const parts = (p) => p.split("/").filter(Boolean);

function buildTree(paths) {
  const root = {};
  for (const p of paths) {
    const ps = parts(p);
    let cur = root;
    for (let i = 0; i < ps.length; i++) {
      const part = ps[i];
      if (!cur[part]) cur[part] = { _children: {}, _file: false };
      if (i === ps.length - 1) cur[part]._file = true;
      cur = cur[part]._children;
    }
  }
  return root;
}

function iconFor(name, isFile) {
  if (isFile) return "fa-regular fa-note-sticky";
  const n = name.toLowerCase();
  if (n.startsWith("year")) return "fa-regular fa-calendar";
  if (n.startsWith("week")) return "fa-regular fa-calendar-days";
  return "fa-regular fa-folder";
}

function titleFrom(basename) {
  return basename
    .replace(/^[0-9]+\./, "")
    .replace(/\.md$/, "")
    .replace(/-/g, ".");
}

function byFolderAware(a, b) {
  const rx = /^([0-9]+)\./;
  const an = a.split("/").pop(),
    bn = b.split("/").pop();
  const aa = rx.exec(an),
    bb = rx.exec(bn);
  if (aa && bb)
    return (
      Number(aa[1]) - Number(bb[1]) ||
      a.localeCompare(b, undefined, { numeric: true })
    );
  return a.localeCompare(b, undefined, { numeric: true });
}

async function fetchList() {
  try {
    const url = `index.json?v=${Date.now()}`;
    const res = await fetch(enc(url), nocache);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    const el = document.getElementById("content");
    if (el)
      el.innerHTML = `<p>Liste konnte nicht geladen werden: ${e.message}</p>`;
    throw e;
  }
}

function toDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatDateTitle(s) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const d = new Date(s);
  if (!isNaN(d)) return `${days[d.getDay()]}, ${toDDMMYYYY(d)}`;
  const m = /^([0-3][0-9])\.([0-1][0-9])\.(\d{4})$/.exec(s.trim());
  if (m) {
    const d2 = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    if (!isNaN(d2)) return `${days[d2.getDay()]}, ${toDDMMYYYY(d2)}`;
  }
  return s;
}

function parseFrontmatter(md) {
  const m = /^---\s*([\s\S]*?)\s*---\s*/.exec(md);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].replace(/^"|"$/g, "");
  }
  const body = md.slice(m[0].length);
  return { meta, body };
}

function makeSummaryRow(text, icon) {
  const row = document.createElement("div");
  row.className = "summary-row";
  const ic = document.createElement("i");
  ic.className = `icon ${icon}`;
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = text;
  row.append(ic, label);
  return row;
}

function renderTree(node, base) {
  const ul = document.createElement("ul");
  ul.className = "tree";
  const keys = Object.keys(node).sort(byFolderAware);
  for (const key of keys) {
    const li = document.createElement("li");
    const data = node[key];
    if (data._file) {
      const a = document.createElement("a");
      a.href = "#";
      a.className = "file";
      a.dataset.path = `${base}/${key}`;
      const ic = document.createElement("i");
      ic.className = "icon fa-regular fa-note-sticky";
      const tt = document.createElement("span");
      tt.textContent = titleFrom(key);
      a.append(ic, tt);
      li.appendChild(a);
    } else {
      const det = document.createElement("details");
      const sum = document.createElement("summary");
      const row = document.createElement("div");
      row.className = "week-row";
      const caret = document.createElement("button");
      caret.type = "button";
      caret.className = "caret";
      const chevr = document.createElement("i");
      chevr.className = "fa-solid fa-chevron-down";
      caret.append(chevr);
      const isWeek = /^week/i.test(key);
      if (isWeek) {
        const labelBtn = document.createElement("button");
        labelBtn.type = "button";
        labelBtn.className = "week-label";
        labelBtn.dataset.path = `${base}/${key}`;
        const ic = document.createElement("i");
        ic.className = `icon ${iconFor(key, false)}`;
        const label = document.createElement("span");
        label.textContent = key;
        labelBtn.append(ic, label);
        row.append(caret, labelBtn);
      } else {
        const rowLabel = document.createElement("button");
        rowLabel.type = "button";
        rowLabel.className = "week-label";
        rowLabel.dataset.folder = `${base}/${key}`;
        const ic = document.createElement("i");
        ic.className = `icon ${iconFor(key, false)}`;
        const label = document.createElement("span");
        label.textContent = key;
        row.append(caret, ic, label);
      }
      sum.append(row);
      det.append(sum);
      det.append(renderTree(data._children, `${base}/${key}`));
      li.appendChild(det);
    }
    ul.appendChild(li);
  }
  return ul;
}

async function buildNav(list) {
  const nav = document.getElementById("sidebar");
  nav.innerHTML = "";
  for (const group of groups) {
    const box = document.createElement("div");
    const title = document.createElement("div");
    title.className = "group-title";
    title.innerHTML = `<i class="${group.icon}" style="margin-right:8px;color:#9aa3b3"></i>${group.title}`;
    box.appendChild(title);
    const subset = list
      .filter((p) => p.startsWith(group.prefix + "/"))
      .map((p) => p.replace(group.prefix + "/", ""));
    const tree = buildTree(subset);
    const ul = renderTree(tree, group.prefix);
    box.appendChild(ul);
    nav.appendChild(box);
    nav.appendChild(document.createElement("div")).className = "separator";
  }
}

function setActive(a) {
  document
    .querySelectorAll(".file.active")
    .forEach((x) => x.classList.remove("active"));
  if (a) a.classList.add("active");
}

async function loadFile(path, a) {
  setActive(a);
  try {
    const url = `content/${path}`;
    const res = await fetch(enc(url) + `?v=${Date.now()}`, nocache);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    const { meta, body } = parseFrontmatter(md);
    const html = marked.parse(body);
    const wrap = document.createElement("div");
    const card = document.createElement("article");
    card.className = "entry-card";
    const h2 = document.createElement("h2");
    const title = meta.date
      ? formatDateTitle(meta.date)
      : meta.title
      ? formatDateTitle(meta.title)
      : "";
    h2.textContent = title || "";
    const div = document.createElement("div");
    div.innerHTML = html;
    if (div.firstElementChild && /^H1$/i.test(div.firstElementChild.tagName))
      div.removeChild(div.firstElementChild);
    card.append(h2, div);
    wrap.appendChild(card);
    document.getElementById("content").innerHTML = wrap.innerHTML;
  } catch (e) {
    document.getElementById(
      "content"
    ).innerHTML = `<p>Fehler beim Laden: <code>${path}</code> - ${e.message}</p>`;
  }
}

async function loadWeek(folderPath) {
  setActive(null);
  try {
    const list = await fetchList();
    const files = list
      .filter((p) => p.startsWith(folderPath + "/") && p.endsWith(".md"))
      .sort(byFolderAware);
    const entries = await Promise.all(
      files.map(async (p) => {
        const res = await fetch(
          enc(`content/${p}`) + `?v=${Date.now()}`,
          nocache
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const md = await res.text();
        const { meta, body } = parseFrontmatter(md);
        const date = meta.date || meta.title || "";
        const title = formatDateTitle(
          date || p.split("/").pop().replace(".md", "")
        );
        const html = marked.parse(body);
        return { title, html, date };
      })
    );
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    const content = document.getElementById("content");
    content.innerHTML = "";
    const h1 = document.createElement("h1");
    h1.className = "week-title";
    h1.textContent = folderPath.split("/").slice(-2).join(" - ");
    content.appendChild(h1);
    for (const e of entries) {
      const card = document.createElement("article");
      card.className = "entry-card";
      const h2 = document.createElement("h2");
      h2.textContent = e.title;
      const div = document.createElement("div");
      div.innerHTML = e.html;
      card.append(h2, div);
      content.appendChild(card);
    }
  } catch (e) {
    document.getElementById(
      "content"
    ).innerHTML = `<p>Fehler beim Laden der Woche: <code>${folderPath}</code> - ${e.message}</p>`;
  }
}

async function init() {
  try {
    const list = await fetchList();
    await buildNav(list);
    document.getElementById("sidebar").addEventListener("click", (e) => {
      const caret = e.target.closest("button.caret");
      if (caret) {
        e.preventDefault();
        const details = caret.closest("details");
        if (details) details.open = !details.open;
        return;
      }
      const week = e.target.closest("button.week-label");
      if (week && week.dataset.path) {
        e.preventDefault();
        loadWeek(week.dataset.path);
        return;
      }
      const a = e.target.closest("a.file");
      if (a) {
        e.preventDefault();
        loadFile(a.dataset.path, a);
      }
    });
    const weeks = list.filter(
      (p) => p.startsWith("3.Journal/") && /\/Week\s*\d+$/i.test(p)
    );
    if (weeks.length) {
      const latest = weeks.sort(byFolderAware)[weeks.length - 1];
      await loadWeek(latest);
      const btn = [...document.querySelectorAll("button.week-label")].find(
        (x) => x.dataset.path === latest
      );
      if (btn) {
        let d = btn.closest("details");
        while (d) {
          d.setAttribute("open", "");
          d = d.parentElement.closest("details");
        }
      }
    } else {
      const journals = list
        .filter((p) => p.startsWith("3.Journal/"))
        .sort(byFolderAware);
      const first = journals[journals.length - 1] || list[0];
      if (first) await loadFile(first, null);
    }
  } catch (e) {
    const el = document.getElementById("content");
    if (el) el.innerHTML = `<p>Fehler beim Initialisieren: ${e.message}</p>`;
  }
}

init();
