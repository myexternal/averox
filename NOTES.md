# Averox website: notes for the owner

Static site (HTML/CSS/JS, no build step). Upload the folder (or the zip) to any static host, e.g. Render static site.

## Before going live: fill these in
All in **`js/config.js`**:

1. **Booking emails: set to hello@averox.fi** (`bookingEmail`). A static site can't send email itself, so bookings go through FormSubmit (formsubmit.co, free, no account).
   - **One-time activation:** the first booking sent from the live site makes FormSubmit email an "Activate Form" link to hello@averox.fi. Click it. Bookings are delivered from then on. Until it is clicked, the form shows its "couldn't send" message, so nobody gets a false confirmation.
   - Each email is a table in Finnish: Mistä, Minne, Milloin, Matkustajat, Aloitusmaksu, Nimi, Puhelin, Sähköposti, Lisätiedot, Asiakkaan kieli. Replying goes to the customer if they gave an email.
   - Alternatives: a Web3Forms key (`web3formsKey`) or a Formspree endpoint (`formspreeEndpoint`) is used first if filled in. With all three empty, the form runs in preview mode.
2. **Phone and email.** `email` is set to hello@averox.fi and shows in the closing section and footer. `phone` is still empty (hidden). A taxi site really should show a phone number.
3. **Share image domain.** In `index.html`, `og:image` points to `https://averox.onrender.com/media/share.jpg`. Change it to the real address once the site is deployed (it must be an absolute URL).
4. **Rates** also live in `config.js`; the price list, meter, map estimates and booking fee all follow them.

## Language
- **Finnish is the primary language** (client, 2026-11-11). The page loads in Finnish for everyone, and the HTML itself is written in Finnish (`lang="fi"`, title, share text). English shows only when a visitor taps EN (remembered on that device) or opens `?lang=en`. All text lives in `js/i18n.js`.

## Facts used
- Rates from the client: start €6.00 weekdays 07–18, €8.50 other times; €1.25/km (1–4), €2.11/km (5–8); €1.15/min. VAT 14 % passengers, 25.5 % goods.
- Example trip checked: 6.00 + 15 × 1.15 (17.25) + 10 × 1.25 (12.50) = **€35.75**. The meter defaults to this trip.
- Fleet: one car, a **2026 Kia Ceed Sportswagon** (estate / farmari, 1–4 passengers), per the client on 2026-11-11. The 5–8 rate (€2.11/km) is **not shown** anywhere on the site. It stays as `kmLarge` in `config.js`. If a van is added later, ask Claude to bring back the 5–8 options and the van 3D model (the files are kept outside the site folder).
- Service area: **from Tampere to anywhere in Finland**, Helsinki Airport included (client, 2026-11-11). The map shows Finland's 19 regions (Statistics Finland 2025 borders). Clicking a region picks its main town. The list covers Helsinki Airport, Tampere Airport and 17 region capitals, each with the road distance from Keskustori and a weekday estimate.
- Long trips are shown at meter rates, e.g. Helsinki Airport ≈ €361 and Rovaniemi ≈ €1,571. If Averox offers fixed prices for long trips, the site should say so.

## Changed from the client's text
- The price text said "Uniform pricing applies throughout the entire **TamCab** service area" (FI: "koko TamCabin palvelualueella"). That looks copied from another company. The site says "Averox service area" instead. Confirm with the client.

## Open questions for the client
- Are public holidays (arkipyhät) charged at the "other times" starting fee? The meter treats Mon–Fri 07–18 as day rate and everything else as other times; holidays aren't handled.
- Goods transport: same km/min rates as passengers (only VAT differs), or a separate price list? The site only says goods prices include 25.5 % VAT.
- Phone number, email, business ID (Y-tunnus), opening hours / 24-7, payment methods, real fleet. None of these were given, so none are claimed.
- Do they want a privacy notice page? The form collects name and phone; a short tietosuojaseloste is normally expected in Finland.

## Media
- All photos are AI-generated with Higgsfield (gpt_image_2_6). The hero, airport, goods and fleet photos show a black Kia Ceed Sportswagon, but they are not photos of Averox's own car (colour, plate and details may differ). Replace with the client's own fleet photos when available (same filenames in `media/`).
- Two early images showed a Helsinki-looking cathedral dome; they were regenerated without landmarks.
- Map borders: Statistics Finland (CC BY 4.0). Road distances and drive times: OSRM / OpenStreetMap (ODbL), computed once on 2026-11-11 from Keskustori, without traffic. Credits are shown under the map.
- Fonts are self-hosted (Funnel Display, Funnel Sans, Doto; SIL OFL), so no Google Fonts requests.

## Files
- 3D is switched off: the old model was a generic sedan. To bring the turntable back, make a 3D model of the real car (Higgsfield Tripo, 9 credits, best from a real side photo), save it as `media/car.glb` + `media/car-m.glb`, and set `fleet3d: true` in `config.js`.
- `index.html` page · `css/site.css` styles · `js/config.js` settings · `js/i18n.js` all EN/FI text · `js/app.js` booking, meter, map, language · `js/fleet.js` 3D · `js/mapdata.js` generated map.
