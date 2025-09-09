import * as core from '@actions/core'
import { Octokit } from '@octokit/core'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'

import { GitHubPackageVersion } from '../../types/index.js'

export const getPackageVersions = async ({
  inputGithubToken,
  ownerLogin,
  packageType,
  packageName
}: {
  inputGithubToken: string
  ownerLogin: string
  packageType: 'npm' | 'maven' | 'rubygems' | 'docker' | 'nuget' | 'container'
  packageName: string
}): Promise<GitHubPackageVersion[] | undefined> => {
  core.info(`Fetching versions for package ${packageName}`)

  const MyOctokit = Octokit.plugin(paginateRest, restEndpointMethods)
  const octokit = new MyOctokit({ auth: inputGithubToken })

  try {
    const response = await octokit.paginate(
      octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg,
      {
        org: ownerLogin,
        package_type: packageType,
        package_name: packageName,
        per_page: 100,
        state: 'active', // There's no point in fetching deleted tags
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    const packages = response.map((v) => v as unknown as GitHubPackageVersion)

    return packages
  } catch (error: unknown) {
    let errorMessage = 'Unknown error occurred while fetching package details'
    if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = String((error as { message?: unknown }).message)
    }
    core.setFailed(`Failed to fetch package: ${errorMessage}`)
    process.exit(1)
  }
}

export default getPackageVersions
