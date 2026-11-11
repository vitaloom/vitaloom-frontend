import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { ProfileLoadResult, ProfileRepository } from '../api/profile-repository';
import { takeProfileConfirmation } from './profile-confirmation';

type ReadState = { kind: 'loading' } | (ProfileLoadResult & { saved?: boolean });

export function useProfileRead(repository: ProfileRepository, showSaveConfirmation = false) {
  const [state, setState] = useState<ReadState>({ kind: 'loading' });
  const requestId = useRef(0);

  const read = useCallback(() => {
    const id = ++requestId.current;
    setState({ kind: 'loading' });
    void repository.getMyProfile()
      .catch(() => ({ kind: 'network-error' }) as const)
      .then((result) => {
        if (requestId.current !== id) return;
        const saved = showSaveConfirmation && result.kind === 'verified'
          && takeProfileConfirmation(repository, result.snapshot);
        setState({ ...result, saved });
      });
  }, [repository, showSaveConfirmation]);

  useFocusEffect(useCallback(() => {
    read();
    return () => { requestId.current += 1; };
  }, [read]));

  return { state, retry: read };
}
