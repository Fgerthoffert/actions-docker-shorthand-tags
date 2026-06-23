import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'

const existsSync = jest.fn<(p: string) => boolean>()
const mkdirSync = jest.fn()
const tmpdir = jest.fn<() => string>(() => '/tmp')

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('fs', () => ({ existsSync, mkdirSync }))
jest.unstable_mockModule('os', () => ({ tmpdir }))

let getCacheDirectory: typeof import('../src/repositories/getCacheDirectory.js').getCacheDirectory

beforeAll(async () => {
  ;({ getCacheDirectory } = await import(
    '../src/repositories/getCacheDirectory.js'
  ))
})

describe('getCacheDirectory', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    tmpdir.mockReturnValue('/tmp')
  })

  it('returns the joined cache path inside the system temp directory', async () => {
    existsSync.mockReturnValue(true)

    const result = await getCacheDirectory('my-cache')

    expect(result).toBe('/tmp/my-cache')
  })

  it('creates the directory recursively when it does not exist', async () => {
    existsSync.mockReturnValue(false)

    await getCacheDirectory('my-cache')

    expect(mkdirSync).toHaveBeenCalledWith('/tmp/my-cache', {
      recursive: true
    })
  })

  it('does not create the directory when it already exists', async () => {
    existsSync.mockReturnValue(true)

    await getCacheDirectory('my-cache')

    expect(mkdirSync).not.toHaveBeenCalled()
  })
})
