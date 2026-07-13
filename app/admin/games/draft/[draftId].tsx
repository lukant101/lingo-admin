import { useLocalSearchParams } from "expo-router";

import { GameDraftEditor } from "@/components/game/GameDraftEditor";

export default function GameDraftScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  if (!draftId) return null;
  return <GameDraftEditor draftId={draftId} />;
}
