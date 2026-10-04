# Examples

`../project-info.jsx` is the default read-only connection check.

`active-composition.jsx` reads the active composition's basic properties and layer names without changing it:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Invoke-AfterEffects.ps1 -ScriptPath .\examples\active-composition.jsx
```

Select a composition in After Effects first. If none is active, the script returns a message instead of making changes.

For your own scripts, use an immediately invoked function returning a plain object. Use `var` and regular functions for ExtendScript compatibility. Resolve assets with explicit paths because the bridge executes a snapshot in local/requests.
