# Pi tool mapping for AStack

AStack shares its workflow instructions across runtimes. On pi, read this mapping before following instructions that name Claude Code tools, agent types, paths, or models. The native AStack pi extension supplies the additional tools. Skills load under their bare names, such as `/skill:poteto-mode`.

## Tool actions

| Workflow action | Pi action |
| --- | --- |
| Read, write, or edit a file | `read`, `write`, or `edit` |
| Run a command | `bash` |
| Search files | `grep`, `find`, and `ls` when enabled, or `rg` through `bash` |
| Invoke a skill | Read its `SKILL.md`, or invoke `/skill:<name>` interactively |
| Dispatch a subagent | `agent`; use `run_in_background: true` for independent concurrent work |
| Receive background results | Wait for the completion message after the child exits; do not poll |
| Steer or continue a child | `send_message` |
| Inspect or stop children | `list_agents` or `stop_agent`; `/astack-agents` shows activity to the user |
| Ask a fixed-choice question | `ask_user_question`; without an interactive UI, ask in plain text |
| Track tasks | Keep the `todo.md` fallback described by poteto-mode |
| Request a session wakeup | `schedule_wakeup`; it is not a durable schedule |
| Repeat work in the session | `/loop [interval] <prompt>`, then `/loop stop` to cancel |
| Fetch or search the web | Use capabilities exposed by the session; fetch URLs through `bash` when needed |

## Agent policy

Use the registered `astack:` agent types and the actual `agent` schema. Effort-specific agent definitions select the child's thinking level. Give each writer its own worktree with `isolation: "worktree"`. A reviewer with `readonly: true` loses the edit and write tools but retains shell access.

The extension owns child process identity, completion, steering, cancellation, and recovery. A completion notice follows process exit. Session shutdown stops owned children and timers. Processes that a completed shell command deliberately leaves behind may need separate cleanup. Keep user and project authorization in force throughout.

## Model names

Pass the aliases from a skill's Models section to the Pi `agent` tool's `model` argument. The extension uses the parent model's provider column and falls back to `anthropic` when that provider has no column. These package defaults come from `plugins/astack/models.json`.

| Alias | `anthropic` | `openai` | `openai-codex` |
| --- | --- | --- | --- |
| `opus` | `anthropic/claude-opus-5-5` | `openai/gpt-6.1-sol` | `openai-codex/gpt-6.1-sol` |
| `fable` | `anthropic/claude-fable-5-1` | `openai/gpt-6-astra` | `openai-codex/gpt-6-astra` |
| `sonnet` | `anthropic/claude-sonnet-5-5` | `openai/gpt-6-sol` | `openai-codex/gpt-6-sol` |
| `haiku` | `anthropic/claude-haiku-5-5` | `openai/gpt-6-luna` | `openai-codex/gpt-6-luna` |

A `pi models: alias=provider/id` line in the host's `astack-models.md` sheet overrides an alias. The tool also accepts a full `provider/id`. `inherit-parent`, `auto`, or an omitted model uses the parent model. An optional `astack-policy.json` in Pi's agent directory restricts permitted models and reasoning efforts. The extension validates that policy and checks model availability and configured authentication before launch. Keep personal model restrictions in host configuration. Diverse panels need distinct available models; record reduced diversity when the configured provider exposes only one model family.

## Configuration and routing

The pi agent directory is `$PI_CODING_AGENT_DIR` or `~/.pi/agent`. The extension reads `astack-models.md` there and injects it on each run. The sheet's `session hook: off` disables automatic routing. Child agents receive the model sheet and this mapping without the root routing mandate.

Role rows are instructions to the agent. The optional `astack-policy.json` in the same directory enforces permitted provider/model IDs and effort choices at child dispatch, including restarts of saved children. An invalid policy refuses dispatch. The repository's `docs/pi.md` describes the schema, preflight fallback, and limits.

## Workflow paths and capabilities

Pi discovers project skills under `.pi/skills` or `.agents/skills`. Put generated verification or personal mode skills there. AStack's own skills remain inside the installed package.

Pi transcripts live under `<agent-directory>/sessions/` in the directory for this workspace. AStack child sessions live under `<agent-directory>/astack/<parent-session-id>/agents/`. Pi JSONL entries link to parents, so read the active branch rather than assuming file order describes one conversation. Limit transcript searches to the requested workspace.

For `recall`, `reflect`, `show-me-your-work`, and session pickup, use pi transcripts and the actual session file. The transcript finder understands pi branches. For `create-verification-skill` and `automate-me`, write to pi's project skill locations. For `why`, discover evidence tools from the current session. Do not assume another runtime's MCP configuration is active.

For app verification, run the CLI through `bash` or use available UI automation. For `teach`, use available image tools or a text diagram. For babysitting and orchestration, session loops can keep a running coordinator active. Durable scheduling and cloud-worker steps require a separate capability and explicit authorization. Report missing capabilities instead of claiming they were armed.

The bundled scripts use Bun and the configured forge CLI. Pass the pi transcript directory explicitly to `worktree-audit.mjs` as its second argument after the repository path. Its default transcript directory belongs to Claude Code.

Pi loads `AGENTS.md` or `CLAUDE.md` from the workspace and parent directories, plus its global instructions. References to an instructions file mean the file pi actually loads for this project.
