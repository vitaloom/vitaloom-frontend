import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, sizing, spacing } from '@/theme';
import { useI18n, useTranslations, type TranslationValues } from '@/i18n';

import { ProfileButton, ProfileHero } from '../components/profile-primitives';
import type { ProfileEditor } from '../hooks/use-profile-editor';
import { activityOptions, fieldLabels, genderOptions, profileFields, type ProfileField, type ProfileSnapshot } from '../types/profile';
import { formatProfileValue } from '../utils/profile-form';
import { StatusBanner } from './profile-overview';
import { profileMessages } from '../profile-messages';

type Option = { value: string; label: string; description?: string };
type ProfileMessageKey = keyof typeof profileMessages.en;
type ProfileTranslator = (key: ProfileMessageKey, values?: TranslationValues) => string;

export function ProfileFormScreen({ mode, editor, onCancel, onSkip, onAuthRetry }: {
  mode: 'setup' | 'edit';
  editor: ProfileEditor;
  onCancel: () => void;
  onSkip?: () => void;
  onAuthRetry: () => void;
}) {
  const theme = useTheme();
  const { locale } = useI18n();
  const t = useTranslations(profileMessages);
  const { width, fontScale } = useWindowDimensions();
  const [picker, setPicker] = useState<'gender' | 'activityLevel' | undefined>();
  const setup = mode === 'setup';
  const showBasics = !setup || editor.step === 1;
  const hasUnknown = editor.recovery?.kind === 'unconfirmed';
  const conflict = editor.recovery?.kind === 'conflict' ? editor.recovery : undefined;
  const inputDisabled = editor.busy || !!editor.recovery || editor.notice?.kind === 'unauthorized';
  const pairDirection = width < 350 || fontScale > 1.25 ? 'column' : 'row';

  function save() {
    Keyboard.dismiss();
    editor.save();
  }

  function back() {
    if (picker) setPicker(undefined);
    else editor.back();
  }

  const title = setup
    ? showBasics ? t('A little about you.') : t('Your everyday rhythm.')
    : t('Your profile, your choice.');
  const subtitle = setup
    ? showBasics ? t('Every field is optional. Add the details you’d like to share.') : t('A few details, only if you would like to share them.')
    : t('Every field is optional. Change only what you want to share.');

  return (
    <SafeAreaView testID={hasUnknown ? 'PHP-SCR-010' : conflict ? conflict.latest.kind === 'verified' ? 'PHP-SCR-008' : 'PHP-SCR-009' : setup ? `PHP-SCR-00${editor.setupValidation ? 3 : editor.step}` : editor.notice?.kind === 'partial-success' ? 'PHP-SCR-007' : 'PHP-SCR-006'} style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          key={setup ? `${editor.step}-${editor.setupValidation}` : 'edit'}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={{ minHeight: sizing.controlComfortable, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Go back')} onPress={back} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'flex-start', justifyContent: 'center' }}>
              <ThemedText variant="heading">‹</ThemedText>
            </Pressable>
            <ThemedText accessibilityRole="header" variant="bodyStrong">{setup ? t('Profile setup') : t('Edit personal profile')}</ThemedText>
            {setup && onSkip ? <Pressable accessibilityRole="button" accessibilityLabel={t('Skip profile setup')} disabled={inputDisabled} onPress={onSkip} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'flex-end', justifyContent: 'center' }}><ThemedText variant="labelStrong" themeColor="accent">{t('Skip')}</ThemedText></Pressable> : <View style={{ width: sizing.controlMin }} />}
          </View>

          {setup && !hasUnknown ? <ProfileHero step={editor.step} eyebrow={t('Profile setup · {step} of 2', { step: editor.step })} title={title} subtitle={subtitle} compact /> : setup ? null : (
            <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: theme.accentSoft, marginBottom: spacing.md }}>
              <ThemedText themeColor="accent">✦</ThemedText>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <ThemedText variant="labelStrong" themeColor="accent">{t('Your profile, your choice.')}</ThemedText>
                <ThemedText variant="caption" themeColor="textSecondary">{t('Every field is optional. Change only what you want to share.')}</ThemedText>
              </View>
            </View>
          )}

          {editor.notice?.kind === 'partial-success' ? (
            <StatusBanner text={t('Some changes saved. Updated {fields}. Review the highlighted fields.', { fields: editor.notice.applied.map((field) => t(fieldLabels[field])).join(', ') })} success />
          ) : null}
          {editor.notice?.kind === 'validation-error' && editor.errors ? <StatusBanner text={t(setup ? 'Please fix the highlighted fields. Nothing was saved.' : 'Review the highlighted fields below.')} /> : null}
          {editor.notice?.kind === 'no-changes' ? <StatusBanner text={t('No changes to save.')} /> : null}
          {editor.notice?.kind === 'network-error' ? <StatusBanner text={t('This attempt didn’t save. Your draft is ready to retry.')} /> : null}
          {editor.notice?.kind === 'unauthorized' ? <StatusBanner text={t('Your session needs attention before you can save.')} /> : null}
          {hasUnknown && editor.recovery?.kind === 'unconfirmed' && !editor.recovery.visible ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              <StatusBanner text={t('Your save is still unconfirmed. Check the latest profile before saving again.')} />
              <ProfileButton label={t('Check current profile')} onPress={editor.showVerification} />
            </View>
          ) : null}

          {showBasics ? (
            <FieldGroup title={setup ? t('The basics') : undefined} note={setup ? t('ALL OPTIONAL') : undefined}>
              <TextProfileField field="displayName" value={editor.draft.displayName} onChange={editor.change} error={translateError(editor.errors.displayName, t, locale)} disabled={inputDisabled} autoCapitalize="words" returnKeyType="next" />
              {setup ? (
                <>
              <TextProfileField field="birthYear" value={editor.draft.birthYear} onChange={editor.change} error={translateError(editor.errors.birthYear, t, locale)} disabled={inputDisabled} keyboardType="number-pad" returnKeyType="done" />
                  <GenderChoices value={editor.draft.gender} onSelect={(value) => editor.change('gender', value)} error={translateError(editor.errors.gender, t, locale)} disabled={inputDisabled} />
                </>
              ) : (
                <View style={{ flexDirection: pairDirection, gap: spacing.sm }}>
                  <View style={{ flex: 1 }}><TextProfileField field="birthYear" value={editor.draft.birthYear} onChange={editor.change} error={translateError(editor.errors.birthYear, t, locale)} disabled={inputDisabled} keyboardType="number-pad" returnKeyType="done" /></View>
                  <View style={{ flex: 1 }}><OptionPicker field="gender" value={editor.draft.gender} onPress={() => setPicker('gender')} error={translateError(editor.errors.gender, t, locale)} disabled={inputDisabled} /></View>
                </View>
              )}
              {setup ? <ThemedText variant="caption" themeColor="textSecondary">{t('Your information is self-reported and can be updated anytime.')}</ThemedText> : (
                <>
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.border, marginVertical: spacing.xs }} />
                  <View style={{ flexDirection: pairDirection, gap: spacing.sm }}>
                  <View style={{ flex: 1 }}><TextProfileField field="heightCm" value={editor.draft.heightCm} onChange={editor.change} error={translateError(editor.errors.heightCm, t, locale)} disabled={inputDisabled} keyboardType="decimal-pad" unit="cm" /></View>
                  <View style={{ flex: 1 }}><TextProfileField field="weightKg" value={editor.draft.weightKg} onChange={editor.change} error={translateError(editor.errors.weightKg, t, locale)} disabled={inputDisabled} keyboardType="decimal-pad" unit="kg" /></View>
                  </View>
                  <OptionPicker field="activityLevel" value={editor.draft.activityLevel} onPress={() => setPicker('activityLevel')} error={translateError(editor.errors.activityLevel, t, locale)} disabled={inputDisabled} />
                </>
              )}
            </FieldGroup>
          ) : (
            <FieldGroup title={t('Body details')} note={t('ALL OPTIONAL')}>
              <View style={{ flexDirection: pairDirection, gap: spacing.sm }}>
                <View style={{ flex: 1 }}><TextProfileField field="heightCm" value={editor.draft.heightCm} onChange={editor.change} error={translateError(editor.errors.heightCm, t, locale)} disabled={inputDisabled} keyboardType="decimal-pad" unit="cm" /></View>
                <View style={{ flex: 1 }}><TextProfileField field="weightKg" value={editor.draft.weightKg} onChange={editor.change} error={translateError(editor.errors.weightKg, t, locale)} disabled={inputDisabled} keyboardType="decimal-pad" unit="kg" /></View>
              </View>
              <ActivityChoices value={editor.draft.activityLevel} onSelect={(value) => editor.change('activityLevel', value)} error={translateError(editor.errors.activityLevel, t, locale)} disabled={inputDisabled} />
            </FieldGroup>
          )}

          {!setup ? (
            <ThemedText variant="caption" themeColor="textSecondary" style={{ marginTop: spacing.md }}>
              {t('Clear any value to remove it. Changing your profile won’t update water or sleep goals.')}
            </ThemedText>
          ) : null}

          {setup && !showBasics ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <ProfileButton label={editor.busy ? t('Saving…') : t('Save my profile')} onPress={save} disabled={inputDisabled} accessibilityHint={t('Save the optional details you entered')} />
              {onSkip ? <ProfileButton label={t('Skip for now')} onPress={onSkip} secondary disabled={inputDisabled} /> : null}
              <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('No medical details required.')}</ThemedText>
            </View>
          ) : setup ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <ProfileButton label={t('Continue')} onPress={() => { Keyboard.dismiss(); editor.advance(); }} disabled={inputDisabled} accessibilityHint={t('Continue to body details without saving')} />
              {onSkip ? <ProfileButton label={t('Skip for now')} onPress={onSkip} secondary disabled={inputDisabled} /> : null}
            </View>
          ) : (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <ProfileButton label={editor.busy ? t('Saving…') : t('Save changes')} onPress={save} disabled={inputDisabled} />
              <ProfileButton label={t('Cancel')} onPress={onCancel} secondary disabled={editor.busy} />
              <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('Only the fields you change are considered.')}</ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {picker ? (
        <ChoiceSheet
          title={picker === 'gender' ? t('Choose gender') : t('Choose activity level')}
          options={localizedOptions(picker === 'gender' ? genderOptions : activityOptions, t)}
          selected={editor.draft[picker]}
          showClear={!setup}
          onSelect={(value) => { editor.change(picker, value); setPicker(undefined); }}
          onClear={picker === 'gender' || picker === 'activityLevel' ? () => { editor.change(picker, ''); setPicker(undefined); } : undefined}
          onClose={() => setPicker(undefined)}
        />
      ) : null}

      {conflict ? (
        conflict.latest.kind === 'verified' ? (
          <DecisionSheet
            title={t('Your profile changed on another device')}
            body={t('We’ve loaded the latest details. Your unsaved edits were not applied.')}
            primary={t('Continue updating')}
            secondary={t('Not now')}
            onPrimary={editor.continueFromLatest}
            onSecondary={onCancel}
            onClose={onCancel}
            details={conflict.latest.snapshot}
          />
        ) : (
          <DecisionSheet title={t('We couldn’t verify the latest profile')} body={t('Save is paused until the current details can be checked.')} primary={t('Try again')} secondary={t('Not now')} onPrimary={editor.verify} onSecondary={onCancel} onClose={onCancel} />
        )
      ) : null}

      {hasUnknown && editor.recovery?.kind === 'unconfirmed' && editor.recovery.visible ? (
        <DecisionSheet
          warning
          title={t('Couldn’t confirm your save')}
          body={t('Your updates may have reached the server. Check the current profile before trying to save again.')}
          primary={editor.busy ? t('Checking…') : t('Check current profile')}
          secondary={t('Keep draft')}
          onPrimary={editor.verify}
          onSecondary={editor.keepDraft}
          onClose={editor.keepDraft}
          error={editor.recovery.check === 'network-error' ? t('The current profile still can’t be verified. Retry verification when connected.') : editor.recovery.check === 'unauthorized' ? t('Your session could not be verified. Sign in before continuing.') : editor.recovery.check === 'unresolved' ? t('The save has no final confirmation yet. Keep checking before trying again.') : undefined}
        />
      ) : null}

      {editor.notice?.kind === 'unauthorized' ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('Check session')} onPress={onAuthRetry} style={{ position: 'absolute', bottom: spacing.lg, alignSelf: 'center', minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.lg }}>
          <ThemedText themeColor="accent" variant="labelStrong">{t('Check session')}</ThemedText>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

