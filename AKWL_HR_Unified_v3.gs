/**
 * AKWL HR — Onboarding & Offboarding Automation  v3.8
 * Setup: run installTriggers(), authorize when prompted, delete triggers on old scripts.
 */

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const CFG = {
  EMPLOYEE_SHEET_ID  : '1lhB25hdKfARc6nGjbN9AwYGHQ_bsLRdGkeCuQA7Ow9w',
  TAB_CURRENT        : 'Current Employees',
  TAB_FORMER         : 'Former Employees',
  TAB_FORM_RESPONSES : 'Form Responses',

  COMPANY_NAME : 'Alaska Wild Lights',

  // Guides — folder name: "Last, First"
  GUIDES_PARENT_FOLDER_ID     : '1Ya0e276RRvVasEcOBchsqAW3cEVNMo1w',
  GUIDE_CHECKLIST_TEMPLATE_ID : '1Tr9jDUBoocBKGM2IvJoYwZDMVk2wyH_WHnkN-qnp_kA',

  // Maintenance (Lead Mechanic, Mechanic, Detailer) — folder name: "Last, First (Role)"
  MAINTENANCE_PARENT_FOLDER_ID : '1NfaBoAoDSKqZI-PzQnPBhCXyzFoUPurm',

  // Office (Office Assistant, Operations Manager, Social Media Lead) — folder name: "Last, First (Role)"
  OFFICE_PARENT_FOLDER_ID : '1xAlbB72BLWaF49WiUz9AdQEWDyNgyuwr',

  // Non-guide checklist (maintenance + office) — "adapt before sharing" warning sent for non-guides
  NON_GUIDE_CHECKLIST_TEMPLATE_ID : '19LzGeqpE4eMnFJIuw7oXUy-Farw1dPNc_QbC-ZhyjvM',

  ONBOARDING_FORM_URL : 'https://forms.gle/MxgzP6iRrko2bibX9',

  // Fallback offer letter for unrecognized roles — must adapt Scope of Work + Compensation before sending
  OFFER_LETTER_FALLBACK_ID : '1EOu2zyZEoUEuDg2vd9T4vHOSsmBZgn0VFVuCQEMiCzg',
  OFFER_LETTERS_FOLDER_URL : 'https://drive.google.com/drive/folders/1MNpbdRWoqa_9ey6sqUepiv5uowsQw5pV',

  // TODO: office comp calculator + bonus overview templates — fill when available
  OFFICE_COMP_CALC_TEMPLATE_ID      : '',
  OFFICE_BONUS_OVERVIEW_TEMPLATE_ID : '',

  TERM_LETTER_TEMPLATE_ID    : '1dS4FAsCporrVLiYXJZvP2g8sPTuKV9wJuOex5ulN0Bc',
  FORMER_DOCS_FOLDER_ID      : '14A65GrTTV737kDOwEKd2IFk457CjzhpC',
  FORMER_PERSONNEL_FOLDER_ID : '1pqlCfTXlkN707XANQap77RHg3qkPYkDN',  // Former Employees folder

  HR_CHECKLIST_URL          : 'https://docs.google.com/document/d/1gtcQ0adsPUIUZhDcA48cZhYCCaxeNL5XMSsSnYAD-d0/edit?tab=t.0',
  OFFBOARDING_CHECKLIST_URL : 'https://docs.google.com/document/d/1fBUM13Qmr4IcuV_kAVxs0MUyol1e6SqZ79toqi6OQ3k/edit?usp=drive_link',

  // Email routing — ALL HR notifications go TO MAIL_TO, CC MAIL_CC. Change here to reroute everything.
  MAIL_TO  : 'info@alaskawildlights.com',
  MAIL_CC  : 'joshuamcneal@alaskawildlights.com',

  INFO_EMAIL      : 'info@alaskawildlights.com',  // script error emails only — keep in sync with MAIL_TO
  INSURANCE_EMAIL : 'Tabatha.Wilson@trucordia.com',

  CONTACT_GROUP_NAME : 'AKWL Team',

  FOLLOW_UP_BUSINESS_DAYS : 5,

  TIMEZONE : 'America/Anchorage',

  HEADER_ROWS    : [2, 3],
  DATA_START_ROW : 4,
};

// Canonical field keys -> exact header text in the sheet.
// If a header is renamed in the sheet, update the string here;
// everything else in the script keeps working off these keys.
const FIELD = {
  FIRST_NAME        : 'First Name',
  LAST_NAME         : 'Last Name',
  POSITION          : 'Position / Role',
  DATE_OF_HIRE      : 'Date of Hire',       // onboarding trigger
  START_DATE        : 'Start Date',
  END_DATE          : 'End Date',            // offboarding trigger
  AVAILABILITY      : 'Availability',
  PHONE             : 'Phone',
  PERSONAL_EMAIL    : 'Personal Email',
  DOB               : 'DOB',
  UNIFORM_SIZE      : 'Uniform Size',
  CONTRACT_DOCUSEAL : 'Contract (Docuseal)',
  PHOTO_BIO         : 'Photo + Bio',
  DRIVING_HISTORY   : 'Driving History',
  DRIVERS_LICENSE   : "Driver's License",
  STATE_OF_ISSUE    : 'State of Issue',
  LICENSE_NUMBER    : 'License #',
  YRS_LICENSED      : 'Yrs Licensed',
  EMERGENCY_CONTACT : 'Emergency Contact',
  NOTES             : 'Notes',
};

const PROP_OFFBOARD_PREFIX   = 'OFFBOARD_';
const PROP_FOLDER_PREFIX     = 'FOLDER_';      // FOLDER_<key>      → Drive folder ID (real ID or absent)
const PROP_FORM_ROW_PREFIX   = 'FORM_ROW_';    // FORM_ROW_<n>      → ISO timestamp (processed lock)
const PROP_OFFER_FILE_PREFIX = 'OFFER_FILE_';  // OFFER_FILE_<key>  → offer letter file ID (for start-date deletion)
const PROP_ONBOARDED_PREFIX  = 'ONBOARDED_';   // ONBOARDED_<key>   → 'true' (ran through this script) | 'LEGACY' (pre-existing)

// Role → offer letter template ID. Checked in order; first match wins.
// Lead Mechanic must come before plain Mechanic to avoid partial-match shadowing.
const OFFER_LETTER_ROLES = [
  { match: /guide/i,                          id: '1W1MAQhVm4nXu9RUrGS8UocD_Lf3UlsWjGwAra4d80XI' },
  { match: /lead\s*mechanic/i,                id: '1S0DzKnLOcSmEY6Xv-WDYO9JluxtSQeDCFJNmbWRrEk0' },
  { match: /\bmechanic\b/i,                   id: '1cQvtrPKuUOCeS86bGWi3oU1fDWMFqaobRrgY7o1gPOE'  },
  { match: /detailer/i,                       id: '1GrxpLXicg5G7vIytDM2056nEv-68SnsKlPdYCz5v5kk'  },
  { match: /office\s*assistant/i,             id: '18a0z-1XJZJMMvr6uaC0Gda9CseFcfsWkYkaLT1xBrgA'  },
  { match: /operations?\s*manager/i,          id: '1hxrf6uVr_j32nN0rOlMbxCjS37VrT_s8tQX5p-rVv6w'  },
  { match: /social\s*media|content\s*lead/i,  id: '10y99_HFjQQc0TVTbLlY2BU-0_HQWlkVUktdv77crUNE'  },
];


// ─────────────────────────────────────────────────────────────
// HEADER LOOKUP — the fix for the recurring "columns moved" bug
// ─────────────────────────────────────────────────────────────

/**
 * Scans header rows and returns { "Header Text": columnNumber }.
 * Row 3 (field names) wins; row 2 (group labels) fills any gaps
 * row 3 left blank (e.g. "Notes" only has a label in row 2).
 */
function getHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const rows = {};
  CFG.HEADER_ROWS.forEach(r => { rows[r] = sheet.getRange(r, 1, 1, lastCol).getValues()[0]; });

  const map = {};
  for (let ri = CFG.HEADER_ROWS.length - 1; ri >= 0; ri--) {
    const rowVals = rows[CFG.HEADER_ROWS[ri]];
    rowVals.forEach((val, i) => {
      const col = i + 1;
      const text = String(val || '').trim();
      if (text && !Object.values(map).includes(col)) map[text] = col;
    });
  }
  return map;
}

/** Returns the column number for a FIELD key, or null if that header doesn't exist. */
function col_(headerMap, fieldKey) {
  return headerMap[FIELD[fieldKey]] || null;
}

/** Reads a cell by field key; returns null if the column doesn't exist. */
function getByField_(sheet, headerMap, row, fieldKey) {
  const c = col_(headerMap, fieldKey);
  return c ? sheet.getRange(row, c).getValue() : null;
}

/** Writes a cell by field key. No-ops silently if the column doesn't exist. */
function setByField_(sheet, headerMap, row, fieldKey, value) {
  const c = col_(headerMap, fieldKey);
  if (c) sheet.getRange(row, c).setValue(value);
}


// ─────────────────────────────────────────────────────────────
// ONE-TIME SETUP
// ─────────────────────────────────────────────────────────────

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (['onEmployeeSheetEdit', 'onEmployeeFormSubmit', 'onFormSubmit', 'dailyHRTasks'].includes(fn)) ScriptApp.deleteTrigger(t);
  });

  const ss = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  // onEdit: HR edits to Current Employees (Date of Hire → onboarding, End Date → offboarding)
  ScriptApp.newTrigger('onEmployeeSheetEdit').forSpreadsheet(ss).onEdit().create();
  // onFormSubmit: fires when the Onboarding Form is submitted — onEdit does NOT fire for form submissions
  ScriptApp.newTrigger('onEmployeeFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('dailyHRTasks').timeBased().everyDays(1).atHour(8).inTimezone(CFG.TIMEZONE).create();

  Logger.log('Triggers installed. Now delete the triggers on the OLD scripts (0039, 0042, 049, 0040).');
}


// ─────────────────────────────────────────────────────────────
// FORM SUBMIT TRIGGER — fires when the Onboarding Form is submitted
// ─────────────────────────────────────────────────────────────
function onEmployeeFormSubmit(e) {
  try {
    const sheet = e.range.getSheet();
    const row   = e.range.getRow();
    handleFormResponseRow_(sheet, row);
  } catch (err) {
    Logger.log('onEmployeeFormSubmit error: ' + err.message);
    MailApp.sendEmail(CFG.INFO_EMAIL, 'AKWL HR script error (onFormSubmit)', err.message + '\n' + err.stack);
  }
}


