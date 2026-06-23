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
  jest.fn<(route: unknown, params: unknown) => Promise<unknown>>()
class OctokitMock {
  static plugin() {
    return OctokitMock
  }
  paginate = paginate
  rest = {
    packages: { getAllPackageVersionsForPackageOwnedByOrg: 'versions-route' }
  }
}

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({ getOctokit }))
jest.unstable_mockModule('@octokit/core', () => ({ Octokit: OctokitMock }))
jest.unstable_mockModule('@octokit/plugin-paginate-rest', () => ({
  paginateRest: {}
}))
jest.unstable_mockModule('@octokit/plugin-rest-endpoint-methods', () => ({
  restEndpointMethods: {}
}))

let getPackage: typeof import('../src/repositories/github/getPackage.js').getPackage
let getPackageVersions: typeof import('../src/repositories/github/getPackageVersions.js').getPackageVersions

const exitSpy = jest
  .spyOn(process, 'exit')
  .mockImplementation((() => undefined) as never)

beforeAll(async () => {
  ;({ getPackage } = await import('../src/repositories/github/getPackage.js'))
  ;({ getPackageVersions } = await import(
    '../src/repositories/github/getPackageVersions.js'
  ))
})

const baseArgs = {
  inputGithubToken: 'token',
  ownerLogin: 'acme',
  packageType: 'container' as const,
  packageName: 'app'
}

describe('getPackage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    exitSpy.mockImplementation((() => undefined) as never)
    getOctokit.mockReturnValue({ request })
  })

  it('returns the package data from the REST response', async () => {
    const data = { name: 'app', version_count: 12 }
    request.mockResolvedValue({ data })

    const result = await getPackage(baseArgs)

    expect(result).toEqual(data)
    expect(getOctokit).toHaveBeenCalledWith('token')
  })

  it('marks the run as failed and exits when the request rejects', async () => {
    request.mockRejectedValue({ message: 'not found' })

    await getPackage(baseArgs)

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('not found')
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

describe('getPackageVersions', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    exitSpy.mockImplementation((() => undefined) as never)
  })

  it('returns the paginated list of package versions', async () => {
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
    paginate.mockResolvedValue(versions)

    const result = await getPackageVersions(baseArgs)

    expect(result).toEqual(versions)
    expect(paginate).toHaveBeenCalledWith(
      'versions-route',
      expect.objectContaining({ org: 'acme', package_name: 'app' })
    )
  })

  it('marks the run as failed and exits when pagination rejects', async () => {
    paginate.mockRejectedValue({ message: 'rate limited' })

    await getPackageVersions(baseArgs)

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('rate limited')
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
