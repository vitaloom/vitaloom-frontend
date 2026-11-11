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

import { ProfileButton, ProfileHero } from '../components/profile-primitives';
import type { ProfileEditor } from '../hooks/use-profile-editor';
import { activityOptions, fieldLabels, genderOptions, profileFields, type ProfileField, type ProfileSnapshot } from '../types/profile';
import { formatProfileValue } from '../utils/profile-form';
import { StatusBanner } from './profile-overview';

type Option = { value: string; label: string; description?: string };

export function ProfileFormScreen({ mode, editor, onCancel, onSkip, onAuthRetry }: {
  mode: 'setup' | 'edit';
  editor: ProfileEditor;
  onCancel: () => void;
  onSkip?: () => void;
  onAuthRetry: () => void;
}) {
  const theme = useTheme();
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
    ? showBasics ? 'A little about you.' : 'Your everyday rhythm.'
    : 'Your profile, your choice.';
  const subtitle = setup
    ? showBasics ? 'Every field is optional. Add the details you’d like to share.' : 'A few details, only if you would like to share them.'
    : 'Every field is optional. Change only what you want to share.';

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
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'flex-start', justifyContent: 'center' }}>
              <ThemedText variant="heading">‹</ThemedText>
            </Pressable>
            <ThemedText accessibilityRole="header" variant="bodyStrong">{setup ? 'Profile setup' : 'Edit personal profile'}</ThemedText>
            {setup && onSkip ? <Pressable accessibilityRole="button" accessibilityLabel="Skip profile setup" disabled={inputDisabled} onPress={onSkip} style={{ minWidth: sizing.controlMin, minHeight: sizing.controlMin, alignItems: 'flex-end', justifyContent: 'center' }}><ThemedText variant="labelStrong" themeColor="accent">Skip</ThemedText></Pressable> : <View style={{ width: sizing.controlMin }} />}
          </View>

          {setup && !hasUnknown ? <ProfileHero step={editor.step} eyebrow={`Profile setup · ${editor.step} of 2`} title={title} subtitle={subtitle} compact /> : setup ? null : (
            <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: theme.accentSoft, marginBottom: spacing.md }}>
              <ThemedText themeColor="accent">✦</ThemedText>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <ThemedText variant="labelStrong" themeColor="accent">Your profile, your choice.</ThemedText>
                <ThemedText variant="caption" themeColor="textSecondary">Every field is optional. Change only what you want to share.</ThemedText>
              </View>
            </View>
          )}

          {editor.notice?.kind === 'partial-success' ? (
            <StatusBanner text={`Some changes saved. Updated ${editor.notice.applied.map((field) => fieldLabels[field]).join(', ')}. Review the highlighted fields.`} success />
          ) : null}
          {editor.notice?.kind === 'validation-error' && editor.errors ? <StatusBanner text={setup ? 'Please fix the highlighted fields. Nothing was saved.' : 'Review the highlighted fields below.'} /> : null}
          {editor.notice?.kind === 'no-changes' ? <StatusBanner text="No changes to save." /> : null}
          {editor.notice?.kind === 'network-error' ? <StatusBanner text="This attempt didn’t save. Your draft is ready to retry." /> : null}
          {editor.notice?.kind === 'unauthorized' ? <StatusBanner text="Your session needs attention before you can save." /> : null}
          {hasUnknown && editor.recovery?.kind === 'unconfirmed' && !editor.recovery.visible ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              <StatusBanner text="Your save is still unconfirmed. Check the latest profile before saving again." />
              <ProfileButton label="Check current profile" onPress={editor.showVerification} />
            </View>
          ) : null}

          {showBasics ? (
            <FieldGroup title={setup ? 'The basics' : undefined} note={setup ? 'ALL OPTIONAL' : undefined}>
              <TextProfileField field="displayName" value={editor.draft.displayName} onChange={editor.change} error={editor.errors.displayName} disabled={inputDisabled} autoCapitalize="words" returnKeyType="next" />
              {setup ? (
                <>
                  <TextProfileField field="birthYear" value={editor.draft.birthYear} onChange={editor.change} error={editor.errors.birthYear} disabled={inputDisabled} keyboardType="number-pad" returnKeyType="done" />
                  <GenderChoices value={editor.draft.gender} onSelect={(value) => editor.change('gender', value)} error={editor.errors.gender} disabled={inputDisabled} />
                </>
              ) : (
                <View style={{ flexDirection: pairDirection, gap: spacing.sm }}>
                  <View style={{ flex: 1 }}><TextProfileField field="birthYear" value={editor.draft.birthYear} onChange={editor.change} error={editor.errors.birthYear} disabled={inputDisabled} keyboardType="number-pad" returnKeyType="done" /></View>
                  <View style={{ flex: 1 }}><OptionPicker field="gender" value={editor.draft.gender} onPress={() => setPicker('gender')} error={editor.errors.gender} disabled={inputDisabled} /></View>
                </View>
              )}
              {setup ? <ThemedText variant="caption" themeColor="textSecondary">Your information is self-reported and can be updated anytime.</ThemedText> : (
                <>
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.border, marginVertical: spacing.xs }} />
                  <View style={{ flexDirection: pairDirection, gap: spacing.sm }}>
                    <View style={{ flex: 1 }}><TextProfileField field="heightCm" value={editor.draft.heightCm} onChange={editor.change} error={editor.errors.heightCm} disabled={inputDisabled} keyboardType="decimal-pad" unit="cm" /></View>
                    <View style={{ flex: 1 }}><TextProfileField field="weightKg" value={editor.draft.weightKg} onChange={editor.change} error={editor.errors.weightKg} disabled={inputDisabled} keyboardType="decimal-pad" unit="kg" /></View>
                  </View>
                  <OptionPicker field="activityLevel" value={editor.draft.activityLevel} onPress={() => setPicker('activityLevel')} error={editor.errors.activityLevel} disabled={inputDisabled} />
                </>
              )}
            </FieldGroup>
          ) : (
            <FieldGroup title="Body details" note="ALL OPTIONAL">
              <View style={{ flexDirection: pairDirection, gap: spacing.sm }}>
                <View style={{ flex: 1 }}><TextProfileField field="heightCm" value={editor.draft.heightCm} onChange={editor.change} error={editor.errors.heightCm} disabled={inputDisabled} keyboardType="decimal-pad" unit="cm" /></View>
                <View style={{ flex: 1 }}><TextProfileField field="weightKg" value={editor.draft.weightKg} onChange={editor.change} error={editor.errors.weightKg} disabled={inputDisabled} keyboardType="decimal-pad" unit="kg" /></View>
              </View>
              <ActivityChoices value={editor.draft.activityLevel} onSelect={(value) => editor.change('activityLevel', value)} error={editor.errors.activityLevel} disabled={inputDisabled} />
            </FieldGroup>
          )}

          {!setup ? (
            <ThemedText variant="caption" themeColor="textSecondary" style={{ marginTop: spacing.md }}>
              Clear any value to remove it. Changing your profile won’t update water or sleep goals.
            </ThemedText>
          ) : null}

          {setup && !showBasics ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <ProfileButton label={editor.busy ? 'Saving…' : 'Save my profile'} onPress={save} disabled={inputDisabled} accessibilityHint="Save the optional details you entered" />
              {onSkip ? <ProfileButton label="Skip for now" onPress={onSkip} secondary disabled={inputDisabled} /> : null}
              <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>No medical details required.</ThemedText>
            </View>
          ) : setup ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <ProfileButton label="Continue" onPress={() => { Keyboard.dismiss(); editor.advance(); }} disabled={inputDisabled} accessibilityHint="Continue to body details without saving" />
              {onSkip ? <ProfileButton label="Skip for now" onPress={onSkip} secondary disabled={inputDisabled} /> : null}
            </View>
          ) : (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <ProfileButton label={editor.busy ? 'Saving…' : 'Save changes'} onPress={save} disabled={inputDisabled} />
              <ProfileButton label="Cancel" onPress={onCancel} secondary disabled={editor.busy} />
              <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>Only the fields you change are considered.</ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {picker ? (
        <ChoiceSheet
          title={picker === 'gender' ? 'Choose gender' : 'Choose activity level'}
          options={picker === 'gender' ? genderOptions : activityOptions}
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
            title="Your profile changed on another device"
            body="We’ve loaded the latest details. Your unsaved edits were not applied."
            primary="Continue updating"
            secondary="Not now"
            onPrimary={editor.continueFromLatest}
            onSecondary={onCancel}
            onClose={onCancel}
            details={conflict.latest.snapshot}
          />
        ) : (
          <DecisionSheet title="We couldn’t verify the latest profile" body="Save is paused until the current details can be checked." primary="Try again" secondary="Not now" onPrimary={editor.verify} onSecondary={onCancel} onClose={onCancel} />
        )
      ) : null}

      {hasUnknown && editor.recovery?.kind === 'unconfirmed' && editor.recovery.visible ? (
        <DecisionSheet
          warning
          title="Couldn’t confirm your save"
          body="Your updates may have reached the server. Check the current profile before trying to save again."
          primary={editor.busy ? 'Checking…' : 'Check current profile'}
          secondary="Keep draft"
          onPrimary={editor.verify}
          onSecondary={editor.keepDraft}
          onClose={editor.keepDraft}
          error={editor.recovery.check === 'network-error' ? 'The current profile still can’t be verified. Retry verification when connected.' : editor.recovery.check === 'unauthorized' ? 'Your session could not be verified. Sign in before continuing.' : editor.recovery.check === 'unresolved' ? 'The save has no final confirmation yet. Keep checking before trying again.' : undefined}
        />
      ) : null}

      {editor.notice?.kind === 'unauthorized' ? (
        <Pressable accessibilityRole="button" onPress={onAuthRetry} style={{ position: 'absolute', bottom: spacing.lg, alignSelf: 'center', minHeight: sizing.controlMin, justifyContent: 'center', paddingHorizontal: spacing.lg }}>
          <ThemedText themeColor="accent" variant="labelStrong">Check session</ThemedText>
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
  const errorID = `${field}-profile-error`;
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <ThemedText variant="caption" themeColor="textSecondary">{fieldLabels[field]}{unit ? ` (${unit})` : ''}</ThemedText>
      <View style={{ minHeight: 49, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.sm, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: error ? theme.danger : theme.border }}>
        <TextInput
          accessibilityLabel={fieldLabels[field]}
          aria-describedby={error ? errorID : undefined}
          accessibilityHint={error ? `Error. ${error}` : unit ? `Optional. ${unit}. Clear to remove.` : 'Optional. Clear to remove.'}
          accessibilityState={{ disabled }}
          value={value}
          onChangeText={(text) => onChange(field, text)}
          editable={!disabled}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'none'}
          returnKeyType={returnKeyType}
          placeholder="Not provided"
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
  const selected = field === 'gender' ? genderOptions.find((option) => option.value === value)?.label : activityOptions.find((option) => option.value === value)?.label;
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="caption" themeColor="textSecondary">{fieldLabels[field]}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={`${fieldLabels[field]}${selected ? `, ${selected}` : ', not selected'}`} accessibilityHint={error ?? (disabled ? 'Unavailable until verification finishes.' : 'Choose an option. You can clear this selection.')}
        accessibilityState={{ disabled, expanded: undefined }} disabled={disabled} onPress={onPress}
        style={{ minHeight: 49, borderRadius: radius.md, borderWidth: 1, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.backgroundElement, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
        <ThemedText variant="label" style={{ flex: 1 }}>{selected ?? 'Choose one'}</ThemedText>
        <ThemedText themeColor="textSecondary">⌄</ThemedText>
      </Pressable>
      {error ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
    </View>
  );
}

function GenderChoices({ value, onSelect, error, disabled }: { value: string; onSelect: (value: string) => void; error?: string; disabled: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="caption" themeColor="textSecondary">Gender · self-described</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {genderOptions.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: selected, disabled }} onPress={() => onSelect(selected ? '' : option.value)} disabled={disabled}
              style={{ minHeight: 48, width: '48%', flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement }}>
              <View accessible={false} style={{ width: 17, height: 17, borderRadius: radius.full, borderWidth: selected ? 5 : 1.5, borderColor: selected ? theme.accent : theme.border }} />
              <ThemedText variant="caption" style={{ flex: 1 }}>{option.label}</ThemedText>
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
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs }}>
        <ThemedText variant="caption" themeColor="textSecondary">Activity level</ThemedText>
        <ThemedText variant="caption" themeColor="textSecondary">CHOOSE ONE</ThemedText>
      </View>
      {activityOptions.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={`${option.label}. ${option.description}`} accessibilityState={{ checked: selected, disabled }} disabled={disabled}
            onPress={() => onSelect(selected ? '' : option.value)} style={{ minHeight: 48, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View accessible={false} style={{ width: 18, height: 18, borderRadius: radius.full, borderWidth: selected ? 5 : 1.5, borderColor: selected ? theme.accent : theme.border }} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelStrong">{option.label}</ThemedText>
              <ThemedText variant="caption" themeColor="textSecondary">{option.description}</ThemedText>
            </View>
          </Pressable>
        );
      })}
      {error ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
      <ThemedText variant="caption" themeColor="textSecondary">Examples are a guide. They aren’t requirements.</ThemedText>
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
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close options" onPress={onClose} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ backgroundColor: theme.backgroundElement, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '82%' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(spacing.lg, insets.bottom), gap: spacing.sm }}>
            <ThemedText accessibilityRole="header" variant="heading">{title}</ThemedText>
            {options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected === option.value }} onPress={() => onSelect(option.value)} style={{ minHeight: sizing.controlComfortable, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border, justifyContent: 'center' }}>
              <ThemedText variant="labelStrong">{option.label}</ThemedText>
              {option.description ? <ThemedText variant="caption" themeColor="textSecondary">{option.description}</ThemedText> : null}
            </Pressable>)}
            {showClear && onClear ? <ProfileButton label="Clear selection" secondary onPress={onClear} /> : null}
            <ProfileButton label="Done" secondary onPress={onClose} />
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
                <ThemedText variant="caption" themeColor="accent" style={{ fontWeight: '800', marginBottom: spacing.xs }}>LATEST SAVED DETAILS</ThemedText>
                {profileFields.map((field) => <View key={field} style={{ minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                  <ThemedText variant="caption" themeColor="textSecondary" style={{ flex: 1 }}>{fieldLabels[field]}</ThemedText>
                  <ThemedText variant="label" style={{ flex: 1, textAlign: 'right' }}>{formatProfileValue(field, latestValues) || 'Not added'}</ThemedText>
                </View>)}
            </View>
          ) : null}
          {error ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="caption" themeColor="danger">{error}</ThemedText> : null}
          <ProfileButton label={primary} onPress={onPrimary} />
          <ProfileButton label={secondary} onPress={onSecondary} secondary />
          <ThemedText variant="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {warning ? 'Your draft stays here while you verify the current profile.' : 'Previous draft values will not be reapplied.'}
          </ThemedText>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
