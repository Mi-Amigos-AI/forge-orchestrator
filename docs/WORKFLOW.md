# FORGE Workflow — How It Actually Works

This document captures the real FORGE workflow based on production use at Mi Amigos AI, where it delivered an MVP in 6 weeks instead of 16, with less than 40 hours of actual work.

## The Core Principle

**Trust through transparency.** Every agent shows its work via handoff packets. Humans can intervene at any gate. The rhythm of packet → review → approve creates trust.

## Agent Responsibilities

### F (Frame) — Product Vision

**Focus:** Product, not code. PRD, not PRs.

**What F Does:**
- Takes a new idea or feature request
- Evaluates against roadmap and vision documents
- Creates/updates product requirements
- Defines what the user experience should look and feel like
- Identifies where new features fit into existing product

**What F Produces:**
- Updated PRD (Product Requirements Document)
- Feature specifications
- User stories
- UX requirements

**What F Does NOT Do:**
- Create branches or PRs
- Make technical decisions
- Write code

**Human Gate:** Human reviews and approves product direction before proceeding.

---

### O (Orchestrate) — Technical Planning

**Focus:** Technical path that weaves into existing codebase.

**What O Does:**
- Takes F's approved product output
- Analyzes existing code structure, database, look/feel
- Designs technical approach that integrates seamlessly
- Creates sprint structure with PRs
- Ensures new features don't step on existing functionality

**What O Produces:**
- BUILD_PLAN.md with ordered PRs
- Technical specifications (TECH.md)
- Database migration plans
- Integration strategy

**Critical Skill:** O must understand how to weave new features into existing code without breaking things.

**Human Gate:** Human reviews technical plan before R validates.

---

### R (Refine) — Validation & Gap Analysis

**Focus:** "If we execute O's plan, do we get F's product?"

**What R Does:**
- Reviews F's product specifications
- Reviews O's technical plan
- Mentally simulates execution
- Identifies gaps, inconsistencies, concerns
- Catches variable name mismatches (product says X, tech says Y)
- Validates alignment between vision and execution

**What R Produces:**
- Validation report (pass/fail)
- Gap analysis with specific issues
- Recommendations for fixes
- Variable/naming consistency checks

**Possible Outcomes:**
1. **Pass:** "F and O knocked it out of the park. Proceed."
2. **Gaps Found:** "Here are the issues and my recommendations."

**Human Gate:** Human reviews R's analysis, provides direction on fixes, then approves.

---

### G (Govern) — Infrastructure, Lifecycle & Transparency

**Focus:** Setup, PR lifecycle, stakeholder updates, governance.

**What G Does:**

**Infrastructure (early project):**
- Sets up Supabase project via CLI
- Creates GitHub repository
- Sets up Vercel project
- Lists what human needs to get (API keys, Stripe IDs, etc.)
- Configures environment variables

**PR Lifecycle:**
- Creates handoff packets for E
- Reviews E's completed work
- Creates PRs from branches
- Dispatches test/QA agents
- Merges approved PRs
- Updates BUILD_PLAN.md status

**Documentation & Transparency:**
- Updates all documentation after each PR
- Updates stakeholder portal (if exists)
- Maintains audit trail

**What G Produces:**
- Handoff packets for E (ready to copy/paste invoke)
- PR reviews
- Updated documentation
- Stakeholder portal updates
- Audit log entries

**Human Gate:** Human approves merges and major infrastructure decisions.

---

### E (Execute) — Disciplined Code Generation

**Focus:** Tests first, then super-documented code.

**What E Does:**

**Pre-Execution Governance Checks:**
1. Am I allowed to do this right now?
2. What does the handoff packet say?
3. Has everything been done before I start?
4. Does all governance check out?

**If checks pass:**
1. Write ALL tests first (before any implementation)
2. Write super-documented code
3. Ensure code passes all tests
4. Write to branch (not PR — G handles that)

**What E Produces:**
- Test files (written FIRST)
- Implementation code (super documented)
- Branch commits

**What E Does NOT Do:**
- Create PRs (G does this)
- Merge anything
- Skip governance checks
- Write code before tests

---

## The Handoff Packet System

Handoff packets are the key coordination mechanism. They:

1. **Create Rhythm** — Regular checkpoints, not continuous chaos
2. **Enable Intervention** — Human can step in at any packet
3. **Provide Audit Trail** — Everything is documented
4. **Force Discipline** — Agents must articulate what they're doing

### Packet Structure

```markdown
# Handoff Packet: [PR-XXX] [Title]

## Context
What has been done. What is the current state.

## Objective
What this packet is asking the next agent to do.

## Inputs
- Links to relevant documents
- Dependencies completed
- Governance status

## Expected Outputs
What the receiving agent should produce.

## Governance Checks
- [ ] Product spec approved
- [ ] Technical plan approved
- [ ] Previous PR merged
- [ ] Tests passing

## Invocation
Ready-to-copy command for human:
```
@E approved, proceed with handoff-packet-pr-xxx
```
```

---

## The Complete Flow

```
Human has idea
       ↓
   @F: "Add feature X"
       ↓
   F evaluates against roadmap/vision
       ↓
   F produces updated product docs
       ↓
   Human reviews and approves ←──────────────────────┐
       ↓                                              │
   @O: "Design technical path"                        │
       ↓                                              │
   O creates BUILD_PLAN with PRs                      │
       ↓                                              │
   Human reviews and approves                         │
       ↓                                              │
   @R: "Validate O's plan produces F's product"       │
       ↓                                              │
   R identifies gaps or validates                     │
       ↓                                              │
   Human reviews, provides direction ─── (if gaps) ───┘
       ↓
   @G: "Set up infrastructure" (if needed)
       ↓
   G creates Supabase/GitHub/Vercel
       ↓
   Human provides API keys
       ↓
   @G: "Create handoff for PR-001"
       ↓
   G produces handoff packet
       ↓
   Human invokes: @E approved, proceed with PR-001
       ↓
   E runs governance checks
       ↓
   E writes tests FIRST
       ↓
   E writes super-documented code
       ↓
   E commits to branch
       ↓
   @G: "Review and create PR"
       ↓
   G reviews, creates PR, dispatches QA
       ↓
   Human tests and reviews
       ↓
   Human: "Looks good, merge it"
       ↓
   G merges, updates docs, updates stakeholder portal
       ↓
   Repeat for PR-002, PR-003, ...
```

---

## Audit Trail Requirements

Every agent action should be logged:

```typescript
interface AuditEntry {
  timestamp: Date;
  agent: 'F' | 'O' | 'R' | 'G' | 'E' | 'Q';
  action: string;
  inputs: string[];
  outputs: string[];
  duration: number;
  humanApproval: boolean;
  notes: string;
}
```

The audit trail enables:
- Full traceability of every decision
- Debugging when things go wrong
- Learning from successful patterns
- Stakeholder transparency

---

## Why This Works

1. **Tests Before Code** — E never writes implementation without tests first
2. **Handoff Packets** — Creates rhythm and intervention points
3. **Validation Layer** — R catches misalignment before execution
4. **Human Gates** — Trust is built through approval points
5. **Transparency** — Stakeholder portal shows everything
6. **Governance Checks** — E validates it's allowed before proceeding
7. **Documentation Updates** — G keeps everything current after each PR

---

## Results

Using this workflow on a real project (Recall Tech):
- **Timeline:** 6 weeks instead of 16 weeks
- **Effort:** Less than 40 hours of actual work
- **Quality:** Bulletproof delivery
- **Trust:** Stakeholders could see everything at all times

---

*Documented by Amigo based on Leo Knight's production experience with FORGE.*
