// ─────────────────────────────────────────────────────────────
// Averox site settings. This is the only file the owner needs to edit.
// ─────────────────────────────────────────────────────────────
window.AVEROX = {
  // Booking form delivery. Pick ONE provider and fill in its value.
  //
  // Web3Forms (free, no account): go to https://web3forms.com, enter the
  // email address that should receive bookings, and paste the access key here.
  web3formsKey: "",
  //
  // …or Formspree: create a form at https://formspree.io and paste its
  // endpoint here, e.g. "https://formspree.io/f/abcdwxyz".
  formspreeEndpoint: "",

  // Contact details. Leave empty to hide the call / email buttons.
  phone: "",          // e.g. "+358 40 123 4567"
  email: "",          // e.g. "tilaukset@averox.fi"

  // Rates (VAT included). Change here and the whole site follows.
  rates: {
    startDay: 6.00,     // weekdays 07:00–18:00
    startOther: 8.50,   // all other times
    kmSmall: 1.25,      // 1–4 passengers
    kmLarge: 2.11,      // 5–8 passengers
    perMin: 1.15
  }
};
