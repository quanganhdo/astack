# Run AStack in pi

AStack uses one skill tree for Claude Code, Codex, and pi. The pi package adds local subagents, messaging, questions, session loops, and routing instructions. It requires pi 1.3.0 or later.

## Install the package

Install from your AStack checkout:

```sh
pi install /absolute/path/to/astack
```

Restart pi, then invoke `/skill:poteto-mode`. Use `/astack-agents` to inspect child activity and transcript paths. A temporary development session can load the extension and skills directly:

```sh
pi --extension /absolute/path/to/astack/plugins/astack/pi/index.ts \
	--skill /absolute/path/to/astack/plugins/astack/skills
```

Use your runtime manager to install pi. This package does not upgrade pi or change the selected provider when it loads.

## Select models and effort

Use pi's `/login` and model selector to configure the provider you want. For a Codex subscription, select the OpenAI Codex provider and check the available models with `pi --list-models`.

Run `/skill:setup-astack` to configure role choices. The pi extension reads `astack-models.md` in `$PI_CODING_AGENT_DIR`, or `~/.pi/agent` when that variable is unset. It adds the sheet to each run's context. No include line in another instructions file is needed. `session hook: off` disables automatic workflow routing while leaving the tools available.

Role rows guide the agent's choices. To restrict the actual model and effort used by AStack child agents, create `astack-policy.json` in the same directory. For example:

```json
{
	"permittedModels": [
		"openai-codex/gpt-6.1-sol",
		"openai-codex/gpt-6-luna"
	],
	"allowedEfforts": ["low", "medium", "high"],
	"defaultEffort": "medium",
	"fallbackEffort": "medium"
}
```

The policy applies to new and resumed AStack children. An explicit forbidden model or effort fails before a child starts. If a permitted choice is absent from the catalog or lacks configured authentication, the adapter can select another permitted model at the fallback effort. It refuses dispatch when no permitted choice passes preflight. Configured authentication does not prove that the provider will accept a request. Failures after launch do not cause a second model request.

An absent policy uses the package's generic model configuration. An invalid existing policy refuses dispatch. Package loading never writes this policy. The policy controls AStack children, so it does not restrict independent pi sessions or shell commands.

## Understand session limits

The extension supplies `agent`, `send_message`, `list_agents`, `stop_agent`, `ask_user_question`, and `schedule_wakeup`. Shared workflow tool names map through the [pi reference](../plugins/astack/skills/poteto-mode/references/pi-tools.md).

Loops and wakeups last for the current pi process. They stop when the session shuts down and do not create durable scheduled jobs. Cursor cloud agents, Cursor Automations, and Benny do not gain pi equivalents through this package.

Reviewer mode removes the `edit` and `write` tools. It retains shell access, so it is a cooperative review convention rather than filesystem enforcement.

## Verify a local change

Run the repository checks with the installed pi available on `PATH`. Use the [runtime acceptance guide](runtime-acceptance.md) for the distinction between offline checks, native child startup, and live provider acceptance. Keep test configuration under a disposable `PI_CODING_AGENT_DIR`; do not point test fixtures at your normal configuration directory.
