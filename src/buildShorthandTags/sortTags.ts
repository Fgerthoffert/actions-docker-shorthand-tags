export const sortTags = (tags: string[], digitsCount: number): string[] => {
  // Sort tags in descending order by semantic version
  const getNumericParts = (tag: string, digitsCount: number) => {
    // Remove suffix (anything after first non-digit or dot)
    const match = tag.match(/^([0-9]+(\.[0-9]+)*)/)
    const parts = match ? match[1].split('.').map(Number) : []
    // Only consider the first digitsCount parts
    return parts.slice(0, digitsCount)
  }

  const sortedTags = tags.sort((a, b) => {
    const aParts = getNumericParts(a, digitsCount)
    const bParts = getNumericParts(b, digitsCount)
    for (let i = 0; i < digitsCount; i++) {
      const aPart = aParts[i] || 0
      const bPart = bParts[i] || 0
      if (aPart !== bPart) {
        return bPart - aPart // Descending order
      }
    }
    return 0
  })

  return sortedTags
}

export default sortTags
