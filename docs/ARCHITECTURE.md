# FORGE Orchestrator Architecture

## Overview

FORGE Orchestrator is a governance layer that wraps AI coding agents, enforcing the FORGE methodology and preventing common failure modes like runaway parallel execution.

## Core Components

### 1. State Machine

The orchestrator maintains state for each project:

```typescript
type ForgeState = 
  | 'idle'
  | 'framing'      // F: Defining scope and requirements
  | 'orchestrating' // O: Breaking into branches/PRs
  | 'refining'     // R: Iterating with human feedback
  | 'governing'    // G: Quality gates and approvals
  | 'executing'    // E: Controlled code generation
  | 'reviewing'    // Q: Quality check before merge
  | 'complete';

interface ForgeProject {
  id: string;
  name: string;
  state: ForgeState;
  currentPR: string | null;
  workItems: WorkItem[];
  agents: AgentInstance[];
  auditLog: AuditEntry[];
}
```

### 2. Phase Handlers

Each FORGE phase has a dedicated handler:

#### Frame Handler
- Accepts: Project description, goals, constraints
- Produces: PRD (Product Requirements Document), scope definition
- Blocks until: Human approval of scope

#### Orchestrate Handler
- Accepts: Approved PRD
- Produces: Work breakdown, branch strategy, PR sequence
- Creates: Git branches, empty PR shells
- Blocks until: Human approval of work plan

#### Refine Handler
- Accepts: Work plan
- Produces: Detailed specs for each work item
- Iterates: With human feedback until approved
- Blocks until: All specs approved

#### Govern Handler
- Accepts: Approved specs
- Produces: Quality criteria, test requirements, acceptance criteria
- Defines: What "done" means for each work item
- Blocks until: Governance criteria approved

#### Execute Governor
- Accepts: Single work item with spec and governance criteria
- Spawns: Up to N agents (configurable, default 3)
- Controls: Agent lifecycle, prevents runaway execution
- Collects: Code output from each agent
- Blocks until: Code passes Quality gate

#### Quality Gate
- Accepts: Code from Execute phase
- Runs: Static analysis, tests, lint, security scan
- Produces: Pass/fail with detailed report
- On fail: Returns to Execute with specific feedback
- On pass: Proceeds to merge

### 3. Execute Governor (Detail)

The Execute Governor is the key innovation — it prevents the "Atlas problem" where parallel agents write spaghetti code.

```typescript
interface ExecuteGovernor {
  maxConcurrentAgents: number;  // Default: 3
  activeAgents: AgentInstance[];
  pendingTasks: Task[];
  completedTasks: Task[];
  
  // Control methods
  spawn(task: Task): AgentInstance;
  pause(agentId: string): void;
  resume(agentId: string): void;
  kill(agentId: string): void;
  
  // Coordination
  lockFile(path: string, agentId: string): boolean;
  releaseFile(path: string, agentId: string): void;
  
  // Quality gate
  submitForReview(agentId: string, changes: FileChange[]): ReviewResult;
}
```

Key behaviors:
- **File locking**: Only one agent can modify a file at a time
- **Task isolation**: Each agent works on a discrete task
- **Mandatory review**: All code passes through Quality gate
- **Circuit breaker**: If an agent fails 3 times, escalate to human

### 4. Audit Log

Every action is logged:

```typescript
interface AuditEntry {
  timestamp: Date;
  phase: ForgeState;
  actor: 'human' | 'orchestrator' | string;  // or agent ID
  action: string;
  input: any;
  output: any;
  duration: number;
}
```

This enables:
- Full traceability of decisions
- Human review of AI actions
- Debugging of failures
- Learning from patterns

## Integration Interfaces

### OpenClaw Plugin

```typescript
// skill: forge-orchestrator
export async function forge(ctx: SkillContext, params: ForgeParams) {
  const orchestrator = new ForgeOrchestrator(ctx);
  return orchestrator.run(params);
}
```

### MCP Server

```typescript
// MCP tool definitions
tools: [
  {
    name: 'forge_start',
    description: 'Start a new FORGE project',
    inputSchema: { /* ... */ }
  },
  {
    name: 'forge_status',
    description: 'Get current FORGE state',
    inputSchema: { /* ... */ }
  },
  {
    name: 'forge_approve',
    description: 'Approve current phase and proceed',
    inputSchema: { /* ... */ }
  },
  {
    name: 'forge_execute',
    description: 'Execute a work item through governed agents',
    inputSchema: { /* ... */ }
  }
]
```

### REST API

```
POST /projects                 # Start new FORGE project
GET  /projects/:id             # Get project status
POST /projects/:id/approve     # Approve current phase
POST /projects/:id/execute     # Execute work item
GET  /projects/:id/audit       # Get audit log
POST /projects/:id/pause       # Pause execution
POST /projects/:id/resume      # Resume execution
```

## Configuration

```yaml
forge:
  execute:
    maxConcurrentAgents: 3
    agentTimeout: 300  # seconds
    maxRetries: 3
  quality:
    requireTests: true
    requireLint: true
    securityScan: true
    minCoverage: 80
  governance:
    requireHumanApproval:
      - frame
      - orchestrate
      - govern
    autoApprove:
      - refine  # if changes are minor
```

## Error Handling

| Error Type | Response |
|------------|----------|
| Agent timeout | Kill agent, reassign task |
| Agent failure (3x) | Escalate to human |
| Quality gate failure | Return to Execute with feedback |
| File conflict | Queue conflicting agent |
| Human rejection | Return to previous phase |

## Security Considerations

- All agent actions are sandboxed
- File access is restricted to project directory
- Network access requires explicit approval
- Secrets are never passed to agents
- Audit log is append-only

## Future Enhancements

1. **Learning**: Track which patterns cause failures, adapt
2. **Caching**: Reuse specs/code for similar tasks
3. **Multi-project**: Coordinate across related projects
4. **Metrics**: Success rates, time-to-complete, quality scores
