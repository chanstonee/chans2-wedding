# Blue/mint theme QA

final result: passed

Selected target: outputs/theme-previews/theme-3.png, the third displayed generated image selected by the user. The existing invitation was extended in place, with its routes, guestbook integration and original blush theme retained.

## Comparison evidence

Source raster: 853×1845, normalized to 390×844 CSS pixels. Implementation: 390×844 browser capture. Combined comparison inputs: outputs/theme-qa-before.jpg and outputs/theme-qa-after.jpg (source left, implementation right); both were visually inspected. Additional evidence: theme-blue-desktop.jpg, theme-blue-small-mobile.jpg, theme-dinner-popup.jpg, theme-guestbook-mobile.jpg and theme-blush-mobile.jpg in outputs/. All UI checks used Codex's in-app browser.

## Findings and fixes

- P2 background: the original supplied background rendered darker than the mock. Generated a brighter blue/mint adaptation preserving paper grain. The after comparison confirms powder-blue above and luminous mint/ivory below.
- P2 mobile spacing: date, illustration and cards initially sat approximately 30px too low. Adjusted name size, date spacing and hero framing. Final grid starts at 404px, close to the target's 406px, and remains clear of the GNB.
- P2 desktop spacing: second card row ended only 3px above the GNB. Reduced desktop hero height by 12px. Final row bottom 787px, GNB top 802px.
- Asset framing: alpha bounds guided placement of the full hero decoration inside the mobile slot. Popup frame uses containment to retain its ornate shape.

No outstanding P0/P1/P2 findings. Expected minor raster variations remain in regenerated crayon art. The existing Material Symbols contrast icon conveys theme switching instead of hand-drawing the mock's overlapping circles.

## Required fidelity surfaces

- Fonts/typography: existing SUIT retained; mobile navy names at 42px, readable 14px navigation, exact wedding date/time and Korean venue. No clipped labels at 320px.
- Spacing/layout: same header, centered wedding information, cat hero, 3×2 menu grid and fixed pill GNB. At 320×640 the main surface scrolls; no horizontal overflow.
- Colors/tokens: navy/slate ink, powder-blue/periwinkle art, milky glass cards and mint lower glow match the selected direction. Sheets, popups, gallery, guestbook controls, splash and loader also adapt.
- Image quality: individual transparent PNGs with opaque ivory interiors. Main/menu/tab/popup assets loaded from repository-prefixed export paths. Wedding photos retain original paths and receive no theme filter.
- Copy/content: names, 2027-05-15 18:30, venue and all six menu labels retained. GNB is RSVP / 전체메뉴 / 테마. Accessible button reports current theme and pressed state.

## Behavior and validation

- Default new theme and blue/mint ↔ original blush button cycle verified.
- Blush preference survived reload; switching back with Enter worked, and blue/mint survived later reload.
- Full menu → dinner, Escape close, gallery tabs, photo viewer open/close and guestbook presentation verified.
- Requested white close circle / gray X retained.
- No browser errors during verification. No guestbook messages were submitted or changed.
- scripts/build-pages.mjs passed, including TypeScript and static-export verification.
- node --test tests/*.test.mjs: 4 passed.

Local preview: http://127.0.0.1:4173/wedding/ (kept running and open). Publication remains a separate action.
