# Using the connector from Codex

Open the connector directory in local Codex so the included AGENTS.md can guide the workflow. No MCP configuration or account secret is added by setup. Codex calls PowerShell, which queues a file that After Effects evaluates through its existing scripting runtime.

1. Have the user enable scripting file access and run Start-Bridge.jsx once per After Effects session.
2. Run Test-Connection.ps1 to inspect heartbeat freshness and pending requests.
3. Run Invoke-AfterEffects.ps1 without arguments to inspect the project and compositions.
4. For an authorized edit, write a JSX file and pass its path to Invoke-AfterEffects.ps1. Prefer small changes, use an undo group where appropriate, and inspect the result afterward.
5. After a timeout, inspect saved results and project state. Do not automatically submit the script again.

Run clients in a child process, for example from PowerShell in the connector folder:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Invoke-AfterEffects.ps1 -ScriptPath 'C:\YourWork\edit.jsx' -TimeoutSeconds 120
```

Change the example script path to your real file. `local/CODEX-SETUP.md` contains commands for this checkout's actual location. If the connector is outside the current chat's writable workspace, normal Codex filesystem approval may be needed to write requests.

## Script contract

Use ExtendScript-compatible code, with `app` as the After Effects application object. Wrap multi-statement code in an immediately invoked function and return plain data. Return values are encoded as JSON; undefined and non-finite numbers become null. Cycles, functions, or excessive nesting produce an error response. Adobe host objects should be reduced to primitive fields before returning.

Submitted source is snapshotted in `local/requests/<id>.source.jsx`. This freezes the request text, but also changes `$.fileName` and the base for relative includes. Use absolute file paths for assets or explicitly provide the intended base directory. Do not assume helper files beside your original script are beside the snapshot.

## Outputs and exit codes

| Command | Exit 0 | Exit 1 | Exit 2 |
| --- | --- | --- | --- |
| Invoke-AfterEffects.ps1 | JSON result with ok=true | Script/connection/validation failure or timeout | Not used |
| Get-BridgeResult.ps1 | Saved successful result | Saved failure or invalid input | No completed result yet |
| Test-Connection.ps1 | Fresh heartbeat | No valid fresh heartbeat | Not used |

Successful and script-error responses include `requestId`. Invocation status (request ID and response path) is sent to stderr; stdout is reserved for the response JSON. PowerShell validation/transport exceptions may produce only stderr, so inspect both streams and the exit code.

The heartbeat is an availability hint, not proof an edit succeeded. During a long script, render, or modal dialog, the heartbeat may become stale. The stronger connection check is a completed read-only project-info request.
