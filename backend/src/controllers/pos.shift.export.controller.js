// What this does: exports a cashier shift report (expected vs counted + differences) to Excel
const prisma = require("../prisma");
const { createWorkbook } = require("../utils/safeExcel");
const { handleError } = require("../utils/errors");

function round2(v) {
  const n = Number(v || 0);
  return Number.isNaN(n) ? 0 : Number(n.toFixed(2));
}

function styleHeaderRow(ws) {
  const r = ws.getRow(1);
  r.font = { bold: true };
  r.alignment = { vertical: "middle" };
  r.height = 18;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

exports.exportShiftExcel = async (req, res) => {
  try {
    const shiftId = String(req.params.shiftId).trim();

    const shift = await prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        cashier: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!shift) return res.status(404).json({ message: "Shift not found" });

    // Cashier can only export own shifts; Manager/CEO can export any
    if (req.user.role === "CASHIER" && shift.cashierId !== req.user.id) {
      return res.status(403).json({ message: "You can only export your own shift" });
    }

    const workbook = await createWorkbook();
    workbook.creator = "Altas System";
    workbook.created = new Date();

    // Sheet 1: Summary
    const ws = workbook.addWorksheet("ShiftSummary");
    ws.columns = [
      { header: "Field", key: "field", width: 26 },
      { header: "Value", key: "value", width: 40 },
    ];
    styleHeaderRow(ws);

    ws.addRow({ field: "ShiftId", value: shift.id });
    ws.addRow({ field: "Cashier", value: `${shift.cashier.fullName} (${shift.cashier.email})` });
    ws.addRow({ field: "Status", value: shift.status });
    ws.addRow({ field: "OpenedAt", value: shift.openedAt?.toISOString() || "" });
    ws.addRow({ field: "ClosedAt", value: shift.closedAt?.toISOString() || "" });
    ws.addRow({ field: "SalesCount", value: shift.salesCount });
    ws.addRow({ field: "Note", value: shift.note || "" });

    ws.addRow({});
    ws.addRow({ field: "ExpectedTotal", value: round2(shift.expectedTotal) });
    ws.addRow({ field: "CountedTotal", value: round2(shift.countedTotal) });
    ws.addRow({ field: "DiffTotal", value: round2(shift.diffTotal) });

    // Sheet 2: Payment breakdown
    const ws2 = workbook.addWorksheet("PaymentBreakdown");
    ws2.columns = [
      { header: "Method", key: "method", width: 14 },
      { header: "Expected", key: "expected", width: 14 },
      { header: "Counted", key: "counted", width: 14 },
      { header: "Difference", key: "diff", width: 14 },
    ];
    styleHeaderRow(ws2);

    ws2.addRow({ method: "CASH", expected: round2(shift.expectedCash), counted: round2(shift.countedCash), diff: round2(shift.diffCash) });
    ws2.addRow({ method: "MOMO", expected: round2(shift.expectedMomo), counted: round2(shift.countedMomo), diff: round2(shift.diffMomo) });
    ws2.addRow({ method: "CARD", expected: round2(shift.expectedCard), counted: round2(shift.countedCard), diff: round2(shift.diffCard) });
    ws2.addRow({ method: "BANK", expected: round2(shift.expectedBank), counted: round2(shift.countedBank), diff: round2(shift.diffBank) });
    ws2.addRow({ method: "OTHER", expected: round2(shift.expectedOther), counted: round2(shift.countedOther), diff: round2(shift.diffOther) });

    ws2.addRow({});
    const totalRow = ws2.addRow({
      method: "TOTAL",
      expected: round2(shift.expectedTotal),
      counted: round2(shift.countedTotal),
      diff: round2(shift.diffTotal),
    });
    totalRow.font = { bold: true };

    // Numeric formatting
    [ws2].forEach((sheet) => {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell((cell) => {
          if (typeof cell.value === "number") cell.numFmt = "#,##0.00";
        });
      });
    });

    const filename = `ALTAS_Shift_${shift.id}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

