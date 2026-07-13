import { useLocalSearchParams } from "expo-router";

import { GameForm } from "@/components/game/GameForm";

export default function GameEditScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  if (!gameId) return null;
  return <GameForm gameId={gameId} />;
}
