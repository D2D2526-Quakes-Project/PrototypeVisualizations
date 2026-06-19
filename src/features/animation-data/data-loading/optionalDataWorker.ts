import { parseOptionalDatasetFromRawBuffer } from "@/features/animation-data/data-loading/incrementalData";
import type {
  OptionalWorkerRequest,
  OptionalWorkerResponse,
} from "@/features/animation-data/data-loading/serializedTypes";

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
