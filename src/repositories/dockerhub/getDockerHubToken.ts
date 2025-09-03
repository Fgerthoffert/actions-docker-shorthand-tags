import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/core'
import { paginateRest } from '@octokit/plugin-paginate-rest'

import { DockerHubToken, DockerHubAuth } from '../../types/index.js'

export const getDockerHubToken = async ({
  dockerHubAuth
}: {
  dockerHubAuth: DockerHubAuth
}): Promise<DockerHubToken | undefined> => {
  try {
    const url = `https://${dockerHubAuth.domain}/token?service=${dockerHubAuth.service}&scope=${encodeURIComponent(dockerHubAuth.scope)}&offline_token=${dockerHubAuth.offlineToken}&client_id=${dockerHubAuth.clientId}`
    core.info(`Fetching Docker Hub token at: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${dockerHubAuth.authorization}`
      }
    })

    const token = (await response.clone().json()) as DockerHubToken
    core.info(
      `Token issued at ${token.issued_at}, will expired in ${token.expires_in} seconds`
    )

    if (!response.ok) {
      core.setFailed(
        `Failed to fetch Docker Hub token: ${response.status} ${response.statusText}`
      )
      process.exit(1)
    }

    return token
  } catch (error) {
    core.error(`Error fetching Docker Hub token: ${(error as Error).message}`)
    return undefined
  }
}

export default getDockerHubToken
