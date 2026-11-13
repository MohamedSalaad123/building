module.exports = (db, userId, action, entity, entityId, details) =>
  db.auditLog.create({ data: { userId, action, entity, entityId: String(entityId ?? ''), details: details || undefined } });
