/**
 * FORGE Orchestrator - Core Types
 * 
 * Type definitions for the FORGE methodology enforcement system.
 */

// ============================================================================
// State Machine Types
// ============================================================================

export type ForgePhase = 
  | 'idle'
  | 'framing'       // F: Defining scope and requirements
  | 'orchestrating' // O: Breaking into branches/PRs
  | 'refining'      // R: Iterating with human feedback
  | 'governing'     // G: Quality gates and approvals
  | 'executing'     // E: Controlled code generation
  | 'reviewing'     // Q: Quality check before merge
  | 'complete';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

// ============================================================================
// Project Types
// ============================================================================

export interface ForgeProject {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  
  // State
  phase: ForgePhase;
  phaseStartedAt: Date;
  
  // Artifacts
  prd: ProductRequirementsDoc | null;
  workPlan: WorkPlan | null;
  governance: GovernanceCriteria | null;
  
  // Execution
  currentWorkItem: string | null;
  completedWorkItems: string[];
  
  // Config
  config: ForgeConfig;
}

export interface ProductRequirementsDoc {
  id: string;
  version: number;
  title: string;
  goals: string[];
  scope: ScopeDefinition;
  constraints: string[];
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface ScopeDefinition {
  inScope: string[];
  outOfScope: string[];
  assumptions: string[];
  dependencies: string[];
}

export interface WorkPlan {
  id: string;
  version: number;
  workItems: WorkItem[];
  branchStrategy: BranchStrategy;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  branch: string;
  prNumber: number | null;
  dependencies: string[];  // IDs of other work items
  spec: WorkItemSpec | null;
  status: WorkItemStatus;
  assignedAgent: string | null;
}

export type WorkItemStatus = 
  | 'pending'
  | 'spec_in_progress'
  | 'spec_approved'
  | 'executing'
  | 'in_review'
  | 'approved'
  | 'merged'
  | 'failed';

export interface WorkItemSpec {
  id: string;
  version: number;
  acceptance: string[];
  technicalApproach: string;
  testCases: TestCase[];
  approvalStatus: ApprovalStatus;
}

export interface TestCase {
  id: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e';
  expectedBehavior: string;
}

export interface BranchStrategy {
  baseBranch: string;
  featureBranchPrefix: string;
  mergeStrategy: 'squash' | 'merge' | 'rebase';
}

export interface GovernanceCriteria {
  id: string;
  version: number;
  
  // Quality requirements
  requireTests: boolean;
  minTestCoverage: number;
  requireLint: boolean;
  requireSecurityScan: boolean;
  
  // Review requirements
  requireHumanReview: boolean;
  requiredReviewers: number;
  
  // Approval
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentInstance {
  id: string;
  type: AgentType;
  status: AgentStatus;
  assignedTask: string | null;
  startedAt: Date;
  lastActivityAt: Date;
  
  // Tracking
  filesLocked: string[];
  changesProposed: FileChange[];
  errorCount: number;
}

export type AgentType = 
  | 'framer'
  | 'orchestrator'
  | 'refiner'
  | 'governor'
  | 'executor'
  | 'quality';

export type AgentStatus = 
  | 'idle'
  | 'working'
  | 'paused'
  | 'awaiting_review'
  | 'completed'
  | 'failed'
  | 'killed';

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff?: string;
}

// ============================================================================
// Quality Types
// ============================================================================

export interface QualityReport {
  id: string;
  workItemId: string;
  timestamp: Date;
  passed: boolean;
  
  // Checks
  lint: CheckResult;
  tests: TestResult;
  coverage: CoverageResult;
  security: SecurityResult;
  
  // Summary
  issues: QualityIssue[];
  recommendations: string[];
}

export interface CheckResult {
  passed: boolean;
  errors: number;
  warnings: number;
  details: string[];
}

export interface TestResult {
  passed: boolean;
  total: number;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  failures: TestFailure[];
}

export interface TestFailure {
  name: string;
  message: string;
  stack?: string;
}

export interface CoverageResult {
  passed: boolean;
  percentage: number;
  threshold: number;
  uncoveredFiles: string[];
}

export interface SecurityResult {
  passed: boolean;
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file: string;
  line?: number;
  recommendation: string;
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'lint' | 'test' | 'coverage' | 'security' | 'other';
  message: string;
  file?: string;
  line?: number;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditEntry {
  id: string;
  timestamp: Date;
  projectId: string;
  
  // Context
  phase: ForgePhase;
  actor: AuditActor;
  
  // Action
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  
  // Metadata
  duration: number;  // ms
  success: boolean;
  errorMessage?: string;
}

export interface AuditActor {
  type: 'human' | 'orchestrator' | 'agent';
  id: string;
  name?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ForgeConfig {
  // Execute phase
  execute: {
    maxConcurrentAgents: number;
    agentTimeout: number;  // seconds
    maxRetries: number;
  };
  
  // Quality gates
  quality: {
    requireTests: boolean;
    requireLint: boolean;
    securityScan: boolean;
    minCoverage: number;
  };
  
  // Human approval requirements
  governance: {
    requireHumanApproval: ForgePhase[];
    autoApprove: ForgePhase[];
  };
  
  // Git
  git: {
    baseBranch: string;
    featureBranchPrefix: string;
    commitMessagePrefix: string;
  };
}

export const DEFAULT_CONFIG: ForgeConfig = {
  execute: {
    maxConcurrentAgents: 3,
    agentTimeout: 300,
    maxRetries: 3,
  },
  quality: {
    requireTests: true,
    requireLint: true,
    securityScan: true,
    minCoverage: 80,
  },
  governance: {
    requireHumanApproval: ['framing', 'orchestrating', 'governing'],
    autoApprove: [],
  },
  git: {
    baseBranch: 'main',
    featureBranchPrefix: 'forge/',
    commitMessagePrefix: '[FORGE]',
  },
};
