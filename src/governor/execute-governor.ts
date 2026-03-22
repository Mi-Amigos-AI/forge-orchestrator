/**
 * FORGE Execute Governor
 * 
 * Controls parallel agent execution to prevent runaway code generation.
 * This is the key innovation that prevents the "Atlas problem" - where
 * parallel agents write spaghetti code without coordination.
 */

import { EventEmitter } from 'events';
import type {
  AgentInstance,
  AgentStatus,
  FileChange,
  WorkItem,
  QualityReport,
  ForgeConfig,
  AuditEntry,
} from '../core/types';

// ============================================================================
// Types
// ============================================================================

interface Task {
  id: string;
  workItemId: string;
  description: string;
  targetFiles: string[];
  spec: string;
  priority: number;
}

interface FileLock {
  path: string;
  agentId: string;
  acquiredAt: Date;
}

type GovernorEvent = 
  | 'agent:spawned'
  | 'agent:completed'
  | 'agent:failed'
  | 'agent:killed'
  | 'task:queued'
  | 'task:started'
  | 'task:completed'
  | 'quality:passed'
  | 'quality:failed'
  | 'escalation:human';

// ============================================================================
// Execute Governor
// ============================================================================

export class ExecuteGovernor extends EventEmitter {
  private config: ForgeConfig;
  private activeAgents: Map<string, AgentInstance> = new Map();
  private pendingTasks: Task[] = [];
  private completedTasks: Task[] = [];
  private fileLocks: Map<string, FileLock> = new Map();
  private auditLog: AuditEntry[] = [];
  
