export type FormReceipt = {
  id: string;
  formId: string;
  requestId: string;
  receivedAt: string;
  fileCount: number;
};
export function verifiedFormReceipt(
  response: unknown,
  formId: string,
  requestId: string,
  fileCount: number,
): FormReceipt {
  const data = response as { ok?: unknown; receipt?: FormReceipt } | null;
  const receipt = data?.receipt;
  if (
    data?.ok !== true ||
    !receipt ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      receipt.id,
    ) ||
    receipt.formId !== formId ||
    receipt.requestId !== requestId ||
    receipt.fileCount !== fileCount ||
    !Number.isFinite(Date.parse(receipt.receivedAt))
  ) {
    throw new Error(
      "L’enregistrement n’a pas pu être confirmé. Conserve tes documents et réessaie : aucune confirmation de réception n’a été obtenue.",
    );
  }
  return receipt;
}
