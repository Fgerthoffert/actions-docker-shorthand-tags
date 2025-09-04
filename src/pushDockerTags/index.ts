import * as core from '@actions/core'
import * as exec from '@actions/exec'

import type { ShorthandTag, Registry } from '../types/index.js'

export const pushDockerTags = async ({
  shorthandTags,
  srcRegistry,
  dstRegistry,
  dryRun
}: {
  shorthandTags: ShorthandTag[]
  srcRegistry: Registry
  dstRegistry: Registry
  dryRun: boolean
}): Promise<void> => {
  core.info(`Pushing shorthand tags - dry run: ${dryRun}`)

  let currentSrcRegistry = ''
  if (srcRegistry.registry === 'github') {
    currentSrcRegistry = 'ghcr.io/'
  }

  let currentDstRegistry = ''
  if (dstRegistry.registry === 'github') {
    currentDstRegistry = 'ghcr.io/'
  }

  for (const tag of shorthandTags) {
    core.info(
      `${dryRun === false ? 'Executing command ' : '[DRY RUN] - Command skipped'}: docker buildx imagetools create --tag ${currentDstRegistry}${dstRegistry.repository}:${tag.shorthand} ${currentSrcRegistry}${srcRegistry.repository}:${tag.tag}`
    )
    if (dryRun === false) {
      await exec.exec('docker', [
        'buildx',
        'imagetools',
        'create',
        '--tag',
        `${currentDstRegistry}${dstRegistry.repository}:${tag.shorthand}`,
        `${currentSrcRegistry}${srcRegistry.repository}:${tag.tag}`
      ])
      core.info(
        `Successfully pushed tag: ${currentDstRegistry}${dstRegistry.repository}:${tag.shorthand}`
      )
    }
  }

  return
}

export default pushDockerTags
