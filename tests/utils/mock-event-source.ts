import {EventSourceInterface, EventSourceFactory, MercureMessageEvent} from '../../src'

/**
 * Mock implementation of EventSourceInterface for testing
 */
export class MockEventSource implements EventSourceInterface {
  private listeners: Map<string, Array<(event: MercureMessageEvent) => void>> = new Map()
  url: string
  isClosed: boolean = false

  constructor(url: string) {
    this.url = url
  }

  addEventListener(type: string, callback: (event: MercureMessageEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(callback)
  }

  close(): void {
    this.isClosed = true
    this.listeners.clear()
  }

  /**
   * Helper method to simulate receiving a message
   */
  simulateMessage(data: any, lastEventId: string = '1', type: string = 'message'): void {
    const listeners = this.listeners.get(type) || []

    if (listeners.length > 0) {
      const messageEvent = {
        data: JSON.stringify(data),
        lastEventId,
      } as MercureMessageEvent

      listeners.forEach((listener) => listener(messageEvent))
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
