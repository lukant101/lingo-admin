type RecordingResult = {
  uri: string;
  durationMs: number;
  filename: string;
};

let pendingResult: RecordingResult | null = null;

export function setRecordingResult(result: RecordingResult): void {
  pendingResult = result;
}

export function consumeRecordingResult(): RecordingResult | null {
  const result = pendingResult;
  pendingResult = null;
  return result;
}
