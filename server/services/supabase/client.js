// Minimal chainable fake client
function makeFake() {
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
    rpc() { return Promise.resolve({ data: null, error: null }); },
  };
}

let _current = makeFake();

function getSupabaseClient() {
  return _current;
}

// Allow tests to do: getSupabaseClient.mockReturnValue(fake)
getSupabaseClient.mockReturnValue = function (val) {
  _current = val;
  return getSupabaseClient;
};

function getAdminClient() {
  return _current;
}

module.exports = { getSupabaseClient, getAdminClient };