import * as pLimit from 'p-limit'

const CONCURRENCY = 5
const ONE_MINUTE = 60 * 1000

export const limit = pLimit(CONCURRENCY)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface RequestLimitOptions {
  requestsPerMinuteLimit?: number
  tokensPerMinuteLimit?: number
  tokenCount?: number
}

interface TokenEvent {
  timestamp: number
  count: number
}

class RequestRateLimiter {
  private requestTimestamps: number[] = []
  private tokenEvents: TokenEvent[] = []
  private queue: Promise<void> = Promise.resolve()

  wait(options: RequestLimitOptions): Promise<void> {
    const { requestsPerMinuteLimit, tokensPerMinuteLimit } = options

    if (requestsPerMinuteLimit === undefined && tokensPerMinuteLimit === undefined) {
      return Promise.resolve()
    }

    const scheduled = this.queue.then(() => this.waitForSlot(options))
    this.queue = scheduled.catch(() => undefined)
    return scheduled
  }

  private async waitForSlot(options: RequestLimitOptions): Promise<void> {
    const { requestsPerMinuteLimit, tokensPerMinuteLimit, tokenCount = 0 } = options

    if (tokensPerMinuteLimit !== undefined && tokenCount > tokensPerMinuteLimit) {
      throw new Error('Request token count exceeds `tokensPerMinuteLimit`')
    }

    let isScheduled = false
    while (!isScheduled) {
      const now = Date.now()
      this.requestTimestamps = this.requestTimestamps.filter((timestamp) => now - timestamp < ONE_MINUTE)
      this.tokenEvents = this.tokenEvents.filter(({ timestamp }) => now - timestamp < ONE_MINUTE)

      const requestSlotAvailable =
        requestsPerMinuteLimit === undefined || this.requestTimestamps.length < requestsPerMinuteLimit
      const tokenSlotAvailable =
        tokensPerMinuteLimit === undefined ||
        this.tokenEvents.reduce((total, event) => total + event.count, 0) + tokenCount <= tokensPerMinuteLimit

      if (requestSlotAvailable && tokenSlotAvailable) {
        this.requestTimestamps.push(now)
        if (tokensPerMinuteLimit !== undefined) {
          this.tokenEvents.push({ timestamp: now, count: tokenCount })
        }
        isScheduled = true
        continue
      }

      await sleep(this.getWaitTime(now, requestsPerMinuteLimit, tokensPerMinuteLimit, tokenCount))
    }
  }

  private getWaitTime(
    now: number,
    requestsPerMinuteLimit?: number,
    tokensPerMinuteLimit?: number,
    tokenCount = 0,
  ): number {
    const waitTimes: number[] = []

    if (requestsPerMinuteLimit !== undefined && this.requestTimestamps.length >= requestsPerMinuteLimit) {
      waitTimes.push(ONE_MINUTE - (now - this.requestTimestamps[0]))
    }

    if (tokensPerMinuteLimit !== undefined) {
      let tokenTotal = this.tokenEvents.reduce((total, event) => total + event.count, 0)
      for (const event of this.tokenEvents) {
        if (tokenTotal + tokenCount <= tokensPerMinuteLimit) {
          break
        }
        waitTimes.push(ONE_MINUTE - (now - event.timestamp))
        tokenTotal -= event.count
      }
    }

    return Math.max(0, Math.min(...waitTimes))
  }
}

const requestRateLimiter = new RequestRateLimiter()

export const requestRateLimit = (options: RequestLimitOptions): Promise<void> => requestRateLimiter.wait(options)
