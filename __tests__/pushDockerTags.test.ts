import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach
} from '@jest/globals'

import * as core from '../__fixtures__/core.js'
import * as exec from '../__fixtures__/exec.js'

import type { Registry, ShorthandTag } from '../src/types/index.js'

const mockExit = jest.fn<(code?: number) => never>()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('process', () => ({ exit: mockExit }))

let pushDockerTags: typeof import('../src/pushDockerTags/index.js').pushDockerTags
let dockerLogin: typeof import('../src/pushDockerTags/dockerLogin.js').dockerLogin
let createLatestDockerTag: typeof import('../src/pushDockerTags/createLatestDockerTag.js').createLatestDockerTag

beforeAll(async () => {
  ;({ pushDockerTags } = await import('../src/pushDockerTags/index.js'))
  ;({ dockerLogin } = await import('../src/pushDockerTags/dockerLogin.js'))
  ;({ createLatestDockerTag } =
    await import('../src/pushDockerTags/createLatestDockerTag.js'))
})

const githubRegistry: Registry = {
  registry: 'github',
  repository: 'acme/app',
  username: 'user',
  secret: 'secret'
}

const dockerhubRegistry: Registry = {
  registry: '',
  repository: 'acme/app',
  username: 'user',
  secret: 'secret'
}

describe('pushDockerTags', () => {
  const tags: ShorthandTag[] = [
    { tag: '1.2.3', shorthand: '1.2' },
    { tag: '1.2.3', shorthand: '1' }
  ]

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('does not invoke docker when dryRun is true', async () => {
    await pushDockerTags({
      shorthandTags: tags,
      srcRegistry: githubRegistry,
      dstRegistry: githubRegistry,
      dryRun: true
    })

    expect(exec.exec).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('[DRY RUN]'))
  })

  it('invokes docker buildx imagetools create per tag with the ghcr.io prefix for github registries', async () => {
    await pushDockerTags({
      shorthandTags: tags,
      srcRegistry: githubRegistry,
      dstRegistry: githubRegistry,
      dryRun: false
    })

    expect(exec.exec).toHaveBeenCalledTimes(2)
    expect(exec.exec).toHaveBeenNthCalledWith(1, 'docker', [
      'buildx',
      'imagetools',
      'create',
      '--tag',
      'ghcr.io/acme/app:1.2',
      'ghcr.io/acme/app:1.2.3'
    ])
    expect(exec.exec).toHaveBeenNthCalledWith(2, 'docker', [
      'buildx',
      'imagetools',
      'create',
      '--tag',
      'ghcr.io/acme/app:1',
      'ghcr.io/acme/app:1.2.3'
    ])
  })

  it('does not prefix non-github registries', async () => {
    await pushDockerTags({
      shorthandTags: [tags[0]],
      srcRegistry: dockerhubRegistry,
      dstRegistry: dockerhubRegistry,
      dryRun: false
    })

    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'buildx',
      'imagetools',
      'create',
      '--tag',
      'acme/app:1.2',
      'acme/app:1.2.3'
    ])
  })

  it('does nothing when there are no shorthand tags', async () => {
    await pushDockerTags({
      shorthandTags: [],
      srcRegistry: githubRegistry,
      dstRegistry: githubRegistry,
      dryRun: false
    })

    expect(exec.exec).not.toHaveBeenCalled()
  })
})

describe('dockerLogin', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('logs in successfully and passes the secret via stdin', async () => {
    exec.exec.mockResolvedValue(0)

    await dockerLogin(githubRegistry)

    expect(exec.exec).toHaveBeenCalledWith(
      'docker',
      ['login', 'ghcr.io', '--username', 'user', '--password-stdin'],
      expect.objectContaining({ silent: true })
    )
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(mockExit).not.toHaveBeenCalled()
  })

  it('uses an empty registry host for non-github registries', async () => {
    exec.exec.mockResolvedValue(0)

    await dockerLogin(dockerhubRegistry)

    expect(exec.exec).toHaveBeenCalledWith(
      'docker',
      ['login', '', '--username', 'user', '--password-stdin'],
      expect.objectContaining({ silent: true })
    )
  })

  it('fails and exits when docker login throws an Error', async () => {
    exec.exec.mockRejectedValue(new Error('bad credentials'))

    await dockerLogin(githubRegistry)

    expect(core.setFailed).toHaveBeenCalledWith(
      'Authentication failed: bad credentials'
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('reports an unknown error when a non-Error value is thrown', async () => {
    exec.exec.mockRejectedValue('boom')

    await dockerLogin(githubRegistry)

    expect(core.setFailed).toHaveBeenCalledWith(
      'Authentication failed: Unknown error'
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })
})

describe('createLatestDockerTag', () => {
  const shorthandTag: ShorthandTag = { tag: '3.1.4', shorthand: '3.1' }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('does not invoke docker when dryRun is true', async () => {
    await createLatestDockerTag({
      shorthandTag,
      srcRegistry: githubRegistry,
      dstRegistry: githubRegistry,
      dryRun: true
    })

    expect(exec.exec).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Dry run'))
  })

  it('creates a "latest" tag from the source image with ghcr.io prefix', async () => {
    await createLatestDockerTag({
      shorthandTag,
      srcRegistry: githubRegistry,
      dstRegistry: githubRegistry,
      dryRun: false
    })

    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'buildx',
      'imagetools',
      'create',
      '--tag',
      'ghcr.io/acme/app:latest',
      'ghcr.io/acme/app:3.1.4'
    ])
  })

  it('omits the prefix for non-github registries', async () => {
    await createLatestDockerTag({
      shorthandTag,
      srcRegistry: dockerhubRegistry,
      dstRegistry: dockerhubRegistry,
      dryRun: false
    })

    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'buildx',
      'imagetools',
      'create',
      '--tag',
      'acme/app:latest',
      'acme/app:3.1.4'
    ])
  })
})
