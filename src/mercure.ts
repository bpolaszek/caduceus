import { spaceship } from "./spaceship.ts"

type Topic = string
type Listener = (data: any, event: MessageEvent) => void

export interface EventSourceInterface {
  onmessage: ((event: MessageEvent) => void) | null;
  close(): void;
}

export interface EventSourceFactory {
  create(url: string | URL): EventSourceInterface;
}

export class DefaultEventSourceFactory implements EventSourceFactory {
  create(url: string | URL): EventSourceInterface {
    return new EventSource(url.toString());
  }
}

export type MercureOptions = {
  handler: Listener;
  eventSourceFactory?: EventSourceFactory;
}

const resolveSubscribedTopics = (topics: Topic[]): Topic[] => {
  if (topics.includes('*')) {
    topics = ['*']
  }
  return [...new Set(topics)]
}

const DEAULT_OPTIONS: MercureOptions = {
  handler: () => {},
  eventSourceFactory: new DefaultEventSourceFactory()
}

export class Mercure {
  private subscribedTopics: Topic[] = []
  private eventSource: EventSourceInterface | null = null
  private lastEventId: string | null = null
  private readonly options: MercureOptions

  constructor(
    private readonly hub: string | URL,
    options: Partial<MercureOptions> = {},
  ) {
    this.options = { ...DEAULT_OPTIONS, ...options }
  }

  subscribe(topic: Topic | Topic[], append: boolean = true): void {
    const topics = Array.isArray(topic) ? topic : [topic]
    this.eventSource = this.connect(topics, !append)
    const {handler: handle} = this.options


    this.eventSource.onmessage = (event: MessageEvent) => {
      this.lastEventId = event.lastEventId
      const data = JSON.parse(event.data)
      handle(data, event)
    }
  }

  unsubscribe(topic: Topic | Topic[]): void {
    const topics = Array.isArray(topic) ? topic : [topic]
    this.subscribedTopics = this.subscribedTopics.filter((t) => !topics.includes(t))
    this.connect([], false)
  }

  private connect(topics: Topic[], clearSubscribedTopics: boolean): EventSourceInterface {
    const resolvedSubscribedTopics = clearSubscribedTopics ? [] : resolveSubscribedTopics(this.subscribedTopics)
    const resolvedTopics = resolveSubscribedTopics(topics)
    const mergedTopics = resolveSubscribedTopics([...resolvedSubscribedTopics, ...resolvedTopics])

    if (this.eventSource && 0 === spaceship(resolvedSubscribedTopics, mergedTopics)) {
      return this.eventSource
    }

    if (this.eventSource) {
      this.eventSource.close()
    }

    const params: Record<string, string> = { topics: mergedTopics.join(',') }
    if (this.lastEventId !== null) {
      params.lastEventID = this.lastEventId
    }

    const url = this.hub + '?' + new URLSearchParams(params);
    this.eventSource = this.options.eventSourceFactory!.create(url);
    this.subscribedTopics = mergedTopics;

    return this.eventSource;
  }
}
