import * as core from '@actions/core'
import * as exec from '@actions/exec'

import type { ShorthandTag, Registry } from '../types/index.js'

/**
 * Creates and pushes a Docker tag named "latest" based on a provided shorthand tag.
 *
 * This function uses Docker Buildx imagetools to create a new "latest" tag in the destination registry,
 * using the image from the source registry and the specified shorthand tag as the base.
 *
 * If `dryRun` is true, the function will only log the Docker command that would be executed, without performing any actions.
 *
 * @param shorthandTag - The shorthand tag information used as the base for the new "latest" tag.
 * @param srcRegistry - The source registry containing the original image.
 * @param dstRegistry - The destination registry where the "latest" tag will be pushed.
 * @param dryRun - If true, only logs the intended Docker command without executing it.
 *
 * @returns void
 */
export const createLatestDockerTag = async ({
  shorthandTag,
  srcRegistry,
  dstRegistry,
  dryRun
}: {
  shorthandTag: ShorthandTag
  srcRegistry: Registry
  dstRegistry: Registry
  dryRun: boolean
}): Promise<void> => {
  core.info(
    `Pushing latest tags, using ${shorthandTag.tag} as base, dry run: ${dryRun}`
  )
  console.log(shorthandTag)
  let currentSrcRegistry = ''
  if (srcRegistry.registry === 'github') {
    currentSrcRegistry = 'ghcr.io/'
  }

  let currentDstRegistry = ''
  if (dstRegistry.registry === 'github') {
    currentDstRegistry = 'ghcr.io/'
  }

  if (dryRun) {
    core.info(
      `Dry run: Generate tag with docker buildx: docker buildx imagetools create --tag ${currentDstRegistry}${dstRegistry.repository}:latest ${currentSrcRegistry}${srcRegistry.repository}:${shorthandTag.tag}`
    )
  } else {
    await exec.exec('docker', [
      'buildx',
      'imagetools',
      'create',
      '--tag',
      `${currentDstRegistry}${dstRegistry.repository}:latest`,
      `${currentSrcRegistry}${srcRegistry.repository}:${shorthandTag.tag}`
    ])
    core.info(
      `Successfully pushed tag: ${currentDstRegistry}${dstRegistry.repository}:latest`
    )
  }

  return
}

export default createLatestDockerTag
