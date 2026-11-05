# Layered banners and headers

This is a project UI guide for composed surfaces such as the Home header, wellness banner, and reminder. It describes how to build their visual layers; it does not define a new shared component. Keep a composition local to its feature until another screen needs the same nameable structure and behavior.

## Pattern in Home

The current examples live in [home-screen.tsx](../../src/features/home/screens/home-screen.tsx):

| Composition | Live content and controls | Decorative layers |
| --- | --- | --- |
| `DashboardHeader` | Avatar or initial fallback, greeting, name, notification button, unread state | Soft avatar gradient and button surface |
| `WellnessBanner` | Heading and supporting text | Mint gradient, SVG waves and leaves, transparent [wellness illustration](../../assets/images/wellness-stretch.png) |
| `Reminder` | Heading and supporting text | Pale gradient, SVG wave, sprout icon |

The words, data, icons, and controls are React Native elements. Raster assets hold artwork only; a screenshot of the whole surface would prevent text scaling, localization, state changes, and interaction.

## Building another composed surface

1. Identify which parts carry information or actions. Render those in normal flex layout with typed props for changing data.
2. Put a solid surface or `LinearGradient` at the back. Give the outer container the intended radius and `overflow: 'hidden'` so the artwork clips to it.
3. Draw simple waves, leaves, rings, and icons with SVG or native views. Add a local transparent image when a detailed subject needs one. Anchor decorative layers absolutely inside the container; keep content in the layout flow.
4. Check the stacking order: background → subtle decoration → optional subject asset → text and controls. Reserve enough width for text before positioning artwork, especially on narrow phones.
5. Use existing semantic tokens in `src/theme/` and `useTheme()` for both color schemes. New tokens should represent a reusable role, not one screenshot's coordinate or color sample.
6. Mark decorative shapes as non-interactive and hidden from accessibility. Give buttons a handler, label, pressed feedback, and a comfortable touch target. Provide an avatar fallback when the image is missing.

Use image generation only for artwork that cannot be expressed cleanly with shapes or SVG. Keep generated assets local to the project and preserve transparency when they must sit over a gradient.

## Review before merging

- Check a narrow phone and the reference width with long copy and enlarged text. Ensure the image does not cover words or controls and rounded clipping still works.
- Check light and dark appearance, contrast over translucent layers, safe areas, and scroll behavior.
- Compare an actual device or supported preview screenshot with the design when available. Record that visual review was unavailable if it could not be performed.
- Run `npx tsc --noEmit` and `npx expo lint` after changing UI code.

If only one feature uses a composition, keep it beside that feature's screen. Extract shared primitives only after a second use case shows what should be common; see [components-and-qa.md](components-and-qa.md).
