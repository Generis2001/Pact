import { describe, expect, test } from 'bun:test'
import { formatUsdc, parseUsdc, readUsdcInput, parseRecordId, isValidAddress } from '../src/lib/utils'

describe('payment input validation', () => {
  test('retains exact USDC precision, including large balances', () => {
    const text = '9007199254740993.000001'
    expect(formatUsdc(parseUsdc(text))).toBe(text)
    expect(readUsdcInput('0.000001')).toBe(1n)
  })

  test('negative fractional input never becomes a positive payment', () => {
    expect(parseUsdc('-0.1')).toBe(-100000n)
    expect(formatUsdc(-100000n)).toBe('-0.1')
    expect(readUsdcInput('-0.1')).toBe(0n)
  })

  test('invalid or imprecise amounts cannot become payment arguments', () => {
    for (const input of ['', '.', '1e6', 'NaN', '1.0000001', '0', '-1', '0x10', '9'.repeat(100)]) {
      expect(readUsdcInput(input)).toBe(0n)
    }
    expect(() => parseUsdc('1.0000001')).toThrow()
  })

  test('record IDs must be positive uint256 integers', () => {
    for (const input of ['', '0', '-1', '1.5', '1e3', 'abc', '9'.repeat(100)]) {
      expect(parseRecordId(input)).toBeUndefined()
    }
    expect(parseRecordId(' 123 ')).toBe(123n)
  })

  test('zero addresses are rejected before creating an agreement', () => {
    expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(false)
    expect(isValidAddress('0x0986Bfd653985c9Fa60a464784264444B542BfD7')).toBe(true)
  })
})