// ─────────────────────────────────────────────────────────────
// EDIT TRIGGER — onboarding (Date of Hire) + offboarding (End Date)
// ─────────────────────────────────────────────────────────────
function onEmployeeSheetEdit(e) {
  try {
    const sheet     = e.range.getSheet();
    const sheetName = sheet.getName();

    // Only act on Current Employees edits (onboarding / offboarding triggers)
    if (sheetName !== CFG.TAB_CURRENT) return;

    const row = e.range.getRow();
    if (row < CFG.DATA_START_ROW) return;

    const headerMap    = getHeaderMap_(sheet);
    const dateOfHireCol = col_(headerMap, 'DATE_OF_HIRE');
    const endDateCol    = col_(headerMap, 'END_DATE');

    const editedCols = [];
    for (let c = e.range.getColumn(); c < e.range.getColumn() + e.range.getNumColumns(); c++) editedCols.push(c);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (dateOfHireCol && editedCols.includes(dateOfHireCol)) {
        const dateOfHire = sheet.getRange(row, dateOfHireCol).getValue();
        if (dateOfHire) runOnboarding(sheet, headerMap, row);
      }
      if (endDateCol && editedCols.includes(endDateCol)) {
        const endDate = sheet.getRange(row, endDateCol).getValue();
        if (endDate) scheduleOffboarding(sheet, headerMap, row, new Date(endDate));
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log('onEmployeeSheetEdit error: ' + err.message);
    MailApp.sendEmail(CFG.INFO_EMAIL, 'AKWL HR script error (onEdit)', err.message + '\n' + err.stack);
  }
}


// ─────────────────────────────────────────────────────────────
// FORM RESPONSES — detect new row, read it, sync to Current Employees
// ─────────────────────────────────────────────────────────────

/**
 * Called by onEmployeeSheetEdit when the edited sheet is Form Responses.
 * The installable onEdit trigger fires when the form adds a new row.
 * We read that row directly by column header text — same header-lookup
 * pattern used everywhere else in this script.
 *
 * To avoid processing the same row twice (e.g., if HR edits a cell in
 * Form Responses later), we record each processed row in Script Properties.
 * To manually re-process a row, delete key FORM_ROW_<rowNumber> from
 * Script Properties (Project Settings → Script Properties in the editor).
 */
function handleFormResponseRow_(formSheet, row) {
  if (row < 2) return;  // row 1 is the header

  const props  = PropertiesService.getScriptProperties();
  const rowKey = PROP_FORM_ROW_PREFIX + row;
  if (props.getProperty(rowKey)) return;  // already processed — skip

  // Confirm row has a Timestamp (column 1) — guards against accidental
  // single-cell edits in the Form Responses tab triggering this function
  const timestamp = formSheet.getRange(row, 1).getValue();
  if (!timestamp) return;

  // Mark as processed NOW (before any work) so a concurrent trigger
  // firing for the same row doesn't double-run
  props.setProperty(rowKey, new Date().toISOString());

  try {
    processFormResponseRow_(formSheet, row);
  } catch (err) {
    props.deleteProperty(rowKey);  // allow retry on next edit if something crashed
    throw err;
  }
}

/**
 * Reads a Form Responses row by column header text and writes the
 * mapped values into the matching employee row in Current Employees.
 *
 * Form Responses headers are in row 1 only (unlike Current Employees
 * which has group labels in row 2 and field names in row 3).
 *
 * Column → field mapping confirmed from the live Form Responses tab:
 *   Timestamp, Email, First name, Last name, Date of Birth,
 *   Phone Number, Personal Email, Mailing Address (Street only),
 *   City, State (State code, e.g., AK, CA),
 *   What is your preferred t-shirt size for your uniform?,
 *   Profile Picture, Emergency Contact Name, Emergency Contact Phone,
 *   Driver's License, Driving Record, State of Issue, License Number,
 *   Years Licensed,
 *   Just a quick reminder! Have you signed your Offer Letter via Docuseal yet?,
 *   Start date, Availabilities
 */
function processFormResponseRow_(formSheet, row) {
  // Read headers (row 1) and the entire data row in 2 API calls total.
  // All field lookups index into rowValues[] — no per-field getValue() calls.
  // First name = col C (3), Last name = col D (4) — confirmed layout.
  const lastCol    = formSheet.getLastColumn();
  const headerRow  = formSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rowValues  = formSheet.getRange(row, 1, 1, lastCol).getValues()[0];

  const formHeaders = {};
  headerRow.forEach((val, i) => {
    const text = String(val || '').trim();
    if (text) formHeaders[text] = i + 1;
  });

  // Fast name read using known column positions (C=3, D=4) — no header scan needed
  const first = String(rowValues[2] || '').trim();  // col C
  const last  = String(rowValues[3] || '').trim();  // col D
  if (!first || !last) {
    MailApp.sendEmail({
      to: CFG.MAIL_TO,
      subject: `AKWL HR: Form response row ${row} has no name`,
      body: `Row ${row} in Form Responses was submitted but columns C (First Name) and/or D (Last Name) are empty. ` +
        `Please check the Form Responses tab manually.\n\nTimestamp: ${timestamp}`,
    });
    return;
  }

  // All other fields via header map but reading from pre-loaded rowValues[]
  const getFormVal = (question) => {
    const col = formHeaders[question];
    if (!col) return '';
    const v = rowValues[col - 1];
    return v ? String(v).trim() : '';
  };

  const ss         = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const empSheet   = ss.getSheetByName(CFG.TAB_CURRENT);
  const headerMap  = getHeaderMap_(empSheet);
  const empRow     = findEmployeeRow_(empSheet, headerMap, first, last);

  if (!empRow) {
    const lines = [];
    headerRow.forEach((h, i) => {
      if (!h) return;
      const v = rowValues[i];
      if (v !== '' && v !== null && v !== undefined) lines.push(`${h}: ${v}`);
    });
    MailApp.sendEmail({
      to: CFG.MAIL_TO,
      subject: `AKWL HR: Form submitted for unknown employee — ${first} ${last}`,
      body: `${first} ${last} submitted the onboarding form (row ${row} in Form Responses), ` +
        `but no matching row was found in "${CFG.TAB_CURRENT}".\n\n` +
        `Add them manually (Position + Date of Hire), then either:\n` +
        `  a) Delete Script Property "FORM_ROW_${row}" and have them resubmit, or\n` +
        `  b) Copy their answers below by hand.\n\n` +
        `─────────────────────────────────\n` +
        `${lines.join('\n')}\n` +
        `─────────────────────────────────`,
    });
    return;
  }

  // ── Write text fields ─────────────────────────────────────────
  const set = (fieldKey, question, parseAsDate) => {
    const v = getFormVal(question);
    if (!v) return;
    setByField_(empSheet, headerMap, empRow, fieldKey, parseAsDate ? new Date(v) : v);
  };

  set('DOB',               'Date of Birth', true);
  set('PHONE',             'Phone Number');
  set('PERSONAL_EMAIL',    'Email');
  set('EMERGENCY_CONTACT', 'Emergency Contact Name');
  set('STATE_OF_ISSUE',    'State of Issue');
  set('LICENSE_NUMBER',    'License Number');
  set('YRS_LICENSED',      'Years Licensed');
  set('START_DATE',        'Start date', true);
  set('AVAILABILITY',      'Availabilities');
  set('UNIFORM_SIZE',      'What is your preferred t-shirt size for your uniform?');

  // ── Checkmark fields ──────────────────────────────────────────
  const licenseUrl    = getFormVal("Driver's License");
  const drivingRecUrl = getFormVal('Driving Record');
  const profilePicUrl = getFormVal('Profile Picture');

  setByField_(empSheet, headerMap, empRow, 'DRIVERS_LICENSE', licenseUrl    ? '✓' : '✕');
  setByField_(empSheet, headerMap, empRow, 'DRIVING_HISTORY',  drivingRecUrl ? '✓' : '✕');
  setByField_(empSheet, headerMap, empRow, 'PHOTO_BIO',        profilePicUrl ? '✓' : '✕');

  const docusealAnswer = getFormVal('Just a quick reminder! Have you signed your Offer Letter via Docuseal yet?');
  if      (/yes/i.test(docusealAnswer))     setByField_(empSheet, headerMap, empRow, 'CONTRACT_DOCUSEAL', '✓');  // "Yes, all signed!"
  else if (/not yet/i.test(docusealAnswer)) setByField_(empSheet, headerMap, empRow, 'CONTRACT_DOCUSEAL', '✕');  // "Not yet"

  // ── Move uploaded files into the employee's onboarding folder ─
  const folderId = PropertiesService.getScriptProperties()
    .getProperty(PROP_FOLDER_PREFIX + employeeKey_(first, last));

  if (folderId) {
    if (profilePicUrl)  moveFileToEmployeeFolder_(profilePicUrl,  folderId, `Profile Picture_${last}`);
    if (licenseUrl)     moveFileToEmployeeFolder_(licenseUrl,     folderId, `Driver License_${last}`);
    if (drivingRecUrl)  moveFileToEmployeeFolder_(drivingRecUrl,  folderId, `Driving Record_${last}`);
  }

  // Reschedule offer letter deletion to 5 days after confirmed start date
  const startDateVal = getFormVal('Start date');
  if (startDateVal) {
    const offerFileId = PropertiesService.getScriptProperties()
      .getProperty(PROP_OFFER_FILE_PREFIX + employeeKey_(first, last));
    if (offerFileId) {
      const deleteOn = new Date(startDateVal);
      deleteOn.setDate(deleteOn.getDate() + 5);
      scheduleDocDeletionOn_(offerFileId, deleteOn);
    }
  }

  // Add to Google Contacts with role, DOB, and company
  const personalEmail = getFormVal('Email');
  const phone         = getFormVal('Phone Number');
  const role          = String(getByField_(empSheet, headerMap, empRow, 'POSITION') || '').trim();
  const dob           = getFormVal('Date of Birth');
  if (personalEmail) addContactSafely_(first, last, personalEmail, phone || undefined, role || undefined, dob || undefined, CFG.COMPANY_NAME);

  Logger.log(`Form row ${row} applied to employee row ${empRow} (${first} ${last}).`);
}


// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────
function runOnboarding(sheet, headerMap, row) {
  const first    = getByField_(sheet, headerMap, row, 'FIRST_NAME');
  const last     = getByField_(sheet, headerMap, row, 'LAST_NAME');
  if (!first || !last) return;

  // Guard: skip if onboarding already ran for this employee.
  // 'LEGACY' = pre-existing employee marked by markExistingEmployeesAsOnboarded().
  // 'true'   = went through this script normally.
  // This also protects against HR accidentally re-editing the Date of Hire cell.
  const key   = employeeKey_(first, last);
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(PROP_ONBOARDED_PREFIX + key)) {
    Logger.log(`runOnboarding: skipping ${first} ${last} — already onboarded.`);
    return;
  }

  const position = String(getByField_(sheet, headerMap, row, 'POSITION') || '');
  const isGuide  = /guide/i.test(position);

  // Determine parent folder based on role category
  const parentFolderId = isGuide                                   ? CFG.GUIDES_PARENT_FOLDER_ID
    : /lead\s*mechanic|\bmechanic\b|detailer/i.test(position)      ? CFG.MAINTENANCE_PARENT_FOLDER_ID
    : CFG.OFFICE_PARENT_FOLDER_ID;  // office roles + unknown fallback

  // Determine offer letter: first matching role wins, else use generic fallback
  const roleEntry       = OFFER_LETTER_ROLES.find(r => r.match.test(position));
  const offerTemplateId = roleEntry ? roleEntry.id : CFG.OFFER_LETTER_FALLBACK_ID;
  const isFallback      = !roleEntry;

  // Checklist: guides get their own template; everyone else shares the non-guide one
  const checklistId = isGuide ? CFG.GUIDE_CHECKLIST_TEMPLATE_ID : CFG.NON_GUIDE_CHECKLIST_TEMPLATE_ID;

  // Folder name: all employees = "Last, First" for guides, "Last, First (Role)" for everyone else
  const folderName = isGuide ? `${last}, ${first}` : `${last}, ${first} (${position})`;

  const parentFolder = DriveApp.getFolderById(parentFolderId);
  const personFolder = parentFolder.createFolder(folderName);

  props.setProperty(PROP_FOLDER_PREFIX + key, personFolder.getId());

  // Hyperlink First Name cell → folder
  const firstNameCol = col_(headerMap, 'FIRST_NAME');
  if (firstNameCol) {
    sheet.getRange(row, firstNameCol)
      .setFormula(`=HYPERLINK("${personFolder.getUrl()}","${first.replace(/"/g, '""')}")`);
  }

  const offerCopy = DriveApp.getFileById(offerTemplateId)
    .makeCopy(`Offer Letter_${last}`, personFolder);

  // Checklist file name: "Last, First_Onboarding Checklist"
  const checklistCopy = DriveApp.getFileById(checklistId)
    .makeCopy(`${last}, ${first}_Onboarding Checklist`, personFolder);

  const startDate = getByField_(sheet, headerMap, row, 'START_DATE');
  fillOfferLetterPlaceholders_(offerCopy.getId(), first, last, startDate || null);

  // Store offer file ID so form submit can reschedule deletion once start date is confirmed
  props.setProperty(PROP_OFFER_FILE_PREFIX + key, offerCopy.getId());
  if (startDate) {
    const deleteOn = new Date(startDate);
    deleteOn.setDate(deleteOn.getDate() + 5);
    scheduleDocDeletionOn_(offerCopy.getId(), deleteOn);
  }
  // Checklist expires 15 days from today (not start-date based)
  scheduleDocDeletion_(checklistCopy.getId(), 15);

  // HR notification
  const fallbackNote = isFallback
    ? `\n⚠️  UNKNOWN ROLE: No offer letter template exists for "${position}". ` +
      `A generic adaptable template was used — please update the Scope of Work and ` +
      `Compensation sections before sending.\nAll offer letters: ${CFG.OFFER_LETTERS_FOLDER_URL}\n`
    : '';
  const checklistNote = !isGuide
    ? `\n⚠️  CHECKLIST: The non-guide checklist template must be adapted for ${first}'s role ` +
      `(${position}) before sharing with the employee.\n`
    : '';

  MailApp.sendEmail({
    to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
    subject: `New Employee Onboarding — ${first} ${last}`,
    body: `${first} ${last} (${position}) has a Date of Hire entered.\n\n` +
      `Folder:               ${personFolder.getUrl()}\n` +
      `Offer Letter:         ${offerCopy.getUrl()}\n` +
      `Onboarding Checklist: ${checklistCopy.getUrl()}\n` +
      `${fallbackNote}${checklistNote}\n` +
      `HR onboarding checklist:\n${CFG.HR_CHECKLIST_URL}`,
  });

  GmailApp.createDraft(CFG.INSURANCE_EMAIL, `Insurance Update: New Hire — ${first} ${last}`,
    `Tabatha,\n\nPlease see attached for documentation regarding our new hire ` +
    `(${first} ${last}) to update our insurance.\n\nThanks in advance!`,
    { cc: CFG.MAIL_CC });

  const email = getByField_(sheet, headerMap, row, 'PERSONAL_EMAIL');
  if (email) {
    GmailApp.createDraft(email, 'Welcome to Alaska Wild Lights!',
      `Hi ${first}!\n\n` +
      `Welcome to Alaska Wild Lights. We're thrilled to have you on the team!\n\n` +
      `Here's everything you need to get started. There are three things to complete before Day 1, ` +
      `and we've made it as straightforward as possible.\n\n` +
      `STEP 1 — SIGN YOUR OFFER LETTER\n` +
      `You'll receive a separate email from DocuSeal with your offer letter. Please check your inbox ` +
      `(and your spam folder — just in case!) and sign it at your earliest convenience. ` +
      `Once that's done, move on to Step 2.\n\n` +
      `STEP 2 — COMPLETE YOUR ONBOARDING FORM\n` +
      `Complete Your Onboarding Form Here: ${CFG.ONBOARDING_FORM_URL}\n\n` +
      `Before you sit down to fill it out, have the following ready — it'll take about 5 minutes if you do:\n\n` +
      `• A headshot photo (clear, good lighting — this is what guests see)\n` +
      `• Your driver's license (photo or scan to upload)\n` +
      `• Your driving record (you can request it from the DMV)\n` +
      `• License details: state of issue, license number, years licensed\n` +
      `• Your general availability\n\n` +
      `Important: Please only upload the documents requested. If you don't yet have a specific ` +
      `document (for example, your driving record), do not substitute another document in its place. ` +
      `Instead, let us know as soon as possible.\n\n` +
      `STEP 3 — COMPLETE YOUR ONBOARDING CHECKLIST (WITHIN 15 DAYS OF YOUR START DATE)\n` +
      `Your Onboarding Checklist walks you through everything to complete before your first tour. ` +
      `You can find it in your onboarding folder below. Please complete all items within 15 days of your start date.\n` +
      `${checklistCopy.getUrl()}\n\n` +
      `YOUR ONBOARDING FOLDER\n` +
      `Review everything at your own pace: ${personFolder.getUrl()}\n` +
      `You already have contributor access. Once you submit your onboarding form, all necessary ` +
      `documents will be added automatically — please make sure everything is in order.\n\n` +
      `YOUR FIRST MEETING\n` +
      `Our operations manager will reach out once we have your official first tour date confirmed.\n\n` +
      `A few things to have ready before Day 1:\n\n` +
      `• Review the Employee Handbook in your onboarding folder.\n` +
      `• Log in to FareHarbor and SimplyFleet using the credentials you'll receive separately.\n` +
      `• Come with questions — we want you to feel confident before your first solo tour.\n\n` +
      `If anything comes up before then, don't hesitate to reach out.\n\n` +
      `Best regards,\n` +
      `Alaska Wild Lights Team`);

    // 15-day checklist reminder draft — send manually when the time comes
    GmailApp.createDraft(email, `Reminder: Your Onboarding Checklist Is Due Soon`,
      `Hi ${first},\n\n` +
      `Hope everything's going well! Just a friendly reminder that your Onboarding Checklist ` +
      `is due within 15 days of your start date.\n\n` +
      `If you haven't had a chance to go through it yet, no worries — you can find it here:\n` +
      `${checklistCopy.getUrl()}\n\n` +
      `And your full onboarding folder is here:\n` +
      `${personFolder.getUrl()}\n\n` +
      `Feel free to reach out if you have any questions. We're happy to help!\n\n` +
      `Warm regards,\n` +
      `Alaska Wild Lights Team`);
  }

  // Contact added later in processFormResponseRow_ once email + phone arrive via the form

  // Mark as onboarded so this never re-runs (protects against accidental Date-of-Hire re-edits)
  props.setProperty(PROP_ONBOARDED_PREFIX + key, 'true');

  Logger.log(`Onboarding complete for ${first} ${last} (${position})${isFallback ? ' — FALLBACK template' : ''}.`);
}

