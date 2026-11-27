# Poker Bankroll Tracker MCP + CLI

Low-context command-line interface and MCP (Model Context Protocol) server for the [Poker Bankroll Tracker](https://www.pokerbankrolltracker.net/) API.

The CLI exposes sessions, statistics, and hand replays without loading MCP tool schemas into context. The MCP server provides the same data to MCP clients.

## Install

```bash
npm install -g poker-bankroll-tracker-mcp
```

Or run directly with npx:

```bash
PBT_API_KEY="your-api-key" npx poker-bankroll-tracker-mcp
```

After global install, both binaries are available:

```bash
poker-bankroll-tracker --help
poker-bankroll-tracker-mcp
```

## Configuration

### Environment Variable

Both the CLI and MCP server require `PBT_API_KEY` with your Poker Bankroll Tracker API key. The API uses Bearer auth and is rate-limited to 20 requests per 15 minutes.

```bash
export PBT_API_KEY="your-api-key"
```

## CLI

Command name: `poker-bankroll-tracker`

The CLI rejects unknown flags/arguments and validates every filter. Errors go to stderr with non-zero exit codes. `--json` emits strict JSON to stdout and no extra output.

### `sessions`

Fetch poker sessions with calculated profit/loss.

```bash
poker-bankroll-tracker sessions [--id ID] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--currency USD,EUR] [--type cashgame,tournament,...] [--staking|--no-staking] [--json]
```

Flags:

| Flag | Type / Format | Description |
|------|---------------|-------------|
| `--id` | positive integer | Fetch a specific session by ID |
| `--start` | `YYYY-MM-DD` | Start date filter, example `2026-01-01` |
| `--end` | `YYYY-MM-DD` | End date filter, example `2026-03-31` |
| `--currency` | comma-separated 3-letter ISO codes | Currency filter, example `USD,EUR` |
| `--type` | comma-separated enum values | One or more of `cashgame`, `tournament`, `payout`, `costs`, `casinogame`, `jackpot` |
| `--staking` / `--no-staking` | boolean flags | Filter to staking or non-staking sessions |
| `--json` | boolean flag | Emit machine-parseable JSON |

Examples:

```bash
poker-bankroll-tracker sessions --start 2026-03-01 --end 2026-03-31
poker-bankroll-tracker sessions --type cashgame,tournament --currency USD,EUR
poker-bankroll-tracker sessions --staking --json
```

### `stats`

Compute aggregate statistics: total profit, win rate, average session profit, total sessions, breakdowns by location/stakes/month.

```bash
poker-bankroll-tracker stats [--id ID] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--currency USD,EUR] [--type cashgame,tournament,...] [--staking|--no-staking] [--json]
```

Flags are identical to `sessions`.

Examples:

```bash
poker-bankroll-tracker stats --start 2026-01-01
poker-bankroll-tracker stats --type cashgame --currency USD
poker-bankroll-tracker stats --staking --json
```

### `replays`

Fetch saved poker hand replays. The default table shows the replay ID, creation date in UTC, game, blinds, privacy and analysis hub status. Use `--json` for the full hand history, including players, boards, and actions.

```bash
poker-bankroll-tracker replays [--id ID] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--private|--no-private] [--hub|--no-hub] [--json]
poker-bankroll-tracker replays --start 2026-03-01 --end 2026-03-31 --no-hub
poker-bankroll-tracker replays --id 123 --json
```

Use `--private` or `--no-private` to match private or non-private replays. Use `--hub` or `--no-hub` to match replays published or not published in the analysis hub. Omitting both forms of a filter leaves that status unrestricted.

### CLI JSON Output

`sessions --json` returns the same formatted session objects as the MCP `get_sessions` tool, including computed `profit` and cash-game `stakes` when available.

`stats --json` returns the same aggregate object as the MCP `get_stats` tool:

- `totalSessions`
- `totalProfit`
- `winRate`
- `avgSessionProfit`
- `currencies`
- `byLocation`
- `byStakes`
- `byMonth`

`replays --json` returns the same array as `get_replays`. Both preserve the fields returned by the API, including `id`, `date`, `private`, `hub`, `visits`, and the nested `replay` hand history.

## MCP Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "poker-bankroll-tracker": {
      "command": "npx",
      "args": ["-y", "poker-bankroll-tracker-mcp"],
      "env": {
        "PBT_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "poker-bankroll-tracker": {
      "command": "npx",
      "args": ["-y", "poker-bankroll-tracker-mcp"],
      "env": {
        "PBT_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Other MCP Clients

Run the server over stdio:

```bash
PBT_API_KEY="your-api-key" poker-bankroll-tracker-mcp
```

## Available MCP Tools

Unknown filter names are rejected rather than ignored.

### `get_sessions`

Fetch poker sessions with optional filters. Returns session data with calculated profit/loss.

> Broad date ranges may return many sessions and consume significant tokens. Use narrow date ranges when possible.

Parameters:

| Name | Type | Description |
|------|------|-------------|
| `id` | positive integer | Fetch a specific session by ID |
| `start` | string | Start date (`YYYY-MM-DD`) |
| `end` | string | End date (`YYYY-MM-DD`) |
| `type` | string | Session type: `cashgame`, `tournament`, `payout`, `costs`, `casinogame`, `jackpot` (comma-separated) |
| `currency` | string | ISO currency codes (comma-separated) |
| `staking` | boolean | `true` for staking, `false` for non-staking |

All parameters are optional.

Example:

```text
get_sessions({ start: "2026-03-01", end: "2026-03-31", type: "cashgame" })
```

### `get_stats`

Compute aggregate statistics: total profit, win rate, average session profit, total sessions, breakdowns by location/stakes/month.

Takes the same filter parameters as `get_sessions`.

Example:

```text
get_stats({ start: "2026-01-01", type: "cashgame" })
```

### `get_replays`

Fetch saved replays with their full hand histories. Use an ID or a narrow date range to limit the response size. All parameters are optional.

| Name | Type | Description |
|------|------|-------------|
| `id` | positive integer | Fetch a specific replay by ID |
| `start` | string | Start of the creation date range (`YYYY-MM-DD`) |
| `end` | string | End of the creation date range (`YYYY-MM-DD`) |
| `private` | boolean | Filter by replay privacy status |
| `hub` | boolean | Filter by publication in the analysis hub |

```text
get_replays({ id: 123, hub: false })
```

## API Notes

- Rate limit: 20 requests per 15 minutes.
- Base URL: `https://api.pokerbankrolltracker.net/v1`
- Auth: Bearer token via `PBT_API_KEY`
- Client cache: responses cached for 10 seconds to reduce API usage.
- See the [Poker Bankroll Tracker API manual](https://pokerbankrolltracker.net/manual/#api-access) for the replay field reference.

## Development

```bash
git clone https://github.com/0xAndoroid/poker-bankroll-tracker-mcp.git
cd poker-bankroll-tracker-mcp
npm install
npm run build
```

```bash
npm run dev        # Watch mode
npm test           # Run tests
npm run lint       # Lint with oxlint
npm run format     # Format with oxfmt
```

## License

MIT
