const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outputPath = path.resolve(__dirname, "..", "..", "AL-TAHS-User-Guide.pdf");
const doc = new PDFDocument({ size: "A4", margin: 50 });

doc.pipe(fs.createWriteStream(outputPath));

const COLORS = {
  text: "#101828",
  muted: "#475467",
  accent: "#0F172A",
  border: "#CBD5E1",
};

const PAGE_WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;

function ensureSpace(height) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function addHeading(text) {
  ensureSpace(40);
  doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(20).text(text, {
    width: PAGE_WIDTH,
  });
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text);
}

function addSubheading(text) {
  ensureSpace(30);
  doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(14).text(text, {
    width: PAGE_WIDTH,
  });
  doc.moveDown(0.3);
  doc.fillColor(COLORS.text);
}

function addParagraph(text) {
  ensureSpace(40);
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(11).text(text, {
    width: PAGE_WIDTH,
    lineGap: 2,
  });
  doc.moveDown(0.5);
}

function addBullets(items) {
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.text);
  items.forEach((item) => {
    ensureSpace(20);
    doc.text(`- ${item}`, {
      width: PAGE_WIDTH,
      lineGap: 2,
    });
  });
  doc.moveDown(0.4);
}

function addScreenshot(label, height = 160) {
  ensureSpace(height + 20);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.save();
  doc.rect(x, y, PAGE_WIDTH, height).dash(4, { space: 2 }).lineWidth(1).stroke(COLORS.border);
  doc.undash();
  doc.fillColor(COLORS.muted).font("Helvetica-Oblique").fontSize(10).text(
    `Screenshot placeholder: ${label}`,
    x + 12,
    y + 12,
    { width: PAGE_WIDTH - 24 }
  );
  doc.restore();
  doc.y = y + height + 12;
  doc.fillColor(COLORS.text);
}

function addCoverPage() {
  doc.font("Helvetica-Bold").fontSize(32).fillColor(COLORS.accent).text("AL-TAHS System User Guide", {
    align: "center",
    width: PAGE_WIDTH,
  });
  doc.moveDown(0.8);
  doc.font("Helvetica").fontSize(14).fillColor(COLORS.muted).text("Full Operations Manual", {
    align: "center",
    width: PAGE_WIDTH,
  });
  doc.moveDown(1.4);
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.text).text(
    "This guide explains every module and workflow in the AL-TAHS system. It is organized by role and includes step-by-step instructions, best practices, and troubleshooting tips.",
    { align: "center", width: PAGE_WIDTH }
  );
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text(`Version: 1.0 | Generated: ${new Date().toLocaleDateString()}`, {
    align: "center",
    width: PAGE_WIDTH,
  });
  doc.addPage();
}

function addTableOfContents() {
  addHeading("Table of Contents");
  addBullets([
    "1. System Overview",
    "2. Access, Login, and Security",
    "3. Common Navigation and UI Patterns",
    "4. Cashier Guide",
    "5. Store Keeper Guide",
    "6. Salesperson Guide",
    "7. HR Guide",
    "8. Manager Guide",
    "9. CEO Guide",
    "10. Admin Users",
    "11. Reports and Audit",
    "12. EBM and SDC Process",
    "13. Imports and Exports",
    "14. Printing and Receipts",
    "15. Troubleshooting",
    "16. Maintenance and Best Practices",
    "17. Appendix: Default Demo Users",
  ]);
  doc.addPage();
}

addCoverPage();
addTableOfContents();

addHeading("1. System Overview");
addParagraph(
  "AL-TAHS is an integrated business system that connects sales, inventory, motorbike CRM, HR, and reporting into one platform. The goal is to replace manual spreadsheets and reduce data loss by keeping all records in one database. Every action is tied to a user and logged for accountability, which improves operational discipline. The system is built for professional day-to-day work and supports a clear workflow for both frontline staff and management. This guide explains how each role should use the system and how the workflows connect across departments."
);
addScreenshot("System overview dashboard or landing page");

