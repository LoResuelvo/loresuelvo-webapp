export async function rejectWorkRequest(
  requestId: number
): Promise<void> {
  console.log("[DEBUG] Reject request in use case:", requestId);
}
