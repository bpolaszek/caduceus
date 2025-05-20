import { Mercure, MercureMessageEvent, MercureOptions, SubscribeOptions } from './mercure.ts';
type ResourceListener = (resource: ApiResource) => Listener;
type Listener = (data: ApiResource, event: MercureMessageEvent) => void;
type Iri = string;
type ApiResource = Record<string, any> & {
    '@id': Iri;
};
type HydraSynchronizerOptions = MercureOptions & {
    resourceListener: ResourceListener;
    subscribeOptions?: Partial<SubscribeOptions>;
};
export declare class HydraSynchronizer {
    readonly mercure: Mercure;
    private readonly listeners;
    private readonly options;
    constructor(hub: string | URL, options?: Partial<HydraSynchronizerOptions>);
    sync(resource: ApiResource, topic?: string, subscribeOptions?: Partial<SubscribeOptions>): void;
    on(resource: ApiResource, callback: Listener): void;
    unsync(resource: ApiResource): void;
}
export {};
