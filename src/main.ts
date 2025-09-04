import * as core from '@actions/core'

import fetchExistingTagsFromGitHub from './repositories/github/index.js'
import fetchExistingTagsFromDockerHub from './repositories/dockerhub/index.js'

import buildShortHandtags from './buildShorthandTags/index.js'

import pushDockerTags from './pushDockerTags/index.js'
import { dockerLogin } from './pushDockerTags/dockerLogin.js'
import { createLatestDockerTag } from './pushDockerTags/createLatestDockerTag.js'

import type { Registry } from './types/index.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const inputDevCache = core.getInput('dev_cache') === 'true'
    const inputVersionDigitsCount = core.getInput('version_digits_count')
    const inputSnapshotSuffix = core.getInput('snapshot_suffix')
    const inputDryRun = core.getInput('dry_run') === 'true'
    const inputCreateLatest = core.getInput('create_latest') === 'true'

    // Create two registry objects for source and destination
    const srcRegistry: Registry = {
      registry: core.getInput('src_registry'),
      repository: core.getInput('src_repository'),
      username: core.getInput('src_username'),
      secret: core.getInput('src_secret')
    }

    const dstRegistry: Registry = {
      registry: core.getInput('dst_registry'),
      repository: core.getInput('dst_repository'),
      username: core.getInput('dst_username'),
      secret: core.getInput('dst_secret')
    }

    // Fetch a list of tags from a source registry
    let imageTags: string[] = []
    if (srcRegistry.registry === 'github') {
      imageTags = await fetchExistingTagsFromGitHub({
        inputDevCache,
        inputGithubToken: srcRegistry.secret,
        inputSrcRepository: srcRegistry.repository
      })
    } else if (srcRegistry.registry === 'dockerhub') {
      imageTags = await fetchExistingTagsFromDockerHub({
        inputDevCache,
        inputDockerHubUsername: srcRegistry.username,
        inputDockerHubPassword: srcRegistry.secret,
        inputSrcRepository: srcRegistry.repository
      })
    } else {
      core.setFailed(
        `Package registry ${srcRegistry.registry} is unsupported, only "github" and "dockerhub" are currently supported`
      )
    }

    core.info(
      `The container tags for package ${srcRegistry.repository} are: ${imageTags.join(', ')}`
    )

    const shorthandTagsNoSuffix = buildShortHandtags({
      tags: imageTags,
      digitsCount: Number(inputVersionDigitsCount),
      suffix: ''
    })

    if (shorthandTagsNoSuffix.length === 0) {
      core.notice(`No shorthand tags need to be created (without suffix)`)
    } else {
      core.notice(
        `The following shorthand tags need to be created (without suffix): ${shorthandTagsNoSuffix.map((tag) => tag.shorthand).join(', ')}`
      )
    }

    // Login to remote Docker registries
    await dockerLogin(srcRegistry)
    if (srcRegistry.registry !== dstRegistry.registry) {
      // If dst registry is different from source, also login to the destination registry
      await dockerLogin(dstRegistry)
    }

    await pushDockerTags({
      shorthandTags: shorthandTagsNoSuffix,
      srcRegistry,
      dstRegistry,
      dryRun: inputDryRun
    })

    // If configured, create "latest" tag matching the container
    // with the highest digit
    // Remember: shorthandTagsNoSuffix array is sorted by version DESC, so first is always latest
    if (inputCreateLatest && shorthandTagsNoSuffix.length > 0) {
      await createLatestDockerTag({
        shorthandTag: shorthandTagsNoSuffix[0],
        srcRegistry,
        dstRegistry,
        dryRun: inputDryRun
      })
    }

    const shorthandTagsWithSuffix = buildShortHandtags({
      tags: imageTags,
      digitsCount: Number(inputVersionDigitsCount),
      suffix: inputSnapshotSuffix
    })

    if (shorthandTagsWithSuffix.length === 0) {
      core.notice(`No shorthand tags need to be created (without suffix)`)
    } else {
      core.notice(
        `The following shorthand tags need to be created (without suffix): ${shorthandTagsWithSuffix.map((tag) => tag.shorthand).join(', ')}`
      )
    }

    await pushDockerTags({
      shorthandTags: shorthandTagsWithSuffix,
      srcRegistry,
      dstRegistry,
      dryRun: inputDryRun
    })

    core.info(`Successfully executed the action`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
