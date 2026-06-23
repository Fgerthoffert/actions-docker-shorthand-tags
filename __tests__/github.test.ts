import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'

import type { GitHubPackageVersion } from '../src/types/index.js'

const request = jest.fn<(route: string, params: unknown) => Promise<unknown>>()
const getOctokit = jest.fn(() => ({ request }))

const paginate =
  jest.fn<
    (route: unknown, params: unknown, map?: unknown) => Promise<unknown>
  >()
class OctokitMock {
  static plugin() {
    return OctokitMock
  }
  paginate = paginate
  rest = {
    packages: { getAllPackageVersionsForPackageOwnedByOrg: 'versions-route' }
  }
}

// Keep retries instant by stubbing the sleep used by withRetry.
const sleep = jest.fn(async () => 'done!')

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({ getOctokit }))
jest.unstable_mockModule('@octokit/core', () => ({ Octokit: OctokitMock }))
jest.unstable_mockModule('@octokit/plugin-paginate-rest', () => ({
  paginateRest: {}
}))
jest.unstable_mockModule('@octokit/plugin-rest-endpoint-methods', () => ({
  restEndpointMethods: {}
}))
jest.unstable_mockModule('../src/utils/sleep.js', () => ({ sleep }))

let getPackage: typeof import('../src/repositories/github/getPackage.js').getPackage
let getPackageVersions: typeof import('../src/repositories/github/getPackageVersions.js').getPackageVersions

beforeAll(async () => {
  ;({ getPackage } = await import('../src/repositories/github/getPackage.js'))
  ;({ getPackageVersions } =
    await import('../src/repositories/github/getPackageVersions.js'))
})

const baseArgs = {
  inputGithubToken: 'token',
  ownerLogin: 'acme',
  packageType: 'container' as const,
  packageName: 'app'
}

const httpError = (
  status: number,
  message: string
): Error & { status: number } => Object.assign(new Error(message), { status })

describe('getPackage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    getOctokit.mockReturnValue({ request })
  })

  it('returns the package data from the REST response', async () => {
    const data = { name: 'app', version_count: 12 }
    request.mockResolvedValue({ data })

    const result = await getPackage(baseArgs)

    expect(result).toEqual(data)
    expect(getOctokit).toHaveBeenCalledWith('token')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('retries on a transient server error and then succeeds', async () => {
    const data = { name: 'app', version_count: 12 }
    request
      .mockRejectedValueOnce(httpError(500, 'Server Error'))
      .mockResolvedValueOnce({ data })

    const result = await getPackage(baseArgs)

    expect(result).toEqual(data)
    expect(request).toHaveBeenCalledTimes(2)
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Server Error')
    )
  })

  it('does not retry a non-retryable client error and rejects', async () => {
    request.mockRejectedValue(httpError(404, 'Not Found'))

    await expect(getPackage(baseArgs)).rejects.toThrow('Not Found')
    // 404 is not retryable, so only a single attempt is made
    expect(request).toHaveBeenCalledTimes(1)
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('not retryable')
    )
  })
})

describe('getPackageVersions', () => {
  const versions: GitHubPackageVersion[] = [
    {
      id: '1',
      name: 'sha',
      url: '',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      metadata: {
        package_type: 'container',
        container: { tags: ['1.2.3'] }
      }
    }
  ]

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the paginated list of package versions', async () => {
    paginate.mockResolvedValue(versions)

    const result = await getPackageVersions(baseArgs)

    expect(result).toEqual(versions)
    expect(paginate).toHaveBeenCalledWith(
      'versions-route',
      expect.objectContaining({ org: 'acme', package_name: 'app' }),
      expect.any(Function)
    )
  })

  it('retries the pagination on a transient server error and then succeeds', async () => {
    paginate
      .mockRejectedValueOnce(httpError(503, 'Service Unavailable'))
      .mockResolvedValueOnce(versions)

    const result = await getPackageVersions(baseArgs)

    expect(result).toEqual(versions)
    expect(paginate).toHaveBeenCalledTimes(2)
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Service Unavailable')
    )
  })

  it('rejects after exhausting retries on persistent server errors', async () => {
    paginate.mockRejectedValue(httpError(500, 'Server Error'))

    await expect(getPackageVersions(baseArgs)).rejects.toThrow('Server Error')
    // 1 initial attempt + 4 retries
    expect(paginate).toHaveBeenCalledTimes(5)
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('failed after 5 attempt(s)')
    )
  })
})
