const groups = [
  { title: "Classes", icon: "fa-regular fa-calendar", prefix: "1.Classes" },
  { title: "Grades", icon: "fa-solid fa-graduation-cap", prefix: "2.Grades" },
  { title: "Journal", icon: "fa-solid fa-book", prefix: "3.Journal" },
];

const nocache = { cache: "no-store", headers: { "Cache-Control": "no-store" } };
const DONE_KEY = "lj_done";

/* -------- LocalStorage Helpers -------- */
function doneSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveDone(set) {
  localStorage.setItem(DONE_KEY, JSON.stringify([...set]));
}
function isDone(id) {
  return doneSet().has(id);
}

/* -------- Mark UI helpers (tri-state) -------- */
function setMarkIcon(btn, state) {
  // state: 'on' | 'off' | 'partial'
  btn.classList.toggle("on", state === "on");
  btn.classList.toggle("partial", state === "partial");
  btn.innerHTML =
    state === "partial"
      ? '<i class="fa-solid fa-minus"></i>'
      : '<i class="fa-solid fa-check"></i>';
}

function refreshAggregateMarks() {
  const set = doneSet();

  // Files -> rein aus Storage ableiten
  document.querySelectorAll('button.mark[data-id^="F:"]').forEach((btn) => {
    const id = btn.dataset.id;
    setMarkIcon(btn, set.has(id) ? "on" : "off");
  });

  // Weeks -> Status aus Kinder-Dateien berechnen
  document.querySelectorAll('button.mark[data-id^="W:"]').forEach((btn) => {
    const folder = btn.dataset.id.slice(2);
    const files = [
      ...document.querySelectorAll(`button.mark[data-id^="F:${folder}/"]`),
    ];
    const total = files.length;
    const done = files.filter((b) => b.classList.contains("on")).length;

    let state = "off";
    if (total > 0) {
      if (done === 0) state = "off";
      else if (done === total) state = "on";
      else state = "partial";
    }
    setMarkIcon(btn, state);
  });

  // Years -> Status aus allen Dateien unter dem Jahr berechnen
  document.querySelectorAll('button.mark[data-id^="Y:"]').forEach((btn) => {
    const folder = btn.dataset.id.slice(2);
    const files = [
      ...document.querySelectorAll(`button.mark[data-id^="F:${folder}/"]`),
    ];
    const total = files.length;
    const done = files.filter((b) => b.classList.contains("on")).length;

    let state = "off";
    if (total > 0) {
      if (done === 0) state = "off";
      else if (done === total) state = "on";
      else state = "partial";
    }
    setMarkIcon(btn, state);
  });
}

/* -------- Mark Button Factory -------- */
function makeMark(id) {
  const b = document.createElement("button");
  b.className = "mark";
  b.dataset.id = id;

  // Initialzustand
  if (id.startsWith("F:")) setMarkIcon(b, isDone(id) ? "on" : "off");
  else setMarkIcon(b, "off"); // Week/Year werden via refreshAggregateMarks gesetzt

  b.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const set = doneSet();

    // Klick auf Woche / Jahr -> alle Dateien darunter setzen/löschen
    if (id.startsWith("W:") || id.startsWith("Y:")) {
      const folder = id.slice(2); // z.B. '3.Journal/Year 3' oder '3.Journal/Year 3/Week 4'
      const fileIds = [
        ...document.querySelectorAll(`a.file[data-path^="${folder}/"]`),
      ].map((a) => "F:" + a.dataset.path);
      const turnOn = !set.has(id);

      if (turnOn) {
        set.add(id);
        fileIds.forEach((x) => set.add(x));
      } else {
        set.delete(id);
        fileIds.forEach((x) => set.delete(x));
      }
      saveDone(set);

      // Direkt betroffene Marks updaten (Sidebar + Content)
      document.querySelectorAll("button.mark").forEach((m) => {
        const mid = m.dataset.id;
        if (mid === id || fileIds.includes(mid)) {
          setMarkIcon(m, set.has(mid) ? "on" : "off");
        }
      });

      // Aggregatszustände (Minus etc.) neu berechnen
      refreshAggregateMarks();
      return;
    }

    // Klick auf Datei
    if (id.startsWith("F:")) {
      if (set.has(id)) set.delete(id);
      else set.add(id);
      saveDone(set);

      // Alle Instanzen dieser Datei spiegeln (Sidebar + Content)
      document.querySelectorAll(`button.mark[data-id="${id}"]`).forEach((m) => {
        setMarkIcon(m, set.has(id) ? "on" : "off");
      });

      // Aggregatszustände neu berechnen
      refreshAggregateMarks();
    }
  });

  return b;
}

/* -------- Path & Tree helpers -------- */
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

