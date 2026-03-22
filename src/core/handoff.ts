/**
 * FORGE Handoff Packet System
 * 
 * Handoff packets are the key coordination mechanism in FORGE.
 * They create rhythm, enable intervention, and provide audit trail.
 */

// ============================================================================
// Types
// ============================================================================

export interface HandoffPacket {
  id: string;
  title: string;
  prNumber: number | null;
  createdAt: Date;
  createdBy: ForgeAgent;
  targetAgent: ForgeAgent;
  
  // Context
  context: string;
  objective: string;
  
  // Inputs
  inputs: PacketInput[];
  
  // Expected outputs
  expectedOutputs: string[];
  
  // Governance
  governanceChecks: GovernanceCheck[];
  
  // Status
  status: PacketStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  
  // Invocation (ready-to-copy command)
  invocation: string;
}

export type ForgeAgent = 'F' | 'O' | 'R' | 'G' | 'E' | 'Q' | 'human';

export type PacketStatus = 
  | 'draft'
  | 'ready_for_review'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'rejected';

export interface PacketInput {
  type: 'document' | 'branch' | 'pr' | 'artifact';
  name: string;
  path: string;
  description: string;
}

export interface GovernanceCheck {
  id: string;
  description: string;
  required: boolean;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  checkedAt: Date | null;
  checkedBy: ForgeAgent | null;
  notes: string;
}

// ============================================================================
// Handoff Packet Factory
// ============================================================================

export class HandoffPacketFactory {
  private projectId: string;
  private packetCounter: number = 0;
  
  constructor(projectId: string) {
    this.projectId = projectId;
  }
  
  /**
   * Create a handoff packet for Execute phase
   */
  createExecutePacket(params: {
    prNumber: number;
    title: string;
    context: string;
    technicalSpec: string;
    testRequirements: string[];
    dependencies: string[];
  }): HandoffPacket {
    const id = `${this.projectId}-hp-${++this.packetCounter}`;
    
    return {
      id,
      title: `[PR-${params.prNumber}] ${params.title}`,
      prNumber: params.prNumber,
      createdAt: new Date(),
      createdBy: 'G',
      targetAgent: 'E',
      
      context: params.context,
      objective: `Implement PR-${params.prNumber}: ${params.title}`,
      
      inputs: [
        {
          type: 'document',
          name: 'Technical Spec',
          path: `docs/specs/pr-${params.prNumber}.md`,
          description: params.technicalSpec,
        },
        ...params.dependencies.map((dep, i) => ({
          type: 'pr' as const,
          name: `Dependency ${i + 1}`,
          path: dep,
          description: `Required PR: ${dep}`,
        })),
      ],
      
      expectedOutputs: [
        'All tests written and passing',
        'Implementation code (super documented)',
        'Branch commits pushed',
      ],
      
      governanceChecks: [
        {
          id: 'product-approved',
          description: 'Product specification approved',
          required: true,
          status: 'pending',
          checkedAt: null,
          checkedBy: null,
          notes: '',
        },
        {
          id: 'tech-plan-approved',
          description: 'Technical plan approved',
          required: true,
          status: 'pending',
          checkedAt: null,
          checkedBy: null,
          notes: '',
        },
        {
          id: 'dependencies-merged',
          description: 'All dependency PRs merged',
          required: params.dependencies.length > 0,
          status: params.dependencies.length > 0 ? 'pending' : 'skipped',
          checkedAt: null,
          checkedBy: null,
          notes: params.dependencies.length === 0 ? 'No dependencies' : '',
        },
        {
          id: 'tests-defined',
          description: 'Test requirements defined',
          required: true,
          status: 'pending',
          checkedAt: null,
          checkedBy: null,
          notes: '',
        },
      ],
      
      status: 'draft',
      approvedBy: null,
      approvedAt: null,
      
      invocation: `@E approved, proceed with handoff-packet-pr-${params.prNumber}`,
    };
  }
  
