# Assistant UI

Global launcher assets and gesture behavior live in:

- [Asset mapping](./ASSET_MAPPING.md)
- [Launcher behavior](./BEHAVIOR.md)
- [Runtime asset inventory](../../../assets/assistant/README.md)

The launcher shares the idle Vita AI mascot with the conversation sheet and message bubbles. Voice capture continues through the existing Assistant conversation pipeline.

Conversation history is opened with the clock/return-arrow asset button immediately left of exit in the conversation sheet header. It closes the sheet before opening `/assistant`; returning leaves the sheet closed. Home has no separate history link. The entry retains the global Assistant account-permission gate and has English/Vietnamese accessibility labels.
