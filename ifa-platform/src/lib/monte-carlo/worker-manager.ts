// =====================================================
// 2. WEB WORKER MANAGER (MonteCarloWorkerManager.ts)
// =====================================================

export interface WorkerBatchResult {
  batchId: string;
  results: any[];
  executionTime: number;
  batchStart: number;
  batchSize: number;
}

export interface WorkerProgress {
  type: 'batch_progress' | 'batch_complete';
  batchId?: string;
  progress: number;
  runNumber?: number;
}

export class MonteCarloWorkerManager {
  private workers: Worker[] = [];
  private readonly maxWorkers: number;
  private activeBatches = new Map<string, { resolve: Function; reject: Function }>();
  private progressCallback?: (progress: WorkerProgress) => void;
  
  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap at 8 workers
  }
  
  /**
   * Initialize workers
   */
  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.maxWorkers} Monte Carlo workers`);
    
    const workerPromises = [];
    
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerPromise = this.createWorker();
      workerPromises.push(workerPromise);
    }
    
    this.workers = await Promise.all(workerPromises);
    console.log(`✅ ${this.workers.length} workers initialized`);
  }
  
  /**
   * Create and validate a single worker
   */
  private async createWorker(): Promise<Worker> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/monte-carlo-worker.js');
      
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 5000);
      
      worker.onmessage = (e) => {
        const { type } = e.data;
        
        if (type === 'SETUP_VALID') {
          clearTimeout(timeout);
          worker.onmessage = this.handleWorkerMessage.bind(this);
          resolve(worker);
        }
      };
      
      worker.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
      
      // Test worker
      worker.postMessage({ type: 'VALIDATE_SETUP' });
    });
  }
  
  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(e: MessageEvent) {
    const { type, batchId } = e.data;
    
    switch (type) {
      case 'BATCH_COMPLETE':
        this.handleBatchComplete(e.data);
        break;
        
      case 'BATCH_PROGRESS':
        this.handleBatchProgress(e.data);
        break;
        
      case 'BATCH_ERROR':
        this.handleBatchError(e.data);
        break;
        
      default:
        console.warn('Unknown worker message type:', type);
    }
  }
  
  private handleBatchComplete(data: WorkerBatchResult) {
    const batch = this.activeBatches.get(data.batchId);
    if (batch) {
      batch.resolve(data);
      this.activeBatches.delete(data.batchId);
      
      // Report completion progress
      this.progressCallback?.({
        type: 'batch_complete',
        batchId: data.batchId,
        progress: 100
      });
    }
  }
  
  private handleBatchProgress(data: any) {
    this.progressCallback?.({
      type: 'batch_progress',
      batchId: data.batchId,
      progress: data.progress,
      runNumber: data.runNumber
    });
  }
  
  private handleBatchError(data: any) {
    const batch = this.activeBatches.get(data.batchId);
    if (batch) {
      batch.reject(new Error(data.error));
      this.activeBatches.delete(data.batchId);
    }
  }
  
  /**
   * Run simulation batches across multiple workers
   */
  async runSimulation(
    scenario: any,
    assumptions: any,
    portfolio: any,
    totalSimulations: number,
    batchSize: number = 1000,
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<any[]> {
    if (this.workers.length === 0) {
      await this.initialize();
    }
    
    this.progressCallback = onProgress;
    
    console.log(`🎲 Running ${totalSimulations} simulations across ${this.workers.length} workers`);
    
    // Create batches
    const batches = [];
    for (let start = 0; start < totalSimulations; start += batchSize) {
      const size = Math.min(batchSize, totalSimulations - start);
      batches.push({ start, size });
    }
    
    // Distribute batches across workers
    const batchPromises = batches.map((batch, index) => {
      const workerIndex = index % this.workers.length;
      const batchId = `batch_${index}_${Date.now()}`;
      
      return this.runBatch(
        this.workers[workerIndex],
        scenario,
        assumptions,
        portfolio,
        batch.start,
        batch.size,
        batchId
      );
    });
    
    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Combine results
    const allResults = [];
    for (const batchResult of batchResults) {
      allResults.push(...batchResult.results);
    }
    
    console.log(`✅ Completed ${allResults.length} simulations`);
    return allResults;
  }
  
  /**
   * Run a single batch on a specific worker
   */
  private runBatch(
    worker: Worker,
    scenario: any,
    assumptions: any,
    portfolio: any,
    batchStart: number,
    batchSize: number,
    batchId: string
  ): Promise<WorkerBatchResult> {
    return new Promise((resolve, reject) => {
      this.activeBatches.set(batchId, { resolve, reject });
      
      worker.postMessage({
        type: 'RUN_SIMULATION_BATCH',
        payload: {
          scenario,
          assumptions,
          portfolio,
          batchStart,
          batchSize,
          batchId
        }
      });
    });
  }
  
  /**
   * Clean up workers
   */
  destroy(): void {
    console.log('🧹 Cleaning up Monte Carlo workers');
    
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    this.workers = [];
    this.activeBatches.clear();
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    activeWorkers: number;
    activeBatches: number;
    maxWorkers: number;
  } {
    return {
      activeWorkers: this.workers.length,
      activeBatches: this.activeBatches.size,
      maxWorkers: this.maxWorkers
    };
  }
}