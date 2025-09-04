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

export default cleanupTags
