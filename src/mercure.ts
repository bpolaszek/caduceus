import { spaceship } from "./spaceship.ts"

type Topic = string
type Listener = (data: any, event: MessageEvent) => void
export type MercureOptions = {
  handler: Listener
}

const resolveSubscribedTopics = (topics: Topic[]): Topic[] => {
  if (topics.includes('*')) {
    topics = ['*']
  }
  return [...new Set(topics)]
}

const DEAULT_OPTIONS: MercureOptions = {
  handler : () => {}
}

export class Mercure {
  private subscribedTopics: Topic[] = []
  private eventSource: EventSource | null = null
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

  private connect(topics: Topic[], clearSubscribedTopics: boolean): EventSource {
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

    return new EventSource(this.hub + '?' + new URLSearchParams(params))
  }
}
