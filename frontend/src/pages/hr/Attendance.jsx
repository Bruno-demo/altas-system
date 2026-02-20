import { useEffect, useMemo, useState } from "react";
import {
  getAttendanceByDate,
  getAttendanceRange,
  getAttendanceSummary,
  listEmployees,
  markAttendance,
} from "../../api/hr";
import { useAuth } from "../../auth/AuthContext";

const statusOptions = ["PRESENT", "ABSENT", "LEAVE"];

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function Attendance() {
  const { user } = useAuth();
  const canWrite = ["HR", "CEO"].includes(user?.role);

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [markDate, setMarkDate] = useState("");
  const [markRows, setMarkRows] = useState([]);
  const [fillAbsent, setFillAbsent] = useState(false);
  const [markMessage, setMarkMessage] = useState("");
  const [markSuccess, setMarkSuccess] = useState("");
  const [markLoading, setMarkLoading] = useState(false);

  const [dailyDate, setDailyDate] = useState("");
  const [dailyStatus, setDailyStatus] = useState("");
  const [dailyEmployeeId, setDailyEmployeeId] = useState("");
  const [dailyRows, setDailyRows] = useState([]);
  const [dailyMeta, setDailyMeta] = useState(null);
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);

  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangeEmployeeId, setRangeEmployeeId] = useState("");
  const [rangeRows, setRangeRows] = useState([]);
  const [rangeMessage, setRangeMessage] = useState("");
  const [rangeLoading, setRangeLoading] = useState(false);

  const [summaryFrom, setSummaryFrom] = useState("");
  const [summaryTo, setSummaryTo] = useState("");
  const [summaryData, setSummaryData] = useState(null);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const activeEmployees = useMemo(
    () => employees.filter((emp) => emp.isActive),
    [employees]
  );
  const totalDailyPages = dailyMeta?.pages || 1;
  const dailyStatusCounts = useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, LEAVE: 0 };
    dailyRows.forEach((row) => {
      const status = row.status || "ABSENT";
      if (counts[status] == null) counts[status] = 0;
      counts[status] += 1;
    });
    return counts;
  }, [dailyRows]);

  const rangeStatusCounts = useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, LEAVE: 0 };
    rangeRows.forEach((row) => {
      const status = row.status || "ABSENT";
      if (counts[status] == null) counts[status] = 0;
      counts[status] += 1;
    });
    return counts;
  }, [rangeRows]);

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const res = await listEmployees({ page: 1, limit: 200 });
      setEmployees(res.data?.employees || []);
    } catch (err) {
      setMarkMessage(err?.response?.data?.message || "Failed to load employees.");
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const buildMarkRows = (list) =>
    list.map((emp) => ({
      employee: emp,
      employeeId: emp.id,
      status: "PRESENT",
      isLate: false,
      lateMinutes: 0,
      note: "",
      checkInTime: "",
    }));

  const prepareMarkRows = () => {
    setMarkRows(buildMarkRows(activeEmployees));
  };

  const resetMarkForm = () => {
    setMarkDate("");
    setMarkRows([]);
    setFillAbsent(false);
  };

  const updateMarkRow = (employeeId, patch) => {
    setMarkRows((prev) =>
      prev.map((row) =>
        row.employeeId === employeeId ? { ...row, ...patch } : row
      )
    );
  };

  const submitMark = async (event) => {
    event.preventDefault();
    if (!canWrite) return;

    setMarkMessage("");
    setMarkSuccess("");

    if (!markDate) {
      setMarkMessage("Attendance date is required.");
      return;
    }
    if (!markRows.length) {
      setMarkMessage("Load employees before marking attendance.");
      return;
    }

    const records = markRows.map((row) => ({
      employeeId: row.employeeId,
      status: row.status,
      note: row.note.trim() || undefined,
      isLate: row.status === "PRESENT" ? row.isLate : false,
      lateMinutes:
        row.status === "PRESENT" ? Number(row.lateMinutes || 0) : 0,
      checkInTime:
        row.status === "PRESENT" && row.checkInTime
          ? new Date(row.checkInTime).toISOString()
          : undefined,
    }));

    setMarkLoading(true);
    try {
      await markAttendance({
        date: markDate,
        records,
        fillAbsent,
      });
      setMarkSuccess("Attendance saved.");
      resetMarkForm();
    } catch (err) {
      setMarkMessage(err?.response?.data?.message || "Save failed.");
    } finally {
      setMarkLoading(false);
    }
  };

  useEffect(() => {
    if (!markSuccess) return;
    const timer = setTimeout(() => setMarkSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [markSuccess]);

  const loadDaily = async () => {
    setDailyMessage("");
    if (!dailyDate) {
      setDailyMessage("Select a date to load attendance.");
      return;
    }
    setDailyLoading(true);
    try {
      const params = {
        date: dailyDate,
        page: dailyPage,
        limit: dailyLimit,
        status: dailyStatus || undefined,
        employeeId: dailyEmployeeId || undefined,
      };
      const res = await getAttendanceByDate(params);
      setDailyRows(res.data?.rows || []);
      setDailyMeta(res.data?.meta || null);
    } catch (err) {
      setDailyMessage(err?.response?.data?.message || "Failed to load.");
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    if (dailyDate) loadDaily();
  }, [dailyPage, dailyLimit]);

  const loadRange = async (event) => {
    event.preventDefault();
    setRangeMessage("");

    if (!rangeFrom || !rangeTo) {
      setRangeMessage("From and To dates are required.");
      return;
    }
    setRangeLoading(true);
    try {
      const res = await getAttendanceRange({
        from: rangeFrom,
        to: rangeTo,
        employeeId: rangeEmployeeId || undefined,
      });
      setRangeRows(res.data?.rows || []);
    } catch (err) {
      setRangeMessage(err?.response?.data?.message || "Failed to load range.");
    } finally {
      setRangeLoading(false);
    }
  };

  const loadSummary = async (event) => {
    event.preventDefault();
    setSummaryMessage("");

    if (!summaryFrom || !summaryTo) {
      setSummaryMessage("From and To dates are required.");
      return;
    }
    setSummaryLoading(true);
    try {
      const res = await getAttendanceSummary({
        from: summaryFrom,
        to: summaryTo,
      });
      setSummaryData(res.data || null);
    } catch (err) {
      setSummaryMessage(err?.response?.data?.message || "Failed to load summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Attendance</h2>
          <p className="muted">Mark attendance and review attendance history.</p>
        </div>
      </div>

      <div className="stack">
        <section className="card">
          <div className="page-header">
            <div>
              <h3>Mark Attendance</h3>
              <p className="muted">Daily attendance sheet for active staff.</p>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button-outline"
                onClick={loadEmployees}
                disabled={employeesLoading}
              >
                {employeesLoading ? "Loading..." : "Reload Employees"}
              </button>
              <button
                type="button"
                className="button-outline"
                onClick={prepareMarkRows}
                disabled={employeesLoading || !activeEmployees.length}
              >
                Prepare List
              </button>
            </div>
          </div>

          {markMessage ? <div className="alert">{markMessage}</div> : null}
          {markSuccess ? <div className="success">{markSuccess}</div> : null}

          {!canWrite ? (
            <div className="muted">
              Read-only access. HR or CEO can mark attendance.
            </div>
          ) : null}

          <form className="form" onSubmit={submitMark}>
            <label className="field">
              Date
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                disabled={!canWrite}
              />
            </label>
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={fillAbsent}
                onChange={(e) => setFillAbsent(e.target.checked)}
                disabled={!canWrite}
              />
              <span>Auto-mark missing employees as ABSENT</span>
            </label>
            <button type="submit" disabled={!canWrite || markLoading}>
              {markLoading ? "Saving..." : "Save Attendance"}
            </button>
          </form>

          <div className="data-table hr-table">
            <div className="data-row data-header attendance-mark-row">
              <div>Employee</div>
              <div>Status</div>
              <div>Late</div>
              <div>Late min</div>
              <div>Note</div>
              <div>Check-in</div>
            </div>
            {markRows.length ? (
              markRows.map((row) => (
                <div key={row.employeeId} className="data-row attendance-mark-row">
                  <div>
                    <div>{row.employee.fullName}</div>
                    <div className="muted">
                      Code: {row.employee.employeeCode}
                    </div>
                  </div>
                  <div>
                    <select
                      value={row.status}
                      onChange={(e) =>
                        updateMarkRow(row.employeeId, {
                          status: e.target.value,
                        })
                      }
                      disabled={!canWrite}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="checkbox"
                      checked={row.isLate}
                      onChange={(e) =>
                        updateMarkRow(row.employeeId, {
                          isLate: e.target.checked,
                        })
                      }
                      disabled={!canWrite || row.status !== "PRESENT"}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={row.lateMinutes}
                      onChange={(e) =>
                        updateMarkRow(row.employeeId, {
                          lateMinutes: Number(e.target.value || 0),
                        })
                      }
                      disabled={
                        !canWrite ||
                        row.status !== "PRESENT" ||
                        !row.isLate
                      }
                    />
                  </div>
                  <div>
                    <input
                      value={row.note}
                      onChange={(e) =>
                        updateMarkRow(row.employeeId, {
                          note: e.target.value,
                        })
                      }
                      disabled={!canWrite}
                    />
                  </div>
                  <div>
                    <input
                      type="datetime-local"
                      value={row.checkInTime}
                      onChange={(e) =>
                        updateMarkRow(row.employeeId, {
                          checkInTime: e.target.value,
                        })
                      }
                      disabled={!canWrite || row.status !== "PRESENT"}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="muted">Prepare the list to mark attendance.</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="page-header">
            <div>
              <h3>Attendance by Date</h3>
              <p className="muted">Daily attendance with filters.</p>
            </div>
            <button type="button" className="button-outline" onClick={loadDaily}>
              Refresh
            </button>
          </div>

          {dailyMessage ? <div className="alert">{dailyMessage}</div> : null}

          <form
            className="filters-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setDailyPage(1);
              loadDaily();
            }}
          >
            <label className="field">
              Date
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
              />
            </label>
            <label className="field">
              Status
              <select
                value={dailyStatus}
                onChange={(e) => setDailyStatus(e.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Employee
              <select
                value={dailyEmployeeId}
                onChange={(e) => setDailyEmployeeId(e.target.value)}
              >
                <option value="">All</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Limit
              <select
                value={dailyLimit}
                onChange={(e) => {
                  setDailyLimit(Number(e.target.value));
                  setDailyPage(1);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <div className="filter-actions">
              <button type="submit" disabled={dailyLoading}>
                {dailyLoading ? "Loading..." : "Apply Filters"}
              </button>
            </div>
          </form>

          <div className="table-toolbar">
            <div className="muted">
              {dailyMeta ? `Total: ${dailyMeta.total}` : "Attendance"}
            </div>
            <div className="pagination">
              <button
                type="button"
                className="button-outline"
                disabled={dailyPage <= 1}
                onClick={() => setDailyPage((p) => Math.max(p - 1, 1))}
              >
                Prev
              </button>
              <span>
                Page {dailyPage} of {totalDailyPages}
              </span>
              <button
                type="button"
                className="button-outline"
                disabled={dailyPage >= totalDailyPages}
                onClick={() => setDailyPage((p) => Math.min(p + 1, totalDailyPages))}
              >
                Next
              </button>
            </div>
          </div>

          <div className="stat-grid">
            <div>
              <div className="stat-label">Present</div>
              <div className="stat-value">{dailyStatusCounts.PRESENT}</div>
            </div>
            <div>
              <div className="stat-label">Absent</div>
              <div className="stat-value">{dailyStatusCounts.ABSENT}</div>
            </div>
            <div>
              <div className="stat-label">Leave</div>
              <div className="stat-value">{dailyStatusCounts.LEAVE}</div>
            </div>
          </div>

          <div className="data-table hr-table">
            <div className="data-row data-header attendance-row">
              <div>Date</div>
              <div>Employee</div>
              <div>Status</div>
              <div>Late</div>
              <div>Note</div>
            </div>
            {dailyLoading ? (
              <div className="muted">Loading attendance...</div>
            ) : dailyRows.length ? (
              dailyRows.map((row) => (
                <div key={row.id} className="data-row attendance-row">
                  <div>{formatDateTime(row.date)}</div>
                  <div>
                    <div>{row.employee?.fullName || "-"}</div>
                    <div className="muted">{row.employee?.position || "-"}</div>
                  </div>
                  <div>
                    <span
                      className={`badge ${
                        row.status === "PRESENT" ? "" : "badge-warn"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div>
                    {row.isLate ? `Yes (${row.lateMinutes} min)` : "No"}
                  </div>
                  <div className="truncate">{row.note || "-"}</div>
                </div>
              ))
            ) : (
              <div className="muted">No attendance records found.</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="page-header">
            <div>
              <h3>Attendance Range</h3>
              <p className="muted">Search attendance between dates.</p>
            </div>
          </div>

          {rangeMessage ? <div className="alert">{rangeMessage}</div> : null}

          <form className="filters-grid" onSubmit={loadRange}>
            <label className="field">
              From
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
            </label>
            <label className="field">
              To
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </label>
            <label className="field">
              Employee
              <select
                value={rangeEmployeeId}
                onChange={(e) => setRangeEmployeeId(e.target.value)}
              >
                <option value="">All</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-actions">
              <button type="submit" disabled={rangeLoading}>
                {rangeLoading ? "Loading..." : "Load Range"}
              </button>
            </div>
          </form>

          <div className="stat-grid">
            <div>
              <div className="stat-label">Present</div>
              <div className="stat-value">{rangeStatusCounts.PRESENT}</div>
            </div>
            <div>
              <div className="stat-label">Absent</div>
              <div className="stat-value">{rangeStatusCounts.ABSENT}</div>
            </div>
            <div>
              <div className="stat-label">Leave</div>
              <div className="stat-value">{rangeStatusCounts.LEAVE}</div>
            </div>
          </div>

          <div className="data-table hr-table">
            <div className="data-row data-header attendance-row">
              <div>Date</div>
              <div>Employee</div>
              <div>Status</div>
              <div>Late</div>
              <div>Note</div>
            </div>
            {rangeLoading ? (
              <div className="muted">Loading range...</div>
            ) : rangeRows.length ? (
              rangeRows.map((row) => (
                <div key={row.id} className="data-row attendance-row">
                  <div>{formatDateTime(row.date)}</div>
                  <div>{row.employee?.fullName || "-"}</div>
                  <div>{row.status}</div>
                  <div>{row.isLate ? `Yes (${row.lateMinutes} min)` : "No"}</div>
                  <div className="truncate">{row.note || "-"}</div>
                </div>
              ))
            ) : (
              <div className="muted">No records in range.</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="page-header">
            <div>
              <h3>Attendance Summary</h3>
              <p className="muted">Totals and per-employee counts.</p>
            </div>
          </div>

          {summaryMessage ? <div className="alert">{summaryMessage}</div> : null}

          <form className="filters-grid" onSubmit={loadSummary}>
            <label className="field">
              From
              <input
                type="date"
                value={summaryFrom}
                onChange={(e) => setSummaryFrom(e.target.value)}
              />
            </label>
            <label className="field">
              To
              <input
                type="date"
                value={summaryTo}
                onChange={(e) => setSummaryTo(e.target.value)}
              />
            </label>
            <div className="filter-actions">
              <button type="submit" disabled={summaryLoading}>
                {summaryLoading ? "Loading..." : "Load Summary"}
              </button>
            </div>
          </form>

          {summaryData ? (
            <div className="stack">
              <div className="stat-grid">
                {summaryData.totals?.map((item) => (
                  <div key={item.status}>
                    <div className="stat-label">{item.status}</div>
                    <div className="stat-value">{item.count}</div>
                  </div>
                ))}
              </div>

              <div className="data-table hr-table">
                <div className="data-row data-header attendance-summary-row">
                  <div>Employee</div>
                  <div>Position</div>
                  <div>Present</div>
                  <div>Absent</div>
                  <div>Leave</div>
                </div>
                {summaryData.employees?.length ? (
                  summaryData.employees.map((row) => (
                    <div
                      key={row.employee.id}
                      className="data-row attendance-summary-row"
                    >
                      <div>{row.employee.fullName || row.employee.id}</div>
                      <div>{row.employee.position || "-"}</div>
                      <div>{row.counts.PRESENT}</div>
                      <div>{row.counts.ABSENT}</div>
                      <div>{row.counts.LEAVE}</div>
                    </div>
                  ))
                ) : (
                  <div className="muted">No summary data.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="muted">Select dates to view summary.</div>
          )}
        </section>
      </div>
    </div>
  );
}
