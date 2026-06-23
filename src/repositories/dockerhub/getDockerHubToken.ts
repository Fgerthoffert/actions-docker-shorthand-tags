import * as core from '@actions/core'

import { DockerHubToken, DockerHubAuth } from '../../types/index.js'
import { withRetry, isRetryableHttpError } from '../../utils/index.js'

export const getDockerHubToken = async ({
  dockerHubAuth
}: {
  dockerHubAuth: DockerHubAuth
}): Promise<DockerHubToken | undefined> => {
  const url = `https://${dockerHubAuth.domain}/token?service=${dockerHubAuth.service}&scope=${encodeURIComponent(dockerHubAuth.scope)}&offline_token=${dockerHubAuth.offlineToken}&client_id=${dockerHubAuth.clientId}`
  core.info(`Fetching Docker Hub token at: ${url}`)

  const fetchToken = async (): Promise<DockerHubToken> => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${dockerHubAuth.authorization}`
      }
    })

    if (!response.ok) {
      // Attach the HTTP status so withRetry can decide whether to retry.
      throw Object.assign(
        new Error(
          `Docker Hub token request failed: ${response.status} ${response.statusText}`
        ),
        { status: response.status }
      )
    }

    return (await response.clone().json()) as DockerHubToken
  }

  const token = await withRetry(fetchToken, {
    label: 'fetching Docker Hub token',
    shouldRetry: isRetryableHttpError
  })

  core.info(
    `Token issued at ${token.issued_at}, will expire in ${token.expires_in} seconds`
  )

  return token
}

export default getDockerHubToken
