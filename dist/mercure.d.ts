type Topic = string;
type RawMessageEvent = MessageEvent;
export type MercureMessageEvent = RawMessageEvent & {
    type: string;
    json: () => Promise<any>;
};
type Listener = (event: MercureMessageEvent) => void;
export interface EventSourceInterface {
    addEventListener(type: string, callback: (event: RawMessageEvent) => void): void;
    close(): void;
}
export type MercureOptions = {
    eventSourceFactory: EventSourceFactory;
    lastEventId: string | null;
};
export type SubscribeOptions = {
    append: boolean;
};
export interface EventSourceFactory {
    create(url: string | URL, options?: any): EventSourceInterface;
}
export declare class DefaultEventSourceFactory implements EventSourceFactory {
    create(url: string | URL): EventSourceInterface;
}
export declare class CookieBasedAuthorization implements EventSourceFactory {
    create(url: string | URL): EventSourceInterface;
}
export declare class QueryParamAuthorization implements EventSourceFactory {
    private readonly token;
    constructor(token: string);
    create(url: string | URL, options?: any): EventSourceInterface;
}
export declare const DEFAULT_SUBSCRIBE_OPTIONS: SubscribeOptions;
export declare class Mercure {
    private readonly hub;
    private subscribedTopics;
    private currentlySubscribedTopics;
    private eventSource;
    private lastEventId;
    private readonly options;
    private readonly listeners;
    constructor(hub: string | URL, options?: Partial<MercureOptions>);
    subscribe(topic: Topic | Topic[], options?: Partial<SubscribeOptions>): void;
    on(type: string, listener: Listener): void;
    unsubscribe(topic: Topic | Topic[]): void;
    disconnect(): void;
    connect(options?: any): EventSourceInterface;
    reconnect(options?: any): void;
    private attachListener;
}
export {};
