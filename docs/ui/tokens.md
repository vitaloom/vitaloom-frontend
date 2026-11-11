# Tokens

All visual values below are **provisional** inferences from the reference mockups. Edit `src/theme/` first and update this document with any revised role or value. Do not copy primitives into screens.

## Color

Primitive groups are `palette.teal`, `aqua`, `mint`, `violet`, `coral`, and `neutral`, with numbered steps where a scale is useful. The exact hex values live in [`colors.ts`](../../src/theme/colors.ts). Aqua describes hydration, violet can distinguish sleep data, and mint supports general activity. These category colors never carry meaning alone.

| Semantic role | Light | Dark | Intended use |
| --- | --- | --- | --- |
| `background` | `#F4FBF8` | `#102527` | Screen canvas |
| `backgroundElement` | `#FFFFFF` | `#1A3436` | Grouped content surface |
| `backgroundSelected` | `#E8F8F6` | `#24494A` | Selected row or chip |
| `surfaceTint` | `#E3F9FB` | `#1B444A` | Quiet decorative wash |
| `text` | `#123B3E` | `#E8F6F4` | Primary content |
| `textSecondary` | `#4C696D` | `#AAC5C4` | Supporting content |
| `textInverse` | white | deep teal | Text on inverse surface |
| `accent` | `#087F7A` | `#78D5D0` | Primary action and selected state |
| `onAccent` | white | `#102527` | Text or icon on accent |
| `accentSoft` | `#CEF1EE` | `#24494A` | Quiet accent surface |
| `border` | `#D0E2E0` | `#456365` | Dividers and outlines |
| `focus` | `#087F7A` | `#9EE5EB` | Visible focus indicator |
| `success`, `warning`, `danger` | teal, ochre, coral | lighter counterparts | Status with icon and text |
| `water`, `sleep`, `activity` | aqua, violet, mint | lighter counterparts | Chart series with text labels |
| `overlay` | translucent teal-black | translucent black | Modal scrim |
| `waterTrack`, `waterPanel`, `waterPanelEdge` | pale teal, pale aqua, aqua | deep teal variants | Water progress track and hero surface |
| `illustrationSurface` | pale aqua-neutral | pale aqua-neutral | Light canvas behind illustrations that contain fixed dark lettering |
| `onSteps`, `onHeartRate` | deep teal | deep teal | Text on the light mint and coral activity selections |

Choose a semantic foreground/background pair together. Validate final rendered combinations, including translucent layers, to WCAG 2.2 AA: **4.5:1** for normal text, **3:1** for large text and meaningful non-text controls. Pale aqua and mint are surfaces or decoration, not small-text foreground colors. A disabled state may use lower contrast, but an enabled action must remain identifiable. Avoid encoding selection, errors, or chart values by color alone.

## Typography

`typography` provides named roles: `display` 40/48, `largeTitle` 34/41, `title` 28/34, `heading` 22/28, `body` and `bodyStrong` 17/25, `subhead` 15/22, `label` and `labelStrong` 14/20, `caption` 12/18, `metric` 32/38, `metricLarge` 38/44, and `code` 12/18 (font size/line height, logical pixels). These are proposed starting values. Use the system sans family for reading; rounded system family is reserved for display headings. `metric` uses tabular numerals. Do not use a custom font until licensing, language coverage, and native rendering are verified. Keep `allowFontScaling` enabled, let text wrap, and allow containers to grow at larger accessibility text sizes. Use navigation titles for screen titles when a stack provides them.

## Spacing and sizing

`spacing` follows a 4-point rhythm: `xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 32, `xxl` 48, `xxxl` 64, with `half` 2 for optical details. Start screen horizontal padding at `md` or `lg` according to available width; keep safe area insets separate. Prefer `gap` for sibling rhythm. `sizing` offers icons 16/24/32, minimum control height 44, comfortable control height 48, and web content maximum 800. `layout` holds the Water Tracking screen width and progress-ring geometry. Ensure Android interactive regions reach at least 48dp where practical and never rely on a tiny icon's visible bounds as its hit target.

## Radius and shape

`radius`: `sm` 8, `md` 12, `lg` 20, `xl` 28, `full` 9999. Use continuous corner curves for non-capsule rounded surfaces on supported React Native targets. Use `full` for pills and circular elements. The rounded language should distinguish groups and controls without placing every item in a separate card.

## Shadows, gradients, glass, graphics

`shadows.card`, `floating`, and `overlay` are subtle `boxShadow` strings. Use elevation only where a surface truly floats; a divider or background change usually suffices for grouped content. `gradients.water`, `action`, and `calm` expose ordered stops, not a renderer. Use a platform-supported gradient implementation only when a real component needs one; provide a solid semantic fallback. `glass` records tint and opacity proposals. Reserve blur/glass for overlays or prominent navigation where legibility survives changing backgrounds; avoid layering text directly over busy imagery. Water, bubble, wave, and leaf motifs are **graphic assets**, not layout or token substitutes. Keep decorative graphics out of the accessibility tree and supply text equivalents for informative illustrations.

## Motion

`motion.duration`: instant 0, feedback 150ms, transition 250ms, ambient 400ms. `motion.scale.pressed` is 0.98. Motion is a separate behavior layer: a selected state must remain obvious when animation is removed. Respect OS reduced-motion preference; disable ambient motion and replace spatial transitions with instant or minimal fades. Keep animations interruptible and avoid looping effects around important text. Animation work should follow the project's Expo animation guidance before implementation.