addHeading("2. Access, Login, and Security");
addSubheading("Access and VPN");
addParagraph(
  "Users access the system through a single URL provided by the company, typically hosted on the internal server. If staff are working remotely, they connect using the company VPN before opening the system. The VPN ensures data remains private and only authorized devices can reach the server. When the VPN is active, staff should open the system using the provided server address. If access fails, check the VPN connection first before troubleshooting the application."
);
addSubheading("Login and Password Changes");
addParagraph(
  "Each user receives a unique login email and a temporary password from the administrator. On first login, the system forces a password change to protect the account. Passwords should be strong and never shared across staff. If a user forgets a password, the administrator can reset it in the Admin Users module. The system logs login activity and protects all API endpoints by role."
);
addScreenshot("Login screen and change password screen");

addHeading("3. Common Navigation and UI Patterns");
addParagraph(
  "The left sidebar is the main navigation and changes depending on the user role. Each module includes filters, search boxes, and table views to find data quickly. Data tables support horizontal scrolling and column adjustments to keep long data readable. Alerts show errors, while success messages confirm saved actions; both are visible at the top of each page. Drawers and modals are used for forms so the user can work without losing the list view."
);
addBullets([
  "Use the search fields and filter dropdowns before creating new records.",
  "Click list rows to open detail panels or edit forms.",
  "Use export buttons when you need Excel or report outputs.",
  "Use print buttons for receipts or invoices as needed.",
]);
addScreenshot("Example list view with filters and table");

addHeading("4. Cashier Guide");
addSubheading("POS Terminal Workflow");
addParagraph(
  "The POS Terminal is used for creating sales invoices quickly and accurately. Cashiers search for products, add them to the cart, and complete checkout using approved payment methods. Spare parts require a storage bin selection while motorbikes can be sold without bin checks. The system calculates subtotal, discounts, tax, and final total automatically. After checkout, the cashier prints the receipt and prepares the invoice for EBM confirmation."
);
addBullets([
  "Search by name, SKU, part number, or brand.",
  "Add items to cart and confirm quantities.",
  "Select buyer type and add buyer TIN if needed.",
  "Complete checkout and print the receipt.",
  "Confirm EBM to generate the final SDC ID.",
]);
addScreenshot("POS terminal cart and checkout");

addSubheading("Invoice List and EBM Confirmation");
addParagraph(
  "The Invoice List shows all invoices created by the cashier and their EBM status. Pending invoices remain visible until EBM confirmation is completed. After confirmation, the system stores the official SDC ID and shows it in the sales ledger. This prevents sales from being reported without EBM compliance. The invoice list also provides a quick history of sales for daily reconciliation."
);
addScreenshot("Invoice list with pending and confirmed status");

addHeading("5. Store Keeper Guide");
addSubheading("Inventory and Product Records");
addParagraph(
  "Store Keepers manage the master product list, including pricing, categories, and minimum stock levels. Accurate product data ensures correct pricing at the POS and correct stock valuation. Every product should have a clear SKU and category for easy filtering. The inventory list shows stock levels per location and bin, which helps prevent stockouts. Low stock alerts provide early warning so replenishment can be planned."
);
addBullets([
  "Create or update products with correct pricing and category.",
  "Monitor low stock items daily.",
  "Review inventory by branch and bin before dispatching goods.",
]);
addScreenshot("Inventory list and low stock view");

addSubheading("Locations, Bins, and Stock Adjustments");
addParagraph(
  "Locations represent branches or storage areas and bins represent specific storage positions. Bins must be created before assigning stock. Stock adjustments allow multiple products to be received in a single operation, reducing repetitive entry. Each stock change is recorded in the transactions log for audit purposes. This process keeps inventory accurate and supports accountability."
);
addBullets([
  "Create a location when a new branch opens.",
  "Create bins for each shelf or rack.",
  "Use Stock Adjustments to add stock in bulk.",
  "Review Stock Transactions for accuracy.",
]);
addScreenshot("Bins and stock adjustments form");

