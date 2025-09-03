import * as core from '@actions/core'

export interface ShorthandTag {
  tag: string
  shorthand: string
}

// Taking an array of tags, this methods removes any tags that do not match the expected version format
// For example, this will filter out:
//   - Existing shorthands (less than the number of digits in digitsCount)
//   - Tags that do match the digit count but are used for other purposes (1.2.3-my-branch, 1.2.3-rc, ...)
export const cleanupTags = (
  tags: string[],
  digitsCount: number,
  snapshotSuffix: string = ''
): string[] => {
  return tags.filter((tag) => {
    // Remove snapshot suffix if present to analyze the version digits
    const baseTag =
      snapshotSuffix && tag.endsWith(snapshotSuffix)
        ? tag.slice(0, -snapshotSuffix.length)
        : tag

    // Check if tag matches the expected digit pattern (e.g., "1.2.3")
    const versionRegex = new RegExp(`^\\d+(?:\\.\\d+){${digitsCount - 1}}$`)

    if (!versionRegex.test(baseTag)) {
      return false
    }

    // If we have a snapshot suffix, ensure the original tag has it
    if (snapshotSuffix && !tag.endsWith(snapshotSuffix)) {
      return false
    }

    // If we don't expect a snapshot suffix, ensure the tag doesn't have it
    if (!snapshotSuffix && tag !== baseTag) {
      return false
    }

    return true
  })
}

const generateShortHandTags = (
  tags: string[],
  digitsCount: number,
  snapshotSuffix: string = ''
): ShorthandTag[] => {
  const shortHandTags: ShorthandTag[] = []
  const addedShorthands = new Set<string>()

  // Filter and sort tags by semantic version in descending order
  const filteredTags = cleanupTags(tags, digitsCount, snapshotSuffix)

  // Sort tags in descending order by semantic version
  const sortedTags = filteredTags.sort((a, b) => {
    // Remove snapshot suffix for comparison
    const aBase =
      snapshotSuffix && a.endsWith(snapshotSuffix)
        ? a.slice(0, -snapshotSuffix.length)
        : a
    const bBase =
      snapshotSuffix && b.endsWith(snapshotSuffix)
        ? b.slice(0, -snapshotSuffix.length)
        : b

    const aParts = aBase.split('.').map(Number)
    const bParts = bBase.split('.').map(Number)

    // Compare each version part
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0
      const bPart = bParts[i] || 0

      if (aPart !== bPart) {
        return bPart - aPart // Descending order
      }
    }

    return 0
  })

  // Generate shorthand tags
  for (const tag of sortedTags) {
    // Remove snapshot suffix if present to analyze the version digits
    const baseTag =
      snapshotSuffix && tag.endsWith(snapshotSuffix)
        ? tag.slice(0, -snapshotSuffix.length)
        : tag

    const versionParts = baseTag.split('.')
    const suffix =
      snapshotSuffix && tag.endsWith(snapshotSuffix) ? snapshotSuffix : ''

    // Generate shorthand tags by progressively removing digits from the right
    for (let i = versionParts.length - 1; i > 0; i--) {
      const shorthandBase = versionParts.slice(0, i).join('.')
      const shorthand = shorthandBase + suffix

      // Only add if we haven't already added this shorthand
      if (!addedShorthands.has(shorthand)) {
        shortHandTags.push({
          tag,
          shorthand
        })
        addedShorthands.add(shorthand)
      }
    }
  }

  return shortHandTags
}

export const buildShortHandtags = ({
  tags,
  digitsCount,
  snapshotSuffix
}: {
  tags: string[]
  digitsCount: number
  snapshotSuffix: string
}): ShorthandTag[] => {
  core.info(
    `Generating shorthand tags for tags with a digit count of ${digitsCount} and potentially a suffix: ${snapshotSuffix}`
  )
  // Use the cleaned and sorted tags to generate shorthands
  return generateShortHandTags(tags, digitsCount, snapshotSuffix)
}

export default buildShortHandtags
