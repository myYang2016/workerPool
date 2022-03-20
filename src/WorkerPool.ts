import { Worker } from 'worker_threads';

export default class WorkerPool {
  private workers: Worker[] = [];
  private actives: Worker[] = [];
  private waiting: {
    resolve: (value: Worker | PromiseLike<Worker>) => void,
    reject: (reason?: any) => void
  }[] = [];
  workerData: { [key: string]: unknown } = {}
  path: string;
  maxPool: number;
  expire: number;
  private workerTimeMap: Map<Worker, number> = new Map();
  constructor(options: { 
    path: string, maxPool?: number, workerData?: { [key: string]: unknown },
    expire?: number;
  }) {
    const { path, maxPool = 2, workerData = {}, expire = 60 * 60 * 1000 } = options;
    this.path = path;
    this.maxPool = maxPool;
    this.workerData = workerData;
    this.expire = expire;
    this.checkExpire();
  }

  async acquire(): Promise<Worker> {
    if (this.workers.length > 0) {
      const worker = this.workers.splice(0, 1)[0];
      this.actives.push(worker);
      return worker;
    }
    if (this.totalWorker >= this.maxPool) {
      return new Promise<Worker>((resolve, reject) => {
        this.waiting.push({ resolve, reject });
      });
    }
    const worker = this.initWorker();
    this.actives.push(worker);
    return worker;
  }

  private initWorker(): Worker {
    // 在主进程中启动线程
    const worker = new Worker(this.path, this.workerData);
    worker.on('error', console.error);
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(new Error(`工作线程被退出码 ${code} 停止`));
      }
      this.release(worker, true);
    });
    return worker;
  }

  async release(worker: Worker, toDestroy: boolean = false) {
    this.actives = this.actives.filter(w => w !== worker);
    this.workers = this.workers.filter(w => w !== worker);
    if (!toDestroy) {
      this.workers.push(worker);
      this.workerTimeMap.set(worker, Date.now());
    }
    while (this.totalWorker < this.maxPool && this.waiting.length > 0) {
      const { resolve, reject } = this.waiting.splice(0, 1)[0];
      try {
        const worker = await this.acquire();
        resolve(worker);
      } catch (error) {
        reject(error);
      }
    }
  }

  get totalWorker() {
    return this.workers.length + this.actives.length;
  }

  private checkExpire() {
    setInterval(() => {
      this.workerTimeMap.forEach((time, worker) => {
        if (Date.now() - time > this.expire) {
          this.release(worker, true);
          this.workerTimeMap.delete(worker);
        }
      });
    }, 5000);
  }
}
