# Localization

VitaLoom supports English and Vietnamese. The app starts with the saved language, or uses the device or browser language on first launch. English is the fallback for unsupported languages. Users can change the language under **Profile → Language**. The root `I18nProvider` applies the selection immediately and saves it locally using SecureStore on native and localStorage on web.

## Add or change UI copy

- Keep a module-level `messages.ts` dictionary with the owning feature. Add matching keys to both `en` and `vi` and use descriptive keys for new copy. For shared UI, keep messages with the shared component.
- Use `useTranslations(messages)` from `@/i18n` inside components. For a pure helper that needs to return translated display text, pass the active language and use `translate(language, messages, key, values)`.
- Write complete messages with named placeholders such as `{time}`, keeping placeholder names the same in both languages. Include screen titles, placeholders, accessibility labels and hints, and validation, loading, empty, and error states.
- Use stable IDs and error codes for behavior. Translate errors at the point where they are displayed so language changes update the message without restarting a request. Use a localized fallback when a backend code is unfamiliar.

The Home metric card formats a timestamp with the active locale and passes it into a translated sentence. Its time zone stays fixed to the one used by the feature. See [the component](../../src/features/home/components/metric-card.tsx) and [its dictionary](../../src/features/home/messages.ts).

```tsx
const { locale } = useI18n();
const t = useTranslations(homeMessages);
const time = new Intl.DateTimeFormat(locale, {
  timeZone: 'Asia/Ho_Chi_Minh',
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(occurredAt));

return <ThemedText>{t('home.metric.heartRateAt', { time })}</ThemedText>;
```

Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with `locale` for display. Keep API dates, time zones, request fields, enum values, and numeric values in their existing formats. Keep translatable text in React Native elements so it can resize and change language.

When checking a changed screen, switch between both languages, including while an error or empty state is shown. Check text wrapping and accessibility labels, and verify that dates and numbers follow the selected language.
