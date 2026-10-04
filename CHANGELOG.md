# Changelog

## 1.1.0 - 2026-10-04

- Package the local ExtendScript/PowerShell connector as a portable GitHub project.
- Move runtime files into ignored local/ and add setup, stop, diagnostics, and saved-result commands.
- Snapshot request source and atomically publish responses.
- Block concurrent clients and unresolved request retries; refuse startup with unresolved inbox work.
- Handle circular results, preserve Unicode output, and fix default-script resolution on Windows PowerShell 5.1.
- Add documentation, source ZIP packaging, simulated-host tests, and Windows CI.

## Original local connector

- After Effects polling bridge, PowerShell request client, and read-only project information script.
