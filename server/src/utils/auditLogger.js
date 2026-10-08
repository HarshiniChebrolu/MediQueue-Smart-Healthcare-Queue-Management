import { AuditLog } from '../models/AuditLog.js';

/**
 * Log sensitive security or queue actions
 */
export const logAudit = async ({
  userId = null,
  userName = 'System',
  userRole = 'system',
  action,
  targetType = 'Token',
  targetId = null,
  targetTokenNumber = null,
  previousState = null,
  newState = null,
  details = '',
  req = null,
}) => {
  try {
    let effectiveUserId = userId;
    let effectiveUserName = userName;
    let effectiveUserRole = userRole;
    let ip = '';

    if (req) {
      if (req.user) {
        effectiveUserId = req.user._id || effectiveUserId;
        effectiveUserName = req.user.name || effectiveUserName;
        effectiveUserRole = req.user.role || effectiveUserRole;
      }
      ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    }

    const logEntry = await AuditLog.create({
      userId: effectiveUserId,
      userName: effectiveUserName,
      userRole: effectiveUserRole,
      action,
      targetType,
      targetId,
      targetTokenNumber,
      previousState,
      newState,
      details,
      ipAddress: String(ip).slice(0, 45),
    });

    return logEntry;
  } catch (error) {
    console.error('[AuditLog Error]:', error.message);
    return null;
  }
};
