/**
 * ============================================================
 * AKWL HR — ONBOARDING & OFFBOARDING (UNIFIED)  v3.6
 * ------------------------------------------------------------
 * Replaces and retires:
 *   - "0039. Employee Information Sheet"
 *   - "0042. Off-Boarding"
 *   - "049. HR Onboarding & Offboarding Automation" (v3)
 *   - "0040. Google Contacts Update"
 *
 * DESIGN DECISIONS (confirmed with business owner, July 2026):
 *   - Onboarding trigger: "Date of Hire" filled in manually by HR.
 *     Set at the moment you decide to hire -- folder/paperwork
 *     exist before day one. Start Date can slip; Date of Hire
 *     doesn't.
 *   - Offboarding trigger: "End Date" filled in -- scheduled
 *     immediately but only executed (letter, email, move row) on
 *     or after the actual end date.
 *   - The Onboarding Form is filled by the NEW HIRE (not HR).
 *     It has no Position/Date of Hire question, so submissions
 *     UPDATE the matching existing row (matched by first + last
 *     name). They never create a new row.
 *   - Unknown employee on form submit: email HR, skip.
 *   - Mailing Address, City, State, Emergency Contact Phone
 *     are NOT stored in "current employees". They remain in
 *     "Form Responses 2" (the form's own response tab). If you
 *     later decide to add those columns to the sheet, add the
 *     column headers and re-add the FIELD entries and
 *     setIfPresent calls in onEmployeeFormSubmit.
 *
 * WHY v1 BROKE (and what v3 fixes):
 *   v1 used hardcoded column numbers (COL.DATE_OF_HIRE = 4, etc).
 *   The sheet was redesigned multiple times -- columns reordered,
 *   banner rows added, "Onboarding Status" column removed. Every
 *   old script broke silently. v3 looks up each column BY ITS
 *   HEADER TEXT every single run (see getHeaderMap_). Reorder,
 *   insert, or delete columns and this script keeps working --
 *   only the header TEXT needs to stay the same (or update the
 *   FIELD map below).
 *
 * ONE-TIME SETUP (do in order):
 *   1. Go to script.google.com -> New project. Paste this file.
 *   2. Services (+) -> add "Google People API".
 *   3. Run `installTriggers` manually. Authorize when asked.
 *   4. On the OLD scripts (0039, 0042, 049, 0040): open each ->
 *      Triggers panel (clock icon) -> delete every trigger ->
 *      archive those projects. Otherwise you get duplicate emails
 *      and duplicate folders.
 *
 * FILL IN BEFORE STEP 4 (search "TODO" below):
 *   - Office-staff onboarding template IDs (offer letter,
 *     checklist, company property acknowledgement). Until filled
 *     in, a non-guide hire emails HR to build manually instead
 *     of using the wrong (guide) templates.
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const CFG = {
  EMPLOYEE_SHEET_ID : '1lhB25hdKfARc6nGjbN9AwYGHQ_bsLRdGkeCuQA7Ow9w',
  TAB_CURRENT        : 'Current Employees',   // exact case -- getSheetByName is case-sensitive
  TAB_FORMER         : 'Former Employees',    // exact case -- getSheetByName is case-sensitive
  TAB_FORM_RESPONSES : 'Form Responses',      // exact case -- the tab linked to the Onboarding Form

  GUIDES_PARENT_FOLDER_ID        : '1Ya0e276RRvVasEcOBchsqAW3cEVNMo1w',
  GUIDE_OFFER_LETTER_TEMPLATE_ID : '1W1MAQhVm4nXu9RUrGS8UocD_Lf3UlsWjGwAra4d80XI',
  GUIDE_CHECKLIST_TEMPLATE_ID    : '1Tr9jDUBoocBKGM2IvJoYwZDMVk2wyH_WHnkN-qnp_kA',

  // TODO: office-staff onboarding documents -- fill these in once you have them.
  OFFICE_PARENT_FOLDER_ID        : '',
  OFFICE_OFFER_LETTER_TEMPLATE_ID: '',
  OFFICE_CHECKLIST_TEMPLATE_ID   : '',
  COMPANY_PROPERTY_TEMPLATE_ID   : '',

  TERM_LETTER_TEMPLATE_ID : '1dS4FAsCporrVLiYXJZvP2g8sPTuKV9wJuOex5ulN0Bc',
  FORMER_DOCS_FOLDER_ID   : '14A65GrTTV737kDOwEKd2IFk457CjzhpC',

  HR_CHECKLIST_URL : 'https://docs.google.com/document/d/1gtcQ0adsPUIUZhDcA48cZhYCCaxeNL5XMSsSnYAD-d0/edit?tab=t.0',

  INFO_EMAIL      : 'info@alaskawildlights.com',
  JOSH_EMAIL      : 'joshuamcneal@alaskawildlights.com',
  INSURANCE_EMAIL : 'Tabatha.Wilson@trucordia.com',

  CONTACT_GROUP_NAME : 'AKWL Team',

  FOLLOW_UP_BUSINESS_DAYS : 9,
  STALE_SCHEDULE_MAX_DAYS : 30,

  TIMEZONE : 'America/Anchorage',

  HEADER_ROWS    : [2, 3],  // rows where header text can live (group label row, field name row)
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

const PROP_OFFBOARD_PREFIX  = 'OFFBOARD_';
const PROP_FOLDER_PREFIX    = 'FOLDER_';    // stores employee folder ID: FOLDER_jane_doe → driveId
const PROP_FORM_ROW_PREFIX  = 'FORM_ROW_';  // tracks processed Form Responses rows: FORM_ROW_5 → ISO timestamp


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
    if (['onEmployeeSheetEdit', 'onEmployeeFormSubmit', 'dailyHRTasks'].includes(fn)) ScriptApp.deleteTrigger(t);
  });

  const ss = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  // One onEdit trigger covers both Current Employees (onboarding/offboarding)
  // AND Form Responses (new submission detection). No separate onFormSubmit needed.
  ScriptApp.newTrigger('onEmployeeSheetEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('dailyHRTasks').timeBased().everyDays(1).atHour(8).inTimezone(CFG.TIMEZONE).create();

  Logger.log('Triggers installed. Now delete the triggers on the OLD scripts (0039, 0042, 049, 0040).');
}


// ─────────────────────────────────────────────────────────────
// EDIT TRIGGER — onboarding (Date of Hire) + offboarding (End Date)
// ─────────────────────────────────────────────────────────────
function onEmployeeSheetEdit(e) {
  try {
    const sheet     = e.range.getSheet();
    const sheetName = sheet.getName();

    // ── Route: new form submission row ───────────────────────────
    if (sheetName === CFG.TAB_FORM_RESPONSES) {
      handleFormResponseRow_(sheet, e.range.getRow());
      return;
    }

    // ── Route: HR edits Current Employees ────────────────────────
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
  // Build a header map from row 1 of Form Responses (single-row headers)
  const lastCol     = formSheet.getLastColumn();
  const headerRow   = formSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const formHeaders = {};
  headerRow.forEach((val, i) => {
    const text = String(val || '').trim();
    if (text) formHeaders[text] = i + 1;
  });

  const getFormVal = (question) => {
    const col = formHeaders[question];
    if (!col) return '';
    const v = formSheet.getRange(row, col).getValue();
    return v ? String(v).trim() : '';
  };

  const first = getFormVal('First name');
  const last  = getFormVal('Last name');
  if (!first || !last) {
    Logger.log(`processFormResponseRow_: row ${row} has no name — skipping.`);
    return;
  }

  const ss         = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
  const empSheet   = ss.getSheetByName(CFG.TAB_CURRENT);
  const headerMap  = getHeaderMap_(empSheet);
  const empRow     = findEmployeeRow_(empSheet, headerMap, first, last);

  if (!empRow) {
    // Dump the full row so HR can copy it manually
    const rawData = {};
    headerRow.forEach((h, i) => { if (h) rawData[h] = formSheet.getRange(row, i + 1).getValue(); });
    MailApp.sendEmail(CFG.INFO_EMAIL, 'AKWL HR script: Form submitted for unknown employee',
      `${first} ${last} submitted the onboarding form (row ${row} in Form Responses), ` +
      `but no matching row was found in "${CFG.TAB_CURRENT}".\n\n` +
      `Add them manually (Position + Date of Hire), then either:\n` +
      `  a) Delete Script Property "FORM_ROW_${row}" and have them resubmit, or\n` +
      `  b) Copy their answers below by hand.\n\n` +
      `Form data:\n${JSON.stringify(rawData, null, 2)}`);
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
  set('PERSONAL_EMAIL',    'Personal Email');
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

  if (licenseUrl)    setByField_(empSheet, headerMap, empRow, 'DRIVERS_LICENSE', '✓');
  if (drivingRecUrl) setByField_(empSheet, headerMap, empRow, 'DRIVING_HISTORY',  '✓');
  if (profilePicUrl) setByField_(empSheet, headerMap, empRow, 'PHOTO_BIO',        '✓');

  if (/^yes/i.test(getFormVal('Just a quick reminder! Have you signed your Offer Letter via Docuseal yet?'))) {
    setByField_(empSheet, headerMap, empRow, 'CONTRACT_DOCUSEAL', '✓');
  }

  // ── Move uploaded files into the employee's onboarding folder ─
  const folderId = PropertiesService.getScriptProperties()
    .getProperty(PROP_FOLDER_PREFIX + employeeKey_(first, last));

  if (folderId) {
    if (profilePicUrl)  moveFileToEmployeeFolder_(profilePicUrl,  folderId, `Profile Picture_${last}`);
    if (licenseUrl)     moveFileToEmployeeFolder_(licenseUrl,     folderId, `Driver License_${last}`);
    if (drivingRecUrl)  moveFileToEmployeeFolder_(drivingRecUrl,  folderId, `Driving Record_${last}`);
  }

  Logger.log(`Form row ${row} applied to employee row ${empRow} (${first} ${last}).`);
}


// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────
function runOnboarding(sheet, headerMap, row) {
  const first    = getByField_(sheet, headerMap, row, 'FIRST_NAME');
  const last     = getByField_(sheet, headerMap, row, 'LAST_NAME');
  const position = String(getByField_(sheet, headerMap, row, 'POSITION') || '');
  const isGuide  = /guide/i.test(position);

  const parentFolderId    = isGuide ? CFG.GUIDES_PARENT_FOLDER_ID         : CFG.OFFICE_PARENT_FOLDER_ID;
  const offerTemplateId   = isGuide ? CFG.GUIDE_OFFER_LETTER_TEMPLATE_ID  : CFG.OFFICE_OFFER_LETTER_TEMPLATE_ID;
  const checklistId       = isGuide ? CFG.GUIDE_CHECKLIST_TEMPLATE_ID     : CFG.OFFICE_CHECKLIST_TEMPLATE_ID;

  if (!parentFolderId || !offerTemplateId || !checklistId) {
    MailApp.sendEmail(CFG.INFO_EMAIL, `Action needed: manual onboarding folder for ${first} ${last}`,
      `${first} ${last} (${position}) has a Date of Hire, but this is a non-guide role and ` +
      `the office-staff template IDs aren't configured in the script yet.\n\n` +
      `Please build their onboarding folder manually for now:\n${CFG.HR_CHECKLIST_URL}\n\n` +
      `Add the OFFICE_* template IDs to CFG and this step runs automatically next time.`);
    return;
  }

  const parentFolder  = DriveApp.getFolderById(parentFolderId);
  const personFolder  = parentFolder.createFolder(`${first} ${last}`);

  // Store folder ID so onEmployeeFormSubmit can move uploaded files here later
  PropertiesService.getScriptProperties()
    .setProperty(PROP_FOLDER_PREFIX + employeeKey_(first, last), personFolder.getId());

  const offerCopy     = DriveApp.getFileById(offerTemplateId).makeCopy(`Offer Letter_${last}`, personFolder);
  const checklistCopy = DriveApp.getFileById(checklistId).makeCopy(`Onboarding Checklist_${last}`, personFolder);

  // Start Date may already be filled when HR sets Date of Hire — use it if available
  const startDate = getByField_(sheet, headerMap, row, 'START_DATE');
  fillOfferLetterPlaceholders_(offerCopy.getId(), first, last, startDate || null);
  // Checklist is a straight copy — no placeholders to fill.

  MailApp.sendEmail({
    to: CFG.INFO_EMAIL, cc: CFG.JOSH_EMAIL,
    subject: `New Employee Onboarding — ${first} ${last}`,
    body: `${first} ${last} (${position}) has a Date of Hire entered.\n\n` +
      `Folder:              ${personFolder.getUrl()}\n` +
      `Offer Letter:        ${offerCopy.getUrl()}\n` +
      `Onboarding Checklist:${checklistCopy.getUrl()}\n\n` +
      `HR On-Boarding Checklist: ${CFG.HR_CHECKLIST_URL}`,
  });

  GmailApp.createDraft(CFG.INSURANCE_EMAIL, 'Insurance Update: New Hire',
    `Tabatha,\n\nPlease see attached for documentation regarding our new hire ` +
    `(${first} ${last}) to update our insurance.\n\n` +
    `Thanks in advance!\n\n---\nNote for sender: please CC ${CFG.JOSH_EMAIL} before sending.`);

  const email = getByField_(sheet, headerMap, row, 'PERSONAL_EMAIL');
  addContactSafely_(first, last, email);

  scheduleDocDeletion_(offerCopy.getId(), 15);
  scheduleDocDeletion_(checklistCopy.getId(), 21);

  Logger.log(`Onboarding complete for ${first} ${last}.`);
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

  processStaleSchedules_(props);
  cleanupScheduledDocDeletions_();
}

function executeOffboarding_(entry) {
  try {
    const ss        = SpreadsheetApp.openById(CFG.EMPLOYEE_SHEET_ID);
    const sheet     = ss.getSheetByName(CFG.TAB_CURRENT);
    const headerMap = getHeaderMap_(sheet);
    const row       = findEmployeeRow_(sheet, headerMap, entry.first, entry.last);

    if (!row) {
      MailApp.sendEmail(CFG.INFO_EMAIL,
        `CRITICAL: offboarding due for ${entry.first} ${entry.last}, but row not found`,
        `Their End Date arrived but their row isn't in "${CFG.TAB_CURRENT}" anymore. ` +
        `Please offboard them manually. This will repeat daily until resolved ` +
        `(stops automatically after ${CFG.STALE_SCHEDULE_MAX_DAYS} days).`);
      return false;
    }

    const endDateFormatted = formatDate_(new Date(entry.endDate + 'T00:00:00'));

    const newFile = DriveApp.getFileById(CFG.TERM_LETTER_TEMPLATE_ID)
      .makeCopy(`Termination Letter_${entry.last}`, DriveApp.getFolderById(CFG.FORMER_DOCS_FOLDER_ID));
    const doc  = DocumentApp.openById(newFile.getId());
    const body = doc.getBody();
    // Termination Letter placeholders (verified from Termination_Letter_DO_NOT_MODIFY.docx):
    //   MONTH, DD, YYYY        → letter date (top of doc, no brackets)
    //   [First Name, Last Name] → employee name (note: comma between names)
    //   [MONTH, DD, YYYY]      → termination effective date (has brackets)
    // ORDER MATTERS: replace the bracketed termination date FIRST, then the bare letter date,
    // otherwise the bare replaceText would corrupt [MONTH, DD, YYYY] before it's replaced.
    body.replaceText('\\[MONTH, DD, YYYY\\]',     endDateFormatted);
    body.replaceText('MONTH, DD, YYYY',            formatDate_(new Date()));
    body.replaceText('\\[First Name, Last Name\\]', `${entry.first} ${entry.last}`);
    doc.saveAndClose();

    MailApp.sendEmail({
      to: CFG.JOSH_EMAIL, cc: CFG.INFO_EMAIL,
      subject: `Employee Off-Boarding — ${entry.first} ${entry.last}`,
      body: `${entry.first} ${entry.last}'s employment ends ${endDateFormatted}.\n\n` +
        `Termination letter: ${newFile.getUrl()}\n\n` +
        `Please ensure Pathway processes their final paycheck within 3 business days, ` +
        `and confirm Tabatha Wilson (Trucordia) has been notified to remove them from insurance.`,
    });

    GmailApp.createDraft(CFG.INSURANCE_EMAIL, 'Employee Off-Boarded',
      `Tabatha,\n\n${entry.first} ${entry.last} has been off-boarded effective ${endDateFormatted}.\n\n` +
      `Please remove them from our insurance policy accordingly.\n\nThank you!`);

    removeContactSafely_(getByField_(sheet, headerMap, row, 'PERSONAL_EMAIL'));

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

function sendFollowUpReminder_(entry) {
  MailApp.sendEmail({
    to: CFG.INFO_EMAIL, cc: CFG.JOSH_EMAIL,
    subject: `Action Required: Final Off-Boarding Steps — ${entry.first} ${entry.last}`,
    body: `This is the ${CFG.FOLLOW_UP_BUSINESS_DAYS}-business-day follow-up for ` +
      `${entry.first} ${entry.last} (terminated ${formatDate_(new Date(entry.endDate + 'T00:00:00'))}).\n\nPlease:\n` +
      `1. Deactivate/remove them from QuickBooks.\n` +
      `2. Move their personnel folder to the Former Employees folder:\n` +
      `   https://drive.google.com/drive/folders/${CFG.FORMER_DOCS_FOLDER_ID}\n\n` +
      `Please confirm once complete.`,
  });
}

function processStaleSchedules_(props) {
  const all = props.getProperties();
  const now = new Date();
  Object.keys(all).forEach(key => {
    if (!key.startsWith(PROP_OFFBOARD_PREFIX)) return;
    let entry;
    try { entry = JSON.parse(all[key]); } catch (e) { return; }
    if (entry.executed || entry.staleAlertSent) return;
    const daysOld = (now - new Date(entry.scheduledOn)) / 86400000;
    if (daysOld > CFG.STALE_SCHEDULE_MAX_DAYS) {
      MailApp.sendEmail(CFG.INFO_EMAIL,
        `AKWL HR script: stuck offboarding entry for ${entry.first} ${entry.last}`,
        `This offboarding has failed to execute for over ${CFG.STALE_SCHEDULE_MAX_DAYS} days ` +
        `(row likely deleted or renamed manually). This is the LAST automated alert -- ` +
        `clear it manually in Script Properties (key: ${key}) if no longer needed.`);
      entry.staleAlertSent = true;
      props.setProperty(key, JSON.stringify(entry));
    }
  });
}


// ─────────────────────────────────────────────────────────────
// GOOGLE CONTACTS  (replaces "0040")
// ─────────────────────────────────────────────────────────────
function addContactSafely_(first, last, email) {
  if (!isValidEmail_(email)) return;
  try {
    if (getContactResourceName_(email)) return;
    const contact = People.People.createContact({
      names        : [{ givenName: first, familyName: last, displayName: `${first} ${last}` }],
      emailAddresses: [{ value: email, type: 'work' }],
    });
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

function cleanupScheduledDocDeletions_() {
  const props = PropertiesService.getScriptProperties();
  const all   = props.getProperties();
  const now   = new Date();
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
// DEBUG / MANUAL TEST HELPERS
// Run these from the Apps Script editor to verify setup.
// ─────────────────────────────────────────────────────────────

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
