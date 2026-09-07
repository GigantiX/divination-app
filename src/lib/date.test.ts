import { describe, expect, it } from 'vitest'

import { getJakartaDateString } from './date'

describe('Jakarta business date', () => {
    it('uses the Jakarta calendar day across a UTC date boundary', () => {
        expect(getJakartaDateString(new Date('2026-09-06T18:00:00.000Z'))).toBe('2026-09-07')
    })
})
