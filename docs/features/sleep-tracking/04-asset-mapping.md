# Asset mapping

All sources are standalone transparent 1254 × 1254 RGBA images from D:/prj/vita-loom/design/assets/sleep-tracking. They are independent illustrations, not screenshots or screenshot crops.

| App path | Source path | Role and consumer | Visual status |
| --- | --- | --- | --- |
| src/features/sleep/assets/moon-cloud-stars.png | D:/prj/vita-loom/design/assets/sleep-tracking/moon-cloud-stars.png | Shared hero for Home, Record, Insights and Weekly Report | Source PNG available |
| src/features/sleep/assets/pillow-stars.png | D:/prj/vita-loom/design/assets/sleep-tracking/pillow-stars.png | Home featured insight, Discovery card and Insight Detail | Source PNG available |
| src/features/sleep/assets/feeling-comfortable.png | D:/prj/vita-loom/design/assets/sleep-tracking/feeling-comfortable.png | Record Sleep feeling selector and weekly feeling summary | Source PNG available |
| src/features/sleep/assets/feeling-normal.png | D:/prj/vita-loom/design/assets/sleep-tracking/feeling-normal.png | Record Sleep feeling selector and weekly feeling summary | Source PNG available |
| src/features/sleep/assets/feeling-tired.png | D:/prj/vita-loom/design/assets/sleep-tracking/feeling-tired.png | Record Sleep feeling selector and weekly feeling summary | Source PNG available |
| src/features/sleep/assets/trend-up.png | D:/prj/vita-loom/design/assets/sleep-tracking/trend-up.png | Decorative motif on Sleep Pattern insight cards | Source PNG available |
| src/features/sleep/assets/bars.png | D:/prj/vita-loom/design/assets/sleep-tracking/bars.png | Decorative motif on insight cards, never a rendered chart | Source PNG available |

These are the approved copy targets for app-owned artwork. A centralized Metro map at src/features/sleep/assets/sleep-art.ts imports the copies, and presentation components consume that map. Native text, controls and data-backed SVG charts remain interactive. No complete screenshot is runtime art. Standalone sleep-cloud.png and star-smiling.png are available but unnecessary. SVG art fallbacks are proposed in the source manifest.

The six selected references are documentation-only sources under D:/prj/vita-loom/design/sleep-tracking. Do not copy them into app assets. Journal, Goal, consent and loading/error/empty states have no approved screenshots, so those visual states are proposed extensions.

The source asset README and manifest provide dimensions and alpha status. All seven app copies matched their corresponding source SHA-256 hashes. Device screenshot review remains open.
