# Homepage Redesign, Mobile Responsiveness, and SVG Arrows Integration

## Context & Overview
In this session, we completed a visual and responsive overhaul of the Gativus homepage (landing page). This included resolving text alignment issues, fixing mobile viewport layout breaks, implementing dynamic SVG connectors for the brain diagram, restoring arrow visibility, and removing hardcoded layout fallbacks to give the database/admin panel full control over page content.

---

## Key Achievements & Solutions

### 1. Homepage Text Left-Alignment & Margin Cleanup
- **Problem**: Body paragraphs, descriptions, and pillar summaries used justified text (`text-align: justify`) and first-line indentation (`text-indent: 47px`), causing uneven word gaps and awkward indentations on desktop and mobile. Additionally, card components used double margins (`margin-bottom: 3rem;` plus container `gap`), inflating vertical gaps.
- **Solution**:
  - Updated [landing-home.css](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/assets/css/landing-home.css) to force `text-align: left !important` and `text-indent: 0 !important` on `.home-sub`, `.home-about-intro`, `.home-about-p`, `.gativus-card-subtitle`, and `.home-pillar-desc`.
  - Removed `margin-bottom: 3rem;` from `.home-about-card` and `.gv-surface-card` classes, shifting vertical flow control entirely to the container's flex gap (`gap: clamp(1.5rem, 4vw, 3rem)`).

### 2. Comprehensive Mobile Responsiveness
- **Hero Block Overflow**: The logo and title on the Hero block (`.home-hero-header`) were forced into a horizontal row, overflowing narrow screen boundaries. Added a media query under `640px` in [LandingBlockHero.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/landing/LandingBlockHero.vue) to wrap the header to `flex-direction: column`, centering the logo, title, intro text, and action buttons.
- **Header Overflow (`.home-h2`)**: Section headers containing side-line SVG decorators and wide letter spacing (`6px`) broke layout margins on mobile. Added a media query in [landing-home.css](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/assets/css/landing-home.css) to hide `::before` and `::after` lines, reduce `letter-spacing` to `2px`, and scale font size down to `clamp(1.2rem, 5vw, 1.8rem)`.
- **Card Padding**: Scaled horizontal paddings on the CTA block (`.home-cta`) and Manifest card (`.home-manifest`) down to `1.25rem` on mobile to prevent content squeezing.

### 3. Dynamic SVG Arrows (Brain Diagram)
- **Problem**: The original arrows pointing from the "Consciousness" and "Neural Network" cards to the central brain graphic were constructed using static absolute-positioned CSS triangles. On resizing the window, the cards would separate, leaving the arrows hanging in empty space or overlapping the brain. On mobile, they disappeared.
- **Solution**:
  - Replaced CSS borders with inline flex-growing SVG elements in [HomeAboutDetail.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/home/HomeAboutDetail.vue) template.
  - Desktop view uses a curved path (`Q 50 25`) with SVG `marker-end` arrowhead pointing precisely to the left/right brain boundaries. Containers use `flex: 1 1 auto` to scale their width dynamically to match the gap.
  - Mobile view (under `768px`) displays a vertical path (`L`) pointing down (from top card to brain) and up (from bottom card to brain) acting as vertical spacers.
  - Set paths and fills to `currentColor` to dynamically support dark/light theme shifts.

### 4. Chrome Image Dimension Bug & Card Wrapping
- **Problem**: Chrome rendered the `.gativus-brain-img` box much wider than the actual image because of missing width boundaries, causing the "Neural Network" card to wrap to a new line on narrower desktop viewports.
- **Solution**:
  - Applied `width: auto; aspect-ratio: 1365 / 1600;` on `.gativus-brain-img` in both [landing-home.css](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/assets/css/landing-home.css) and [HomeAboutDetail.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/home/HomeAboutDetail.vue) to force Chrome to size the DOM element exactly to its visual bounds.
  - Set `flex-wrap: nowrap;` on `.gativus-card-image` on desktop, restoring `flex-wrap: wrap !important` only on mobile.
  - Added `-15px` horizontal margins to the SVG container boundaries so the arrowheads overlap the transparent borders of the brain PNG, pointing exactly to the brain graphic.

### 5. Arrow & Decorator Opacity Adjustments
- **Problem**: Header line decorators and the down-arrows were previously grouped in a low-opacity rule (`opacity: 0.08`), making them virtually invisible.
- **Solution**: Grouped `.home-h2::before`, `.home-h2::after`, `.home-title::before`, `.home-title::after`, and `.home-header-arrow` to share a highly visible, elegant `opacity: 0.6 !important` styling.

### 6. About Intro Customization
- **Problem**: The introduction text under the Architecture header had a hardcoded default fallback. If the fields were left empty in the database, the fallback text still rendered, making it impossible to hide the intro.
- **Solution**: Removed `fallback.value.detailIntro` from the `detailIntro` computed key in [HomeAboutDetail.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/home/HomeAboutDetail.vue). The block now falls back to an empty string (`''`), allowing administrators to hide the intro block by clearing the description in the database.

---

## Technical Recommendations & Lessons Learned
1. **Flexbox Image Constraints in Chrome**: When using `height` and `object-fit: contain` on images inside a flex row, always declare `width: auto` and an explicit `aspect-ratio` to prevent Chrome from inflating the element's flex-basis to its raw intrinsic width.
2. **Falsy Fallback Pitfalls**: Avoid using the `||` operator for optional fields that can be cleared by the user. Prefer nullish coalescing `??` or explicit `undefined`/`null` checks to allow empty strings (`""`) to be respected instead of being overridden by default text.
3. **SVG Stacking Contexts**: Absolute elements inside components without a defined stacking context can fall behind adjacent flex siblings. Explicitly define `position: relative` and `z-index` on parents to keep SVG lines and markers visible over container backgrounds.
