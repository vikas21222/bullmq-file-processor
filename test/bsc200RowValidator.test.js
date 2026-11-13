import { validateBsc200Row } from '../src/utils/bsc200RowValidator.js';

const validRow = {
  brcode: 'BR001',
  scheme_code: 'SC001',
  min_amount: '1000.50',
  reg_date: new Date('2024-01-31T00:00:00.000Z'),
};

describe('BSC200 row validation', () => {
  it('accepts a row with all required fields and valid values', () => {
    expect(validateBsc200Row(validRow)).toEqual([]);
  });

  it('reports every missing required field', () => {
    expect(validateBsc200Row({
      brcode: ' ',
      scheme_code: null,
      min_amount: '',
      reg_date: null,
    })).toEqual([
      'brcode is required',
      'scheme_code is required',
      'min_amount is required',
      'reg_date is required',
    ]);
  });

  it.each(['abc', '12.3.4', ''])('rejects invalid min_amount value: %s', (minAmount) => {
    const row = { ...validRow, min_amount: minAmount };
    expect(validateBsc200Row(row)).toContain('min_amount must be a valid number');
  });

  it('accepts integer and decimal numeric values', () => {
    expect(validateBsc200Row({ ...validRow, min_amount: '500' })).toEqual([]);
    expect(validateBsc200Row({ ...validRow, min_amount: '500.75' })).toEqual([]);
  });

  it('rejects an invalid registration date', () => {
    expect(validateBsc200Row({ ...validRow, reg_date: null }))
      .toContain('reg_date is required');
    expect(validateBsc200Row({ ...validRow, reg_date: 'not-a-date' }))
      .toContain('reg_date must be a valid date');
  });
});
