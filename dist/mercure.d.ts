type Topic = string;
type Listener = (data: any, event: MercureMessageEvent) => void;
export type MercureMessageEvent = Pick<MessageEvent, 'data' | 'lastEventId'>;
export interface EventSourceInterface {
    onmessage: ((event: MercureMessageEvent) => void) | null;
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
export declare class Mercure {
    private readonly hub;
    private subscribedTopics;
    private eventSource;
    private lastEventId;
    private readonly options;
    constructor(hub: string | URL, options?: Partial<MercureOptions>);
    subscribe(topic: Topic | Topic[], append?: boolean): void;
    unsubscribe(topic: Topic | Topic[]): void;
    private connect;
}
export {};
