// Minimal app-native toast bus. Lets any component raise a toast without
// threading a callback through every layer. App subscribes once and renders
// the toast from its own state. Use this instead of window.alert anywhere.

let listener = null;

export function subscribeToast(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}

// showToast("Gespeichert") for success, showToast(msg, { error: true }) for errors.
export function showToast(message, { error = false, duration = 4000 } = {}) {
  if (listener) listener({ message, error, duration });
  else console.warn("[toast: no listener]", message);
}