/**
 * Offer Letter template placeholders (verified from GUIDE_AKWL_Offer_Letter.docx):
 *   {{FIRST_NAME}}  →  first name
 *   {{LAST_NAME}}   →  last name
 *   {{DATE}}        →  Start Date (the "Start Date:" line in the letter)
 * If Start Date isn't filled yet when onboarding fires, {{DATE}} stays in the
 * document as a visible reminder for HR to fill it in manually before sending.
 */
function fillOfferLetterPlaceholders_(fileId, first, last, startDate) {
  const doc  = DocumentApp.openById(fileId);
  const body = doc.getBody();
  body.replaceText('\\{\\{FIRST_NAME\\}\\}', first);
  body.replaceText('\\{\\{LAST_NAME\\}\\}',  last);
  body.replaceText('\\{\\{DATE\\}\\}', startDate ? formatDate_(new Date(startDate)) : '{{DATE}} — please fill in');
  doc.saveAndClose();
}



// ─────────────────────────────────────────────────────────────
// OFFBOARDING — scheduling (on End Date entry) + execution (daily)
// ─────────────────────────────────────────────────────────────
function scheduleOffboarding(sheet, headerMap, row, endDate) {
  const first = getByField_(sheet, headerMap, row, 'FIRST_NAME');
  const last  = getByField_(sheet, headerMap, row, 'LAST_NAME');
  if (!first || !last) return;

  const key      = employeeKey_(first, last);
  const props    = PropertiesService.getScriptProperties();
  const existing = JSON.parse(props.getProperty(PROP_OFFBOARD_PREFIX + key) || 'null');

  props.setProperty(PROP_OFFBOARD_PREFIX + key, JSON.stringify({
    first, last,
    endDate     : Utilities.formatDate(endDate, CFG.TIMEZONE, 'yyyy-MM-dd'),
    executed    : existing ? existing.executed    : false,
    followUpSent: existing ? existing.followUpSent : false,
    scheduledOn : existing ? existing.scheduledOn  : new Date().toISOString(),
  }));

  Logger.log(`Offboarding scheduled for ${first} ${last} on ${Utilities.formatDate(endDate, CFG.TIMEZONE, 'yyyy-MM-dd')}.`);
}

