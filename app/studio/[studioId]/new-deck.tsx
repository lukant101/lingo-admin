import { SubmissionWizard } from "@/components/submission/SubmissionWizard";
import { useLocalSearchParams } from "expo-router";

export default function NewDeckScreen() {
  const { studioId } = useLocalSearchParams<{ studioId: string }>();

  if (!studioId) return null;

  return <SubmissionWizard studioId={studioId} />;
}
