import {EventSourceInterface} from '../../src'

export class MockEventSource implements EventSourceInterface {
  private eventListeners: Map<string, ((event: MessageEvent) => void)[]> = new Map()
  public isClosed = false
  public url: string

  constructor(url: string) {
    this.url = url
  }

  addEventListener(type: string, callback: (event: MessageEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, [])
    }
    this.eventListeners.get(type)!.push(callback)
  }

  close(): void {
    this.isClosed = true
  }

  // Helper method to trigger events for testing
  dispatchEvent(type: string, data: any, lastEventId: string = '1'): void {
    const listeners = this.eventListeners.get(type) || []
    const event = {
      data: JSON.stringify(data),
      lastEventId,
      type,
    } as MessageEvent

    listeners.forEach((listener) => listener(event))
  }
}