function dailyHRTasks() {
  const props = PropertiesService.getScriptProperties();
  const all   = props.getProperties();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  Object.keys(all).forEach(key => {
    if (!key.startsWith(PROP_OFFBOARD_PREFIX)) return;
    let entry;
    try { entry = JSON.parse(all[key]); } catch (e) { return; }

    const endDate = new Date(entry.endDate + 'T00:00:00');

    if (!entry.executed && endDate <= today) {
      const ok = executeOffboarding_(entry);
      if (ok) {
        entry.executed   = true;
        entry.executedOn = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
        props.setProperty(key, JSON.stringify(entry));
      }
    } else if (entry.executed && !entry.followUpSent) {
      const dueDate = addBusinessDays_(new Date(entry.executedOn), CFG.FOLLOW_UP_BUSINESS_DAYS);
      if (dueDate <= today) {
        sendFollowUpReminder_(entry);
        entry.followUpSent = true;
        props.setProperty(key, JSON.stringify(entry));
      }
    } else if (entry.followUpSent) {
      props.deleteProperty(key);
    }
  });

  cleanupScheduledDocDeletions_();
  checkMissingOnboardingDocs_();
  validateFormResponseProcessing_();
  processDocusealEmails_();
  checkEmployeeContacts_();
  checkUpcomingBirthdays_();
}

function executeOffboarding_(entry) {
  try {
    const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
    const sheet     = ss.getSheetByName(CFG.TAB_CURRENT);
    const headerMap = getHeaderMap_(sheet);
    const row       = findEmployeeRow_(sheet, headerMap, entry.first, entry.last);

    if (!row) {
      Logger.log(`executeOffboarding_: row not found for ${entry.first} ${entry.last} — skipping.`);
      return false;
    }

    const endDateFormatted = formatDate_(new Date(entry.endDate + 'T00:00:00'));
    const folderPropKey    = PROP_FOLDER_PREFIX + employeeKey_(entry.first, entry.last);
    const employeeFolderId = PropertiesService.getScriptProperties().getProperty(folderPropKey);

    // Termination letter goes into the employee's own folder (moves to Former Employees with it)
    const termDest = employeeFolderId
      ? DriveApp.getFolderById(employeeFolderId)
      : DriveApp.getFolderById(CFG.FORMER_DOCS_FOLDER_ID);  // fallback if no folder on record
    const newFile = DriveApp.getFileById(CFG.TERM_LETTER_TEMPLATE_ID)
      .makeCopy(`Termination Letter_${entry.last}`, termDest);
    const doc  = DocumentApp.openById(newFile.getId());
    const body = doc.getBody();
    body.replaceText('\\{\\{MONTH, DAY, YEAR\\}\\}', endDateFormatted);
    body.replaceText('\\{\\{FIRST_NAME\\}\\}',        entry.first);
    body.replaceText('\\{\\{LAST_NAME\\}\\}',         entry.last);
    doc.saveAndClose();

    MailApp.sendEmail({
      to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
      subject: `Employee Off-Boarding — ${entry.first} ${entry.last}`,
      body: `${entry.first} ${entry.last}'s employment ends ${endDateFormatted}.\n\n` +
        `Termination letter: ${newFile.getUrl()}\n\n` +
        `Please ensure Pathway processes their final paycheck within 3 business days, ` +
        `and confirm Tabatha Wilson (Trucordia) has been notified to remove them from insurance.\n\n` +
        `HIGH IMPORTANCE — Complete the offboarding checklist for ${entry.first} ${entry.last} based on their role. ` +
        `This checklist covers highly sensitive account access and information:\n` +
        `${CFG.OFFBOARDING_CHECKLIST_URL}`,
    });

    GmailApp.createDraft(CFG.INSURANCE_EMAIL, `Employee Off-Boarded — ${entry.first} ${entry.last}`,
      `Tabatha,\n\n${entry.first} ${entry.last} has been off-boarded effective ${endDateFormatted}.\n\n` +
      `Please remove them from our insurance policy accordingly.\n\nThank you!`,
      { cc: CFG.MAIL_CC });

    removeContactSafely_(getByField_(sheet, headerMap, row, 'PERSONAL_EMAIL'));

    // Move the employee's Drive folder into the Former Employees personnel folder
    if (employeeFolderId) {
      try {
        DriveApp.getFolderById(employeeFolderId)
          .moveTo(DriveApp.getFolderById(CFG.FORMER_PERSONNEL_FOLDER_ID));
        PropertiesService.getScriptProperties().deleteProperty(folderPropKey);
        PropertiesService.getScriptProperties().deleteProperty('REMINDER_DOCS_' + employeeKey_(entry.first, entry.last));
      } catch (folderErr) {
        Logger.log('Could not move employee folder: ' + folderErr.message);
      }
    }

    moveToFormerEmployees_(sheet, headerMap, row, ss.getSheetByName(CFG.TAB_FORMER));
    sheet.deleteRow(row);

    Logger.log(`Offboarding executed for ${entry.first} ${entry.last}.`);
    return true;
  } catch (err) {
    Logger.log('executeOffboarding_ error: ' + err.message);
    MailApp.sendEmail(CFG.INFO_EMAIL,
      `AKWL HR script error offboarding ${entry.first} ${entry.last}`,
      err.message + '\n' + err.stack);
    return false;
  }
}

/**
 * Appends one row to the Former Employees sheet using its fixed 9-column format:
 *   Col 1: #  (sequential number = last row in the sheet before append)
 *   Col 2: First Name
 *   Col 3: Last Name
 *   Col 4: Position/Role
 *   Col 5: Date of Hire
 *   Col 6: End Date
 *   Col 7: Phone
 *   Col 8: Personal Email
 *   Col 9: Notes
 * This preserves the existing sheet layout rather than trying to mirror
 * Current Employees headers (which have 20 columns and a different structure).
 */
function moveToFormerEmployees_(sourceSheet, sourceHeaderMap, sourceRow, formerSheet) {
  const get = (fieldKey) => getByField_(sourceSheet, sourceHeaderMap, sourceRow, fieldKey);
  const nextRow = Math.max(formerSheet.getLastRow() + 1, 2);  // row 1 is the header
  const rowNum  = nextRow - 1;  // sequential # starting at 1

  const values = [
    rowNum,
    get('FIRST_NAME')     || '',
    get('LAST_NAME')      || '',
    get('POSITION')       || '',
    get('DATE_OF_HIRE')   || '',
    get('END_DATE')       || '',
    get('PHONE')          || '',
    get('PERSONAL_EMAIL') || '',
    get('NOTES')          || '',
  ];

  formerSheet.getRange(nextRow, 1, 1, values.length).setValues([values]);
  return nextRow;
}

/**
 * Runs daily. After 7 days from Date of Hire, checks each active employee
 * for missing onboarding items. Sends one reminder (never repeats) tracked
 * via Script Property REMINDER_DOCS_<key>.
 * - If employee email is on file → email goes directly to them (CC info@)
 * - If no email → email goes to info@ so HR can follow up manually
 */
