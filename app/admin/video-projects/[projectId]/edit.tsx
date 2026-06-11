import { VideoProjectWizard } from "@/components/videoProject/VideoProjectWizard";
import { useLocalSearchParams } from "expo-router";

export default function EditVideoProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  if (!projectId) return null;
  return <VideoProjectWizard projectId={projectId} />;
}
