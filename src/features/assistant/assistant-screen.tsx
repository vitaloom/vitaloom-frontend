import { useLocalSearchParams } from 'expo-router';

import { useAssistantAccess } from './assistant-access-provider';
import AssistantCourseScreen from './assistant-course-screen';

export default function AssistantScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const access = useAssistantAccess();

  if (!access.personalDataAllowed) return null;
  return <AssistantCourseScreen key={`${access.accountId}:${conversationId ?? ''}`}
    initialConversationId={conversationId} />;
}