/* -------- Data fetch -------- */
async function fetchList() {
  try {
    const url = `content/index.json?v=${Date.now()}`;
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

/* -------- Markdown helpers -------- */
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

/* -------- Sidebar tree -------- */
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

      a.append(ic, tt, makeMark("F:" + base + "/" + key));
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
        row.append(caret, labelBtn, makeMark("W:" + base + "/" + key));
      } else {
        const rowLabel = document.createElement("button");
        rowLabel.type = "button";
        rowLabel.className = "week-label";
        rowLabel.dataset.folder = `${base}/${key}`;

        const ic = document.createElement("i");
        ic.className = `icon ${iconFor(key, false)}`;
        const label = document.createElement("span");
        label.textContent = key;

        row.append(
          caret,
          ic,
          label,
          makeMark((/^year/i.test(key) ? "Y:" : "D:") + base + "/" + key)
        );
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

/* -------- Content area -------- */
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

    const head = document.createElement("div");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.justifyContent = "space-between";
    head.style.gap = "12px";

    const h2 = document.createElement("h2");
    const title = meta.date
      ? formatDateTitle(meta.date)
      : meta.title
      ? formatDateTitle(meta.title)
      : "";
    h2.textContent = title || "";
    head.append(h2, makeMark("F:" + path));

    const div = document.createElement("div");
    div.innerHTML = html;
    if (div.firstElementChild && /^H1$/i.test(div.firstElementChild.tagName)) {
      div.removeChild(div.firstElementChild);
    }

    card.append(head, div);
    wrap.appendChild(card);
    document.getElementById("content").innerHTML = wrap.innerHTML;

    // Nach Rendern Aggregatszustände sicherstellen
    refreshAggregateMarks();
  } catch (e) {
    document.getElementById(
      "content"
    ).innerHTML = `<p>Fehler beim Laden: <code>${path}</code> – ${e.message}</p>`;
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
        return { title, html, date, path: p };
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

      const head = document.createElement("div");
      head.style.display = "flex";
      head.style.alignItems = "center";
      head.style.justifyContent = "space-between";
      head.style.gap = "12px";

      const h2 = document.createElement("h2");
      h2.textContent = e.title;
      head.append(h2, makeMark("F:" + e.path));

      const div = document.createElement("div");
      div.innerHTML = e.html;

      card.append(head, div);
      content.appendChild(card);
    }

    // Nach Rendern Aggregatszustände sicherstellen
    refreshAggregateMarks();
  } catch (e) {
    document.getElementById(
      "content"
    ).innerHTML = `<p>Fehler beim Laden der Woche: <code>${folderPath}</code> – ${e.message}</p>`;
  }
}

/* -------- App init -------- */
async function init() {
  try {
    const list = await fetchList();
    await buildNav(list);

    // Sidebar Click Handling
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

    // Nach Aufbau der Sidebar aggregierte Marks berechnen
    refreshAggregateMarks();

    // Deep-Links
    let handled = false;
    const params = new URLSearchParams(location.search);
    const fileParam = params.get("file");
    const view = params.get("view");

    function openParents(path) {
      const a = [...document.querySelectorAll("a.file")].find(
        (x) => x.dataset.path === path
      );
      if (a) {
        let d = a.closest("details");
        while (d) {
          d.open = true;
          d = d.parentElement.closest("details");
        }
      }
      return a || null;
    }

    if (fileParam) {
      const clean = decodeURIComponent(fileParam).replace(/^content\//, "");
      const a = openParents(clean);
      await loadFile(clean, a);
      handled = true;
    } else if (view === "last") {
      const all = list.filter((p) => p.endsWith(".md")).sort(byFolderAware);
      const last = all.at(-1);
      if (last) {
        const a = openParents(last);
        await loadFile(last, a);
        handled = true;
      }
    } else if (view === "grades" || view === "classes") {
      const prefix = view === "grades" ? "2.Grades" : "1.Classes";
      const section = list
        .filter((p) => p.startsWith(prefix + "/") && p.endsWith(".md"))
        .sort(byFolderAware);
      const target = section.at(-1);
      if (target) {
        const a = openParents(target);
        await loadFile(target, a);
        handled = true;
      }
    }

    // Fallback
    if (!handled) {
      const weeks = list.filter(
        (p) => p.startsWith("3.Journal/") && /\/Week\s*\d+$/i.test(p)
      );
      if (weeks.length) {
        const latest = weeks.sort(byFolderAware).at(-1);
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
        const first = journals.at(-1) || list[0];
        if (first) await loadFile(first, null);
      }
    }
  } catch (e) {
    const el = document.getElementById("content");
    if (el) el.innerHTML = `<p>Fehler beim Initialisieren: ${e.message}</p>`;
  }
}

init();
