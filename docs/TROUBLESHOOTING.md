# Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Bridge is offline | Keep After Effects open; run this checkout's Start-Bridge.jsx from File > Scripts > Run Script File |
| Scripting access warning | Enable Allow Scripts to Write Files and Access Network in Scripting & Expressions preferences |
| File access denied | Use a private writable directory; check Windows permissions and Codex workspace access |
| PowerShell blocks downloaded scripts | Review the scripts and use the documented process-scoped execution policy; organization policy may require your administrator |
| Another client is active | Wait for the client to finish; a leftover client.lock filename alone is harmless |
| Unresolved request | Inspect the saved result and project state; follow recovery steps below |
| Heartbeat is stale during an edit | Long scripts, rendering, and modal dialogs can block the polling task; do not submit a duplicate edit |
| Timed out | Use the request ID with Get-BridgeResult.ps1; the operation may still run |
| Script reports a syntax/API error | Use After Effects ExtendScript, not Premiere UXP or Node JavaScript; check APIs for your installed version |
| Relative include or media file missing | Requests run from a snapshot; use explicit absolute paths |
| Moved the repository | Stop the old bridge, rerun Setup.ps1 from the new location, then start that location's Start-Bridge.jsx |

## Recover unresolved work

1. Read the request/result with Get-BridgeResult.ps1 and inspect the After Effects project. A missing result is not evidence the edit did not happen.
2. Close any modal dialogs and allow the original bridge to finish if it is still active. Do not run another copy of the request.
3. If the original process is gone or cannot finish, determine whether project changes happened. Save a recovery copy if appropriate. Run Stop-Bridge.jsx when After Effects becomes responsive, or close After Effects normally.
4. Only after resolving the request's meaning, manually move that specific unresolved `.jsx` or `.running` file out of `local/inbox` to a private archive. Preserve the requests/result files for investigation. Moving a queued file while its bridge is polling races execution; stop the bridge first.
5. Restart the bridge and perform read-only inspection before further edits.

Do not clear the entire inbox as a routine fix. Do not replay `.running` or `.done` files. Restarting After Effects does not undo an edit or recover an unsaved project automatically.

## Stop and remove

Run Stop-Bridge.jsx inside After Effects to stop polling. This can only run when the application is responsive; it cannot interrupt a currently executing script. Closing After Effects also ends the polling task.

Once all work is resolved and After Effects is stopped, remove the extracted connector folder if no longer needed. There are no services, registry settings, MCP entries, or installed Adobe extension packages to remove. Setup does not change application preferences; you can restore your scripting preference manually if desired.
