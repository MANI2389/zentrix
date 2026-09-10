/**
 * ZENTRIX 2026 – Registration Logic
 * The Kavery Engineering College (Autonomous)
 *
 * Handles:
 *  - Building event selector cards from window.SYMPOSIUM_EVENTS
 *  - Selecting exactly one technical and one non-technical event
 *  - Pre-selecting event from ?event=<id> URL parameter
 *  - Conditional team section (shown for team-based selections)
 *  - Real-time field validation with inline error messages
 *  - Duplicate registration check (SELECT before INSERT)
 *  - Supabase INSERT with full error classification
 *  - Redirect to success.html on successful registration
 *  - Progress step indicator updates
 *
 * Column mapping (matches supabase/schema.sql exactly):
 *   full_name         ← studentName input
 *   register_number   ← rollNumber input   (stored UPPERCASE)
 *   department        ← department select
 *   year              ← yearOfStudy select
 *   section           ← section input      (optional, UPPERCASE)
 *   email             ← email input        (stored lowercase)
 *   phone             ← phone input
 *   event_id          ← selected event id
 *   event_name        ← selected event name
 *   team_name         ← teamName input     (team events only)
 *   team_members      ← JSON string array of {name, registerNumber} (team events only)
 *   registration_type ← always 'internal'
 *   status            ← always 'registered'
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────
     Validation Patterns
     ────────────────────────────────────────── */

  const PHONE_RE = /^[6-9][0-9]{9}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const REGNO_RE = /^[A-Za-z0-9]{4,20}$/;
  const MAX_PAYMENT_SCREENSHOT_BYTES = 5 * 1024 * 1024;
  const PAYMENT_SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  /* ──────────────────────────────────────────
     Module State
     ────────────────────────────────────────── */

  let selectedTechnicalId = null;
  let selectedNonTechnicalId = null;
  let currentTechnicalData = null;
  let currentNonTechnicalData = null;
  let isSubmitting     = false;   // Guard against double-submit

  /* ──────────────────────────────────────────
     DOM Helpers
     ────────────────────────────────────────── */

  function el(id) {
    return document.getElementById(id);
  }

  function setError(fieldId, msg) {
    const errEl = el(fieldId + '-error');
    const input = el(fieldId);
    if (errEl) errEl.textContent = msg;
    if (input) {
      if (msg) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
      } else {
        input.classList.remove('is-invalid');
      }
    }
  }

  function setValid(fieldId) {
    const errEl = el(fieldId + '-error');
    const input = el(fieldId);
    if (errEl) errEl.textContent = '';
    if (input) {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    }
  }

  /**
   * Display a top-of-form alert banner.
   * @param {string} html   — Message HTML (kept minimal for safety)
   * @param {'danger'|'warning'|'success'} type
   */
  function showAlert(html, type) {
    type = type || 'danger';
    var alertBox = el('formAlert');
    if (!alertBox) return;

    var icons = { danger: '❌', warning: '⚠️', success: '✅' };
    var icon  = icons[type] || '';

    alertBox.innerHTML =
      '<div class="alert alert-' + type + '">' + icon + '&nbsp;&nbsp;' + html + '</div>';

    // Scroll the banner into view so users on small screens see it
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearAlert() {
    var alertBox = el('formAlert');
    if (alertBox) alertBox.innerHTML = '';
  }

  /** XSS-safe text escape for dynamic content inserted via innerHTML */
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  /* ──────────────────────────────────────────
     Setup Banner (unconfigured Supabase)
     ────────────────────────────────────────── */

  function checkAndShowSetupBanner() {
    if (typeof window.isSupabaseConfigured === 'function' &&
        !window.isSupabaseConfigured()) {
      var banner = el('setupBanner');
      if (banner) banner.style.display = 'flex';
    }
  }

  /* ──────────────────────────────────────────
     Progress Step Indicator
     ────────────────────────────────────────── */

  function updateStepIndicatorAuto() {
    var steps   = document.querySelectorAll('.form-steps .step');
    var lines   = document.querySelectorAll('.form-steps .step-line');
    var personal = checkPersonalSectionFilled();
    var hasEvent = !!(selectedTechnicalId && selectedNonTechnicalId);

    var active = 1;
    if (personal)            active = 2;
    if (personal && hasEvent) active = 3;

    steps.forEach(function (s, i) {
      var stepNum = i + 1;
      s.classList.remove('active', 'done');
      if (stepNum < active)       s.classList.add('done');
      else if (stepNum === active) s.classList.add('active');
    });

    lines.forEach(function (l, i) {
      l.classList.toggle('done', (i + 1) < active);
    });
  }

  function checkPersonalSectionFilled() {
    var name  = val('studentName');
    var roll  = val('rollNumber');
    var dept  = getDepartmentValue();
    var yr    = val('yearOfStudy');
    var institution = val('institution');
    var email = val('email');
    var phone = val('phone');
    return name.length >= 3 && REGNO_RE.test(roll) &&
           dept && yr && institution && EMAIL_RE.test(email) && PHONE_RE.test(phone);
  }

  function val(id) {
    var input = el(id);
    return input ? input.value.trim() : '';
  }

  function getDepartmentValue() {
    var department = val('department');
    return department === 'Other' ? val('customDepartment') : department;
  }

  /* ──────────────────────────────────────────
     Event Selector Card Builder
     ────────────────────────────────────────── */

  function buildEventSelector() {
    var technicalContainer = el('technicalEventSelector');
    var nonTechnicalContainer = el('nonTechnicalEventSelector');
    if (!technicalContainer || !nonTechnicalContainer) return;

    if (!window.SYMPOSIUM_EVENTS || !window.SYMPOSIUM_EVENTS.length) {
      technicalContainer.innerHTML =
        '<p class="field-error">⚠ Event data could not be loaded. Please refresh the page.</p>';
      nonTechnicalContainer.innerHTML = '';
      return;
    }

    function buildCategory(container, type, inputName) {
      var events = window.SYMPOSIUM_EVENTS.filter(function (event) {
        return event.type === type;
      });
      var grid = document.createElement('div');
      grid.className = 'event-selector-grid-inner';

      events.forEach(function (event) {
      var typeClass = 'type-' + event.type;
      var teamLabel = event.teamBased
        ? 'Team &bull; max ' + event.maxTeamMembers
        : 'Individual';

      var card = document.createElement('label');
      card.className = 'event-selector-card';
      card.setAttribute('for', 'event_' + event.id);
      card.setAttribute('title', event.name);

      // Build inner HTML (event.icon is SVG from events.js — trusted source)
      card.innerHTML =
        '<input' +
        '  type="radio"' +
        '  id="event_' + event.id + '"' +
        '  name="' + inputName + '"' +
        '  value="' + esc(event.id) + '"' +
        '  aria-label="' + esc(event.name) + '"' +
        '>' +
        '<div class="event-selector-label">' +
        '  <div class="event-selector-icon">' +
             (event.icon || defaultEventIcon()) +
        '  </div>' +
        '  <div class="event-selector-info">' +
        '    <span class="event-selector-name">' + esc(event.name) + '</span>' +
        '    <span class="event-selector-tagline">' + teamLabel + '</span>' +
        '    <span class="event-selector-type ' + typeClass + '">' +
               esc(event.type.replace(/_/g, ' ')) +
        '    </span>' +
        '  </div>' +
        '</div>';

      var radio = card.querySelector('input[type="radio"]');
      radio.addEventListener('change', function () {
        if (radio.checked) onEventSelected(event, type);
      });

      grid.appendChild(card);
      });
      container.innerHTML = '';
      container.appendChild(grid);
    }

    buildCategory(technicalContainer, 'TECHNICAL', 'technicalEventId');
    buildCategory(nonTechnicalContainer, 'NON_TECHNICAL', 'nonTechnicalEventId');
  }

  function defaultEventIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
  }

  /* ──────────────────────────────────────────
     Event Selection Handler
     ────────────────────────────────────────── */

  function onEventSelected(event, type) {
    if (type === 'TECHNICAL') {
      selectedTechnicalId = event.id;
      currentTechnicalData = event;
    } else {
      selectedNonTechnicalId = event.id;
      currentNonTechnicalData = event;
    }

    var technicalStatus = el('technicalSelectionStatus');
    var nonTechnicalStatus = el('nonTechnicalSelectionStatus');
    if (technicalStatus) technicalStatus.textContent = selectedTechnicalId ? '1/1 selected' : '0/1 selected';
    if (nonTechnicalStatus) nonTechnicalStatus.textContent = selectedNonTechnicalId ? '1/1 selected' : '0/1 selected';

    // Clear event-level error
    var eventErr = el('event-error');
    if (eventErr) eventErr.textContent = '';

    var teamSection = el('section-team');
    if (!teamSection) return;

    var teamEvents = [currentTechnicalData, currentNonTechnicalData].filter(function (item) {
      return item && item.teamBased;
    });
    if (teamEvents.length) {
      teamSection.style.display = '';

      var sectionNum = el('consentSectionNum');
      if (sectionNum) sectionNum.textContent = '04';

      var sizeHint = el('teamSizeHint');
      var maxTeamMembers = Math.max.apply(null, teamEvents.map(function (item) {
        return item.maxTeamMembers;
      }));
      if (sizeHint) sizeHint.textContent = '(max ' + maxTeamMembers + ' members including you)';

      // Build N-1 member input fields (leader counts as member 1)
      buildTeamMemberFields(maxTeamMembers - 1);

      var tn = el('teamName');
      if (tn) tn.required = true;

    } else {
      teamSection.style.display = 'none';

      var sectionNum2 = el('consentSectionNum');
      if (sectionNum2) sectionNum2.textContent = '03';

      var tn2 = el('teamName');
      if (tn2) { tn2.required = false; tn2.value = ''; }

      var membersContainer = el('teamMembersContainer');
      if (membersContainer) membersContainer.innerHTML = '';
    }

    updatePaymentTotal();
    updateSummary();
    updateStepIndicatorAuto();
  }

  function buildTeamMemberFields(count) {
    var container = el('teamMembersContainer');
    if (!container) return;
    container.innerHTML = '';

    for (var i = 1; i <= count; i++) {
      var row = document.createElement('div');
      row.className = 'team-member-row';
      row.innerHTML =
        '<span class="team-member-num">' + i + '.</span>' +
        '<input' +
        '  type="text"' +
        '  id="teamMemberName_' + i + '"' +
        '  name="teamMemberName_' + i + '"' +
        '  class="form-control"' +
        '  placeholder="Member ' + i + ' full name"' +
        '  maxlength="120"' +
        '  autocomplete="off"' +
        '  aria-label="Member ' + i + ' full name"' +
        '>' +
        '<input' +
        '  type="text"' +
        '  id="teamMemberReg_' + i + '"' +
        '  name="teamMemberReg_' + i + '"' +
        '  class="form-control"' +
        '  placeholder="Member ' + i + ' register number"' +
        '  maxlength="20"' +
        '  autocomplete="off"' +
        '  aria-label="Member ' + i + ' register number"' +
        '>';
      container.appendChild(row);

      row.querySelectorAll('input').forEach(function (input) {
        input.addEventListener('input', updatePaymentTotal);
      });
    }
  }

  function getTeamMemberCount() {
    var rows = document.querySelectorAll('.team-member-row');
    var completeMembers = 0;
    rows.forEach(function (row) {
      var inputs = row.querySelectorAll('input');
      if (inputs.length === 2 && inputs[0].value.trim() && inputs[1].value.trim()) {
        completeMembers++;
      }
    });
    return completeMembers;
  }

  function updatePaymentTotal() {
    var totalEl = el('paymentTotal');
    if (!totalEl) return;
    var participantCount = 1 + getTeamMemberCount();
    totalEl.textContent = '₹' + (participantCount * 150);
  }

  function validateTeamMembers() {
    var valid = true;
    document.querySelectorAll('.team-member-row').forEach(function (row) {
      var inputs = row.querySelectorAll('input');
      if (inputs.length !== 2) return;
      var nameInput = inputs[0];
      var regInput = inputs[1];
      var hasName = nameInput.value.trim().length > 0;
      var hasReg = regInput.value.trim().length > 0;
      nameInput.classList.remove('is-invalid');
      regInput.classList.remove('is-invalid');
      if (hasName !== hasReg) {
        nameInput.classList.toggle('is-invalid', !hasName);
        regInput.classList.toggle('is-invalid', !hasReg);
        valid = false;
      }
      if (hasReg && !REGNO_RE.test(regInput.value.trim())) {
        regInput.classList.add('is-invalid');
        valid = false;
      }
    });
    return valid;
  }

  /* ──────────────────────────────────────────
     URL Pre-selection (?event=<id>)
     ────────────────────────────────────────── */

  function preselectEventFromURL() {
    var params = new URLSearchParams(window.location.search);
    var rawParam = params.get('event');
    if (!rawParam) return;

    var event = (typeof window.getEventById === 'function')
      ? window.getEventById(rawParam)
      : (window.SYMPOSIUM_EVENTS || []).find(function (e) {
          var clean = decodeURIComponent(rawParam).toLowerCase().trim();
          return e.id.toLowerCase() === clean ||
                 e.name.toLowerCase() === clean ||
                 e.id.replace(/-/g, '').toLowerCase() === clean.replace(/[^a-z0-9]/g, '');
        });

    if (!event) return;

    var radio = el('event_' + event.id);
    if (radio) {
      radio.checked = true;
      onEventSelected(event, event.type);
      var section = el('section-event');
      if (section) {
        setTimeout(function () {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
    }
  }

  /* ──────────────────────────────────────────
     Real-time Field Validation
     ────────────────────────────────────────── */

  function setupRealTimeValidation() {
    var blurFields = ['studentName', 'rollNumber', 'department', 'yearOfStudy', 'institution', 'email', 'phone'];

    blurFields.forEach(function (id) {
      var input = el(id);
      if (!input) return;

      // Validate on blur (after leaving field)
      input.addEventListener('blur', function () {
        validateField(id);
      });

      // Re-validate on input only if already in error state
      input.addEventListener('input', function () {
        if (input.classList.contains('is-invalid')) validateField(id);
        updateSummary();
        updateStepIndicatorAuto();
      });

      // Selects also need change event
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', function () {
          validateField(id);
          updateSummary();
          updateStepIndicatorAuto();
        });
      }
    });

    var department = el('department');
    var customDepartment = el('customDepartment');
    if (department && customDepartment) {
      department.addEventListener('change', function () {
        var isOther = department.value === 'Other';
        customDepartment.hidden = !isOther;
        customDepartment.required = isOther;
        if (!isOther) {
          customDepartment.value = '';
          setError('customDepartment', '');
        }
        validateField('department');
        if (isOther) validateField('customDepartment');
        updateSummary();
        updateStepIndicatorAuto();
      });
      customDepartment.addEventListener('blur', function () { validateField('customDepartment'); });
      customDepartment.addEventListener('input', function () {
        if (customDepartment.classList.contains('is-invalid')) validateField('customDepartment');
        updateSummary();
        updateStepIndicatorAuto();
      });
    }

    // Consent checkbox
    var consent = el('consentCheck');
    if (consent) {
      consent.addEventListener('change', function () {
        if (consent.checked) {
          var errEl = el('consent-error');
          if (errEl) errEl.textContent = '';
        }
        updateSummary();
      });
    }
  }

  /**
   * Validate a single field by its id.
   * @returns {boolean} true if valid
   */
  function validateField(id) {
    var input = el(id);
    if (!input) return true;
    var v = input.value.trim();

    switch (id) {
      case 'studentName':
        if (v.length < 3) {
          setError(id, 'Full name must be at least 3 characters.');
          return false;
        }
        setValid(id);
        return true;

      case 'rollNumber':
        if (!REGNO_RE.test(v)) {
          setError(id, 'Enter a valid register number (4–20 alphanumeric characters).');
          return false;
        }
        setValid(id);
        return true;

      case 'department':
        if (!v) {
          setError(id, 'Please select your department.');
          return false;
        }
        setValid(id);
        return true;

      case 'customDepartment':
        if (val('department') === 'Other' && v.length < 2) {
          setError(id, 'Enter your department name.');
          return false;
        }
        setValid(id);
        return true;

      case 'yearOfStudy':
        if (!v) {
          setError(id, 'Please select your year of study.');
          return false;
        }
        setValid(id);
        return true;

      case 'institution':
        if (!v) {
          setError(id, 'Please select your institution.');
          return false;
        }
        setValid(id);
        return true;

      case 'email':
        if (!EMAIL_RE.test(v)) {
          setError(id, 'Enter a valid email address (e.g. student@example.com).');
          return false;
        }
        setValid(id);
        return true;

      case 'phone':
        if (!PHONE_RE.test(v)) {
          setError(id, 'Enter a valid 10-digit Indian mobile number starting with 6–9.');
          return false;
        }
        setValid(id);
        return true;

      case 'transactionId':
        if (v.length < 6) {
          setError(id, 'Enter the transaction ID or UTR from your payment receipt.');
          return false;
        }
        setValid(id);
        return true;

      default:
        return true;
    }
  }

  /* ──────────────────────────────────────────
     Full-form Validation (on submit)
     ────────────────────────────────────────── */

  function validateAllFields() {
    var ok = true;

    ['studentName', 'rollNumber', 'department', 'yearOfStudy', 'institution', 'email', 'phone'].forEach(function (id) {
      if (!validateField(id)) ok = false;
    });
    if (val('department') === 'Other' && !validateField('customDepartment')) ok = false;

    if (!validateField('transactionId')) ok = false;

    var screenshot = el('paymentScreenshot');
    if (!screenshot || !screenshot.files || !screenshot.files[0]) {
      setError('paymentScreenshot', 'Please upload your payment screenshot.');
      ok = false;
    } else if (!PAYMENT_SCREENSHOT_TYPES.includes(screenshot.files[0].type)) {
      setError('paymentScreenshot', 'Upload a PNG, JPG or WEBP image.');
      ok = false;
    } else if (screenshot.files[0].size > MAX_PAYMENT_SCREENSHOT_BYTES) {
      setError('paymentScreenshot', 'Payment screenshot must be 5MB or smaller.');
      ok = false;
    } else {
      setValid('paymentScreenshot');
    }

    if (!selectedTechnicalId || !selectedNonTechnicalId) {
      var evtErr = el('event-error');
      if (evtErr) evtErr.textContent = 'Please select exactly one Technical and one Non-Technical event.';
      ok = false;
    }

    var hasTeamEvent = (currentTechnicalData && currentTechnicalData.teamBased) ||
                       (currentNonTechnicalData && currentNonTechnicalData.teamBased);
    if (hasTeamEvent) {
      var teamNameVal = val('teamName');
      if (teamNameVal.length < 2) {
        setError('teamName', 'Team name must be at least 2 characters.');
        ok = false;
      } else {
        setValid('teamName');
      }
      if (!validateTeamMembers()) {
        showAlert('Enter both a member name and register number for every added team member.', 'danger');
        ok = false;
      }
    }

    var consent = el('consentCheck');
    if (!consent || !consent.checked) {
      var cErr = el('consent-error');
      if (cErr) cErr.textContent = 'You must accept the declaration to register.';
      ok = false;
    }

    return ok;
  }

  /* ──────────────────────────────────────────
     Registration Summary Preview
     ────────────────────────────────────────── */

  function updateSummary() {
    var summaryDiv     = el('registrationSummary');
    var summaryContent = el('summaryContent');
    if (!summaryDiv || !summaryContent) return;

    var name     = val('studentName')  || '—';
    var roll     = val('rollNumber')   || '—';
    var dept     = getDepartmentValue() || '—';
    var yr       = val('yearOfStudy')  || '—';
    var institution = val('institution') || '—';
    var email    = val('email')        || '—';
    var technicalName = currentTechnicalData ? currentTechnicalData.name : '—';
    var nonTechnicalName = currentNonTechnicalData ? currentNonTechnicalData.name : '—';

    summaryContent.innerHTML =
      '<div class="summary-item"><span class="summary-label">Name</span>'        + '<span class="summary-val">' + esc(name)    + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Reg. No.</span>'    + '<span class="summary-val">' + esc(roll)    + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Department</span>'  + '<span class="summary-val">' + esc(dept)    + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Year</span>'        + '<span class="summary-val">' + esc(yr)      + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Institution</span>' + '<span class="summary-val">' + esc(institution) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Email</span>'       + '<span class="summary-val">' + esc(email)   + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Technical</span>' + '<span class="summary-val">' + esc(technicalName) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Non-Technical</span>' + '<span class="summary-val">' + esc(nonTechnicalName) + '</span></div>';

    var complete = (name !== '—' && roll !== '—' && dept !== '—' && yr !== '—' && institution !== '—' &&
                   technicalName !== '—' && nonTechnicalName !== '—');
    summaryDiv.style.display = complete ? '' : 'none';
  }

  /* ──────────────────────────────────────────
     Supabase: Duplicate Check
     ────────────────────────────────────────── */

  /**
   * Returns true if (register_number, event_id) already exists.
   * Fails open (returns false) on network/RLS error so the DB
   * unique constraint acts as the final guard.
   *
   * @param {object} client   Supabase client
   * @param {string} regNum   UPPERCASE register number
   * @param {string} eventId  event.id string
   */
  async function checkDuplicate(client, regNum, eventId) {
    var result = await client
      .from('registrations')
      .select('id', { count: 'exact', head: true })   // HEAD request — no row data returned
      .eq('register_number', regNum)
      .eq('event_id', eventId)
      .limit(1);

    if (result.error) {
      // Log code only — not the register number or event data
      console.warn('[SYM2K26] Duplicate check error code:', result.error.code || 'unknown');
      return false;   // Fail open; DB constraint will catch real duplicates
    }

    return (result.count !== null && result.count > 0);
  }

  /* ──────────────────────────────────────────
     Supabase: Insert Registration
     ────────────────────────────────────────── */

  /**
   * INSERT a row into the `registrations` table.
   * Column names match supabase/schema.sql exactly.
   *
   * @param {object} client   Supabase client
   * @param {object} payload  Row data
   * @returns {object}        The inserted row (id + registration_id)
   */
  async function insertRegistration(client, payload) {
    // 1. Try secure SECURITY DEFINER RPC endpoint first
    try {
      var rpcRes = await client.rpc('register_student', {
        p_full_name       : payload.full_name,
        p_register_number : payload.register_number,
        p_department      : payload.department,
        p_year            : payload.year,
        p_institution     : payload.institution,
        p_payment_transaction_id: payload.payment_transaction_id,
        p_payment_screenshot_url: payload.payment_screenshot_url,
        p_section         : payload.section || null,
        p_email           : payload.email,
        p_phone           : payload.phone,
        p_event_id        : payload.event_id,
        p_event_name      : payload.event_name,
        p_team_name       : payload.team_name || null,
        p_team_members    : payload.team_members || null
      });

      if (!rpcRes.error && rpcRes.data && rpcRes.data.registration_id) {
        return rpcRes.data;
      }
      if (rpcRes.error && rpcRes.error.code === '23505') {
        throw rpcRes.error;
      }
    } catch (rpcErr) {
      if (rpcErr.code === '23505') throw rpcErr;
      // If RPC not installed yet in user DB, fall back to direct table insert
    }

    // 2. Direct table insert fallback
    var result = await client
      .from('registrations')
      .insert([payload])
      .select('id, registration_id')
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  async function uploadPaymentScreenshot(client, file, registerNumber) {
    var extension = file.name.split('.').pop().toLowerCase();
    var path = registerNumber + '/' + Date.now() + '.' + extension;
    var upload = await client.storage.from('payment-screenshots').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false
    });
    if (upload.error) throw upload.error;

    var publicUrl = client.storage.from('payment-screenshots').getPublicUrl(path);
    return publicUrl.data.publicUrl;
  }

  /* ──────────────────────────────────────────
     Error Classification → User-Friendly Messages
     ────────────────────────────────────────── */

  /**
   * Map a Supabase/PostgREST error to a readable message.
   * Deliberately avoids echoing raw DB error text to the UI.
   *
   * @param {object} err  Error object from Supabase client
   * @param {string} eventName  Current event name for context
   * @returns {{ html: string, type: string }}
   */
  function classifyError(err, eventName) {
    var code    = err.code    || '';
    var message = err.message || '';
    var hint    = err.hint    || '';
    var details = err.details || '';

    // ── PostgreSQL constraint violations ──────────────────────
    // Unique constraint: (register_number, event_id)
    if (code === '23505' || details.includes('uq_student_per_event')) {
      return {
        type : 'warning',
        html : 'You have already registered for <strong>' + esc(eventName) +
               '</strong>. Each student may register for a given event only once.',
      };
    }

    // CHECK constraint violation (invalid field value slipped past client validation)
    if (code === '23514') {
      return {
        type : 'danger',
        html : 'One or more fields contain an invalid value. Please review your details and try again.',
      };
    }

    // NOT NULL violation
    if (code === '23502') {
      return {
        type : 'danger',
        html : 'A required field is missing. Please ensure all required fields are filled in.',
      };
    }

    // ── RLS / Permission errors ───────────────────────────────
    if (code === '42501' ||
        message.toLowerCase().includes('row-level security') ||
        message.toLowerCase().includes('permission denied') ||
        message.toLowerCase().includes('insufficient_privilege')) {
      return {
        type : 'danger',
        html : 'Registration is temporarily restricted. Please contact the event coordinator.',
      };
    }

    // JWT / Auth errors
    if (code === 'PGRST301' || message.toLowerCase().includes('jwt')) {
      return {
        type : 'danger',
        html : 'Session error. Please refresh the page and try again.',
      };
    }

    // ── PostgREST / Network errors ────────────────────────────
    // Table not found (schema not yet applied)
    if (code === '42P01' || message.includes('does not exist')) {
      return {
        type : 'danger',
        html : 'Database setup is incomplete. Please ask the administrator to run <code>schema.sql</code>.',
      };
    }

    if (code === 'PGRST202' || message.toLowerCase().includes('function') && message.toLowerCase().includes('register_student')) {
      return {
        type : 'danger',
        html : 'The Supabase registration function is outdated. Please run the latest <code>supabase/schema.sql</code> file in SQL Editor.',
      };
    }

    if (code === 'PGRST204' || message.toLowerCase().includes('payment_transaction_id') ||
        message.toLowerCase().includes('payment_screenshot_url')) {
      return {
        type : 'danger',
        html : 'Payment columns are missing in Supabase. Please run the latest <code>supabase/schema.sql</code> file in SQL Editor.',
      };
    }

    if (message.toLowerCase().includes('bucket') || message.toLowerCase().includes('storage')) {
      return {
        type : 'danger',
        html : 'Payment screenshot storage is not ready. Please run the latest <code>supabase/policies.sql</code> file in SQL Editor.',
      };
    }

    // Network / fetch failure
    if (message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('networkerror')    ||
        message.toLowerCase().includes('load failed')) {
      return {
        type : 'danger',
        html : 'Network error. Please check your internet connection and try again.',
      };
    }

    // Request timeout
    if (message.toLowerCase().includes('timeout')) {
      return {
        type : 'danger',
        html : 'The request timed out. Please try again in a moment.',
      };
    }

    // ── Fallback ──────────────────────────────────────────────
    // Do NOT show raw DB messages to users
    return {
      type : 'danger',
      html : 'Registration could not be completed at this time. Please try again or contact the event organiser.',
    };
  }

  /* ──────────────────────────────────────────
     Loading State Helpers
     ────────────────────────────────────────── */

  function setLoadingState(loading) {
    var btn     = el('submitBtn');
    var btnText = el('submitBtnText');
    var spinner = el('submitSpinner');

    if (!btn) return;

    btn.disabled = loading;
    if (btnText)  btnText.textContent   = loading ? 'Submitting…' : 'REGISTER NOW';
    if (spinner)  spinner.style.display = loading ? 'inline-block' : 'none';
  }

  /* ──────────────────────────────────────────
     Form Submit Handler
     ────────────────────────────────────────── */

  async function handleSubmit(e) {
    e.preventDefault();

    // Prevent double-submit
    if (isSubmitting) return;

    clearAlert();

    // ── 1. Client-side validation ──────────────────────────────
    if (!validateAllFields()) {
      showAlert('Please fix the highlighted errors before submitting.', 'danger');
      var firstInvalid = document.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // ── 2. Collect form values ─────────────────────────────────
    var fullName     = val('studentName');
    var regNumber    = val('rollNumber').toUpperCase();
    var department   = getDepartmentValue();
    var year         = val('yearOfStudy');
    var institution  = val('institution');
    var sectionRaw   = val('section').toUpperCase();
    var section      = sectionRaw || null;
    var email        = val('email').toLowerCase();
    var phone        = val('phone');
    var transactionId = val('transactionId');
    var paymentScreenshot = el('paymentScreenshot').files[0];

    var selectedEvents = [currentTechnicalData, currentNonTechnicalData];
    var isTeam   = selectedEvents.some(function (event) { return event && event.teamBased; });
    var teamName = isTeam ? (val('teamName') || null) : null;

    // Collect additional team member names and register numbers (leader is NOT included)
    var teamMembers = [];
    var maxTeamMembers = Math.max.apply(null, selectedEvents.map(function (event) {
      return event && event.teamBased ? event.maxTeamMembers : 1;
    }));
    if (isTeam && maxTeamMembers > 1) {
      var maxExtra = maxTeamMembers - 1;
      for (var i = 1; i <= maxExtra; i++) {
        var memberNameInput = el('teamMemberName_' + i);
        var memberRegInput = el('teamMemberReg_' + i);
        if (memberNameInput && memberRegInput && memberNameInput.value.trim() && memberRegInput.value.trim()) {
          teamMembers.push({
            name: memberNameInput.value.trim(),
            registerNumber: memberRegInput.value.trim().toUpperCase()
          });
        }
      }
    }

    // ── 3. Get Supabase client ─────────────────────────────────
    var client = typeof window.getSupabaseClient === 'function'
      ? window.getSupabaseClient()
      : null;

    if (!client) {
      showAlert(
        'The registration system is not configured yet. ' +
        'Please ask the administrator to update <code>js/config.js</code> with the Supabase credentials.',
        'warning'
      );
      return;
    }

    // ── 4. Enter loading state ─────────────────────────────────
    isSubmitting = true;
    setLoadingState(true);

    try {
      // ── 5. Upload payment proof once for both event rows ────
      var paymentScreenshotUrl = await uploadPaymentScreenshot(client, paymentScreenshot, regNumber);

      // ── 6. Check and save both category selections ──────────
      var insertedRows = [];
      for (var eventIndex = 0; eventIndex < selectedEvents.length; eventIndex++) {
        var selectedEvent = selectedEvents[eventIndex];
        var alreadyRegistered = await checkDuplicate(client, regNumber, selectedEvent.id);

        if (alreadyRegistered) {
          showAlert(
            'You have already registered for <strong>' + esc(selectedEvent.name) + '</strong>. ' +
            'Each student may register for a given event only once.',
            'warning'
          );
          return;
        }

        var payload = {
          full_name         : fullName,
          register_number   : regNumber,
          department        : department,
          year              : year,
          institution       : institution,
          payment_transaction_id: transactionId,
          payment_screenshot_url: paymentScreenshotUrl,
          section           : section,
          email             : email,
          phone             : phone,
          event_id          : selectedEvent.id,
          event_name        : selectedEvent.name,
          team_name         : teamName,
          team_members      : teamMembers.length > 0 ? JSON.stringify(teamMembers) : null,
          registration_type : 'internal',
          status            : 'registered',
        };

        insertedRows.push(await insertRegistration(client, payload));
      }

      // ── 8. Redirect to success.html ──────────────────────────
      // Pass only non-sensitive display data in the URL.
      // The registration_id (e.g. SYM2K26-CSE-0042) is safe to expose.
      var successParams = new URLSearchParams({
        regId    : insertedRows[0].registration_id,
        name     : fullName,
        roll     : regNumber,
        dept     : department,
        year     : year,
        institution: institution,
        event    : currentTechnicalData.name,
        eventId  : selectedTechnicalId,
        nonTechnicalEvent : currentNonTechnicalData.name,
        nonTechnicalEventId : selectedNonTechnicalId,
        teamName : teamName || '',
      });

      // Navigate to success page — no "Registration Successful" shown
      // on this page; the redirect is the only indication of success.
      window.location.href = 'success.html?' + successParams.toString();

    } catch (err) {
      // ── 9. Classify and display error ────────────────────────
      // Log only the error code — never the student's personal data
      console.error('[SYM2K26] Registration error code:', err.code || 'unknown');

      var classified = classifyError(err, 'your selected events');
      showAlert(classified.html, classified.type);

    } finally {
      // Always reset loading state, whether success or failure
      isSubmitting = false;
      setLoadingState(false);
    }
  }

  /* ──────────────────────────────────────────
     Hamburger Nav
     ────────────────────────────────────────── */

  function initNav() {
    var toggle = el('navToggle');
    var links  = el('navLinks');
    if (!toggle || !links) return;

    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('active');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close nav when a link is clicked (mobile)
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ──────────────────────────────────────────
     Init
     ────────────────────────────────────────── */

  function init() {
    if (!window.SYMPOSIUM_EVENTS || !window.SYMPOSIUM_EVENTS.length) {
      console.error('[SYM2K26] window.SYMPOSIUM_EVENTS not found. ' +
                    'Ensure js/events.js is loaded before js/registration.js.');
      return;
    }

    checkAndShowSetupBanner();
    initNav();
    buildEventSelector();
    setupRealTimeValidation();

    // Pre-select event from URL — must run after buildEventSelector
    setTimeout(preselectEventFromURL, 0);

    // Attach submit handler
    var form = el('registrationForm');
    if (form) form.addEventListener('submit', handleSubmit);

    // Set initial step indicator state
    updateStepIndicatorAuto();
  }

  // Entry point
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
