const path = require("path");
const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "AL-TAHS";
pptx.company = "AL-TAHS";
pptx.subject = "AL-TAHS System Demo";
pptx.title = "AL-TAHS System";

const COLORS = {
  dark: "0B1220",
  navy: "0F172A",
  accent: "06B6D4",
  accent2: "F59E0B",
  light: "F8FAFC",
  white: "FFFFFF",
  muted: "64748B",
  border: "E2E8F0",
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN = 0.5;

function addTitle(slide, title, subtitle) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: COLORS.navy },
  });
  slide.addText(title, {
    x: 0.8,
    y: 2.2,
    w: 12,
    h: 1,
    fontSize: 44,
    color: COLORS.white,
    bold: true,
  });
  slide.addText(subtitle, {
    x: 0.8,
    y: 3.2,
    w: 11.5,
    h: 1,
    fontSize: 18,
    color: COLORS.accent,
    bold: true,
  });
  slide.addText("Prepared for executive demo", {
    x: 0.8,
    y: 4.1,
    w: 11.5,
    h: 0.6,
    fontSize: 14,
    color: COLORS.light,
  });
}

function addHeader(slide, title) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 0.7,
    fill: { color: COLORS.navy },
  });
  slide.addText(title, {
    x: MARGIN,
    y: 0.12,
    w: 12.5,
    h: 0.5,
    fontSize: 20,
    color: COLORS.white,
    bold: true,
  });
}

function addBullets(slide, bullets, opts) {
  const { x, y, w, h, fontSize = 16 } = opts;
  const lines = bullets.map((text) => ({
    text,
    options: { bullet: { indent: 18 }, hanging: 4 },
  }));
  slide.addText(lines, {
    x,
    y,
    w,
    h,
    fontSize,
    color: COLORS.dark,
  });
}

function addSectionSlide(title, subtitle) {
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: COLORS.light },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 2.4,
    fill: { color: COLORS.navy },
  });
  slide.addText(title, {
    x: 0.8,
    y: 0.9,
    w: 12,
    h: 0.8,
    fontSize: 32,
    color: COLORS.white,
    bold: true,
  });
  slide.addText(subtitle, {
    x: 0.8,
    y: 1.6,
    w: 12,
    h: 0.6,
    fontSize: 16,
    color: COLORS.accent,
    bold: true,
  });
  return slide;
}

function addTwoColumnSlide(title, leftTitle, leftBullets, rightTitle, rightBullets) {
  const slide = pptx.addSlide();
  addHeader(slide, title);
  slide.addText(leftTitle, {
    x: MARGIN,
    y: 1.0,
    w: 6.1,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.dark,
  });
  slide.addText(rightTitle, {
    x: 6.8,
    y: 1.0,
    w: 6.0,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.dark,
  });
  addBullets(slide, leftBullets, { x: MARGIN, y: 1.5, w: 6.1, h: 5.5 });
  addBullets(slide, rightBullets, { x: 6.8, y: 1.5, w: 6.0, h: 5.5 });
  return slide;
}

function addModuleCard(slide, x, y, w, h, title, body) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, width: 1 },
    radius: 0.08,
  });
  slide.addText(title, {
    x: x + 0.2,
    y: y + 0.2,
    w: w - 0.4,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: COLORS.dark,
  });
  slide.addText(body, {
    x: x + 0.2,
    y: y + 0.7,
    w: w - 0.4,
    h: h - 0.9,
    fontSize: 11,
    color: COLORS.muted,
  });
}

function addFlowStep(slide, x, y, w, h, title) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent, width: 1 },
    radius: 0.1,
  });
  slide.addText(title, {
    x,
    y: y + 0.15,
    w,
    h,
    fontSize: 12,
    bold: true,
    color: COLORS.white,
    align: "center",
    valign: "middle",
  });
}

function addDivider(slide, y) {
  slide.addShape(pptx.ShapeType.line, {
    x: MARGIN,
    y,
    w: SLIDE_W - 2 * MARGIN,
    h: 0,
    line: { color: COLORS.border, width: 1 },
  });
}

// Title
addTitle(pptx.addSlide(), "AL-TAHS Integrated Business System", "Full Product Overview and Demo Deck");

