const REQUIRED_FIELDS = ['brcode', 'scheme_code', 'min_amount', 'reg_date'];
const NUMBER_PATTERN = /^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$/;

export function validateBsc200Row(row) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    const value = row[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  const amount = row.min_amount;
  if (
    amount !== undefined
    && amount !== null
    && String(amount).trim() !== ''
    && (!NUMBER_PATTERN.test(String(amount).trim()) || !Number.isFinite(Number(amount)))
  ) {
    errors.push('min_amount must be a valid number');
  }

  const registrationDate = row.reg_date;
  if (
    registrationDate !== undefined
    && registrationDate !== null
    && !(registrationDate instanceof Date && !Number.isNaN(registrationDate.getTime()))
  ) {
    errors.push('reg_date must be a valid date');
  }

  return errors;
}

export default validateBsc200Row;
