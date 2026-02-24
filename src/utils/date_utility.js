function pad(num) {
  return String(num).padStart(2, '0');
}

const DateUtility = {
  // Accepts common date string formats and returns YYYY-MM-DD or null when invalid
  convertDateFormat(input) {
    if (!input && input !== 0) return null;

    const str = String(input).trim();

    // dd/mm/yyyy or d/m/yyyy
    const dmY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const mdy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/; // allow d-m-yyyy
    const isoY = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

    let match;
    if ((match = dmY.exec(str))) {
      const day = pad(match[1]);
      const month = pad(match[2]);
      const year = match[3];
      return `${year}-${month}-${day}`;
    }

    if ((match = mdy.exec(str))) {
      const month = pad(match[1]);
      const day = pad(match[2]);
      const year = match[3];
      return `${year}-${month}-${day}`;
    }

    if ((match = isoY.exec(str))) {
      const year = match[1];
      const month = pad(match[2]);
      const day = pad(match[3]);
      return `${year}-${month}-${day}`;
    }

    // Fallback: try to parse with Date
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = pad(parsed.getMonth() + 1);
      const day = pad(parsed.getDate());
      return `${year}-${month}-${day}`;
    }

    return null;
  }
};

export default DateUtility;