function checkMissingOnboardingDocs_() {
  const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const sheet     = ss.getSheetByName(CFG.TAB_CURRENT);
  const headerMap = getHeaderMap_(sheet);
  const props     = PropertiesService.getScriptProperties();
  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  const lastRow = sheet.getLastRow();
  if (lastRow < CFG.DATA_START_ROW) return;

  for (let row = CFG.DATA_START_ROW; row <= lastRow; row++) {
    const first      = getByField_(sheet, headerMap, row, 'FIRST_NAME');
    const last       = getByField_(sheet, headerMap, row, 'LAST_NAME');
    const dateOfHire = getByField_(sheet, headerMap, row, 'DATE_OF_HIRE');
    if (!first || !last || !dateOfHire) continue;

    const hireDate = new Date(dateOfHire);
    hireDate.setHours(0, 0, 0, 0);
    if ((today - hireDate) / 86400000 < 7) continue;  // less than 7 days — too early

    const propKey = 'REMINDER_DOCS_' + employeeKey_(first, last);
    if (props.getProperty(propKey)) continue;  // reminder already sent

    const missing = [];
    if (!getByField_(sheet, headerMap, row, 'CONTRACT_DOCUSEAL')) missing.push('Offer Letter (Docuseal signature)');
    if (!getByField_(sheet, headerMap, row, 'DRIVERS_LICENSE'))   missing.push("Driver's License");
    if (!getByField_(sheet, headerMap, row, 'DRIVING_HISTORY'))   missing.push('Driving Record');
    if (!getByField_(sheet, headerMap, row, 'PHOTO_BIO'))         missing.push('Profile Photo');
    if (!missing.length) continue;  // nothing missing — skip

    const employeeEmail = getByField_(sheet, headerMap, row, 'PERSONAL_EMAIL');
    const bulletList    = missing.map(m => `  • ${m}`).join('\n');

    if (isValidEmail_(employeeEmail)) {
      MailApp.sendEmail({
        to      : employeeEmail,
        cc      : CFG.INFO_EMAIL,
        subject : 'Action Required: Complete Your Onboarding — Alaska Wild Lights',
        body    :
          `Hi ${first},\n\n` +
          `We noticed a few items are still pending in your onboarding. ` +
          `Please complete the following as soon as possible:\n\n` +
          `${bulletList}\n\n` +
          `You can submit these through your onboarding form or upload directly ` +
          `to your onboarding folder. If you have any questions, don't hesitate to reach out.\n\n` +
          `Best,\nAlaska Wild Lights`,
      });
    } else {
      MailApp.sendEmail({
        to      : CFG.INFO_EMAIL,
        subject : `Reminder: Missing onboarding docs — ${first} ${last}`,
        body    :
          `${first} ${last} is missing the following onboarding items ` +
          `(7 days since Date of Hire):\n\n` +
          `${bulletList}\n\n` +
          `No email on file — please follow up with them directly.`,
      });
    }

    props.setProperty(propKey, new Date().toISOString());
    Logger.log(`Onboarding reminder sent for ${first} ${last}. Missing: ${missing.join(', ')}`);
  }
}

/**
 * Runs every 3 days to validate that all Form Responses rows have been processed
 * and files moved to employee onboarding folders. Reprocesses any missed rows.
 */
function validateFormResponseProcessing_() {
  const props = PropertiesService.getScriptProperties();
  const lastCheckKey = 'LAST_FORM_VALIDATE_CHECK';
  const lastCheck = props.getProperty(lastCheckKey);
  const now = new Date();

  // Only run every 3 days
  if (lastCheck) {
    const lastCheckDate = new Date(lastCheck);
    const daysSinceCheck = (now - lastCheckDate) / (1000 * 60 * 60 * 24);
    if (daysSinceCheck < 3) return;
  }

  // Update last check timestamp
  props.setProperty(lastCheckKey, now.toISOString());

  try {
    const ss = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
    const formSheet = ss.getSheetByName(CFG.TAB_FORM_RESPONSES);
    const lastRow = formSheet.getLastRow();

    if (lastRow < 2) return;  // Only header row or empty

    const unprocessedRows = [];

    for (let row = 2; row <= lastRow; row++) {
      const rowKey = PROP_FORM_ROW_PREFIX + row;
      if (!props.getProperty(rowKey)) {
        // This row was never processed — reprocess it now
        unprocessedRows.push(row);
        try {
          handleFormResponseRow_(formSheet, row);
        } catch (err) {
          Logger.log(`validateFormResponseProcessing_: Failed to reprocess row ${row}: ${err.message}`);
        }
      }
    }

    if (unprocessedRows.length > 0) {
      MailApp.sendEmail({
        to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
        subject: `Form Response Validation: Found and reprocessed ${unprocessedRows.length} missed row(s)`,
        body: `The following Form Responses rows were unprocessed and have been reprocessed:\n\n` +
          `Rows: ${unprocessedRows.join(', ')}\n\n` +
          `Employee data has been synced to Current Employees and files moved to their ` +
          `onboarding folders (if present). Please verify the data looks correct.`,
      });
      Logger.log(`validateFormResponseProcessing_: Reprocessed ${unprocessedRows.length} rows: ${unprocessedRows.join(', ')}`);
    }
  } catch (err) {
    Logger.log('validateFormResponseProcessing_: ' + err.message);
    MailApp.sendEmail(CFG.INFO_EMAIL, 'AKWL HR script error (validateFormResponseProcessing_)',
      err.message + '\n' + err.stack);
  }
}

function sendFollowUpReminder_(entry) {
  MailApp.sendEmail({
    to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
    subject: `Action Required: Final Off-Boarding Steps — ${entry.first} ${entry.last}`,
    body: `This is the ${CFG.FOLLOW_UP_BUSINESS_DAYS}-business-day follow-up for ` +
      `${entry.first} ${entry.last} (terminated ${formatDate_(new Date(entry.endDate + 'T00:00:00'))}).\n\nPlease:\n` +
      `1. Deactivate/remove them from QuickBooks.\n\n` +
      `Note: their Drive folder has already been moved to the Former Employees folder automatically.\n\n` +
      `Please confirm once complete.`,
  });
}



// ─────────────────────────────────────────────────────────────
// GOOGLE CONTACTS  (replaces "0040")
// ─────────────────────────────────────────────────────────────
function addContactSafely_(first, last, email, phone, role, dob, company) {
  if (!isValidEmail_(email)) return;
  try {
    if (getContactResourceName_(email)) return;
    const body = {
      names         : [{ givenName: first, familyName: last, displayName: `${first} ${last}` }],
      emailAddresses: [{ value: email, type: 'work' }],
    };
    if (phone) body.phoneNumbers = [{ value: phone, type: 'mobile' }];
    if (company || role) body.organizations = [{ name: company || '', title: role || '', type: 'work', current: true }];
    if (dob) {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) body.birthdays = [{ date: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() } }];
    }
    const contact = People.People.createContact(body);
    addToTeamGroup_(contact.resourceName);
    Logger.log(`Contact added: ${first} ${last} <${email}>`);
  } catch (err) {
    Logger.log('addContactSafely_ error: ' + err.message);
  }
}

function removeContactSafely_(email) {
  if (!isValidEmail_(email)) return;
  try {
    const resourceName = getContactResourceName_(email);
    if (!resourceName) return;
    People.People.deleteContact(resourceName);
    Logger.log(`Contact removed: ${email}`);
  } catch (err) {
    Logger.log('removeContactSafely_ error: ' + err.message);
  }
}

function getContactResourceName_(email) {
  let pageToken = null;
  do {
    const params = { personFields: 'emailAddresses', pageSize: 1000 };
    if (pageToken) params.pageToken = pageToken;
    const response = People.People.Connections.list('people/me', params);
    for (const person of (response.connections || [])) {
      for (const ea of (person.emailAddresses || [])) {
        if (ea.value && ea.value.toLowerCase() === String(email).toLowerCase()) return person.resourceName;
      }
    }
    pageToken = response.nextPageToken;
  } while (pageToken);
  return null;
}

function addToTeamGroup_(personResourceName) {
  const groups = People.ContactGroups.list().contactGroups || [];
  const existing = groups.find(g => g.name === CFG.CONTACT_GROUP_NAME);
  const groupResourceName = existing
    ? existing.resourceName
    : People.ContactGroups.create({ contactGroup: { name: CFG.CONTACT_GROUP_NAME } }).resourceName;

  UrlFetchApp.fetch(`https://people.googleapis.com/v1/${groupResourceName}/members:modify`, {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ resourceNamesToAdd: [personResourceName] }),
    muteHttpExceptions: true,
  });
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}


// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────
function findEmployeeRow_(sheet, headerMap, first, last) {
  const firstCol = col_(headerMap, 'FIRST_NAME');
  const lastCol  = col_(headerMap, 'LAST_NAME');
  if (!firstCol || !lastCol) return null;

  const lastRow = sheet.getLastRow();
  if (lastRow < CFG.DATA_START_ROW) return null;
  const data = sheet.getRange(CFG.DATA_START_ROW, 1, lastRow - CFG.DATA_START_ROW + 1, Math.max(firstCol, lastCol)).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][firstCol - 1]).trim().toLowerCase() === String(first).trim().toLowerCase() &&
        String(data[i][lastCol  - 1]).trim().toLowerCase() === String(last).trim().toLowerCase()) {
      return CFG.DATA_START_ROW + i;
    }
  }
  return null;
}

function employeeKey_(first, last) {
  return (first + '_' + last).replace(/\s+/g, '_').toLowerCase();
}

