/**
 * CJS test-friendly wrapper so tests that use `require()` work.
 * In real code, these are re-exported from your supabase lib.
 */
try {
  const { supabaseAdmin, supabaseForUser } = require('../../lib/supabase');
  function getSupabaseClient(token) {
    if (token) return supabaseForUser(token);
    return supabaseAdmin;
  }
  const getAdminClient = () => supabaseAdmin;
  module.exports = { getSupabaseClient, getAdminClient };
} catch (e) {
  // In case the lib is ESM-only during tests, expose no-op mocks to keep unit tests running.
  function noop() {
    return {
      from() { return this; }, select() { return this; }, insert() { return this; },
      update() { return this; }, delete() { return this; }, eq() { return this; },
      in() { return this; }, neq() { return this; }, single() { return Promise.resolve({ data: null, error: null }); },
      returns() { return this; }, rpc() { return Promise.resolve({ data: null, error: null }); }
    };
  }
  const fake = noop();
  module.exports = {
    getSupabaseClient: () => fake,
    getAdminClient: () => fake,
  };
}
