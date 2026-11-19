# Global Assistant launcher behavior

Status: `CONFIRMED` for this implementation task. Business consent, conversation, session, API, STT and retry rules remain owned by their existing sources and are unchanged.

## Screen registry

| Screen ID | Entry | Exit |
| --- | --- | --- |
| `ASSISTANT-GLOBAL-LAUNCHER` | Eligible authenticated app routes while the sheet, keyboard and blocking overlay are closed | Opens the existing conversation sheet, starts voice capture, is dragged, or is hidden by route/overlay state |
| `ASSISTANT-CONVERSATION-SHEET` | Launcher tap or finalized voice recording | Existing close action; conversation remains active in the mounted Global Assistant |

## Interaction contract

| Action | Trigger | Immediate feedback | Outcome |
| --- | --- | --- | --- |
| Touch pending | Finger down | No ring and no sheet; launcher enters pending state | A quick release opens the existing text conversation. |
| Begin ring | Stay within the 10 dp movement threshold for 250 ms | Idle mascot remains visible; fixed-origin ring begins | Ring fills clockwise for 750 ms. |
| Drag | Move more than 10 dp before recording begins, including while the ring is filling | Ring and hold are cancelled; no haptic or recording | Free movement; clamp the button, glow/ring bounds and recording hint to measured layout, safe areas and measured tab bar. |
| Ring complete | Hold through the 750 ms ring | Activated mascot and glow | Existing consent and microphone permission checks run; one light haptic fires as recording starts immediately after the completed ring. If drag wins before recording starts, there is no haptic or recording. |
| Release while ring incomplete | Release before the ring fills | Ring resets; no chat opens | Hold is cancelled. |
| Release after recording starts | Lift finger | Existing recorder finalizes the audio | Existing conversation sheet shows “Mình đang xử lý yêu cầu của bạn...” and then transcript/reply as text. Existing retry and error states remain in place. |
| Cancel/interruption | Gesture cancel, app interruption, route change, hidden launcher or unmount | Timers and animations stop | Pending capture/file is safely cancelled or cleaned using the existing lifecycle. |

The button starts at the lower right above the measured tab bar. Position is retained in memory while Global Assistant stays mounted, including sheet close/reopen and route changes. Layout and inset changes clamp the saved position again. No new persistence dependency is used.

## Accessibility and motion

- The launcher keeps its localized button label and hold hint; decorative PNGs and the progress ring are hidden from assistive technology.
- Respect reduced motion by removing glow/pulse movement while preserving the state change and ring completion.
- Visual acceptance and real-device gesture review remain pending; see the task handoff for device availability and check results.

## Visual asset mapping

See [ASSET_MAPPING.md](./ASSET_MAPPING.md).
