#Requires -Version 5.1
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$runtime = Join-Path $PSScriptRoot 'local'
foreach ($folder in @($runtime, (Join-Path $runtime 'inbox'), (Join-Path $runtime 'requests'))) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}
$rootLiteral = "'" + $PSScriptRoot.Replace("'", "''") + "'"
$guide = @'
# Connect this checkout to Codex

In After Effects, enable Allow Scripts to Write Files and Access Network under
Scripting & Expressions preferences. Run this checkout's Start-Bridge.jsx using
File > Scripts > Run Script File. Repeat after restarting After Effects.

Open this folder as a local Codex project, or give Codex this command:

```powershell
Set-Location -LiteralPath __ROOT__
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Invoke-AfterEffects.ps1
```

First ask for read-only project inspection. For editing, tell Codex the desired
change and have it pass a trusted JSX file with -ScriptPath. A timeout does not
cancel the request; use Get-BridgeResult.ps1 and inspect the project before retrying.
See docs/CODEX.md for the workflow and exit codes.
'@
[IO.File]::WriteAllText((Join-Path $runtime 'CODEX-SETUP.md'), $guide.Replace('__ROOT__', $rootLiteral), [Text.UTF8Encoding]::new($false))
Write-Output 'Setup complete. No third-party dependencies are required.'
Write-Output ('In After Effects, run: ' + (Join-Path $PSScriptRoot 'Start-Bridge.jsx'))
Write-Output ('Codex instructions: ' + (Join-Path $runtime 'CODEX-SETUP.md'))
