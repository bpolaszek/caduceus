import {EventSourceFactory, EventSourceInterface} from '../../src'
import {MockEventSource} from './MockEventSource'

export class MockEventSourceFactory implements EventSourceFactory {
  public lastCreatedEventSource: MockEventSource | null = null

  create(url: string | URL): EventSourceInterface {
    this.lastCreatedEventSource = new MockEventSource(url.toString())
    return this.lastCreatedEventSource
  }
}
