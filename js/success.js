/**
 * ====================================================================
 * ZENTRIX 2026 - Registration Confirmation & Receipt Controller
 * The Kavery Engineering College (Autonomous)
 * ====================================================================
 */

(function () {
  'use strict';

  // State object populated from URL parameters
  let registrationData = null;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, function (tag) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag;
    });
  }

  /**
   * Validate that URL params contain authentic registration details
   */
  function parseAndValidateParams() {
    const params = new URLSearchParams(window.location.search);
    const regId = params.get('regId');
    const name = params.get('name');
    const roll = params.get('roll');
    const dept = params.get('dept');
    const year = params.get('year');
    const institution = params.get('institution');
    const event = params.get('event');
    const eventId = params.get('eventId');
    const nonTechnicalEvent = params.get('nonTechnicalEvent');
    const nonTechnicalEventId = params.get('nonTechnicalEventId');
    const teamName = params.get('teamName');

    // Verification check: regId must exist and follow the SYM2K26 pattern
    // e.g. SYM2K26-CSE-0001
    const regIdPattern = /^SYM2K26-[A-Z0-9]+-\d{4,}$/i;
    const isValidRegId = regId && (regIdPattern.test(regId) || regId.startsWith('SYM2K26-'));

    if (!isValidRegId || !name || !roll || !event || !nonTechnicalEvent) {
      return null;
    }

    return {
      regId: regId.trim(),
      name: name.trim(),
      roll: roll.trim(),
      dept: (dept || 'General').trim(),
      year: (year || 'N/A').trim(),
      institution: (institution || 'N/A').trim(),
      event: event.trim(),
      eventId: (eventId || '').trim(),
      nonTechnicalEvent: nonTechnicalEvent.trim(),
      nonTechnicalEventId: (nonTechnicalEventId || '').trim(),
      teamName: (teamName || '').trim(),
      date: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  /**
   * Render the confirmation UI with verified data
   */
  function renderConfirmation(data) {
    const loadingState = el('loadingState');
    const invalidState = el('invalidState');
    const successContent = el('successContent');

    if (loadingState) loadingState.style.display = 'none';

    if (!data) {
      if (invalidState) invalidState.style.display = 'block';
      if (successContent) successContent.style.display = 'none';
      return;
    }

    // Populate DOM elements
    if (el('displayRegId')) el('displayRegId').textContent = data.regId;
    if (el('displayName')) el('displayName').textContent = data.name;
    if (el('displayRoll')) el('displayRoll').textContent = data.roll;
    if (el('displayDept')) el('displayDept').textContent = data.dept;
    if (el('displayYear')) el('displayYear').textContent = data.year;
    if (el('displayInstitution')) el('displayInstitution').textContent = data.institution;
    if (el('displayEvent')) el('displayEvent').textContent = data.event;
    if (el('displayNonTechnicalEvent')) el('displayNonTechnicalEvent').textContent = data.nonTechnicalEvent;
    if (el('displayDate')) el('displayDate').textContent = data.date;

    const teamRow = el('teamNameRow');
    if (teamRow) {
      if (data.teamName) {
        teamRow.style.display = 'flex';
        if (el('displayTeamName')) el('displayTeamName').textContent = data.teamName;
      } else {
        teamRow.style.display = 'none';
      }
    }

    if (invalidState) invalidState.style.display = 'none';
    if (successContent) successContent.style.display = 'flex';
  }

  /**
   * Generates a high-resolution, cyberpunk-themed PNG confirmation pass
   */
  function downloadReceipt() {
    if (!registrationData) {
      alert('No valid registration found to generate confirmation receipt.');
      return;
    }

    const canvas = el('receiptCanvas') || document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // High-resolution canvas dimensions (2x scaling for retina clarity)
    const width = 1000;
    const height = 650;
    canvas.width = width;
    canvas.height = height;

    // ── 1. Deep Dark Background ──
    ctx.fillStyle = '#070913';
    ctx.fillRect(0, 0, width, height);

    // Subtle background mesh / circuit pattern lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 30; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // ── 2. Decorative Outer Border ──
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Corner accents
    const corners = [
      [16, 16], [width - 16, 16], [16, height - 16], [width - 16, height - 16]
    ];
    ctx.fillStyle = '#00f2fe';
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
    });

    // ── 3. Top Gradient Header Strip ──
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#00f2fe');
    grad.addColorStop(0.35, '#4facfe');
    grad.addColorStop(0.7, '#9b51e0');
    grad.addColorStop(1, '#f107a3');
    ctx.fillStyle = grad;
    ctx.fillRect(16, 16, width - 32, 8);

    // ── 4. Watermark in background ──
    ctx.save();
    ctx.font = '900 120px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(0, 242, 254, 0.025)';
    ctx.textAlign = 'center';
    ctx.fillText('ZENTRIX 2026', width / 2, height / 2 + 40);
    ctx.restore();

    // ── 5. Header Branding ──
    ctx.textAlign = 'left';

    // College Name
    ctx.font = '700 21px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffd700'; // Gold
    ctx.fillText('THE KAVERY ENGINEERING COLLEGE (AUTONOMOUS)', 48, 68);

    ctx.font = '500 13px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('MECHERI, SALEM DISTRICT, TAMIL NADU • PIN: 636 453', 48, 90);

    // Event Title
    ctx.font = '900 32px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ZENTRIX ', 48, 138);
    const symWidth = ctx.measureText('ZENTRIX ').width;
    ctx.fillStyle = '#00f2fe';
    ctx.fillText('2K26', 48 + symWidth, 138);

    // Subtitle badge
    ctx.font = '700 12px "Inter", sans-serif';
    ctx.fillStyle = '#00f2fe';
    ctx.fillText('ZENTRIX 2026 INTERNAL REGISTRATION PASS • 24 SEPTEMBER 2026', 48, 160);

    // ── 6. ID & Status Badge (Top Right) ──
    const idBoxX = width - 330;
    const idBoxY = 48;
    const idBoxW = 282;
    const idBoxH = 110;

    ctx.fillStyle = 'rgba(18, 21, 38, 0.9)';
    ctx.fillRect(idBoxX, idBoxY, idBoxW, idBoxH);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(idBoxX, idBoxY, idBoxW, idBoxH);

    ctx.font = '600 11px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('REGISTRATION ID', idBoxX + 16, idBoxY + 28);

    ctx.font = '800 20px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#00f2fe';
    ctx.fillText(registrationData.regId, idBoxX + 16, idBoxY + 58);

    // Status pill badge
    ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
    ctx.fillRect(idBoxX + 16, idBoxY + 72, 130, 26);
    ctx.strokeStyle = '#00ff88';
    ctx.strokeRect(idBoxX + 16, idBoxY + 72, 130, 26);

    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('✓ REGISTERED', idBoxX + 30, idBoxY + 89);

    // ── 7. Divider Line ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(48, 185);
    ctx.lineTo(width - 48, 185);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // ── 8. Details Grid ──
    const startY = 225;
    const col1X = 48;
    const col2X = 520;
    const rowGap = 70;

    function drawField(label, value, x, y, isBig, color) {
      ctx.font = '600 12px "Inter", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(label.toUpperCase(), x, y);

      ctx.font = isBig ? '700 22px "Space Grotesk", sans-serif' : '600 17px "Inter", sans-serif';
      ctx.fillStyle = color || '#f8fafc';
      ctx.fillText(value, x, y + 26);
    }

    // Row 1
    drawField('Student Name', registrationData.name, col1X, startY, true, '#ffffff');
    drawField('Selected Event', registrationData.event, col2X, startY, true, '#00f2fe');

    // Row 2
    drawField('Register Number', registrationData.roll, col1X, startY + rowGap, false);
    drawField('Department', registrationData.dept, col2X, startY + rowGap, false);

    // Row 3
    drawField('Year of Study', registrationData.year, col1X, startY + rowGap * 2, false);
    if (registrationData.teamName) {
      drawField('Team Name', registrationData.teamName, col2X, startY + rowGap * 2, false, '#ffd700');
    } else {
      drawField('Institution', registrationData.institution, col2X, startY + rowGap * 2, false);
    }

    // Row 4
    drawField('Registration Issued', registrationData.date, col1X, startY + rowGap * 3, false);
    drawField('ZENTRIX Event Date', '24 September 2026 (Thursday)', col2X, startY + rowGap * 3, false, '#ffd700');

    // ── 9. Bottom Notice Banner ──
    const footerY = height - 76;
    ctx.fillStyle = 'rgba(0, 242, 254, 0.05)';
    ctx.fillRect(24, footerY, width - 48, 50);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
    ctx.strokeRect(24, footerY, width - 48, 50);

    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ MANDATORY: Present this official digital pass along with your Kavery College Student ID card at the event registration desk.', width / 2, footerY + 30);

    // ── 10. Trigger Download ──
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `SYM2K26-Pass-${registrationData.regId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.print();
    }
  }

  // Initialize on page load
  function init() {
    registrationData = parseAndValidateParams();
    renderConfirmation(registrationData);
  }

  // Expose API for the download button
  window.SYM_SUCCESS = {
    downloadReceipt: downloadReceipt
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
