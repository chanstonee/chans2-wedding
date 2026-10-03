# Invitation theme consistency QA

Final local result: passed on 2026-10-03. Deployment target: https://chanstonee.github.io/wedding/.

The user's pink screenshot and original blush artwork are the reference.

## Shared artwork and layout

The previous per-image scale/translation matched only outer alpha bounds. Enlarged comparison of the latest screenshots showed that generated blue artwork also changed internal proportions, line shapes and transparent interiors, especially the car, calendar, envelope and photo stack.

Both themes now use the same eleven original PNG illustrations. Inline SVG color matrices recolor the originals in blue mode, retaining the source pixels, transparent padding, alpha and internal geometry. The hero matrix retains the original brown outlines and blue bow while recoloring pink decoration. Both themes keep the hero's existing slight desaturation. All per-image scale/translation corrections were removed. Popup animation and shadow remain shared.

Blush remains the default and saved visitor preferences are preserved. Layout and typography continue to come from globals.css. The blue background and UI palette remain in themes.css. Wedding photos are outside the artwork filter selectors.

## Browser validation

At 430×774, 390×844, 320×640 and 1280×900, the header, hero and six main illustrations have identical currentSrc, native dimensions, image rectangles, object-fit and geometric transforms across themes. All 32 comparisons passed after hover transitions settled. Shared files and the identity alpha row establish identical drawing geometry beyond just outer bounds.

Date, dinner and story popups, gallery tabs and the full menu use identical original image sources, native sizes, CSS dimensions and positions. All fifteen panel image comparisons passed. Blue palette filters are applied; the popup drop-shadow and animation are retained. Screenshots were inspected for full artwork visibility and palette appearance. No browser warnings or errors were reported.

Evidence in outputs/:
- theme-shared-art-comparison.json: four viewport comparisons.
- theme-shared-panel-comparison.json: five panel comparisons.
- theme-shared-pink-430.jpg and theme-shared-blue-430.jpg: visual comparison.
- theme-shared-blue-popup.jpg: popup inspection.

## Build and independent review

scripts/build-pages.mjs passed, including TypeScript and repository-prefix verification. node --test tests/*.test.mjs: 4 passed, 0 failed.

Independent read-only review confirmed the built /wedding asset selectors cover splash, logo, hero, cards, menu, popup frames and gallery tabs. Both color matrices preserve alpha (0 0 0 1 0) and introduce no spatial filter primitives. The separate blue SVG loader has the same geometry as its blush counterpart.

The color matrix uses sRGB as described in the [SVG filter documentation](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feColorMatrix). Visual browser verification was performed in the Codex in-app browser; a separate physical iPhone Safari session was not available.
