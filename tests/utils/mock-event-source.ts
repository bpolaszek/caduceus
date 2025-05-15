import {EventSourceInterface, EventSourceFactory, MercureMessageEvent} from '../../src'

/**
 * Mock implementation of EventSourceInterface for testing
 */
export class MockEventSource implements EventSourceInterface {
  onmessage: ((event: MercureMessageEvent) => void) | null = null
  url: string
  isClosed: boolean = false

  constructor(url: string) {
    this.url = url
  }

  close(): void {
    this.isClosed = true
  }

  /**
   * Helper method to simulate receiving a message
   */
  simulateMessage(data: any, lastEventId: string = '1'): void {
    if (this.onmessage) {
      const messageEvent = {
        data: JSON.stringify(data),
        lastEventId,
      } as MercureMessageEvent

      this.onmessage(messageEvent)
    }
  }
}

/**
 * Factory for creating MockEventSource instances
 */
export class MockEventSourceFactory implements EventSourceFactory {
  lastCreatedSource: MockEventSource | null = null

  create(url: string | URL): EventSourceInterface {
    this.lastCreatedSource = new MockEventSource(url.toString())
    return this.lastCreatedSource
  }
}
