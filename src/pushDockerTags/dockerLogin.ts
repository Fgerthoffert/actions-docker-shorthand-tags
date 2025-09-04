import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { exit } from 'process'

import type { Registry } from '../types/index.js'

export const dockerLogin = async (registry: Registry): Promise<void> => {
  core.info(
    `Attempting to authentication to registry: ${registry.registry === '' ? 'Docker Hub' : registry.registry}`
  )

  let currentRegistry = ''
  if (registry.registry === 'github') {
    currentRegistry = 'ghcr.io'
  }

  try {
    await exec.exec(
      'docker',
      [
        'login',
        currentRegistry,
        '--username',
        registry.username,
        '--password-stdin'
      ],
      {
        input: Buffer.from(registry.secret),
        silent: true // Hide password from logs
      }
    )
    core.info(`Successfully authenticated with ${registry.registry}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Authentication failed: ${error.message}`)
    } else {
      core.setFailed('Authentication failed: Unknown error')
    }
    exit(1)
  }
}

export default dockerLogin
