# Caduceus

A lightweight TypeScript library for Mercure real-time updates integration with API Platform.

## Overview

Caduceus provides a simple and efficient way to subscribe to [Mercure](https://mercure.rocks/) hubs for real-time updates in your JavaScript/TypeScript applications. It's particularly designed to work seamlessly with [API Platform](https://api-platform.com/) resources using the Hydra specification, enabling real-time synchronization of your frontend data with backend changes.

## Features

- Simple Mercure hub subscription management
- Real-time data updates through SSE (Server-Sent Events)
- Hydra resource synchronization
- Topic-based subscription/unsubscription
- Customizable event handling
- TypeScript support with full type definitions

## Usage

### Basic Mercure Usage

```typescript
import { Mercure } from 'caduceus';

// Create a new Mercure instance
const mercure = new Mercure('https://example.com/.well-known/mercure', {
  handler: (data, event) => {
    console.log('Received update:', data);
    // Process your data here
  }
});

// Subscribe to a topic
mercure.subscribe('https://example.com/books/1');

// Subscribe to multiple topics
mercure.subscribe(['https://example.com/books/1', 'https://example.com/books/2']);

// Subscribe to all updates
mercure.subscribe('*');

// Unsubscribe from a topic
mercure.unsubscribe('https://example.com/books/1');
```

### Hydra Resource Synchronization

The `HydraSynchronizer` class makes it easy to keep your API Platform (Hydra) resources in sync:

```typescript
import { HydraSynchronizer } from 'caduceus';

// Create a synchronizer
const synchronizer = new HydraSynchronizer('https://example.com/.well-known/mercure');

// Fetch a resource from your API
const book = await fetch('https://example.com/books/1').then(res => res.json());

// Start synchronizing the resource
synchronizer.sync(book);
// The book object will be automatically updated when changes occur on the server

// Custom resource listener
const customSynchronizer = new HydraSynchronizer('https://example.com/.well-known/mercure', {
  resourceListener: (resource) => (data) => {
    console.log(`Resource ${resource['@id']} was updated`);
    Object.assign(resource, data);
    // Trigger UI updates or other actions
  }
});

// Stop synchronizing a resource
synchronizer.unsync(book);
```

## Advanced Configuration

### Custom EventSource Factory

You can provide a custom EventSource implementation, which can be useful for testing or custom SSE handling:

```typescript
import { Mercure, EventSourceFactory, EventSourceInterface } from 'caduceus';

class CustomEventSourceFactory implements EventSourceFactory {
  create(url: string | URL): EventSourceInterface {
    // Return your custom EventSource implementation
    return new CustomEventSource(url.toString());
  }
}

const mercure = new Mercure('https://example.com/.well-known/mercure', {
  eventSourceFactory: new CustomEventSourceFactory()
});
```

### Reconnection with Last Event ID

Caduceus automatically handles reconnection by storing the last event ID, allowing the server to send only the updates that occurred since the last connection:

```typescript
// The library will automatically reconnect and request updates since the last event
mercure.subscribe('https://example.com/books/1');
```

## API Reference

### Mercure Class

The main class for interacting with a Mercure hub.

#### Constructor

```typescript
constructor(hub: string | URL, options?: Partial<MercureOptions>)
```

- `hub`: URL of the Mercure hub
- `options`: Configuration options
  - `handler`: Event handler function
  - `eventSourceFactory`: Factory for creating EventSource instances

#### Methods

- `subscribe(topic: Topic | Topic[], append: boolean = true): void` - Subscribe to topics
- `unsubscribe(topic: Topic | Topic[]): void` - Unsubscribe from topics

### HydraSynchronizer Class

Specialized class for Hydra/API Platform resources.

#### Constructor

```typescript
constructor(hub: string | URL, options?: Partial<HydraSynchronizerOptions>)
```

- `hub`: URL of the Mercure hub
- `options`: Configuration options
  - `resourceListener`: Function that returns a listener for a specific resource
  - Plus all options from `MercureOptions`

#### Methods

- `sync(resource: ApiResource, topic?: string): void` - Start synchronizing a resource
- `unsync(resource: ApiResource): void` - Stop synchronizing a resource

## How It Works

Caduceus establishes an SSE connection to a Mercure hub and maintains subscriptions to the topics you specify. When updates occur on the server, the Mercure hub pushes them to your client in real-time, and Caduceus processes them through your handlers.

For Hydra resources, the library automatically updates your resource objects when changes are published to the Mercure hub, keeping your client-side data in sync with the server.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT.
