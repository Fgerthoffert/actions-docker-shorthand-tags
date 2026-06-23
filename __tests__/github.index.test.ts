import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'

import type { GitHubPackage, GitHubPackageVersion } from '../src/types/index.js'

const load = jest.fn()
const getKey = jest.fn<(key: string) => unknown>()
const setKey = jest.fn()
const save = jest.fn()

class FlatCacheMock {
  load = load
  getKey = getKey
  setKey = setKey
  save = save
}

const getCacheDirectory = jest.fn<() => Promise<string>>()
const getPackage =
  jest.fn<
    typeof import('../src/repositories/github/getPackage.js').getPackage
  >()
const getPackageVersions =
  jest.fn<
    typeof import('../src/repositories/github/getPackageVersions.js').getPackageVersions
  >()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('flat-cache', () => ({ FlatCache: FlatCacheMock }))
jest.unstable_mockModule('../src/repositories/getCacheDirectory.js', () => ({
  getCacheDirectory
}))
jest.unstable_mockModule('../src/repositories/github/getPackage.js', () => ({
  getPackage
}))
jest.unstable_mockModule(
  '../src/repositories/github/getPackageVersions.js',
  () => ({ getPackageVersions })
)

let fetchExistingTags: typeof import('../src/repositories/github/index.js').fetchExistingTags

beforeAll(async () => {
  ;({ fetchExistingTags } = await import('../src/repositories/github/index.js'))
})

const params = {
  inputDevCache: false,
  inputGithubToken: 'token',
  inputSrcRepository: 'acme/app'
}

const pkg = { name: 'app', version_count: 3 } as unknown as GitHubPackage

const makeVersion = (tags: string[]): GitHubPackageVersion =>
  ({
    metadata: { package_type: 'container', container: { tags } }
  }) as GitHubPackageVersion

describe('github fetchExistingTags', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    getCacheDirectory.mockResolvedValue('/tmp/cache')
  })

  it('returns cached tags without hitting the API when dev cache is enabled and populated', async () => {
    getKey.mockReturnValue(['1.0.0'])

    const result = await fetchExistingTags({ ...params, inputDevCache: true })

    expect(result).toEqual(['1.0.0'])
    expect(getPackage).not.toHaveBeenCalled()
  })

  it('flattens tags across all package versions and caches them', async () => {
    getKey.mockReturnValue(undefined)
    getPackage.mockResolvedValue(pkg)
    getPackageVersions.mockResolvedValue([
      makeVersion(['1.2.3', '1.2']),
      makeVersion(['2.0.0'])
    ])

    const result = await fetchExistingTags(params)

    expect(result).toEqual(['1.2.3', '1.2', '2.0.0'])
    expect(setKey).toHaveBeenCalledWith('githubpackagestags', [
      '1.2.3',
      '1.2',
      '2.0.0'
    ])
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('warns and returns an empty array when the package cannot be fetched', async () => {
    getKey.mockReturnValue(undefined)
    getPackage.mockResolvedValue(undefined)

    const result = await fetchExistingTags(params)

    expect(result).toEqual([])
    expect(core.warning).toHaveBeenCalled()
    expect(getPackageVersions).not.toHaveBeenCalled()
  })

  it('warns and returns an empty array when versions cannot be fetched', async () => {
    getKey.mockReturnValue(undefined)
    getPackage.mockResolvedValue(pkg)
    getPackageVersions.mockResolvedValue(undefined)

    const result = await fetchExistingTags(params)

    expect(result).toEqual([])
    expect(core.warning).toHaveBeenCalled()
  })
})
