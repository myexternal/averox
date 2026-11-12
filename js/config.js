// ─────────────────────────────────────────────────────────────
// Averox site settings. This is the only file the owner needs to edit.
// ─────────────────────────────────────────────────────────────
window.AVEROX = {
  // Booking form delivery. bookingEmail works with no account: the first booking sends an
  // "Activate Form" email from FormSubmit to this address, and bookings arrive once it is clicked.
  bookingEmail: "hello@averox.fi",
  //
  // Optional instead (used first if filled in): one of these two providers.
  //
  // Web3Forms (free, no account): go to https://web3forms.com, enter the
  // email address that should receive bookings, and paste the access key here.
  web3formsKey: "",
  //
  // …or Formspree: create a form at https://formspree.io and paste its
  // endpoint here, e.g. "https://formspree.io/f/abcdwxyz".
  formspreeEndpoint: "",

  // 3D car in the fleet section. Keep false until media/car.glb (a 3D model of the real car) exists.
  fleet3d: false,

  // Contact details. Leave empty to hide the call / email buttons.
  phone: "",          // e.g. "+358 40 123 4567"
  email: "hello@averox.fi",

  // Rates (VAT included). Change here and the whole site follows.
  rates: {
    startDay: 6.00,     // weekdays 07:00–18:00
    startOther: 8.50,   // all other times
    kmSmall: 1.25,      // 1–4 passengers
    kmLarge: 2.11,      // 5–8 passengers
    perMin: 1.15
  },

  // Goods: the price list gives VAT-inclusive rates for passengers (VAT 14 %) and says goods carry VAT 25.5 %.
  // The booking estimate assumes the same net rates, so goods = passenger price × 1.255 / 1.14. Set to 1 if goods cost the same.
  goodsFactor: 1.255 / 1.14,

  // Address suggestions in "Tilaa kyyti". Empty: OpenStreetMap suggestions after the customer pauses typing.
  // For suggestions while typing, like Google Maps: the address of the Averox Cloudflare Worker, e.g.
  // "https://averox-geo.yourname.workers.dev". The Worker holds the Digitransit key as a secret, so no key is ever in
  // these files or in the browser. Setup: see averox-geo-worker/README.md.
  geoProxy: "https://averox-geo.crimson-thunder-9945.workers.dev"
};
