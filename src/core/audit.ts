/**
 * FORGE Audit Trail
 * 
 * Complete logging of every agent action for traceability,
 * debugging, and stakeholder transparency.
 */

import type { ForgeAgent } from './handoff';

// ============================================================================
// Types
// ============================================================================

export interface AuditEntry {
  id: string;
  timestamp: Date;
  projectId: string;
  
  // Who did what
  agent: ForgeAgent;
  action: AuditAction;
  
  // Details
  inputs: string[];
  outputs: string[];
  
  // Metrics
  duration: number;  // milliseconds
  
  // Human interaction
  humanApproval: boolean;
  humanNotes: string;
  
  // Outcome
  success: boolean;
  errorMessage: string | null;
}

export type AuditAction =
  // Frame actions
  | 'F:evaluate_idea'
  | 'F:update_prd'
  | 'F:create_feature_spec'
  
  // Orchestrate actions
  | 'O:analyze_codebase'
  | 'O:create_build_plan'
  | 'O:create_pr_structure'
  | 'O:update_tech_spec'
  
  // Refine actions
  | 'R:validate_alignment'
  | 'R:identify_gaps'
  | 'R:check_naming_consistency'
  | 'R:produce_recommendations'
  
  // Govern actions
  | 'G:setup_infrastructure'
  | 'G:create_handoff_packet'
  | 'G:review_code'
  | 'G:create_pr'
  | 'G:merge_pr'
  | 'G:update_documentation'
  | 'G:update_stakeholder_portal'
  | 'G:dispatch_qa'
  
  // Execute actions
  | 'E:governance_check'
  | 'E:write_tests'
  | 'E:write_code'
  | 'E:commit_to_branch'
  
  // Quality actions
  | 'Q:run_tests'
  | 'Q:run_lint'
  | 'Q:check_coverage'
  | 'Q:security_scan'
  
  // Human actions
  | 'human:approve'
  | 'human:reject'
  | 'human:provide_feedback'
  | 'human:provide_credentials';

// ============================================================================
// Audit Log
// ============================================================================

export class AuditLog {
  private entries: AuditEntry[] = [];
  private projectId: string;
  private entryCounter: number = 0;
  
  constructor(projectId: string) {
    this.projectId = projectId;
  }
  
  /**
   * Log an agent action
   */
  log(params: {
    agent: ForgeAgent;
    action: AuditAction;
    inputs?: string[];
    outputs?: string[];
    duration?: number;
    humanApproval?: boolean;
    humanNotes?: string;
    success?: boolean;
    errorMessage?: string | null;
  }): AuditEntry {
    const entry: AuditEntry = {
      id: `${this.projectId}-audit-${++this.entryCounter}`,
      timestamp: new Date(),
      projectId: this.projectId,
      agent: params.agent,
      action: params.action,
      inputs: params.inputs || [],
      outputs: params.outputs || [],
      duration: params.duration || 0,
      humanApproval: params.humanApproval || false,
      humanNotes: params.humanNotes || '',
      success: params.success ?? true,
      errorMessage: params.errorMessage || null,
    };
    
    this.entries.push(entry);
    return entry;
  }
  
  /**
   * Get all entries
   */
  getAll(): AuditEntry[] {
    return [...this.entries];
  }
  
  /**
   * Get entries by agent
   */
  getByAgent(agent: ForgeAgent): AuditEntry[] {
    return this.entries.filter(e => e.agent === agent);
  }
  
  /**
   * Get entries by action type
   */
  getByAction(action: AuditAction): AuditEntry[] {
    return this.entries.filter(e => e.action === action);
  }
  
  /**
   * Get entries in time range
   */
  getInRange(start: Date, end: Date): AuditEntry[] {
    return this.entries.filter(e => 
      e.timestamp >= start && e.timestamp <= end
    );
  }
  
  /**
   * Get summary statistics
   */
  getSummary(): AuditSummary {
    const byAgent: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let totalDuration = 0;
    let successCount = 0;
    let humanApprovals = 0;
    
    for (const entry of this.entries) {
      byAgent[entry.agent] = (byAgent[entry.agent] || 0) + 1;
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      totalDuration += entry.duration;
      if (entry.success) successCount++;
      if (entry.humanApproval) humanApprovals++;
    }
    
    return {
      totalEntries: this.entries.length,
      byAgent,
      byAction,
      totalDuration,
      averageDuration: this.entries.length > 0 
        ? totalDuration / this.entries.length 
        : 0,
      successRate: this.entries.length > 0 
        ? successCount / this.entries.length 
        : 0,
      humanApprovals,
    };
  }
  
  /**
   * Export to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }
  
  /**
   * Export to Markdown (for human review)
   */
  toMarkdown(): string {
    const lines: string[] = [];
    
    lines.push('# FORGE Audit Trail');
    lines.push('');
    lines.push(`**Project:** ${this.projectId}`);
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Total Entries:** ${this.entries.length}`);
    lines.push('');
    
    // Summary
    const summary = this.getSummary();
    lines.push('## Summary');
    lines.push('');
    lines.push('### By Agent');
    lines.push('| Agent | Actions |');
    lines.push('|-------|---------|');
    for (const [agent, count] of Object.entries(summary.byAgent)) {
      lines.push(`| ${agent} | ${count} |`);
    }
    lines.push('');
    
    lines.push(`**Success Rate:** ${(summary.successRate * 100).toFixed(1)}%`);
    lines.push(`**Human Approvals:** ${summary.humanApprovals}`);
    lines.push(`**Total Duration:** ${(summary.totalDuration / 1000).toFixed(1)}s`);
    lines.push('');
    
    // Timeline
    lines.push('## Timeline');
    lines.push('');
    
    for (const entry of this.entries) {
      const time = entry.timestamp.toISOString().replace('T', ' ').substring(0, 19);
      const status = entry.success ? '✅' : '❌';
      const approval = entry.humanApproval ? ' 👤' : '';
      
      lines.push(`### ${time} — ${entry.agent}: ${entry.action} ${status}${approval}`);
      
      if (entry.inputs.length > 0) {
        lines.push(`**Inputs:** ${entry.inputs.join(', ')}`);
      }
      if (entry.outputs.length > 0) {
        lines.push(`**Outputs:** ${entry.outputs.join(', ')}`);
      }
      if (entry.humanNotes) {
        lines.push(`**Human Notes:** ${entry.humanNotes}`);
      }
      if (entry.errorMessage) {
        lines.push(`**Error:** ${entry.errorMessage}`);
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// ============================================================================
// Types
// ============================================================================

interface AuditSummary {
  totalEntries: number;
  byAgent: Record<string, number>;
  byAction: Record<string, number>;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  humanApprovals: number;
}
