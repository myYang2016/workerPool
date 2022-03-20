import WorkerPool from '../src/WorkerPool';
import * as path from 'path';
import { delay } from '../src/utils';

describe('test worker pool', function () {
  const workerPool = new WorkerPool({
    path: path.resolve(__dirname, '../src/thread/index.js'),
  });
  test('worker init', async function () {
    expect(workerPool instanceof WorkerPool);
    const worker = await workerPool.acquire();
    const msg = await new Promise(resolve => worker.on('message', resolve));
    expect(msg);
    expect(workerPool.totalWorker).toBe(1);
    await workerPool.acquire();
    expect(workerPool.totalWorker).toBe(2);
    await workerPool.acquire();
    expect(workerPool.totalWorker).toBe(2);
    await delay(2000);
    expect(workerPool.totalWorker).toBe(0);
  });
  test('release', async function() {
    const worker = await workerPool.acquire();
    expect(workerPool.totalWorker).toBe(1);
    await workerPool.release(worker);
    await workerPool.acquire();
    expect(workerPool.totalWorker).toBe(1);
  });
});

