// What this does: provides admin-only maintenance endpoints (error logs visibility)
const { readErrorLog, getErrorLogDirectory } = require("../utils/errorLogger");
const { handleError } = require("../utils/errors");

function normalizeDate(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const err = new Error("date must be YYYY-MM-DD");
    err.status = 400;
    throw err;
  }
  return value;
}

exports.getErrorLogs = async (req, res) => {
  try {
    const date = normalizeDate(req.query.date);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = readErrorLog({ date, limit });
    return res.json({
      date: data.date,
      logDirectory: getErrorLogDirectory(),
      filePath: data.filePath,
      count: data.rows.length,
      rows: data.rows,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500, req, context: "admin.getErrorLogs" });
  }
};
