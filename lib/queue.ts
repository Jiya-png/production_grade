import PQueue from 'p-queue';

// Queue for managing concurrent Groq API calls
// Limit to 2 concurrent requests to avoid overwhelming the API
const analysisQueue = new PQueue({
  concurrency: 2,
  interval: 1000,
  intervalCap: 2, // max 2 requests per second = 120 per minute (respects Groq limit of 30/min per token bucket)
  timeout: 120000, // 2 minute timeout per request
  throwOnTimeout: true
});

const fileQueue = new PQueue({
  concurrency: 3,
  interval: 1000,
  intervalCap: 3,
  timeout: 60000, // 1 minute timeout
  throwOnTimeout: true
});

export async function queueAnalysis<T>(
  fn: () => Promise<T>,
  priority: number = 0
): Promise<T> {
  return analysisQueue.add(fn, { priority }) as Promise<T>;
}

export async function queueFileAnalysis<T>(
  fn: () => Promise<T>,
  priority: number = 0
): Promise<T> {
  return fileQueue.add(fn, { priority }) as Promise<T>;
}

export function getQueueStats() {
  return {
    analysis: {
      pending: analysisQueue.pending,
      size: analysisQueue.size,
      concurrency: analysisQueue.concurrency
    },
    file: {
      pending: fileQueue.pending,
      size: fileQueue.size,
      concurrency: fileQueue.concurrency
    }
  };
}

// Graceful shutdown
export async function drainQueues() {
  await analysisQueue.onIdle();
  await fileQueue.onIdle();
}