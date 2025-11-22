import {Mercure, MercureOptions, SubscribeOptions, MercureMessageEvent} from './mercure.ts'

type ResourceListener = (resource: ApiResource, isDeletion: boolean) => Listener
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

export class HydraSynchronizer {
  private readonly DEFAULT_OPTIONS: Partial<HydraSynchronizerOptions> = {
    handler: (mercure: Mercure) => {
      mercure.on('message', async (event: MercureMessageEvent) => {
        const data = await event.json()
        if ('object' !== typeof data) {
          return
        }

        const listeners = this.isDeletion(data) ? this.deleteListeners : this.updateListeners
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

  public readonly connection: Mercure
  private readonly updateListeners: Map<Iri, Listener[]> = new Map()
  private readonly deleteListeners: Map<Iri, Listener[]> = new Map()
  private readonly options: HydraSynchronizerOptions

  constructor(hub: string | URL, options: Partial<HydraSynchronizerOptions> = {}) {
    this.options = {...this.DEFAULT_OPTIONS, ...options} as HydraSynchronizerOptions
    this.connection = new Mercure(hub, {
      ...this.options,
    })
    const {handler: handle} = this.options
    handle(this.connection, this.updateListeners)
  }

  sync(resource: ApiResource, topic?: string, subscribeOptions?: Partial<SubscribeOptions>): void {
    const resolvedTopic = topic ?? resource['@id']
    if (this.updateListeners.has(resource['@id'])) {
      return
    }
    this.updateListeners.set(resource['@id'], [this.options.resourceListener(resource, this.isDeletion(resource))])
    this.connection.subscribe(resolvedTopic, {
      ...this.options.subscribeOptions,
      ...subscribeOptions,
    })
    this.connection.connect()
  }

  unsync(resource: ApiResource): void {
    this.updateListeners.delete(resource['@id'])
  }

  onUpdate(resource: ApiResource, callback: Listener): void {
    const callbacks = this.updateListeners.get(resource['@id']) ?? []
    callbacks.push(callback)
    this.updateListeners.set(resource['@id'], [...new Set(callbacks)])
  }

  onDelete(resource: ApiResource, callback: Listener): void {
    const callbacks = this.deleteListeners.get(resource['@id']) ?? []
    callbacks.push(callback)
    this.deleteListeners.set(resource['@id'], [...new Set(callbacks)])
  }

  private isDeletion(resource: ApiResource): boolean {
    const keys = Object.keys(resource)
    return 0 === keys.filter((key) => !key.startsWith('@')).length
  }
}
