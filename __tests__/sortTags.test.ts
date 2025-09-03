import { describe, it, expect } from '@jest/globals'
import sortTags from '../src/buildShorthandTags/sortTags'

describe('sortTags', () => {
  it('sorts tags in descending semantic version order', () => {
    const tags = ['1.2.3', '2.0.0', '1.10.0', '1.2.10']
    const result = sortTags([...tags], 3)
    expect(result).toEqual(['2.0.0', '1.10.0', '1.2.10', '1.2.3'])
  })

  it('handles tags with different digit counts', () => {
    const tags = ['1.2', '1.2.3', '1.2.3.4', '2.0']
    const result = sortTags([...tags], 2)
    expect(result).toEqual(['2.0', '1.2', '1.2.3', '1.2.3.4'])
  })

  it('sorts tags with snapshot suffix correctly', () => {
    const tags = ['1.2.3-SNAPSHOT', '2.0.0-SNAPSHOT', '1.10.0-SNAPSHOT']
    const result = sortTags([...tags], 3, '-SNAPSHOT')
    expect(result).toEqual([
      '2.0.0-SNAPSHOT',
      '1.10.0-SNAPSHOT',
      '1.2.3-SNAPSHOT'
    ])
  })

  it('handles tags with non-numeric suffixes', () => {
    const tags = ['1.2.3-rc', '1.2.3', '1.2.4-beta', '1.2.4']
    const result = sortTags([...tags], 3)
    expect(result).toEqual(['1.2.4-beta', '1.2.4', '1.2.3-rc', '1.2.3'])
  })

  it('returns empty array for empty input', () => {
    const tags: string[] = []
    const result = sortTags(tags, 3)
    expect(result).toEqual([])
  })
})
