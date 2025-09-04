import * as core from '@actions/core'
import * as github from '@actions/github'

import { GitHubPackage } from '../../types/index.js'

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

  try {
    const response = await octokit.request(
      'GET /orgs/{org}/packages/{package_type}/{package_name}',
      {
        org: ownerLogin,
        package_type: packageType,
        package_name: packageName,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    return response.data as unknown as GitHubPackage
  } catch (error: unknown) {
    let errorMessage = 'Unknown error occurred while fetching package details'
    if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = String((error as { message?: unknown }).message)
    }
    core.setFailed(`Failed to fetch package: ${errorMessage}`)
    process.exit(1)
  }
}

export default getPackage
