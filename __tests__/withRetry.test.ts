import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'

// Stub sleep so the backoff delays do not slow the test suite down.
const sleep = jest.fn(async () => 'done!')

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/utils/sleep.js', () => ({ sleep }))

let withRetry: typeof import('../src/utils/withRetry.js').withRetry
let isRetryableHttpError: typeof import('../src/utils/withRetry.js').isRetryableHttpError

beforeAll(async () => {
  ;({ withRetry, isRetryableHttpError } =
    await import('../src/utils/withRetry.js'))
})

describe('withRetry', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the result without retrying when the function succeeds', async () => {
    const fn = jest.fn<() => Promise<string>>().mockResolvedValue('ok')

    const result = await withRetry(fn)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
    expect(core.warning).not.toHaveBeenCalled()
  })

  it('retries with backoff and resolves once the function succeeds', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok')

    const result = await withRetry(fn, { minDelayMs: 10, label: 'demo' })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    // Two failures -> two backoff sleeps with exponential delays
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenNthCalledWith(1, 10)
    expect(sleep).toHaveBeenNthCalledWith(2, 20)
  })

  it('throws the last error after exhausting all retries', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('always fails'))

    await expect(
      withRetry(fn, { retries: 2, minDelayMs: 1, label: 'demo' })
    ).rejects.toThrow('always fails')

    // 1 initial attempt + 2 retries
    expect(fn).toHaveBeenCalledTimes(3)
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('failed after 3 attempt(s)')
    )
  })

  it('does not retry when shouldRetry returns false', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('fatal'))

    await expect(
      withRetry(fn, { retries: 3, shouldRetry: () => false })
    ).rejects.toThrow('fatal')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('caps the backoff delay at maxDelayMs', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce('ok')

    await withRetry(fn, { minDelayMs: 1000, maxDelayMs: 1500 })

    expect(sleep).toHaveBeenNthCalledWith(1, 1000)
    // Second delay would be 2000 but is capped at 1500
    expect(sleep).toHaveBeenNthCalledWith(2, 1500)
  })
})

describe('isRetryableHttpError', () => {
  it('retries transport errors that have no HTTP status', () => {
    expect(isRetryableHttpError(new Error('socket hang up'))).toBe(true)
  })

  it('retries 5xx server errors and 429 rate limiting', () => {
    expect(isRetryableHttpError({ status: 500 })).toBe(true)
    expect(isRetryableHttpError({ status: 503 })).toBe(true)
    expect(isRetryableHttpError({ status: 429 })).toBe(true)
  })

  it('does not retry other 4xx client errors', () => {
    expect(isRetryableHttpError({ status: 400 })).toBe(false)
    expect(isRetryableHttpError({ status: 401 })).toBe(false)
    expect(isRetryableHttpError({ status: 404 })).toBe(false)
  })
})
