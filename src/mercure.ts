import {spaceship} from './spaceship.ts'

type Topic = string
type Listener = (data: any, event: MercureMessageEvent) => void

export type MercureMessageEvent = Pick<MessageEvent, 'data' | 'lastEventId'>
export interface EventSourceInterface {
  addEventListener(type: string, callback: (event: MercureMessageEvent) => void): void
  close(): void
}

export interface EventSourceFactory {
  create(url: string | URL): EventSourceInterface
}

export class DefaultEventSourceFactory implements EventSourceFactory {
  create(url: string | URL): EventSourceInterface {
    return new EventSource(url.toString(), {withCredentials: true}) as EventSourceInterface
  }
}

const resolveSubscribedTopics = (topics: Topic[]): Topic[] => {
  if (topics.includes('*')) {
    topics = ['*']
  }
  return [...new Set(topics)]
}

export type MercureOptions = {
  handler: Listener
  eventSourceFactory?: EventSourceFactory
}

const DEFAULT_MERCURE_OPTIONS: MercureOptions = {
  handler: () => {},
  eventSourceFactory: new DefaultEventSourceFactory(),
}

export type SubscribeOptions = {
  append: boolean
  types: string[]
}

export const DEFAULT_SUBSCRIBE_OPTIONS: SubscribeOptions = {
  append: true,
  types: ['message'],
}

export class Mercure {
  private subscribedTopics: Topic[] = []
  private eventSource: EventSourceInterface | null = null
  private lastEventId: string | null = null
  private readonly options: MercureOptions

  constructor(
    private readonly hub: string | URL,
    options: Partial<MercureOptions> = {}
  ) {
    this.options = {...DEFAULT_MERCURE_OPTIONS, ...options}
  }

  subscribe(topic: Topic | Topic[], options: Partial<SubscribeOptions> = {}): void {
    const {append, types} = {...DEFAULT_SUBSCRIBE_OPTIONS, ...options}
    const topics = Array.isArray(topic) ? topic : [topic]
    this.eventSource = this.connect(topics, !append)
    const {handler: handle} = this.options

    const messageHandler = (event: MercureMessageEvent) => {
      this.lastEventId = event.lastEventId
      const data = JSON.parse(event.data)
      handle(data, event)
    }

    // Remove existing event listeners by closing and recreating the connection
    if (types && types.length > 0) {
      for (const type of types) {
        this.eventSource.addEventListener(type, messageHandler)
      }
    }
  }

  unsubscribe(topic: Topic | Topic[]): void {
    const topics = Array.isArray(topic) ? topic : [topic]
    const newTopicList = this.subscribedTopics.filter((t) => !topics.includes(t))
    this.connect(newTopicList, true)
  }

  private connect(topics: Topic[], clearSubscribedTopics: boolean): EventSourceInterface {
    const resolvedSubscribedTopics = clearSubscribedTopics ? [] : resolveSubscribedTopics(this.subscribedTopics)
    const resolvedTopics = resolveSubscribedTopics(topics)
    const mergedTopics = resolveSubscribedTopics([...resolvedSubscribedTopics, ...resolvedTopics])

    if (this.eventSource && mergedTopics.length > 0 && 0 === spaceship(resolvedSubscribedTopics, mergedTopics)) {
      return this.eventSource
    }

    if (this.eventSource) {
      this.eventSource.close()

      if (mergedTopics.length === 0) {
        return this.eventSource
      }
    }

    const params: Record<string, string> = {topic: mergedTopics.join(',')}
    if (this.lastEventId !== null) {
      params.lastEventID = this.lastEventId
    }

    const url = this.hub + '?' + new URLSearchParams(params)
    this.eventSource = this.options.eventSourceFactory!.create(url)
    this.subscribedTopics = mergedTopics

    return this.eventSource
  }
}
