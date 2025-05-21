var d = Object.defineProperty;
var p = (t, s, e) => s in t ? d(t, s, { enumerable: !0, configurable: !0, writable: !0, value: e }) : t[s] = e;
var c = (t, s, e) => p(t, typeof s != "symbol" ? s + "" : s, e);
function b(t, s) {
  return t < s ? -1 : t > s ? 1 : 0;
}
class S {
  create(s) {
    return new EventSource(s.toString(), { withCredentials: !0 });
  }
}
const h = (t) => (t.includes("*") && (t = ["*"]), [...new Set(t)]), v = {
  handler: () => {
  },
  eventSourceFactory: new S()
}, f = {
  append: !0,
  types: ["message"]
};
class T {
  constructor(s, e = {}) {
    c(this, "subscribedTopics", []);
    c(this, "eventSource", null);
    c(this, "lastEventId", null);
    c(this, "options");
    this.hub = s, this.options = { ...v, ...e };
  }
  subscribe(s, e = {}) {
    const { append: n, types: i } = { ...f, ...e }, r = Array.isArray(s) ? s : [s];
    this.eventSource = this.connect(r, !n);
    const { handler: o } = this.options, a = (u) => {
      this.lastEventId = u.lastEventId;
      const l = JSON.parse(u.data);
      o(l, u);
    };
    if (i && i.length > 0)
      for (const u of i)
        this.eventSource.addEventListener(u, a);
  }
  unsubscribe(s) {
    const e = Array.isArray(s) ? s : [s], n = this.subscribedTopics.filter((i) => !e.includes(i));
    this.connect(n, !0);
  }
  connect(s, e) {
    const n = e ? [] : h(this.subscribedTopics), i = h(s), r = h([...n, ...i]);
    if (this.eventSource && r.length > 0 && b(n, r) === 0)
      return this.eventSource;
    if (this.eventSource && (this.eventSource.close(), r.length === 0))
      return this.eventSource;
    const o = { topic: r.join(",") };
    this.lastEventId !== null && (o.lastEventID = this.lastEventId);
    const a = this.hub + "?" + new URLSearchParams(o);
    return this.eventSource = this.options.eventSourceFactory.create(a), this.subscribedTopics = r, this.eventSource;
  }
}
const y = {
  resourceListener: (t) => (s) => Object.assign(t, s),
  subscribeOptions: {
    types: ["message"]
  }
};
class g {
  constructor(s, e = {}) {
    c(this, "mercure");
    c(this, "listeners", /* @__PURE__ */ new Map());
    c(this, "options");
    this.options = { ...y, ...e }, this.mercure = new T(s, {
      ...this.options,
      handler: (n, i) => {
        const r = this.listeners.get(n["@id"]);
        for (const o of r ?? [])
          o(n, i);
      }
    });
  }
  sync(s, e, n) {
    const i = e ?? s["@id"];
    this.listeners.has(s["@id"]) || (this.listeners.set(s["@id"], [this.options.resourceListener(s)]), this.mercure.subscribe(i, {
      ...this.options.subscribeOptions,
      ...n
    }));
  }
  on(s, e) {
    const n = this.listeners.get(s["@id"]) ?? [];
    n.push(e), this.listeners.set(s["@id"], [...new Set(n)]);
  }
  unsync(s) {
    this.listeners.delete(s["@id"]);
  }
}
export {
  f as DEFAULT_SUBSCRIBE_OPTIONS,
  S as DefaultEventSourceFactory,
  g as HydraSynchronizer,
  T as Mercure
};
