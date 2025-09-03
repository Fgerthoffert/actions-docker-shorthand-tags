import { sleep } from '../src/utils/sleep'

import { jest } from '@jest/globals'

describe('sleep', () => {
  jest.useFakeTimers()

  it('should resolve with "done!" after the specified time', async () => {
    const milliseconds = 1000
    const promise = sleep(milliseconds)

    // Fast-forward time
    jest.advanceTimersByTime(milliseconds)

    await expect(promise).resolves.toBe('done!')
  })

  it('should throw an error if milliseconds is not a number', async () => {
    await expect(sleep(NaN)).rejects.toThrow('milliseconds not a number')
  })
})
