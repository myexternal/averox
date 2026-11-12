# Averox: design system "Night meter"

This system belongs to Averox only. It shares no skeleton, fonts or palette with Hewad Market (Apple-style scroll film), Flavours of Asia (packed boxes, condensed sign type), Nupelda (Unbounded, pizza wheel), Ceylon Tampere CC (Mona Sans, honours board, left rail) or Inex (Geologica, chamfered steel).

## Idea
A Pirkanmaa taxi after dark: wet asphalt, sodium street light, and the amber glow of a fare meter. The meter is the voice of the site. Fares are shown the way a meter shows them (dot-matrix digits), and everything else stays calm so the numbers carry the page.

## Type
| Role | Font | Settings |
|---|---|---|
| Display light | Funnel Display 300 | First half of every headline, tracking -0.03 to -0.035em, leading 0.94 |
| Display bold | Funnel Display 800 | Second half of every headline, same size as the light half |
| Text and UI | Funnel Sans 400–600 | 17px / 1.55 body, 16px inputs (no iOS zoom), tabular figures for money |
| Meter | Doto 800 | Only for big fare readouts (the meter, the fleet €/km). Never below ~40px; small numbers use Funnel Sans |

The ledger prices on the light section use Funnel Display 300 at a very large size; totals switch to 800. No mono eyebrows, no italic accent words.

## Colour
| Token | Hex | Use |
|---|---|---|
| asphalt | #0b0c0e | Page, hero, meter, fleet, rides, area |
| kerb / kerb-2 / kerb-3 | #131518 / #1b1e22 / #262a2f | Panels, inputs, pressed states |
| snow | #f1efea | The one light section (price list), text on dark |
| ink | #111214 | Text on snow |
| fog / slush | #c3c6ca / #8f949b | Secondary text on dark |
| amber | #ff9f1c | Meter digits, primary buttons, active route, selected states |
| amber-ink | #9a5500 | Amber on snow (equation operators) |

One light section breaks the dark rhythm. No gradients on surfaces except photo shades; no glass card grids.

## Layout grammar (each section a different structure)
1. **Hero**: full-bleed night photo with the car visible. On desktop the booking form is a wide strip that bridges the hero and the next section; on phones the photo is a top band and the booking card follows the headline.
2. **Meter**: split. A black meter window with dot-matrix total and a receipt, next to stacked control cards (route chips, sliders, segmented choices).
3. **Price list**: light section. Sticky heading column, a ledger of huge light numerals, then the worked example as a full-width typographic equation.
4. **Fleet**: a studio photo of the Kia Ceed Sportswagon under the headline, next to its €/km rate (3D turntable code is kept and can be switched back on with a model of the real car).
5. **Rides**: broken 12-column editorial grid of three photos at different sizes and offsets.
6. **Area**: lake photo band with parallax, then a real map of Finland (19 regions, OSM road routes from Tampere) next to a distance list.
7. **Closing**: full-bleed roof-sign photo with the last headline.

Nav: thin top bar that turns translucent on scroll; links from 980px; EN/FI pill with a sliding thumb. Phones get a bottom "Book a ride" dock once the hero is gone.

## Motion (emil-design-eng, apple-design, improve-animations audit)
- Curves: `--ease-out: cubic-bezier(.23,1,.32,1)`, `--ease-io: cubic-bezier(.77,0,.175,1)`, `--ease-drawer: cubic-bezier(.32,.72,0,1)`.
- Presses scale to 0.97 in 160ms. Hover only under `(hover: hover) and (pointer: fine)`.
- Booking steps: 260ms slide (28px) + fade + 2px blur crossfade, direction-aware.
- Meter total: rAF tween from the value on screen (interruptible) on chip/segment changes; sliders track 1:1 with no tween.
- Map route draws with stroke-dashoffset (WAAPI, ease-io, up to 900ms, explanatory).
- 3D car: slow auto-turn, drag with velocity hand-off and exponential decay, small scroll-linked turn; render loop sleeps when off screen.
- Reduced motion: no auto-turn, no tween, no parallax, reveals become opacity only. Reduced transparency makes the card and bar solid.
