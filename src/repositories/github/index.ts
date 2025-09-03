import * as core from '@actions/core'
import { FlatCache } from 'flat-cache'

import { getCacheDirectory } from '../getCacheDirectory.js'

import { getPackage } from './getPackage.js'
import { getPackageVersions } from './getPackageVersions.js'

export const fetchExistingTags = async ({
  inputDevCache,
  inputGithubToken,
  inputPackageFullname
}: {
  inputDevCache: boolean
  inputGithubToken: string
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
  const cacheData: string[] = await cache.getKey('githubpackagestags')

  let tags: string[] = []
  if (inputDevCache === true && cacheData !== undefined) {
    core.info(`Github Packages tags were found in cache. Using cached data...`)
    tags = cacheData
  } else {
    // Split the package name into owner and repo
    const [owner, packageName] = inputPackageFullname.split('/')

    // The packages GraphQL API is being deprecated, need to continue fetching with REST
    const githubPackage = await getPackage({
      inputGithubToken,
      ownerLogin: owner,
      packageType: 'container',
      packageName: packageName
    })

    if (githubPackage) {
      core.info(
        `Package ${githubPackage.name} has ${githubPackage.version_count} versions`
      )
    } else {
      core.warning(
        'Failed to fetch package information: githubPackage is undefined'
      )
      return []
    }

    const githubPackageVersions = await getPackageVersions({
      inputGithubToken,
      ownerLogin: owner,
      packageType: 'container',
      packageName: packageName
    })

    if (!githubPackageVersions) {
      core.warning(
        'Failed to fetch package versions: githubPackageVersions is undefined'
      )
      return []
    }

    const tags = githubPackageVersions
      .map((p) => p.metadata.container.tags)
      .flat()

    core.info(
      `The container tags for package ${inputPackageFullname} are: ${tags.join(', ')}`
    )

    // Saving the fetched tags to cache
    await cache.setKey('githubpackagestags', tags)
    await cache.save()
  }
  return tags
}

export default fetchExistingTags
