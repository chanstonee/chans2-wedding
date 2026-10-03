# Invitation theme consistency QA

Final result: passed. Public deployment approved on 2026-10-03.

The user’s pink screenshot (IMG_6937.PNG) and original blush layout are the reference.

## Shared layout

Blush is the default, with saved visitor preferences preserved. Blue-only font sizes, card heights, hero spacing, header corners and image cropping were removed. Both themes share layout and typography from globals.css.

The prior browser comparison covered 430×774, 390×844, 320×640 and 1280×900, with matching shared container positions, dimensions and typography. The dinner popup’s shared layout also matched.

## Visible illustration alignment

The initial layout comparison used image element boxes, which did not detect differences in transparent PNG margins. The user identified remaining differences in the visible icons.

Measured alpha bounds above 24/255 for all eleven paired PNG illustrations. Derived per-illustration scale and translation in themes.css so blue artwork occupies the same visible width/height and center as its blush counterpart. The original bitmap files remain intact. Animated popup illustrations include horizontal compensation for their existing translateX(-50%).

Measured native alpha bounds projected through the browser’s image fit and transforms for the header, hero and all six menu illustrations at the same four viewports. Maximum width/height difference: 0.002 CSS pixels. Maximum position difference: 0.740 CSS pixels. All images loaded. The complete main cats and heart remain visible.

Evidence in outputs/:
- theme-illustration-metrics.json: canvas sizes, visible bounds and alignment constants.
- theme-icon-paint-comparison.json: differences across all four viewports.
- theme-icons-pink-mobile.jpg and theme-icons-blue-mobile.jpg: visual comparison.
- theme-layout-comparison.json and theme-panel-comparison.json: shared layout comparison.

## Validation

scripts/build-pages.mjs passed, including TypeScript and repository-prefixed export verification. node --test tests/*.test.mjs: 4 passed, 0 failed. Theme toggling worked. Existing wedding photos and guestbook data are unchanged.

Deployment target: https://chanstonee.github.io/wedding/. The latest revision includes both shared layout and visible illustration alignment.
