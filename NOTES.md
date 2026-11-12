# Averox website: notes for the owner

Static site (HTML/CSS/JS, no build step). Upload the folder (or the zip) to any static host, e.g. Render static site.

## Before going live: fill these in
All in **`js/config.js`**:

1. **Booking emails: set to hello@averox.fi** (`bookingEmail`). A static site can't send email itself, so bookings go through FormSubmit (formsubmit.co, free, no account).
   - **One-time activation:** the first booking sent from the live site makes FormSubmit email an "Activate Form" link to hello@averox.fi. Click it. Bookings are delivered from then on. Until it is clicked, the form shows its "couldn't send" message, so nobody gets a false confirmation.
   - The activation email comes from FormSubmit (submissions@formsubmit.co) and often lands in **spam/junk**. Look there first.
   - If sending ever fails, the form keeps what was typed and offers "Lähetä se sähköpostilla", which opens the customer's email app with the booking already filled in, addressed to hello@averox.fi.
   - Each email is a table in Finnish: Mistä, Minne, Milloin, Matkustajat, Aloitusmaksu, Nimi, Puhelin, Sähköposti, Lisätiedot, Asiakkaan kieli. Replying goes to the customer if they gave an email.
   - Alternatives: a Web3Forms key (`web3formsKey`) or a Formspree endpoint (`formspreeEndpoint`) is used first if filled in. With all three empty, the form runs in preview mode.
2. **Phone and email.** `email` is set to hello@averox.fi and shows in the closing section and footer. `phone` is still empty (hidden). A taxi site really should show a phone number.
3. **Domain: averox.fi** (2026-11-12). `index.html` uses `https://averox.fi/` for the canonical link, `og:url` and the share image (`https://averox.fi/media/share.jpg`). If the main address becomes www.averox.fi instead, change those three. The address-suggestion Worker must allow the domain (see `averox-geo-worker/README.md`).
4. **Rates** also live in `config.js`; the price list, meter, map estimates and booking fee all follow them.

## Language
- **Finnish is the primary language** (client, 2026-11-11). The page loads in Finnish for everyone, and the HTML itself is written in Finnish (`lang="fi"`, title, share text). English shows only when a visitor taps EN (remembered on that device) or opens `?lang=en`. All text lives in `js/i18n.js`.

## Facts used
- Rates from the client: start €6.00 weekdays 07–18, €8.50 other times; €1.25/km (1–4), €2.11/km (5–8); €1.15/min. VAT 14 % passengers, 25.5 % goods.
- Example trip checked: 6.00 + 15 × 1.15 (17.25) + 10 × 1.25 (12.50) = **€35.75**. The meter defaults to this trip.
- Fleet: one car, a **2026 Kia Ceed Sportswagon** (estate / farmari, 1–4 passengers), per the client on 2026-11-11. The 5–8 rate (€2.11/km) is **not shown** anywhere on the site. It stays as `kmLarge` in `config.js`. If a van is added later, ask Claude to bring back the 5–8 options and the van 3D model (the files are kept outside the site folder).
- Service area: **from Tampere to anywhere in Finland**, Helsinki Airport included (client, 2026-11-11). The map shows Finland's 19 regions (Statistics Finland 2025 borders). Clicking a region picks its main town. The list covers Helsinki Airport, Tampere Airport and 17 region capitals, each with the road distance from Keskustori and a weekday estimate.
- Long trips are shown at meter rates, e.g. Helsinki Airport ≈ €361 and Rovaniemi ≈ €1,571. If Averox offers fixed prices for long trips, the site should say so.

## Booking price estimate (added 2026-11-12)
- When both addresses are typed in **Tilaa kyyti**, the box shows **Hinta-arvio ≈ X €** with the road distance and driving time. It updates when an address, the time (day/other rate) or Matkustajat/Tavaraa changes. The same estimate goes into the booking email ("Hinta-arvio", plus the addresses as found on the map).
- **Address suggestions (2026-11-12):** each address field shows a list of matching places to pick from (tap, click, or arrow keys + Enter). Under the field it shows the address actually used for the price, "Haetaan…" while looking, or "Osoitetta ei löytynyt". Check that line if a price looks wrong: e.g. "Ruotula 2" (a district, not a street) matches Korvakkeenkatu 2 in Ruotula.
- **For suggestions while typing, like Google Maps:** set up the free Cloudflare Worker in the `averox-geo-worker` folder (steps in its README). It holds the Digitransit key as a secret, so the key is never in this site, the repo or the browser. Then put the Worker's address in `geoProxy` in `js/config.js`. Digitransit uses Finland's national address register, so it also finds half-typed street names ("Hämeenka…"). Without the Worker the site uses OpenStreetMap, which only answers after a short pause and needs whole words. If the Worker fails or is blocked, the site switches back to OpenStreetMap by itself.
- How (no key): the addresses are looked up with **OpenStreetMap Nominatim** (biased to Pirkanmaa, Finland only) and driven with **OSRM** (route distance and time). Both are free public services with no key and no guaranteed uptime. The site asks at most once per second and only after typing pauses, which keeps within Nominatim's rules for low traffic. If the business grows a lot, switch to a keyed service (e.g. Digitransit geocoding for Finland).
- Price = starting fee + km × 1.25 + min × 1.15. Driving time has **no traffic**, so rush-hour trips can cost more on the meter. The meter sets the real price.
- **Goods (assumption):** goods = passenger price × 1.255 / 1.14 (same net rates, 25.5 % VAT instead of 14 %). Change `goodsFactor` in `js/config.js` once the client confirms (1 = same price as passengers).
- If an address isn't found, the box says so and shows no price. If the services are down, it says the customer can still book.

## Changed from the client's text
- The price text said "Uniform pricing applies throughout the entire **TamCab** service area" (FI: "koko TamCabin palvelualueella"). That looks copied from another company. The site says "Averox service area" instead. Confirm with the client.

## Open questions for the client
- Are public holidays (arkipyhät) charged at the "other times" starting fee? The meter treats Mon–Fri 07–18 as day rate and everything else as other times; holidays aren't handled.
- Goods transport: same km/min rates as passengers (only VAT differs), or a separate price list? The booking estimate currently assumes the same net rates with 25.5 % VAT (`goodsFactor` in config.js).
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
