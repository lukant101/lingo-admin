import { AuthGate } from "@/components/AuthGate";
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <AuthGate>
      <Stack />
    </AuthGate>
  );
}
