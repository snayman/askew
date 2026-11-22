// Askew configuration. Free chapters are the same in every build; the purchase itself is provided by the native
// wrapper (Capacitor etc.) as V.store = { owned(), buy(), restore(), price() }, all returning Promises. In a plain browser there is no store and the whole game is open.
(function (root) {
  const V = (root.V = root.V || {});
  V.config = { freeChapters: 2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