function formatDate_(date) {
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
}

function addBusinessDays_(startDate, days) {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function scheduleDocDeletion_(fileId, daysFromNow) {
  const deleteOn = new Date();
  deleteOn.setDate(deleteOn.getDate() + daysFromNow);
  PropertiesService.getScriptProperties().setProperty('DELETE_DOC_' + fileId, deleteOn.toISOString());
}

function scheduleDocDeletionOn_(fileId, date) {
  PropertiesService.getScriptProperties().setProperty('DELETE_DOC_' + fileId, new Date(date).toISOString());
}

function cleanupScheduledDocDeletions_() {
  const props = PropertiesService.getScriptProperties();
  const lastCheckKey = 'CLEANUP_DOCS_LAST_CHECK';
  const lastCheck = props.getProperty(lastCheckKey);
  const now = new Date();
  if (lastCheck && (now - new Date(lastCheck)) / (1000 * 60 * 60 * 24) < 3) return;
  props.setProperty(lastCheckKey, now.toISOString());

  const all = props.getProperties();
  Object.keys(all).forEach(key => {
    if (!key.startsWith('DELETE_DOC_')) return;
    if (new Date(all[key]) <= now) {
      try { DriveApp.getFileById(key.replace('DELETE_DOC_', '')).setTrashed(true); } catch (e) { /* already gone */ }
      props.deleteProperty(key);
    }
  });
}


/**
 * Moves a file (identified by its Google Drive share URL) into the
 * employee's onboarding folder and renames it.
 * Google Forms file-upload answers arrive as Drive share URLs, e.g.:
 *   https://drive.google.com/open?id=1abc...
 *   https://drive.google.com/file/d/1abc.../view?usp=drivesdk
 */
function moveFileToEmployeeFolder_(driveUrl, destFolderId, newName) {
  try {
    const m = driveUrl.match(/(?:\/d\/|[?&]id=)([\w-]{20,})/);
    if (!m) { Logger.log('moveFileToEmployeeFolder_: could not parse file ID from ' + driveUrl); return; }
    const file = DriveApp.getFileById(m[1]);
    file.moveTo(DriveApp.getFolderById(destFolderId));
    if (newName) file.setName(newName);
    Logger.log(`Moved "${newName}" to employee folder.`);
  } catch (err) {
    Logger.log('moveFileToEmployeeFolder_ error: ' + err.message);
  }
}


// ─────────────────────────────────────────────────────────────
// DOCUSEAL — save signed PDFs to onboarding folder
// ─────────────────────────────────────────────────────────────

/**
 * Runs daily. Scans last 60 days of DocuSeal emails from info@docuseal.com,
 * saves signed PDFs to the matching employee's onboarding folder.
 *
 * Tracking: stores DOCUSEAL_MSG_<messageId> in Script Properties so already-
 * processed emails are skipped regardless of read/unread state.
 *
 * Name formats handled (both end with _AKWL Offer Letter.pdf):
 *   "Last, First_AKWL Offer Letter.pdf"  → parses first + last directly
 *   "Last_AKWL Offer Letter.pdf"         → looks up first name from sheet
 */
function processDocusealEmails_() {
  const props = PropertiesService.getScriptProperties();
  const lastCheckKey = 'DOCUSEAL_LAST_CHECK';
  const lastCheck = props.getProperty(lastCheckKey);
  const now = new Date();
  if (lastCheck && (now - new Date(lastCheck)) / (1000 * 60 * 60 * 24) < 15) return;
  props.setProperty(lastCheckKey, now.toISOString());

  const threads = GmailApp.search('from:info@docuseal.com newer_than:60d', 0, 50);
  if (!threads.length) return;

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      const msgKey = 'DOCUSEAL_MSG_' + msg.getId();
      if (props.getProperty(msgKey)) return;  // already processed

      const pdfs = msg.getAttachments().filter(a => a.getContentType() === 'application/pdf');
      if (!pdfs.length) { props.setProperty(msgKey, new Date().toISOString()); return; }

      const mainPdf = pdfs.find(a => !a.getName().startsWith('Audit Log'));
      if (!mainPdf) { props.setProperty(msgKey, new Date().toISOString()); return; }

      const nameMatch = mainPdf.getName().replace(/\.pdf$/i, '').match(/^(.+?)_/);
      if (!nameMatch) {
        MailApp.sendEmail({ to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
          subject: 'DocuSeal: could not parse name from attachment',
          body: `File: ${mainPdf.getName()}\nSubject: ${msg.getSubject()}` });
        props.setProperty(msgKey, new Date().toISOString());
        return;
      }

      const namePart = nameMatch[1].trim();
      let first, last;

      if (namePart.includes(',')) {
        // "Last, First" format
        const parts = namePart.split(/,\s*/);
        last  = parts[0].trim();
        first = parts[1].trim();
      } else {
        // Last name only — look up first name from Current Employees
        last  = namePart;
        first = findFirstNameByLast_(last);
        if (!first) {
          MailApp.sendEmail({ to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
            subject: `DocuSeal: could not find employee with last name "${last}"`,
            body: `File: ${mainPdf.getName()}\nSubject: ${msg.getSubject()}\n\nPlease save the attachments manually.` });
          props.setProperty(msgKey, new Date().toISOString());
          return;
        }
      }

      const folderId = props.getProperty(PROP_FOLDER_PREFIX + employeeKey_(first, last));
      if (!folderId) {
        MailApp.sendEmail({ to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
          subject: `DocuSeal: no onboarding folder found for ${first} ${last}`,
          body: `Received signed offer letter but no Drive folder is on record.\n` +
            `Please save the attachments manually.\nSubject: ${msg.getSubject()}` });
        props.setProperty(msgKey, new Date().toISOString());
        return;
      }

      const folder = DriveApp.getFolderById(folderId);
      pdfs.forEach(pdf => {
        folder.createFile(pdf);
        Logger.log(`DocuSeal: saved "${pdf.getName()}" to ${first} ${last}'s folder`);
      });

      props.setProperty(msgKey, new Date().toISOString());
    });
  });
}

/** Finds the first name of an employee by last name in Current Employees. */
function findFirstNameByLast_(last) {
  const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const sheet     = ss.getSheetByName(CFG.TAB_CURRENT);
  const headerMap = getHeaderMap_(sheet);
  const lastRow   = sheet.getLastRow();
  if (lastRow < CFG.DATA_START_ROW) return null;

  for (let row = CFG.DATA_START_ROW; row <= lastRow; row++) {
    const rowLast = String(getByField_(sheet, headerMap, row, 'LAST_NAME') || '').trim();
    if (rowLast.toLowerCase() === last.toLowerCase()) {
      return String(getByField_(sheet, headerMap, row, 'FIRST_NAME') || '').trim() || null;
    }
  }
  return null;
}


// ─────────────────────────────────────────────────────────────
// CONTACTS HEALTH CHECK + BIRTHDAY REMINDERS
// ─────────────────────────────────────────────────────────────

/**
 * Runs every 45 days. Scans Current Employees and adds anyone with a personal
 * email who is not yet in Google Contacts, including phone if available.
 * Covers employees added manually (not via form) who were never picked up
 * by processFormResponseRow_.
 */
function checkEmployeeContacts_() {
  const props = PropertiesService.getScriptProperties();
  const lastCheckKey = 'CONTACTS_LAST_CHECK';
  const lastCheck = props.getProperty(lastCheckKey);
  const now = new Date();

  if (lastCheck && (now - new Date(lastCheck)) / (1000 * 60 * 60 * 24) < 45) return;
  props.setProperty(lastCheckKey, now.toISOString());

  const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const sheet     = ss.getSheetByName(CFG.TAB_CURRENT);
  const headerMap = getHeaderMap_(sheet);
  const lastRow   = sheet.getLastRow();
  if (lastRow < CFG.DATA_START_ROW) return;

  let added = 0;
  for (let row = CFG.DATA_START_ROW; row <= lastRow; row++) {
    const first = String(getByField_(sheet, headerMap, row, 'FIRST_NAME')     || '').trim();
    const last  = String(getByField_(sheet, headerMap, row, 'LAST_NAME')      || '').trim();
    const email = String(getByField_(sheet, headerMap, row, 'PERSONAL_EMAIL') || '').trim();
    const phone = String(getByField_(sheet, headerMap, row, 'PHONE')          || '').trim();
    const role  = String(getByField_(sheet, headerMap, row, 'POSITION')       || '').trim();
    const dob   = getByField_(sheet, headerMap, row, 'DOB');
    if (!first || !last || !isValidEmail_(email)) continue;
    if (!getContactResourceName_(email)) {
      addContactSafely_(first, last, email, phone || undefined, role || undefined, dob || undefined, CFG.COMPANY_NAME);
      added++;
    }
  }

  if (added > 0) Logger.log(`checkEmployeeContacts_: added ${added} missing contact(s).`);
}

