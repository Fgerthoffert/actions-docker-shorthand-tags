import { describe, it, expect } from '@jest/globals'
import buildShortHandtags from '../src/buildShorthandTags/index'

import type { ShorthandTag } from '../src/types/index'

describe('buildShortHandtags integration', () => {
  it('generates correct shorthand tags for mixed release and snapshot tags', () => {
    const tags = [
      '1.2.3',
      '2.0.0',
      '1.2.3-SNAPSHOT',
      '2.0.0-SNAPSHOT',
      'foo',
      '1.2.3-rc',
      '1.3.0-SNAPSHOT'
    ]
    const result: ShorthandTag[] = buildShortHandtags({
      tags,
      digitsCount: 3,
      suffix: '-SNAPSHOT'
    })
    expect(result).toEqual([
      { tag: '2.0.0-SNAPSHOT', shorthand: '2.0-SNAPSHOT' },
      { tag: '2.0.0-SNAPSHOT', shorthand: '2-SNAPSHOT' },
      { tag: '1.3.0-SNAPSHOT', shorthand: '1.3-SNAPSHOT' },
      { tag: '1.3.0-SNAPSHOT', shorthand: '1-SNAPSHOT' },
      { tag: '1.2.3-SNAPSHOT', shorthand: '1.2-SNAPSHOT' }
    ])
  })

  it('returns empty array for no valid tags', () => {
    const tags = ['foo', 'bar', 'baz']
    const result: ShorthandTag[] = buildShortHandtags({
      tags,
      digitsCount: 3,
      suffix: '-SNAPSHOT'
    })
    expect(result).toEqual([])
  })

  it('handles only release tags', () => {
    const tags = ['1.2.3', '2.0.0', '3.1.4']
    const result: ShorthandTag[] = buildShortHandtags({
      tags,
      digitsCount: 3,
      suffix: ''
    })
    expect(result).toEqual([
      { tag: '3.1.4', shorthand: '3.1' },
      { tag: '3.1.4', shorthand: '3' },
      { tag: '2.0.0', shorthand: '2.0' },
      { tag: '2.0.0', shorthand: '2' },
      { tag: '1.2.3', shorthand: '1.2' },
      { tag: '1.2.3', shorthand: '1' }
    ])
  })

  it('handles only snapshot tags', () => {
    const tags = ['1.2.3-SNAPSHOT', '2.0.0-SNAPSHOT']
    const result: ShorthandTag[] = buildShortHandtags({
      tags,
      digitsCount: 3,
      suffix: '-SNAPSHOT'
    })
    expect(result).toEqual([
      { tag: '2.0.0-SNAPSHOT', shorthand: '2.0-SNAPSHOT' },
      { tag: '2.0.0-SNAPSHOT', shorthand: '2-SNAPSHOT' },
      { tag: '1.2.3-SNAPSHOT', shorthand: '1.2-SNAPSHOT' },
      { tag: '1.2.3-SNAPSHOT', shorthand: '1-SNAPSHOT' }
    ])
  })

  it('handles empty input', () => {
    const tags: string[] = []
    const result: ShorthandTag[] = buildShortHandtags({
      tags,
      digitsCount: 3,
      suffix: '-SNAPSHOT'
    })
    expect(result).toEqual([])
  })
})
