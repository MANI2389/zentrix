/**
 * ZENTRIX 2026 – Supabase Configuration
 * The Kavery Engineering College (Autonomous)
 *
 * ─────────────────────────────────────────────────────────────
 *  HOW TO SET UP:
 *  1. Go to https://supabase.com → your project → Settings → API
 *  2. Copy "Project URL"  →  paste as SUPABASE_URL below
 *  3. Copy "anon / public" key  →  paste as SUPABASE_ANON_KEY below
 *  4. Save this file.
 *
 *  ⚠️  NEVER use the service_role key here. Anon key only.
 *  ⚠️  Do NOT commit real credentials to a public git repository.
 *      Add js/config.js to .gitignore for production deployments
 *      and use Vercel Environment Variables instead.
 * ─────────────────────────────────────────────────────────────
 */

/* ────────────────────────────────────────────
   PASTE YOUR CREDENTIALS BELOW
   ──────────────────────────────────────────── */
  const SUPABASE_URL = 'https://zcknvaipgfluhbjbmufz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpja252YWlwZ2ZsdWhiamJtdWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDAzNDEsImV4cCI6MjEwNDYxNjM0MX0.Zirk2BFf2KasI98OYMJxTQIy_XCWNomLwScHWfCUuCQ';
  
/* ────────────────────────────────────────────
   DO NOT EDIT BELOW THIS LINE
   ──────────────────────────────────────────── */

/**
 * Event & college metadata constants.
 * Used across pages for display purposes.
 */
const SYMPOSIUM_META = {
  eventName   : 'ZENTRIX 2026',
  collegeName : 'THE KAVERY ENGINEERING COLLEGE (AUTONOMOUS)',
  location    : 'M.Kalipatti, Mecheri, Salem - 636453, Tamil Nadu',
  eventDate   : '2026-09-24T09:00:00+05:30',   // 24 Sep 2026, 09:00 AM IST
  eventDateLabel: '24 September 2026',
  registrationFee: 150,
  upiId      : 'vasukixlnc@okaxis',
  accountName: 'Vasuki Rajkumar',
  paymentQr  : 'https://zentrix-rho.vercel.app/qr-code.jpg',
  whatsappHelp: 'https://wa.me/917904708317?text=Hi%20ZENTRIX%202K26%20team',
  whatsappGroup: 'https://chat.whatsapp.com/EAyCJCpGljE58YpA4cRGHy',
  phase       : 'PHASE 1 - INTERNAL',
};

/* ────────────────────────────────────────────
   Internal: track initialisation state
   ──────────────────────────────────────────── */

let _supabaseClient = null;
let _initError      = null;

/**
 * Returns true when the user has replaced the placeholder credentials.
 */
function isSupabaseConfigured() {
  return (
    typeof SUPABASE_URL      === 'string' &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_URL.trim()      !== '' &&
    SUPABASE_ANON_KEY.trim() !== '' &&
    !SUPABASE_URL.includes('YOUR_SUPABASE')      &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')
  );
}

/**
 * Returns a singleton Supabase client.
 *
 * Returns null (never throws) if:
 *   – credentials have not been configured yet
 *   – the @supabase/supabase-js CDN script has not loaded
 *   – createClient() itself threw an error
 *
 * Callers must guard against a null return value.
 */
function getSupabaseClient() {
  // Return cached instance
  if (_supabaseClient) return _supabaseClient;

  // Don't retry after a hard failure
  if (_initError) return null;

  // Credentials not replaced yet
  if (!isSupabaseConfigured()) {
    return null;
  }

  // CDN script not yet loaded
  if (typeof window.supabase === 'undefined' ||
      typeof window.supabase.createClient !== 'function') {
    console.warn('[SYM2K26] Supabase CDN not loaded. Ensure the <script> tag is present in <head>.');
    return null;
  }

  try {
    _supabaseClient = window.supabase.createClient(
      SUPABASE_URL.trim(),
      SUPABASE_ANON_KEY.trim(),
      {
        auth: {
          // Persist the admin session in localStorage between page reloads
          persistSession    : true,
          // Automatically refresh the JWT before it expires
          autoRefreshToken  : true,
          // Detect OAuth redirects (used for admin login)
          detectSessionInUrl: true,
        },
      }
    );
    return _supabaseClient;
  } catch (err) {
    _initError = err;
    console.error('[SYM2K26] Failed to initialise Supabase client. Check your URL and Anon Key.');
    return null;
  }
}

/* ────────────────────────────────────────────
   Expose globals (no framework needed)
   ──────────────────────────────────────────── */
window.SUPABASE_URL         = SUPABASE_URL;
window.SYMPOSIUM_META       = SYMPOSIUM_META;
window.isSupabaseConfigured = isSupabaseConfigured;
window.getSupabaseClient    = getSupabaseClient;
