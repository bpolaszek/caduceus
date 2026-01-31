var a = Object.defineProperty;
var u = (i, t, e) => t in i ? a(i, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[t] = e;
var n = (i, t, e) => u(i, typeof t != "symbol" ? t + "" : t, e);
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
  create(t, e = {}) {
    const s = new URL(t.toString());
    return s.searchParams.set("authorization", e.token ?? this.token), new EventSource(s.toString());
  }
}
const h = (i) => (i.includes("*") && (i = ["*"]), [...new Set(i)]), p = {
  eventSourceFactory: new d(),
  lastEventId: null
}, b = {
  append: !0
};
class S {
  constructor(t, e = {}) {
    n(this, "subscribedTopics", []);
    n(this, "currentlySubscribedTopics", []);
    n(this, "eventSource", null);
    n(this, "lastEventId", null);
    n(this, "options");
    n(this, "listeners", /* @__PURE__ */ new Map());
    this.hub = t, this.options = { ...p, ...e }, this.lastEventId = this.options.lastEventId;
  }
  subscribe(t, e = {}) {
    const { append: s } = { ...b, ...e }, r = Array.isArray(t) ? t : [t];
    this.subscribedTopics = h(
      s ? [...this.currentlySubscribedTopics, ...this.subscribedTopics, ...r] : r
    );
  }
  on(t, e) {
    this.listeners.has(t) || this.listeners.set(t, []), this.listeners.get(t).push(e), this.attachListener(t, e);
  }
  unsubscribe(t) {
    const e = Array.isArray(t) ? t : [t], s = this.subscribedTopics.filter((r) => !e.includes(r));
    this.subscribedTopics = h(s), this.connect();
  }
  disconnect() {
    this.eventSource && (this.eventSource.close(), this.eventSource = null);
  }
  connect(t = {}) {
    if (this.eventSource && this.subscribedTopics.length > 0 && l(this.subscribedTopics, this.currentlySubscribedTopics) === 0)
      return this.eventSource;
    if (this.eventSource && this.eventSource.close(), this.subscribedTopics.length === 0)
      throw new Error("No topics to subscribe to.");
    const e = { topic: this.subscribedTopics.join(",") };
    this.lastEventId !== null && (e.lastEventID = this.lastEventId);
    const s = this.hub + "?" + new URLSearchParams(e);
    this.eventSource = this.options.eventSourceFactory.create(s, t);
    for (const [r, c] of this.listeners.entries())
      for (const o of c)
        this.attachListener(r, o);
    return this.currentlySubscribedTopics = this.subscribedTopics, this.eventSource;
  }
  reconnect(t = {}) {
    this.disconnect(), this.connect(t);
  }
  attachListener(t, e) {
    this.eventSource && this.eventSource.addEventListener(t, (s) => {
      this.lastEventId = s.lastEventId;
      const r = {
        ...s,
        type: t,
        json: () => new Promise((c) => c(JSON.parse(s.data)))
      };
      e(r);
    });
  }
}
class f {
  constructor(t, e = {}) {
    n(this, "DEFAULT_OPTIONS", {
      handler: (t) => {
        t.on("message", async (e) => {
          const s = await e.json();
          if (typeof s != "object")
            return;
          const c = (this.isDeletion(s) ? this.deleteListeners : this.updateListeners).get(s["@id"]);
          for (const o of c ?? [])
            o(s, e);
        });
      },
      resourceListener: (t) => (e) => Object.assign(t, e),
      subscribeOptions: {
        append: !0
      }
    });
    n(this, "connection");
    n(this, "updateListeners", /* @__PURE__ */ new Map());
    n(this, "deleteListeners", /* @__PURE__ */ new Map());
    n(this, "options");
    this.options = { ...this.DEFAULT_OPTIONS, ...e }, this.connection = new S(t, {
      ...this.options
    });
    const { handler: s } = this.options;
    s(this.connection, this.updateListeners);
  }
  sync(t, e, s) {
    const r = e ?? t["@id"];
    this.updateListeners.has(t["@id"]) || (this.updateListeners.set(t["@id"], [this.options.resourceListener(t, this.isDeletion(t))]), this.connection.subscribe(r, {
      ...this.options.subscribeOptions,
      ...s
    }), this.connection.connect());
  }
  unsync(t) {
    this.updateListeners.delete(t["@id"]);
  }
  onUpdate(t, e) {
    const s = this.updateListeners.get(t["@id"]) ?? [];
    s.push(e), this.updateListeners.set(t["@id"], [...new Set(s)]);
  }
  onDelete(t, e) {
    const s = this.deleteListeners.get(t["@id"]) ?? [];
    s.push(e), this.deleteListeners.set(t["@id"], [...new Set(s)]);
  }
  isDeletion(t) {
    return Object.keys(t).filter((s) => !s.startsWith("@")).length === 0;
  }
}
export {
  L as CookieBasedAuthorization,
  b as DEFAULT_SUBSCRIBE_OPTIONS,
  d as DefaultEventSourceFactory,
  f as HydraSynchronizer,
  S as Mercure,
  T as QueryParamAuthorization
};
