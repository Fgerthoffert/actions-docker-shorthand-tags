import * as core from '@actions/core'
import { Octokit } from '@octokit/core'
import { paginateRest } from '@octokit/plugin-paginate-rest'

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
  core.info(
    `Fetching details about organization ${ownerLogin}, package type ${packageType}, package name ${packageName}`
  )

  const MyOctokit = Octokit.plugin(paginateRest)
  const octokit = new MyOctokit({ auth: inputGithubToken })

  try {
    const response = await octokit.request(
      'GET /orgs/{org}/packages/{package_type}/{package_name}/versions',
      {
        org: ownerLogin,
        package_type: packageType,
        package_name: packageName,
        per_page: 30,
        state: 'active', // There's no point in fetching deleted tags
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    const packages = response.data.map(
      (pkg) => pkg as unknown as GitHubPackageVersion
    )
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
