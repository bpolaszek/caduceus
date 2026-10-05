import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {Mercure, MercureMessageEvent, MercureProtocol, urlPattern} from '../src'
import {MockEventSourceFactory} from './mocks/MockEventSourceFactory'

describe('Mercure', () => {
  let mockEventSourceFactory: MockEventSourceFactory
  let mercure: Mercure
  const hubUrl = 'https://example.com/.well-known/mercure'

  beforeEach(() => {
    mockEventSourceFactory = new MockEventSourceFactory()
    mercure = new Mercure(hubUrl, {
      eventSourceFactory: mockEventSourceFactory,
      lastEventId: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with the provided hub URL', () => {
      const mercure = new Mercure(hubUrl)
      expect(mercure['hub']).toBe(hubUrl)
    })

    it('should initialize with default options if none provided', () => {
      const mercure = new Mercure(hubUrl)
      expect(mercure['options'].lastEventId).toBeNull()
      expect(mercure['options'].eventSourceFactory).toBeDefined()
    })

    it('should initialize with custom options if provided', () => {
      const customLastEventId = 'event-123'
      const mercure = new Mercure(hubUrl, {lastEventId: customLastEventId})
      expect(mercure['lastEventId']).toBe(customLastEventId)
    })
  })

  describe('subscribe', () => {
    it('should add a single topic to subscribedTopics', () => {
      mercure.subscribe('topic1')
      expect(mercure['subscribedTopics']).toEqual(['topic1'])
    })

    it('should add multiple topics to subscribedTopics', () => {
      mercure.subscribe(['topic1', 'topic2'])
      expect(mercure['subscribedTopics']).toEqual(['topic1', 'topic2'])
    })

    it('should replace existing topics when append is false', () => {
      mercure.subscribe('topic1')
      mercure.subscribe('topic2', {append: false})
      expect(mercure['subscribedTopics']).toEqual(['topic2'])
    })

    it('should append topics when append is true', () => {
      mercure.subscribe('topic1')
      mercure.subscribe('topic2', {append: true})
      expect(mercure['subscribedTopics']).toEqual(['topic1', 'topic2'])
    })

    it('should handle the wildcard topic correctly', () => {
      mercure.subscribe(['topic1', '*', 'topic2'])
      expect(mercure['subscribedTopics']).toEqual(['*'])
    })

    it('should deduplicate URL pattern topics', () => {
      mercure.subscribe([urlPattern('/a/:id'), urlPattern('/a/:id'), '/a/:id'])
      expect(mercure['subscribedTopics']).toEqual([urlPattern('/a/:id'), '/a/:id'])
    })

    it('should deduplicate topics', () => {
      mercure.subscribe(['topic1', 'topic1', 'topic2'])
      expect(mercure['subscribedTopics']).toEqual(['topic1', 'topic2'])
    })
  })

  describe('on', () => {
    it('should register an event listener', () => {
      const listener = vi.fn()
      mercure.on('message', listener)
      expect(mercure['listeners'].get('message')).toContain(listener)
    })

    it('should handle multiple listeners for the same event type', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      mercure.on('message', listener1)
      mercure.on('message', listener2)
      expect(mercure['listeners'].get('message')).toHaveLength(2)
      expect(mercure['listeners'].get('message')).toContain(listener1)
      expect(mercure['listeners'].get('message')).toContain(listener2)
    })
  })

  describe('unsubscribe', () => {
    beforeEach(() => {
      mercure.subscribe(['topic1', 'topic2', 'topic3'])
    })

    it('should remove a single topic', () => {
      mercure.unsubscribe('topic1')
      expect(mercure['subscribedTopics']).toEqual(['topic2', 'topic3'])
    })

    it('should remove multiple topics', () => {
      mercure.unsubscribe(['topic1', 'topic3'])
      expect(mercure['subscribedTopics']).toEqual(['topic2'])
    })

    it('should remove a URL pattern topic', () => {
      mercure.subscribe(urlPattern('/a/:id'))
      mercure.unsubscribe(urlPattern('/a/:id'))
      expect(mercure['subscribedTopics']).toEqual(['topic1', 'topic2', 'topic3'])
    })

    it('should call connect after unsubscribing', () => {
      const connectSpy = vi.spyOn(mercure, 'connect')
      mercure.unsubscribe('topic1')
      expect(connectSpy).toHaveBeenCalled()
    })
  })

  describe('connect', () => {
    beforeEach(() => {
      mercure.subscribe('topic1')
    })

    it('should default to the 1.0 protocol', () => {
      expect(mercure['options'].protocol).toBe(MercureProtocol.V1)
    })

    it('should create a new EventSource with the correct 1.0 URL', () => {
      mercure.connect()
      const url = mockEventSourceFactory.lastCreatedEventSource!.url
      expect(url).toContain(hubUrl)
      expect(url).toContain('match=topic1')
      expect(url).not.toContain('topic=')
    })

    it('should send one match parameter per topic in 1.0', () => {
      mercure.subscribe('topic2')
      mercure.connect()
      expect(mockEventSourceFactory.lastCreatedEventSource!.url).toBe(`${hubUrl}?match=topic1&match=topic2`)
    })

    it('should send match=* for the wildcard topic in 1.0', () => {
      mercure.subscribe('*')
      mercure.connect()
      expect(mockEventSourceFactory.lastCreatedEventSource!.url).toBe(`${hubUrl}?match=*`)
    })

    it('should send URL patterns as match_urlpattern in 1.0', () => {
      mercure.subscribe(urlPattern('/books/:id'))
      mercure.connect()
      expect(mockEventSourceFactory.lastCreatedEventSource!.url).toBe(
        `${hubUrl}?match=topic1&match_urlpattern=%2Fbooks%2F%3Aid`
      )
    })

    it('should include last_event_id in the 1.0 URL if provided', () => {
      mercure['lastEventId'] = 'event-123'
      mercure.connect()
      const url = mockEventSourceFactory.lastCreatedEventSource!.url
      expect(url).toContain('last_event_id=event-123')
      expect(url).not.toContain('lastEventID')
    })

    describe('with the legacy protocol', () => {
      beforeEach(() => {
        mercure = new Mercure(hubUrl, {eventSourceFactory: mockEventSourceFactory, protocol: MercureProtocol.LEGACY})
        mercure.subscribe('topic1')
      })

      it('should create a new EventSource with the correct legacy URL', () => {
        mercure.connect()
        const url = mockEventSourceFactory.lastCreatedEventSource!.url
        expect(url).toContain(hubUrl)
        expect(url).toContain('topic=topic1')
        expect(url).not.toContain('match')
      })

      it('should include lastEventID in the URL if provided', () => {
        mercure['lastEventId'] = 'event-123'
        mercure.connect()
        expect(mockEventSourceFactory.lastCreatedEventSource!.url).toContain('lastEventID=event-123')
      })

      it('should refuse URL pattern topics', () => {
        mercure.subscribe(urlPattern('/books/:id'))
        expect(() => mercure.connect()).toThrow('URL pattern topics require the Mercure 1.0 protocol.')
      })
    })

    it('should close the existing EventSource before creating a new one', () => {
      mercure.connect()
      const firstEventSource = mockEventSourceFactory.lastCreatedEventSource
      mercure.subscribe('topic2', {append: true})
      mercure.connect()

      expect(firstEventSource!.isClosed).toBe(true)
      expect(mockEventSourceFactory.lastCreatedEventSource).not.toBe(firstEventSource)
    })

    it('should throw an error if there are no topics to subscribe to', () => {
      mercure['subscribedTopics'] = []
      expect(() => mercure.connect()).toThrow('No topics to subscribe to.')
    })

    it('should return the existing EventSource if topics have not changed', () => {
      const firstEventSource = mercure.connect()
      mercure['subscribedTopics'] = [...mercure['currentlySubscribedTopics']]
      const secondEventSource = mercure.connect()

      expect(secondEventSource).toBe(firstEventSource)
    })

    it('should set currentlySubscribedTopics equal to subscribedTopics after connect', () => {
      mercure.connect()
      expect(mercure['currentlySubscribedTopics']).toEqual(mercure['subscribedTopics'])
    })
  })

  describe('disconnect', () => {
    it('disconnects the event source', () => {
      mercure.subscribe('*')
      mercure.connect()
      mercure.disconnect()
      expect(mercure['eventSource']).toBeNull()
    })
  })

  describe('attachListener', () => {
    it('should attach the listener to the EventSource', () => {
      const listener = vi.fn()
      mercure.subscribe('topic1')
      mercure.on('message', listener)
      mercure.connect()

      const mockEventSource = mockEventSourceFactory.lastCreatedEventSource!
      mockEventSource.dispatchEvent('message', {hello: 'world'})

      expect(listener).toHaveBeenCalled()
    })

    it('should transform raw event into MercureMessageEvent', () => {
      let receivedEvent: MercureMessageEvent | null = null
      const listener = (event: MercureMessageEvent) => {
        receivedEvent = event
      }

      mercure.subscribe('topic1')
      mercure.on('message', listener)
      mercure.connect()

      const mockEventSource = mockEventSourceFactory.lastCreatedEventSource!
      const testData = {hello: 'world'}
      mockEventSource.dispatchEvent('message', testData)

      expect(receivedEvent).not.toBeNull()
      expect(receivedEvent!.type).toBe('message')
      expect(receivedEvent!.json).toBeDefined()

      // Test json() method to ensure it resolves to the correct data
      return receivedEvent!.json().then((data) => {
        expect(data).toEqual(testData)
      })
    })

    it('should update lastEventId from the event', () => {
      const listener = vi.fn()
      mercure.subscribe('topic1')
      mercure.on('message', listener)
      mercure.connect()

      const mockEventSource = mockEventSourceFactory.lastCreatedEventSource!
      mockEventSource.dispatchEvent('message', {hello: 'world'}, 'event-123')

      expect(mercure['lastEventId']).toBe('event-123')
    })

    it('should do nothing if eventSource is null', () => {
      const listener = vi.fn()
      mercure.on('message', listener)

      // Force the eventSource to be null
      mercure['eventSource'] = null
      mercure['attachListener']('message', listener)

      // If we reach here without errors, the test passes
      expect(true).toBe(true)
    })
  })
})
