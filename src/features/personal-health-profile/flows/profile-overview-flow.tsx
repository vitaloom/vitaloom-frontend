import { getProfileRepository } from '../api/profile-repository-instance';
import { useProfileRead } from '../hooks/use-profile-read';
import { ProfileLoadScreen } from '../screens/profile-load-screen';
import { ProfileOverview } from '../screens/profile-overview';

type OverviewProps = {
  accountId: string;
  onBack: () => void;
  onEdit: () => void;
  onSignOut: () => void;
  onAuthRetry: () => Promise<void>;
};

export function ProfileOverviewFlow({ accountId, onBack, onEdit, onSignOut, onAuthRetry }: OverviewProps) {
  const repository = getProfileRepository(accountId);
  const { state, retry } = useProfileRead(repository, true);

  if (state.kind !== 'verified') {
    return (
      <ProfileLoadScreen
        withTabs
        kind={state.kind}
        onBack={onBack}
        onSignOut={onSignOut}
        onRetry={() => {
          if (state.kind === 'unauthorized') void onAuthRetry().then(retry);
          else retry();
        }}
      />
    );
  }
  return <ProfileOverview snapshot={state.snapshot} saved={state.saved ?? false} {...{ onEdit, onBack, onSignOut }} />;
}
