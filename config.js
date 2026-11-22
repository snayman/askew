// Vantage configuration. Everything here is optional; with the defaults the whole game is free.
//
// To sell the full version WITHOUT any portal or store SDK:
//   1. Create a payment page you own and put its address in buyUrl. The moment buyUrl is set, chapters after
//      `freeChapters` ask for a licence and the "Full version" offer appears.
//   2. Once:  node src/tools/keygen.js init     (makes a signing key pair; the PRIVATE key stays in ~/.vantage-keys, the public key is written below)
//   3. After each payment:  SITE=https://your-site.example node src/tools/keygen.js make 1 "buyer@mail.com"
//      It prints a licence (and an activation link). Send it to the buyer. The game checks the signature with the public key,
//      so nobody can invent licences without your private key. A licence can still be shared by its owner (it is not tied to a device).
// supportUrl adds a quiet "Support the author" button in Settings (donation page); leave empty to hide it.
(function (root) {
  const V = (root.V = root.V || {});
  V.config = { buyUrl: '', supportUrl: '', freeChapters: 2, price: '', pub: {"kty":"EC","crv":"P-256","x":"g2ZhD2gycZHpytGb6_0VOJDkp1lw7xjysZRuqBm3CFA","y":"asgBbSzsO1ZlnNj19FvkG2VS8bZ5_Etkyt8zP850-68"} };
  const dec = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  // licence = base64url(JSON payload) + '.' + base64url(ECDSA P-256 signature of the first part). Needs a secure context (https or localhost).
  V.license = {
    clean(raw) { let s = String(raw || '').trim(); const i = s.indexOf('lic='); if (i >= 0) s = s.slice(i + 4); return s.replace(/[\s&,#].*$/, '').replace(/\s+/g, ''); },
    async check(raw) {
      try {
        const tok = this.clean(raw), parts = tok.split('.'); if (parts.length !== 2 || !V.config.pub) return false;
        const c = root.crypto || (typeof require !== 'undefined' && require('crypto').webcrypto);
        const key = await c.subtle.importKey('jwk', V.config.pub, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        return await c.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, dec(parts[1]), new TextEncoder().encode(parts[0]));
      } catch (e) { return false; }
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
