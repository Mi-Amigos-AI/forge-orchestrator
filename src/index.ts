/**
 * FORGE Orchestrator
 * 
 * Disciplined AI development through enforced methodology.
 * 
 * @module forge-orchestrator
 */

// Core types
export * from './core/types';

// Handoff Packet System
export {
  HandoffPacketFactory,
  GovernanceChecker,
  renderPacketToMarkdown,
} from './core/handoff';
export type {
  HandoffPacket,
  ForgeAgent,
  PacketStatus,
  PacketInput,
  GovernanceCheck,
} from './core/handoff';

// Audit Trail
export { AuditLog } from './core/audit';
export type { AuditEntry, AuditAction } from './core/audit';

// Execute Governor
export { ExecuteGovernor } from './governor/execute-governor';
export type { GovernorStatus, Task } from './governor/execute-governor';

// Version
export const VERSION = '0.1.0';
