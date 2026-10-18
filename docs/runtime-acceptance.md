# Native runtime release checks

Set `ASTACK_ARTIFACTS_DIR` to an absolute directory outside every Git checkout. Run the committed release smoke test after installing the candidate in both harnesses:

```sh
bun tools/runtime-smoke.mjs "$ASTACK_ARTIFACTS_DIR/runtime"
```

The test requires authenticated Claude Code and Codex CLIs. It preserves raw responses and a result summary outside the repository, and fails unless:

- Claude's native session inventory contains this AStack version, every public command, and every declared agent.
- Claude successfully invokes the installed `astack:bro` skill without a permission failure.
- Codex successfully reads this version's installed `bro` skill from its native plugin cache and completes the requested rewrite.

It disables the old pstack plugin only in the Claude test process so its hook cannot compete with AStack. It does not change the user's persistent settings. Both model calls are read-only smoke requests with no delegation or workflow expansion.

This is native registration and execution evidence, not an exhaustive proof of all workflows. Repository tests separately cover reference reachability, hook enable/disable behavior, model mapping generation, sync conflict handling, and script behavior.

For changes to particular workflows, add focused behavioral evidence. Delegation changes need a dispatch check; installation lifecycle changes need update/reload/rollback checks. A release report must distinguish completed checks from untested surfaces.

The optional GitHub self-hosted runtime job accepts an operator-owned executable taking a plugin directory and an evidence directory. That executable must install and test the candidate before returning success; it must not replace the smoke check with manifest-only validation. A local scheduled agent can perform those steps on any commissioned host with both authenticated harnesses available. See [maintenance setup](maintenance.md).

## Pi acceptance

Pi 1.3.0 or later is required for the native extension. `tools/check.sh` runs the offline pi tests and typechecks against an installed pi SDK. The dedicated CI job pins pi 1.3.0 and requires both catalog and real child startup checks. These checks make no model requests.

To verify the OpenAI Codex integration using a configured local pi sign-in, run:

```sh
ASTACK_PI_CODEX_LIVE=1 bun test tests/pi/codex-live.test.mjs
```

This test makes real requests to `openai-codex/gpt-6.1-sol` and `openai-codex/gpt-6-luna`. It copies credentials into a disposable pi directory, loads the local package there, applies the two-model policy, and checks actual child transcripts, accepted effort, completion, and background notices. It does not change the normal pi provider or package settings. The temporary credentials are removed after the run. Catalog presence and configured authentication alone are not live acceptance.

The broader opt-in `ASTACK_PI_LIVE=1` suite exercises more lifecycle behavior and uses the shipped alias tables unless overridden. Review its model choices before running it. Session wakeups, cloud capability differences, and reviewer-mode limits are documented in [pi setup](pi.md).
