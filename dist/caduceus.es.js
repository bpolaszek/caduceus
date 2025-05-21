var h = Object.defineProperty;
var u = (e, s, t) => s in e ? h(e, s, { enumerable: !0, configurable: !0, writable: !0, value: t }) : e[s] = t;
var r = (e, s, t) => u(e, typeof s != "symbol" ? s + "" : s, t);
function a(e, s) {
  return e < s ? -1 : e > s ? 1 : 0;
}
class l {
  create(s) {
    return new EventSource(s.toString());
  }
}
const o = (e) => (e.includes("*") && (e = ["*"]), [...new Set(e)]), b = {
  eventSourceFactory: new l(),
  lastEventId: null
}, d = {
  append: !0
};
class p {
  constructor(s, t = {}) {
    r(this, "subscribedTopics", []);
    r(this, "currentlySubscribedTopics", []);
    r(this, "eventSource", null);
    r(this, "lastEventId", null);
    r(this, "options");
    r(this, "listeners", /* @__PURE__ */ new Map());
    this.hub = s, this.options = { ...b, ...t }, this.lastEventId = this.options.lastEventId;
  }
  subscribe(s, t = {}) {
    const { append: i } = { ...d, ...t }, n = Array.isArray(s) ? s : [s];
    this.subscribedTopics = o(
      i ? [...this.currentlySubscribedTopics, ...this.subscribedTopics, ...n] : n
    );
  }
  on(s, t) {
    this.listeners.has(s) || this.listeners.set(s, []), this.listeners.get(s).push(t), this.attachListener(s, t);
  }
  unsubscribe(s) {
    const t = Array.isArray(s) ? s : [s], i = this.subscribedTopics.filter((n) => !t.includes(n));
    this.subscribedTopics = o(i), this.connect();
  }
  connect() {
    if (this.eventSource && this.subscribedTopics.length > 0 && a(this.subscribedTopics, this.currentlySubscribedTopics) === 0)
      return this.eventSource;
    if (this.eventSource && this.eventSource.close(), this.subscribedTopics.length === 0)
      throw new Error("No topics to subscribe to.");
    const s = { topic: this.subscribedTopics.join(",") };
    this.lastEventId !== null && (s.lastEventID = this.lastEventId);
    const t = this.hub + "?" + new URLSearchParams(s);
    this.eventSource = this.options.eventSourceFactory.create(t);
    for (const [i, n] of this.listeners.entries())
      for (const c of n)
        this.attachListener(i, c);
    return this.currentlySubscribedTopics = this.subscribedTopics, this.eventSource;
  }
  attachListener(s, t) {
    this.eventSource && this.eventSource.addEventListener(s, (i) => {
      this.lastEventId = i.lastEventId;
      const n = {
        ...i,
        type: s,
        json: () => new Promise((c) => c(JSON.parse(i.data)))
      };
      t(n);
    });
  }
}
const S = {
  handler: (e, s) => {
    e.on("message", async (t) => {
      const i = await t.json(), n = s.get(i["@id"]);
      for (const c of n ?? [])
        c(i, t);
    });
  },
  resourceListener: (e) => (s) => Object.assign(e, s),
  subscribeOptions: {
    append: !0
  }
};
class T {
  constructor(s, t = {}) {
    r(this, "connection");
    r(this, "listeners", /* @__PURE__ */ new Map());
    r(this, "options");
    this.options = { ...S, ...t }, this.connection = new p(s, {
      ...this.options
    });
    const { handler: i } = this.options;
    i(this.connection, this.listeners);
  }
  sync(s, t, i) {
    const n = t ?? s["@id"];
    this.listeners.has(s["@id"]) || (this.listeners.set(s["@id"], [this.options.resourceListener(s)]), this.connection.subscribe(n, {
      ...this.options.subscribeOptions,
      ...i
    }), this.connection.connect());
  }
  on(s, t) {
    const i = this.listeners.get(s["@id"]) ?? [];
    i.push(t), this.listeners.set(s["@id"], [...new Set(i)]);
  }
  unsync(s) {
    this.listeners.delete(s["@id"]);
  }
}
export {
  d as DEFAULT_SUBSCRIBE_OPTIONS,
  l as DefaultEventSourceFactory,
  T as HydraSynchronizer,
  p as Mercure
};
