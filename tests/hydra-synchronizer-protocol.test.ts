import {describe, expect, it} from 'vitest'
import {HydraSynchronizer, MercureProtocol, urlPattern} from '../src'
import {MockEventSourceFactory} from './mocks/MockEventSourceFactory'

describe('HydraSynchronizer protocol', () => {
  const hubUrl = 'https://example.com/.well-known/mercure'
  const resource = {'@id': '/api/books/1', title: 'The Great Gatsby'}

  it('should subscribe to URL patterns with the 1.0 protocol', () => {
    const factory = new MockEventSourceFactory()
    const synchronizer = new HydraSynchronizer(hubUrl, {eventSourceFactory: factory})
    synchronizer.sync(resource, urlPattern('/api/books/:id'))
    expect(factory.lastCreatedEventSource!.url).toBe(`${hubUrl}?match_urlpattern=%2Fapi%2Fbooks%2F%3Aid`)
  })

  it('should not register the resource when the topic is refused by the legacy protocol', () => {
    const factory = new MockEventSourceFactory()
    const synchronizer = new HydraSynchronizer(hubUrl, {
      eventSourceFactory: factory,
      protocol: MercureProtocol.LEGACY,
    })
    expect(() => synchronizer.sync(resource, urlPattern('/api/books/:id'))).toThrow()

    synchronizer.sync(resource, '/api/books/{id}')
    expect(factory.lastCreatedEventSource!.url).toBe(`${hubUrl}?topic=%2Fapi%2Fbooks%2F%7Bid%7D`)
  })
})
