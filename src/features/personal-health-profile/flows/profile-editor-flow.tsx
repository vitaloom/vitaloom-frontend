import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

import { getProfileRepository } from '../api/profile-repository-instance';
import type { ProfileRepository } from '../api/profile-repository';
import { rememberProfileConfirmation } from '../hooks/profile-confirmation';
import { useProfileEditor } from '../hooks/use-profile-editor';
import { useProfileRead } from '../hooks/use-profile-read';
import { ProfileFormScreen } from '../screens/profile-form-screen';
import { ProfileLoadScreen } from '../screens/profile-load-screen';
import type { ProfileSnapshot } from '../types/profile';

type FlowProps = {
  accountId: string;
  onCancel: () => void;
  onAuthRetry: () => Promise<void>;
};

type SetupProps = FlowProps & { onComplete: () => void; onSkip: () => void };

export function ProfileSetupFlow({ accountId, onCancel, onAuthRetry, onComplete, onSkip }: SetupProps) {
  const repository = getProfileRepository(accountId);
  const editor = useProfileEditor({
    mode: 'setup',
    repository,
    onClose: onCancel,
    onSkip,
    onAlreadyCreated: onComplete,
    onSaved: (snapshot) => {
      rememberProfileConfirmation(repository, snapshot);
      onComplete();
    },
  });
  const { back, step } = editor;
  useFocusEffect(useCallback(() => {
    if (step !== 2) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [back, step]));

  return (
    <ProfileFormScreen
      mode="setup"
      editor={editor}
      onCancel={onCancel}
      onSkip={onSkip}
      onAuthRetry={() => void onAuthRetry().then(editor.retryAccess)}
    />
  );
}

export function ProfileEditFlow({ accountId, onCancel, onAuthRetry }: FlowProps) {
  const repository = getProfileRepository(accountId);
  const { state, retry } = useProfileRead(repository);

  if (state.kind !== 'verified') {
    return (
      <ProfileLoadScreen
        kind={state.kind}
        onBack={onCancel}
        onRetry={() => {
          if (state.kind === 'unauthorized') void onAuthRetry().then(retry);
          else retry();
        }}
      />
    );
  }
  return <LoadedEditor repository={repository} snapshot={state.snapshot} onCancel={onCancel} onAuthRetry={onAuthRetry} />;
}

function LoadedEditor({
  repository, snapshot, onCancel, onAuthRetry,
}: {
  repository: ProfileRepository;
  snapshot: ProfileSnapshot;
  onCancel: FlowProps['onCancel'];
  onAuthRetry: FlowProps['onAuthRetry'];
}) {
  const editor = useProfileEditor({
    mode: 'edit',
    repository,
    initial: snapshot,
    onClose: onCancel,
    onSaved: (savedSnapshot) => {
      rememberProfileConfirmation(repository, savedSnapshot);
      onCancel();
    },
  });
  return <ProfileFormScreen mode="edit" editor={editor} onCancel={onCancel} onAuthRetry={() => void onAuthRetry().then(editor.retryAccess)} />;
}
