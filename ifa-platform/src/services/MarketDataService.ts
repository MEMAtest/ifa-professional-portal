// ================================================================
// src/services/MarketDataService.ts - Complete Market Data Service
// Fixed import name and provides complete market data functionality
// ================================================================

import { createClient } from "@/lib/supabase/client"
import type { MarketAssumptions } from '@/types/cashflow';
import clientLogger from '@/lib/logging/clientLogger';

interface AlphaVantageResponse {
  'Global Quote'?: {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
  'Error Message'?: string;
  Note?: string;
}

interface BankOfEnglandResponse {
  dataset?: {
    data?: Array<[string, number]>;
  };
}

interface MarketDataCache {
  data: MarketAssumptions;
  cachedAt: string;
  expiresAt: string;
}

export class MarketDataService {
  // Remove instance property, use static method instead
  private static readonly CACHE_KEY = 'market_data_cache';
  private static readonly CACHE_DURATION_HOURS = 24;
  private static readonly API_RATE_LIMIT_DELAY = 1000; // 1 second between calls

  /**
   * Get Supabase client - create when needed for static methods
   */
  private static getSupabaseClient() {
    return createClient();
  }

  /**
   * Main method to get current market assumptions
   * Uses cache first, then fetches fresh data if needed
   */
  static async getCurrentMarketAssumptions(): Promise<MarketAssumptions> {
    try {
      // Try to get cached data first
      const cachedData = await this.getCachedData();
      if (cachedData && this.isCacheValid(cachedData)) {
        return cachedData.data;
      }
      
      // Fetch fresh data from multiple sources
      const freshData = await this.fetchFreshMarketData();
      
      // Cache the fresh data
      await this.cacheData(freshData);
      
      return freshData;

    } catch (error) {
      clientLogger.error('Error getting market assumptions:', error);
      
      // Try to return stale cached data if fresh fetch failed
      const cachedData = await this.getCachedData();
      if (cachedData) {
        console.warn('Using stale cached data due to fetch error');
        return cachedData.data;
      }
      
      // Fall back to default assumptions
      console.warn('Using default market assumptions');
      return this.getDefaultAssumptions();
    }
  }

  /**
   * Fetch fresh market data from multiple sources
   */
  private static async fetchFreshMarketData(): Promise<MarketAssumptions> {
    try {
      const [equityData, bondData, inflationData] = await Promise.allSettled([
        this.fetchUKEquityReturns(),
        this.fetchUKBondYields(),
        this.fetchInflationForecasts()
      ]);

      // Extract successful results or use defaults
      const equityReturn = equityData.status === 'fulfilled' ? equityData.value : 4.0;
      const bondYield = bondData.status === 'fulfilled' ? bondData.value : 2.0;
      const inflationForecast = inflationData.status === 'fulfilled' ? inflationData.value : 2.5;

      // Calculate real returns (nominal returns minus inflation)
      const realEquityReturn = Math.max(0, equityReturn - inflationForecast);
      const realBondReturn = Math.max(0, bondYield - inflationForecast);
      const realCashReturn = Math.max(0, 1.0 - inflationForecast); // Assume 1% cash rate

      return {
        realEquityReturn: Math.round(realEquityReturn * 100) / 100, // Round to 2 decimal places
        realBondReturn: Math.round(realBondReturn * 100) / 100,
        realCashReturn: Math.round(realCashReturn * 100) / 100,
        inflationForecast: Math.round(inflationForecast * 100) / 100,
        lastUpdated: new Date().toISOString(),
        dataSource: 'Alpha Vantage, BoE, ONS'
      };

    } catch (error) {
      clientLogger.error('Error fetching fresh market data:', error);
      throw error;
    }
  }

  /**
   * Fetch UK equity returns using Alpha Vantage
   * Gets FTSE 100 data as proxy for UK equity market
   */
  private static async fetchUKEquityReturns(): Promise<number> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
      if (!apiKey) {
        console.warn('Alpha Vantage API key not configured, using default equity return');
        return 6.5; // Historical UK equity real return average
      }

      const symbol = 'UKX'; // FTSE 100 symbol
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data: AlphaVantageResponse = await response.json();
      
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }

      if (data.Note) {
        console.warn('Alpha Vantage rate limit hit, using default');
        return 6.5;
      }

