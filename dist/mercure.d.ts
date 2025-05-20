type Topic = string;
type Listener = (data: any, event: MercureMessageEvent) => void;
export type MercureMessageEvent = Pick<MessageEvent, 'data' | 'lastEventId'>;
export interface EventSourceInterface {
    addEventListener(type: string, callback: (event: MercureMessageEvent) => void): void;
    close(): void;
}
export interface EventSourceFactory {
    create(url: string | URL): EventSourceInterface;
}
export declare class DefaultEventSourceFactory implements EventSourceFactory {
    create(url: string | URL): EventSourceInterface;
}
export type MercureOptions = {
    handler: Listener;
    eventSourceFactory?: EventSourceFactory;
};
export type SubscribeOptions = {
    append: boolean;
    types: string[];
};
export declare const DEFAULT_SUBSCRIBE_OPTIONS: SubscribeOptions;
export declare class Mercure {
    private readonly hub;
    private subscribedTopics;
    private eventSource;
    private lastEventId;
    private readonly options;
    constructor(hub: string | URL, options?: Partial<MercureOptions>);
    subscribe(topic: Topic | Topic[], options?: Partial<SubscribeOptions>): void;
    unsubscribe(topic: Topic | Topic[]): void;
    private connect;
}
export {};
