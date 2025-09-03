import * as core from '@actions/core'
import * as exec from '@actions/exec'

import type { ShorthandTag, Registry } from '../types/index.js'

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
}): Promise<any> => {
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
