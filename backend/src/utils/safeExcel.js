// What this does: provides a small ExcelJS-like adapter on top of xlsx-populate
// so existing controllers can keep their workbook/worksheet logic with safer deps.
const XlsxPopulate = require("xlsx-populate");

function isBlank(v) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function numberToText(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) {
    return n.toLocaleString("fullwide", { useGrouping: false });
  }
  return String(n);
}

function toCellText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return numberToText(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function isDefaultBlankSheet(sheet) {
  const used = sheet.usedRange();
  if (!used) return true;
  const endRow = used.endCell().rowNumber();
  const endCol = used.endCell().columnNumber();
  if (endRow !== 1 || endCol !== 1) return false;
  return isBlank(sheet.cell(1, 1).value());
}

class CellAdapter {
  constructor(sheet, rowNumber, colNumber) {
    this.sheet = sheet;
    this.rowNumber = rowNumber;
    this.colNumber = colNumber;
  }

  get value() {
    return this.sheet.cell(this.rowNumber, this.colNumber).value();
  }

  set value(v) {
    this.sheet.cell(this.rowNumber, this.colNumber).value(v);
  }

  get text() {
    return toCellText(this.value);
  }

  set numFmt(fmt) {
    this.sheet.cell(this.rowNumber, this.colNumber).style({ numberFormat: fmt });
  }
}

class RowAdapter {
  constructor(worksheetAdapter, rowNumber) {
    this.worksheetAdapter = worksheetAdapter;
    this.rowNumber = rowNumber;
  }

  get number() {
    return this.rowNumber;
  }

  getCell(colNumber) {
    return new CellAdapter(this.worksheetAdapter.sheet, this.rowNumber, colNumber);
  }

  eachCell(cb) {
    const maxCol = this.worksheetAdapter.maxCol();
    for (let col = 1; col <= maxCol; col += 1) {
      const cell = this.getCell(col);
      if (!isBlank(cell.value)) cb(cell, col);
    }
  }

  get actualCellCount() {
    const maxCol = this.worksheetAdapter.maxCol();
    let count = 0;
    for (let col = 1; col <= maxCol; col += 1) {
      if (!isBlank(this.getCell(col).value)) count += 1;
    }
    return count;
  }

  set font(fontSpec) {
    if (!fontSpec || typeof fontSpec !== "object") return;
    const style = {};
    if (Object.prototype.hasOwnProperty.call(fontSpec, "bold")) {
      style.bold = Boolean(fontSpec.bold);
    }
    if (Object.keys(style).length) {
      this.worksheetAdapter.sheet.row(this.rowNumber).style(style);
    }
  }

  set alignment(alignmentSpec) {
    if (!alignmentSpec || typeof alignmentSpec !== "object") return;
    const style = {};
    if (alignmentSpec.horizontal) style.horizontalAlignment = alignmentSpec.horizontal;
    if (alignmentSpec.vertical) style.verticalAlignment = alignmentSpec.vertical;
    if (Object.keys(style).length) {
      this.worksheetAdapter.sheet.row(this.rowNumber).style(style);
    }
  }

  set height(v) {
    if (v == null) return;
    this.worksheetAdapter.sheet.row(this.rowNumber).height(Number(v));
  }
}

class WorksheetAdapter {
  constructor(sheet) {
    this.sheet = sheet;
    this._columns = [];
    this._views = [];
  }

  maxRow() {
    const used = this.sheet.usedRange();
    return used ? used.endCell().rowNumber() : 0;
  }

  maxCol() {
    const used = this.sheet.usedRange();
    return used ? used.endCell().columnNumber() : 0;
  }

  get rowCount() {
    return this.maxRow();
  }

  get lastRow() {
    const rowNumber = this.rowCount || 1;
    return this.getRow(rowNumber);
  }

  getRow(rowNumber) {
    return new RowAdapter(this, rowNumber);
  }

  eachRow(cb) {
    const rows = this.rowCount;
    for (let row = 1; row <= rows; row += 1) {
      cb(this.getRow(row), row);
    }
  }

  set columns(columns) {
    this._columns = Array.isArray(columns) ? columns : [];
    this._columns.forEach((col, idx) => {
      const colNumber = idx + 1;
      const header = Object.prototype.hasOwnProperty.call(col, "header")
        ? col.header
        : col.key || `Column${colNumber}`;
      this.sheet.cell(1, colNumber).value(header);
      if (col.width != null) {
        this.sheet.column(colNumber).width(Number(col.width));
      }
    });
  }

  get columns() {
    return this._columns;
  }

  addRow(rowData) {
    const rowNumber = this.rowCount + 1;

    if (Array.isArray(rowData)) {
      rowData.forEach((v, idx) => {
        this.sheet.cell(rowNumber, idx + 1).value(v);
      });
      return this.getRow(rowNumber);
    }

    if (rowData && typeof rowData === "object") {
      if (this._columns.length > 0) {
        this._columns.forEach((col, idx) => {
          if (!col || !col.key) return;
          const value = rowData[col.key];
          if (value !== undefined) {
            this.sheet.cell(rowNumber, idx + 1).value(value);
          }
        });
      } else {
        Object.values(rowData).forEach((v, idx) => {
          this.sheet.cell(rowNumber, idx + 1).value(v);
        });
      }
      return this.getRow(rowNumber);
    }

    return this.getRow(rowNumber);
  }

  set views(views) {
    this._views = views;
    if (Array.isArray(views) && views[0] && views[0].state === "frozen") {
      const ySplit = Number(views[0].ySplit || 0);
      if (ySplit > 0) {
        this.sheet.freezePanes(ySplit + 1, 1);
      }
    }
  }

  get views() {
    return this._views;
  }
}

class WorkbookAdapter {
  constructor(workbook) {
    this._wb = workbook;
    this.creator = "";
    this.created = null;
    this.worksheets = this._wb.sheets().map((sheet) => new WorksheetAdapter(sheet));

    this.xlsx = {
      load: async (buffer) => {
        this._wb = await XlsxPopulate.fromDataAsync(buffer);
        this.worksheets = this._wb.sheets().map((sheet) => new WorksheetAdapter(sheet));
      },
      write: async (res) => {
        const buffer = await this.xlsx.writeBuffer();
        res.write(buffer);
      },
      writeBuffer: async () => {
        const data = await this._wb.outputAsync();
        return Buffer.from(data);
      },
    };
  }

  addWorksheet(name) {
    let sheet = null;
    const existing = this._wb.sheet(name);
    if (existing) {
      sheet = existing;
    } else if (this._wb.sheets().length === 1 && isDefaultBlankSheet(this._wb.sheet(0))) {
      sheet = this._wb.sheet(0);
      sheet.name(name);
    } else {
      sheet = this._wb.addSheet(name);
    }

    this.worksheets = this._wb.sheets().map((s) => new WorksheetAdapter(s));
    return this.worksheets.find((ws) => ws.sheet === sheet) || new WorksheetAdapter(sheet);
  }
}

async function createWorkbook() {
  const wb = await XlsxPopulate.fromBlankAsync();
  return new WorkbookAdapter(wb);
}

module.exports = {
  createWorkbook,
};
