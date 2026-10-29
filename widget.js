// 플래너 위젯 (Scriptable 앱용)
// ===== 아래 5줄만 본인 값으로 바꾸기 =====
const SUPABASE_URL = "https://vipkclhichdaybgaqyrz.supabase.co";
const SUPABASE_KEY = "sb_publishable_PZtE_xn1cwq52qqTDbWssw_YzSA1BKI";
const EMAIL = "로그인-이메일";
const PASSWORD = "로그인-비밀번호";
const APP_URL = "https://jangseonah0124-tech.github.io/planner/";
// =======================================

const PAL = {
  gray: ["#ebeae7", "#5a5853", "#373735", "#cfcdc8"],
  brown: ["#efe3da", "#7a5641", "#45362c", "#dcbfa8"],
  orange: ["#fbe4cf", "#9a5418", "#4d3420", "#f0b27a"],
  yellow: ["#fbf0c4", "#8a6b0e", "#4a3f1c", "#ead27a"],
  green: ["#dcefe2", "#2f6b45", "#24402f", "#93d1a8"],
  blue: ["#d9e8f8", "#2a5c8f", "#213a52", "#94c1ec"],
  purple: ["#e9e0f5", "#5f3f8f", "#3a2d4d", "#c7aef0"],
  pink: ["#f7dfea", "#8f3b62", "#4a2a39", "#efa8c8"],
  red: ["#fbdedb", "#a33a31", "#4f2724", "#f2a49c"],
};
const dyn = (l, d) => Color.dynamic(new Color(l), new Color(d));
const FG = dyn("#2b2a28", "#e8e6e1");
const MUTED = dyn("#8a8780", "#8f8c85");
const BG = dyn("#ffffff", "#1c1c1e");
const DOW = "일월화수목금토";
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function loadData() {
  const auth = new Request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);
  auth.method = "POST";
  auth.headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
  auth.body = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const tok = await auth.loadJSON();
  if (!tok.access_token) throw new Error("로그인 실패");
  const req = new Request(`${SUPABASE_URL}/rest/v1/planner?select=data`);
  req.headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok.access_token}` };
  const rows = await req.loadJSON();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("데이터 없음 (웹앱에서 먼저 로그인)");
  return rows[0].data;
}

function covers(ev, ds) {
  const end = ev.end && ev.end > ev.date ? ev.end : ev.date;
  return ds >= ev.date && ds <= end;
}

function hexPair(h) {
  const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const fg = (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#2b2a28" : "#ffffff";
  return [h, fg, h, fg];
}

function chip(stack, text, color, prefix) {
  const p = /^#[0-9a-f]{6}$/i.test(color || "") ? hexPair(color) : PAL[color] || PAL.gray;
  const row = stack.addStack();
  row.centerAlignContent();
  if (prefix) {
    const pt = row.addText(prefix + " ");
    pt.font = Font.boldSystemFont(11);
    pt.textColor = MUTED;
  }
  const s = row.addStack();
  s.backgroundColor = dyn(p[0], p[2]);
  s.cornerRadius = 4;
  s.setPadding(1, 5, 1, 5);
  const t = s.addText(text);
  t.font = Font.systemFont(12);
  t.textColor = dyn(p[1], p[3]);
  t.lineLimit = 1;
  stack.addSpacer(3);
}

function line(stack, text, color, size = 12) {
  const t = stack.addText(text);
  t.font = Font.systemFont(size);
  t.textColor = color || FG;
  t.lineLimit = 1;
  stack.addSpacer(2);
}

function title(stack, text) {
  const t = stack.addText(text);
  t.font = Font.boldSystemFont(11);
  t.textColor = MUTED;
  stack.addSpacer(3);
}

async function build() {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.url = APP_URL;
  w.setPadding(12, 14, 12, 14);
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

  const fam = config.widgetFamily || "medium";
  const max = fam === "small" ? 4 : fam === "medium" ? 5 : 14;
  const now = new Date();
  const t = ymd(now);
  const tm = new Date(now); tm.setDate(now.getDate() + 1);
  const tmr = ymd(tm);

  const head = w.addText(`${now.getMonth() + 1}월 ${now.getDate()}일 (${DOW[now.getDay()]})`);
  head.font = Font.boldSystemFont(15);
  head.textColor = FG;
  w.addSpacer(6);

  let S;
  try {
    S = await loadData();
  } catch (e) {
    line(w, "⚠️ " + e.message, MUTED);
    return w;
  }

  const cat = (id) => S.cats.find((c) => c.id === id) || { color: "gray" };
  const today = S.events.filter((e) => !e.done && covers(e, t));
  const tomorrow = S.events.filter((e) => !e.done && covers(e, tmr) && !covers(e, t));
  const todos = (S.days && S.days[t] ? S.days[t] : []).filter((i) => i.text.trim());
  const blocks = (S.sched || []).filter((b) => b.days.includes(now.getDay())).sort((a, b) => a.start.localeCompare(b.start));

  const body = w.addStack();
  body.layoutHorizontally();
  body.topAlignContent();

  // 왼쪽: 일정
  const left = body.addStack();
  left.layoutVertically();
  title(left, "일정");
  let n = 0;
  today.forEach((e) => { if (n++ < max) chip(left, e.name, cat(e.cat).color); });
  tomorrow.forEach((e) => { if (n++ < max) chip(left, e.name, cat(e.cat).color, "내일"); });
  if (!today.length && !tomorrow.length) line(left, "오늘·내일 일정 없음", MUTED);

  if (fam === "small") {
    left.addSpacer(4);
    const left2 = todos.filter((i) => !i.done).length;
    line(left, todos.length ? `할 일 ${left2}개 남음` : "할 일 없음", MUTED, 11);
    w.addSpacer();
    return w;
  }

  body.addSpacer(14);

  // 오른쪽: 할 일 + 고정 스케줄
  const right = body.addStack();
  right.layoutVertically();
  title(right, "할 일");
  if (!todos.length) line(right, "없음", MUTED);
  todos.slice(0, max).forEach((i) => line(right, (i.done ? "☑ " : "☐ ") + i.text, i.done ? MUTED : FG));
  if (blocks.length) {
    right.addSpacer(6);
    title(right, "스케줄");
    blocks.slice(0, fam === "large" ? 8 : 2).forEach((b) => chip(right, `${b.start} ${b.name}`, b.color));
  }
  body.addSpacer();
  w.addSpacer();
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
