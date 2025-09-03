import * as core from '@actions/core'

import fetchExistingTagsFromGitHub from './repositories/github/index.js'
import fetchExistingTagsFromDockerHub from './repositories/dockerhub/index.js'

import buildShortHandtags from './utils/buildShorthandTags.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const inputDevCache = core.getInput('dev_cache') === 'true'
    const inputPackageRegistry = core.getInput('package_registry')
    const inputPackageFullname = core.getInput('package_fullname')

    // Fetch a list of tags from a source registry
    let imageTags: string[] = []
    if (inputPackageRegistry === 'github') {
      const inputGithubToken = core.getInput('token')
      imageTags = await fetchExistingTagsFromGitHub({
        inputDevCache,
        inputGithubToken,
        inputPackageFullname
      })
    } else if (inputPackageRegistry === 'dockerhub') {
      const inputDockerHubUsername = core.getInput('dockerhub_username')
      const inputDockerHubPassword = core.getInput('dockerhub_password')

      imageTags = await fetchExistingTagsFromDockerHub({
        inputDevCache,
        inputDockerHubUsername,
        inputDockerHubPassword,
        inputPackageFullname
      })
    } else {
      core.setFailed(
        `Package registry ${inputPackageRegistry} is unsupported, only "github" and "dockerhub" are currently supported`
      )
    }

    core.info(
      `The container tags for package ${inputPackageFullname} are: ${imageTags.join(', ')}`
    )

    // Determine what shorthand tags to generate
    // Two important parameters are used here:
    // - version_digits_count: Indicate the number of digits in traditional release version,
    //    this helps determine when an alias should be generated. For example if the value is 3,
    //    if the system sees a tag 1.2 it knows that it should be ignored. Shorthand tags will only be generated
    //    for versions with 3 digits EXACTLY.
    // - snapshot_suffix: Snapshot suffix
    //    In some cases, we might want to generate shorthands for snapshot versions as well, in such a case, the system will generate
    //    shorthand tags for these. For example, if version_digits_count = 3 and snapshot_suffix = "-SNAPSHOT". The system will generate shorthand
    //    tags for all tags being EXACTLY 3 digits AND followed by the snapshot suffix.
    // In this method we're only creating an array of shorthand tags, this array is composed of objects {tag: string, shorthand: string}

    const inputVersionDigitsCount = core.getInput('version_digits_count')
    const inputSnapshotSuffix = core.getInput('snapshot_suffix')

    const shorthandTags = buildShortHandtags({
      tags: imageTags,
      digitsCount: Number(inputVersionDigitsCount),
      snapshotSuffix: inputSnapshotSuffix
    })

    core.info(
      `The following tags are needed: ${shorthandTags.map((tag) => tag.shorthand).join(', ')}`
    )

    core.info(`Successfully executed the action`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
