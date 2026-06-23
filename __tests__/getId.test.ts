import { describe, it, expect } from '@jest/globals'
import { getId } from '../src/utils/getId'

describe('getId', () => {
  it('lowercases the input', () => {
    expect(getId('ABCdef')).toBe('abcdef')
  })

  it('strips non-alphanumeric characters (keeping the + sign)', () => {
    expect(getId('a.b-c_d e/f')).toBe('abcdef')
    expect(getId('1.2.3-SNAPSHOT')).toBe('123snapshot')
  })

  it('preserves digits and the plus sign', () => {
    expect(getId('1+2+3')).toBe('1+2+3')
  })

  it('returns an empty string when nothing remains', () => {
    expect(getId('!@#$%^&*()')).toBe('')
    expect(getId('')).toBe('')
  })

  it('coerces non-string input via String()', () => {
    // @ts-expect-error testing runtime coercion of a non-string argument
    expect(getId(123)).toBe('123')
  })
})
