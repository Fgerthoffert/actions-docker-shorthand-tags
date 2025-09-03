import * as core from '@actions/core'
import { FlatCache } from 'flat-cache'

import { getCacheDirectory } from '../getCacheDirectory.js'
import { DockerHubAuth } from '../../types/index.js'

import { getDockerHubToken } from './getDockerHubToken.js'
import { getDockerTags } from './getDockerTags.js'

export const fetchExistingTags = async ({
  inputDevCache,
  inputDockerHubUsername,
  inputDockerHubPassword,
  inputPackageFullname
}: {
  inputDevCache: boolean
  inputDockerHubUsername: string
  inputDockerHubPassword: string
  inputPackageFullname: string
}): Promise<string[]> => {
  core.info(
    `Fetching all existing versions for package ${inputPackageFullname}`
  )

  // The caching mechanism is there to avoid querying the Docker Hub API
  // during development and testing
  const dataCacheDir = await getCacheDirectory('docker-shorthand-tags')
  const cache = new FlatCache({
    cacheId: 'cache',
    cacheDir: dataCacheDir,
    ttl: 60 * 60 * 1000
  })
  await cache.load()
  const cacheData: string[] = await cache.getKey('dockerhubtags')

  let tags: string[] = []
  if (inputDevCache === true && cacheData !== undefined) {
    core.info(`Docker Hub tags were found in cache. Using cached data...`)
    tags = cacheData
  } else {
    let dockerHubAuth: DockerHubAuth = {
      domain: 'auth.docker.io',
      service: 'registry.docker.io',
      scope: `repository:${inputPackageFullname}:pull`,
      offlineToken: '1',
      clientId: 'shell',
      authorization: Buffer.from(
        `${inputDockerHubUsername}:${inputDockerHubPassword}`
      ).toString('base64'),
      token: {
        token: '',
        expires_in: 0,
        issued_at: ''
      }
    }

    const token = await getDockerHubToken({
      dockerHubAuth
    })

    if (!token) {
      core.setFailed('Failed to retrieve DockerHub token.')
      throw new Error('DockerHub token is undefined.')
    }

    dockerHubAuth = {
      ...dockerHubAuth,
      token
    }

    const fetchedTags = await getDockerTags({
      dockerHubAuth,
      dockerHubRepository: inputPackageFullname
    })
    tags = fetchedTags ?? []

    // Saving the fetched tags to cache
    await cache.setKey('dockerhubtags', tags)
    await cache.save()
  }

  return tags
}

export default fetchExistingTags
