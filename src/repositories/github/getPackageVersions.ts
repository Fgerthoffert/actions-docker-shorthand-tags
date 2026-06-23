import * as core from '@actions/core'
import { Octokit } from '@octokit/core'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'

import { GitHubPackageVersion } from '../../types/index.js'
import { withRetry, isRetryableHttpError } from '../../utils/index.js'

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

  // Fetching every version of a package can span dozens of paginated requests.
  // A single transient server error should not fail the whole run, so the
  // pagination is wrapped in a retry with exponential backoff. Progress is
  // logged per page to make long fetches and intermittent failures observable.
  const fetchAllVersions = (): Promise<GitHubPackageVersion[]> => {
    let pageCount = 0
    return octokit.paginate(
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
      },
      (response) => {
        pageCount += 1
        core.info(
          `Fetched page ${pageCount} (${response.data.length} versions) for package ${packageName}`
        )
        return response.data
      }
    ) as Promise<GitHubPackageVersion[]>
  }

  const response = await withRetry(fetchAllVersions, {
    label: `fetching versions for package ${packageName}`,
    shouldRetry: isRetryableHttpError
  })

  const packages = response.map((v) => v as unknown as GitHubPackageVersion)
  core.info(
    `Retrieved ${packages.length} version(s) for package ${packageName}`
  )

  return packages
}

export default getPackageVersions
