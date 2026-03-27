# obsidian-mcp

MCP server that wraps the [Obsidian CLI](https://obsidian.md) and exposes its commands as MCP tools for use with Claude Desktop and Claude Code.

## Requirements

- macOS with Obsidian installed at `/Applications/Obsidian.app`
- Node.js (v18+)

## Setup

```bash
npm install
npm run build
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "/path/to/node",
      "args": ["/path/to/obsidian-mcp/dist/index.js"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add --scope user obsidian -- /path/to/node /path/to/obsidian-mcp/dist/index.js
```

## Tools (43)

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
| Meta | `obsidian_version`, `obsidian` |

## Dev

```bash
npm run build   # tsc → dist/
npm start       # run directly
npm run dev     # watch mode
```
