import { PublishProgress } from "@/components/platformDeck/PublishProgress";
import { useLocalSearchParams } from "expo-router";

export default function PublishPlatformDeckScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  if (!draftId) return null;
  return <PublishProgress draftId={draftId} />;
}
