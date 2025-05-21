import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {CookieBasedAuthorization, QueryParamAuthorization} from '../src'

describe('CookieBasedAuthorization', () => {
  let originalEventSource: typeof EventSource
  let mockEventSource: any

  beforeEach(() => {
    originalEventSource = global.EventSource
    mockEventSource = vi.fn()
    global.EventSource = mockEventSource as any
  })

  afterEach(() => {
    global.EventSource = originalEventSource
  })

  it('should create EventSource with withCredentials set to true', () => {
    const factory = new CookieBasedAuthorization()
    const url = 'https://example.com/hub'

    factory.create(url)

    expect(mockEventSource).toHaveBeenCalledWith(url, {withCredentials: true})
  })

  it('should accept URL object as input', () => {
    const factory = new CookieBasedAuthorization()
    const url = new URL('https://example.com/hub')

    factory.create(url)

    expect(mockEventSource).toHaveBeenCalledWith(url.toString(), {withCredentials: true})
  })
})

describe('QueryParamAuthorization', () => {
  let originalEventSource: typeof EventSource
  let mockEventSource: any

  beforeEach(() => {
    originalEventSource = global.EventSource
    mockEventSource = vi.fn()
    global.EventSource = mockEventSource as any
  })

  afterEach(() => {
    global.EventSource = originalEventSource
  })

  it('should add authorization parameter to URL', () => {
    const token = 'test-token'
    const factory = new QueryParamAuthorization(token)
    const url = 'https://example.com/hub'

    factory.create(url)

    const expectedUrl = 'https://example.com/hub?authorization=test-token'
    expect(mockEventSource).toHaveBeenCalledWith(expectedUrl)
  })

  it('should add authorization parameter to existing URL query parameters', () => {
    const token = 'test-token'
    const factory = new QueryParamAuthorization(token)
    const url = 'https://example.com/hub?topic=test'

    factory.create(url)

    const expectedUrl = 'https://example.com/hub?topic=test&authorization=test-token'
    expect(mockEventSource).toHaveBeenCalledWith(expectedUrl)
  })

  it('should accept URL object as input', () => {
    const token = 'test-token'
    const factory = new QueryParamAuthorization(token)
    const url = new URL('https://example.com/hub')

    factory.create(url)

    const expectedUrl = 'https://example.com/hub?authorization=test-token'
    expect(mockEventSource).toHaveBeenCalledWith(expectedUrl)
  })

  it('should accept URL object with existing query parameters', () => {
    const token = 'test-token'
    const factory = new QueryParamAuthorization(token)
    const url = new URL('https://example.com/hub?topic=test')

    factory.create(url)

    const expectedUrl = 'https://example.com/hub?topic=test&authorization=test-token'
    expect(mockEventSource).toHaveBeenCalledWith(expectedUrl)
  })
})
