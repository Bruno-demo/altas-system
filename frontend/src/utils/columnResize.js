const MIN_COL_WIDTH = 80;
const PREFERRED_MIN_WIDTHS = [
  { match: /chassis|chasis/i, min: 220 },
  { match: /name/i, min: 200 },
];

function getHeaderCells(headerRow) {
  return Array.from(headerRow.children).filter((node) => node.nodeType === 1);
}

function getRowCells(row) {
  return Array.from(row.children).filter((node) => node.nodeType === 1);
}

function getMinWidth(cell) {
  const attr = Number(cell.dataset.colMin);
  if (!Number.isNaN(attr) && attr > 0) return attr;
  const label = String(cell.textContent || "").trim();
  if (label) {
    for (const rule of PREFERRED_MIN_WIDTHS) {
      if (rule.match.test(label)) return rule.min;
    }
  }
  return MIN_COL_WIDTH;
}

function measureColumnWidths(table, headerCells) {
  const minWidths = headerCells.map(getMinWidth);
  const widths = headerCells.map((cell, idx) =>
    Math.max(
      cell.scrollWidth,
      cell.getBoundingClientRect().width,
      minWidths[idx]
    )
  );

  const rows = Array.from(table.querySelectorAll(".data-row"));
  let sampled = 0;
  for (const row of rows) {
    if (row.classList.contains("data-header")) continue;
    const cells = getRowCells(row);
    if (!cells.length) continue;
    cells.forEach((cell, idx) => {
      if (idx >= widths.length) return;
      const width = Math.max(
        cell.scrollWidth,
        cell.getBoundingClientRect().width,
        minWidths[idx]
      );
      if (width > widths[idx]) widths[idx] = width;
    });
    sampled += 1;
    if (sampled >= 25) break;
  }

  return { widths, minWidths };
}

function applyWidths(table, widths, minWidths) {
  const cols = widths
    .map((w, idx) => `${Math.max(w, minWidths?.[idx] ?? MIN_COL_WIDTH)}px`)
    .join(" ");
  table.style.setProperty("--table-cols", cols);
}

function attachResizers(table, headerRow) {
  const cells = getHeaderCells(headerRow);
  if (cells.length < 2) return;

  cells.forEach((cell, index) => {
    if (cell.classList.contains("data-header-cell")) return;
    cell.classList.add("data-header-cell");
  });

  cells.forEach((cell, index) => {
    if (index >= cells.length - 1) return;
    if (cell.querySelector(".col-resizer")) return;

    const resizer = document.createElement("span");
    resizer.className = "col-resizer";

    resizer.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const minWidths = cells.map(getMinWidth);
      const startWidths = measureWidths(cells);
      const maxGrow = startWidths[index + 1] - minWidths[index + 1];
      const maxShrink = startWidths[index] - minWidths[index];

      table.classList.add("resizing");

      const onMove = (moveEvent) => {
        let delta = moveEvent.clientX - startX;
        if (delta > maxGrow) delta = maxGrow;
        if (delta < -maxShrink) delta = -maxShrink;

        const nextWidths = [...startWidths];
        nextWidths[index] = startWidths[index] + delta;
        nextWidths[index + 1] = startWidths[index + 1] - delta;
        applyWidths(table, nextWidths, minWidths);
      };

      const onUp = () => {
        table.dataset.resized = "1";
        table.classList.remove("resizing");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });

    cell.appendChild(resizer);
  });

  const { widths, minWidths } = measureColumnWidths(table, cells);
  applyWidths(table, widths, minWidths);
}

function refreshTable(table) {
  if (table.dataset.resized === "1") return;
  const headerRow = table.querySelector(".data-row.data-header");
  if (!headerRow) return;
  const cells = getHeaderCells(headerRow);
  if (cells.length < 2) return;
  const { widths, minWidths } = measureColumnWidths(table, cells);
  applyWidths(table, widths, minWidths);
}

function refreshTables() {
  const tables = document.querySelectorAll(".data-table.resizable-table");
  tables.forEach((table) => {
    refreshTable(table);
  });
}

let resizeListenerAttached = false;

function observeTable(table) {
  if (table.dataset.resizeObserver === "1") return;
  const observer = new MutationObserver(() => {
    refreshTable(table);
  });
  observer.observe(table, { childList: true, subtree: true });
  table.dataset.resizeObserver = "1";
  table.__resizeObserver = observer;
}

export function initResizableTables() {
  const tables = document.querySelectorAll(".data-table");
  tables.forEach((table) => {
    if (table.dataset.resizeInit === "1") return;
    const headerRow = table.querySelector(".data-row.data-header");
    if (!headerRow) return;

    table.dataset.resizeInit = "1";
    table.classList.add("resizable-table");
    attachResizers(table, headerRow);
    observeTable(table);
  });

  if (!resizeListenerAttached) {
    resizeListenerAttached = true;
    window.addEventListener("resize", () => {
      refreshTables();
    });
  }
}