// Executive summary
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Executive Summary");
  slide.addText("What this system delivers", {
    x: MARGIN,
    y: 1.0,
    w: 12,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.dark,
  });
  addBullets(slide, [
    "Single source of truth for sales, stock, motorbikes, and HR",
    "Faster workflows: search, POS, payroll, and reports in one place",
    "EBM-compliant invoicing with QR payloads and SDC tracking",
    "Audit-ready activity logs and role-based controls",
    "Better customer care through accurate billing and fast service",
  ], { x: MARGIN, y: 1.5, w: 12.2, h: 4.5, fontSize: 16 });
  slide.addShape(pptx.ShapeType.rect, {
    x: MARGIN,
    y: 6.2,
    w: 12.2,
    h: 0.7,
    fill: { color: COLORS.accent },
  });
  slide.addText("Outcome: professional, data-driven operations with reduced loss and higher trust", {
    x: MARGIN + 0.2,
    y: 6.35,
    w: 11.8,
    h: 0.4,
    fontSize: 14,
    color: COLORS.white,
    bold: true,
  });
})();

// Problem statement
addTwoColumnSlide(
  "Problem to Solve",
  "Pain Points (Manual Operations)",
  [
    "Data loss and inconsistencies across spreadsheets",
    "Slow customer service and frequent invoice errors",
    "No single view of stock or sales history",
    "Payroll and attendance tracked manually",
    "No audit trail or role accountability",
  ],
  "Business Impact",
  [
    "Lost revenue from stock mistakes",
    "High operational cost and rework",
    "Longer customer waiting time",
    "Unreliable reports for management",
    "Risk of non-compliance with EBM",
  ]
);

// Vision
addTwoColumnSlide(
  "Goals and Vision",
  "Operational Goals",
  [
    "Centralize sales, stock, motorbike CRM, and HR",
    "Make workflow fast and professional",
    "Enable branch-level accountability",
    "Maintain clean, verifiable historical records",
  ],
  "Customer Care Goals",
  [
    "Fast and accurate invoices",
    "Clear return handling and auditability",
    "Improved trust with QR and SDC reference",
    "Consistent service quality across staff",
  ]
);

// System overview map
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "System Overview");
  slide.addText("Core modules working together", {
    x: MARGIN,
    y: 1.0,
    w: 12,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.dark,
  });

  const cardW = 3.9;
  const cardH = 1.4;
  addModuleCard(slide, 0.6, 1.8, cardW, cardH, "POS & Invoicing", "Search, cart, checkout, EBM confirm, receipts");
  addModuleCard(slide, 4.7, 1.8, cardW, cardH, "Inventory", "Products, bins, locations, stock in/out, low stock");
  addModuleCard(slide, 8.8, 1.8, cardW, cardH, "Motorbike CRM", "Chassis-based tracking, promotions, branches");
  addModuleCard(slide, 0.6, 3.7, cardW, cardH, "HR", "Employees, attendance, advances, payroll");
  addModuleCard(slide, 4.7, 3.7, cardW, cardH, "Reports", "Sales, SDC, stock valuation, audit, KPIs");
  addModuleCard(slide, 8.8, 3.7, cardW, cardH, "Admin", "Users, roles, permissions, audit log");

  slide.addText("Unified database + role-based security", {
    x: MARGIN,
    y: 5.6,
    w: 12,
    h: 0.5,
    fontSize: 14,
    color: COLORS.muted,
  });
})();

// Roles
addTwoColumnSlide(
  "Role-Based Access",
  "Operational Roles",
  [
    "Cashier: POS, invoices, EBM confirm",
    "Store Keeper: stock, bins, inventory",
    "Salesperson: motorbikes, promotions, sales ledger",
    "HR: employees, attendance, advances, payroll",
  ],
  "Management Roles",
  [
    "Manager: all operations + reporting",
    "CEO: full visibility + KPI oversight",
    "Admin: user and role management",
  ]
);

