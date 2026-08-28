/**
 * Central SLA & Issue Scale Configuration
 * Controls resolution deadlines based on priority and calculates impact levels.
 */

// Default resolution deadline in hours
const SLA_HOURS = {
  Critical: 24, // 24 hours
  High: 48,     // 48 hours
  Medium: 72,   // 72 hours
  Low: 168,     // 7 days (7 * 24 = 168 hours)
};

/**
 * Calculate resolution due date from base timestamp
 * @param {string} priority - Low, Medium, High, Critical
 * @param {Date|string|number} fromDate - Starting date
 * @returns {Date}
 */
const calculateDueDate = (priority = 'Medium', fromDate = new Date()) => {
  const baseDate = new Date(fromDate);
  const hours = SLA_HOURS[priority] || SLA_HOURS.Medium;
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
};

/**
 * Get current SLA status for a complaint
 * @param {Object} complaint
 * @param {Date} now
 * @returns {{ status: string, isOverdue: boolean, overdueMs: number, label: string }}
 */
const getSlaStatus = (complaint, now = new Date()) => {
  const currentTime = new Date(now).getTime();
  const dueDate = complaint.dueDate ? new Date(complaint.dueDate).getTime() : null;
  const isResolved = ['Resolved', 'Closed'].includes(complaint.status);

  if (isResolved) {
    const resolvedTime = complaint.resolvedAt ? new Date(complaint.resolvedAt).getTime() : currentTime;
    if (dueDate && resolvedTime > dueDate) {
      return {
        status: 'Resolved Overdue',
        isOverdue: true,
        overdueMs: resolvedTime - dueDate,
        label: 'Resolved Past Deadline',
      };
    }
    return {
      status: 'Resolved On Time',
      isOverdue: false,
      overdueMs: 0,
      label: 'Resolved On Time',
    };
  }

  if (!dueDate) {
    return {
      status: 'On Track',
      isOverdue: false,
      overdueMs: 0,
      label: 'On Track',
    };
  }

  if (currentTime > dueDate) {
    const overdueMs = currentTime - dueDate;
    return {
      status: 'Overdue',
      isOverdue: true,
      overdueMs,
      label: 'Overdue',
    };
  }

  // Check if due within today (next 24h)
  const msRemaining = dueDate - currentTime;
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  if (hoursRemaining <= 24) {
    return {
      status: 'Due Today',
      isOverdue: false,
      overdueMs: 0,
      label: 'Due Today',
    };
  }

  if (hoursRemaining <= 48) {
    return {
      status: 'Due Soon',
      isOverdue: false,
      overdueMs: 0,
      label: 'Due Soon',
    };
  }

  return {
    status: 'On Track',
    isOverdue: false,
    overdueMs: 0,
    label: 'On Track',
  };
};

/**
 * Calculate Issue Impact Level based on total affected students
 * @param {number} affectedCount - Total number of affected students
 * @returns {'Low'|'Medium'|'High'|'Critical'}
 */
const getImpactLevel = (affectedCount = 1) => {
  const count = Number(affectedCount) || 1;
  if (count > 50) return 'Critical';
  if (count >= 21) return 'High';
  if (count >= 6) return 'Medium';
  return 'Low';
};

module.exports = {
  SLA_HOURS,
  calculateDueDate,
  getSlaStatus,
  getImpactLevel,
};
