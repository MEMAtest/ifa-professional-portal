import { createClient } from "@/lib/supabase/client"
// src/services/PollingService.ts
import { CashFlowScenarioService } from './CashFlowScenarioService';

interface PollingConfig {
  interval: number;
  maxRetries: number;
  backoffMultiplier: number;
}

export class PollingService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private retryCount: Map<string, number> = new Map();
  
  private defaultConfig: PollingConfig = {
    interval: 30000, // 30 seconds
    maxRetries: 3,
    backoffMultiplier: 2
  };

  startScenarioPolling(
    callback: (data: any) => void,
    config: Partial<PollingConfig> = {}
  ): string {
    const pollId = `scenarios_${Date.now()}`;
    const pollConfig = { ...this.defaultConfig, ...config };
    
    const poll = async () => {
      try {
        const data = await CashFlowScenarioService.getScenariosSummary();
        callback(data);
        this.retryCount.set(pollId, 0); // Reset retry count on success
      } catch (error) {
        console.error('Polling error:', error);
        
        const currentRetries = this.retryCount.get(pollId) || 0;
        if (currentRetries < pollConfig.maxRetries) {
          this.retryCount.set(pollId, currentRetries + 1);
          
          // Exponential backoff
          const nextInterval = pollConfig.interval * Math.pow(pollConfig.backoffMultiplier, currentRetries);
          
          setTimeout(() => {
            if (this.intervals.has(pollId)) {
              poll();
            }
          }, nextInterval);
          
          return; // Skip the normal interval
        } else {
          console.error('Max retries reached for polling:', pollId);
          this.stopPolling(pollId);
          return;
        }
      }
    };

    // Initial poll
    poll();
    
    // Set up interval
    const interval = setInterval(poll, pollConfig.interval);
    this.intervals.set(pollId, interval);
    
    return pollId;
  }

  stopPolling(pollId: string): void {
    const interval = this.intervals.get(pollId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(pollId);
      this.retryCount.delete(pollId);
    }
  }

  stopAllPolling(): void {
    this.intervals.forEach((interval, pollId) => {
      this.stopPolling(pollId);
    });
  }
}

export const pollingService = new PollingService();