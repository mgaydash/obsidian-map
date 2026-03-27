#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { spawnSync } from "child_process";
const OBSIDIAN_BIN = "/Applications/Obsidian.app/Contents/MacOS/obsidian";
function runObsidian(command, args = {}) {
    const parts = [command];
    for (const [key, value] of Object.entries(args)) {
        if (value === undefined || value === null)
            continue;
        if (typeof value === "boolean") {
            if (value)
                parts.push(key);
        }
        else {
            parts.push(`${key}=${String(value)}`);
        }
    }
    const result = spawnSync(OBSIDIAN_BIN, parts, {
        encoding: "utf8",
        timeout: 15000,
    });
    if (result.error)
        throw result.error;
    const output = (result.stdout || "").trim();
    const errOutput = (result.stderr || "").trim();
    if (result.status !== 0) {
        throw new Error(errOutput || `obsidian exited with code ${result.status}`);
    }
    return output || errOutput;
}
function ok(text) {
    return { content: [{ type: "text", text }] };
}
const server = new Server({ name: "obsidian-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
// ─── Tool definitions ────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        // ── Vault & file info ──────────────────────────────────────────────────
        {
            name: "vault_info",
            description: "Show current vault info (name, path, file count, etc.)",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string", description: "Target vault by name" },
                    info: {
                        type: "string",
                        enum: ["name", "path", "files", "folders", "size"],
                        description: "Return only a specific field",
                    },
                },
            },
        },
        {
            name: "list_vaults",
            description: "List all known Obsidian vaults",
            inputSchema: {
                type: "object",
                properties: {
                    verbose: { type: "boolean", description: "Include vault paths" },
                },
            },
        },
        {
            name: "list_files",
            description: "List files in the vault (optionally filtered by folder or extension)",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    folder: { type: "string", description: "Filter by folder path" },
                    ext: { type: "string", description: "Filter by extension (e.g. md)" },
                    total: { type: "boolean", description: "Return count only" },
                },
            },
        },
        {
            name: "list_folders",
            description: "List folders in the vault",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    folder: { type: "string", description: "Filter by parent folder" },
                    total: { type: "boolean" },
                },
            },
        },
        {
            name: "file_info",
            description: "Show metadata for a specific file",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string", description: "File name (wikilink-style)" },
                    path: { type: "string", description: "Exact file path" },
                },
            },
        },
        {
            name: "list_recents",
            description: "List recently opened files",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    total: { type: "boolean" },
                },
            },
        },
        // ── Read / write notes ─────────────────────────────────────────────────
        {
            name: "read_note",
            description: "Read the contents of a note",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string", description: "File name (wikilink-style)" },
                    path: { type: "string", description: "Exact file path" },
                },
            },
        },
        {
            name: "create_note",
            description: "Create a new note, optionally from a template",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    name: { type: "string", description: "Note name" },
                    path: { type: "string", description: "Full path for the note" },
                    content: { type: "string", description: "Initial content" },
                    template: { type: "string", description: "Template name to use" },
                    overwrite: { type: "boolean", description: "Overwrite if exists" },
                },
            },
        },
        {
            name: "append_to_note",
            description: "Append text to the end of a note",
            inputSchema: {
                type: "object",
                required: ["content"],
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    content: { type: "string", description: "Text to append" },
                    inline: { type: "boolean", description: "Append without leading newline" },
                },
            },
        },
        {
            name: "prepend_to_note",
            description: "Prepend text to the beginning of a note",
            inputSchema: {
                type: "object",
                required: ["content"],
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    content: { type: "string", description: "Text to prepend" },
                    inline: { type: "boolean", description: "Prepend without trailing newline" },
                },
            },
        },
        {
            name: "delete_note",
            description: "Delete a note (moves to trash by default)",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    permanent: { type: "boolean", description: "Skip trash, delete permanently" },
                },
            },
        },
        {
            name: "move_note",
            description: "Move or rename a note",
            inputSchema: {
                type: "object",
                required: ["to"],
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    to: { type: "string", description: "Destination folder or path" },
                },
            },
        },
        {
            name: "rename_note",
            description: "Rename a note",
            inputSchema: {
                type: "object",
                required: ["name"],
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    name: { type: "string", description: "New file name" },
                },
            },
        },
        // ── Daily notes ────────────────────────────────────────────────────────
        {
            name: "daily_read",
            description: "Read today's daily note",
            inputSchema: {
                type: "object",
                properties: { vault: { type: "string" } },
            },
        },
        {
            name: "daily_path",
            description: "Get the file path of today's daily note",
            inputSchema: {
                type: "object",
                properties: { vault: { type: "string" } },
            },
        },
        {
            name: "daily_append",
            description: "Append text to today's daily note",
            inputSchema: {
                type: "object",
                required: ["content"],
                properties: {
                    vault: { type: "string" },
                    content: { type: "string" },
                    inline: { type: "boolean" },
                },
            },
        },
        {
            name: "daily_prepend",
            description: "Prepend text to today's daily note",
            inputSchema: {
                type: "object",
                required: ["content"],
                properties: {
                    vault: { type: "string" },
                    content: { type: "string" },
                    inline: { type: "boolean" },
                },
            },
        },
        // ── Search ─────────────────────────────────────────────────────────────
        {
            name: "search",
            description: "Search the vault for text",
            inputSchema: {
                type: "object",
                required: ["query"],
                properties: {
                    vault: { type: "string" },
                    query: { type: "string", description: "Search query" },
                    path: { type: "string", description: "Limit search to folder" },
                    limit: { type: "number", description: "Max files to return" },
                    case: { type: "boolean", description: "Case-sensitive search" },
                    total: { type: "boolean", description: "Return match count only" },
                    format: { type: "string", enum: ["text", "json"], default: "text" },
                },
            },
        },
        {
            name: "search_context",
            description: "Search the vault and return matching lines with surrounding context",
            inputSchema: {
                type: "object",
                required: ["query"],
                properties: {
                    vault: { type: "string" },
                    query: { type: "string" },
                    path: { type: "string" },
                    limit: { type: "number" },
                    case: { type: "boolean" },
                    format: { type: "string", enum: ["text", "json"], default: "text" },
                },
            },
        },
        // ── Tags ───────────────────────────────────────────────────────────────
        {
            name: "list_tags",
            description: "List all tags in the vault (or for a specific file)",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    counts: { type: "boolean", description: "Include occurrence counts" },
                    sort: { type: "string", enum: ["count"], description: "Sort by count" },
                    total: { type: "boolean" },
                    format: { type: "string", enum: ["json", "tsv", "csv"] },
                },
            },
        },
        {
            name: "tag_info",
            description: "Get info about a specific tag (files that use it, count)",
            inputSchema: {
                type: "object",
                required: ["name"],
                properties: {
                    vault: { type: "string" },
                    name: { type: "string", description: "Tag name (without #)" },
                    total: { type: "boolean" },
                    verbose: { type: "boolean", description: "Include file list" },
                },
            },
        },
        // ── Tasks ─────────────────────────────────────────────────────────────
        {
            name: "list_tasks",
            description: "List tasks in the vault",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    done: { type: "boolean", description: "Show only completed tasks" },
                    todo: { type: "boolean", description: "Show only incomplete tasks" },
                    total: { type: "boolean" },
                    verbose: { type: "boolean", description: "Group by file with line numbers" },
                    format: { type: "string", enum: ["json", "tsv", "csv", "text"] },
                    daily: { type: "boolean", description: "Show tasks from daily note" },
                },
            },
        },
        {
            name: "toggle_task",
            description: "Toggle or set the status of a task",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    line: { type: "number", description: "Line number of the task" },
                    toggle: { type: "boolean", description: "Toggle the task status" },
                    done: { type: "boolean", description: "Mark as done" },
                    todo: { type: "boolean", description: "Mark as todo" },
                    status: { type: "string", description: "Set a custom status character" },
                    daily: { type: "boolean", description: "Target the daily note" },
                },
            },
        },
        // ── Properties ────────────────────────────────────────────────────────
        {
            name: "list_properties",
            description: "List frontmatter properties in the vault or a specific file",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    counts: { type: "boolean" },
                    sort: { type: "string", enum: ["count"] },
                    total: { type: "boolean" },
                    format: { type: "string", enum: ["yaml", "json", "tsv"] },
                },
            },
        },
        {
            name: "read_property",
            description: "Read a specific frontmatter property from a file",
            inputSchema: {
                type: "object",
                required: ["name"],
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    name: { type: "string", description: "Property name" },
                },
            },
        },
        {
            name: "set_property",
            description: "Set a frontmatter property on a file",
            inputSchema: {
                type: "object",
                required: ["name", "value"],
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    name: { type: "string" },
                    value: { type: "string" },
                    type: {
                        type: "string",
                        enum: ["text", "list", "number", "checkbox", "date", "datetime"],
                    },
                },
            },
        },
        {
            name: "remove_property",
            description: "Remove a frontmatter property from a file",
            inputSchema: {
                type: "object",
                required: ["name"],
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    name: { type: "string" },
                },
            },
        },
        // ── Links & graph ──────────────────────────────────────────────────────
        {
            name: "list_backlinks",
            description: "List files that link to a given note",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    counts: { type: "boolean" },
                    total: { type: "boolean" },
                    format: { type: "string", enum: ["json", "tsv", "csv"] },
                },
            },
        },
        {
            name: "list_links",
            description: "List outgoing links from a note",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    total: { type: "boolean" },
                },
            },
        },
        {
            name: "list_orphans",
            description: "List files with no incoming links (orphaned notes)",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    total: { type: "boolean" },
                    all: { type: "boolean", description: "Include non-markdown files" },
                },
            },
        },
        {
            name: "list_deadends",
            description: "List files with no outgoing links",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    total: { type: "boolean" },
                    all: { type: "boolean" },
                },
            },
        },
        {
            name: "list_unresolved",
            description: "List unresolved (broken) links in the vault",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    total: { type: "boolean" },
                    counts: { type: "boolean" },
                    verbose: { type: "boolean" },
                    format: { type: "string", enum: ["json", "tsv", "csv"] },
                },
            },
        },
        // ── Outline & word count ───────────────────────────────────────────────
        {
            name: "outline",
            description: "Show the heading outline of a note",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    format: { type: "string", enum: ["tree", "md", "json"] },
                    total: { type: "boolean" },
                },
            },
        },
        {
            name: "word_count",
            description: "Count words and characters in a note",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    words: { type: "boolean", description: "Return word count only" },
                    characters: { type: "boolean", description: "Return character count only" },
                },
            },
        },
        // ── Aliases ────────────────────────────────────────────────────────────
        {
            name: "list_aliases",
            description: "List aliases defined in the vault",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    total: { type: "boolean" },
                    verbose: { type: "boolean" },
                },
            },
        },
        // ── Templates ─────────────────────────────────────────────────────────
        {
            name: "list_templates",
            description: "List available templates",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    total: { type: "boolean" },
                },
            },
        },
        {
            name: "read_template",
            description: "Read a template's content",
            inputSchema: {
                type: "object",
                required: ["name"],
                properties: {
                    vault: { type: "string" },
                    name: { type: "string", description: "Template name" },
                    resolve: { type: "boolean", description: "Resolve template variables" },
                    title: { type: "string", description: "Title for variable resolution" },
                },
            },
        },
        // ── Bookmarks ──────────────────────────────────────────────────────────
        {
            name: "list_bookmarks",
            description: "List all bookmarks",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    total: { type: "boolean" },
                    verbose: { type: "boolean" },
                    format: { type: "string", enum: ["json", "tsv", "csv"] },
                },
            },
        },
        // ── Plugins ────────────────────────────────────────────────────────────
        {
            name: "list_plugins",
            description: "List installed plugins",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    filter: { type: "string", enum: ["core", "community"] },
                    versions: { type: "boolean" },
                    format: { type: "string", enum: ["json", "tsv", "csv"] },
                },
            },
        },
        // ── History ────────────────────────────────────────────────────────────
        {
            name: "history_read",
            description: "Read a previous version of a file from local history",
            inputSchema: {
                type: "object",
                properties: {
                    vault: { type: "string" },
                    file: { type: "string" },
                    path: { type: "string" },
                    version: { type: "number", description: "Version number (default: 1 = most recent)" },
                },
            },
        },
        // ── Sync ───────────────────────────────────────────────────────────────
        {
            name: "sync_status",
            description: "Show the current Obsidian Sync status",
            inputSchema: {
                type: "object",
                properties: { vault: { type: "string" } },
            },
        },
        // ── Obsidian version ───────────────────────────────────────────────────
        {
            name: "obsidian_version",
            description: "Show the installed Obsidian version",
            inputSchema: { type: "object", properties: {} },
        },
        // ── General escape-hatch ───────────────────────────────────────────────
        {
            name: "obsidian",
            description: "Run any obsidian CLI command directly. Use this for commands not covered by other tools. " +
                "Pass command as the first argument and key=value pairs as additional args.",
            inputSchema: {
                type: "object",
                required: ["command"],
                properties: {
                    command: {
                        type: "string",
                        description: "The obsidian sub-command to run (e.g. 'commands', 'eval', 'workspace')",
                    },
                    args: {
                        type: "object",
                        description: "Key/value pairs to pass as CLI arguments",
                        additionalProperties: { type: ["string", "boolean", "number"] },
                    },
                },
            },
        },
    ],
}));
// ─── Tool handlers ────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    const a = args;
    try {
        switch (name) {
            // ── Vault & file info ────────────────────────────────────────────────
            case "vault_info":
                return ok(runObsidian("vault", { vault: a.vault, info: a.info }));
            case "list_vaults":
                return ok(runObsidian("vaults", { verbose: a.verbose }));
            case "list_files":
                return ok(runObsidian("files", { vault: a.vault, folder: a.folder, ext: a.ext, total: a.total }));
            case "list_folders":
                return ok(runObsidian("folders", { vault: a.vault, folder: a.folder, total: a.total }));
            case "file_info":
                return ok(runObsidian("file", { vault: a.vault, file: a.file, path: a.path }));
            case "list_recents":
                return ok(runObsidian("recents", { vault: a.vault, total: a.total }));
            // ── Read / write notes ───────────────────────────────────────────────
            case "read_note":
                return ok(runObsidian("read", { vault: a.vault, file: a.file, path: a.path }));
            case "create_note":
                return ok(runObsidian("create", {
                    vault: a.vault,
                    name: a.name,
                    path: a.path,
                    content: a.content,
                    template: a.template,
                    overwrite: a.overwrite,
                }));
            case "append_to_note":
                return ok(runObsidian("append", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    content: a.content,
                    inline: a.inline,
                }));
            case "prepend_to_note":
                return ok(runObsidian("prepend", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    content: a.content,
                    inline: a.inline,
                }));
            case "delete_note":
                return ok(runObsidian("delete", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    permanent: a.permanent,
                }));
            case "move_note":
                return ok(runObsidian("move", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    to: a.to,
                }));
            case "rename_note":
                return ok(runObsidian("rename", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    name: a.name,
                }));
            // ── Daily notes ──────────────────────────────────────────────────────
            case "daily_read":
                return ok(runObsidian("daily:read", { vault: a.vault }));
            case "daily_path":
                return ok(runObsidian("daily:path", { vault: a.vault }));
            case "daily_append":
                return ok(runObsidian("daily:append", {
                    vault: a.vault,
                    content: a.content,
                    inline: a.inline,
                }));
            case "daily_prepend":
                return ok(runObsidian("daily:prepend", {
                    vault: a.vault,
                    content: a.content,
                    inline: a.inline,
                }));
            // ── Search ───────────────────────────────────────────────────────────
            case "search":
                return ok(runObsidian("search", {
                    vault: a.vault,
                    query: a.query,
                    path: a.path,
                    limit: a.limit,
                    case: a.case,
                    total: a.total,
                    format: a.format,
                }));
            case "search_context":
                return ok(runObsidian("search:context", {
                    vault: a.vault,
                    query: a.query,
                    path: a.path,
                    limit: a.limit,
                    case: a.case,
                    format: a.format,
                }));
            // ── Tags ─────────────────────────────────────────────────────────────
            case "list_tags":
                return ok(runObsidian("tags", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    counts: a.counts,
                    sort: a.sort,
                    total: a.total,
                    format: a.format,
                }));
            case "tag_info":
                return ok(runObsidian("tag", {
                    vault: a.vault,
                    name: a.name,
                    total: a.total,
                    verbose: a.verbose,
                }));
            // ── Tasks ────────────────────────────────────────────────────────────
            case "list_tasks":
                return ok(runObsidian("tasks", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    done: a.done,
                    todo: a.todo,
                    total: a.total,
                    verbose: a.verbose,
                    format: a.format,
                    daily: a.daily,
                }));
            case "toggle_task":
                return ok(runObsidian("task", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    line: a.line,
                    toggle: a.toggle,
                    done: a.done,
                    todo: a.todo,
                    status: a.status,
                    daily: a.daily,
                }));
            // ── Properties ───────────────────────────────────────────────────────
            case "list_properties":
                return ok(runObsidian("properties", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    counts: a.counts,
                    sort: a.sort,
                    total: a.total,
                    format: a.format,
                }));
            case "read_property":
                return ok(runObsidian("property:read", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    name: a.name,
                }));
            case "set_property":
                return ok(runObsidian("property:set", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    name: a.name,
                    value: a.value,
                    type: a.type,
                }));
            case "remove_property":
                return ok(runObsidian("property:remove", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    name: a.name,
                }));
            // ── Links & graph ────────────────────────────────────────────────────
            case "list_backlinks":
                return ok(runObsidian("backlinks", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    counts: a.counts,
                    total: a.total,
                    format: a.format,
                }));
            case "list_links":
                return ok(runObsidian("links", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    total: a.total,
                }));
            case "list_orphans":
                return ok(runObsidian("orphans", {
                    vault: a.vault,
                    total: a.total,
                    all: a.all,
                }));
            case "list_deadends":
                return ok(runObsidian("deadends", {
                    vault: a.vault,
                    total: a.total,
                    all: a.all,
                }));
            case "list_unresolved":
                return ok(runObsidian("unresolved", {
                    vault: a.vault,
                    total: a.total,
                    counts: a.counts,
                    verbose: a.verbose,
                    format: a.format,
                }));
            // ── Outline & word count ─────────────────────────────────────────────
            case "outline":
                return ok(runObsidian("outline", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    format: a.format,
                    total: a.total,
                }));
            case "word_count":
                return ok(runObsidian("wordcount", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    words: a.words,
                    characters: a.characters,
                }));
            // ── Aliases ──────────────────────────────────────────────────────────
            case "list_aliases":
                return ok(runObsidian("aliases", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    total: a.total,
                    verbose: a.verbose,
                }));
            // ── Templates ────────────────────────────────────────────────────────
            case "list_templates":
                return ok(runObsidian("templates", { vault: a.vault, total: a.total }));
            case "read_template":
                return ok(runObsidian("template:read", {
                    vault: a.vault,
                    name: a.name,
                    resolve: a.resolve,
                    title: a.title,
                }));
            // ── Bookmarks ────────────────────────────────────────────────────────
            case "list_bookmarks":
                return ok(runObsidian("bookmarks", {
                    vault: a.vault,
                    total: a.total,
                    verbose: a.verbose,
                    format: a.format,
                }));
            // ── Plugins ──────────────────────────────────────────────────────────
            case "list_plugins":
                return ok(runObsidian("plugins", {
                    vault: a.vault,
                    filter: a.filter,
                    versions: a.versions,
                    format: a.format,
                }));
            // ── History ──────────────────────────────────────────────────────────
            case "history_read":
                return ok(runObsidian("history:read", {
                    vault: a.vault,
                    file: a.file,
                    path: a.path,
                    version: a.version,
                }));
            // ── Sync ─────────────────────────────────────────────────────────────
            case "sync_status":
                return ok(runObsidian("sync:status", { vault: a.vault }));
            // ── Version ──────────────────────────────────────────────────────────
            case "obsidian_version":
                return ok(runObsidian("version"));
            // ── General escape-hatch ─────────────────────────────────────────────
            case "obsidian": {
                const extraArgs = a.args ?? {};
                return ok(runObsidian(a.command, extraArgs));
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            content: [{ type: "text", text: `Error: ${msg}` }],
            isError: true,
        };
    }
});
// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
