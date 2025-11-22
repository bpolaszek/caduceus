var h = Object.defineProperty;
var u = (i, t, s) => t in i ? h(i, t, { enumerable: !0, configurable: !0, writable: !0, value: s }) : i[t] = s;
var n = (i, t, s) => u(i, typeof t != "symbol" ? t + "" : t, s);
function l(i, t) {
  return i < t ? -1 : i > t ? 1 : 0;
}
class d {
  create(t) {
    return new EventSource(t.toString());
  }
}
class L {
  create(t) {
    return new EventSource(t.toString(), { withCredentials: !0 });
  }
}
class T {
  constructor(t) {
    this.token = t;
  }
  create(t) {
    const s = new URL(t.toString());
    return s.searchParams.set("authorization", this.token), new EventSource(s.toString());
  }
}
const c = (i) => (i.includes("*") && (i = ["*"]), [...new Set(i)]), p = {
  eventSourceFactory: new d(),
  lastEventId: null
}, b = {
  append: !0
};
class S {
  constructor(t, s = {}) {
    n(this, "subscribedTopics", []);
    n(this, "currentlySubscribedTopics", []);
    n(this, "eventSource", null);
    n(this, "lastEventId", null);
    n(this, "options");
    n(this, "listeners", /* @__PURE__ */ new Map());
    this.hub = t, this.options = { ...p, ...s }, this.lastEventId = this.options.lastEventId;
  }
  subscribe(t, s = {}) {
    const { append: e } = { ...b, ...s }, r = Array.isArray(t) ? t : [t];
    this.subscribedTopics = c(
      e ? [...this.currentlySubscribedTopics, ...this.subscribedTopics, ...r] : r
    );
  }
  on(t, s) {
    this.listeners.has(t) || this.listeners.set(t, []), this.listeners.get(t).push(s), this.attachListener(t, s);
  }
  unsubscribe(t) {
    const s = Array.isArray(t) ? t : [t], e = this.subscribedTopics.filter((r) => !s.includes(r));
    this.subscribedTopics = c(e), this.connect();
  }
  connect() {
    if (this.eventSource && this.subscribedTopics.length > 0 && l(this.subscribedTopics, this.currentlySubscribedTopics) === 0)
      return this.eventSource;
    if (this.eventSource && this.eventSource.close(), this.subscribedTopics.length === 0)
      throw new Error("No topics to subscribe to.");
    const t = { topic: this.subscribedTopics.join(",") };
    this.lastEventId !== null && (t.lastEventID = this.lastEventId);
    const s = this.hub + "?" + new URLSearchParams(t);
    this.eventSource = this.options.eventSourceFactory.create(s);
    for (const [e, r] of this.listeners.entries())
      for (const o of r)
        this.attachListener(e, o);
    return this.currentlySubscribedTopics = this.subscribedTopics, this.eventSource;
  }
  attachListener(t, s) {
    this.eventSource && this.eventSource.addEventListener(t, (e) => {
      this.lastEventId = e.lastEventId;
      const r = {
        ...e,
        type: t,
        json: () => new Promise((o) => o(JSON.parse(e.data)))
      };
      s(r);
    });
  }
}
class E {
  constructor(t, s = {}) {
    n(this, "DEFAULT_OPTIONS", {
      handler: (t) => {
        t.on("message", async (s) => {
          const e = await s.json();
          if (typeof e != "object")
            return;
          const o = (this.isDeletion(e) ? this.deleteListeners : this.updateListeners).get(e["@id"]);
          for (const a of o ?? [])
            a(e, s);
        });
      },
      resourceListener: (t) => (s) => Object.assign(t, s),
      subscribeOptions: {
        append: !0
      }
    });
    n(this, "connection");
    n(this, "updateListeners", /* @__PURE__ */ new Map());
    n(this, "deleteListeners", /* @__PURE__ */ new Map());
    n(this, "options");
    this.options = { ...this.DEFAULT_OPTIONS, ...s }, this.connection = new S(t, {
      ...this.options
    });
    const { handler: e } = this.options;
    e(this.connection, this.updateListeners);
  }
  sync(t, s, e) {
    const r = s ?? t["@id"];
    this.updateListeners.has(t["@id"]) || (this.updateListeners.set(t["@id"], [this.options.resourceListener(t, this.isDeletion(t))]), this.connection.subscribe(r, {
      ...this.options.subscribeOptions,
      ...e
    }), this.connection.connect());
  }
  unsync(t) {
    this.updateListeners.delete(t["@id"]);
  }
  onUpdate(t, s) {
    const e = this.updateListeners.get(t["@id"]) ?? [];
    e.push(s), this.updateListeners.set(t["@id"], [...new Set(e)]);
  }
  onDelete(t, s) {
    const e = this.deleteListeners.get(t["@id"]) ?? [];
    e.push(s), this.deleteListeners.set(t["@id"], [...new Set(e)]);
  }
  isDeletion(t) {
    return Object.keys(t).filter((e) => !e.startsWith("@")).length === 0;
  }
}
export {
  L as CookieBasedAuthorization,
  b as DEFAULT_SUBSCRIBE_OPTIONS,
  d as DefaultEventSourceFactory,
  E as HydraSynchronizer,
  S as Mercure,
  T as QueryParamAuthorization
};