  /**
   * Create a handoff packet for Refine phase
   */
  createRefinePacket(params: {
    productDocPath: string;
    techPlanPath: string;
    context: string;
  }): HandoffPacket {
    const id = `${this.projectId}-hp-${++this.packetCounter}`;
    
    return {
      id,
      title: 'Validation: Product ↔ Technical Alignment',
      prNumber: null,
      createdAt: new Date(),
      createdBy: 'O',
      targetAgent: 'R',
      
      context: params.context,
      objective: "Validate: If we execute O's plan, do we get F's product?",
      
      inputs: [
        {
          type: 'document',
          name: 'Product Specification',
          path: params.productDocPath,
          description: "F's approved product requirements",
        },
        {
          type: 'document',
          name: 'Technical Plan',
          path: params.techPlanPath,
          description: "O's proposed build plan",
        },
      ],
      
      expectedOutputs: [
        'Validation report (pass/fail)',
        'Gap analysis (if any)',
        'Variable/naming consistency check',
        'Recommendations (if gaps found)',
      ],
      
      governanceChecks: [
        {
          id: 'product-spec-complete',
          description: 'Product specification is complete',
          required: true,
          status: 'pending',
          checkedAt: null,
          checkedBy: null,
          notes: '',
        },
        {
          id: 'tech-plan-complete',
          description: 'Technical plan is complete',
          required: true,
          status: 'pending',
          checkedAt: null,
          checkedBy: null,
          notes: '',
        },
      ],
      
      status: 'draft',
      approvedBy: null,
      approvedAt: null,
      
      invocation: '@R validate alignment between product and technical plan',
    };
  }
}

// ============================================================================
// Handoff Packet Renderer
// ============================================================================

export function renderPacketToMarkdown(packet: HandoffPacket): string {
  const lines: string[] = [];
  
  lines.push(`# Handoff Packet: ${packet.title}`);
  lines.push('');
  lines.push(`**ID:** ${packet.id}`);
  lines.push(`**Created:** ${packet.createdAt.toISOString()}`);
  lines.push(`**From:** ${packet.createdBy} → **To:** ${packet.targetAgent}`);
  lines.push(`**Status:** ${packet.status}`);
  lines.push('');
  
  lines.push('## Context');
  lines.push(packet.context);
  lines.push('');
  
  lines.push('## Objective');
  lines.push(packet.objective);
  lines.push('');
  
  lines.push('## Inputs');
  for (const input of packet.inputs) {
    lines.push(`- **${input.name}** (${input.type}): \`${input.path}\``);
    lines.push(`  ${input.description}`);
  }
  lines.push('');
  
  lines.push('## Expected Outputs');
  for (const output of packet.expectedOutputs) {
    lines.push(`- ${output}`);
  }
  lines.push('');
  
  lines.push('## Governance Checks');
  for (const check of packet.governanceChecks) {
    const statusIcon = check.status === 'passed' ? '✅' : 
                       check.status === 'failed' ? '❌' :
                       check.status === 'skipped' ? '⏭️' : '⬜';
    const required = check.required ? '' : ' (optional)';
    lines.push(`- ${statusIcon} ${check.description}${required}`);
    if (check.notes) {
      lines.push(`  *${check.notes}*`);
    }
  }
  lines.push('');
  
  lines.push('## Invocation');
  lines.push('```');
  lines.push(packet.invocation);
  lines.push('```');
  
  if (packet.approvedBy) {
    lines.push('');
    lines.push('---');
    lines.push(`**Approved by:** ${packet.approvedBy} at ${packet.approvedAt?.toISOString()}`);
  }
  
  return lines.join('\n');
}

// ============================================================================
// Governance Check Runner
// ============================================================================

export class GovernanceChecker {
  /**
   * Run all governance checks on a packet.
   * Returns true if all required checks pass.
   */
  async checkPacket(packet: HandoffPacket): Promise<{
    passed: boolean;
    results: GovernanceCheck[];
  }> {
    const results: GovernanceCheck[] = [];
    
    for (const check of packet.governanceChecks) {
      const result = await this.runCheck(check, packet);
      results.push(result);
    }
    
    const passed = results
      .filter(r => r.required)
      .every(r => r.status === 'passed' || r.status === 'skipped');
    
    return { passed, results };
  }
  
  private async runCheck(
    check: GovernanceCheck, 
    packet: HandoffPacket
  ): Promise<GovernanceCheck> {
    // TODO: Implement actual checks based on check.id
    // For now, return the check unchanged (would need manual verification)
    return {
      ...check,
      checkedAt: new Date(),
      checkedBy: 'G',
    };
  }
}
