// Chapter palettes for the 3D scene. Needs THREE. Browser: W.ScenePal = { PAL, hex, WARPC, TWC }.
(function (root) {
  const T = root.THREE;
  const hex = (c) => { const k = new T.Color(c); return [k.r, k.g, k.b]; };
  const mix = (a, b, t) => '#' + new T.Color(a).lerp(new T.Color(b), t).getHexString();
  // One palette per chapter: tile faces (top, x-faces, z-faces), glow behind the scene, backdrop (deep top, light bottom); sun, sky and bounce light derive from them.
  const P = (t, l, r, glow, bgDeep, bgLight) => ({ t, l, r, glow, top: bgDeep, bot: mix(bgDeep, bgLight, 0.55), sun: mix('#FFFFFF', '#F2E6CC', 0.5), sky: mix('#C8D8CF', bgLight, 0.5), gnd: mix(bgDeep, r, 0.5) });
  const PAL = {
    1: P('#DDD4B8', '#ABA187', '#615B49', '#EDE4CF', '#0B2D20', '#1F6A4A'),   // bone stone on deep forest green
    2: P('#3E6B5A', '#244639', '#12281F', '#74C4A5', '#07100E', '#17402F'),   // emerald night (calmer jade)
    3: P('#9A664E', '#6A4233', '#3A241D', '#D0713F', '#0D0A09', '#38261C'),   // rust marble, ember sky
    4: P('#8FB5A3', '#587A6B', '#2F4A3E', '#BFE3D0', '#0C1815', '#2C5245'),   // mist
    5: P('#B9C2BA', '#7F8A89', '#434D52', '#CFE6E8', '#091821', '#2B5A6C'),   // cold slate-teal dusk
    6: P('#6E4650', '#442A36', '#271720', '#C45A7C', '#0C070B', '#2E1426'),   // plum-wine, desaturated
    7: P('#C9CFCA', '#8D9490', '#4C5350', '#9FE3C8', '#09110F', '#1F322A'),   // mirror
  };
  root.W = root.W || {};
  root.W.ScenePal = { PAL, hex, WARPC: ['#A98BFF', '#D0B6FF'], TWC: 0x5CCFE6 };
})(typeof window !== 'undefined' ? window : globalThis);
