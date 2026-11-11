# Averox website: notes for the owner

Static site (HTML/CSS/JS, no build step). Upload the folder (or the zip) to any static host, e.g. Render static site.

## Before going live: fill these in
All in **`js/config.js`**:

1. **Booking emails.** The form needs a form service, because a static site can't send email by itself.
   - Web3Forms (free): go to web3forms.com, enter the email that should receive bookings, paste the access key into `web3formsKey`.
   - or Formspree: paste the form endpoint into `formspreeEndpoint`.
   - Until one is filled in, the form runs in **preview mode**: it shows the "sent" screen with a note that nothing was sent.
   - Each booking email contains: from, to, when (or "As soon as possible"), passengers (1–4 / goods), starting fee at that time, name, phone, email, notes, language.
2. **Phone and email.** `phone` and `email` show Call / email links in the closing section and footer. Empty = hidden. A taxi site really should show a phone number.
3. **Share image domain.** In `index.html`, `og:image` points to `https://averox.onrender.com/media/share.jpg`. Change it to the real address once the site is deployed (it must be an absolute URL).
4. **Rates** also live in `config.js`; the price list, meter, map estimates and booking fee all follow them.

## Facts used
- Rates from the client: start €6.00 weekdays 07–18, €8.50 other times; €1.25/km (1–4), €2.11/km (5–8); €1.15/min. VAT 14 % passengers, 25.5 % goods.
- Example trip checked: 6.00 + 15 × 1.15 (17.25) + 10 × 1.25 (12.50) = **€35.75**. The meter defaults to this trip.
- Fleet: one sedan (1–4 passengers), per Thishan on 2026-11-11. The 5–8 rate (€2.11/km) is **not shown** anywhere on the site. It stays as `kmLarge` in `config.js`. If a van is added later, ask Claude to bring back the 5–8 options and the van 3D model (the files are kept outside the site folder).
- Service area: Pirkanmaa (23 municipalities, Statistics Finland 2025 borders).

## Changed from the client's text
- The price text said "Uniform pricing applies throughout the entire **TamCab** service area" (FI: "koko TamCabin palvelualueella"). That looks copied from another company. The site says "Averox service area" instead. Confirm with the client.

## Open questions for the client
- Are public holidays (arkipyhät) charged at the "other times" starting fee? The meter treats Mon–Fri 07–18 as day rate and everything else as other times; holidays aren't handled.
- Goods transport: same km/min rates as passengers (only VAT differs), or a separate price list? The site only says goods prices include 25.5 % VAT.
- Phone number, email, business ID (Y-tunnus), opening hours / 24-7, payment methods, real fleet. None of these were given, so none are claimed.
- Do they want a privacy notice page? The form collects name and phone; a short tietosuojaseloste is normally expected in Finland.

## Media
- All photos and both 3D vehicles are AI-generated with Higgsfield (gpt_image_2_6, Tripo H3.1 image-to-3D). They are illustrative: no real Averox car, plate or driver. Replace with the client's own fleet photos when available (same filenames in `media/`).
- Two early images showed a Helsinki-looking cathedral dome; they were regenerated without landmarks.
- Map borders: Statistics Finland (CC BY 4.0). Road distances and drive times: OSRM / OpenStreetMap (ODbL), computed once on 2026-11-11 from Keskustori, without traffic. Credits are shown under the map.
- Fonts are self-hosted (Funnel Display, Funnel Sans, Doto; SIL OFL), so no Google Fonts requests.

## Files
- `index.html` page · `css/site.css` styles · `js/config.js` settings · `js/i18n.js` all EN/FI text · `js/app.js` booking, meter, map, language · `js/fleet.js` 3D · `js/mapdata.js` generated map.
- 3D: `media/sedan.glb` (desktop, ~1 MB) and `sedan-m.glb` (phones, ~0.55 MB), meshopt-compressed; loaded only near the fleet section.
