# Assistant UI asset mapping

Status: `PENDING_VISUAL_ACCEPTANCE` · implementation uses native controls and an SVG progress ring.

**Standards:** [Global asset mapping](../../../../design/ASSET_MAPPING_STANDARD.md) · [Assistant UI index](./README.md) · [Runtime asset catalog](../../../assets/assistant/README.md) · [Machine manifest](../../../assets/assistant/asset-manifest.json).

| Screen / state | Reference | Asset role and path | Composition | Ownership / provenance / status |
| --- | --- | --- | --- | --- |
| `ASSISTANT-GLOBAL-LAUNCHER` · idle, touch pending, dragging, ring filling | Not provided | Hero: `assets/assistant/vita-ai-launcher-idle.png` | 56 dp square, centered in native circular button. The native SVG ring draws above it, starting at 12 o'clock and progressing clockwise. | Assistant feature; supplied PNG from `C:/Users/ANH DUC/Downloads/vitaloom-voice-assets`; transparent 1:1 cutout; `PENDING_VISUAL_ACCEPTANCE`. |
| `ASSISTANT-GLOBAL-LAUNCHER` · ring complete / activation | Not provided | Hero: `assets/assistant/vita-ai-mascot-activated.png`; glow: `assets/assistant/vita-ai-activation-glow.png` | Mascot centered in button; glow behind it. Ring remains native SVG and is not rotated as a whole. | Same supplied source; mascot is transparent 1:1, glow is transparent 1.5:1; `PENDING_VISUAL_ACCEPTANCE`. |
| `ASSISTANT-GLOBAL-LAUNCHER` · recording | Not provided | Hero: `assets/assistant/vita-ai-recording-microphone.png` | Microphone art replaces the mascot in the button. A restrained native pulse sits behind it; status hint remains native text. | Same supplied source; transparent 1.014:1; `PENDING_VISUAL_ACCEPTANCE`. |
| `ASSISTANT-CONVERSATION-SHEET` · header, assistant messages and launcher idle | Not provided | Avatar: `assets/assistant/vita-ai-launcher-idle.png` | Shared `VitaAiAvatar` renders the idle PNG at the existing component size. | Same Assistant-owned source, reused within the feature; `PENDING_VISUAL_ACCEPTANCE`. |
| Reference only | Not provided | `assets/assistant/vita-ai-activation-ring-reference.png` | Shape/color reference only; no runtime rendering. The functional ring is SVG. | Supplied transparent 1.5:1 PNG; not an approved screen reference. |
| `ASSISTANT-CONVERSATION-SHEET` · history action | User request, 2026-11-19 | `assets/assistant/conversation-history.svg` | 24 dp clock with counterclockwise return arrow, tinted with semantic accent; 48 dp button immediately left of exit. | Assistant-owned original SVG; device visual acceptance pending. |
| Optional reference only | Not provided | `assets/assistant/vita-ai-audio-waveform.png` | Optional visual reference; not needed by the current recording state. | Supplied transparent 3:1 PNG; not rendered at runtime. |

No asset was removed. Full-screen designs are not supplied. The app remains responsible for the progress ring, motion, accessibility, and touch behavior.
