import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'

const load = jest.fn()
const getKey = jest.fn<(key: string) => unknown>()
const setKey = jest.fn()
const save = jest.fn()

// Captures the options the source passes to `new FlatCache(...)` so we can
// assert the cache is created in the directory returned by getCacheDirectory.
let cacheOptions: unknown

class FlatCacheMock {
  constructor(options: unknown) {
    cacheOptions = options
  }
  load = load
  getKey = getKey
  setKey = setKey
  save = save
}

const getCacheDirectory = jest.fn<() => Promise<string>>()
const getDockerHubToken =
  jest.fn<
    typeof import('../src/repositories/dockerhub/getDockerHubToken.js').getDockerHubToken
  >()
const getDockerTags =
  jest.fn<
    typeof import('../src/repositories/dockerhub/getDockerTags.js').getDockerTags
  >()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('flat-cache', () => ({ FlatCache: FlatCacheMock }))
jest.unstable_mockModule('../src/repositories/getCacheDirectory.js', () => ({
  getCacheDirectory
}))
jest.unstable_mockModule(
  '../src/repositories/dockerhub/getDockerHubToken.js',
  () => ({ getDockerHubToken })
)
jest.unstable_mockModule(
  '../src/repositories/dockerhub/getDockerTags.js',
  () => ({ getDockerTags })
)

let fetchExistingTags: typeof import('../src/repositories/dockerhub/index.js').fetchExistingTags

beforeAll(async () => {
  ;({ fetchExistingTags } =
    await import('../src/repositories/dockerhub/index.js'))
})

const params = {
  inputDevCache: false,
  inputDockerHubUsername: 'user',
  inputDockerHubPassword: 'pass',
  inputSrcRepository: 'acme/app'
}

describe('dockerhub fetchExistingTags', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    cacheOptions = undefined
    getCacheDirectory.mockResolvedValue('/tmp/cache')
  })

  it('returns cached tags without hitting the API when dev cache is enabled and populated', async () => {
    getKey.mockReturnValue(['1.0.0', '2.0.0'])

    const result = await fetchExistingTags({ ...params, inputDevCache: true })

    expect(result).toEqual(['1.0.0', '2.0.0'])
    expect(getDockerHubToken).not.toHaveBeenCalled()
    expect(getDockerTags).not.toHaveBeenCalled()
  })

  it('fetches a token then tags, and persists them to the cache', async () => {
    getKey.mockReturnValue(undefined)
    getDockerHubToken.mockResolvedValue({
      token: 'abc',
      expires_in: 300,
      issued_at: '2024-01-01'
    })
    getDockerTags.mockResolvedValue(['1.2.3', '2.0.0'])

    const result = await fetchExistingTags(params)

    expect(result).toEqual(['1.2.3', '2.0.0'])
    expect(getDockerHubToken).toHaveBeenCalledTimes(1)
    expect(getDockerTags).toHaveBeenCalledTimes(1)
    expect(setKey).toHaveBeenCalledWith('dockerhubtags', ['1.2.3', '2.0.0'])
    expect(save).toHaveBeenCalledTimes(1)
    // The cache must live in the directory returned by getCacheDirectory
    expect(cacheOptions).toMatchObject({ cacheDir: '/tmp/cache' })
  })

  it('returns an empty array when getDockerTags yields nothing', async () => {
    getKey.mockReturnValue(undefined)
    getDockerHubToken.mockResolvedValue({
      token: 'abc',
      expires_in: 300,
      issued_at: '2024-01-01'
    })
    getDockerTags.mockResolvedValue(undefined)

    const result = await fetchExistingTags(params)

    expect(result).toEqual([])
  })

  it('throws and marks the run as failed when no token is returned', async () => {
    getKey.mockReturnValue(undefined)
    getDockerHubToken.mockResolvedValue(undefined)

    await expect(fetchExistingTags(params)).rejects.toThrow(
      'DockerHub token is undefined.'
    )
    expect(core.setFailed).toHaveBeenCalledWith(
      'Failed to retrieve DockerHub token.'
    )
  })
})
