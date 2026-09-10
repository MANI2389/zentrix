/**
 * ====================================================================
 * ZENTRIX 2026 - Supabase Authentication & Authorization Controller
 * The Kavery Engineering College (Autonomous)
 * Phase 1: Internal College Symposium
 * ====================================================================
 *
 * Security Model:
 * 1. Authentication: Verified via Supabase Auth (signInWithPassword).
 * 2. Authorization: Verified via the `admin_users` table in PostgreSQL.
 *    A user who is simply "logged in" is NOT automatically an admin.
 *    Normal students or non-admin accounts are rejected with an explicit
 *    "Access Denied" error and signed out immediately.
 * 3. Database-level RLS: Even if a malicious client bypassed the frontend,
 *    Supabase RLS policies (is_admin() SECURITY DEFINER) prevent unauthorized
 *    reads, updates, and deletes.
 */

(function () {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function showAlert(message, type) {
    const container = el('loginAlert');
    if (!container) return;

    const icon = type === 'success' ? '✓' : (type === 'danger' ? '⛔' : 'ℹ️');
    container.innerHTML = `
      <div class="alert alert-${type}">
        <span>${icon}</span>
        <div>${escapeHtml(message)}</div>
      </div>
    `;
  }

  function clearAlert() {
    const container = el('loginAlert');
    if (container) container.innerHTML = '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, function (tag) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag;
    });
  }

  /**
   * Translate Supabase authentication errors into clear, friendly messages
   */
  function translateAuthError(err) {
    if (!err) return 'An unknown authentication error occurred. Please try again.';

    const msg = (err.message || '').toLowerCase();

    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'Invalid email or password. Please verify your credentials and try again.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Your email address has not been confirmed yet. Please check your inbox.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Too many login attempts. Please wait a minute before trying again.';
    }
    if (msg.includes('failed to fetch') || msg.includes('network')) {
      return 'Unable to reach the Supabase authentication server. Please check your network connection.';
    }
    if (msg.includes('user not found')) {
      return 'No administrator account found with this email address.';
    }

    return err.message || 'Login failed. Please verify your administrator credentials.';
  }

  /**
   * Set loading state on the login submit button
   */
  function setLoading(isLoading) {
    const btn = el('loginSubmitBtn');
    if (!btn) return;

    const textSpan = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');

    btn.disabled = isLoading;
    if (isLoading) {
      if (textSpan) textSpan.textContent = 'VERIFYING CREDENTIALS...';
      if (spinner) spinner.style.display = 'inline-block';
    } else {
      if (textSpan) textSpan.textContent = 'LOGIN';
      if (spinner) spinner.style.display = 'none';
    }
  }

  /**
   * Verify if a user is explicitly authorized in the admin_users table
   */
  async function verifyAdminAuthorization(client, userId) {
    if (!client || !userId) return false;

    try {
      const { data, error } = await client
        .from('admin_users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[SYM2K26 Auth] Authorization check failed:', error.message);
        return false;
      }

      return !!data && (data.role === 'admin' || data.role === 'superadmin' || data.role === 'coordinator');
    } catch (e) {
      console.warn('[SYM2K26 Auth] Exception during authorization check:', e);
      return false;
    }
  }

  /**
   * Initialize Admin Login Form Handler
   */
  function initLoginForm() {
    const form = el('adminLoginForm');
    if (!form) return;

    // Check for query parameter error on page load (e.g. redirected due to unauthorized access)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'unauthorized') {
      showAlert('Access Denied: Your account does not have administrator privileges.', 'danger');
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearAlert();

      const emailInput = el('adminEmail');
      const passwordInput = el('adminPassword');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      // Client validation
      if (!email || !password) {
        showAlert('Please enter both your administrator email and password.', 'danger');
        if (!email && emailInput) emailInput.focus();
        else if (passwordInput) passwordInput.focus();
        return;
      }

      const client = window.getSupabaseClient ? window.getSupabaseClient() : null;

      if (!client || !window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
        showAlert(
          'Supabase is not configured yet in js/config.js. ' +
          'Please set SUPABASE_URL and SUPABASE_ANON_KEY to connect to your project.',
          'danger'
        );
        return;
      }

      try {
        setLoading(true);

        // 1. Primary Authentication via Supabase Auth
        const { data, error } = await client.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          throw error;
        }

        if (!data || !data.session || !data.user) {
          throw new Error('Authentication succeeded but no active session was returned.');
        }

        // 2. Authorization Check against `admin_users` table
        // A standard logged in user / student is NOT authorized as an admin!
        const isAuthorized = await verifyAdminAuthorization(client, data.user.id);

        if (!isAuthorized) {
          // Immediately terminate the unauthorized session
          await client.auth.signOut();
          showAlert(
            'Access Denied: The account "' + email + '" is authenticated in Supabase but is NOT registered in the admin_users authorization table. Please contact the ZENTRIX 2026 organizers.',
            'danger'
          );
          setLoading(false);
          return;
        }

        // 3. Authorized Admin Verified
        showAlert('✓ Administrator verified! Redirecting to Command Center...', 'success');
        setTimeout(function () {
          window.location.replace('admin.html');
        }, 500);

      } catch (err) {
        console.error('[SYM2K26 Auth] Login failed:', err.message || err);
        showAlert(translateAuthError(err), 'danger');
        setLoading(false);
      }
    });
  }

  /**
   * Route Guard:
   * 1. Protects admin.html: Unauthenticated OR non-admin accounts are signed out and redirected to login.html
   * 2. Protects login.html: Already authenticated and authorized admins are forwarded to admin.html
   */
  async function checkAuthGuard() {
    const path = window.location.pathname.toLowerCase();
    const isAdminPage = path.endsWith('admin.html') || path.endsWith('/admin');
    const isLoginPage = path.endsWith('login.html') || path.endsWith('/login');

    if (!isAdminPage && !isLoginPage) return;

    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;

    if (!client) {
      if (isAdminPage) {
        window.location.replace('login.html');
      }
      return;
    }

    try {
      const { data: { session }, error } = await client.auth.getSession();

      if (error || !session || !session.user) {
        if (isAdminPage) {
          window.location.replace('login.html');
        }
        return;
      }

      // Re-verify authorization in admin_users
      const isAuthorized = await verifyAdminAuthorization(client, session.user.id);

      if (isAdminPage) {
        if (!isAuthorized) {
          // User is authenticated but NOT an authorized administrator
          await client.auth.signOut();
          window.location.replace('login.html?error=unauthorized');
          return;
        }

        // Listen for session sign out
        client.auth.onAuthStateChange(function (event, updatedSession) {
          if (event === 'SIGNED_OUT' || !updatedSession) {
            window.location.replace('login.html');
          }
        });

      } else if (isLoginPage) {
        if (isAuthorized) {
          // Already signed in with admin privileges
          window.location.replace('admin.html');
        } else {
          // Signed in as non-admin, force sign-out
          await client.auth.signOut();
        }
      }

    } catch (e) {
      console.warn('[SYM2K26 Auth] Auth guard exception:', e);
      if (isAdminPage) {
        window.location.replace('login.html');
      }
    }
  }

  /**
   * Logout Functionality
   * Signs out from Supabase Auth and redirects to login.html
   */
  window.adminSignOut = async function () {
    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;

    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('[SYM2K26 Auth] Sign out error:', err);
      }
    }

    window.location.replace('login.html');
  };

  // Expose authorization helper
  window.verifyAdminAuthorization = verifyAdminAuthorization;

  // Entry Point
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initLoginForm();
      checkAuthGuard();
    });
  } else {
    initLoginForm();
    checkAuthGuard();
  }

})();
