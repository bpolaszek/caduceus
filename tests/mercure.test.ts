import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {Mercure, EventSourceInterface, EventSourceFactory, MercureMessageEvent} from '../src'

// Mock EventSource implementation for testing
class MockEventSource implements EventSourceInterface {
  onmessage: ((event: MercureMessageEvent) => void) | null = null
  url: string
  isClosed: boolean = false

  constructor(url: string) {
    this.url = url
  }

  close(): void {
    this.isClosed = true
  }

  // Helper method to simulate receiving a message
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

class MockEventSourceFactory implements EventSourceFactory {
  lastCreatedSource: MockEventSource | null = null

  create(url: string | URL): EventSourceInterface {
    this.lastCreatedSource = new MockEventSource(url.toString())
    return this.lastCreatedSource
  }
}

describe('Mercure', () => {
  let mockFactory: MockEventSourceFactory
  let hub: string

  beforeEach(() => {
    mockFactory = new MockEventSourceFactory()
    hub = 'https://example.com/hub'

    // Mock console.error to avoid polluting test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      expect(mercure).toBeDefined()
    })

    it('should use the provided event source factory', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic')

      expect(mockFactory.lastCreatedSource).not.toBeNull()
      expect(mockFactory.lastCreatedSource?.url).toContain(hub)
      expect(mockFactory.lastCreatedSource?.url).toContain('topics=topic')
    })
  })

  describe('subscribe', () => {
    it('should subscribe to a single topic', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=topic1')
    })

    it('should subscribe to multiple topics', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', 'topic2'])

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=topic1%2Ctopic2')
    })

    it('should append topics when append is true', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')
      mercure.subscribe('topic2', true)

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=topic1%2Ctopic2')
    })

    it('should replace topics when append is false', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')
      mercure.subscribe('topic2', false)

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=topic2')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic1')
    })

    it('should handle wildcard topic', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('*')

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=*')
    })

    it('should optimize to wildcard when subscribing to * along with other topics', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', '*', 'topic2'])

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=*')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic1')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic2')
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe from a topic', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', 'topic2'])
      mercure.unsubscribe('topic1')

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=topic2')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic1')
    })

    it('should unsubscribe from multiple topics', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', 'topic2', 'topic3'])
      mercure.unsubscribe(['topic1', 'topic3'])

      expect(mockFactory.lastCreatedSource?.url).toContain('topics=topic2')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic1')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic3')
    })

    it('should close the existing EventSource when unsubscribing from all topics', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')
      const eventSource = mockFactory.lastCreatedSource

      mercure.unsubscribe('topic1')

      expect(eventSource?.isClosed).toBe(true)
    })
  })

  describe('event handling', () => {
    it('should call the handler when a message is received', () => {
      const handler = vi.fn()
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
        handler,
      })

      mercure.subscribe('topic')

      const mockSource = mockFactory.lastCreatedSource!
      const testData = {foo: 'bar'}
      mockSource.simulateMessage(testData)

      expect(handler).toHaveBeenCalledWith(testData, expect.any(Object))
    })

    it('should update lastEventId when a message is received', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic')

      const mockSource = mockFactory.lastCreatedSource!
      mockSource.simulateMessage({foo: 'bar'}, 'event-123')

      // Force a reconnection to see if lastEventId is used
      mercure.subscribe('topic2', true)

      expect(mockFactory.lastCreatedSource?.url).toContain('lastEventID=event-123')
    })
  })

  describe('connection management', () => {
    it('should not create a new connection if topics remain the same', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', 'topic2'])
      const firstSource = mockFactory.lastCreatedSource

      // Subscribe to the same topics in different order
      mercure.subscribe(['topic2', 'topic1'])

      expect(mockFactory.lastCreatedSource).toBe(firstSource)
      expect(firstSource?.isClosed).toBe(false)
    })

    it('should close previous connection when creating a new one', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')
      const firstSource = mockFactory.lastCreatedSource

      mercure.subscribe('topic2', false) // Replace instead of append

      expect(firstSource?.isClosed).toBe(true)
      expect(mockFactory.lastCreatedSource).not.toBe(firstSource)
    })
  })
})
