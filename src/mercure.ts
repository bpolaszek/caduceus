import {spaceship} from './spaceship.ts'

type Topic = string
type Listener = (data: any, event: MercureMessageEvent) => void

export type MercureMessageEvent = Pick<MessageEvent, 'data' | 'lastEventId'>
export interface EventSourceInterface {
  onmessage: ((event: MercureMessageEvent) => void) | null
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

export type MercureOptions = {
  handler: Listener
  eventSourceFactory?: EventSourceFactory
}

const resolveSubscribedTopics = (topics: Topic[]): Topic[] => {
  if (topics.includes('*')) {
    topics = ['*']
  }
  return [...new Set(topics)]
}

const DEAULT_OPTIONS: MercureOptions = {
  handler: () => {},
  eventSourceFactory: new DefaultEventSourceFactory(),
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
    this.options = {...DEAULT_OPTIONS, ...options}
  }

  subscribe(topic: Topic | Topic[], append: boolean = true): void {
    const topics = Array.isArray(topic) ? topic : [topic]
    this.eventSource = this.connect(topics, !append)
    const {handler: handle} = this.options

    this.eventSource.onmessage = (event: MercureMessageEvent) => {
      this.lastEventId = event.lastEventId
      const data = JSON.parse(event.data)
      handle(data, event)
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

    const params: Record<string, string> = {topics: mergedTopics.join(',')}
    if (this.lastEventId !== null) {
      params.lastEventID = this.lastEventId
    }

    const url = this.hub + '?' + new URLSearchParams(params)
    this.eventSource = this.options.eventSourceFactory!.create(url)
    this.subscribedTopics = mergedTopics

    return this.eventSource
  }
}