function FieldGroup({ children, title, note }: { children: React.ReactNode; title?: string; note?: string }) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.backgroundElement, borderRadius: radius.xl, borderColor: theme.border, borderWidth: 1, padding: spacing.md, gap: spacing.sm }}>
      {title ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><ThemedText variant="labelStrong">{title}</ThemedText>{note ? <ThemedText variant="caption" themeColor="textSecondary">{note}</ThemedText> : null}</View> : null}
      {children}
    </View>
  );
}

function TextProfileField({ field, value, onChange, error, disabled, keyboardType, autoCapitalize, returnKeyType, unit }: {
  field: ProfileField;
  value: string;
  onChange: (field: ProfileField, value: string) => void;
  error?: string;
  disabled: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'next' | 'done';
  unit?: string;
}) {
  const theme = useTheme();
  const t = useTranslations(profileMessages);
  const errorID = `${field}-profile-error`;
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <ThemedText variant="caption" themeColor="textSecondary">{t(fieldLabels[field])}{unit ? ` (${unit})` : ''}</ThemedText>
      <View style={{ minHeight: 49, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.sm, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: error ? theme.danger : theme.border }}>
        <TextInput
          accessibilityLabel={t(fieldLabels[field])}
          aria-describedby={error ? errorID : undefined}
          accessibilityHint={error ? t('Error. {error}', { error }) : unit ? t('Optional. {unit}. Clear to remove.', { unit }) : t('Optional. Clear to remove.')}
          accessibilityState={{ disabled }}
          value={value}
          onChangeText={(text) => onChange(field, text)}
          editable={!disabled}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'none'}
          returnKeyType={returnKeyType}
          placeholder={t('Not provided')}
          placeholderTextColor={theme.textSecondary}
          selectionColor={theme.accent}
          style={{ color: theme.text, flex: 1, minHeight: 48, paddingVertical: spacing.sm, fontSize: 16 }}
        />
        {unit ? <ThemedText variant="caption" themeColor="textSecondary">{unit}</ThemedText> : null}
      </View>
      {error ? <ThemedText nativeID={errorID} accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
    </View>
  );
}

