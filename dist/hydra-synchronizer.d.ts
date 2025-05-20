import { Mercure, MercureMessageEvent, MercureOptions } from './mercure.ts';
type ResourceListener = (resource: ApiResource) => Listener;
type Listener = (data: ApiResource, event: MercureMessageEvent) => void;
type Iri = string;
type ApiResource = Record<string, any> & {
    '@id': Iri;
};
type HydraSynchronizerOptions = MercureOptions & {
    resourceListener: ResourceListener;
};
export declare class HydraSynchronizer {
    readonly mercure: Mercure;
    private readonly listeners;
    private readonly options;
    constructor(hub: string | URL, options?: Partial<HydraSynchronizerOptions>);
    sync(resource: ApiResource, topic?: string): void;
    on(resource: ApiResource, callback: Listener): void;
    unsync(resource: ApiResource): void;
}
export {};
