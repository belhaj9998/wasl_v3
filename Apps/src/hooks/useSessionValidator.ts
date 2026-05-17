/**
 * Session Validator Hook
 * Validates the user's session by calling /auth/me on protected page load.
 * If the session is invalid or the refresh token has expired, clears the session
 * and redirects to the login page with a session_expired query parameter.
 *
 * Requirements: 11.1, 11.3, 11.7
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/store/hooks";
import { resetAuth } from "@/lib/store/slices/auth.slice";
import { setAccessToken } from "@/lib/api/client";
import { fetchProfileThunk } from "@/lib/store/slices/auth.thunks";
import { ROUTES } from "@/lib/constants/routes";
import { STORAGE_KEYS } from "@/lib/constants/storage";

/**
 * Hook that validates the current session on mount by calling /auth/me.
 * On success, updates user data in Redux (userId, systemRole, permissions).
 * On failure (token invalid/expired), clears session and redirects to login
 * with ?session_expired=true within 2 seconds max.
 */
export function useSessionValidator() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hasValidated = useRef(false);

  useEffect(() => {
    // Only validate once per mount
    if (hasValidated.current) return;
    hasValidated.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function validateSession() {
      // Set a 2-second timeout to ensure redirect happens within the time limit
      const redirectTimeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Session validation timeout"));
        }, 2000);
      });

      try {
        // Race between the actual validation and the timeout
        await Promise.race([
          dispatch(fetchProfileThunk()).unwrap(),
          redirectTimeout,
        ]);

        // Session is valid — clear the timeout
        if (timeoutId) clearTimeout(timeoutId);
      } catch {
        // Session is invalid or timed out — clear and redirect
        if (timeoutId) clearTimeout(timeoutId);
        handleSessionExpiry();
      }
    }

    function handleSessionExpiry() {
      // Clear access token from memory
      setAccessToken(null);

      // Clear persisted store ID
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STORE_ID);
      }

      // Reset auth state in Redux
      dispatch(resetAuth());

      // Redirect to login with session_expired flag
      router.replace(`${ROUTES.AUTH.LOGIN}?session_expired=true`);
    }

    validateSession();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [dispatch, router]);
}
