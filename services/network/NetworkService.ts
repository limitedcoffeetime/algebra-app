import { SyncConfig } from '../config/SyncConfig';

export interface LatestInfo {
  batchId: string;
  url: string;
  hash: string;
  generatedAt: string;
  problemCount: number;
}

export interface ProblemBatchData {
  id: string;
  generationDate: string;
  problemCount: number;
  problems: any[];
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public operation?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class NetworkService {
  constructor(private config: SyncConfig) {}

  async fetchLatestInfo(): Promise<LatestInfo> {
    try {
      // Perform HEAD request first to check availability
      const headResponse = await this.fetchWithTimeout(this.config.latestUrl, {
        method: 'HEAD',
        cache: 'no-cache' as RequestCache,
      });

      if (!headResponse.ok) {
        throw new NetworkError(
          `Failed to check latest info availability: ${headResponse.status}`,
          headResponse.status,
          'HEAD_LATEST'
        );
      }

      // Get the actual content
      const getResponse = await this.fetchWithTimeout(this.config.latestUrl, {
        cache: 'no-cache' as RequestCache,
      });

      if (!getResponse.ok) {
        throw new NetworkError(
          `Failed to fetch latest info: ${getResponse.status}`,
          getResponse.status,
          'GET_LATEST'
        );
      }

      const latestInfo: LatestInfo = await getResponse.json();
      this.validateLatestInfo(latestInfo);
      
      return latestInfo;
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Network error while fetching latest info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'FETCH_LATEST'
      );
    }
  }

  async downloadBatch(url: string): Promise<ProblemBatchData> {
    try {
      const response = await this.fetchWithTimeout(url);
      
      if (!response.ok) {
        throw new NetworkError(
          `Failed to download batch: ${response.status}`,
          response.status,
          'DOWNLOAD_BATCH'
        );
      }

      const batchData: ProblemBatchData = await response.json();
      this.validateBatchData(batchData);
      
      return batchData;
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Network error while downloading batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'DOWNLOAD_BATCH'
      );
    }
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private validateLatestInfo(latestInfo: any): asserts latestInfo is LatestInfo {
    if (!latestInfo || typeof latestInfo !== 'object') {
      throw new NetworkError('Invalid latest info format: not an object', undefined, 'VALIDATE_LATEST');
    }

    const requiredFields = ['batchId', 'url', 'hash', 'generatedAt', 'problemCount'];
    for (const field of requiredFields) {
      if (!(field in latestInfo)) {
        throw new NetworkError(
          `Invalid latest info format: missing field ${field}`,
          undefined,
          'VALIDATE_LATEST'
        );
      }
    }
  }

  private validateBatchData(batchData: any): asserts batchData is ProblemBatchData {
    if (!batchData || typeof batchData !== 'object') {
      throw new NetworkError('Invalid batch data format: not an object', undefined, 'VALIDATE_BATCH');
    }

    if (!batchData.problems || !Array.isArray(batchData.problems)) {
      throw new NetworkError('Invalid batch data format: problems field is not an array', undefined, 'VALIDATE_BATCH');
    }

    const requiredFields = ['id', 'generationDate', 'problemCount'];
    for (const field of requiredFields) {
      if (!(field in batchData)) {
        throw new NetworkError(
          `Invalid batch data format: missing field ${field}`,
          undefined,
          'VALIDATE_BATCH'
        );
      }
    }
  }
}