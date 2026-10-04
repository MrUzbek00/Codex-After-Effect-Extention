'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const source = path.resolve(__dirname, '..');
const shell = process.env.AE_TEST_POWERSHELL || 'powershell.exe';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex AE space '));
  for (const name of ['Start-Bridge.jsx', 'Stop-Bridge.jsx', 'Invoke-AfterEffects.ps1', 'Setup.ps1', 'Get-BridgeResult.ps1', 'Test-Connection.ps1', 'project-info.jsx', 'scripts']) {
    fs.cpSync(path.join(source, name), path.join(root, name), { recursive: true });
  }
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function run(root, name, args = []) {
  const child = spawn(shell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, name), ...args], { windowsHide: true });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  return { child, done };
}
async function waitFor(predicate) {
  for (let i = 0; i < 150; i++) { if (predicate()) return; await delay(50); }
  throw new Error('Timed out waiting for test condition');
}
function host(root, allow = true) {
  const alerts = [], cancelled = [], evaluated = [];
  function Folder(value) { this.fsName = path.resolve(String(value)); }
  Object.defineProperty(Folder.prototype, 'exists', { get() { return fs.existsSync(this.fsName); } });
  Folder.prototype.create = function () { fs.mkdirSync(this.fsName, { recursive: true }); return true; };
  Folder.prototype.getFiles = function (pattern) {
    return fs.readdirSync(this.fsName).filter(name => name.endsWith(pattern.slice(1))).map(name => new File(path.join(this.fsName, name)));
  };
  function File(value) { this.fsName = path.resolve(String(value)); }
  Object.defineProperties(File.prototype, {
    parent: { get() { return new Folder(path.dirname(this.fsName)); } },
    name: { get() { return path.basename(this.fsName); } },
    exists: { get() { return fs.existsSync(this.fsName); } }
  });
  File.prototype.open = function () { this.buffer = ''; return true; };
  File.prototype.write = function (text) { this.buffer += text; };
  File.prototype.close = function () { fs.writeFileSync(this.fsName, this.buffer, 'utf8'); };
  File.prototype.rename = function (name) {
    const destination = path.join(path.dirname(this.fsName), name);
    if (!this.exists || fs.existsSync(destination)) return false;
    fs.renameSync(this.fsName, destination); this.fsName = destination; return true;
  };
  File.prototype.remove = function () { fs.unlinkSync(this.fsName); return true; };
  const dollar = { fileName: path.join(root, 'Start-Bridge.jsx'), global: {}, writeln() {} };
  const app = {
    version: 'mock-26.0', project: null,
    preferences: { getPrefAsLong() { return allow ? 1 : 0; } },
    cancelTask: id => cancelled.push(id), scheduleTask: () => 123
  };
  const context = vm.createContext({ File, Folder, $: dollar, app, CompItem: function () {}, alert: value => alerts.push(value) });
  dollar.evalFile = file => {
    const previous = dollar.fileName;
    dollar.fileName = file.fsName;
    evaluated.push(file.fsName);
    try { return vm.runInContext(fs.readFileSync(file.fsName, 'utf8'), context); }
    finally { dollar.fileName = previous; }
  };
  return {
    context, app, alerts, cancelled, evaluated,
    start: () => dollar.evalFile(new File(path.join(root, 'Start-Bridge.jsx'))),
    tick: () => dollar.global.__codexAEBridge.tick(),
    stop: () => dollar.evalFile(new File(path.join(root, 'Stop-Bridge.jsx')))
  };
}
test('setup is repeatable and contains this checkout path', async t => {
  const root = fixture(t);
  for (let i = 0; i < 2; i++) assert.equal((await run(root, 'Setup.ps1').done).code, 0);
  assert.ok(fs.readFileSync(path.join(root, 'local/CODEX-SETUP.md'), 'utf8').includes(root));
  assert.deepEqual(fs.readdirSync(path.join(root, 'local/inbox')), []);
});
test('host permission gate, heartbeat, restart and stop', t => {
  const root = fixture(t);
  const denied = host(root, false); denied.start();
  assert.equal(denied.alerts.length, 1);
  assert.ok(!fs.existsSync(path.join(root, 'local/heartbeat.txt')));
  const ae = host(root); ae.start();
  assert.ok(Number(fs.readFileSync(path.join(root, 'local/heartbeat.txt'), 'utf8')) > 0);
  ae.start(); assert.deepEqual(ae.cancelled, [123]);
  ae.stop(); assert.ok(!fs.existsSync(path.join(root, 'local/heartbeat.txt')));
  assert.equal(ae.context.$.global.__codexAEBridge, null);
});
test('offline or future heartbeat refuses to enqueue work', async t => {
  const root = fixture(t);
  assert.notEqual((await run(root, 'Invoke-AfterEffects.ps1').done).code, 0);
  fs.writeFileSync(path.join(root, 'local/heartbeat.txt'), String(Date.now() + 600000));
  assert.notEqual((await run(root, 'Invoke-AfterEffects.ps1').done).code, 0);
  assert.deepEqual(fs.readdirSync(path.join(root, 'local/inbox')), []);
  assert.equal((await run(root, 'Test-Connection.ps1').done).code, 1);
});
test('actual PowerShell client and mocked AE execute a read-only round trip', async t => {
  const root = fixture(t);
  const ae = host(root); ae.start();
  const client = run(root, 'Invoke-AfterEffects.ps1', ['-TimeoutSeconds', '10']);
  await waitFor(() => fs.readdirSync(path.join(root, 'local/inbox')).some(name => name.endsWith('.jsx')));
  ae.tick();
  const response = await client.done;
  assert.equal(response.code, 0, response.stderr);
  const result = JSON.parse(response.stdout);
  assert.equal(result.ok, true);
  assert.equal(result.data.application, 'Adobe After Effects');
  assert.equal(result.data.projectPath, null);
  assert.deepEqual(result.data.compositions, []);
  assert.match(result.requestId, /^[a-f0-9]{32}$/);
  assert.ok(fs.readdirSync(path.join(root, 'local/inbox')).every(name => name.endsWith('.done')));
  const count = ae.evaluated.length; ae.tick(); assert.equal(ae.evaluated.length, count);
  const saved = await run(root, 'Get-BridgeResult.ps1', ['-RequestId', result.requestId]).done;
  assert.deepEqual(JSON.parse(saved.stdout), result);
  assert.equal((await run(root, 'Test-Connection.ps1').done).code, 0);
});
test('request snapshot preserves text, escaping and structured data', async t => {
  const root = fixture(t);
  const ae = host(root); ae.start();
  const file = path.join(root, 'custom __RESPONSE__ script.jsx');
  const expected = { text: 'Quote " backslash \\ newline\n\t café', values: [true, null, 1.5] };
  fs.writeFileSync(file, '(' + JSON.stringify(expected) + ');');
  const client = run(root, 'Invoke-AfterEffects.ps1', ['-ScriptPath', file, '-TimeoutSeconds', '10']);
  await waitFor(() => fs.readdirSync(path.join(root, 'local/inbox')).some(name => name.endsWith('.jsx')));
  fs.writeFileSync(file, 'throw new Error("Source changed after queuing");');
  ae.tick();
  const response = await client.done;
  assert.equal(response.code, 0, response.stderr);
  assert.deepEqual(JSON.parse(response.stdout).data, expected);
});
test('script failures and circular results produce saved error responses', async t => {
  const root = fixture(t);
  const ae = host(root); ae.start();
  for (const code of ['throw new Error("example failure");', '(function(){var v={};v.self=v;return v;}());']) {
    const file = path.join(root, 'error.jsx'); fs.writeFileSync(file, code);
    const client = run(root, 'Invoke-AfterEffects.ps1', ['-ScriptPath', file, '-TimeoutSeconds', '10']);
    await waitFor(() => fs.readdirSync(path.join(root, 'local/inbox')).some(name => name.endsWith('.jsx')));
    ae.tick();
    const response = await client.done;
    assert.equal(response.code, 1);
    const result = JSON.parse(response.stdout);
    assert.equal(result.ok, false);
    assert.match(result.error, /example failure|circular reference/);
    assert.equal((await run(root, 'Get-BridgeResult.ps1', ['-RequestId', result.requestId]).done).code, 1);
  }
});
test('timeout retains request, blocks retry and startup, and allows late result lookup', async t => {
  const root = fixture(t);
  const ae = host(root); ae.start();
  const response = await run(root, 'Invoke-AfterEffects.ps1', ['-TimeoutSeconds', '1']).done;
  assert.notEqual(response.code, 0);
  assert.match(response.stderr, /Do not retry automatically/);
  const jobs = fs.readdirSync(path.join(root, 'local/inbox')).filter(name => name.endsWith('.jsx'));
  assert.equal(jobs.length, 1);
  const id = jobs[0].slice(0, 32);
  const retry = await run(root, 'Invoke-AfterEffects.ps1', ['-TimeoutSeconds', '1']).done;
  assert.match(retry.stderr, /Unresolved request/);
  assert.equal(fs.readdirSync(path.join(root, 'local/inbox')).length, 1);
  const pending = await run(root, 'Get-BridgeResult.ps1', ['-RequestId', id]).done;
  assert.equal(pending.code, 2);
  assert.equal(JSON.parse(pending.stdout).state, 'queued');
  const restarted = host(root); restarted.start();
  assert.match(restarted.alerts[0], /Unresolved bridge requests/);
  ae.tick();
  assert.equal((await run(root, 'Get-BridgeResult.ps1', ['-RequestId', id]).done).code, 0);
});
test('concurrent clients cannot submit a second request', async t => {
  const root = fixture(t);
  const ae = host(root); ae.start();
  const first = run(root, 'Invoke-AfterEffects.ps1', ['-TimeoutSeconds', '10']);
  await waitFor(() => fs.readdirSync(path.join(root, 'local/inbox')).some(name => name.endsWith('.jsx')));
  const second = await run(root, 'Invoke-AfterEffects.ps1', ['-TimeoutSeconds', '1']).done;
  assert.notEqual(second.code, 0);
  assert.match(second.stderr, /Another bridge client is active/);
  ae.tick();
  assert.equal((await first.done).code, 0);
});
test('missing results and invalid IDs do not execute anything', async t => {
  const root = fixture(t);
  const missing = await run(root, 'Get-BridgeResult.ps1', ['-RequestId', '0'.repeat(32)]).done;
  assert.equal(missing.code, 2);
  assert.equal(JSON.parse(missing.stdout).state, 'not_found');
  assert.notEqual((await run(root, 'Get-BridgeResult.ps1', ['-RequestId', '../bad']).done).code, 0);
  assert.notEqual((await run(root, 'Invoke-AfterEffects.ps1', ['-TimeoutSeconds', '0']).done).code, 0);
});
