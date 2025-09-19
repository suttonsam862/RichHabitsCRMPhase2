/**
 * Service Layer Exports
 * All service modules with proper authenticated client patterns
 */

import { DesignJobService } from './designJobService';

// Export the class
export { DesignJobService };

// Export specific functions for convenience
export const {
  createDesignJob,
  bulkCreateDesignJobs,
  updateDesignJobStatus,
  assignDesigner,
  createDesignJobEvent,
  handleOrderItemStatusChange,
  isValidStatusTransition,
  getValidTransitions
} = DesignJobService;