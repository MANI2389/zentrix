/**
 * ====================================================================
 * ZENTRIX 2026 - Coordinator Admin Dashboard Controller
 * The Kavery Engineering College (Autonomous)
 * Phase 1: Internal College Symposium
 * ====================================================================
 *
 * Capabilities:
 * - Supabase Authenticated Session Inspection
 * - Dynamic Live Statistics (Total + 8 Events)
 * - Multi-Field Real-Time Search (Student Name, Register No, Email)
 * - Dynamic Filters (Event, Department, Year, Status)
 * - 12-Column Responsive Registration Data Table
 * - Interactive Registration Detail Modal with Attendance Toggles
 * - Client-Side RFC4180 CSV Export of Filtered Records
 * - Live Data Refresh with Loading Indicators & Error Handling
 */

(function () {
  'use strict';

  // Global State
  let allRegistrations = [];
  let filteredRegistrations = [];
  let activeDetailRecord = null;
  let isLoading = false;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, function (tag) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag;
    });
  }

  /**
   * Set and show status/error notice
   */
  function showNotice(msg, type) {
    const notice = el('adminNotice');
    if (!notice) return;

    if (!msg) {
      notice.style.display = 'none';
      notice.innerHTML = '';
      return;
    }

    const icon = type === 'error' ? '⚠️' : (type === 'success' ? '✓' : 'ℹ️');
    notice.className = `admin-notice notice-${type || 'info'}`;
    notice.innerHTML = `<span>${icon}</span><div>${escapeHtml(msg)}</div>`;
    notice.style.display = 'flex';
  }

  /**
   * Display currently logged in admin email and role from Supabase Auth & admin_users
   */
  async function loadAdminUser() {
    const emailBadge = el('adminEmailDisplay');
    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;

    if (!client) {
      if (emailBadge) emailBadge.textContent = 'Unauthenticated';
      return;
    }

    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session || !session.user) {
        if (emailBadge) emailBadge.textContent = 'Guest / Session Expired';
        return;
      }

      // Query admin role from admin_users
      let roleTag = 'ADMIN';
      try {
        const { data: adminData } = await client
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (adminData && adminData.role) {
          roleTag = adminData.role.toUpperCase();
        }
      } catch (roleErr) {
        // Fallback to default tag
      }

      if (emailBadge) {
        emailBadge.innerHTML = `${escapeHtml(session.user.email)} <span class="role-pill">[${escapeHtml(roleTag)}]</span>`;
      }
    } catch (e) {
      console.warn('[Admin] Failed to load session email:', e);
      if (emailBadge) emailBadge.textContent = 'Admin';
    }
  }

  /**
   * Fetch all registrations from Supabase
   */
  async function fetchRegistrations() {
    if (isLoading) return;
    isLoading = true;

    const refreshBtn = el('refreshBtn');
    const refreshText = el('refreshBtnText');
    const tableBody = el('regTableBody');

    if (refreshBtn) refreshBtn.disabled = true;
    if (refreshText) refreshText.textContent = 'FETCHING...';

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="12" class="text-center py-5">
            <div class="loading-ring" style="margin: 1.5rem auto 1rem;"></div>
            <p style="color:var(--text-secondary);">Querying live Supabase registrations&hellip;</p>
          </td>
        </tr>
      `;
    }

    showNotice(null);

    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;

    if (!client || !window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
      showNotice(
        'Supabase client is not configured. Please provide SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js.',
        'error'
      );
      allRegistrations = [];
      filteredRegistrations = [];
      updateStats();
      renderTable([]);
      finishLoading();
      return;
    }

    try {
      // Query from Supabase registrations table ordered by registration_date descending
      // This query is protected by PostgreSQL RLS policy `policy_admin_select` which evaluates `is_admin()`.
      const { data, error } = await client
        .from('registrations')
        .select('*')
        .order('registration_date', { ascending: false });

      if (error) {
        // Classify RLS vs Network vs Table Missing errors
        const errMsg = (error.message || '').toLowerCase();
        if (error.code === '42501' || errMsg.includes('permission denied') || errMsg.includes('row-level security')) {
          throw new Error('Access Denied (RLS Violation): Your account is authenticated, but database authorization failed. Make sure your User UID is registered in the "admin_users" table.');
        } else if (error.code === '42P01' || errMsg.includes('does not exist')) {
          throw new Error('Database table "registrations" not found. Please run supabase/schema.sql and supabase/policies.sql in your Supabase SQL Editor.');
        }
        throw error;
      }

      allRegistrations = Array.isArray(data) ? data : [];
      filteredRegistrations = [...allRegistrations];

      const timestampEl = el('statsTimestamp');
      if (timestampEl) {
        timestampEl.textContent = `Synced: ${new Date().toLocaleTimeString('en-IN')}`;
      }

      updateStats();
      applyFiltersAndSearch();

    } catch (err) {
      console.error('[Admin] Supabase query failure:', err);
      showNotice(
        err.message || 'Failed to fetch registration records from Supabase.',
        'error'
      );
      allRegistrations = [];
      filteredRegistrations = [];
      updateStats();
      renderTable([]);
    } finally {
      finishLoading();
    }
  }

  function finishLoading() {
    isLoading = false;
    const refreshBtn = el('refreshBtn');
    const refreshText = el('refreshBtnText');
    if (refreshBtn) refreshBtn.disabled = false;
    if (refreshText) refreshText.textContent = 'REFRESH DATA';
  }

  /**
   * Update statistics cards from real data (Zero fake numbers)
   */
  function updateStats() {
    const statTotal = el('statTotal');
    const statStartupSpark = el('statStartupSpark');
    const statProjectExpo = el('statProjectExpo');
    const statBugHunters = el('statBugHunters');
    const statPromptMaster = el('statPromptMaster');
    const statCinespark = el('statCinespark');
    const statMemeCreation = el('statMemeCreation');
    const statLogoHunting = el('statLogoHunting');
    const statVideoQuiz = el('statVideoQuiz');

    // Total registrations
    const total = allRegistrations.length;
    if (statTotal) statTotal.textContent = total;

    // Helper to count by event id / name
    function countForEvent(idKeyword, nameKeyword) {
      return allRegistrations.filter(r => {
        const evId = (r.event_id || '').toLowerCase();
        const evName = (r.event_name || '').toLowerCase();
        return evId === idKeyword || evName.includes(nameKeyword);
      }).length;
    }

    if (statStartupSpark) statStartupSpark.textContent = countForEvent('startup-spark', 'startup spark');
    if (statProjectExpo) statProjectExpo.textContent = countForEvent('project-expo', 'project expo');
    if (statBugHunters) statBugHunters.textContent = countForEvent('bug-hunters', 'bug hunters');
    if (statPromptMaster) statPromptMaster.textContent = countForEvent('prompt-master', 'prompt master');
    if (statCinespark) statCinespark.textContent = countForEvent('cinespark', 'cinespark');
    if (statMemeCreation) statMemeCreation.textContent = countForEvent('meme-creation', 'meme creation');
    if (statLogoHunting) statLogoHunting.textContent = countForEvent('logo-hunting', 'logo hunting');
    if (statVideoQuiz) statVideoQuiz.textContent = countForEvent('video-quiz', 'video quiz');

    const totalCounter = el('totalRecordCount');
    if (totalCounter) totalCounter.textContent = total;
  }

  /**
   * Search and Filter Handler
   */
  function applyFiltersAndSearch() {
    const searchInput = el('adminSearchInput');
    const eventFilter = el('adminEventFilter');
    const deptFilter = el('adminDeptFilter');
    const yearFilter = el('adminYearFilter');
    const statusFilter = el('adminStatusFilter');
    const clearBtn = el('clearSearchBtn');

    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedEvent = eventFilter ? eventFilter.value : 'ALL';
    const selectedDept = deptFilter ? deptFilter.value : 'ALL';
    const selectedYear = yearFilter ? yearFilter.value : 'ALL';
    const selectedStatus = statusFilter ? statusFilter.value.toLowerCase() : 'ALL';

    if (clearBtn) {
      clearBtn.style.display = q ? 'block' : 'none';
    }

    filteredRegistrations = allRegistrations.filter(r => {
      // 1. Search by Student Name, Register Number, Email
      const name = (r.full_name || '').toLowerCase();
      const roll = (r.register_number || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      const regId = (r.registration_id || '').toLowerCase();

      const matchesSearch = !q || (
        name.includes(q) ||
        roll.includes(q) ||
        email.includes(q) ||
        regId.includes(q)
      );

      // 2. Filter by Event
      const evId = (r.event_id || '').toLowerCase();
      const matchesEvent = selectedEvent === 'ALL' || evId === selectedEvent.toLowerCase();

      // 3. Filter by Department
      const dept = (r.department || '').trim();
      const matchesDept = selectedDept === 'ALL' || dept === selectedDept;

      // 4. Filter by Year
      const year = (r.year || '').trim();
      const matchesYear = selectedYear === 'ALL' || year === selectedYear;

      // 5. Filter by Status
      const status = (r.status || 'registered').toLowerCase();
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus;

      return matchesSearch && matchesEvent && matchesDept && matchesYear && matchesStatus;
    });

    const recordCountEl = el('recordCount');
    if (recordCountEl) recordCountEl.textContent = filteredRegistrations.length;

    renderTable(filteredRegistrations);
  }

  /**
   * Render the 12-column table
   */
  function renderTable(list) {
    const tableBody = el('regTableBody');
    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="12" class="text-center py-5">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
            <p style="color:var(--text-secondary); font-weight:600;">No registration records found.</p>
            <p style="color:var(--text-muted); font-size:0.85rem;">Try modifying your search keywords or filter criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = list.map((r, idx) => {
      const regId = escapeHtml(r.registration_id || r.id);
      const name = escapeHtml(r.full_name);
      const roll = escapeHtml(r.register_number);
      const dept = escapeHtml(r.department);
      const year = escapeHtml(r.year);
      const section = r.section ? escapeHtml(r.section) : '—';
      const email = escapeHtml(r.email);
      const phone = escapeHtml(r.phone);
      const eventName = escapeHtml(r.event_name);
      const teamName = r.team_name ? escapeHtml(r.team_name) : '<span class="text-muted">Solo</span>';
      const status = (r.status || 'registered').toLowerCase();

      // Format registration date
      let dateStr = '—';
      if (r.registration_date) {
        const d = new Date(r.registration_date);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }

      // Department badge classes
      const deptClass = `dept-${dept.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      // Status chip class
      const chipClass = `chip-${status}`;

      return `
        <tr class="clickable-row" onclick="window.SYM_ADMIN.openDetailModal('${escapeHtml(r.id)}')" title="Click to view details">
          <td><code class="reg-id-cell">${regId}</code></td>
          <td><strong class="student-name-cell">${name}</strong></td>
          <td><code class="roll-cell">${roll}</code></td>
          <td><span class="badge badge-dept ${deptClass}">${dept}</span></td>
          <td class="cell-nowrap">${year}</td>
          <td class="text-center">${section}</td>
          <td class="email-cell" title="${email}">${email}</td>
          <td class="cell-nowrap">${phone}</td>
          <td><strong class="event-name-cell">${eventName}</strong></td>
          <td>${teamName}</td>
          <td><span class="status-chip ${chipClass}">${escapeHtml(status.toUpperCase())}</span></td>
          <td class="cell-nowrap cell-date">${dateStr}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Modal: Open Detailed View
   */
  function openDetailModal(id) {
    const record = allRegistrations.find(r => r.id === id);
    if (!record) return;

    activeDetailRecord = record;

    if (el('modalStudentName')) el('modalStudentName').textContent = record.full_name || '—';
    if (el('modalRegId')) el('modalRegId').textContent = record.registration_id || record.id;
    if (el('modalRegisterNo')) el('modalRegisterNo').textContent = record.register_number || '—';
    if (el('modalDept')) el('modalDept').textContent = record.department || '—';
    if (el('modalYear')) el('modalYear').textContent = record.year || '—';
    if (el('modalSection')) el('modalSection').textContent = record.section || 'Not specified';

    const emailEl = el('modalEmail');
    if (emailEl) {
      emailEl.textContent = record.email || '—';
      emailEl.href = record.email ? `mailto:${record.email}` : '#';
    }

    const phoneEl = el('modalPhone');
    if (phoneEl) {
      phoneEl.textContent = record.phone || '—';
      phoneEl.href = record.phone ? `tel:${record.phone}` : '#';
    }

    if (el('modalEventName')) el('modalEventName').textContent = record.event_name || record.event_id || '—';

    // Team Details
    const teamBox = el('modalTeamBox');
    const teamDetails = el('modalTeamDetails');
    if (teamDetails) {
      if (record.team_name) {
        let membersHtml = '';
        if (record.team_members) {
          try {
            const parsed = typeof record.team_members === 'string' ? JSON.parse(record.team_members) : record.team_members;
            if (Array.isArray(parsed) && parsed.length > 0) {
              membersHtml = `<div class="team-members-list">Members: ${parsed.map(m => `<code class="member-chip">${escapeHtml(m)}</code>`).join(' ')}</div>`;
            }
          } catch (e) {
            membersHtml = `<div class="team-members-list">Members: ${escapeHtml(record.team_members)}</div>`;
          }
        }
        teamDetails.innerHTML = `<strong>${escapeHtml(record.team_name)}</strong> ${membersHtml}`;
      } else {
        teamDetails.textContent = 'Individual Participant (No Team)';
      }
    }

    // Status Chip
    const status = (record.status || 'registered').toLowerCase();
    const statusChip = el('modalStatusChip');
    if (statusChip) {
      statusChip.className = `status-chip chip-${status}`;
      statusChip.textContent = status.toUpperCase();
    }

    // Registration Timestamp
    if (el('modalRegDate')) {
      const d = new Date(record.registration_date);
      el('modalRegDate').textContent = !isNaN(d.getTime())
        ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';
    }

    // Status Actions
    renderModalActions(record);

    // Show backdrop
    const backdrop = el('detailModalBackdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Render quick action buttons inside Detail Modal
   */
  function renderModalActions(record) {
    const actionsBox = el('modalStatusActions');
    if (!actionsBox) return;

    const currentStatus = (record.status || 'registered').toLowerCase();

    let buttonsHtml = '';
    if (currentStatus !== 'attended') {
      buttonsHtml += `
        <button type="button" class="btn btn-sm btn-green" onclick="window.SYM_ADMIN.updateRecordStatus('${escapeHtml(record.id)}', 'attended')">
          ✓ Mark as Attended
        </button>
      `;
    } else {
      buttonsHtml += `
        <button type="button" class="btn btn-sm btn-outline" onclick="window.SYM_ADMIN.updateRecordStatus('${escapeHtml(record.id)}', 'registered')">
          ↩ Undo Check-in (Mark Registered)
        </button>
      `;
    }

    if (currentStatus !== 'cancelled') {
      buttonsHtml += `
        <button type="button" class="btn btn-sm btn-danger" onclick="window.SYM_ADMIN.updateRecordStatus('${escapeHtml(record.id)}', 'cancelled')">
          ✕ Cancel Registration
        </button>
      `;
    } else {
      buttonsHtml += `
        <button type="button" class="btn btn-sm btn-outline" onclick="window.SYM_ADMIN.updateRecordStatus('${escapeHtml(record.id)}', 'registered')">
          Re-activate Registration
        </button>
      `;
    }

    actionsBox.innerHTML = buttonsHtml;
  }

  /**
   * Close Detail Modal
   */
  function closeDetailModal() {
    const backdrop = el('detailModalBackdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    activeDetailRecord = null;
  }

  /**
   * Update Registration Status via Supabase
   */
  async function updateRecordStatus(id, newStatus) {
    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (!client) {
      alert('Supabase client is not available to perform update.');
      return;
    }

    try {
      const { error } = await client
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update in local state
      const target = allRegistrations.find(r => r.id === id);
      if (target) {
        target.status = newStatus;
        if (activeDetailRecord && activeDetailRecord.id === id) {
          activeDetailRecord.status = newStatus;
          const statusChip = el('modalStatusChip');
          if (statusChip) {
            statusChip.className = `status-chip chip-${newStatus}`;
            statusChip.textContent = newStatus.toUpperCase();
          }
          renderModalActions(target);
        }
      }

      applyFiltersAndSearch();
      showNotice(`Status updated to "${newStatus.toUpperCase()}" for ${target ? target.registration_id : id}.`, 'success');
      setTimeout(() => showNotice(null), 3500);

    } catch (err) {
      console.error('[Admin] Failed to update status:', err);
      alert('Failed to update status: ' + (err.message || err));
    }
  }

  /**
   * Client-side RFC4180 CSV Export of currently visible registrations
   */
  function exportVisibleToCSV() {
    if (filteredRegistrations.length === 0) {
      alert('No visible registrations match your filters to export.');
      return;
    }

    // All 12 requested columns
    const headers = [
      'Registration ID',
      'Name',
      'Register Number',
      'Department',
      'Year',
      'Section',
      'Email',
      'Phone',
      'Event',
      'Team',
      'Status',
      'Registration Date'
    ];

    function escapeCsv(val) {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }

    const rows = filteredRegistrations.map(r => [
      escapeCsv(r.registration_id || r.id),
      escapeCsv(r.full_name),
      escapeCsv(r.register_number),
      escapeCsv(r.department),
      escapeCsv(r.year),
      escapeCsv(r.section || ''),
      escapeCsv(r.email),
      escapeCsv(r.phone),
      escapeCsv(r.event_name),
      escapeCsv(r.team_name || 'Solo'),
      escapeCsv(r.status || 'registered'),
      escapeCsv(r.registration_date)
    ]);

    // UTF-8 BOM for perfect Excel / Google Sheets compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `ZENTRIX2026_Registrations_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Setup Event Listeners
   */
  function setupListeners() {
    // Search
    const searchInput = el('adminSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', applyFiltersAndSearch);
    }

    const clearBtn = el('clearSearchBtn');
    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        applyFiltersAndSearch();
        searchInput.focus();
      });
    }

    // Filters
    const eventFilter = el('adminEventFilter');
    const deptFilter = el('adminDeptFilter');
    const yearFilter = el('adminYearFilter');
    const statusFilter = el('adminStatusFilter');

    if (eventFilter) eventFilter.addEventListener('change', applyFiltersAndSearch);
    if (deptFilter) deptFilter.addEventListener('change', applyFiltersAndSearch);
    if (yearFilter) yearFilter.addEventListener('change', applyFiltersAndSearch);
    if (statusFilter) statusFilter.addEventListener('change', applyFiltersAndSearch);

    // Reset Filters
    const resetBtn = el('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (eventFilter) eventFilter.value = 'ALL';
        if (deptFilter) deptFilter.value = 'ALL';
        if (yearFilter) yearFilter.value = 'ALL';
        if (statusFilter) statusFilter.value = 'ALL';
        applyFiltersAndSearch();
      });
    }

    // Refresh button
    const refreshBtn = el('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', fetchRegistrations);
    }

    // Export CSV button
    const exportBtn = el('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportVisibleToCSV);
    }

    // Modal Close handlers
    const closeBtn = el('modalCloseBtn');
    const dismissBtn = el('modalDismissBtn');
    const backdrop = el('detailModalBackdrop');

    if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);
    if (dismissBtn) dismissBtn.addEventListener('click', closeDetailModal);

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeDetailModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetailModal();
    });
  }

  // Public Namespace
  window.SYM_ADMIN = {
    openDetailModal: openDetailModal,
    closeDetailModal: closeDetailModal,
    updateRecordStatus: updateRecordStatus,
    refresh: fetchRegistrations
  };

  // Init
  function init() {
    loadAdminUser();
    setupListeners();
    fetchRegistrations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
