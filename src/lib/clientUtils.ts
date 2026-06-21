/**
 * Safely clears all user-related cache and session data from localStorage and sessionStorage.
 * This prevents stale data leaks (e.g., global_users, notifications, access requests) when logging out.
 */
export function clearAllLocalStorage() {
  if (typeof window === "undefined") return;

  const keysToRemove = [
    "user",
    "pending_access_requests",
    "global_users",
    "admin_notifications",
    "realtime_toast",
    "global_phones_data",
    "mail_import_history",
    "global_bank_config",
    "global_agency_config",
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove key "${key}" from storage:`, e);
    }
  });

  // Remove dynamic keys matching patterns
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.startsWith("access_response_") ||
        key.startsWith("access_") ||
        key.startsWith("checkin_time_") ||
        key.startsWith("late_fine_paid_") ||
        key.startsWith("chat_last_read_time_") ||
        key.startsWith("chat_last_received_time_")
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error("Failed to clean up dynamic localStorage keys:", e);
  }
}
