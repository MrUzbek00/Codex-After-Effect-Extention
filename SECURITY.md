# Security and privacy

The connector runs trusted ExtendScript in After Effects under your user account. Scripts can modify projects and access files allowed by Adobe scripting preferences. Save project copies and execute only requested, reviewed operations.

The connector uses local files and opens no network listener. Keep its folder private and writable only by trusted users/processes. There is no authentication token: filesystem permissions are the security boundary. Do not use a shared or publicly writable directory for the live inbox.

`local/requests` contains executable source snapshots and JSON with project names, paths, text, and other returned metadata. `local/inbox` retains processed wrappers. `.gitignore` excludes this runtime data; never force-add it. Share only the allowlisted source archive made by scripts/Package.ps1 or a GitHub source archive. Review any custom scripts before committing them, since they can contain private paths or data.

The bridge makes no external API calls. Its output is passed back to Codex and is subject to the Codex account/client's usual data handling. It does not bundle Adobe software or copy Codex credentials.

Timeouts and interrupted clients do not cancel operations. Never automatically retry an edit because its response is missing. Stop polling and inspect project state before manually clearing unresolved work.

Report security issues privately to the repository owner or through GitHub private vulnerability reporting if enabled. Do not include private project data in public issues.