/**
 * Runs daily. Sends a reminder to info@ when an active employee's birthday
 * is exactly 3 days away. Uses BDAY_SENT_<key> in Script Properties to send
 * only once per calendar year per employee.
 */
function checkUpcomingBirthdays_() {
  const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const sheet     = ss.getSheetByName(CFG.TAB_CURRENT);
  const headerMap = getHeaderMap_(sheet);
  const lastRow   = sheet.getLastRow();
  if (lastRow < CFG.DATA_START_ROW) return;

  const props  = PropertiesService.getScriptProperties();
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const DAYS_AHEAD = 3;

  for (let row = CFG.DATA_START_ROW; row <= lastRow; row++) {
    const first = String(getByField_(sheet, headerMap, row, 'FIRST_NAME') || '').trim();
    const last  = String(getByField_(sheet, headerMap, row, 'LAST_NAME')  || '').trim();
    const dob   = getByField_(sheet, headerMap, row, 'DOB');
    if (!first || !last || !dob) continue;

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) continue;

    // This year's birthday; if already passed, check next year
    const birthday = new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate());
    if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);

    const daysUntil = Math.round((birthday - today) / 86400000);
    if (daysUntil !== DAYS_AHEAD) continue;

    const propKey   = 'BDAY_SENT_' + employeeKey_(first, last);
    const lastYear  = props.getProperty(propKey);
    if (lastYear === String(birthday.getFullYear())) continue;  // already sent this year

    MailApp.sendEmail({
      to: CFG.MAIL_TO, cc: CFG.MAIL_CC,
      subject: `Birthday in 3 days: ${first} ${last}`,
      body: `${first} ${last}'s birthday is on ${formatDate_(birthday)}.\n\nConsider sending a birthday message!`,
    });

    props.setProperty(propKey, String(birthday.getFullYear()));
    Logger.log(`Birthday reminder sent for ${first} ${last} (${formatDate_(birthday)})`);
  }
}


// ─────────────────────────────────────────────────────────────
// DEBUG / MANUAL TEST HELPERS
// Run these from the Apps Script editor to verify setup.
// ─────────────────────────────────────────────────────────────

/**
 * ONE-TIME SETUP — Run this ONCE before installing triggers for the first time.
 *
 * Marks all existing employees and all existing Form Responses rows as already
 * processed so the script never re-runs onboarding on them.
 *
 * What it does:
 *   1. For every employee in Current Employees who has a Date of Hire → sets
 *      FOLDER_<key> = 'LEGACY' so runOnboarding skips them permanently.
 *      (If an employee already has a real folder ID in Script Properties from a
 *      previous script version, this does NOT overwrite it.)
 *   2. For every row in Form Responses (row 2+) → sets FORM_ROW_<n> = timestamp
 *      so validateFormResponseProcessing_ never retries those old submissions.
 *
 * Safe to re-run: it never overwrites an existing property value.
 */
function markExistingEmployeesAsOnboarded() {
  const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const empSheet  = ss.getSheetByName(CFG.TAB_CURRENT);
  const headerMap = getHeaderMap_(empSheet);
  const props     = PropertiesService.getScriptProperties();
  const now       = new Date().toISOString();

  // ── 1. Mark existing employees ───────────────────────────────
  const lastEmpRow = empSheet.getLastRow();
  let markedEmp = 0;
  for (let row = CFG.DATA_START_ROW; row <= lastEmpRow; row++) {
    const first      = String(getByField_(empSheet, headerMap, row, 'FIRST_NAME')  || '').trim();
    const last       = String(getByField_(empSheet, headerMap, row, 'LAST_NAME')   || '').trim();
    const dateOfHire = getByField_(empSheet, headerMap, row, 'DATE_OF_HIRE');
    if (!first || !last || !dateOfHire) continue;

    const empKey       = employeeKey_(first, last);
    const onboardedKey = PROP_ONBOARDED_PREFIX + empKey;
    if (!props.getProperty(onboardedKey)) {
      props.setProperty(onboardedKey, 'LEGACY');
      markedEmp++;
      Logger.log(`  Marked as legacy: ${first} ${last}`);
    } else {
      Logger.log(`  Already marked: ${first} ${last} — skipped.`);
    }

    // Try to locate and register their existing Drive folder so offboarding
    // puts the termination letter in the right place (not the generic fallback).
    const folderKey = PROP_FOLDER_PREFIX + empKey;
    if (!props.getProperty(folderKey)) {
      const position = String(getByField_(empSheet, headerMap, row, 'POSITION') || '').trim();
      const isGuide  = /guide/i.test(position);
      const parentId = isGuide
        ? CFG.GUIDES_PARENT_FOLDER_ID
        : /lead\s*mechanic|\bmechanic\b|detailer/i.test(position)
          ? CFG.MAINTENANCE_PARENT_FOLDER_ID
          : CFG.OFFICE_PARENT_FOLDER_ID;
      const expectedName = isGuide
        ? `${last}, ${first}`
        : `${last}, ${first} (${position})`;
      try {
        const iter = DriveApp.getFolderById(parentId).getFoldersByName(expectedName);
        if (iter.hasNext()) {
          props.setProperty(folderKey, iter.next().getId());
          Logger.log(`    Folder found and registered: "${expectedName}"`);
        } else {
          Logger.log(`    ⚠️  No folder found for "${expectedName}" — set FOLDER_${empKey} manually in Script Properties if needed.`);
        }
      } catch (e) {
        Logger.log(`    Could not search folder for ${first} ${last}: ${e.message}`);
      }
    }
  }

  // ── 2. Mark existing Form Responses rows ────────────────────
  const formSheet  = ss.getSheetByName(CFG.TAB_FORM_RESPONSES);
  const lastFormRow = formSheet ? formSheet.getLastRow() : 0;
  let markedForm = 0;
  for (let row = 2; row <= lastFormRow; row++) {
    const rowKey = PROP_FORM_ROW_PREFIX + row;
    if (!props.getProperty(rowKey)) {
      props.setProperty(rowKey, now);
      markedForm++;
    }
  }

  Logger.log(`markExistingEmployeesAsOnboarded complete: ${markedEmp} employee(s) marked as legacy, ${markedForm} form row(s) marked as processed.`);
  Logger.log('You can now safely run installTriggers().');
}

/** Logs the detected header map for "current employees". Run this first to verify column detection. */
function testShowHeaderMap() {
  const sheet = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID).getSheetByName(CFG.TAB_CURRENT);
  Logger.log(JSON.stringify(getHeaderMap_(sheet), null, 2));
}

/** Logs all active scheduled offboarding entries. */
function testDebugProperties() {
  Logger.log(JSON.stringify(PropertiesService.getScriptProperties().getProperties(), null, 2));
}

/**
 * Simulates processing a specific row from Form Responses.
 * Change ROW_NUMBER to the actual row you want to re-process.
 * Make sure to delete the FORM_ROW_<n> Script Property first
 * (Project Settings → Script Properties) otherwise it will skip.
 */
function testProcessFormRow() {
  const ROW_NUMBER = 2;  // change to the row you want to process
  const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const formSheet = ss.getSheetByName(CFG.TAB_FORM_RESPONSES);
  if (!formSheet) { Logger.log('Form Responses tab not found.'); return; }
  processFormResponseRow_(formSheet, ROW_NUMBER);
}
