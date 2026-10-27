// Offline regression tests. No credentials, network requests, or database writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const host = "ihiqixkufsjeplnkwkao.supabase.co";
const categories = Object.fromEntries([
  "sexual", "sexual/minors", "hate", "hate/threatening", "harassment",
  "harassment/threatening", "violence", "violence/graphic", "self-harm",
  "self-harm/intent", "self-harm/instructions",
].map(key => [key, false]));
const clean = () => ({ results: [{ flagged: false, categories: { ...categories } }] });
const files = ["src/lib/elite-moderation.server.ts", "supabase/functions/mobile-api/index.ts"];

// Extract named declarations with TypeScript's parser so the Edge entrypoint
// cannot start a server or import live clients during offline tests.
function load(file, fetchImpl = async () => ({ ok: true, json: async () => clean() })) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const functions = new Set([
    "chunkText", "evaluateModerationResponse", "parseEliteImagePath", "screenRemote",
    "createEliteThread", "replyEliteThread",
  ]);
  const constants = new Set([
    "BLOCKING_CATEGORIES", "MODERATION_SAFE_MESSAGE", "MODERATION_RETRY_MESSAGE",
    "MODERATION_MAX_TEXT", "MODERATION_CHUNK_SIZE", "MODERATION_TIMEOUT_MS",
  ]);
  const selected = ast.statements.filter(node =>
    (ts.isFunctionDeclaration(node) && functions.has(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => constants.has(d.name.getText(ast)))));
  const code = ts.transpileModule(selected.map(n => n.getText(ast)).join("\n"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal((code.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const sandbox = {
    exports: {}, URL, AbortController, fetch: fetchImpl,
    process: { env: { OPENAI_API_KEY: "offline-test-placeholder" } },
    Deno: { env: { get: name => name === "OPENAI_API_KEY" ? "offline-test-placeholder" : undefined } },
    setTimeout: callback => setTimeout(callback, 5), clearTimeout,
    console: { error() {} },
    readString: value => value, readImageUrls: value => value ?? [], readUuid: value => value,
    moderateElitePost: async () => ({ allowed: true }),
  };
  vm.createContext(sandbox);
  vm.runInContext(code.outputText, sandbox);
  return sandbox;
}

for (const file of files) {
  test(`${file}: malformed provider responses fail closed`, () => {
    const s = load(file);
    for (const value of [null, {}, { results: [] }, { results: [null] },
      { results: [{}] }, { results: [{ flagged: false, categories: {} }] },
      { results: [{ flagged: true, categories: { ...categories, hate: "false" } }] }]) {
      assert.equal(s.evaluateModerationResponse(value).allowed, false);
    }
    assert.equal(s.evaluateModerationResponse(clean()).allowed, true);
  });

  test(`${file}: flags and positive categories independently block`, () => {
    const s = load(file);
    assert.equal(s.evaluateModerationResponse({ results: [{ flagged: true, categories }] }).allowed, false);
    assert.equal(s.evaluateModerationResponse({ results: [{ flagged: false, categories: { ...categories, hate: true } }] }).allowed, false);
  });

  test(`${file}: only canonical storage URLs are accepted`, () => {
    const s = load(file);
    const url = `https://${host}/storage/v1/object/public/elite-images/user/file.png`;
    assert.equal(s.parseEliteImagePath(url, host), "user/file.png");
    for (const bad of [url + "?download=1", url + "#fragment", url.replace("https://", "https://user:pass@"),
      url.replace("/user/", "/elsewhere/../user/"), url.replace("file.png", "%66ile.png"),
      url.replace(host, "example.com"), " " + url, url.replace("https:", "http:")]) {
      assert.equal(s.parseEliteImagePath(bad, host), null);
    }
  });

  test(`${file}: complete title and maximum-length body reach moderation`, async () => {
    let sent;
    const s = load(file, async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => clean() };
    });
    const text = "T".repeat(200) + "\n\n" + "B".repeat(10000);
    assert.equal((await s.screenRemote(text, [])).allowed, true);
    assert.equal(sent.input.map(p => p.text).join(""), text);
    sent = undefined;
    assert.equal((await s.screenRemote(text + "X", [])).allowed, false);
    assert.equal(sent, undefined);
  });

  test(`${file}: stalled body decoding times out closed`, { timeout: 1000 }, async () => {
    const s = load(file, async (_url, options) => ({ ok: true, json: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }) }));
    assert.equal((await s.screenRemote("safe text", [])).allowed, false);
  });
}

test("mobile approval writes the screened thread and reply snapshots", async () => {
  const s = load(files[1]);
  const writes = [];
  s.serviceClient = () => ({ from: table => ({ update: value => ({ eq: async () => {
    writes.push({ table, value }); return { error: null };
  } }) }) });
  const supabase = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: "row-id" }, error: null }) }) }) }) };
  const context = { supabase, userId: "qa-user" };
  await s.createEliteThread(context, { title: "screened title", body: "screened body", image_urls: ["screened-image"] });
  await s.replyEliteThread(context, { thread_id: "thread", body: "screened reply", image_urls: ["screened-image"] });
  assert.deepEqual(JSON.parse(JSON.stringify(writes[0].value)), {
    title: "screened title", body: "screened body", image_urls: ["screened-image"], moderation_status: "approved",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(writes[1].value)), {
    body: "screened reply", image_urls: ["screened-image"], moderation_status: "approved",
  });
});

test("live QA script has no literal sign-in credentials", () => {
  const source = readFileSync(new URL("./regression-elite-hardening.mjs", import.meta.url), "utf8");
  const ast = ts.createSourceFile("qa.mjs", source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "signIn") {
      assert.ok(node.arguments.every(arg => !ts.isStringLiteral(arg)), "Sign-in must use environment settings");
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.match(source, /RUN_LIVE_QA/);
});
