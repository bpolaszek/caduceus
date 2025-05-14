import { Mercure, MercureOptions, SubscribeOptions, MercureMessageEvent } from './mercure.ts';
type ResourceListener = (resource: ApiResource, isDeletion: boolean) => Listener;
type Listener = (data: ApiResource, event: MercureMessageEvent) => void;
type Iri = string;
type ApiResource = Record<string, any> & {
    '@id': Iri;
};
type HydraSynchronizerOptions = MercureOptions & {
    resourceListener: ResourceListener;
    subscribeOptions?: Partial<SubscribeOptions>;
    handler: (mercure: Mercure, listeners: Map<Iri, Listener[]>) => void;
};
export declare class HydraSynchronizer {
    private readonly DEFAULT_OPTIONS;
    readonly connection: Mercure;
    private readonly updateListeners;
    private readonly deleteListeners;
    private readonly options;
    constructor(hub: string | URL, options?: Partial<HydraSynchronizerOptions>);
    sync(resource: ApiResource, topic?: string, subscribeOptions?: Partial<SubscribeOptions>): void;
    unsync(resource: ApiResource): void;
    onUpdate(resource: ApiResource, callback: Listener): void;
    onDelete(resource: ApiResource, callback: Listener): void;
    private isDeletion;
}
export {};