addHeading("6. Salesperson Guide");
addSubheading("Motorbike Records");
addParagraph(
  "Salespersons manage the motorbike inventory using chassis numbers as unique identifiers. Each motorbike includes manufacturer, model, year, weight, and color details. Branch assignment shows where the bike is located and supports multi-branch visibility. Motorbikes can be sold without bin restrictions to keep the sales process fast. Accurate data ensures compliance and customer trust."
);
addBullets([
  "Create new motorbike records when stock arrives.",
  "Update branch or status as bikes move or sell.",
  "Verify chassis and model details before sale.",
]);
addScreenshot("Motorbike list and detail panel");

addSubheading("Promotions and Sales Ledger");
addParagraph(
  "The Promotions module records each sold motorbike with customer and delivery details. It supports Excel import to preserve historical records and updates existing data when re-imported. The Promotions table is optimized for wide headers and long text values. The Sales Ledger also allows salespersons to view consolidated SDC sales records. This ensures sales history is complete and searchable across time."
);
addBullets([
  "Use the Promotions form to record new sales.",
  "Import Excel files to load historical promotions.",
  "Use search and sort to locate specific bikes quickly.",
]);
addScreenshot("Promotions table and import panel");

addHeading("7. HR Guide");
addSubheading("Employees Management");
addParagraph(
  "The Employees module stores all staff records, including contact details, job position, salary, and bank information. HR can create new employees, update records, and deactivate employees who leave. Accurate employee data is required for correct payroll calculations. The list view makes it easy to confirm who is active. This keeps HR records clean and aligned with payroll processing."
);
addBullets([
  "Create new employees with full contact and salary details.",
  "Deactivate employees rather than deleting records.",
  "Keep bank and TIN details up to date.",
]);
addScreenshot("Employees list and edit form");

addSubheading("Attendance Logic");
addParagraph(
  "Attendance is recorded daily for each active employee. HR can mark presence, absence, and lateness, including late minutes for each person. There is an option to auto-fill absences so no staff are missed. Attendance summaries show totals over a date range and help managers monitor performance. These records feed into payroll calculations to ensure fair salary deductions."
);
addBullets([
  "Select a date and prepare the attendance list.",
  "Mark each employee status and late minutes if needed.",
  "Save attendance and review daily or summary reports.",
]);
addScreenshot("Attendance marking screen");

addSubheading("Advance Salary and Payroll");
addParagraph(
  "Advance salaries are recorded per employee and can be approved or canceled. Approved advances are automatically deducted when payroll is generated. Payroll runs calculate gross pay from base salary and days worked, then apply advances and late penalties. Net pay is never negative, ensuring clean payroll outputs. HR can review payroll runs by month and export results for finance processing."
);
addBullets([
  "Create advances with clear reasons and dates.",
  "Generate payroll runs at month end.",
  "Confirm net pay before finalizing payroll.",
]);
addScreenshot("Payroll run and summary table");

addHeading("8. Manager Guide");
addParagraph(
  "Managers oversee operational performance across departments and use reports to make decisions. They can access POS, inventory, HR, and motorbike data without editing restrictions. The system provides KPI dashboards, sales summaries, and audit reports. Managers can review pending EBM invoices and ensure compliance. This role focuses on monitoring, correcting issues, and improving workflows."
);
addBullets([
  "Review KPI dashboards for daily performance.",
  "Check pending EBM confirmations.",
  "Use reports to guide procurement and staffing decisions.",
]);
addScreenshot("Manager dashboard and reports overview");

addHeading("9. CEO Guide");
addParagraph(
  "The CEO has full visibility into sales, stock, HR, and audit data. This role uses executive dashboards to track company performance and compliance. The CEO can review system users, ensure roles are assigned correctly, and monitor critical actions in the audit log. Reports allow strategic decisions based on real-time data. The CEO role is designed for oversight rather than daily operations."
);
addBullets([
  "Access all reports and dashboards.",
  "Review audit logs for key actions.",
  "Verify compliance with EBM and SDC requirements.",
]);
addScreenshot("CEO dashboard and audit viewer");

addHeading("10. Admin Users");
addParagraph(
  "The Admin Users module allows authorized roles to create and manage system accounts. Each user is assigned a role that controls their access. New users are required to change their password on first login. Accounts can be deactivated without deleting historical activity. This module ensures staffing changes do not affect historical data integrity."
);
addBullets([
  "Create users with correct roles.",
  "Deactivate users when staff leave.",
  "Reset passwords only when authorized.",
]);
addScreenshot("System users list");

