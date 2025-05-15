var l = Object.defineProperty;
var a = (s, e, t) => e in s ? l(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var i = (s, e, t) => a(s, typeof e != "symbol" ? e + "" : e, t);
function d(s, e) {
  return s < e ? -1 : s > e ? 1 : 0;
}
class S {
  create(e) {
    return new EventSource(e.toString());
  }
}
const u = (s) => (s.includes("*") && (s = ["*"]), [...new Set(s)]), v = {
  handler: () => {
  },
  eventSourceFactory: new S()
};
class b {
  constructor(e, t = {}) {
    i(this, "subscribedTopics", []);
    i(this, "eventSource", null);
    i(this, "lastEventId", null);
    i(this, "options");
    this.hub = e, this.options = { ...v, ...t };
  }
  subscribe(e, t = !0) {
    const r = Array.isArray(e) ? e : [e];
    this.eventSource = this.connect(r, !t);
    const { handler: c } = this.options;
    this.eventSource.onmessage = (n) => {
      this.lastEventId = n.lastEventId;
      const o = JSON.parse(n.data);
      c(o, n);
    };
  }
  unsubscribe(e) {
    const t = Array.isArray(e) ? e : [e], r = this.subscribedTopics.filter((c) => !t.includes(c));
    this.connect(r, !0);
  }
  connect(e, t) {
    const r = t ? [] : u(this.subscribedTopics), c = u(e), n = u([...r, ...c]);
    if (this.eventSource && n.length > 0 && d(r, n) === 0)
      return this.eventSource;
    if (this.eventSource && (this.eventSource.close(), n.length === 0))
      return this.eventSource;
    const o = { topics: n.join(",") };
    this.lastEventId !== null && (o.lastEventID = this.lastEventId);
    const h = this.hub + "?" + new URLSearchParams(o);
    return this.eventSource = this.options.eventSourceFactory.create(h), this.subscribedTopics = n, this.eventSource;
  }
}
const p = {
  resourceListener: (s) => (e) => Object.assign(s, e)
};
class f {
  constructor(e, t = {}) {
    i(this, "mercure");
    i(this, "listeners", /* @__PURE__ */ new Map());
    i(this, "options");
    this.options = { ...p, ...t }, this.mercure = new b(e, {
      ...this.options,
      handler: (r, c) => {
        const n = this.listeners.get(r["@id"]);
        n && n(r, c);
      }
    });
  }
  sync(e, t) {
    const r = t ?? e["@id"];
    this.listeners.has(e["@id"]) || (this.listeners.set(e["@id"], this.options.resourceListener(e)), this.mercure.subscribe(r));
  }
  unsync(e) {
    this.listeners.delete(e["@id"]);
  }
}
export {
  S as DefaultEventSourceFactory,
  f as HydraSynchronizer,
  b as Mercure
};
