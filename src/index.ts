/**
 * FORGE Orchestrator
 * 
 * Disciplined AI development through enforced methodology.
 * 
 * @module forge-orchestrator
 */

// Core types
export * from './core/types';

// Execute Governor
export { ExecuteGovernor } from './governor/execute-governor';
export type { GovernorStatus, Task } from './governor/execute-governor';

// Version
export const VERSION = '0.1.0';