addHeading("11. Reports and Audit");
addParagraph(
  "Reports provide a summarized view of sales, stock valuation, and KPIs. They help management spot trends and correct issues early. The Audit Viewer lists key system actions, including sales creation, EBM confirmation, and stock adjustments. Reports are export-ready and can be used for compliance and accounting. Regular report reviews keep operations disciplined and predictable."
);
addBullets([
  "Use Sales Reports for revenue analysis.",
  "Use Stock Valuation for financial reporting.",
  "Use Audit Viewer to review sensitive actions.",
]);
addScreenshot("Reports overview and audit list");

addHeading("12. EBM and SDC Process");
addParagraph(
  "EBM confirmation is required for official sales reporting and tax compliance. A sale is first created as PENDING, then confirmed when the cashier enters the EBM data. The system stores the SDC ID and signature once confirmed. Only confirmed sales are shown as complete in the sales ledger. This process ensures records match the official EBM system and reduce compliance risk."
);
addBullets([
  "Create sale in POS and print invoice.",
  "Confirm EBM once official EBM data is available.",
  "Verify SDC ID appears in the sales ledger.",
]);
addScreenshot("EBM confirmation panel");

addHeading("13. Imports and Exports");
addParagraph(
  "The system supports Excel import for promotions and sales SDC data. Importing updates existing rows and adds new ones without losing history. This is critical for integrating old records and keeping long-term sales history complete. Exports allow management to share reports with accounting and compliance teams. Always verify file headers match the required format before importing."
);
addBullets([
  "Use Promotions import for motorbike historical records.",
  "Use Sales SDC import for consolidated invoice history.",
  "Use report exports for financial and compliance reporting.",
]);
addScreenshot("Excel import dialog");

addHeading("14. Printing and Receipts");
addParagraph(
  "The system provides professional print outputs in two formats: A4 invoices and 80mm receipts. Both formats include company information and QR codes with invoice data. QR codes allow verification of invoice details and improve customer trust. Receipts are optimized for thermal printers and can auto-open the print dialog. Print outputs are consistent across all branches."
);
addBullets([
  "Use A4 PDF for official documentation.",
  "Use 80mm receipts for quick customer handoff.",
  "Verify QR code prints clearly before use.",
]);
addScreenshot("Printed invoice and receipt samples");

addHeading("15. Troubleshooting");
addParagraph(
  "Most issues are caused by network access or missing permissions. If the system cannot be reached, verify VPN connectivity and server availability. If a user sees Forbidden errors, confirm the correct role is assigned. If data is missing after a save, refresh the page or check if an import failed. For print issues, ensure the browser allows popups and printers are configured correctly."
);
addBullets([
  "Cannot login: verify email, password, and account status.",
  "Cannot access page: verify role permissions.",
  "Import failed: check file format and headers.",
  "Print failed: allow popup and choose printer.",
]);
addScreenshot("Troubleshooting checklist placeholder");

addHeading("16. Maintenance and Best Practices");
addParagraph(
  "Create regular backups of the database to prevent data loss. Update user accounts when staff join or leave to maintain security. Review stock and attendance data weekly to catch inconsistencies early. Keep pricing and product data accurate to avoid invoicing errors. Train staff on the correct workflow to minimize rework and improve customer service."
);
addBullets([
  "Back up the database on a schedule.",
  "Review audit logs weekly.",
  "Keep master product data clean.",
  "Use reports to guide purchasing and staffing.",
]);

addHeading("17. Appendix: Default Demo Users");
addParagraph(
  "The system includes default demo users for initial testing only. Replace these accounts before production use. Each default user should change their password on first login. The default accounts are listed below for reference."
);
addBullets([
  "ceo@altas.local (CEO)",
  "manager@altas.local (MANAGER)",
  "hr@altas.local (HR)",
  "cashier@altas.local (CASHIER)",
  "store@altas.local (STORE_KEEPER)",
  "sales@altas.local (SALESPERSON)",
]);

addParagraph("End of guide.");

doc.end();