function OptionPicker({ field, value, onPress, error, disabled }: {
  field: 'gender' | 'activityLevel';
  value: string;
  onPress: () => void;
  error?: string;
  disabled: boolean;
}) {
  const theme = useTheme();
  const t = useTranslations(profileMessages);
  const selected = field === 'gender' ? genderOptions.find((option) => option.value === value)?.label : activityOptions.find((option) => option.value === value)?.label;
  const selectedLabel = selected ? t(selected) : undefined;
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="caption" themeColor="textSecondary">{t(fieldLabels[field])}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={selectedLabel ? t('{field}, {selected}', { field: t(fieldLabels[field]), selected: selectedLabel }) : t('{field}, not selected', { field: t(fieldLabels[field]) })} accessibilityHint={error ?? (disabled ? t('Unavailable until verification finishes.') : t('Choose an option. You can clear this selection.'))}
        accessibilityState={{ disabled, expanded: undefined }} disabled={disabled} onPress={onPress}
        style={{ minHeight: 49, borderRadius: radius.md, borderWidth: 1, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.backgroundElement, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
        <ThemedText variant="label" style={{ flex: 1 }}>{selectedLabel ?? t('Choose one')}</ThemedText>
        <ThemedText themeColor="textSecondary">⌄</ThemedText>
      </Pressable>
      {error ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
    </View>
  );
}

function GenderChoices({ value, onSelect, error, disabled }: { value: string; onSelect: (value: string) => void; error?: string; disabled: boolean }) {
  const theme = useTheme();
  const t = useTranslations(profileMessages);
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="caption" themeColor="textSecondary">{t('Gender · self-described')}</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {genderOptions.map((option) => {
          const selected = value === option.value;
          return (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={t(option.label)} accessibilityState={{ checked: selected, disabled }} onPress={() => onSelect(selected ? '' : option.value)} disabled={disabled}
              style={{ minHeight: 48, width: '48%', flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement }}>
              <View accessible={false} style={{ width: 17, height: 17, borderRadius: radius.full, borderWidth: selected ? 5 : 1.5, borderColor: selected ? theme.accent : theme.border }} />
            <ThemedText variant="caption" style={{ flex: 1 }}>{t(option.label)}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      {error ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
    </View>
  );
}

function ActivityChoices({ value, onSelect, error, disabled }: { value: string; onSelect: (value: string) => void; error?: string; disabled: boolean }) {
  const theme = useTheme();
  const t = useTranslations(profileMessages);
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs }}>
          <ThemedText variant="caption" themeColor="textSecondary">{t('Activity level')}</ThemedText>
          <ThemedText variant="caption" themeColor="textSecondary">{t('CHOOSE ONE')}</ThemedText>
      </View>
      {activityOptions.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={t('{label}. {description}', { label: t(option.label), description: t(option.description) })} accessibilityState={{ checked: selected, disabled }} disabled={disabled}
            onPress={() => onSelect(selected ? '' : option.value)} style={{ minHeight: 48, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View accessible={false} style={{ width: 18, height: 18, borderRadius: radius.full, borderWidth: selected ? 5 : 1.5, borderColor: selected ? theme.accent : theme.border }} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelStrong">{t(option.label)}</ThemedText>
              <ThemedText variant="caption" themeColor="textSecondary">{t(option.description)}</ThemedText>
            </View>
          </Pressable>
        );
      })}
      {error ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
      <ThemedText variant="caption" themeColor="textSecondary">{t('Examples are a guide. They aren’t requirements.')}</ThemedText>
    </View>
  );
}

function ChoiceSheet({ title, options, selected, showClear, onSelect, onClear, onClose }: {
  title: string;
  options: readonly Option[];
  selected: string;
  showClear: boolean;
  onSelect: (value: string) => void;
  onClear?: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslations(profileMessages);
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Close options')} onPress={onClose} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '82%' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(spacing.lg, insets.bottom), gap: spacing.sm }}>
            <ThemedText accessibilityRole="header" variant="heading">{title}</ThemedText>
            {options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected === option.value }} onPress={() => onSelect(option.value)} style={{ minHeight: sizing.controlComfortable, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border, justifyContent: 'center' }}>
              <ThemedText variant="labelStrong">{option.label}</ThemedText>
              {option.description ? <ThemedText variant="caption" themeColor="textSecondary">{option.description}</ThemedText> : null}
            </Pressable>)}
            {showClear && onClear ? <ProfileButton label={t('Clear selection')} secondary onPress={onClear} /> : null}
            <ProfileButton label={t('Done')} secondary onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DecisionSheet({ title, body, primary, secondary, warning, details, error, onPrimary, onSecondary, onClose }: {
  title: string;
  body: string;
  primary: string;
  secondary: string;
  warning?: boolean;
  details?: ProfileSnapshot;
  error?: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { locale } = useI18n();
  const t = useTranslations(profileMessages);
  const latestValues = details?.profile?.values ?? {};
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
        <View style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(spacing.lg, insets.bottom), gap: spacing.sm }}>
          <View accessible={false} style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: radius.full, backgroundColor: theme.border, marginBottom: spacing.xs }} />
          <ThemedText variant="largeTitle" themeColor={warning ? 'warning' : 'accent'}>{warning ? '!' : '↻'}</ThemedText>
          <ThemedText accessibilityRole="header" variant="heading">{title}</ThemedText>
          <ThemedText variant="subhead" themeColor="textSecondary">{body}</ThemedText>
          {details ? (
            <View style={{ backgroundColor: theme.background, borderRadius: radius.lg, borderColor: theme.border, borderWidth: 1, padding: spacing.md }}>
                <ThemedText variant="caption" themeColor="accent" style={{ fontWeight: '800', marginBottom: spacing.xs }}>{t('LATEST SAVED DETAILS')}</ThemedText>
                {profileFields.map((field) => <View key={field} style={{ minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                  <ThemedText variant="caption" themeColor="textSecondary" style={{ flex: 1 }}>{t(fieldLabels[field])}</ThemedText>
                  <ThemedText variant="label" style={{ flex: 1, textAlign: 'right' }}>{formatProfileValue(field, latestValues, locale, { notAdded: t('Not added'), genders: { male: t('Male'), female: t('Female'), other: t('Other'), prefer_not_to_say: t('Prefer not to say') }, activityLevels: { sedentary: t('Mostly seated'), lightly_active: t('Lightly active'), moderately_active: t('Moderately active'), very_active: t('Very active') } })}</ThemedText>
                </View>)}
            </View>
          ) : null}
          {error ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
          <ProfileButton label={primary} onPress={onPrimary} />
          <ProfileButton label={secondary} onPress={onSecondary} secondary />
          <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {t(warning ? 'Your draft stays here while you verify the current profile.' : 'Previous draft values will not be reapplied.')}
          </ThemedText>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function localizedOptions(options: readonly { value: string; label: ProfileMessageKey; description?: ProfileMessageKey }[], t: ProfileTranslator): Option[] {
  return options.map((option) => ({ ...option, label: t(option.label), description: option.description ? t(option.description) : undefined }));
}

function translateError(error: string | undefined, t: ProfileTranslator, locale: string): string | undefined {
  if (!error) return undefined;
  if (error.startsWith('Enter a whole year from 1900 to ')) {
    const year = Number(error.match(/\d{4}$/)?.[0]);
    return t('Enter a whole year from 1900 to {year}.', { year: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(year) });
  }
  const known = [
    'Enter a display name from 1 to 50 characters.',
    'Enter a height from 20 to 300 cm.',
    'Enter a weight from 0.3 to 500 kg.',
    'Choose one of the available options.',
  ];
  return known.includes(error) ? t(error as ProfileMessageKey) : error;
}
