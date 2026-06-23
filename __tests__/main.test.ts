import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'

import type { ShorthandTag } from '../src/types/index.js'

const fetchFromGitHub = jest.fn<() => Promise<string[]>>()
const fetchFromDockerHub = jest.fn<() => Promise<string[]>>()
const buildShortHandtags = jest.fn<() => ShorthandTag[]>()
const pushDockerTags = jest.fn<() => Promise<void>>()
const dockerLogin = jest.fn<() => Promise<void>>()
const createLatestDockerTag = jest.fn<() => Promise<void>>()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/repositories/github/index.js', () => ({
  default: fetchFromGitHub
}))
jest.unstable_mockModule('../src/repositories/dockerhub/index.js', () => ({
  default: fetchFromDockerHub
}))
jest.unstable_mockModule('../src/buildShorthandTags/index.js', () => ({
  default: buildShortHandtags
}))
jest.unstable_mockModule('../src/pushDockerTags/index.js', () => ({
  default: pushDockerTags
}))
jest.unstable_mockModule('../src/pushDockerTags/dockerLogin.js', () => ({
  dockerLogin
}))
jest.unstable_mockModule(
  '../src/pushDockerTags/createLatestDockerTag.js',
  () => ({ createLatestDockerTag })
)

let run: typeof import('../src/main.js').run

beforeAll(async () => {
  ;({ run } = await import('../src/main.js'))
})

const defaultInputs: Record<string, string> = {
  dev_cache: 'false',
  version_digits_count: '3',
  snapshot_suffix: '-SNAPSHOT',
  dry_run: 'false',
  create_latest: 'false',
  src_registry: 'github',
  src_repository: 'acme/app',
  src_username: 'user',
  src_secret: 'token',
  dst_registry: 'github',
  dst_repository: 'acme/app',
  dst_username: 'user',
  dst_secret: 'token'
}

const useInputs = (overrides: Record<string, string> = {}): void => {
  const inputs = { ...defaultInputs, ...overrides }
  core.getInput.mockImplementation((name: string) => inputs[name] ?? '')
}

const shorthands: ShorthandTag[] = [
  { tag: '2.0.0', shorthand: '2.0' },
  { tag: '2.0.0', shorthand: '2' }
]

describe('run', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    useInputs()
    buildShortHandtags.mockReturnValue([])
  })

  it('fetches tags from GitHub, logs in once, and pushes shorthand tags', async () => {
    useInputs({ src_registry: 'github', dst_registry: 'github' })
    fetchFromGitHub.mockResolvedValue(['1.2.3', '2.0.0'])
    buildShortHandtags.mockReturnValueOnce(shorthands).mockReturnValueOnce([])

    await run()

    expect(fetchFromGitHub).toHaveBeenCalledWith({
      inputDevCache: false,
      inputGithubToken: 'token',
      inputSrcRepository: 'acme/app'
    })
    expect(fetchFromDockerHub).not.toHaveBeenCalled()
    // src and dst registries are identical, so we authenticate only once
    expect(dockerLogin).toHaveBeenCalledTimes(1)
    expect(pushDockerTags).toHaveBeenCalledTimes(2)
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('fetches tags from Docker Hub when the source registry is dockerhub', async () => {
    useInputs({ src_registry: 'dockerhub' })
    fetchFromDockerHub.mockResolvedValue(['1.2.3'])

    await run()

    expect(fetchFromDockerHub).toHaveBeenCalledWith({
      inputDevCache: false,
      inputDockerHubUsername: 'user',
      inputDockerHubPassword: 'token',
      inputSrcRepository: 'acme/app'
    })
    expect(fetchFromGitHub).not.toHaveBeenCalled()
  })

  it('fails when the source registry is unsupported', async () => {
    useInputs({ src_registry: 'gitlab' })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('unsupported')
    )
  })

  it('authenticates to both registries when source and destination differ', async () => {
    useInputs({ src_registry: 'github', dst_registry: 'dockerhub' })
    fetchFromGitHub.mockResolvedValue(['1.2.3'])

    await run()

    expect(dockerLogin).toHaveBeenCalledTimes(2)
  })

  it('creates a "latest" tag from the highest version when create_latest is enabled', async () => {
    useInputs({ create_latest: 'true' })
    fetchFromGitHub.mockResolvedValue(['1.2.3', '2.0.0'])
    buildShortHandtags.mockReturnValueOnce(shorthands).mockReturnValueOnce([])

    await run()

    expect(createLatestDockerTag).toHaveBeenCalledWith(
      expect.objectContaining({ shorthandTag: shorthands[0], dryRun: false })
    )
  })

  it('does not create a "latest" tag when there are no shorthand tags', async () => {
    useInputs({ create_latest: 'true' })
    fetchFromGitHub.mockResolvedValue([])
    buildShortHandtags.mockReturnValue([])

    await run()

    expect(createLatestDockerTag).not.toHaveBeenCalled()
    expect(core.notice).toHaveBeenCalledWith(
      expect.stringContaining('No shorthand tags need to be created')
    )
  })

  it('announces the suffixed shorthand tags that need to be created', async () => {
    useInputs({ snapshot_suffix: '-SNAPSHOT' })
    fetchFromGitHub.mockResolvedValue(['1.2.3-SNAPSHOT'])
    // first call (no suffix) yields nothing, second call (suffix) yields tags
    buildShortHandtags
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        { tag: '1.2.3-SNAPSHOT', shorthand: '1.2-SNAPSHOT' }
      ])

    await run()

    expect(core.notice).toHaveBeenCalledWith(
      expect.stringContaining('1.2-SNAPSHOT')
    )
    // The first pass uses no suffix, the second uses the configured suffix
    expect(buildShortHandtags).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ suffix: '' })
    )
    expect(buildShortHandtags).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ suffix: '-SNAPSHOT' })
    )
  })

  it('forwards dryRun: true to pushDockerTags and createLatestDockerTag', async () => {
    useInputs({ dry_run: 'true', create_latest: 'true' })
    fetchFromGitHub.mockResolvedValue(['1.2.3', '2.0.0'])
    buildShortHandtags.mockReturnValueOnce(shorthands).mockReturnValueOnce([])

    await run()

    expect(pushDockerTags).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    )
    expect(createLatestDockerTag).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    )
  })

  it('reports the error message via setFailed when fetching throws', async () => {
    useInputs({ src_registry: 'github' })
    fetchFromGitHub.mockRejectedValue(new Error('boom'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('boom')
  })
})