  constructor(config: ForgeConfig) {
    super();
    this.config = config;
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  /**
   * Submit a work item for execution.
   * Returns when the work item is complete and has passed quality gates.
   */
  async execute(workItem: WorkItem): Promise<QualityReport> {
    this.log('execute:start', { workItemId: workItem.id });
    
    // Break work item into tasks
    const tasks = this.planTasks(workItem);
    
    // Queue all tasks
    for (const task of tasks) {
      this.queueTask(task);
    }
    
    // Process tasks with controlled parallelism
    await this.processTaskQueue();
    
    // Collect all changes from completed tasks
    const allChanges = this.collectChanges();
    
    // Run quality gates
    const report = await this.runQualityGates(workItem.id, allChanges);
    
    if (!report.passed) {
      // Quality failed - return to caller with report
      this.emit('quality:failed', { workItemId: workItem.id, report });
      
      // Check retry count
      const retryCount = this.getRetryCount(workItem.id);
      if (retryCount >= this.config.execute.maxRetries) {
        this.emit('escalation:human', { 
          workItemId: workItem.id, 
          reason: 'max_retries_exceeded',
          report 
        });
      }
    } else {
      this.emit('quality:passed', { workItemId: workItem.id, report });
    }
    
    this.log('execute:complete', { 
      workItemId: workItem.id, 
      passed: report.passed 
    });
    
    return report;
  }
  
  /**
   * Get current status of the governor.
   */
  getStatus(): GovernorStatus {
    return {
      activeAgents: this.activeAgents.size,
      maxAgents: this.config.execute.maxConcurrentAgents,
      pendingTasks: this.pendingTasks.length,
      completedTasks: this.completedTasks.length,
      lockedFiles: Array.from(this.fileLocks.keys()),
    };
  }
  
  /**
   * Pause a specific agent.
   */
  pauseAgent(agentId: string): boolean {
    const agent = this.activeAgents.get(agentId);
    if (!agent) return false;
    
    agent.status = 'paused';
    this.log('agent:paused', { agentId });
    return true;
  }
  
  /**
   * Resume a paused agent.
   */
  resumeAgent(agentId: string): boolean {
    const agent = this.activeAgents.get(agentId);
    if (!agent || agent.status !== 'paused') return false;
    
    agent.status = 'working';
    this.log('agent:resumed', { agentId });
    return true;
  }
  
  /**
   * Kill an agent immediately.
   */
  killAgent(agentId: string): boolean {
    const agent = this.activeAgents.get(agentId);
    if (!agent) return false;
    
    // Release file locks
    this.releaseAllLocks(agentId);
    
    // Update status
    agent.status = 'killed';
    this.activeAgents.delete(agentId);
    
    this.emit('agent:killed', { agentId });
    this.log('agent:killed', { agentId });
    
    return true;
  }
  
  /**
   * Pause all agents.
   */
  pauseAll(): void {
    for (const [agentId, agent] of this.activeAgents) {
      if (agent.status === 'working') {
        agent.status = 'paused';
      }
    }
    this.log('governor:paused_all', {});
  }
  
  /**
   * Resume all paused agents.
   */
  resumeAll(): void {
    for (const [agentId, agent] of this.activeAgents) {
      if (agent.status === 'paused') {
        agent.status = 'working';
      }
    }
    this.log('governor:resumed_all', {});
  }
  
  // ==========================================================================
  // Task Management
  // ==========================================================================
  
  private planTasks(workItem: WorkItem): Task[] {
    // This would use AI to break down the work item into discrete tasks
    // For now, return a single task for the whole work item
    return [{
      id: `task-${workItem.id}-1`,
      workItemId: workItem.id,
      description: workItem.description,
      targetFiles: [],  // Would be determined by spec analysis
      spec: workItem.spec?.technicalApproach || '',
      priority: 1,
    }];
  }
  
  private queueTask(task: Task): void {
    this.pendingTasks.push(task);
    this.pendingTasks.sort((a, b) => b.priority - a.priority);
    this.emit('task:queued', { taskId: task.id });
    this.log('task:queued', { taskId: task.id, workItemId: task.workItemId });
  }
  
  private async processTaskQueue(): Promise<void> {
    while (this.pendingTasks.length > 0) {
      // Wait for available agent slot
      while (this.activeAgents.size >= this.config.execute.maxConcurrentAgents) {
        await this.waitForAgentSlot();
      }
      
      // Get next task
      const task = this.pendingTasks.shift();
      if (!task) continue;
      
      // Check file locks - can we execute this task?
      if (!this.canExecuteTask(task)) {
        // Re-queue at lower priority
        task.priority -= 1;
        this.queueTask(task);
        continue;
      }
      
      // Spawn agent for task
      await this.spawnAgent(task);
    }
    
    // Wait for all active agents to complete
    await this.waitForAllAgents();
  }
  
  private canExecuteTask(task: Task): boolean {
    // Check if any target files are locked by other agents
    for (const file of task.targetFiles) {
      const lock = this.fileLocks.get(file);
      if (lock) {
        return false;
      }
    }
    return true;
  }
  
  // ==========================================================================
  // Agent Lifecycle
  // ==========================================================================
  
  private async spawnAgent(task: Task): Promise<AgentInstance> {
    const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const agent: AgentInstance = {
      id: agentId,
      type: 'executor',
      status: 'working',
      assignedTask: task.id,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      filesLocked: [],
      changesProposed: [],
      errorCount: 0,
    };
    
    // Lock target files
    for (const file of task.targetFiles) {
      this.lockFile(file, agentId);
      agent.filesLocked.push(file);
    }
    
    this.activeAgents.set(agentId, agent);
    this.emit('agent:spawned', { agentId, taskId: task.id });
    this.log('agent:spawned', { agentId, taskId: task.id });
    
    // Execute agent (async - would invoke actual AI agent)
    this.executeAgent(agent, task).catch(error => {
      this.handleAgentError(agent, error);
    });
    
    return agent;
  }
  
  private async executeAgent(agent: AgentInstance, task: Task): Promise<void> {
    // This would invoke the actual AI coding agent
    // For now, simulate work
    
    const timeout = this.config.execute.agentTimeout * 1000;
    const startTime = Date.now();
    
    // TODO: Integrate with actual AI agent (Claude, Codex, etc.)
    // The agent would:
    // 1. Read the spec
    // 2. Generate code changes
    // 3. Submit changes for review
    
    // Simulate completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mark complete
    agent.status = 'completed';
    this.emit('agent:completed', { agentId: agent.id, taskId: task.id });
    this.log('agent:completed', { agentId: agent.id, taskId: task.id });
    
    // Release locks
    this.releaseAllLocks(agent.id);
    
    // Move task to completed
    this.completedTasks.push(task);
    
    // Remove from active
    this.activeAgents.delete(agent.id);
  }
  
  private handleAgentError(agent: AgentInstance, error: Error): void {
    agent.errorCount += 1;
    agent.status = 'failed';
    
    this.emit('agent:failed', { 
      agentId: agent.id, 
      error: error.message,
      errorCount: agent.errorCount 
    });
    
    this.log('agent:failed', { 
      agentId: agent.id, 
      error: error.message 
    });
    
    // Release locks
    this.releaseAllLocks(agent.id);
    
    // Check if should escalate
    if (agent.errorCount >= this.config.execute.maxRetries) {
      this.emit('escalation:human', {
        agentId: agent.id,
        reason: 'agent_repeated_failure',
        errorCount: agent.errorCount,
      });
    }
    
    // Remove from active
    this.activeAgents.delete(agent.id);
  }
  
  // ==========================================================================
  // File Locking
  // ==========================================================================
  
  private lockFile(path: string, agentId: string): boolean {
    if (this.fileLocks.has(path)) {
      return false;
    }
    
    this.fileLocks.set(path, {
      path,
      agentId,
      acquiredAt: new Date(),
    });
    
    return true;
  }
  
  private releaseFile(path: string, agentId: string): boolean {
    const lock = this.fileLocks.get(path);
    if (!lock || lock.agentId !== agentId) {
      return false;
    }
    
    this.fileLocks.delete(path);
    return true;
  }
  
  private releaseAllLocks(agentId: string): void {
    for (const [path, lock] of this.fileLocks) {
      if (lock.agentId === agentId) {
        this.fileLocks.delete(path);
      }
    }
  }
  
  // ==========================================================================
  // Quality Gates
  // ==========================================================================
  
  private async runQualityGates(
    workItemId: string, 
    changes: FileChange[]
  ): Promise<QualityReport> {
    // TODO: Implement actual quality checks
    // - Run linter
    // - Run tests
    // - Check coverage
    // - Security scan
    
    const report: QualityReport = {
      id: `qr-${Date.now()}`,
      workItemId,
      timestamp: new Date(),
      passed: true,
      lint: { passed: true, errors: 0, warnings: 0, details: [] },
      tests: { 
        passed: true, 
        total: 0, 
        passed_count: 0, 
        failed_count: 0, 
        skipped_count: 0,
        failures: [] 
      },
      coverage: { 
        passed: true, 
        percentage: 0, 
        threshold: this.config.quality.minCoverage,
        uncoveredFiles: [] 
      },
      security: { passed: true, vulnerabilities: [] },
      issues: [],
      recommendations: [],
    };
    
    return report;
  }
  
  // ==========================================================================
  // Helpers
  // ==========================================================================
  
  private collectChanges(): FileChange[] {
    const changes: FileChange[] = [];
    
    for (const task of this.completedTasks) {
      // Would collect changes from agent execution
    }
    
    return changes;
  }
  
  private getRetryCount(workItemId: string): number {
    // Track retries per work item
    return 0;
  }
  
  private async waitForAgentSlot(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (this.activeAgents.size < this.config.execute.maxConcurrentAgents) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
  
  private async waitForAllAgents(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (this.activeAgents.size === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
  
  private log(action: string, data: Record<string, unknown>): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      projectId: '',  // Would be set from context
      phase: 'executing',
      actor: { type: 'orchestrator', id: 'execute-governor' },
      action,
      input: data,
      output: {},
      duration: 0,
      success: true,
    };
    
    this.auditLog.push(entry);
  }
}

// ============================================================================
// Types
// ============================================================================

interface GovernorStatus {
  activeAgents: number;
  maxAgents: number;
  pendingTasks: number;
  completedTasks: number;
  lockedFiles: string[];
}

export type { GovernorStatus, Task };
