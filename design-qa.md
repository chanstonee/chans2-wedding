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

## Safari page background extension (2026-10-03)

The invitation now synchronizes its theme to the document root as well as the app. html/body and the mobile 100lvh paper layer use the same selected texture and fill. On mobile, the app and home screen are transparent so separate 100dvh and 100lvh background crops do not create a seam. The root background is also themed at wider widths.

The manual viewport tag was replaced with Next's Viewport export. Both invitation and admin exports contain exactly one viewport tag with viewport-fit=cover and one theme-color tag. Theme-color follows the selected page fill for browsers that use it.

The shared header and main content now respect top and horizontal safe-area insets. The existing bottom navigation inset remains. The mobile admin container also respects top/side insets because it shares the cover viewport. Theme cleanup restores root state on unmount.

Local build and all four tests passed. Mobile DOM checks confirmed identical themed html/body/paper backgrounds, transparent app/home backgrounds, a single cover viewport, working saved-theme restoration and unchanged original illustration geometry. Desktop layout and popup opening/closing were checked. An independent read-only review confirmed CSS specificity and root cleanup.

The actual iPhone Safari status-bar/address-bar compositing, expanded/collapsed toolbars, rotation and keyboard behavior are not verified by the desktop in-app browser. No iPhone simulator runtime is installed in this environment. The code and desktop viewport checks must not be described as physical iPhone visual verification.

Evidence: outputs/safari-background-local-checks.json and safari-background-blue-430.jpg / safari-background-pink-430.jpg.

## Safari endpoint correction after physical-device feedback (2026-10-03)

The user's subsequent iPhone screenshots showed the previous blue status-bar color remaining after switching to blush, and the lower blue strip using a flat cyan instead of the wallpaper's lower endpoint. The previous desktop checks did not verify that native Safari behavior.

Each theme now has independent upper/lower colors, sampled as the median of the wallpaper's first/last 2.5% of rows: blush #fdf8f0 / #fdf9ee; blue-mint #88bdfd / #eef6f2. Two opaque, noninteractive fixed edge elements sit outside the app's stacking context. Their colors update in the same React commit as the app theme; root theme/meta updates run before paint. Their height is the larger of the safe-area inset and 12px, including short touch-screen landscape viewports.

The full-viewport fixed paper was replaced by absolute paper while retaining its 100lvh background crop. The invitation root/body use 100dvh and hide overflow; the home screen remains the sole user-scrollable surface. This removes the extra outer scroll range caused by combining 100lvh document height with a 100dvh app. These rules require the invitation root attribute and do not lock the admin page.

This approach addresses a likely Safari color-retention path: [WebKit's fixed-edge sampling code](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/LocalFrameView.cpp) preserves existing colors for viewport-sized fixed containers, but directly reads the background color of smaller opaque edge candidates. It samples 4px inward and excludes direct colors on boxes at most 10px high. This is an implementation-based inference, not physical-device confirmation of this fix.

Local checks at 430×774, 390×844, 320×640 and 1280×900 confirmed both endpoint colors/root/meta follow repeated theme switches, unchanged header/tagline/navigation positions, and zero root/body scroll offsets. Desktop edge strips remain hidden. Saved blue restoration and date-popup opening/closing passed. Build and all four existing tests passed. Evidence: outputs/safari-endpoints-local-checks.json and safari-endpoints-{blue,pink}-local.jpg. Native iPhone Safari expanded/collapsed toolbar rendering still requires device verification.

## Floating menu bottom clearance (2026-10-03)

The next physical iPhone screenshots confirmed both theme colors now switch correctly, but showed the floating menu touching the opaque Safari background edge. The menu's bottom offset and the edge height used the same safe-area/max(12px) value, leaving zero visible space and covering the menu's lower shadow.

A shared mobile/touch-landscape variable now adds 16px above that edge. The home content's bottom padding adds the same 16px to preserve the final card's scroll clearance. Desktop spacing remains unchanged. The 100dvh frame, 100lvh wallpaper crop, header, cards, artwork and typography are retained.

Local checks at 430×774, 390×700, 390×844 and 320×568 measured 16px menu-to-edge clearance in both themes; 1280×900 retained its original 12px navigation offset. At 320×568, keyboard scrolling to the end reached home scrollTop 225 while root/body offsets remained zero, with about 40px between the final card and menu. Date popup opening/closing returned correctly. Build and all four tests passed; independent read-only review found no blockers.

Evidence: outputs/nav-clearance-local-checks.json and nav-clearance-scroll-checks.json. Final native Safari spacing on the user's physical iPhone has not been directly verified by this desktop browser.
