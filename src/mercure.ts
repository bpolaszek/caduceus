import {spaceship} from './spaceship.ts'

type Topic = string
type RawMessageEvent = MessageEvent
export type MercureMessageEvent = RawMessageEvent & {
  type: string
  json: () => Promise<any>
}
type Listener = (event: MercureMessageEvent) => void

export interface EventSourceInterface {
  addEventListener(type: string, callback: (event: RawMessageEvent) => void): void
  close(): void
}

export type MercureOptions = {
  eventSourceFactory: EventSourceFactory
  lastEventId: string | null
}

export type SubscribeOptions = {
  append: boolean
}

export interface EventSourceFactory {
  create(url: string | URL, options?: any): EventSourceInterface
}

export class DefaultEventSourceFactory implements EventSourceFactory {
  create(url: string | URL): EventSourceInterface {
    return new EventSource(url.toString()) as EventSourceInterface
  }
}

export class CookieBasedAuthorization implements EventSourceFactory {
  create(url: string | URL): EventSourceInterface {
    return new EventSource(url.toString(), {withCredentials: true}) as EventSourceInterface
  }
}

export class QueryParamAuthorization implements EventSourceFactory {
  constructor(private readonly token: string) {}

  create(url: string | URL, options: any = {}): EventSourceInterface {
    const parsedUrl = new URL(url.toString())
    parsedUrl.searchParams.set('authorization', options.token ?? this.token)
    return new EventSource(parsedUrl.toString()) as EventSourceInterface
  }
}

const resolveSubscribedTopics = (topics: Topic[]): Topic[] => {
  if (topics.includes('*')) {
    topics = ['*']
  }
  return [...new Set(topics)]
}

const DEFAULT_MERCURE_OPTIONS: MercureOptions = {
  eventSourceFactory: new DefaultEventSourceFactory(),
  lastEventId: null,
}

export const DEFAULT_SUBSCRIBE_OPTIONS: SubscribeOptions = {
  append: true,
}

export class Mercure {
  private subscribedTopics: Topic[] = []
  private currentlySubscribedTopics: Topic[] = []
  private eventSource: EventSourceInterface | null = null
  private lastEventId: string | null = null
  private readonly options: MercureOptions
  private readonly listeners: Map<string, Listener[]> = new Map()

  constructor(
    private readonly hub: string | URL,
    options: Partial<MercureOptions> = {}
  ) {
    this.options = {...DEFAULT_MERCURE_OPTIONS, ...options} as MercureOptions
    this.lastEventId = this.options.lastEventId
  }

  public subscribe(topic: Topic | Topic[], options: Partial<SubscribeOptions> = {}): void {
    const {append} = {...DEFAULT_SUBSCRIBE_OPTIONS, ...options}
    const topics = Array.isArray(topic) ? topic : [topic]
    this.subscribedTopics = resolveSubscribedTopics(
      append ? [...this.currentlySubscribedTopics, ...this.subscribedTopics, ...topics] : topics
    )
  }

  public on(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
    this.attachListener(type, listener)
  }

  public unsubscribe(topic: Topic | Topic[]): void {
    const topics = Array.isArray(topic) ? topic : [topic]
    const newTopicList = this.subscribedTopics.filter((t) => !topics.includes(t))
    this.subscribedTopics = resolveSubscribedTopics(newTopicList)
    this.connect()
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  public connect(options: any = {}): EventSourceInterface {
    if (
      this.eventSource &&
      this.subscribedTopics.length > 0 &&
      0 === spaceship(this.subscribedTopics, this.currentlySubscribedTopics)
    ) {
      return this.eventSource
    }

    if (this.eventSource) {
      this.eventSource.close()
    }

    if (this.subscribedTopics.length === 0) {
      throw new Error('No topics to subscribe to.')
    }

    const params: Record<string, string> = {topic: this.subscribedTopics.join(',')}
    if (this.lastEventId !== null) {
      params.lastEventID = this.lastEventId
    }

    const url = this.hub + '?' + new URLSearchParams(params)
    this.eventSource = this.options.eventSourceFactory!.create(url, options)
    for (const [type, listeners] of this.listeners.entries()) {
      for (const listener of listeners) {
        this.attachListener(type, listener)
      }
    }
    this.currentlySubscribedTopics = this.subscribedTopics

    return this.eventSource
  }

  public reconnect(options: any = {}) {
    this.disconnect()
    this.connect(options)
  }

  private attachListener(type: string, listener: Listener) {
    if (!this.eventSource) {
      return
    }
    this.eventSource.addEventListener(type, (event: RawMessageEvent) => {
      this.lastEventId = event.lastEventId
      const mercureEvent: MercureMessageEvent = {
        ...event,
        type,
        json: () => new Promise((resolve) => resolve(JSON.parse(event.data))),
      }
      listener(mercureEvent)
    })
  }
}
