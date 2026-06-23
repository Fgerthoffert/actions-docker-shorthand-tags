import * as core from '@actions/core'
import * as github from '@actions/github'

import { GitHubPackage } from '../../types/index.js'
import { withRetry, isRetryableHttpError } from '../../utils/index.js'

export const getPackage = async ({
  inputGithubToken,
  ownerLogin,
  packageType,
  packageName
}: {
  inputGithubToken: string
  ownerLogin: string
  packageType: 'npm' | 'maven' | 'rubygems' | 'docker' | 'nuget' | 'container'
  packageName: string
}): Promise<GitHubPackage | undefined> => {
  core.info(
    `Fetching details about package ${packageName} in organization ${ownerLogin} (type: ${packageType})`
  )

  const octokit = github.getOctokit(inputGithubToken)

  // A transient server error should not fail the run; retry with backoff.
  const response = await withRetry(
    () =>
      octokit.request(
        'GET /orgs/{org}/packages/{package_type}/{package_name}',
        {
          org: ownerLogin,
          package_type: packageType,
          package_name: packageName,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      ),
    {
      label: `fetching package ${packageName}`,
      shouldRetry: isRetryableHttpError
    }
  )

  return response.data as unknown as GitHubPackage
}

export default getPackage
