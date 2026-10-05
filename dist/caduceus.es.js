var l = Object.defineProperty;
var p = (i, t, e) => t in i ? l(i, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[t] = e;
var n = (i, t, e) => p(i, typeof t != "symbol" ? t + "" : t, e);
function d(i, t) {
  return i < t ? -1 : i > t ? 1 : 0;
}
const u = { LEGACY: "legacy", V1: "1.0" }, E = (i) => ({ match: i, matchType: "urlpattern" }), c = (i) => typeof i == "string" ? i : `urlpattern:${i.match}`;
class b {
  create(t) {
    return new EventSource(t.toString());
  }
}
class L {
  create(t) {
    return new EventSource(t.toString(), { withCredentials: !0 });
  }
}
class y {
  constructor(t) {
    this.token = t;
  }
  create(t, e = {}) {
    const s = new URL(t.toString());
    return s.searchParams.set("authorization", e.token ?? this.token), new EventSource(s.toString());
  }
}
const a = (i) => {
  if (i.includes("*"))
    return ["*"];
  const t = /* @__PURE__ */ new Map();
  for (const e of i)
    t.set(c(e), e);
  return [...t.values()];
}, S = {
  eventSourceFactory: new b(),
  lastEventId: null,
  protocol: u.V1
}, f = {
  append: !0
};
class v {
  constructor(t, e = {}) {
    n(this, "subscribedTopics", []);
    n(this, "currentlySubscribedTopics", []);
    n(this, "eventSource", null);
    n(this, "lastEventId", null);
    n(this, "options");
    n(this, "listeners", /* @__PURE__ */ new Map());
    this.hub = t, this.options = { ...S, ...e }, this.lastEventId = this.options.lastEventId;
  }
  subscribe(t, e = {}) {
    const { append: s } = { ...f, ...e }, r = Array.isArray(t) ? t : [t];
    this.subscribedTopics = a(
      s ? [...this.currentlySubscribedTopics, ...this.subscribedTopics, ...r] : r
    );
  }
  on(t, e) {
    this.listeners.has(t) || this.listeners.set(t, []), this.listeners.get(t).push(e), this.attachListener(t, e);
  }
  unsubscribe(t) {
    const s = (Array.isArray(t) ? t : [t]).map(c), r = this.subscribedTopics.filter((o) => !s.includes(c(o)));
    this.subscribedTopics = a(r), this.connect();
  }
  disconnect() {
    this.eventSource && (this.eventSource.close(), this.eventSource = null);
  }
  connect(t = {}) {
    if (this.eventSource && this.subscribedTopics.length > 0 && d(this.subscribedTopics.map(c), this.currentlySubscribedTopics.map(c)) === 0)
      return this.eventSource;
    if (this.eventSource && this.eventSource.close(), this.subscribedTopics.length === 0)
      throw new Error("No topics to subscribe to.");
    const e = this.hub + "?" + this.buildQueryParams();
    this.eventSource = this.options.eventSourceFactory.create(e, t);
    for (const [s, r] of this.listeners.entries())
      for (const o of r)
        this.attachListener(s, o);
    return this.currentlySubscribedTopics = this.subscribedTopics, this.eventSource;
  }
  reconnect(t = {}) {
    this.disconnect(), this.connect(t);
  }
  buildQueryParams() {
    const t = new URLSearchParams();
    if (this.options.protocol === u.LEGACY) {
      if (this.subscribedTopics.some((e) => typeof e != "string"))
        throw new Error("URL pattern topics require the Mercure 1.0 protocol.");
      return t.set("topic", this.subscribedTopics.join(",")), this.lastEventId !== null && t.set("lastEventID", this.lastEventId), t;
    }
    for (const e of this.subscribedTopics)
      typeof e == "string" ? t.append("match", e) : t.append("match_urlpattern", e.match);
    return this.lastEventId !== null && t.set("last_event_id", this.lastEventId), t;
  }
  attachListener(t, e) {
    this.eventSource && this.eventSource.addEventListener(t, (s) => {
      this.lastEventId = s.lastEventId;
      const r = {
        ...s,
        type: t,
        json: () => new Promise((o) => o(JSON.parse(s.data)))
      };
      e(r);
    });
  }
}
class w {
  constructor(t, e = {}) {
    n(this, "DEFAULT_OPTIONS", {
      handler: (t) => {
        t.on("message", async (e) => {
          const s = await e.json();
          if (typeof s != "object")
            return;
          const o = (this.isDeletion(s) ? this.deleteListeners : this.updateListeners).get(s["@id"]);
          for (const h of o ?? [])
            h(s, e);
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
    this.options = { ...this.DEFAULT_OPTIONS, ...e }, this.connection = new v(t, {
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
  f as DEFAULT_SUBSCRIBE_OPTIONS,
  b as DefaultEventSourceFactory,
  w as HydraSynchronizer,
  v as Mercure,
  u as MercureProtocol,
  y as QueryParamAuthorization,
  E as urlPattern
};