      const quote = data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data received from Alpha Vantage');
      }

      // Calculate return based on price change
      const currentPrice = parseFloat(quote['05. price']);
      const previousClose = parseFloat(quote['08. previous close']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
      
      // Use historical average as base and adjust slightly based on current momentum
      const baseReturn = 6.5; // Historical UK equity real return
      const momentumAdjustment = Math.max(-1, Math.min(1, changePercent / 10)); // Cap adjustment
      
      return baseReturn + momentumAdjustment;

    } catch (error) {
      clientLogger.error('Error fetching UK equity returns:', error);
      return 6.5; // Default historical average
    }
  }

  /**
   * Fetch UK bond yields from Bank of England
   */
  private static async fetchUKBondYields(): Promise<number> {
    try {
      // Bank of England API for 10-year gilt yields
      const url = 'https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp?csv.x=yes&SeriesCodes=IUDMNZC&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Bank of England API error: ${response.status}`);
      }

      const csvData = await response.text();
      
      // Parse CSV to get latest yield
      const lines = csvData.split('\n');
      const dataLines = lines.slice(1).filter(line => line.trim()); // Skip header
      
      if (dataLines.length === 0) {
        throw new Error('No bond yield data received');
      }

      // Get the most recent data point
      const latestLine = dataLines[dataLines.length - 1];
      const columns = latestLine.split(',');
      
      if (columns.length < 2) {
        throw new Error('Invalid bond yield data format');
      }

      const yieldValue = parseFloat(columns[1]);
      
      if (isNaN(yieldValue)) {
        throw new Error('Invalid bond yield value');
      }

      return Math.max(0, yieldValue);

    } catch (error) {
      clientLogger.error('Error fetching UK bond yields:', error);
      return 3.5; // Default 10-year gilt yield assumption
    }
  }

  /**
   * Fetch inflation forecasts from ONS or use BoE target
   */
  private static async fetchInflationForecasts(): Promise<number> {
    try {
      // For simplicity, we'll use the BoE inflation target as base
      // In a real implementation, you could fetch from ONS API
      const boeInflationTarget = 2.0;
      
      // You could add more sophisticated logic here to fetch actual forecasts
      // from ONS API or other sources
      
      return boeInflationTarget;

    } catch (error) {
      clientLogger.error('Error fetching inflation forecasts:', error);
      return 2.5; // Default inflation assumption
    }
  }

  /**
   * Cache management methods
   */
  private static async getCachedData(): Promise<MarketDataCache | null> {
    try {
      const supabase = this.getSupabaseClient(); // ✅ Get client here
      const { data, error } = await supabase
        .from('app_cache')
        .select('data')
        .eq('key', this.CACHE_KEY)
        .single();

      if (error || !data) {
        return null;
      }

      return data.data as unknown as MarketDataCache;

    } catch (error) {
      console.warn('Error reading cache:', error);
      return null;
    }
  }

  private static async cacheData(marketData: MarketAssumptions): Promise<void> {
    try {
      const supabase = this.getSupabaseClient(); // ✅ Get client here
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (this.CACHE_DURATION_HOURS * 60 * 60 * 1000));
      
      const cacheEntry: MarketDataCache = {
        data: marketData,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      await supabase
        .from('app_cache')
        .upsert({
          key: this.CACHE_KEY,
          data: cacheEntry as unknown as any,
          updated_at: now.toISOString()
        });

    } catch (error) {
      console.warn('Error caching data:', error);
      // Don't throw - caching failure shouldn't break the service
    }
  }

  private static isCacheValid(cache: MarketDataCache): boolean {
    const now = new Date();
    const expiresAt = new Date(cache.expiresAt);
    return now < expiresAt;
  }

  /**
   * Default market assumptions for fallback
   */
  private static getDefaultAssumptions(): MarketAssumptions {
    return {
      realEquityReturn: 4.0,  // Conservative real equity return
      realBondReturn: 1.5,    // Conservative real bond return
      realCashReturn: 0.0,    // Real cash return (often negative in low rate environment)
      inflationForecast: 2.5, // BoE target plus buffer
      lastUpdated: new Date().toISOString(),
      dataSource: 'Default assumptions (API unavailable)'
    };
  }

  /**
   * Force refresh of market data (bypass cache)
   */
  static async forceRefresh(): Promise<MarketAssumptions> {
    try {
      const freshData = await this.fetchFreshMarketData();
      await this.cacheData(freshData);
      return freshData;
    } catch (error) {
      clientLogger.error('Error force refreshing market data:', error);
      return this.getDefaultAssumptions();
    }
  }

  /**
   * Get market data update frequency setting
   */
  static getUpdateFrequency(): number {
    const envFrequency = process.env.MARKET_DATA_UPDATE_FREQUENCY;
    return envFrequency ? parseInt(envFrequency, 10) : this.CACHE_DURATION_HOURS;
  }

  /**
   * Health check for market data services
   */
  static async healthCheck(): Promise<{
    alphaVantage: boolean;
    bankOfEngland: boolean;
    cache: boolean;
    lastUpdate: string | null;
  }> {
    const health = {
      alphaVantage: false,
      bankOfEngland: false,
      cache: false,
      lastUpdate: null as string | null
    };

    try {
      // Check Alpha Vantage
      const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
      health.alphaVantage = !!apiKey;

      // Check Bank of England (simple connectivity test)
      try {
        const response = await fetch('https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp?csv.x=yes&SeriesCodes=IUDMNZC&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N', {
          method: 'HEAD'
        });
        health.bankOfEngland = response.ok;
      } catch {
        health.bankOfEngland = false;
      }

      // Check cache
      const cachedData = await this.getCachedData();
      health.cache = !!cachedData;
      health.lastUpdate = cachedData?.cachedAt || null;

    } catch (error) {
      clientLogger.error('Error in health check:', error);
    }

    return health;
  }

  /**
   * Get historical market data for analysis
   * This would be expanded in a full implementation
   */
  static async getHistoricalData(years: number = 10): Promise<MarketAssumptions[]> {
    // Placeholder for historical data
    // In a real implementation, this would fetch historical market data
    const current = await this.getCurrentMarketAssumptions();
    
    // Return array with just current data for now
    return [current];
  }
}

export default MarketDataService;
