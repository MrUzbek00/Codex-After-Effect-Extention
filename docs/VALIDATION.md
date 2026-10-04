# Validation record

Prepared on 2026-10-04 on Windows using Node.js 22.19.0.

| Check | Result |
| --- | --- |
| Windows PowerShell 5.1.26100.9444 | 9 tests passed, zero failures |
| PowerShell 7.6.5 | 9 tests passed, zero failures |
| Native PowerShell syntax checks | Passed on both shells |
| JSX syntax checks | Passed using Node's parser |
| Source ZIP | 28 allowlisted files; independent ZIP CRC/content checks passed; runtime files excluded |
| Publication scan | No matching credentials or machine-specific personal paths in the 28 source files |

The automated tests run the actual PowerShell client and generated request wrappers against mocked After Effects/ExtendScript APIs. They exercise:

- Repeatable setup and checkout paths containing spaces.
- Scripting permission checks, heartbeat, start/restart, and stop.
- Rejection of offline and future-dated heartbeats.
- Read-only project-info round trips and saved-result lookup.
- Source snapshot behavior and JSON escaping, Unicode, arrays, and null values.
- Script errors and circular-result handling.
- Timeouts, blocked retries, refused startup with unresolved work, and late-result lookup.
- Concurrent client locking.
- Missing results and invalid arguments.

Validation commands: `npm run check` and `npm test`. Node's parser checks JSX syntax; it does not certify Adobe host API compatibility. PowerShell syntax is checked with its native parser.

The original connector README records a successful read-only check with After Effects 26.0x67 on 2026-10-03. This packaged version has not been run inside a fresh After Effects session in this task. Complete host verification by following the README and confirming a successful project-info response. Older Adobe versions and macOS are not certified.

GitHub Actions is included for Windows PowerShell 5.1 and PowerShell 7. Remote CI has not run until the repository is pushed. No Adobe software is installed in those jobs.
