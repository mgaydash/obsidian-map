# obsidian-mcp

MCP server that wraps the [Obsidian CLI](https://obsidian.md) (`/Applications/Obsidian.app/Contents/MacOS/obsidian`) and exposes its commands as MCP tools.

## Project state

- Initial implementation complete and compiling cleanly
- 43 tools implemented covering the full Obsidian CLI surface
- Added to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`) — path already correct for `~/Git Directories/`
- Added to Claude Code with user scope (`~/.claude.json`) via `claude mcp add --scope user`

## Next steps

- Set up GitHub repo
- Test tools end-to-end against a real vault

## Structure

```
obsidian-mcp/
├── src/index.ts       # All tool definitions and handlers
├── dist/              # Compiled output (run `npm run build`)
├── package.json
└── tsconfig.json
```

## Dev workflow

```bash
nvm use stable         # Node v25.8.1
npm install
npm run build          # tsc → dist/
npm start              # runs dist/index.js directly
```

## Obsidian CLI binary

`/Applications/Obsidian.app/Contents/MacOS/obsidian`

The CLI uses `key=value` positional args (not `--flags`). Boolean flags are bare words (e.g. `total`, `verbose`). The `runObsidian()` helper in `src/index.ts` handles this via `spawnSync`.

## Tool categories

| Category | Tools |
|---|---|
| Vault & files | `vault_info`, `list_vaults`, `list_files`, `list_folders`, `file_info`, `list_recents` |
| Read/write | `read_note`, `create_note`, `append_to_note`, `prepend_to_note`, `delete_note`, `move_note`, `rename_note` |
| Daily notes | `daily_read`, `daily_path`, `daily_append`, `daily_prepend` |
| Search | `search`, `search_context` |
| Tags | `list_tags`, `tag_info` |
| Tasks | `list_tasks`, `toggle_task` |
| Properties | `list_properties`, `read_property`, `set_property`, `remove_property` |
| Links/graph | `list_backlinks`, `list_links`, `list_orphans`, `list_deadends`, `list_unresolved` |
| Content | `outline`, `word_count`, `list_aliases` |
| Templates | `list_templates`, `read_template` |
| Bookmarks | `list_bookmarks` |
| Plugins | `list_plugins` |
| History/Sync | `history_read`, `sync_status` |
| Meta | `obsidian_version`, `obsidian` (general escape-hatch for any CLI command) |
