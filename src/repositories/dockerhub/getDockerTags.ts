import * as core from '@actions/core'

import { DockerHubAuth } from '../../types/index.js'
import { withRetry, isRetryableHttpError } from '../../utils/index.js'

export const getDockerTags = async ({
  dockerHubAuth,
  dockerHubRepository
}: {
  dockerHubAuth: DockerHubAuth
  dockerHubRepository: string
}): Promise<string[] | undefined> => {
  const url = `https://registry-1.docker.io/v2/${dockerHubRepository}/tags/list`
  core.info(`Fetching all tags within repository: ${dockerHubRepository}`)
  core.info(`Fetching Docker Hub tags from: ${url}`)

  const fetchTags = async (): Promise<string[]> => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${dockerHubAuth.token.token}`
      }
    })

    if (!response.ok) {
      // Attach the HTTP status so withRetry can decide whether to retry.
      throw Object.assign(
        new Error(
          `Docker Hub tags request failed: ${response.status} ${response.statusText}`
        ),
        { status: response.status }
      )
    }

    const body = (await response.clone().json()) as { tags: string[] }
    return body.tags
  }

  const tags = await withRetry(fetchTags, {
    label: `fetching tags for repository ${dockerHubRepository}`,
    shouldRetry: isRetryableHttpError
  })

  core.info(
    `Retrieved ${tags.length} tag(s) for repository ${dockerHubRepository}`
  )

  return tags
}

export default getDockerTags
