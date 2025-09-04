import { describe, it, expect } from '@jest/globals'
import generateShorthandTags from '../src/buildShorthandTags/generateShorthandTags'
import type { ShorthandTag } from '../src/types/index'

describe('generateShorthandTags', () => {
  it('generates shorthands when one single tag is present', () => {
    const tags = ['1.2.3']
    const result: ShorthandTag[] = generateShorthandTags(tags, 3)
    expect(result).toEqual([
      { tag: '1.2.3', shorthand: '1.2' },
      { tag: '1.2.3', shorthand: '1' }
    ])
  })

  it('generates shorthands for standard tags', () => {
    const tags = ['1.2.3', '2.0.0']
    const result: ShorthandTag[] = generateShorthandTags(tags, 3)
    expect(result).toEqual([
      { tag: '1.2.3', shorthand: '1.2' },
      { tag: '1.2.3', shorthand: '1' },
      { tag: '2.0.0', shorthand: '2.0' },
      { tag: '2.0.0', shorthand: '2' }
    ])
  })

  it('does not duplicate shorthands', () => {
    const tags = ['1.2.3', '1.2.3', '1.2.3']
    const result: ShorthandTag[] = generateShorthandTags(tags, 3)
    expect(result.filter((t) => t.shorthand === '1.2').length).toBe(1)
    expect(result.filter((t) => t.shorthand === '1').length).toBe(1)
  })

  it('handles snapshot suffix', () => {
    const tags = ['1.2.3-SNAPSHOT', '2.0.0-SNAPSHOT']
    const result: ShorthandTag[] = generateShorthandTags(tags, 3, '-SNAPSHOT')
    expect(result).toEqual([
      { tag: '1.2.3-SNAPSHOT', shorthand: '1.2-SNAPSHOT' },
      { tag: '1.2.3-SNAPSHOT', shorthand: '1-SNAPSHOT' },
      { tag: '2.0.0-SNAPSHOT', shorthand: '2.0-SNAPSHOT' },
      { tag: '2.0.0-SNAPSHOT', shorthand: '2-SNAPSHOT' }
    ])
  })

  it('handles snapshot suffix when one single tag is present', () => {
    const tags = ['1.2.3-SNAPSHOT']
    const result: ShorthandTag[] = generateShorthandTags(tags, 3, '-SNAPSHOT')
    expect(result).toEqual([
      { tag: '1.2.3-SNAPSHOT', shorthand: '1.2-SNAPSHOT' },
      { tag: '1.2.3-SNAPSHOT', shorthand: '1-SNAPSHOT' }
    ])
  })

  it('ignores tags with wrong digitsCount or less than 3 digits', () => {
    const tags = ['1.2', '1.2.3', '1.2.3.4']
    const result: ShorthandTag[] = generateShorthandTags(tags, 2)
    expect(result).toEqual([])
    const result2: ShorthandTag[] = generateShorthandTags(tags, 4)
    expect(result2).toEqual([
      { tag: '1.2.3.4', shorthand: '1.2.3' },
      { tag: '1.2.3.4', shorthand: '1.2' },
      { tag: '1.2.3.4', shorthand: '1' }
    ])
  })

  it('returns empty array for no matches', () => {
    const tags = ['foo', 'bar', 'baz']
    const result: ShorthandTag[] = generateShorthandTags(tags, 3)
    expect(result).toEqual([])
  })
})
