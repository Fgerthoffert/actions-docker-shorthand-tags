import * as core from '@actions/core'

import { sleep } from './sleep.js'

export interface RetryOptions {
  /** Number of retries attempted after the initial try (default: 4). */
  retries?: number
  /** Base delay in milliseconds, doubled on each attempt (default: 1000). */
  minDelayMs?: number
  /** Upper bound for the backoff delay in milliseconds (default: 15000). */
  maxDelayMs?: number
  /** Human-readable label used in log messages. */
  label?: string
  /**
   * Predicate deciding whether a given error is worth retrying. Defaults to
   * retrying every error.
   */
  shouldRetry?: (error: unknown) => boolean
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Determines whether an HTTP-like error is transient and worth retrying.
 *
 * Network errors (no status) and server errors (5xx) are retried, as is
 * rate-limiting (429). Other client errors (e.g. 401, 404) are not, since
 * retrying them will not change the outcome.
 */
export const isRetryableHttpError = (error: unknown): boolean => {
  const status = (error as { status?: number } | null | undefined)?.status
  if (status === undefined) {
    // No HTTP status usually means a network/transport error, which is transient
    return true
  }
  if (status === 429) {
    return true
  }
  return status >= 500
}

/**
 * Runs an async function, retrying it with exponential backoff when it throws.
 *
 * Every attempt and failure is logged so that intermittent issues are visible
 * in the action logs rather than silently swallowed.
 *
 * @param fn - The async operation to execute.
 * @param options - Retry behaviour configuration.
 * @returns The resolved value of `fn`.
 * @throws The last error encountered once all retries are exhausted, or
 *         immediately if `shouldRetry` returns false.
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    retries = 4,
    minDelayMs = 1000,
    maxDelayMs = 15000,
    label = 'operation',
    shouldRetry = () => true
  } = options

  const totalAttempts = retries + 1
  let lastError: unknown

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      if (attempt > 1) {
        core.info(`Attempt ${attempt} of ${totalAttempts} for ${label}`)
      }
      return await fn()
    } catch (error) {
      lastError = error
      const message = errorMessage(error)

      if (attempt >= totalAttempts || !shouldRetry(error)) {
        core.error(
          `${label} failed after ${attempt} attempt(s): ${message}${
            attempt < totalAttempts ? ' (error is not retryable)' : ''
          }`
        )
        throw error
      }

      const delay = Math.min(minDelayMs * 2 ** (attempt - 1), maxDelayMs)
      core.warning(
        `${label} failed (attempt ${attempt} of ${totalAttempts}): ${message}. Retrying in ${delay}ms...`
      )
      await sleep(delay)
    }
  }

  // Unreachable: the loop either returns or throws, but satisfies the compiler.
  throw lastError
}

export default withRetry
