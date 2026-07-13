import { useLocalSearchParams } from "expo-router";

import { PlatformDeckForm } from "@/components/platformDeck/PlatformDeckForm";

export default function PlatformDeckEditScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  if (!deckId) return null;
  return <PlatformDeckForm deckId={deckId} />;
}
