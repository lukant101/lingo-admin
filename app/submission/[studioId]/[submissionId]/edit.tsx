import { SubmissionWizard } from "@/components/submission/SubmissionWizard";
import { useLocalSearchParams } from "expo-router";

export default function EditSubmissionScreen() {
  const { studioId, submissionId } = useLocalSearchParams<{
    studioId: string;
    submissionId: string;
  }>();

  if (!studioId || !submissionId) return null;

  return <SubmissionWizard studioId={studioId} submissionId={submissionId} />;
}
