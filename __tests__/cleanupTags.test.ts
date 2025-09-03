import { describe, it, expect } from '@jest/globals'

import { cleanupTags } from '../src/buildShorthandTags/cleanupTags'

describe('cleanupTags', () => {
  it('filters tags with exact digitsCount', () => {
    const tags = ['1.2.3', '1.2', '1.2.3.4', '2.0.0', '2.1.0.1']
    expect(cleanupTags(tags, 3)).toEqual(['1.2.3', '2.0.0'])
  })

  it('filters out tags with extra suffixes', () => {
    const tags = ['1.2.3', '1.2.3-rc', '1.2.3-my-branch', '2.0.0']
    expect(cleanupTags(tags, 3)).toEqual(['1.2.3', '2.0.0'])
  })

  it('filters tags with snapshot suffix', () => {
    const tags = ['1.2.3-SNAPSHOT', '1.2.3', '2.0.0-SNAPSHOT', '2.0.0']
    expect(cleanupTags(tags, 3, '-SNAPSHOT')).toEqual([
      '1.2.3-SNAPSHOT',
      '2.0.0-SNAPSHOT'
    ])
  })

  it('ignores tags with wrong digitsCount', () => {
    const tags = ['1.2', '1.2.3', '1.2.3.4', '1.2.4', '1.3.1-SNAPSHOT']
    expect(cleanupTags(tags, 2)).toEqual(['1.2'])
    expect(cleanupTags(tags, 4)).toEqual(['1.2.3.4'])
  })

  it('returns empty array for no matches', () => {
    const tags = ['foo', 'bar', '1.2.3-rc']
    expect(cleanupTags(tags, 3)).toEqual([])
  })
})
