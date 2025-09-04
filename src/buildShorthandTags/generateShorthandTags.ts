import type { ShorthandTag } from '../types/index.js'

export const generateShorthandTags = (
  tags: string[],
  digitsCount: number,
  snapshotSuffix: string = ''
): ShorthandTag[] => {
  const shortHandTags: ShorthandTag[] = []
  const addedShorthands = new Set<string>()

  // Generate shorthand tags
  for (const tag of tags) {
    // Remove snapshot suffix if present to analyze the version digits
    const baseTag =
      snapshotSuffix && tag.endsWith(snapshotSuffix)
        ? tag.slice(0, -snapshotSuffix.length)
        : tag

    const versionParts = baseTag.split('.')
    const suffix =
      snapshotSuffix && tag.endsWith(snapshotSuffix) ? snapshotSuffix : ''

    // Only generate shorthands for tags with 3 or more digits
    if (versionParts.length < 3 || versionParts.length !== digitsCount) {
      continue
    }

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

export default generateShorthandTags
