import * as core from '@actions/core'

import { cleanupTags } from './cleanupTags.js'
import { sortTags } from './sortTags.js'
import { generateShorthandTags } from './generateShorthandTags.js'

import type { ShorthandTag } from '../types/index.js'

export const buildShortHandtags = ({
  tags,
  digitsCount,
  suffix
}: {
  tags: string[]
  digitsCount: number
  suffix: string
}): ShorthandTag[] => {
  core.info(
    `Generating shorthand tags for tags with a digit count of ${digitsCount} and potentially a suffix: ${suffix}`
  )

  console.log('All Tags:', tags)

  // Start by cleanup all the tags and removing all of the tags not candidates for shorthands
  // Splitting the logic in two, once for release, and one for snapshot

  const tagsCandidates = cleanupTags(tags, digitsCount, suffix)
  const tagsCandidatesSorted = sortTags(tagsCandidates, digitsCount)
  const shorthandTags = generateShorthandTags(
    tagsCandidatesSorted,
    digitsCount,
    suffix
  )

  console.log('Matching tags:', tagsCandidates)
  console.log('Matching tags (sorted DESC):', tagsCandidatesSorted)
  console.log('Shorthand tags:', shorthandTags)

  // Use the cleaned and sorted tags to generate shorthands
  return shorthandTags
}

export default buildShortHandtags
