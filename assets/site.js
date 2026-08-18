/* Loads config.json + dedications.json (flat-file DB) and renders the page. */

/* ---- Hebrew (תאריך עברי) date formatting: "ג׳ אלול תשפ״ו" ---- */

const GERESH = "\u05F3", GERSHAYIM = "\u05F4";

function hebNum(n) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hundreds = ["", "ק", "ר", "ש", "ת"];
  let s = "";
  let h = Math.floor(n / 100);
  while (h > 4) { s += "ת"; h -= 4; }
  s += hundreds[h];
  const r = n % 100;
  if (r === 15) s += "טו";
  else if (r === 16) s += "טז";
  else s += tens[Math.floor(r / 10)] + ones[r % 10];
  if (s.length === 1) return s + GERESH;
  return s.slice(0, -1) + GERSHAYIM + s.slice(-1);
}

const HEB_MONTH_SPELLING = { "חשוון": "חשון", "סיוון": "סיון" };

const hebFmt = new Intl.DateTimeFormat("he-u-ca-hebrew", {
  day: "numeric", month: "long", year: "numeric",
});

function hebDateParts(d) {
  const p = {};
  hebFmt.formatToParts(d).forEach((x) => { if (x.type !== "literal") p[x.type] = x.value; });
  const month = HEB_MONTH_SPELLING[p.month] || p.month;
  return { day: hebNum(+p.day), month, year: hebNum(+p.year % 1000) };
}

function fmtHebDate(d) {
  const h = hebDateParts(d);
  return `${h.day} ${h.month} ${h.year}`;
}

function fmtHebRange(start, end) {
  const a = hebDateParts(start), b = hebDateParts(end);
  if (a.year === b.year && a.month === b.month) return `${a.day} — ${b.day} ${a.month} ${a.year}`;
  if (a.year === b.year) return `${a.day} ${a.month} — ${b.day} ${b.month} ${a.year}`;
  return `${a.day} ${a.month} ${a.year} — ${b.day} ${b.month} ${b.year}`;
}

function parseLocalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dedicationWhen(d) {
  if (d.type === "day") {
    return { label: "יום", when: fmtHebDate(parseLocalDate(d.date)), sort: d.date };
  }
  if (d.type === "week") {
    const start = parseLocalDate(d.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { label: "שבוע", when: fmtHebRange(start, end), sort: d.startDate };
  }
  const [y, m] = d.month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { label: "חודש", when: fmtHebRange(start, end), sort: d.month + "-01" };
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderDonationLinks(config) {
  const wrap = document.getElementById("donation-links");
  if (!wrap) return;
  config.donationLinks.forEach((link) => {
    const a = el("a", "card donate-card");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.appendChild(el("div", "label", link.label));
    if (link.note) a.appendChild(el("div", "note", link.note));
    wrap.appendChild(a);
  });
}

function renderFinancialInfo(config) {
  const set = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };
  set("info-zelle", config.zelle);
  set("info-checks", config.checksPayableTo);
  set("info-mail", config.mailingAddress);
  set("info-ein", config.ein);
  set("info-email", config.email);
  set("info-phone", config.phone);
}

function renderPrices(config) {
  const p = config.dedicationPrices;
  const set = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = `$${val.toLocaleString("en-US")}`;
  };
  set("price-day", p.day);
  set("price-week", p.week);
  set("price-month", p.month);
}

function renderDedications(data) {
  const wrap = document.getElementById("dedication-list");
  if (!wrap) return;
  const items = data.dedications
    .map((d) => ({ d, meta: dedicationWhen(d) }))
    .sort((a, b) => a.meta.sort.localeCompare(b.meta.sort));

  if (items.length === 0) {
    wrap.appendChild(el("p", null, "עדיין לא נרשמו הקדשות."));
    return;
  }

  items.forEach(({ d, meta }) => {
    const item = el("div", "dedication-item");
    const when = el("div", "when", meta.when);
    when.appendChild(el("span", "badge", meta.label));
    item.appendChild(when);
    item.appendChild(el("div", "text", d.text));
    if (d.showDonor && d.donor) {
      item.appendChild(el("div", "donor", `נתנדב ע״י ${d.donor}`));
    }
    wrap.appendChild(item);
  });
}

async function init() {
  try {
    const [config, dedications] = await Promise.all([
      loadJSON("data/config.json"),
      loadJSON("data/dedications.json"),
    ]);
    renderDonationLinks(config);
    renderFinancialInfo(config);
    renderPrices(config);
    renderDedications(dedications);
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", init);
