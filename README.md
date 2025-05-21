# Caduceus

[![npm](https://img.shields.io/npm/v/caduceus)](https://www.npmjs.com/package/caduceus)
[![License](https://img.shields.io/github/license/caduceus/caduceus)](LICENSE)

Caduceus is a TypeScript library that simplifies real-time data synchronization between your client and server using the [Mercure protocol](https://mercure.rocks/). It provides an elegant way to subscribe to updates on API resources and keep your client-side data in sync with server changes.

## Overview

Caduceus consists of two main components:

1. **Mercure** - A client for the Mercure protocol that handles the low-level communication with a Mercure hub.
2. **HydraSynchronizer** - A higher-level abstraction designed to synchronize [Hydra](https://www.hydra-cg.com/)/JSON-LD resources with real-time updates from a Mercure hub.

## Core Features

- 🔄 Real-time data synchronization
- 🧠 Automatic resource management
- 🎯 Topic-based subscriptions
- 🔌 Flexible event handling
- 🛠️ Customizable configuration options

## Usage

### Basic Example

```typescript
import { HydraSynchronizer } from 'caduceus';

// Create a synchronizer connected to your Mercure hub
const synchronizer = new HydraSynchronizer('https://example.com/.well-known/mercure');

// A resource with an @id property (in Hydra/JSON-LD format)
const resource = {
  '@id': '/api/books/1',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald'
};

// Start synchronizing the resource
synchronizer.sync(resource);

// The resource object will now be automatically updated
// whenever changes are published to the Mercure hub
```

> [!IMPORTANT]  
> By default, Caduceus uses the `@id` property of the resource to determine the topic for Mercure subscriptions. 
> Synchronizing too many resources at once may lead to performance issues.
> Consider using URI templates or a wildcard topic to reduce the number of subscriptions.

```typescript
synchronizer.sync(resource, '/api/books/{id}');
// or
synchronizer.sync(resource, '*');
```

### Advanced Usage

#### Custom Event Handling

```typescript
import { HydraSynchronizer } from 'caduceus';

const synchronizer = new HydraSynchronizer('https://example.com/.well-known/mercure');

const book = {
  '@id': '/api/books/1',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald'
};

// Start synchronizing
synchronizer.sync(book);

// Add a custom event handler
synchronizer.on(book, (updatedData, event) => {
  console.log('That book was updated:', updatedData);
  // You could trigger UI updates or other side effects here
});
```

#### Working with the Mercure Class Directly

For more control over the subscription process, you can use the `Mercure` class directly:

```typescript
import { Mercure, type MercureMessageEvent } from 'caduceus';

// Create a Mercure client
const mercure = new Mercure('https://example.com/.well-known/mercure');

// Subscribe to specific topics
mercure.subscribe(['/api/books/1', '/api/books/2']);

// Add an event listener
mercure.on('message', async (event: MercureMessageEvent) => {
  const data = await event.json();
  console.log('Received update:', data);
});

// Connect to the Mercure hub
mercure.connect();

// Later, you can unsubscribe from topics
mercure.unsubscribe('/api/books/2');
```

#### Custom Configuration

Both `Mercure` and `HydraSynchronizer` accept configuration options:

```typescript
import { HydraSynchronizer, DefaultEventSourceFactory } from 'caduceus';

const synchronizer = new HydraSynchronizer('https://example.com/.well-known/mercure', {
  // Custom event source factory
  eventSourceFactory: new DefaultEventSourceFactory(),
  
  // Custom last event ID (for resuming connections)
  lastEventId: 'event-id-123',
  
  // Custom resource listener
  resourceListener: (resource) => (data) => {
    console.log(`Resource ${resource['@id']} updated`);
    Object.assign(resource, data);
  },
  
  // Custom subscribe options
  subscribeOptions: {
    append: false, // Replace rather than append topics
  },
  
  // Custom event handler
  handler: (mercure, listeners) => {
    mercure.on('message', async (event) => {
      // Custom message handling logic
      const data = await event.json();
      // ...
    });
  },
});
```

## API Reference

### Mercure

The `Mercure` class provides a low-level client for a Mercure hub:

#### Constructor

```typescript
constructor(hub: string | URL, options?: Partial<MercureOptions>)
```

- `hub`: URL of the Mercure hub
- `options`: Configuration options
    - `eventSourceFactory`: Factory for creating EventSource instances
    - `lastEventId`: ID of the last event received (for resuming)

#### Methods

- `subscribe(topic: Topic | Topic[], options?: Partial<SubscribeOptions>): void` - Subscribe to one or more topics
- `unsubscribe(topic: Topic | Topic[]): void` - Unsubscribe from one or more topics
- `on(type: string, listener: Listener): void` - Add an event listener
- `connect(): EventSourceInterface` - Connect to the Mercure hub

### HydraSynchronizer

The `HydraSynchronizer` class provides a higher-level abstraction for synchronizing resources:

#### Constructor

```typescript
constructor(hub: string | URL, options?: Partial<HydraSynchronizerOptions>)
```

- `hub`: URL of the Mercure hub
- `options`: Configuration options
    - `resourceListener`: Function to create a listener for a specific resource
    - `subscribeOptions`: Options for subscribing to topics
    - `handler`: Custom handler for processing events
    - (plus all options from `MercureOptions`)

#### Methods

- `sync(resource: ApiResource, topic?: string, subscribeOptions?: Partial<SubscribeOptions>)` - Start synchronizing a resource
- `on(resource: ApiResource, callback: Listener)` - Add a listener for a specific resource
- `unsync(resource: ApiResource)` - Stop synchronizing a resource

## License

[MIT License](LICENSE)
