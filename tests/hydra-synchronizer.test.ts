import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {HydraSynchronizer} from '../src'
import {MockEventSourceFactory} from './utils/mock-event-source'

describe('HydraSynchronizer', () => {
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
      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
      })

      expect(synchronizer).toBeDefined()
      expect(synchronizer.mercure).toBeDefined()
    })

    it('should use a custom resource listener when provided', () => {
      const customListener = vi.fn()
      const resourceListener = () => customListener

      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
        resourceListener,
      })

      const resource = {'@id': '/api/books/1'}
      synchronizer.sync(resource)

      // Simulate receiving an update for this resource
      const mockSource = mockFactory.lastCreatedSource!
      const update = {'@id': '/api/books/1', title: 'Updated Title'}
      mockSource.simulateMessage(update)

      expect(customListener).toHaveBeenCalledWith(update, expect.any(Object))
    })
  })

  describe('sync', () => {
    it('should subscribe using the resource IRI as topic by default', () => {
      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
      })

      const resource = {'@id': '/api/books/1'}
      synchronizer.sync(resource)

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=%2Fapi%2Fbooks%2F1')
    })

    it('should subscribe using a custom topic when provided', () => {
      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
      })

      const resource = {'@id': '/api/books/1'}
      synchronizer.sync(resource, '/api/books/{id}')

      expect(mockFactory.lastCreatedSource?.url).toContain('topic=%2Fapi%2Fbooks%2F%7Bid%7D')
    })

    it('should not subscribe again to the same resource', () => {
      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
      })

      const resource = {'@id': '/api/books/1'}
      synchronizer.sync(resource)

      const firstSource = mockFactory.lastCreatedSource

      // Try to sync the same resource again
      synchronizer.sync(resource)

      // Should still be using the same EventSource
      expect(mockFactory.lastCreatedSource).toBe(firstSource)
    })

    it('should handle multiple resources with different IRIs', () => {
      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
      })

      const resource1 = {'@id': '/api/books/1'}
      const resource2 = {'@id': '/api/books/2'}

      synchronizer.sync(resource1)
      synchronizer.sync(resource2)

      // Should be subscribed to both topics
      expect(mockFactory.lastCreatedSource?.url).toContain('topic=%2Fapi%2Fbooks%2F1%2C%2Fapi%2Fbooks%2F2')
    })

    it('should use URI template for multiple resources efficiently', () => {
      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
      })

      const resource1 = {'@id': '/api/books/1'}
      const resource2 = {'@id': '/api/books/2'}

      synchronizer.sync(resource1, '/api/books/{id}')
      synchronizer.sync(resource2, '/api/books/{id}')

      // Should be subscribed to the template only once
      expect(mockFactory.lastCreatedSource?.url).toContain('topic=%2Fapi%2Fbooks%2F%7Bid%7D')
      expect(mockFactory.lastCreatedSource?.url.match(/%2Fapi%2Fbooks%2F%7Bid%7D/g)?.length).toBe(1)
    })
  })

  describe('unsync', () => {
    it('should remove the listener for a specific resource', () => {
      // Create resources with properties to track updates
      const resource1 = {'@id': '/api/books/1', title: 'Book 1'}
      const resource2 = {'@id': '/api/books/2', title: 'Book 2'}

      // Create a spy to track when resources are updated
      const handlerSpy = vi.fn()

      // Create a custom resource listener that both updates the resource and calls our spy
      const resourceListener = (resource: any) => (data: any) => {
        handlerSpy(resource['@id'], data)
        Object.assign(resource, data)
      }

      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
        resourceListener,
      })

      // Sync both resources
      synchronizer.sync(resource1)
      synchronizer.sync(resource2)

      // Unsync the first resource
      synchronizer.unsync(resource1)

      // Simulate receiving updates for both resources
      const mockSource = mockFactory.lastCreatedSource!
      const update1 = {'@id': '/api/books/1', title: 'Updated Book 1'}
      const update2 = {'@id': '/api/books/2', title: 'Updated Book 2'}

      // Send update for resource1 (which should be ignored since we unsynced it)
      mockSource.simulateMessage(update1)

      // Send update for resource2 (which should still be handled)
      mockSource.simulateMessage(update2)

      // Verify resource1 was not updated (since it was unsynced)
      expect(resource1.title).toBe('Book 1')

      // Verify resource2 was updated
      expect(resource2.title).toBe('Updated Book 2')

      // Verify the handler was only called once (for resource2)
      expect(handlerSpy).toHaveBeenCalledTimes(1)
      expect(handlerSpy).toHaveBeenCalledWith('/api/books/2', update2)
      expect(handlerSpy).not.toHaveBeenCalledWith('/api/books/1', update1)
    })
  })

  describe('resource updates', () => {
    it('should update the resource object with received data using default listener', () => {
      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
      })

      const resource = {'@id': '/api/books/1', title: 'Original Title', author: 'Original Author'}
      synchronizer.sync(resource)

      // Simulate receiving an update with partial data
      const mockSource = mockFactory.lastCreatedSource!
      const update = {'@id': '/api/books/1', title: 'Updated Title'}
      mockSource.simulateMessage(update)

      // The resource should be updated with the new data while keeping existing properties
      expect(resource.title).toBe('Updated Title')
      expect(resource.author).toBe('Original Author')
    })

    it('should handle complete replacement of resource properties when needed', () => {
      // Create a custom listener that completely replaces the resource
      const replaceResourceListener = (resource: any) => (data: any) => {
        Object.keys(resource).forEach((key) => {
          if (key !== '@id') {
            delete resource[key]
          }
        })
        return Object.assign(resource, data)
      }

      const synchronizer = new HydraSynchronizer(hub, {
        eventSourceFactory: mockFactory,
        resourceListener: replaceResourceListener,
      })

      const resource = {'@id': '/api/books/1', title: 'Original Title', author: 'Original Author', pages: 200}
      synchronizer.sync(resource)

      // Simulate receiving an update with partial data
      const mockSource = mockFactory.lastCreatedSource!
      const update = {'@id': '/api/books/1', title: 'Updated Title'}
      mockSource.simulateMessage(update)

      // The resource should only have the @id and the new properties
      expect(resource.title).toBe('Updated Title')
      expect(resource).not.toHaveProperty('author')
      expect(resource).not.toHaveProperty('pages')
    })
  })
})
