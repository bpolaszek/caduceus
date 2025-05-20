import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {Mercure, DEFAULT_SUBSCRIBE_OPTIONS} from '../src'
import {MockEventSourceFactory} from './utils/mock-event-source'

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
      expect(mockFactory.lastCreatedSource?.url).toContain('topic=topic')
    })
  })

  describe('subscribe', () => {
    it('should subscribe to a single topic', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=topic1')
    })

    it('should subscribe to multiple topics', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', 'topic2'])

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=topic1%2Ctopic2')
    })

    it('should append topics when append is true', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')
      mercure.subscribe('topic2', {append: true})

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=topic1%2Ctopic2')
    })

    it('should replace topics when append is false', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('topic1')
      mercure.subscribe('topic2', {append: false})

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=topic2')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic1')
    })

    it('should handle wildcard topic', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe('*')

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=*')
    })

    it('should optimize to wildcard when subscribing to * along with other topics', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', '*', 'topic2'])

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=*')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic1')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic2')
    })

    it('should listen to multiple event types when specified', () => {
      const handler = vi.fn()
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
        handler,
      })

      mercure.subscribe('topic', {types: ['message', 'update', 'delete']})

      const mockSource = mockFactory.lastCreatedSource!

      // Simulate messages of different types
      const testData1 = {foo: 'bar', action: 'create'}
      mockSource.simulateMessage(testData1, '1', 'message')

      const testData2 = {foo: 'updated', action: 'update'}
      mockSource.simulateMessage(testData2, '2', 'update')

      const testData3 = {id: '123', action: 'delete'}
      mockSource.simulateMessage(testData3, '3', 'delete')

      // Handler should be called for all three event types
      expect(handler).toHaveBeenCalledTimes(3)
      expect(handler).toHaveBeenCalledWith(testData1, expect.any(Object))
      expect(handler).toHaveBeenCalledWith(testData2, expect.any(Object))
      expect(handler).toHaveBeenCalledWith(testData3, expect.any(Object))
    })

    it('should use default message type when types not specified', () => {
      const handler = vi.fn()
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
        handler,
      })

      mercure.subscribe('topic') // Default types: ['message']

      const mockSource = mockFactory.lastCreatedSource!

      // Simulate message of default type
      const testData = {foo: 'bar'}
      mockSource.simulateMessage(testData)

      // Simulate message of another type (should not trigger handler)
      const ignoredData = {foo: 'ignored'}
      mockSource.simulateMessage(ignoredData, '2', 'custom-type')

      // Handler should only be called once for the 'message' type
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(testData, expect.any(Object))
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe from a topic', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', 'topic2'])
      mercure.unsubscribe('topic1')

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=topic2')
      expect(mockFactory.lastCreatedSource?.url).not.toContain('topic1')
    })

    it('should unsubscribe from multiple topics', () => {
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
      })

      mercure.subscribe(['topic1', 'topic2', 'topic3'])
      mercure.unsubscribe(['topic1', 'topic3'])

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=topic2')
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
      mercure.subscribe('topic2', {append: true})

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

      mercure.subscribe('topic2', {append: false}) // Replace instead of append

      expect(firstSource?.isClosed).toBe(true)
      expect(mockFactory.lastCreatedSource).not.toBe(firstSource)
    })

    it('should use the default subscribe options when not provided', () => {
      const handler = vi.fn()
      const mercure = new Mercure(hub, {
        eventSourceFactory: mockFactory,
        handler,
      })

      mercure.subscribe('topic')

      const mockSource = mockFactory.lastCreatedSource!

      // Should have default options with 'message' type
      mockSource.simulateMessage({test: 'data'})
      expect(handler).toHaveBeenCalledTimes(1)

      // Other types should not trigger the handler
      mockSource.simulateMessage({ignored: true}, '2', 'custom')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })
})
