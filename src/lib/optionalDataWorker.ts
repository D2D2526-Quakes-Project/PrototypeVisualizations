import { parseOptionalDatasetFromRawBuffer } from "@/lib/incrementalData";
import type { OptionalWorkerRequest, OptionalWorkerResponse } from "@/lib/incrementalData";

self.onmessage = async (event: MessageEvent<OptionalWorkerRequest>) => {
  try {
    const result = await parseOptionalDatasetFromRawBuffer(event.data);
    const response: OptionalWorkerResponse = { result };
    self.postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ error: message });
  }
};
