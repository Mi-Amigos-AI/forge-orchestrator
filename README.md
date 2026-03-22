# FORGE Orchestrator

**Disciplined AI development through enforced methodology.**

FORGE Orchestrator is a governance layer for AI coding agents that enforces the FORGE methodology:
- **F**rame — Define scope, requirements, and constraints before writing code
- **O**rchestrate — Break work into branches, PRs, and reviewable units
- **R**efine — Iterate on designs with human feedback before implementation
- **G**overn — Quality gates, tests, and approval checkpoints
- **E**xecute — Controlled code generation with parallel agent governance

## The Problem

Modern AI coding tools (Claude Code, Codex, Manus, etc.) default to "fire-ready-aim":
- No specs before code
- No branch/PR discipline
- No quality gates
- Parallel execution without coordination
- "Works on my machine" syndrome
- Spaghetti code without tests

The result: code that's hard to maintain, dangerous to deploy, and impossible for humans to review.

## The Solution

FORGE Orchestrator wraps AI coding agents with a governance layer that:

1. **Enforces Flow** — Can't skip from Frame to Execute
2. **Controls Parallelism** — Execute phase has a governor that limits concurrent agents
3. **Requires Quality Gates** — Every code change passes through Q (Quality Agent) before merge
4. **Maintains Visibility** — Full audit log of what each agent did and why
5. **Enables Human Guidance** — Pause, inspect, redirect at any point

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FORGE Orchestrator                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────┐   ┌───────────┐   ┌────────┐   ┌────────┐     │
│  │  F  │ → │     O     │ → │   R    │ → │   G    │     │
│  │Frame│   │Orchestrate│   │ Refine │   │ Govern │     │
│  └─────┘   └───────────┘   └────────┘   └────────┘     │
│                                              ↓          │
│                                     ┌───────────────┐   │
│                                     │   E Governor  │   │
│                                     │  ┌─────────┐  │   │
│                                     │  │ Agent 1 │  │   │
│                                     │  │ Agent 2 │  │   │
│                                     │  │ Agent 3 │  │   │
│                                     │  └─────────┘  │   │
│                                     │  (max 3)      │   │
│                                     └───────────────┘   │
│                                              ↓          │
│                                     ┌───────────────┐   │
│                                     │  Q (Quality)  │   │
│                                     │  Gate Check   │   │
│                                     └───────────────┘   │
│                                              ↓          │
│                                          [Merge]        │
└─────────────────────────────────────────────────────────┘
```

## Integration Options

| Method | Use Case |
|--------|----------|
| **OpenClaw Plugin** | Drop-in for Clawdbot/OpenClaw instances |
| **MCP Server** | Standard protocol for Claude-based tools |
| **REST API** | External service for any AI coding tool |
| **CLI Wrapper** | Wrap existing tools (claude, codex, etc.) |

## Philosophy

FORGE embodies **augmented intelligence** — AI helping humans be better, not replacing them.

When AI writes code through FORGE:
- Humans can see every step
- Humans can intervene at any point
- The code is reviewable, testable, maintainable
- There's a clear audit trail of decisions

The goal isn't speed — it's **trust**.

## Status

🚧 **Active Development** — Building proof-of-concept

## License

Apache 2.0

---

*Created by [Mi Amigos AI](https://miamigos.ai) — Building AI teammates for businesses*
