import { LogFactory } from '../../lib/logger.js';
import dayjs from 'dayjs';
class DateUtility {
  constructor() {
    this.className = 'DateUtility';
    this.logger = LogFactory.getLogger(this.className);
  }

  convertDateFormat(dateInput) {
    try {
      if (dateInput === undefined) {
        return null;
      }

      // If it's a Date object, get the YYYY-MM-DD format
      if (dateInput instanceof Date) {
        const year = dateInput.getFullYear();
        const month = String(dateInput.getMonth() + 1).padStart(2, '0');
        const day = String(dateInput.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      }

      // If it's a string, handle both DD/MM/YYYY and DD-MM-YYYY formats
      if (typeof dateInput === 'string') {
        // Replace all dashes with slashes for consistency
        const normalizedDate = dateInput.replace(/-/g, '/');

        const [day, month, year] = normalizedDate.split('/');
        if (day && month && year) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Error converting date format:', error);

      return null;
    }
  }

  getDifferenceInDates(inputDate,istOffset=0) {
    inputDate = dayjs(inputDate);
    const utcDateTime = new Date();
    const date = new Date(utcDateTime.getTime() + istOffset);
    const currentDate = dayjs(date);
    const diffInHours = currentDate.diff(inputDate, 'hour');
    return diffInHours > 24;
  }

  static addDaysToDate(date, days) {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);

    return newDate;
  };

}
export { DateUtility };
export default new DateUtility();

