# Components and visual QA

## Shared component contract

Create a shared primitive only when at least two screens need the same nameable structure. Prefer native `@expo/ui` controls for switches, pickers, sliders, menus, and sheets when their behavior fits; use React Native primitives where appropriate. Avoid wrapping native controls just to change token plumbing.

| Component role | Variants to start with | Sizes | States and behavior |
| --- | --- | --- | --- |
| Action button | `primary`, `secondary`, `quiet`, `destructive` only as needed | `sm`, `md`, `lg` | Default, pressed, disabled, loading; label stays accessible while loading |
| Surface/card | `plain`, `tinted`, `raised` only as needed | content-driven | Preserve semantic background and border; no automatic shadow |
| Selection chip | `default`, `selected` | `sm`, `md` | Press feedback, selected accessibility state, clear text label |
| Field | `default`, `error`, `disabled` | `md` | Label, hint/error text, visible focus, keyboard and screen-reader behavior |
| Progress visualization | water/sleep/activity semantic role | content-driven | Text value, unit, goal, and accessible summary separate from color or ring |

Variant names represent intent, not a specific hex value. `size` changes geometry from theme tokens. A `style` prop may adjust placement and flex but should not override identity colors or typography. Interactive custom primitives expose role, label, and relevant disabled, busy, or selected states. Pressed feedback is required; loading cannot silently swallow the control's purpose. Keep controls at least 44pt on iOS and target 48dp on Android. Use `hitSlop` when the visual icon must remain small.

## Visual QA checklist

When screenshot tooling is available, review iOS and Android at narrow and wide phone sizes, light and dark appearance, and at least one enlarged text setting. Compare the result with the reference images for hierarchy, spacing rhythm, calm palette, rounded shape language, and restrained decoration. Do not pixel-match the concept art. Check these before accepting a component:

1. Primary task and current value are visible before decorative art; labels, units, and actions remain readable.
2. Edges align to a consistent content axis; related items use closer gaps than unrelated sections.
3. Text/foreground contrast meets the thresholds in [tokens.md](tokens.md); test translucent layers over their actual backgrounds.
4. Safe areas, keyboard, navigation chrome, and system text scaling keep every action reachable.
5. Press, selected, disabled, loading, error, and focus states can be distinguished without color alone.
6. Decorative waves and bubbles do not obscure content, create false affordances, or animate under reduced motion.
7. Native controls retain expected iOS and Android behavior. Verify a screen reader's order and labels for custom controls.

If a repeated defect appears across screens, fix the token or shared component. For a one-off optical adjustment, keep a local value with a comment explaining it. Record any new inferred token as provisional until it survives device review.
