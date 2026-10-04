# Architecture

```text
Codex local shell
    | launches
Invoke-AfterEffects.ps1
    | snapshot + wrapper, atomically stage request
local/inbox/<id>.jsx
    | app.scheduleTask polls every 500 ms
Start-Bridge.jsx inside After Effects
    | rename to .running, evaluate wrapper + snapshot
local/requests/<id>.json
    | read result
PowerShell -> Codex
```

The source root is derived from each script's own path. All transient files live under local/:

- `heartbeat.txt`: Unix milliseconds, refreshed every ten polling ticks (about five seconds while idle).
- `client.lock`: exclusive OS file handle while a client is submitting/waiting. An empty leftover lock file is normal; the open handle supplies the lock.
- `inbox/<id>.tmp`: staging file, renamed to `.jsx` only after writing finishes.
- `inbox/<id>.jsx`: queued wrapper.
- `inbox/<id>.jsx.running`: claimed by After Effects before execution.
- `inbox/<id>.jsx.running.done`: processed wrapper retained for inspection.
- `requests/<id>.source.jsx`: immutable-for-the-request source snapshot.
- `requests/<id>.jsx`: preserved generated wrapper.
- `requests/<id>.json`: JSON success/error envelope, atomically published from a temporary file.

The client rejects stale/future heartbeats and unresolved queued/running requests. A second client cannot acquire the lock while the first is active. Timeouts leave work intact; they do not cancel or replay it. A `.done` file alone does not prove success; the saved response and actual project state are authoritative. If response writing fails, lookup can return `unknown` even though project changes happened.

Only one active bridge is supported per After Effects process. Starting a fresh bridge cancels the previous scheduled task in that process, but refuses a target inbox with unresolved work. Stop-Bridge.jsx cancels polling and removes the active heartbeat; it cannot interrupt an executing script.

The file protocol has no network transport or shared token. Its trust boundary is operating-system access to the connector directory. Anyone who can write executable requests there can act with After Effects scripting privileges.
