import {Mercure, MercureOptions, SubscribeOptions, MercureMessageEvent} from './mercure.ts'

type ResourceListener = (resource: ApiResource) => Listener
type Listener = (data: ApiResource, event: MercureMessageEvent) => void
type Iri = string
type ApiResource = Record<string, any> & {
  '@id': Iri
}

type HydraSynchronizerOptions = MercureOptions & {
  resourceListener: ResourceListener
  subscribeOptions?: Partial<SubscribeOptions>
  handler: (mercure: Mercure, listeners: Map<Iri, Listener[]>) => void
}

const DEFAULT_OPTIONS: Partial<HydraSynchronizerOptions> = {
  handler: (mercure: Mercure, listeners: Map<Iri, Listener[]>) => {
    mercure.on('message', async (event: MercureMessageEvent) => {
      const data = await event.json()
      const callbacks = listeners.get(data['@id'])
      for (const callback of callbacks ?? []) {
        callback(data, event)
      }
    })
  },
  resourceListener: (resource: ApiResource) => (data: any) => Object.assign(resource, data),
  subscribeOptions: {
    append: true,
  },
}

export class HydraSynchronizer {
  public readonly connection: Mercure
  private readonly listeners: Map<Iri, Listener[]> = new Map()
  private readonly options: HydraSynchronizerOptions

  constructor(hub: string | URL, options: Partial<HydraSynchronizerOptions> = {}) {
    this.options = {...DEFAULT_OPTIONS, ...options} as HydraSynchronizerOptions
    this.connection = new Mercure(hub, {
      ...this.options,
    })
    const {handler: handle} = this.options
    handle(this.connection, this.listeners)
  }

  sync(resource: ApiResource, topic?: string, subscribeOptions?: Partial<SubscribeOptions>) {
    const resolvedTopic = topic ?? resource['@id']
    if (this.listeners.has(resource['@id'])) {
      return
    }
    this.listeners.set(resource['@id'], [this.options.resourceListener(resource)])
    this.connection.subscribe(resolvedTopic, {
      ...this.options.subscribeOptions,
      ...subscribeOptions,
    })
    this.connection.connect()
  }

  on(resource: ApiResource, callback: Listener) {
    const callbacks = this.listeners.get(resource['@id']) ?? []
    callbacks.push(callback)
    this.listeners.set(resource['@id'], [...new Set(callbacks)])
  }

  unsync(resource: ApiResource) {
    this.listeners.delete(resource['@id'])
  }
}
