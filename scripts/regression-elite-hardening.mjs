// Live regression suite for the backend hardening follow-up (items 1-5).
// Run: bun scripts/regression-elite-hardening.mjs
// Uses QA accounts only; records every created row in /tmp/hardening-cleanup.json
// so cleanup can remove exactly what this script created.
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const URL_ = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FN = `${URL_}/functions/v1/mobile-api`;

const cleanup = { threads: [], replies: [], reports: [], sessions: [], images: [], blocks: [] };
let passed = 0, failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} ${extra}`); }
}

async function signIn(email, password) {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`sign-in failed for ${email}`);
  return { token: json.access_token, uid: json.user.id };
}
const rest = (t, path, opts = {}) => fetch(`${URL_}/rest/v1/${path}`, {
  ...opts,
  headers: { apikey: ANON, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=representation", ...(opts.headers ?? {}) },
});
const rpc = async (t, fn, args) => {
  const res = await rest(t, `rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const api = async (t, action, data = {}) => {
  const res = await fetch(FN, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const uuid = () => crypto.randomUUID();

const M = await signIn("qa.elite@easyfill.ai", "QaAndroid#2026!");     // elite member
const B = await signIn("qa.elite2@easyfill.ai", "QaAndroid#2026!");    // elite member (blocked author)
const A = await signIn("david@easyfill.ai", "PrimaDonna#Admin2026");   // admin + elite (moderator)
console.log(`signed in: M=${M.uid} B=${B.uid} A=${A.uid}`);

// ---------- Item 1: report_ai_strategy ----------
// NULL argument validation
for (const [name, args] of [
  ["null report_id", { p_report_id: null, p_session_id: uuid(), p_reason: "Other", p_details: null, p_platform: "web" }],
  ["null session_id", { p_report_id: uuid(), p_session_id: null, p_reason: "Other", p_details: null, p_platform: "web" }],
  ["null reason", { p_report_id: uuid(), p_session_id: uuid(), p_reason: null, p_details: null, p_platform: "web" }],
  ["null platform", { p_report_id: uuid(), p_session_id: uuid(), p_reason: "Other", p_details: null, p_platform: null }],
]) {
  const r = await rpc(M.token, "report_ai_strategy", args);
  check(`report: ${name} rejected`, r.status >= 400 && JSON.stringify(r.json).includes("invalid_argument"), JSON.stringify(r.json));
}

// Two owned coaching sessions for M
async function makeSession(label) {
  const res = await rest(M.token, "coaching_sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: M.uid, mode: "ceo", prompt: `QA hardening probe ${label}`, response: { diagnosis: "x" } }),
  });
  const rows = await res.json();
  cleanup.sessions.push(rows[0].id);
  return rows[0].id;
}
const s1 = await makeSession("s1");
const s2 = await makeSession("s2");

// Happy path + idempotent retry
const rid = uuid();
const r1 = await rpc(M.token, "report_ai_strategy", { p_report_id: rid, p_session_id: s1, p_reason: "Other", p_details: "qa", p_platform: "web" });
check("report: created", r1.json?.ok === true && r1.json?.id === rid, JSON.stringify(r1.json));
if (r1.json?.ok) cleanup.reports.push(rid);
const r2 = await rpc(M.token, "report_ai_strategy", { p_report_id: rid, p_session_id: s1, p_reason: "Other", p_details: "qa", p_platform: "web" });
check("report: same-user same-session retry acknowledged", r2.json?.ok === true && r2.json?.id === rid, JSON.stringify(r2.json));

// Same user, same report id, DIFFERENT session -> collision, not ack
const r3 = await rpc(M.token, "report_ai_strategy", { p_report_id: rid, p_session_id: s2, p_reason: "Other", p_details: null, p_platform: "web" });
check("report: same-user different-session collision rejected", r3.status >= 400 && JSON.stringify(r3.json).includes("report_id_unavailable"), JSON.stringify(r3.json));

// Different user reusing the id -> rejected
const r4 = await rpc(B.token, "report_ai_strategy", { p_report_id: rid, p_session_id: s1, p_reason: "Other", p_details: null, p_platform: "ios" });
check("report: cross-user id reuse rejected", r4.status >= 400 && JSON.stringify(r4.json).includes("report_id_unavailable"), JSON.stringify(r4.json));

// Concurrent same-id same-session -> both acknowledged (unique_violation path)
const ridC = uuid();
const [c1, c2] = await Promise.all([
  rpc(M.token, "report_ai_strategy", { p_report_id: ridC, p_session_id: s2, p_reason: "Other", p_details: null, p_platform: "web" }),
  rpc(M.token, "report_ai_strategy", { p_report_id: ridC, p_session_id: s2, p_reason: "Other", p_details: null, p_platform: "web" }),
]);
check("report: concurrent same-session retries both acknowledged", c1.json?.ok === true && c2.json?.ok === true, `${JSON.stringify(c1.json)} ${JSON.stringify(c2.json)}`);
if (c1.json?.ok || c2.json?.ok) cleanup.reports.push(ridC);

// Concurrent same-id DIFFERENT sessions -> exactly one wins
const ridD = uuid();
const [d1, d2] = await Promise.all([
  rpc(M.token, "report_ai_strategy", { p_report_id: ridD, p_session_id: s1, p_reason: "Other", p_details: null, p_platform: "web" }),
  rpc(M.token, "report_ai_strategy", { p_report_id: ridD, p_session_id: s2, p_reason: "Other", p_details: null, p_platform: "web" }),
]);
const dOks = [d1, d2].filter((d) => d.json?.ok === true).length;
const dRej = [d1, d2].filter((d) => JSON.stringify(d.json).includes("report_id_unavailable")).length;
check("report: concurrent different-session collision -> one ack, one rejected", dOks === 1 && dRej === 1, `${JSON.stringify(d1.json)} ${JSON.stringify(d2.json)}`);
if (dOks === 1) cleanup.reports.push(ridD);

// ---------- Item 2: server-enforced approval path ----------
// Moderated path (mobile-api) -> approved and visible to other members
const t1 = await api(B.token, "create_elite_thread", { title: "QA hardening thread", body: "Regression probe thread body." });
check("thread: moderated create ok", t1.json?.ok === true && !!t1.json?.id, JSON.stringify(t1.json));
const tidB = t1.json?.id;
if (tidB) cleanup.threads.push(tidB);
const mList = await api(M.token, "list_elite_threads");
check("thread: moderated post visible to other member", (mList.json?.threads ?? []).some((t) => t.id === tidB));

// Direct REST insert -> lands pending, hidden from other members, visible to author + admin
const pendRes = await rest(B.token, "elite_threads", {
  method: "POST",
  body: JSON.stringify({ user_id: B.uid, title: "QA pending probe", body: "direct rest write", image_urls: [] }),
});
const pendRows = await pendRes.json();
const pendId = pendRows?.[0]?.id;
check("thread: direct REST insert accepted as pending", !!pendId, JSON.stringify(pendRows));
if (pendId) cleanup.threads.push(pendId);
const mList2 = await api(M.token, "list_elite_threads");
check("thread: pending direct-write hidden from other member", !(mList2.json?.threads ?? []).some((t) => t.id === pendId));
const bList = await api(B.token, "list_elite_threads");
check("thread: pending direct-write visible to its author", (bList.json?.threads ?? []).some((t) => t.id === pendId));
const aList = await api(A.token, "list_elite_threads");
check("thread: pending direct-write visible to moderator", (aList.json?.threads ?? []).some((t) => t.id === pendId));

// Direct REST attempts to self-approve -> blocked by the status guard
const insAppr = await rest(B.token, "elite_threads", {
  method: "POST",
  body: JSON.stringify({ user_id: B.uid, title: "QA self-approve probe", body: "x", image_urls: [], moderation_status: "approved" }),
});
check("thread: direct REST insert with approved status rejected", insAppr.status >= 400, `status ${insAppr.status}`);
const updAppr = await rest(B.token, `elite_threads?id=eq.${pendId}`, { method: "PATCH", body: JSON.stringify({ moderation_status: "approved" }) });
check("thread: direct REST self-approve update rejected", updAppr.status >= 400, `status ${updAppr.status}`);

// ---------- Item 5: blocking + parent-author visibility + moderator access ----------
// A (admin) replies to B's thread; M blocks B -> M must not see B's thread NOR A's reply under it.
const rep1 = await api(A.token, "reply_elite_thread", { thread_id: tidB, body: "Admin reply on B thread." });
check("reply: admin reply created", rep1.json?.ok === true, JSON.stringify(rep1.json));
const blk = await api(M.token, "block_elite_user", { blocked_user_id: B.uid });
check("block: M blocks B", blk.json?.ok === true, JSON.stringify(blk.json));
cleanup.blocks.push({ blocker: M, blocked: B.uid });

const mList3 = await api(M.token, "list_elite_threads");
check("block: B's approved thread hidden from M", !(mList3.json?.threads ?? []).some((t) => t.id === tidB));
const mGet = await api(M.token, "get_elite_thread", { id: tidB });
check("block: M cannot open B's thread", mGet.status >= 400 || mGet.json?.error, JSON.stringify(mGet.json));
// Parent-author rule: A's reply (unblocked author) on B's (blocked) thread hidden from M via REST
const mReplies = await (await rest(M.token, `elite_thread_replies?thread_id=eq.${tidB}&select=id`)).json();
check("block: replies under blocked parent author hidden from M", Array.isArray(mReplies) && mReplies.length === 0, JSON.stringify(mReplies));
// Moderator retains access to blocked content
const aList2 = await api(A.token, "list_elite_threads");
check("block: moderator still sees B's thread", (aList2.json?.threads ?? []).some((t) => t.id === tidB));
const aReplies = await (await rest(A.token, `elite_thread_replies?thread_id=eq.${tidB}&select=id`)).json();
check("block: moderator still sees replies under blocked author", Array.isArray(aReplies) && aReplies.length > 0, JSON.stringify(aReplies));

// Reply UPDATE is not permitted for members (RLS) — guard trigger is defense in depth
const mUpd = await rest(M.token, `elite_thread_replies?thread_id=eq.${tidB}`, { method: "PATCH", body: JSON.stringify({ body: "edited" }) });
const mUpdRows = await mUpd.json().catch(() => null);
check("reply: member update denied", mUpd.status >= 400 || (Array.isArray(mUpdRows) && mUpdRows.length === 0), `status ${mUpd.status}`);

const unblk = await api(M.token, "unblock_elite_user", { blocked_user_id: B.uid });
check("block: unblock restores visibility", unblk.json?.ok === true);
const mList4 = await api(M.token, "list_elite_threads");
check("block: B's thread visible again after unblock", (mList4.json?.threads ?? []).some((t) => t.id === tidB));

// ---------- Item 4: image ownership / existence / canonical path ----------
const fakeUrl = `${URL_}/storage/v1/object/public/elite-images/${A.uid}/${uuid()}.png`;
const imgForeign = await api(M.token, "create_elite_thread", { title: "QA foreign image", body: "probe", image_urls: [fakeUrl] });
check("image: another member's image path rejected", imgForeign.json?.ok === false, JSON.stringify(imgForeign.json));
const imgMissing = await api(M.token, "create_elite_thread", { title: "QA missing image", body: "probe", image_urls: [`${URL_}/storage/v1/object/public/elite-images/${M.uid}/${uuid()}.png`] });
check("image: nonexistent object rejected", imgMissing.json?.ok === false, JSON.stringify(imgMissing.json));
const imgExternal = await api(M.token, "create_elite_thread", { title: "QA external image", body: "probe", image_urls: ["https://example.com/x.png"] });
check("image: external URL rejected", imgExternal.json?.ok === false, JSON.stringify(imgExternal.json));

// Happy path: upload a real 1x1 png as M, then post with it
const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const imgPath = `${M.uid}/${uuid()}.png`;
const up = await fetch(`${URL_}/storage/v1/object/elite-images/${imgPath}`, {
  method: "POST",
  headers: { apikey: ANON, Authorization: `Bearer ${M.token}`, "Content-Type": "image/png" },
  body: png,
});
check("image: upload own image ok", up.status < 300, `status ${up.status}`);
if (up.status < 300) cleanup.images.push(imgPath);
const imgOk = await api(M.token, "create_elite_thread", { title: "QA real image", body: "probe with verified image", image_urls: [`${URL_}/storage/v1/object/public/elite-images/${imgPath}`] });
check("image: verified own image accepted", imgOk.json?.ok === true, JSON.stringify(imgOk.json));
if (imgOk.json?.id) cleanup.threads.push(imgOk.json.id);

// ---------- Item 3: long text is fully screened (10000 chars, bad content in LAST chunk) ----------
const longBody = "all good. ".repeat(950) + "I am going to kill you"; // ~9514 chars, banned phrase past char 4000
const longRes = await api(M.token, "create_elite_thread", { title: "QA long body", body: longBody });
check("moderation: banned content beyond char 4000 still rejected", longRes.json?.ok === false, JSON.stringify(longRes.json).slice(0, 120));

// ---------- iOS QA report reaches the moderator queue (read-only verification) ----------
const IOS_REPORT = "196c9081-6f13-4783-961e-a9b8e5bc74f3";
const aReports = await (await rest(A.token, `ai_strategy_reports?id=eq.${IOS_REPORT}&select=id,platform,status`)).json();
check("ios report: visible in moderator queue", Array.isArray(aReports) && aReports[0]?.platform === "ios" && aReports[0]?.status === "pending", JSON.stringify(aReports));
const mReports = await (await rest(M.token, `ai_strategy_reports?id=eq.${IOS_REPORT}&select=id`)).json();
check("ios report: hidden from other members", Array.isArray(mReports) && mReports.length === 0, JSON.stringify(mReports));

// ---------- cleanup what we can with user tokens ----------
for (const id of cleanup.threads) await api(A.token, "delete_elite_thread", { id }).catch(() => {});
for (const { blocker, blocked } of cleanup.blocks) await api(blocker.token, "unblock_elite_user", { blocked_user_id: blocked }).catch(() => {});
for (const sid of cleanup.sessions) await rest(M.token, `coaching_sessions?id=eq.${sid}`, { method: "DELETE" }).catch(() => {});
for (const p of cleanup.images) await fetch(`${URL_}/storage/v1/object/elite-images/${p}`, { method: "DELETE", headers: { apikey: ANON, Authorization: `Bearer ${M.token}` } }).catch(() => {});
writeFileSync("/tmp/hardening-cleanup.json", JSON.stringify({ reports: cleanup.reports }, null, 2));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
