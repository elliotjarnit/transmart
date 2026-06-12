import * as pLimit from 'p-limit'

const CONCURRENCY = 5
const ONE_MINUTE = 60 * 1000

export const limit = pLimit(CONCURRENCY)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

class RequestRateLimiter {
  private timestamps: number[] = []
  private queue: Promise<void> = Promise.resolve()

  wait(requestsPerMinuteLimit?: number): Promise<void> {
    if (requestsPerMinuteLimit === undefined) {
      return Promise.resolve()
    }

    const scheduled = this.queue.then(() => this.waitForSlot(requestsPerMinuteLimit))
    this.queue = scheduled.catch(() => undefined)
    return scheduled
  }

  private async waitForSlot(requestsPerMinuteLimit: number): Promise<void> {
    let isScheduled = false
    while (!isScheduled) {
      const now = Date.now()
      this.timestamps = this.timestamps.filter((timestamp) => now - timestamp < ONE_MINUTE)

      if (this.timestamps.length < requestsPerMinuteLimit) {
        this.timestamps.push(now)
        isScheduled = true
        continue
      }

      const oldestTimestamp = this.timestamps[0]
      await sleep(ONE_MINUTE - (now - oldestTimestamp))
    }
  }
}

const requestRateLimiter = new RequestRateLimiter()

export const requestRateLimit = (requestsPerMinuteLimit?: number): Promise<void> =>
  requestRateLimiter.wait(requestsPerMinuteLimit)
