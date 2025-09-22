
function noop() {
  return {
    from() { return this; },
    select() { return this; },
    insert() { return this; },
    update() { return this; },
    delete() { return this; },
    eq() { return this; },
    in() { return this; },
    neq() { return this; },
    single() { return Promise.resolve({ data: null, error: null }); },
    rpc() { return Promise.resolve({ data: null, error: null }); }
  };
}

const fake = noop();

function getSupabaseClient() { return fake; }
function getAdminClient() { return fake; }

module.exports = { getSupabaseClient, getAdminClient };
