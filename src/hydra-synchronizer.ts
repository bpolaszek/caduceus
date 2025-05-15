import { Mercure, MercureOptions } from "./mercure.ts"

type ResourceListener = (resource: ApiResource) => Listener
type Listener = (data: ApiResource, event: MessageEvent) => void
type Iri = string
type ApiResource = Record<string, any> & {
  '@id': Iri
}

type HydraSynchronizerOptions = MercureOptions & {
  resourceListener: ResourceListener
}

const DEFAULT_OPTIONS: Partial<HydraSynchronizerOptions> = {
  resourceListener: (resource: ApiResource) => (data: any) => Object.assign(resource, data),
}

export class HydraSynchronizer {

  public readonly mercure: Mercure
  private readonly listeners: Map<Iri, Listener> = new Map
  private readonly options: HydraSynchronizerOptions

  constructor(
    hub: string | URL,
    options: Partial<HydraSynchronizerOptions> = {},
  ) {
    this.options = {...DEFAULT_OPTIONS, ...options} as HydraSynchronizerOptions
    this.mercure = new Mercure(hub, {
      ...this.options,
      handler: (data: ApiResource, event: MessageEvent) => {
        const callback = this.listeners.get(data['@id'])
        if (callback) {
          callback(data, event)
        }
      },
    })
  }

  sync(resource: ApiResource, topic?: string) {
    const resolvedTopic = topic ?? resource['@id']
    if (this.listeners.has(resource['@id'])) {
      return
    }
    this.listeners.set(resource['@id'], this.options.resourceListener(resource))
    this.mercure.subscribe(resolvedTopic)
  }

  unsync(resource: ApiResource) {
    this.listeners.delete(resource['@id'])
  }
}
