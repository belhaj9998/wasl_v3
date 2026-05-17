/**
 * Abort Registry
 * Tracks active AbortControllers for pending API requests,
 * enabling cancellation of all in-flight requests when switching stores.
 *
 * Requirements: 4.5
 */

/** Map of request keys to their AbortControllers */
const activeControllers = new Map<string, AbortController>();

/**
 * Registers a new AbortController for a request and returns its signal.
 * If a controller already exists for the given key, it is aborted first.
 */
export function registerRequest(key: string): AbortSignal {
  // Abort any existing request with the same key
  const existing = activeControllers.get(key);
  if (existing) {
    existing.abort();
  }

  const controller = new AbortController();
  activeControllers.set(key, controller);
  return controller.signal;
}

/**
 * Removes a completed request from the registry.
 * Call this when a request finishes (success or error) to clean up.
 */
export function unregisterRequest(key: string): void {
  activeControllers.delete(key);
}

/**
 * Aborts all pending requests and clears the registry.
 * Used when switching stores to cancel any in-flight API calls
 * that belong to the previous store context.
 */
export function abortAllPendingRequests(): void {
  for (const [key, controller] of activeControllers) {
    controller.abort();
    activeControllers.delete(key);
  }
}

/**
 * Returns the number of currently tracked pending requests.
 * Useful for testing and debugging.
 */
export function getPendingRequestCount(): number {
  return activeControllers.size;
}
