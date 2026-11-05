# VitaLoom mobile UI foundation

Status: **provisional visual values**, implementation ready. The source of truth is [`src/theme/`](../../src/theme/); this documentation describes its use. The reference images are in the repository's parent `design/` directory, especially `poster.png`, `water-intake-tracking.png`, `tiến độ nước.png`, and `chi tiết nhập nước.png`. Their rendered colors and dimensions are directional, not measured specifications. The other fitness mockups in that folder are secondary inspiration and do not override the teal VitaLoom direction.

## Principles and visual identity

- **Calm clarity:** pale aqua and mint backgrounds, deep teal content, generous breathing room. Place the user's current task before decoration.
- **Organic restraint:** continuous corners, occasional soft water gradients and leaf or ripple art. Use a graphic where it reinforces hydration or wellness, not as a mandatory backdrop on every surface.
- **Readable first:** progress, units, status, and actions remain legible without hue or illustration. Keep charts labeled and metrics in tabular numerals.
- **Native behavior:** use Expo Router's native navigation, safe areas, platform controls, and system text scaling. Brand identity comes from content and semantic color roles, not imitation of another platform's navigation chrome.
- **Reusable structure:** shared components own variant and state behavior; screens compose them. A component becomes shared when two screens need the same nameable role.

## Architecture and assumptions

`src/theme/index.ts` is the only theme import entry point. `palette` holds primitive color values; `colors.light` and `colors.dark` hold semantic roles. The app's existing `useTheme()` selects the active scheme. Spacing, sizing, typography, radius, effects, and motion are typed `as const` objects. No new styling framework or component library is installed. The Expo starter routes and their aliases remain for compilation and can be removed with those routes when feature work begins.

The screenshot references are iPhone concepts. Exact palette, font family, radii, shadow blur, gradients, and animation durations are **provisional** until tested on physical iOS and Android devices. The starter's web CSS font variables are retained for web only. No custom font files are bundled; native system fonts are used. The theme provides a dark scheme because system appearance is already supported, although the references primarily show light mode.

## Standards used

- [Expo design system skill](../../.agents/skills/expo-design-system/SKILL.md): single source of truth, token classes, component contract.
- [Expo native UI skill](../../.agents/skills/expo-native-ui/SKILL.md): safe areas, native controls, continuous corners, platform-aware effects.
- [DTCG 2025.10 format](https://www.designtokens.org/tr/2025.10/format/): primitive and semantic groups, explicit token meaning and aliases. The TypeScript theme follows its hierarchy and naming ideas; it is **not** a DTCG JSON interchange file.
- [Gluestack semantic tokens](https://gluestack.io/ui/docs/home/theme-configuration/default-tokens): role-based foreground, background, border, and state thinking; no Gluestack package is installed.
- [Apple HIG color guidance](https://developer.apple.com/design/human-interface-guidelines/color), [Material Design 3 accessibility](https://m3.material.io/foundations/accessible-design/overview), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/): adaptive presentation, touch access, and contrast.

See [tokens.md](tokens.md) for values, [components-and-qa.md](components-and-qa.md) for application rules, [layered-banners.md](layered-banners.md) for composed Home surfaces, and [water-landing-review.md](water-landing-review.md) for the Water Tracking validation exercise.
