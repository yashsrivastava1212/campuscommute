import {
  archiveCarpools,
  completeCarpools,
  expireJoinRequests,
} from "../services/carpool.service.js";
import { scanMergeProposals } from "../services/merge.service.js";

export function startLifecycleJobs() {
  setInterval(() => {
    expireJoinRequests().catch(console.error);
    completeCarpools().catch(console.error);
  }, 5 * 60 * 1000);

  setInterval(() => {
    archiveCarpools().catch(console.error);
  }, 60 * 60 * 1000);

  setInterval(() => {
    scanMergeProposals().catch(console.error);
  }, 15 * 60 * 1000);
}
