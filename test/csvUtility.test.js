import { Readable } from 'stream';
import CsvUtility from '../src/utils/csvUtility.js';

const makeCsv = (rowCount) => {
  const rows = ['name,amount'];
  for (let index = 1; index <= rowCount; index += 1) {
    rows.push(`user-${index},${index}`);
  }
  return rows.join('\n');
};

describe('CsvUtility streaming and batching', () => {
  it('processes a CSV stream in sequential batches', async () => {
    const utility = new CsvUtility([], ['name', 'amount'], 1000);
    const batchSizes = [];
    let activeCallbacks = 0;
    let maxActiveCallbacks = 0;

    const total = await utility._readCsvFile(
      Readable.from([makeCsv(2050)]),
      async (batch) => {
        activeCallbacks += 1;
        maxActiveCallbacks = Math.max(maxActiveCallbacks, activeCallbacks);
        batchSizes.push(batch.length);
        await new Promise((resolve) => setTimeout(resolve, 1));
        activeCallbacks -= 1;
      },
    );

    expect(total).toBe(2050);
    expect(batchSizes).toEqual([1000, 1000, 50]);
    expect(maxActiveCallbacks).toBe(1);
  });

  it('normalizes headers and adds sequential row numbers', async () => {
    const utility = new CsvUtility([], ['name', 'amount'], 10);
    let receivedRows = [];

    const total = await utility._readCsvFile(
      Readable.from([' Name , Amount \n Vikas , 100 ']),
      async (batch) => { receivedRows = batch; },
    );

    expect(total).toBe(1);
    expect(receivedRows).toEqual([{ name: 'Vikas', amount: '100', row_num: 1 }]);
  });

  it('rejects files that are missing required headers', async () => {
    const utility = new CsvUtility([], ['name', 'amount']);

    await expect(
      utility._readCsvFile(
        Readable.from(['name,email\nVikas,v@example.com']),
        async () => {},
      ),
    ).rejects.toThrow('Missing headers: amount');
  });

  it('propagates batch processing errors to the caller', async () => {
    const utility = new CsvUtility([], [], 1);

    await expect(
      utility._readCsvFile(
        Readable.from(['name\nVikas']),
        async () => { throw new Error('database insert failed'); },
      ),
    ).rejects.toThrow('database insert failed');
  });

  it('rejects invalid batch sizes', () => {
    expect(() => new CsvUtility([], [], 0)).toThrow(
      'batchSize must be a positive integer',
    );
  });
});