// POS flow
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "POS Sales Flow");
  slide.addText("Customer purchase lifecycle", {
    x: MARGIN,
    y: 1.0,
    w: 12,
    h: 0.4,
    fontSize: 16,
    bold: true,
  });
  addFlowStep(slide, 0.8, 2.0, 2.0, 0.7, "Search Product");
  addFlowStep(slide, 3.1, 2.0, 2.0, 0.7, "Add to Cart");
  addFlowStep(slide, 5.4, 2.0, 2.0, 0.7, "Checkout");
  addFlowStep(slide, 7.7, 2.0, 2.0, 0.7, "Invoice Created");
  addFlowStep(slide, 10.0, 2.0, 2.0, 0.7, "EBM Confirm");

  slide.addShape(pptx.ShapeType.line, { x: 2.8, y: 2.35, w: 0.3, h: 0, line: { color: COLORS.accent, width: 2 } });
  slide.addShape(pptx.ShapeType.line, { x: 5.1, y: 2.35, w: 0.3, h: 0, line: { color: COLORS.accent, width: 2 } });
  slide.addShape(pptx.ShapeType.line, { x: 7.4, y: 2.35, w: 0.3, h: 0, line: { color: COLORS.accent, width: 2 } });
  slide.addShape(pptx.ShapeType.line, { x: 9.7, y: 2.35, w: 0.3, h: 0, line: { color: COLORS.accent, width: 2 } });

  addBullets(slide, [
    "Auto invoice numbering and QR payload",
    "Handles spare parts (bin required) and motorbikes (no bin)",
    "Print-ready receipts and PDFs",
    "EBM pending list and confirmation flow",
  ], { x: MARGIN, y: 3.3, w: 12, h: 3.6, fontSize: 15 });
})();

// POS features
addTwoColumnSlide(
  "POS Terminal Features",
  "Cashier Tools",
  [
    "Fast search by name, SKU, part number, or brand",
    "Smart bin recommendation for spare parts",
    "Motorbike sales without bin or stock blocking",
    "Multiple payment methods and buyer types",
  ],
  "Invoice Output",
  [
    "Professional PDF invoice (A4 and 80mm)",
    "Thermal receipt with QR payload",
    "SDC ID displayed after EBM confirm",
    "Automatic audit log of every sale",
  ]
);

// Sales ledger and SDC
addTwoColumnSlide(
  "Sales Ledger and SDC",
  "Sales Ledger",
  [
    "Sales list with filters, search, and pagination",
    "Pending vs confirmed EBM tracking",
    "Cashier-specific visibility controls",
  ],
  "SDC Import and Sync",
  [
    "Excel upload with headers validation",
    "Updates existing rows and appends new",
    "Sales sync after EBM confirmation",
    "Historic data preserved and searchable",
  ]
);

// Inventory overview
addTwoColumnSlide(
  "Inventory and Stock",
  "Inventory Management",
  [
    "Products catalog with cost, sell price, and min stock",
    "Locations and storage bins per branch",
    "Low stock alerts and valuation view",
  ],
  "Stock Operations",
  [
    "Multi-line stock-in adjustments",
    "Stock transactions log with reasons",
    "Bin-level inventory tracking",
  ]
);

// Motorbike CRM
addTwoColumnSlide(
  "Motorbike CRM",
  "Motorbike Records",
  [
    "Chassis number as primary identifier",
    "Manufacturer, model, year, weight, color",
    "Branch assignment for fleet visibility",
  ],
  "Business Benefits",
  [
    "Full history of each motorbike",
    "Salesperson ownership and reporting",
    "Improved tracking for compliance and service",
  ]
);

// Promotions
addTwoColumnSlide(
  "Promotions Module",
  "Promotion Capture",
  [
    "Dedicated promotion form with delivery status",
    "Excel import for historical records",
    "Search, sort, and export",
  ],
  "Promotion Table",
  [
    "S.NO auto ordering and wide headers",
    "Full record of chassis, plate number, branch",
    "Resilient table layout with column resize",
  ]
);

// HR overview
addTwoColumnSlide(
  "HR Module Overview",
  "Core HR",
  [
    "Employee CRUD with TIN and bank details",
    "Status management and role clarity",
  ],
  "Daily Operations",
  [
    "Attendance mark with late tracking",
    "Advance salary requests and summaries",
    "Payroll generation with deductions",
  ]
);

