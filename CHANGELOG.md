# Changelog

## 1.3.0

- Added the `replays` command and `get_replays` MCP tool. Both accept an ID, creation date range, privacy status, and analysis hub status. The command shows a summary table by default and returns full hand histories with `--json`.
- Added an ID filter to sessions and statistics on both surfaces. The CLI now also accepts `--no-staking` to match the MCP option `staking: false`. Existing session and statistics output is unchanged.
- The CLI and MCP server now report the installed package version. MCP tools reject unknown filter names instead of ignoring them. Filter errors point to CLI help only in the CLI. The API client reports invalid JSON or a missing data array without echoing the response body.
