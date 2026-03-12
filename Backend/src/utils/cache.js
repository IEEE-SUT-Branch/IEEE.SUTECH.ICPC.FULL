const store = new Map();

function get(key) {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    store.delete(key);
    return null;
  }
  return item.value;
}

function set(key, value, ttlMs = 3000) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

function del(key) {
  store.delete(key);
}

function flush() {
  store.clear();
}

module.exports = { get, set, del, flush };
