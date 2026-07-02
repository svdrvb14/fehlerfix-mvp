/**
 * Supabase-Datenbank-Client.
 *
 * Der Server nutzt den service_role-Key → voller Zugriff, umgeht Row-Level-Security.
 * NUR serverseitig verwenden, niemals ans Frontend geben.
 *
 * Wenn die Supabase-Env-Variablen NICHT gesetzt sind (z.B. lokal ohne Key),
 * ist `isDbEnabled` false und die App läuft im bisherigen Gast-/In-Memory-Modus
 * weiter – nichts crasht.
 */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Platzhalter aus .env.example zählt nicht als "gesetzt"
const configured =
  Boolean(url && key) &&
  !/^HIER_|dein-service-role/i.test(key || '');

const supabase = configured
  ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const isDbEnabled = Boolean(supabase);

if (!isDbEnabled) {
  console.warn('[db] Supabase nicht konfiguriert – App läuft im Gast-Modus (In-Memory, keine Logins).');
} else {
  console.log('[db] Supabase verbunden.');
}

module.exports = { supabase, isDbEnabled };
