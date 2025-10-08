const AuditLog = require("../models/auditLog.model");

async function createAuditLog({
  collectionName,
  documentId,
  changedBy,
  changedFields = [],
  operation,
  previousValues = {},
  newValues = {},
  userAgent = "",
  ipAddress = "",
}) {
  try {
    await AuditLog.create({
      collectionName,
      documentId,
      changedBy,
      changedFields,
      operation,
      previousValues,
      newValues,
      userAgent,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Audit log could not be written:", err);
    // Audit log hatası uygulamayı durdurmamalı
  }
}

// Enhanced audit middleware
const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    // Sadece successful operations için audit log
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const operation = getOperationType(req.method);

      if (shouldAudit(operation, req.path)) {
        createAuditLog({
          collectionName: getCollectionName(req.path),
          documentId: req.params.id,
          changedBy: req.user?.id,
          operation: operation,
          userAgent: req.get("User-Agent") || "",
          ipAddress: req.ip || req.connection.remoteAddress,
        }).catch((err) => console.error("Audit logging failed:", err));
      }
    }

    originalSend.call(this, data);
  };

  next();
};

function getOperationType(method) {
  const operations = {
    POST: "create",
    GET: "read",
    PUT: "update",
    DELETE: "delete",
  };
  return operations[method] || "unknown";
}

function getCollectionName(path) {
  if (path.includes("/projects")) return "projects";
  if (path.includes("/users")) return "users";
  return "unknown";
}

function shouldAudit(operation, path) {
  // Sadece kritik operations için audit
  const criticalPaths = ["/projects", "/users"];
  const criticalOperations = ["create", "update", "delete"];

  return criticalPaths.some(
    (criticalPath) =>
      path.includes(criticalPath) && criticalOperations.includes(operation)
  );
}

module.exports = {
  createAuditLog,
  auditMiddleware,
};
