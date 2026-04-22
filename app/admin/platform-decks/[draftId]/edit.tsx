import { PlatformDeckWizard } from "@/components/platformDeck/PlatformDeckWizard";
import { useLocalSearchParams } from "expo-router";

export default function EditPlatformDeckScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  if (!draftId) return null;
  return <PlatformDeckWizard draftId={draftId} />;
}
