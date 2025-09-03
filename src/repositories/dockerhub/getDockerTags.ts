import * as core from '@actions/core'

import { DockerHubAuth } from '../../types/index.js'

export const getDockerTags = async ({
  dockerHubAuth,
  dockerHubRepository
}: {
  dockerHubAuth: DockerHubAuth
  dockerHubRepository: string
}): Promise<string[] | undefined> => {
  core.info(`Fetching all tags within repository: ${dockerHubRepository}`)

  try {
    const url = `https://registry-1.docker.io/v2/${dockerHubRepository}/tags/list`
    core.info(`Fetching Docker Hub tags from: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dockerHubAuth.token.token}`
      }
    })

    const tags = (await response.clone().json()) as any
    return tags.tags
  } catch (error) {
    console.log(error)
    core.error(`Error fetching Docker Hub token: ${(error as Error).message}`)
    return undefined
  }
}

export default getDockerTags