// HR details
addTwoColumnSlide(
  "HR: Payroll & Advances",
  "Payroll Engine",
  [
    "Generate payroll runs by month",
    "Advance deduction and late penalties",
    "Net pay protected from negative values",
  ],
  "Advance Salary",
  [
    "Create and approve advances",
    "Summary table by employee",
    "Auto applied in payroll",
  ]
);

// Admin + audit
addTwoColumnSlide(
  "Admin and Audit",
  "User Management",
  [
    "CEO/Manager CRUD system users",
    "Force password change on first login",
    "Active/inactive account control",
  ],
  "Audit Trail",
  [
    "Action logs for critical operations",
    "Supports accountability and review",
    "Protects data integrity",
  ]
);

// Reports overview
addTwoColumnSlide(
  "Reports and KPIs",
  "Management Reporting",
  [
    "Sales, stock valuation, and KPI dashboards",
    "Audit viewer and EBM pending lists",
    "Export-ready summaries",
  ],
  "Sales SDC Reporting",
  [
    "Consolidated SDC view across all channels",
    "Imports historic Excel data and syncs new",
    "Search and filtering for quick lookup",
  ]
);

// UX
addTwoColumnSlide(
  "UX and Reliability",
  "Professional Interface",
  [
    "Fixed sidebar with clear navigation",
    "Resizable tables and clean spacing",
    "Alerts and success feedback standardized",
  ],
  "Operational Reliability",
  [
    "Consistent data validations",
    "Role-guarded routes and API endpoints",
    "Print-ready receipts and PDFs",
  ]
);

// Operational adjustments
addTwoColumnSlide(
  "Company Adjustments Supported",
  "Configurable Items",
  [
    "Branches, locations, bins and stock policy",
    "Product categories and pricing strategies",
    "Attendance rules and payroll deductions",
    "EBM integration fields and receipt layout",
  ],
  "Process Alignment",
  [
    "Standardized workflow across staff",
    "Improved customer care and delivery",
    "Scalable growth without data loss",
    "Prepared for audits and compliance",
  ]
);

// Deployment and VPN
addTwoColumnSlide(
  "Deployment & VPN Access",
  "Single-Port Hosting",
  [
    "Frontend build served by backend (one URL)",
    "Run: npm run build (frontend) + npm run dev (backend)",
    "Access: http://<server-ip>:5000",
  ],
  "WireGuard VPN",
  [
    "Clients connect via VPN to reach server",
    "Access URL: http://10.8.0.1:5000",
    "Firewall: allow TCP 5000 and UDP 51820",
  ]
);

// Demo script
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Demo Walkthrough (Suggested)");
  addBullets(slide, [
    "Login as Cashier: create sale, print receipt, confirm EBM",
    "Open Sales Ledger: verify SDC sync and search",
    "Open Stock: show location/bins and stock adjustments",
    "Open Motorbikes: create motorbike, add promotion",
    "Open HR: mark attendance, add advance, generate payroll",
    "Manager/CEO: view reports and audit logs",
  ], { x: MARGIN, y: 1.2, w: 12, h: 5.5, fontSize: 16 });
})();

// Roadmap
addTwoColumnSlide(
  "Next Enhancements",
  "Short-Term",
  [
    "Branding assets (logo, official receipt stamp)",
    "Advanced analytics and trend dashboards",
    "Barcode scanner workflow for POS",
  ],
  "Medium-Term",
  [
    "Mobile access for managers",
    "Supplier portal and purchase orders",
    "Customer loyalty and service history",
  ]
);

// Closing
(() => {
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: COLORS.navy },
  });
  slide.addText("AL-TAHS System", {
    x: 0.8,
    y: 2.4,
    w: 12,
    h: 0.8,
    fontSize: 40,
    color: COLORS.white,
    bold: true,
  });
  slide.addText("Ready for executive review and live demo", {
    x: 0.8,
    y: 3.3,
    w: 12,
    h: 0.6,
    fontSize: 18,
    color: COLORS.accent,
  });
})();

const outputPath = path.resolve(__dirname, "..", "..", "AL-TAHS-System-Demo.pptx");
pptx.writeFile({ fileName: outputPath });
