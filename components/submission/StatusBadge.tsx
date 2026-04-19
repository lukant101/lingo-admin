import { StyleSheet } from "react-native";
import { Chip } from "react-native-paper";
import { COLORS } from "@/constants/theme";
import type { SubmissionStatus } from "@/types/submission";

type StatusBadgeProps = {
  status: SubmissionStatus;
};

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "#9E9E9E" },
  submitted: { label: "Submitted", color: "#2196F3" },
  in_review: { label: "In Review", color: "#FF9800" },
  requires_admin_review: { label: "Admin Review", color: "#FF9800" },
  approved: { label: "Approved", color: COLORS.SUCCESS_GREEN },
  processing_started: { label: "Processing", color: "#2196F3" },
  processing_completed: { label: "Completed", color: COLORS.SUCCESS_GREEN },
  rejected: { label: "Rejected", color: "#F44336" },
  cancelled: { label: "Cancelled", color: "#9E9E9E" },
  failed: { label: "Failed", color: "#F44336" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: "#9E9E9E",
  };

  return (
    <Chip
      mode="flat"
      compact
      style={[styles.chip, { backgroundColor: config.color + "20" }]}
      textStyle={[styles.text, { color: config.color }]}
    >
      {config.label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
