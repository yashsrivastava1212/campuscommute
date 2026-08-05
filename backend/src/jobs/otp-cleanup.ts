import { purgeStaleOtps } from "../services/otp.service.js";

const OTP_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export function startOtpCleanupJob(): void {
  setInterval(() => {
    purgeStaleOtps().catch((error) => {
      console.error("OTP cleanup failed:", error);
    });
  }, OTP_CLEANUP_INTERVAL_MS);
}
