const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create the real client when credentials are present. Otherwise export a
// lightweight stub that fails fast on auth calls, so the app still boots and
// non-auth routes keep working without Supabase configured.
let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  const notConfigured = async () => ({
    data: { user: null, session: null },
    error: { message: "Supabase is not configured (missing SUPABASE_URL / SUPABASE_KEY)" },
  });
  supabase = {
    auth: {
      signUp: notConfigured,
      signInWithPassword: notConfigured,
      getUser: notConfigured,
      signOut: notConfigured,
    },
  };
}

module.exports = { supabase };
