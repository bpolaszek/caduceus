var l = Object.defineProperty;
var a = (t, e, s) => e in t ? l(t, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : t[e] = s;
var r = (t, e, s) => a(t, typeof e != "symbol" ? e + "" : e, s);
function d(t, e) {
  return t < e ? -1 : t > e ? 1 : 0;
}
class S {
  create(e) {
    return new EventSource(e.toString(), { withCredentials: !0 });
  }
}
const u = (t) => (t.includes("*") && (t = ["*"]), [...new Set(t)]), b = {
  handler: () => {
  },
  eventSourceFactory: new S()
};
class p {
  constructor(e, s = {}) {
    r(this, "subscribedTopics", []);
    r(this, "eventSource", null);
    r(this, "lastEventId", null);
    r(this, "options");
    this.hub = e, this.options = { ...b, ...s };
  }
  subscribe(e, s = !0) {
    const n = Array.isArray(e) ? e : [e];
    this.eventSource = this.connect(n, !s);
    const { handler: c } = this.options;
    this.eventSource.onmessage = (i) => {
      this.lastEventId = i.lastEventId;
      const o = JSON.parse(i.data);
      c(o, i);
    };
  }
  unsubscribe(e) {
    const s = Array.isArray(e) ? e : [e], n = this.subscribedTopics.filter((c) => !s.includes(c));
    this.connect(n, !0);
  }
  connect(e, s) {
    const n = s ? [] : u(this.subscribedTopics), c = u(e), i = u([...n, ...c]);
    if (this.eventSource && i.length > 0 && d(n, i) === 0)
      return this.eventSource;
    if (this.eventSource && (this.eventSource.close(), i.length === 0))
      return this.eventSource;
    const o = { topic: i.join(",") };
    this.lastEventId !== null && (o.lastEventID = this.lastEventId);
    const h = this.hub + "?" + new URLSearchParams(o);
    return this.eventSource = this.options.eventSourceFactory.create(h), this.subscribedTopics = i, this.eventSource;
  }
}
const v = {
  resourceListener: (t) => (e) => Object.assign(t, e)
};
class f {
  constructor(e, s = {}) {
    r(this, "mercure");
    r(this, "listeners", /* @__PURE__ */ new Map());
    r(this, "options");
    this.options = { ...v, ...s }, this.mercure = new p(e, {
      ...this.options,
      handler: (n, c) => {
        const i = this.listeners.get(n["@id"]);
        for (const o of i ?? [])
          o(n, c);
      }
    });
  }
  sync(e, s) {
    const n = s ?? e["@id"];
    this.listeners.has(e["@id"]) || (this.listeners.set(e["@id"], [this.options.resourceListener(e)]), this.mercure.subscribe(n));
  }
  on(e, s) {
    const n = this.listeners.get(e["@id"]) ?? [];
    n.push(s), this.listeners.set(e["@id"], [...new Set(n)]);
  }
  unsync(e) {
    this.listeners.delete(e["@id"]);
  }
}
export {
  S as DefaultEventSourceFactory,
  f as HydraSynchronizer,
  p as Mercure
};
