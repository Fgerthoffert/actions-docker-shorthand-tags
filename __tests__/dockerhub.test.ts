import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'

import type { DockerHubAuth } from '../src/types/index.js'

// Keep retries instant by stubbing the sleep used by withRetry.
const sleep = jest.fn(async () => 'done!')

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/utils/sleep.js', () => ({ sleep }))

let getDockerHubToken: typeof import('../src/repositories/dockerhub/getDockerHubToken.js').getDockerHubToken
let getDockerTags: typeof import('../src/repositories/dockerhub/getDockerTags.js').getDockerTags

const fetchMock = jest.fn<typeof fetch>()

beforeAll(async () => {
  global.fetch = fetchMock
  ;({ getDockerHubToken } =
    await import('../src/repositories/dockerhub/getDockerHubToken.js'))
  ;({ getDockerTags } =
    await import('../src/repositories/dockerhub/getDockerTags.js'))
})

const makeResponse = (
  body: unknown,
  init: { ok?: boolean; status?: number; statusText?: string } = {}
): Response => {
  const response = {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    clone() {
      return this
    },
    json: async () => body
  }
  return response as unknown as Response
}

const auth: DockerHubAuth = {
  domain: 'auth.docker.io',
  service: 'registry.docker.io',
  scope: 'repository:acme/app:pull',
  offlineToken: '1',
  clientId: 'shell',
  authorization: 'base64creds',
  token: { token: '', expires_in: 0, issued_at: '' }
}

describe('getDockerHubToken', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the token on a successful response', async () => {
    const token = { token: 'abc', expires_in: 300, issued_at: '2024-01-01' }
    fetchMock.mockResolvedValue(makeResponse(token))

    const result = await getDockerHubToken({ dockerHubAuth: auth })

    expect(result).toEqual(token)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends a Basic Authorization header to the token endpoint', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ token: 'abc', expires_in: 1, issued_at: '' })
    )

    await getDockerHubToken({ dockerHubAuth: auth })

    const [, options] = fetchMock.mock.calls[0]
    expect(options).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Basic base64creds' }
    })
  })

  it('retries on a transient server error and then succeeds', async () => {
    const token = { token: 'abc', expires_in: 300, issued_at: '2024-01-01' }
    fetchMock
      .mockResolvedValueOnce(
        makeResponse(
          {},
          { ok: false, status: 503, statusText: 'Service Unavailable' }
        )
      )
      .mockResolvedValueOnce(makeResponse(token))

    const result = await getDockerHubToken({ dockerHubAuth: auth })

    expect(result).toEqual(token)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('503'))
  })

  it('does not retry a non-retryable client error and rejects', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' })
    )

    await expect(getDockerHubToken({ dockerHubAuth: auth })).rejects.toThrow(
      '401'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('not retryable')
    )
  })

  it('retries network errors and rejects after exhausting retries', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(getDockerHubToken({ dockerHubAuth: auth })).rejects.toThrow(
      'network down'
    )
    // 1 initial attempt + 4 retries
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})

describe('getDockerTags', () => {
  const authedAuth: DockerHubAuth = {
    ...auth,
    token: { ...auth.token, token: 'abc' }
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the list of tags from the registry response', async () => {
    fetchMock.mockResolvedValue(makeResponse({ tags: ['1.2.3', '2.0.0'] }))

    const result = await getDockerTags({
      dockerHubAuth: authedAuth,
      dockerHubRepository: 'acme/app'
    })

    expect(result).toEqual(['1.2.3', '2.0.0'])
  })

  it('sends a Bearer Authorization header built from the token', async () => {
    fetchMock.mockResolvedValue(makeResponse({ tags: [] }))

    await getDockerTags({
      dockerHubAuth: authedAuth,
      dockerHubRepository: 'acme/app'
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('acme/app/tags/list')
    expect(options).toMatchObject({
      headers: { Authorization: 'Bearer abc' }
    })
  })

  it('retries on a transient server error and then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeResponse({}, { ok: false, status: 500, statusText: 'Server Error' })
      )
      .mockResolvedValueOnce(makeResponse({ tags: ['1.0.0'] }))

    const result = await getDockerTags({
      dockerHubAuth: authedAuth,
      dockerHubRepository: 'acme/app'
    })

    expect(result).toEqual(['1.0.0'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('500'))
  })

  it('rejects after exhausting retries on persistent failures', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))

    await expect(
      getDockerTags({
        dockerHubAuth: authedAuth,
        dockerHubRepository: 'acme/app'
      })
    ).rejects.toThrow('boom')
    // 1 initial attempt + 4 retries
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('failed after 5 attempt(s)')
    )
  })
})
