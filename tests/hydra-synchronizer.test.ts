import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {HydraSynchronizer, Mercure, MercureMessageEvent} from '../src'

// Mock Mercure class
vi.mock('../src/mercure', () => {
  return {
    Mercure: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      subscribe: vi.fn(),
      connect: vi.fn(),
    })),
  }
})

describe('HydraSynchronizer', () => {
  let synchronizer: HydraSynchronizer
  const hubUrl = 'https://example.com/.well-known/mercure'
  let mockMercure: Mercure

  // Mock API resource
  const mockResource = {
    '@id': '/api/resources/123',
    name: 'Test Resource',
    description: 'A test resource',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Mercure mock implementation
    mockMercure = {
      on: vi.fn(),
      subscribe: vi.fn(),
      connect: vi.fn(),
    } as unknown as Mercure
    ;(Mercure as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockMercure)

    synchronizer = new HydraSynchronizer(hubUrl)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with the provided hub URL', () => {
      expect(Mercure).toHaveBeenCalledWith(hubUrl, expect.any(Object))
    })

    it('should initialize with default options if none provided', () => {
      expect(synchronizer.connection).toBeDefined()
      expect(synchronizer['options'].resourceListener).toBeDefined()
      expect(synchronizer['options'].subscribeOptions).toEqual({append: true})
    })

    it('should initialize with custom options if provided', () => {
      const customResourceListener = vi.fn()
      const customHandler = vi.fn()

      synchronizer = new HydraSynchronizer(hubUrl, {
        resourceListener: customResourceListener,
        handler: customHandler,
      })

      expect(synchronizer['options'].resourceListener).toBe(customResourceListener)
      expect(synchronizer['options'].handler).toBe(customHandler)
      expect(customHandler).toHaveBeenCalledWith(synchronizer.connection, synchronizer['listeners'])
    })

    it('should call the handler with the connection and listeners', () => {
      const handlerMock = vi.fn()
      synchronizer = new HydraSynchronizer(hubUrl, {
        handler: handlerMock,
      })

      expect(handlerMock).toHaveBeenCalledWith(synchronizer.connection, synchronizer['listeners'])
    })
  })

  describe('sync', () => {
    it('should add a listener for the resource', () => {
      synchronizer.sync(mockResource)

      expect(synchronizer['listeners'].has(mockResource['@id'])).toBe(true)
      expect(synchronizer['listeners'].get(mockResource['@id'])).toHaveLength(1)
    })

    it('should use the resource @id as topic if none provided', () => {
      synchronizer.sync(mockResource)

      expect(mockMercure.subscribe).toHaveBeenCalledWith(mockResource['@id'], expect.objectContaining({append: true}))
    })

    it('should use the provided topic if specified', () => {
      const customTopic = '/custom-topic'
      synchronizer.sync(mockResource, customTopic)

      expect(mockMercure.subscribe).toHaveBeenCalledWith(customTopic, expect.any(Object))
    })

    it('should not add listener if resource is already being synced', () => {
      synchronizer.sync(mockResource)
      synchronizer.sync(mockResource)

      // Should still have just one listener
      expect(synchronizer['listeners'].get(mockResource['@id'])).toHaveLength(1)
    })

    it('should call connect on the Mercure connection', () => {
      synchronizer.sync(mockResource)

      expect(mockMercure.connect).toHaveBeenCalled()
    })
  })

  describe('on', () => {
    it('should add a callback to the listeners for the resource', () => {
      const callback = vi.fn()

      // First sync to initialize the listeners
      synchronizer.sync(mockResource)

      // Then add a callback
      synchronizer.on(mockResource, callback)

      expect(synchronizer['listeners'].get(mockResource['@id'])).toHaveLength(2)
      expect(synchronizer['listeners'].get(mockResource['@id'])?.[1]).toBe(callback)
    })

    it('should create listeners array if none exists for the resource', () => {
      const callback = vi.fn()

      // No sync first, directly add a callback
      synchronizer.on(mockResource, callback)

      expect(synchronizer['listeners'].get(mockResource['@id'])).toHaveLength(1)
      expect(synchronizer['listeners'].get(mockResource['@id'])?.[0]).toBe(callback)
    })

    it('should not add duplicate callbacks', () => {
      const callback = vi.fn()

      synchronizer.sync(mockResource)
      synchronizer.on(mockResource, callback)
      synchronizer.on(mockResource, callback)

      // Should have the default listener plus our callback
      expect(synchronizer['listeners'].get(mockResource['@id'])).toHaveLength(2)
    })
  })

  describe('unsync', () => {
    it('should remove all listeners for the resource', () => {
      synchronizer.sync(mockResource)
      synchronizer.on(mockResource, vi.fn())

      synchronizer.unsync(mockResource)

      expect(synchronizer['listeners'].has(mockResource['@id'])).toBe(false)
    })
  })

  describe('default handler behavior', () => {
    it('should distribute messages to the correct listeners', async () => {
      // Create a real instance with the default handler
      synchronizer = new HydraSynchronizer(hubUrl)

      // Mock the connection's on method to capture the message handler
      let capturedMessageHandler: ((event: MercureMessageEvent) => void) | null = null
      synchronizer.connection.on = vi.fn().mockImplementation((event: string, handler: any) => {
        if (event === 'message') {
          capturedMessageHandler = handler
        }
      })

      // Reinstall the handler
      synchronizer['options'].handler(synchronizer.connection, synchronizer['listeners'])

      // Should have registered a message handler
      expect(synchronizer.connection.on).toHaveBeenCalledWith('message', expect.any(Function))
      expect(capturedMessageHandler).not.toBeNull()

      // Setup a resource with listeners
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      synchronizer.sync(mockResource)
      synchronizer.on(mockResource, callback1)
      synchronizer.on(mockResource, callback2)

      // Create a mock event with data matching the resource ID
      const mockEvent: Partial<MercureMessageEvent> = {
        json: vi.fn().mockResolvedValue({
          '@id': mockResource['@id'],
          name: 'Updated Resource',
        }),
      }

      // Trigger the handler
      await capturedMessageHandler!(mockEvent as MercureMessageEvent)

      // Verify all callbacks were called with the data
      expect(callback1).toHaveBeenCalledWith(
        expect.objectContaining({
          '@id': mockResource['@id'],
          name: 'Updated Resource',
        }),
        mockEvent
      )
      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({
          '@id': mockResource['@id'],
          name: 'Updated Resource',
        }),
        mockEvent
      )
    })
  })
})
