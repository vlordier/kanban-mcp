import { r as requireReact, g as getDefaultExportFromCjs, a as requireReactDom } from "./vendor-D_QSeeZk.js";
function _mergeNamespaces(n2, m2) {
  for (var i2 = 0; i2 < m2.length; i2++) {
    const e2 = m2[i2];
    if (typeof e2 !== "string" && !Array.isArray(e2)) {
      for (const k2 in e2) {
        if (k2 !== "default" && !(k2 in n2)) {
          const d2 = Object.getOwnPropertyDescriptor(e2, k2);
          if (d2) {
            Object.defineProperty(n2, k2, d2.get ? d2 : {
              enumerable: true,
              get: () => e2[k2]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n2, Symbol.toStringTag, { value: "Module" }));
}
var reactExports = requireReact();
const React = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
const t$4 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: React
}, [reactExports]);
var reactDomExports = requireReactDom();
var i$3 = Object.defineProperty;
var d$2 = (t2, e2, n2) => e2 in t2 ? i$3(t2, e2, { enumerable: true, configurable: true, writable: true, value: n2 }) : t2[e2] = n2;
var r$2 = (t2, e2, n2) => (d$2(t2, typeof e2 != "symbol" ? e2 + "" : e2, n2), n2);
let o$5 = class o {
  constructor() {
    r$2(this, "current", this.detect());
    r$2(this, "handoffState", "pending");
    r$2(this, "currentId", 0);
  }
  set(e2) {
    this.current !== e2 && (this.handoffState = "pending", this.currentId = 0, this.current = e2);
  }
  reset() {
    this.set(this.detect());
  }
  nextId() {
    return ++this.currentId;
  }
  get isServer() {
    return this.current === "server";
  }
  get isClient() {
    return this.current === "client";
  }
  detect() {
    return typeof window == "undefined" || typeof document == "undefined" ? "server" : "client";
  }
  handoff() {
    this.handoffState === "pending" && (this.handoffState = "complete");
  }
  get isHandoffComplete() {
    return this.handoffState === "complete";
  }
};
let s$5 = new o$5();
function o$4(n2) {
  var e2, r2;
  return s$5.isServer ? null : n2 ? "ownerDocument" in n2 ? n2.ownerDocument : "current" in n2 ? (r2 = (e2 = n2.current) == null ? void 0 : e2.ownerDocument) != null ? r2 : document : null : document;
}
function t$3(e2) {
  typeof queueMicrotask == "function" ? queueMicrotask(e2) : Promise.resolve().then(e2).catch((o3) => setTimeout(() => {
    throw o3;
  }));
}
function o$3() {
  let n2 = [], r2 = { addEventListener(e2, t2, s2, a3) {
    return e2.addEventListener(t2, s2, a3), r2.add(() => e2.removeEventListener(t2, s2, a3));
  }, requestAnimationFrame(...e2) {
    let t2 = requestAnimationFrame(...e2);
    return r2.add(() => cancelAnimationFrame(t2));
  }, nextFrame(...e2) {
    return r2.requestAnimationFrame(() => r2.requestAnimationFrame(...e2));
  }, setTimeout(...e2) {
    let t2 = setTimeout(...e2);
    return r2.add(() => clearTimeout(t2));
  }, microTask(...e2) {
    let t2 = { current: true };
    return t$3(() => {
      t2.current && e2[0]();
    }), r2.add(() => {
      t2.current = false;
    });
  }, style(e2, t2, s2) {
    let a3 = e2.style.getPropertyValue(t2);
    return Object.assign(e2.style, { [t2]: s2 }), this.add(() => {
      Object.assign(e2.style, { [t2]: a3 });
    });
  }, group(e2) {
    let t2 = o$3();
    return e2(t2), this.add(() => t2.dispose());
  }, add(e2) {
    return n2.includes(e2) || n2.push(e2), () => {
      let t2 = n2.indexOf(e2);
      if (t2 >= 0) for (let s2 of n2.splice(t2, 1)) s2();
    };
  }, dispose() {
    for (let e2 of n2.splice(0)) e2();
  } };
  return r2;
}
function p$2() {
  let [e2] = reactExports.useState(o$3);
  return reactExports.useEffect(() => () => e2.dispose(), [e2]), e2;
}
let n$3 = (e2, t2) => {
  s$5.isServer ? reactExports.useEffect(e2, t2) : reactExports.useLayoutEffect(e2, t2);
};
function s$4(e2) {
  let r2 = reactExports.useRef(e2);
  return n$3(() => {
    r2.current = e2;
  }, [e2]), r2;
}
let o$2 = function(t2) {
  let e2 = s$4(t2);
  return React.useCallback((...r2) => e2.current(...r2), [e2]);
};
let e$2 = reactExports.createContext(void 0);
function a$a() {
  return reactExports.useContext(e$2);
}
function t$2(...r2) {
  return Array.from(new Set(r2.flatMap((n2) => typeof n2 == "string" ? n2.split(" ") : []))).filter(Boolean).join(" ");
}
function u$4(r2, n2, ...a3) {
  if (r2 in n2) {
    let e2 = n2[r2];
    return typeof e2 == "function" ? e2(...a3) : e2;
  }
  let t2 = new Error(`Tried to handle "${r2}" but there is no handler defined. Only defined handlers are: ${Object.keys(n2).map((e2) => `"${e2}"`).join(", ")}.`);
  throw Error.captureStackTrace && Error.captureStackTrace(t2, u$4), t2;
}
var O$3 = ((a3) => (a3[a3.None = 0] = "None", a3[a3.RenderStrategy = 1] = "RenderStrategy", a3[a3.Static = 2] = "Static", a3))(O$3 || {}), A$1 = ((e2) => (e2[e2.Unmount = 0] = "Unmount", e2[e2.Hidden = 1] = "Hidden", e2))(A$1 || {});
function L$1() {
  let n2 = U$2();
  return reactExports.useCallback((r2) => C$3({ mergeRefs: n2, ...r2 }), [n2]);
}
function C$3({ ourProps: n2, theirProps: r2, slot: e2, defaultTag: a3, features: s2, visible: t2 = true, name: l2, mergeRefs: i2 }) {
  i2 = i2 != null ? i2 : $$1;
  let o3 = P$1(r2, n2);
  if (t2) return F$1(o3, e2, a3, l2, i2);
  let y2 = s2 != null ? s2 : 0;
  if (y2 & 2) {
    let { static: f2 = false, ...u2 } = o3;
    if (f2) return F$1(u2, e2, a3, l2, i2);
  }
  if (y2 & 1) {
    let { unmount: f2 = true, ...u2 } = o3;
    return u$4(f2 ? 0 : 1, { [0]() {
      return null;
    }, [1]() {
      return F$1({ ...u2, hidden: true, style: { display: "none" } }, e2, a3, l2, i2);
    } });
  }
  return F$1(o3, e2, a3, l2, i2);
}
function F$1(n2, r2 = {}, e2, a3, s2) {
  let { as: t2 = e2, children: l2, refName: i2 = "ref", ...o3 } = h$2(n2, ["unmount", "static"]), y2 = n2.ref !== void 0 ? { [i2]: n2.ref } : {}, f2 = typeof l2 == "function" ? l2(r2) : l2;
  "className" in o3 && o3.className && typeof o3.className == "function" && (o3.className = o3.className(r2)), o3["aria-labelledby"] && o3["aria-labelledby"] === o3.id && (o3["aria-labelledby"] = void 0);
  let u2 = {};
  if (r2) {
    let d2 = false, p2 = [];
    for (let [c2, T2] of Object.entries(r2)) typeof T2 == "boolean" && (d2 = true), T2 === true && p2.push(c2.replace(/([A-Z])/g, (g2) => `-${g2.toLowerCase()}`));
    if (d2) {
      u2["data-headlessui-state"] = p2.join(" ");
      for (let c2 of p2) u2[`data-${c2}`] = "";
    }
  }
  if (t2 === reactExports.Fragment && (Object.keys(m$4(o3)).length > 0 || Object.keys(m$4(u2)).length > 0)) if (!reactExports.isValidElement(f2) || Array.isArray(f2) && f2.length > 1) {
    if (Object.keys(m$4(o3)).length > 0) throw new Error(['Passing props on "Fragment"!', "", `The current component <${a3} /> is rendering a "Fragment".`, "However we need to passthrough the following props:", Object.keys(m$4(o3)).concat(Object.keys(m$4(u2))).map((d2) => `  - ${d2}`).join(`
`), "", "You can apply a few solutions:", ['Add an `as="..."` prop, to ensure that we render an actual element instead of a "Fragment".', "Render a single element as the child so that we can forward the props onto that element."].map((d2) => `  - ${d2}`).join(`
`)].join(`
`));
  } else {
    let d2 = f2.props, p2 = d2 == null ? void 0 : d2.className, c2 = typeof p2 == "function" ? (...R2) => t$2(p2(...R2), o3.className) : t$2(p2, o3.className), T2 = c2 ? { className: c2 } : {}, g2 = P$1(f2.props, m$4(h$2(o3, ["ref"])));
    for (let R2 in u2) R2 in g2 && delete u2[R2];
    return reactExports.cloneElement(f2, Object.assign({}, g2, u2, y2, { ref: s2(H$3(f2), y2.ref) }, T2));
  }
  return reactExports.createElement(t2, Object.assign({}, h$2(o3, ["ref"]), t2 !== reactExports.Fragment && y2, t2 !== reactExports.Fragment && u2), f2);
}
function U$2() {
  let n2 = reactExports.useRef([]), r2 = reactExports.useCallback((e2) => {
    for (let a3 of n2.current) a3 != null && (typeof a3 == "function" ? a3(e2) : a3.current = e2);
  }, []);
  return (...e2) => {
    if (!e2.every((a3) => a3 == null)) return n2.current = e2, r2;
  };
}
function $$1(...n2) {
  return n2.every((r2) => r2 == null) ? void 0 : (r2) => {
    for (let e2 of n2) e2 != null && (typeof e2 == "function" ? e2(r2) : e2.current = r2);
  };
}
function P$1(...n2) {
  if (n2.length === 0) return {};
  if (n2.length === 1) return n2[0];
  let r2 = {}, e2 = {};
  for (let s2 of n2) for (let t2 in s2) t2.startsWith("on") && typeof s2[t2] == "function" ? (e2[t2] != null || (e2[t2] = []), e2[t2].push(s2[t2])) : r2[t2] = s2[t2];
  if (r2.disabled || r2["aria-disabled"]) for (let s2 in e2) /^(on(?:Click|Pointer|Mouse|Key)(?:Down|Up|Press)?)$/.test(s2) && (e2[s2] = [(t2) => {
    var l2;
    return (l2 = t2 == null ? void 0 : t2.preventDefault) == null ? void 0 : l2.call(t2);
  }]);
  for (let s2 in e2) Object.assign(r2, { [s2](t2, ...l2) {
    let i2 = e2[s2];
    for (let o3 of i2) {
      if ((t2 instanceof Event || (t2 == null ? void 0 : t2.nativeEvent) instanceof Event) && t2.defaultPrevented) return;
      o3(t2, ...l2);
    }
  } });
  return r2;
}
function K(n2) {
  var r2;
  return Object.assign(reactExports.forwardRef(n2), { displayName: (r2 = n2.displayName) != null ? r2 : n2.name });
}
function m$4(n2) {
  let r2 = Object.assign({}, n2);
  for (let e2 in r2) r2[e2] === void 0 && delete r2[e2];
  return r2;
}
function h$2(n2, r2 = []) {
  let e2 = Object.assign({}, n2);
  for (let a3 of r2) a3 in e2 && delete e2[a3];
  return e2;
}
function H$3(n2) {
  return React.version.split(".")[0] >= "19" ? n2.props.ref : n2.ref;
}
let a$9 = "span";
var s$3 = ((e2) => (e2[e2.None = 1] = "None", e2[e2.Focusable = 2] = "Focusable", e2[e2.Hidden = 4] = "Hidden", e2))(s$3 || {});
function l$2(t2, r2) {
  var n2;
  let { features: d2 = 1, ...e2 } = t2, o3 = { ref: r2, "aria-hidden": (d2 & 2) === 2 ? true : (n2 = e2["aria-hidden"]) != null ? n2 : void 0, hidden: (d2 & 4) === 4 ? true : void 0, style: { position: "fixed", top: 1, left: 1, width: 1, height: 0, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: "0", ...(d2 & 4) === 4 && (d2 & 2) !== 2 && { display: "none" } } };
  return L$1()({ ourProps: o3, theirProps: e2, slot: {}, defaultTag: a$9, name: "Hidden" });
}
let f$6 = K(l$2);
let u$3 = Symbol();
function T$2(t2, n2 = true) {
  return Object.assign(t2, { [u$3]: n2 });
}
function y$2(...t2) {
  let n2 = reactExports.useRef(t2);
  reactExports.useEffect(() => {
    n2.current = t2;
  }, [t2]);
  let c2 = o$2((e2) => {
    for (let o3 of n2.current) o3 != null && (typeof o3 == "function" ? o3(e2) : o3.current = e2);
  });
  return t2.every((e2) => e2 == null || (e2 == null ? void 0 : e2[u$3])) ? void 0 : c2;
}
let a$8 = reactExports.createContext(null);
a$8.displayName = "DescriptionContext";
function f$5() {
  let r2 = reactExports.useContext(a$8);
  if (r2 === null) {
    let e2 = new Error("You used a <Description /> component, but it is not inside a relevant parent.");
    throw Error.captureStackTrace && Error.captureStackTrace(e2, f$5), e2;
  }
  return r2;
}
function w$3() {
  let [r2, e2] = reactExports.useState([]);
  return [r2.length > 0 ? r2.join(" ") : void 0, reactExports.useMemo(() => function(t2) {
    let i2 = o$2((n2) => (e2((s2) => [...s2, n2]), () => e2((s2) => {
      let o3 = s2.slice(), p2 = o3.indexOf(n2);
      return p2 !== -1 && o3.splice(p2, 1), o3;
    }))), l2 = reactExports.useMemo(() => ({ register: i2, slot: t2.slot, name: t2.name, props: t2.props, value: t2.value }), [i2, t2.slot, t2.name, t2.props, t2.value]);
    return React.createElement(a$8.Provider, { value: l2 }, t2.children);
  }, [e2])];
}
let S$1 = "p";
function C$2(r2, e2) {
  let d2 = reactExports.useId(), t2 = a$a(), { id: i2 = `headlessui-description-${d2}`, ...l2 } = r2, n2 = f$5(), s2 = y$2(e2);
  n$3(() => n2.register(i2), [i2, n2.register]);
  let o3 = t2 || false, p2 = reactExports.useMemo(() => ({ ...n2.slot, disabled: o3 }), [n2.slot, o3]), D2 = { ref: s2, ...n2.props, id: i2 };
  return L$1()({ ourProps: D2, theirProps: l2, slot: p2, defaultTag: S$1, name: n2.name || "Description" });
}
let _$1 = K(C$2), H$2 = Object.assign(_$1, {});
var o$1 = ((r2) => (r2.Space = " ", r2.Enter = "Enter", r2.Escape = "Escape", r2.Backspace = "Backspace", r2.Delete = "Delete", r2.ArrowLeft = "ArrowLeft", r2.ArrowUp = "ArrowUp", r2.ArrowRight = "ArrowRight", r2.ArrowDown = "ArrowDown", r2.Home = "Home", r2.End = "End", r2.PageUp = "PageUp", r2.PageDown = "PageDown", r2.Tab = "Tab", r2))(o$1 || {});
let e$1 = reactExports.createContext(() => {
});
function C$1({ value: t2, children: o3 }) {
  return React.createElement(e$1.Provider, { value: t2 }, o3);
}
let a$7 = class a extends Map {
  constructor(t2) {
    super();
    this.factory = t2;
  }
  get(t2) {
    let e2 = super.get(t2);
    return e2 === void 0 && (e2 = this.factory(t2), this.set(t2, e2)), e2;
  }
};
function a$6(o3, r2) {
  let t2 = o3(), n2 = /* @__PURE__ */ new Set();
  return { getSnapshot() {
    return t2;
  }, subscribe(e2) {
    return n2.add(e2), () => n2.delete(e2);
  }, dispatch(e2, ...s2) {
    let i2 = r2[e2].call(t2, ...s2);
    i2 && (t2 = i2, n2.forEach((c2) => c2()));
  } };
}
function o2(t2) {
  return reactExports.useSyncExternalStore(t2.subscribe, t2.getSnapshot, t2.getSnapshot);
}
let p$1 = new a$7(() => a$6(() => [], { ADD(r2) {
  return this.includes(r2) ? this : [...this, r2];
}, REMOVE(r2) {
  let e2 = this.indexOf(r2);
  if (e2 === -1) return this;
  let t2 = this.slice();
  return t2.splice(e2, 1), t2;
} }));
function x$2(r2, e2) {
  let t2 = p$1.get(e2), i2 = reactExports.useId(), h2 = o2(t2);
  if (n$3(() => {
    if (r2) return t2.dispatch("ADD", i2), () => t2.dispatch("REMOVE", i2);
  }, [t2, r2]), !r2) return false;
  let s2 = h2.indexOf(i2), o$12 = h2.length;
  return s2 === -1 && (s2 = o$12, o$12 += 1), s2 === o$12 - 1;
}
let f$4 = /* @__PURE__ */ new Map(), u$2 = /* @__PURE__ */ new Map();
function h$1(t2) {
  var e2;
  let r2 = (e2 = u$2.get(t2)) != null ? e2 : 0;
  return u$2.set(t2, r2 + 1), r2 !== 0 ? () => m$3(t2) : (f$4.set(t2, { "aria-hidden": t2.getAttribute("aria-hidden"), inert: t2.inert }), t2.setAttribute("aria-hidden", "true"), t2.inert = true, () => m$3(t2));
}
function m$3(t2) {
  var i2;
  let r2 = (i2 = u$2.get(t2)) != null ? i2 : 1;
  if (r2 === 1 ? u$2.delete(t2) : u$2.set(t2, r2 - 1), r2 !== 1) return;
  let e2 = f$4.get(t2);
  e2 && (e2["aria-hidden"] === null ? t2.removeAttribute("aria-hidden") : t2.setAttribute("aria-hidden", e2["aria-hidden"]), t2.inert = e2.inert, f$4.delete(t2));
}
function y$1(t2, { allowed: r2, disallowed: e2 } = {}) {
  let i2 = x$2(t2, "inert-others");
  n$3(() => {
    var d2, c2;
    if (!i2) return;
    let a3 = o$3();
    for (let n2 of (d2 = e2 == null ? void 0 : e2()) != null ? d2 : []) n2 && a3.add(h$1(n2));
    let s2 = (c2 = r2 == null ? void 0 : r2()) != null ? c2 : [];
    for (let n2 of s2) {
      if (!n2) continue;
      let l2 = o$4(n2);
      if (!l2) continue;
      let o3 = n2.parentElement;
      for (; o3 && o3 !== l2.body; ) {
        for (let p2 of o3.children) s2.some((E2) => p2.contains(E2)) || a3.add(h$1(p2));
        o3 = o3.parentElement;
      }
    }
    return a3.dispose;
  }, [i2, r2, e2]);
}
function m$2(s2, n2, l2) {
  let i2 = s$4((t2) => {
    let e2 = t2.getBoundingClientRect();
    e2.x === 0 && e2.y === 0 && e2.width === 0 && e2.height === 0 && l2();
  });
  reactExports.useEffect(() => {
    if (!s2) return;
    let t2 = n2 === null ? null : n2 instanceof HTMLElement ? n2 : n2.current;
    if (!t2) return;
    let e2 = o$3();
    if (typeof ResizeObserver != "undefined") {
      let r2 = new ResizeObserver(() => i2.current(t2));
      r2.observe(t2), e2.add(() => r2.disconnect());
    }
    if (typeof IntersectionObserver != "undefined") {
      let r2 = new IntersectionObserver(() => i2.current(t2));
      r2.observe(t2), e2.add(() => r2.disconnect());
    }
    return () => e2.dispose();
  }, [n2, i2, s2]);
}
let f$3 = ["[contentEditable=true]", "[tabindex]", "a[href]", "area[href]", "button:not([disabled])", "iframe", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])"].map((e2) => `${e2}:not([tabindex='-1'])`).join(","), p = ["[data-autofocus]"].map((e2) => `${e2}:not([tabindex='-1'])`).join(",");
var F = ((n2) => (n2[n2.First = 1] = "First", n2[n2.Previous = 2] = "Previous", n2[n2.Next = 4] = "Next", n2[n2.Last = 8] = "Last", n2[n2.WrapAround = 16] = "WrapAround", n2[n2.NoScroll = 32] = "NoScroll", n2[n2.AutoFocus = 64] = "AutoFocus", n2))(F || {}), T$1 = ((o3) => (o3[o3.Error = 0] = "Error", o3[o3.Overflow = 1] = "Overflow", o3[o3.Success = 2] = "Success", o3[o3.Underflow = 3] = "Underflow", o3))(T$1 || {}), y = ((t2) => (t2[t2.Previous = -1] = "Previous", t2[t2.Next = 1] = "Next", t2))(y || {});
function b$2(e2 = document.body) {
  return e2 == null ? [] : Array.from(e2.querySelectorAll(f$3)).sort((r2, t2) => Math.sign((r2.tabIndex || Number.MAX_SAFE_INTEGER) - (t2.tabIndex || Number.MAX_SAFE_INTEGER)));
}
function S(e2 = document.body) {
  return e2 == null ? [] : Array.from(e2.querySelectorAll(p)).sort((r2, t2) => Math.sign((r2.tabIndex || Number.MAX_SAFE_INTEGER) - (t2.tabIndex || Number.MAX_SAFE_INTEGER)));
}
var h = ((t2) => (t2[t2.Strict = 0] = "Strict", t2[t2.Loose = 1] = "Loose", t2))(h || {});
function A(e2, r2 = 0) {
  var t2;
  return e2 === ((t2 = o$4(e2)) == null ? void 0 : t2.body) ? false : u$4(r2, { [0]() {
    return e2.matches(f$3);
  }, [1]() {
    let u2 = e2;
    for (; u2 !== null; ) {
      if (u2.matches(f$3)) return true;
      u2 = u2.parentElement;
    }
    return false;
  } });
}
var H$1 = ((t2) => (t2[t2.Keyboard = 0] = "Keyboard", t2[t2.Mouse = 1] = "Mouse", t2))(H$1 || {});
typeof window != "undefined" && typeof document != "undefined" && (document.addEventListener("keydown", (e2) => {
  e2.metaKey || e2.altKey || e2.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
}, true), document.addEventListener("click", (e2) => {
  e2.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e2.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
}, true));
function I$2(e2) {
  e2 == null || e2.focus({ preventScroll: true });
}
let w$2 = ["textarea", "input"].join(",");
function O$2(e2) {
  var r2, t2;
  return (t2 = (r2 = e2 == null ? void 0 : e2.matches) == null ? void 0 : r2.call(e2, w$2)) != null ? t2 : false;
}
function _(e2, r2 = (t2) => t2) {
  return e2.slice().sort((t2, u2) => {
    let o3 = r2(t2), c2 = r2(u2);
    if (o3 === null || c2 === null) return 0;
    let l2 = o3.compareDocumentPosition(c2);
    return l2 & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : l2 & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
  });
}
function P(e2, r2, { sorted: t2 = true, relativeTo: u2 = null, skipElements: o3 = [] } = {}) {
  let c2 = Array.isArray(e2) ? e2.length > 0 ? e2[0].ownerDocument : document : e2.ownerDocument, l2 = Array.isArray(e2) ? t2 ? _(e2) : e2 : r2 & 64 ? S(e2) : b$2(e2);
  o3.length > 0 && l2.length > 1 && (l2 = l2.filter((s2) => !o3.some((a3) => a3 != null && "current" in a3 ? (a3 == null ? void 0 : a3.current) === s2 : a3 === s2))), u2 = u2 != null ? u2 : c2.activeElement;
  let n2 = (() => {
    if (r2 & 5) return 1;
    if (r2 & 10) return -1;
    throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
  })(), x2 = (() => {
    if (r2 & 1) return 0;
    if (r2 & 2) return Math.max(0, l2.indexOf(u2)) - 1;
    if (r2 & 4) return Math.max(0, l2.indexOf(u2)) + 1;
    if (r2 & 8) return l2.length - 1;
    throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
  })(), M2 = r2 & 32 ? { preventScroll: true } : {}, m2 = 0, d2 = l2.length, i2;
  do {
    if (m2 >= d2 || m2 + d2 <= 0) return 0;
    let s2 = x2 + m2;
    if (r2 & 16) s2 = (s2 + d2) % d2;
    else {
      if (s2 < 0) return 3;
      if (s2 >= d2) return 1;
    }
    i2 = l2[s2], i2 == null || i2.focus(M2), m2 += n2;
  } while (i2 !== c2.activeElement);
  return r2 & 6 && O$2(i2) && i2.select(), 2;
}
function t$1() {
  return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
}
function i$2() {
  return /Android/gi.test(window.navigator.userAgent);
}
function n$2() {
  return t$1() || i$2();
}
function i$1(t2, e2, o3, n2) {
  let u2 = s$4(o3);
  reactExports.useEffect(() => {
    if (!t2) return;
    function r2(m2) {
      u2.current(m2);
    }
    return document.addEventListener(e2, r2, n2), () => document.removeEventListener(e2, r2, n2);
  }, [t2, e2, n2]);
}
function s$2(t2, e2, o3, n2) {
  let i2 = s$4(o3);
  reactExports.useEffect(() => {
    if (!t2) return;
    function r2(d2) {
      i2.current(d2);
    }
    return window.addEventListener(e2, r2, n2), () => window.removeEventListener(e2, r2, n2);
  }, [t2, e2, n2]);
}
const E$1 = 30;
function R$2(p2, f2, C2) {
  let u2 = x$2(p2, "outside-click"), m2 = s$4(C2), s2 = reactExports.useCallback(function(e2, n2) {
    if (e2.defaultPrevented) return;
    let r2 = n2(e2);
    if (r2 === null || !r2.getRootNode().contains(r2) || !r2.isConnected) return;
    let h$12 = function l2(o3) {
      return typeof o3 == "function" ? l2(o3()) : Array.isArray(o3) || o3 instanceof Set ? o3 : [o3];
    }(f2);
    for (let l2 of h$12) if (l2 !== null && (l2.contains(r2) || e2.composed && e2.composedPath().includes(l2))) return;
    return !A(r2, h.Loose) && r2.tabIndex !== -1 && e2.preventDefault(), m2.current(e2, r2);
  }, [m2, f2]), i2 = reactExports.useRef(null);
  i$1(u2, "pointerdown", (t2) => {
    var e2, n2;
    i2.current = ((n2 = (e2 = t2.composedPath) == null ? void 0 : e2.call(t2)) == null ? void 0 : n2[0]) || t2.target;
  }, true), i$1(u2, "mousedown", (t2) => {
    var e2, n2;
    i2.current = ((n2 = (e2 = t2.composedPath) == null ? void 0 : e2.call(t2)) == null ? void 0 : n2[0]) || t2.target;
  }, true), i$1(u2, "click", (t2) => {
    n$2() || i2.current && (s2(t2, () => i2.current), i2.current = null);
  }, true);
  let a3 = reactExports.useRef({ x: 0, y: 0 });
  i$1(u2, "touchstart", (t2) => {
    a3.current.x = t2.touches[0].clientX, a3.current.y = t2.touches[0].clientY;
  }, true), i$1(u2, "touchend", (t2) => {
    let e2 = { x: t2.changedTouches[0].clientX, y: t2.changedTouches[0].clientY };
    if (!(Math.abs(e2.x - a3.current.x) >= E$1 || Math.abs(e2.y - a3.current.y) >= E$1)) return s2(t2, () => t2.target instanceof HTMLElement ? t2.target : null);
  }, true), s$2(u2, "blur", (t2) => s2(t2, () => window.document.activeElement instanceof HTMLIFrameElement ? window.document.activeElement : null), true);
}
function n$1(...e2) {
  return reactExports.useMemo(() => o$4(...e2), [...e2]);
}
function E(n2, e2, a3, t2) {
  let i2 = s$4(a3);
  reactExports.useEffect(() => {
    n2 = n2 != null ? n2 : window;
    function r2(o3) {
      i2.current(o3);
    }
    return n2.addEventListener(e2, r2, t2), () => n2.removeEventListener(e2, r2, t2);
  }, [n2, e2, t2]);
}
function d$1() {
  let r2;
  return { before({ doc: e2 }) {
    var l2;
    let o3 = e2.documentElement, t2 = (l2 = e2.defaultView) != null ? l2 : window;
    r2 = Math.max(0, t2.innerWidth - o3.clientWidth);
  }, after({ doc: e2, d: o3 }) {
    let t2 = e2.documentElement, l2 = Math.max(0, t2.clientWidth - t2.offsetWidth), n2 = Math.max(0, r2 - l2);
    o3.style(t2, "paddingRight", `${n2}px`);
  } };
}
function d() {
  return t$1() ? { before({ doc: r2, d: n2, meta: c2 }) {
    function o3(a3) {
      return c2.containers.flatMap((l2) => l2()).some((l2) => l2.contains(a3));
    }
    n2.microTask(() => {
      var s2;
      if (window.getComputedStyle(r2.documentElement).scrollBehavior !== "auto") {
        let t2 = o$3();
        t2.style(r2.documentElement, "scrollBehavior", "auto"), n2.add(() => n2.microTask(() => t2.dispose()));
      }
      let a3 = (s2 = window.scrollY) != null ? s2 : window.pageYOffset, l2 = null;
      n2.addEventListener(r2, "click", (t2) => {
        if (t2.target instanceof HTMLElement) try {
          let e2 = t2.target.closest("a");
          if (!e2) return;
          let { hash: f2 } = new URL(e2.href), i2 = r2.querySelector(f2);
          i2 && !o3(i2) && (l2 = i2);
        } catch {
        }
      }, true), n2.addEventListener(r2, "touchstart", (t2) => {
        if (t2.target instanceof HTMLElement) if (o3(t2.target)) {
          let e2 = t2.target;
          for (; e2.parentElement && o3(e2.parentElement); ) e2 = e2.parentElement;
          n2.style(e2, "overscrollBehavior", "contain");
        } else n2.style(t2.target, "touchAction", "none");
      }), n2.addEventListener(r2, "touchmove", (t2) => {
        if (t2.target instanceof HTMLElement) {
          if (t2.target.tagName === "INPUT") return;
          if (o3(t2.target)) {
            let e2 = t2.target;
            for (; e2.parentElement && e2.dataset.headlessuiPortal !== "" && !(e2.scrollHeight > e2.clientHeight || e2.scrollWidth > e2.clientWidth); ) e2 = e2.parentElement;
            e2.dataset.headlessuiPortal === "" && t2.preventDefault();
          } else t2.preventDefault();
        }
      }, { passive: false }), n2.add(() => {
        var e2;
        let t2 = (e2 = window.scrollY) != null ? e2 : window.pageYOffset;
        a3 !== t2 && window.scrollTo(0, a3), l2 && l2.isConnected && (l2.scrollIntoView({ block: "nearest" }), l2 = null);
      });
    });
  } } : {};
}
function r$1() {
  return { before({ doc: e2, d: o3 }) {
    o3.style(e2.documentElement, "overflow", "hidden");
  } };
}
function m$1(e2) {
  let n2 = {};
  for (let t2 of e2) Object.assign(n2, t2(n2));
  return n2;
}
let a$5 = a$6(() => /* @__PURE__ */ new Map(), { PUSH(e2, n2) {
  var o3;
  let t2 = (o3 = this.get(e2)) != null ? o3 : { doc: e2, count: 0, d: o$3(), meta: /* @__PURE__ */ new Set() };
  return t2.count++, t2.meta.add(n2), this.set(e2, t2), this;
}, POP(e2, n2) {
  let t2 = this.get(e2);
  return t2 && (t2.count--, t2.meta.delete(n2)), this;
}, SCROLL_PREVENT({ doc: e2, d: n2, meta: t2 }) {
  let o3 = { doc: e2, d: n2, meta: m$1(t2) }, c2 = [d(), d$1(), r$1()];
  c2.forEach(({ before: r2 }) => r2 == null ? void 0 : r2(o3)), c2.forEach(({ after: r2 }) => r2 == null ? void 0 : r2(o3));
}, SCROLL_ALLOW({ d: e2 }) {
  e2.dispose();
}, TEARDOWN({ doc: e2 }) {
  this.delete(e2);
} });
a$5.subscribe(() => {
  let e2 = a$5.getSnapshot(), n2 = /* @__PURE__ */ new Map();
  for (let [t2] of e2) n2.set(t2, t2.documentElement.style.overflow);
  for (let t2 of e2.values()) {
    let o3 = n2.get(t2.doc) === "hidden", c2 = t2.count !== 0;
    (c2 && !o3 || !c2 && o3) && a$5.dispatch(t2.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", t2), t2.count === 0 && a$5.dispatch("TEARDOWN", t2);
  }
});
function a$4(r2, e2, n2 = () => ({ containers: [] })) {
  let f2 = o2(a$5), o$12 = e2 ? f2.get(e2) : void 0, i2 = o$12 ? o$12.count > 0 : false;
  return n$3(() => {
    if (!(!e2 || !r2)) return a$5.dispatch("PUSH", e2, n2), () => a$5.dispatch("POP", e2, n2);
  }, [r2, e2]), i2;
}
function f$2(e2, c2, n2 = () => [document.body]) {
  let r2 = x$2(e2, "scroll-lock");
  a$4(r2, c2, (t2) => {
    var o3;
    return { containers: [...(o3 = t2.containers) != null ? o3 : [], n2] };
  });
}
function c$2(u2 = 0) {
  let [t2, l2] = reactExports.useState(u2), g2 = reactExports.useCallback((e2) => l2(e2), [t2]), s2 = reactExports.useCallback((e2) => l2((a3) => a3 | e2), [t2]), m2 = reactExports.useCallback((e2) => (t2 & e2) === e2, [t2]), n2 = reactExports.useCallback((e2) => l2((a3) => a3 & ~e2), [l2]), F2 = reactExports.useCallback((e2) => l2((a3) => a3 ^ e2), [l2]);
  return { flags: t2, setFlag: g2, addFlag: s2, hasFlag: m2, removeFlag: n2, toggleFlag: F2 };
}
var define_process_env_default = {};
var T, b$1;
typeof process != "undefined" && typeof globalThis != "undefined" && typeof Element != "undefined" && ((T = process == null ? void 0 : define_process_env_default) == null ? void 0 : T["NODE_ENV"]) === "test" && typeof ((b$1 = Element == null ? void 0 : Element.prototype) == null ? void 0 : b$1.getAnimations) == "undefined" && (Element.prototype.getAnimations = function() {
  return console.warn(["Headless UI has polyfilled `Element.prototype.getAnimations` for your tests.", "Please install a proper polyfill e.g. `jsdom-testing-mocks`, to silence these warnings.", "", "Example usage:", "```js", "import { mockAnimationsApi } from 'jsdom-testing-mocks'", "mockAnimationsApi()", "```"].join(`
`)), [];
});
var L = ((r2) => (r2[r2.None = 0] = "None", r2[r2.Closed = 1] = "Closed", r2[r2.Enter = 2] = "Enter", r2[r2.Leave = 4] = "Leave", r2))(L || {});
function R$1(t2) {
  let n2 = {};
  for (let e2 in t2) t2[e2] === true && (n2[`data-${e2}`] = "");
  return n2;
}
function x$1(t2, n2, e2, i2) {
  let [r2, o3] = reactExports.useState(e2), { hasFlag: s2, addFlag: a3, removeFlag: l2 } = c$2(t2 && r2 ? 3 : 0), u2 = reactExports.useRef(false), f2 = reactExports.useRef(false), E2 = p$2();
  return n$3(() => {
    var d2;
    if (t2) {
      if (e2 && o3(true), !n2) {
        e2 && a3(3);
        return;
      }
      return (d2 = i2 == null ? void 0 : i2.start) == null || d2.call(i2, e2), C(n2, { inFlight: u2, prepare() {
        f2.current ? f2.current = false : f2.current = u2.current, u2.current = true, !f2.current && (e2 ? (a3(3), l2(4)) : (a3(4), l2(2)));
      }, run() {
        f2.current ? e2 ? (l2(3), a3(4)) : (l2(4), a3(3)) : e2 ? l2(1) : a3(1);
      }, done() {
        var p2;
        f2.current && typeof n2.getAnimations == "function" && n2.getAnimations().length > 0 || (u2.current = false, l2(7), e2 || o3(false), (p2 = i2 == null ? void 0 : i2.end) == null || p2.call(i2, e2));
      } });
    }
  }, [t2, e2, n2, E2]), t2 ? [r2, { closed: s2(1), enter: s2(2), leave: s2(4), transition: s2(2) || s2(4) }] : [e2, { closed: void 0, enter: void 0, leave: void 0, transition: void 0 }];
}
function C(t2, { prepare: n2, run: e2, done: i2, inFlight: r2 }) {
  let o3 = o$3();
  return j$1(t2, { prepare: n2, inFlight: r2 }), o3.nextFrame(() => {
    e2(), o3.requestAnimationFrame(() => {
      o3.add(M$2(t2, i2));
    });
  }), o3.dispose;
}
function M$2(t2, n2) {
  var o3, s2;
  let e2 = o$3();
  if (!t2) return e2.dispose;
  let i2 = false;
  e2.add(() => {
    i2 = true;
  });
  let r2 = (s2 = (o3 = t2.getAnimations) == null ? void 0 : o3.call(t2).filter((a3) => a3 instanceof CSSTransition)) != null ? s2 : [];
  return r2.length === 0 ? (n2(), e2.dispose) : (Promise.allSettled(r2.map((a3) => a3.finished)).then(() => {
    i2 || n2();
  }), e2.dispose);
}
function j$1(t2, { inFlight: n2, prepare: e2 }) {
  if (n2 != null && n2.current) {
    e2();
    return;
  }
  let i2 = t2.style.transition;
  t2.style.transition = "none", e2(), t2.offsetHeight, t2.style.transition = i2;
}
function m(u2, t2) {
  let e2 = reactExports.useRef([]), r2 = o$2(u2);
  reactExports.useEffect(() => {
    let o3 = [...e2.current];
    for (let [a3, l2] of t2.entries()) if (e2.current[a3] !== l2) {
      let n2 = r2(t2, o3);
      return e2.current = t2, n2;
    }
  }, [r2, ...t2]);
}
let n = reactExports.createContext(null);
n.displayName = "OpenClosedContext";
var i = ((e2) => (e2[e2.Open = 1] = "Open", e2[e2.Closed = 2] = "Closed", e2[e2.Closing = 4] = "Closing", e2[e2.Opening = 8] = "Opening", e2))(i || {});
function u$1() {
  return reactExports.useContext(n);
}
function c$1({ value: o3, children: t2 }) {
  return React.createElement(n.Provider, { value: o3 }, t2);
}
function s$1({ children: o3 }) {
  return React.createElement(n.Provider, { value: null }, o3);
}
function t(n2) {
  function e2() {
    document.readyState !== "loading" && (n2(), document.removeEventListener("DOMContentLoaded", e2));
  }
  typeof window != "undefined" && typeof document != "undefined" && (document.addEventListener("DOMContentLoaded", e2), e2());
}
let r = [];
t(() => {
  function e2(t2) {
    if (!(t2.target instanceof HTMLElement) || t2.target === document.body || r[0] === t2.target) return;
    let n2 = t2.target;
    n2 = n2.closest(f$3), r.unshift(n2 != null ? n2 : t2.target), r = r.filter((o3) => o3 != null && o3.isConnected), r.splice(10);
  }
  window.addEventListener("click", e2, { capture: true }), window.addEventListener("mousedown", e2, { capture: true }), window.addEventListener("focus", e2, { capture: true }), document.body.addEventListener("click", e2, { capture: true }), document.body.addEventListener("mousedown", e2, { capture: true }), document.body.addEventListener("focus", e2, { capture: true });
});
function c(t2) {
  let r2 = o$2(t2), e2 = reactExports.useRef(false);
  reactExports.useEffect(() => (e2.current = false, () => {
    e2.current = true, t$3(() => {
      e2.current && r2();
    });
  }), [r2]);
}
function s() {
  let r2 = typeof document == "undefined";
  return "useSyncExternalStore" in t$4 ? ((o3) => o3.useSyncExternalStore)(t$4)(() => () => {
  }, () => false, () => !r2) : false;
}
function l$1() {
  let r2 = s(), [e2, n2] = reactExports.useState(s$5.isHandoffComplete);
  return e2 && s$5.isHandoffComplete === false && n2(false), reactExports.useEffect(() => {
    e2 !== true && n2(true);
  }, [e2]), reactExports.useEffect(() => s$5.handoff(), []), r2 ? false : e2;
}
let e = reactExports.createContext(false);
function a$3() {
  return reactExports.useContext(e);
}
function l(o3) {
  return React.createElement(e.Provider, { value: o3.force }, o3.children);
}
function j(e2) {
  let l2 = a$3(), o3 = reactExports.useContext(H), [r2, u2] = reactExports.useState(() => {
    var i2;
    if (!l2 && o3 !== null) return (i2 = o3.current) != null ? i2 : null;
    if (s$5.isServer) return null;
    let t2 = e2 == null ? void 0 : e2.getElementById("headlessui-portal-root");
    if (t2) return t2;
    if (e2 === null) return null;
    let a3 = e2.createElement("div");
    return a3.setAttribute("id", "headlessui-portal-root"), e2.body.appendChild(a3);
  });
  return reactExports.useEffect(() => {
    r2 !== null && (e2 != null && e2.body.contains(r2) || e2 == null || e2.body.appendChild(r2));
  }, [r2, e2]), reactExports.useEffect(() => {
    l2 || o3 !== null && u2(o3.current);
  }, [o3, u2, l2]), r2;
}
let M$1 = reactExports.Fragment, I$1 = K(function(l2, o3) {
  let { ownerDocument: r2 = null, ...u2 } = l2, t2 = reactExports.useRef(null), a3 = y$2(T$2((s2) => {
    t2.current = s2;
  }), o3), i2 = n$1(t2), f2 = r2 != null ? r2 : i2, p2 = j(f2), [n2] = reactExports.useState(() => {
    var s2;
    return s$5.isServer ? null : (s2 = f2 == null ? void 0 : f2.createElement("div")) != null ? s2 : null;
  }), P2 = reactExports.useContext(g), b2 = l$1();
  n$3(() => {
    !p2 || !n2 || p2.contains(n2) || (n2.setAttribute("data-headlessui-portal", ""), p2.appendChild(n2));
  }, [p2, n2]), n$3(() => {
    if (n2 && P2) return P2.register(n2);
  }, [P2, n2]), c(() => {
    var s2;
    !p2 || !n2 || (n2 instanceof Node && p2.contains(n2) && p2.removeChild(n2), p2.childNodes.length <= 0 && ((s2 = p2.parentElement) == null || s2.removeChild(p2)));
  });
  let h2 = L$1();
  return b2 ? !p2 || !n2 ? null : reactDomExports.createPortal(h2({ ourProps: { ref: a3 }, theirProps: u2, slot: {}, defaultTag: M$1, name: "Portal" }), n2) : null;
});
function J(e2, l2) {
  let o3 = y$2(l2), { enabled: r2 = true, ownerDocument: u2, ...t2 } = e2, a3 = L$1();
  return r2 ? React.createElement(I$1, { ...t2, ownerDocument: u2, ref: o3 }) : a3({ ourProps: { ref: o3 }, theirProps: t2, slot: {}, defaultTag: M$1, name: "Portal" });
}
let X$1 = reactExports.Fragment, H = reactExports.createContext(null);
function k$1(e2, l2) {
  let { target: o3, ...r2 } = e2, t2 = { ref: y$2(l2) }, a3 = L$1();
  return React.createElement(H.Provider, { value: o3 }, a3({ ourProps: t2, theirProps: r2, defaultTag: X$1, name: "Popover.Group" }));
}
let g = reactExports.createContext(null);
function le() {
  let e2 = reactExports.useContext(g), l2 = reactExports.useRef([]), o3 = o$2((t2) => (l2.current.push(t2), e2 && e2.register(t2), () => r2(t2))), r2 = o$2((t2) => {
    let a3 = l2.current.indexOf(t2);
    a3 !== -1 && l2.current.splice(a3, 1), e2 && e2.unregister(t2);
  }), u2 = reactExports.useMemo(() => ({ register: o3, unregister: r2, portals: l2 }), [o3, r2, l2]);
  return [l2, reactExports.useMemo(() => function({ children: a3 }) {
    return React.createElement(g.Provider, { value: u2 }, a3);
  }, [u2])];
}
let B = K(J), D$1 = K(k$1), oe = Object.assign(B, { Group: D$1 });
function a$2(o3, r2 = typeof document != "undefined" ? document.defaultView : null, t2) {
  let n2 = x$2(o3, "escape");
  E(r2, "keydown", (e2) => {
    n2 && (e2.defaultPrevented || e2.key === o$1.Escape && t2(e2));
  });
}
function f$1() {
  var t2;
  let [e2] = reactExports.useState(() => typeof window != "undefined" && typeof window.matchMedia == "function" ? window.matchMedia("(pointer: coarse)") : null), [o3, c2] = reactExports.useState((t2 = e2 == null ? void 0 : e2.matches) != null ? t2 : false);
  return n$3(() => {
    if (!e2) return;
    function n2(r2) {
      c2(r2.matches);
    }
    return e2.addEventListener("change", n2), () => e2.removeEventListener("change", n2);
  }, [e2]), o3;
}
function R({ defaultContainers: l2 = [], portals: n2, mainTreeNode: o3 } = {}) {
  let r2 = n$1(o3), u2 = o$2(() => {
    var i2, c2;
    let t2 = [];
    for (let e2 of l2) e2 !== null && (e2 instanceof HTMLElement ? t2.push(e2) : "current" in e2 && e2.current instanceof HTMLElement && t2.push(e2.current));
    if (n2 != null && n2.current) for (let e2 of n2.current) t2.push(e2);
    for (let e2 of (i2 = r2 == null ? void 0 : r2.querySelectorAll("html > *, body > *")) != null ? i2 : []) e2 !== document.body && e2 !== document.head && e2 instanceof HTMLElement && e2.id !== "headlessui-portal-root" && (o3 && (e2.contains(o3) || e2.contains((c2 = o3 == null ? void 0 : o3.getRootNode()) == null ? void 0 : c2.host)) || t2.some((m2) => e2.contains(m2)) || t2.push(e2));
    return t2;
  });
  return { resolveContainers: u2, contains: o$2((t2) => u2().some((i2) => i2.contains(t2))) };
}
let a$1 = reactExports.createContext(null);
function O$1({ children: l2, node: n2 }) {
  let [o3, r2] = reactExports.useState(null), u2 = b(n2 != null ? n2 : o3);
  return React.createElement(a$1.Provider, { value: u2 }, l2, u2 === null && React.createElement(f$6, { features: s$3.Hidden, ref: (t2) => {
    var i2, c2;
    if (t2) {
      for (let e2 of (c2 = (i2 = o$4(t2)) == null ? void 0 : i2.querySelectorAll("html > *, body > *")) != null ? c2 : []) if (e2 !== document.body && e2 !== document.head && e2 instanceof HTMLElement && e2 != null && e2.contains(t2)) {
        r2(e2);
        break;
      }
    }
  } }));
}
function b(l2 = null) {
  var n2;
  return (n2 = reactExports.useContext(a$1)) != null ? n2 : l2;
}
function f() {
  let e2 = reactExports.useRef(false);
  return n$3(() => (e2.current = true, () => {
    e2.current = false;
  }), []), e2;
}
var a2 = ((r2) => (r2[r2.Forwards = 0] = "Forwards", r2[r2.Backwards = 1] = "Backwards", r2))(a2 || {});
function u() {
  let e2 = reactExports.useRef(0);
  return s$2(true, "keydown", (r2) => {
    r2.key === "Tab" && (e2.current = r2.shiftKey ? 1 : 0);
  }, true), e2;
}
function U$1(o3) {
  if (!o3) return /* @__PURE__ */ new Set();
  if (typeof o3 == "function") return new Set(o3());
  let e2 = /* @__PURE__ */ new Set();
  for (let t2 of o3.current) t2.current instanceof HTMLElement && e2.add(t2.current);
  return e2;
}
let Z = "div";
var x = ((n2) => (n2[n2.None = 0] = "None", n2[n2.InitialFocus = 1] = "InitialFocus", n2[n2.TabLock = 2] = "TabLock", n2[n2.FocusLock = 4] = "FocusLock", n2[n2.RestoreFocus = 8] = "RestoreFocus", n2[n2.AutoFocus = 16] = "AutoFocus", n2))(x || {});
function $(o3, e2) {
  let t2 = reactExports.useRef(null), r2 = y$2(t2, e2), { initialFocus: s2, initialFocusFallback: a$12, containers: n2, features: u$12 = 15, ...f2 } = o3;
  l$1() || (u$12 = 0);
  let l2 = n$1(t2);
  ee(u$12, { ownerDocument: l2 });
  let i2 = te(u$12, { ownerDocument: l2, container: t2, initialFocus: s2, initialFocusFallback: a$12 });
  re(u$12, { ownerDocument: l2, container: t2, containers: n2, previousActiveElement: i2 });
  let R2 = u(), g2 = o$2((c2) => {
    let m2 = t2.current;
    if (!m2) return;
    ((G) => G())(() => {
      u$4(R2.current, { [a2.Forwards]: () => {
        P(m2, F.First, { skipElements: [c2.relatedTarget, a$12] });
      }, [a2.Backwards]: () => {
        P(m2, F.Last, { skipElements: [c2.relatedTarget, a$12] });
      } });
    });
  }), v = x$2(!!(u$12 & 2), "focus-trap#tab-lock"), N = p$2(), F$12 = reactExports.useRef(false), k2 = { ref: r2, onKeyDown(c2) {
    c2.key == "Tab" && (F$12.current = true, N.requestAnimationFrame(() => {
      F$12.current = false;
    }));
  }, onBlur(c2) {
    if (!(u$12 & 4)) return;
    let m2 = U$1(n2);
    t2.current instanceof HTMLElement && m2.add(t2.current);
    let d2 = c2.relatedTarget;
    d2 instanceof HTMLElement && d2.dataset.headlessuiFocusGuard !== "true" && (I(m2, d2) || (F$12.current ? P(t2.current, u$4(R2.current, { [a2.Forwards]: () => F.Next, [a2.Backwards]: () => F.Previous }) | F.WrapAround, { relativeTo: c2.target }) : c2.target instanceof HTMLElement && I$2(c2.target)));
  } }, B2 = L$1();
  return React.createElement(React.Fragment, null, v && React.createElement(f$6, { as: "button", type: "button", "data-headlessui-focus-guard": true, onFocus: g2, features: s$3.Focusable }), B2({ ourProps: k2, theirProps: f2, defaultTag: Z, name: "FocusTrap" }), v && React.createElement(f$6, { as: "button", type: "button", "data-headlessui-focus-guard": true, onFocus: g2, features: s$3.Focusable }));
}
let D = K($), ye = Object.assign(D, { features: x });
function w$1(o3 = true) {
  let e2 = reactExports.useRef(r.slice());
  return m(([t2], [r$12]) => {
    r$12 === true && t2 === false && t$3(() => {
      e2.current.splice(0);
    }), r$12 === false && t2 === true && (e2.current = r.slice());
  }, [o3, r, e2]), o$2(() => {
    var t2;
    return (t2 = e2.current.find((r2) => r2 != null && r2.isConnected)) != null ? t2 : null;
  });
}
function ee(o3, { ownerDocument: e2 }) {
  let t2 = !!(o3 & 8), r2 = w$1(t2);
  m(() => {
    t2 || (e2 == null ? void 0 : e2.activeElement) === (e2 == null ? void 0 : e2.body) && I$2(r2());
  }, [t2]), c(() => {
    t2 && I$2(r2());
  });
}
function te(o3, { ownerDocument: e2, container: t2, initialFocus: r2, initialFocusFallback: s2 }) {
  let a3 = reactExports.useRef(null), n2 = x$2(!!(o3 & 1), "focus-trap#initial-focus"), u2 = f();
  return m(() => {
    if (o3 === 0) return;
    if (!n2) {
      s2 != null && s2.current && I$2(s2.current);
      return;
    }
    let f2 = t2.current;
    f2 && t$3(() => {
      if (!u2.current) return;
      let l2 = e2 == null ? void 0 : e2.activeElement;
      if (r2 != null && r2.current) {
        if ((r2 == null ? void 0 : r2.current) === l2) {
          a3.current = l2;
          return;
        }
      } else if (f2.contains(l2)) {
        a3.current = l2;
        return;
      }
      if (r2 != null && r2.current) I$2(r2.current);
      else {
        if (o3 & 16) {
          if (P(f2, F.First | F.AutoFocus) !== T$1.Error) return;
        } else if (P(f2, F.First) !== T$1.Error) return;
        if (s2 != null && s2.current && (I$2(s2.current), (e2 == null ? void 0 : e2.activeElement) === s2.current)) return;
        console.warn("There are no focusable elements inside the <FocusTrap />");
      }
      a3.current = e2 == null ? void 0 : e2.activeElement;
    });
  }, [s2, n2, o3]), a3;
}
function re(o3, { ownerDocument: e2, container: t2, containers: r2, previousActiveElement: s2 }) {
  let a3 = f(), n2 = !!(o3 & 4);
  E(e2 == null ? void 0 : e2.defaultView, "focus", (u2) => {
    if (!n2 || !a3.current) return;
    let f2 = U$1(r2);
    t2.current instanceof HTMLElement && f2.add(t2.current);
    let l2 = s2.current;
    if (!l2) return;
    let i2 = u2.target;
    i2 && i2 instanceof HTMLElement ? I(f2, i2) ? (s2.current = i2, I$2(i2)) : (u2.preventDefault(), u2.stopPropagation(), I$2(l2)) : I$2(s2.current);
  }, true);
}
function I(o3, e2) {
  for (let t2 of o3) if (t2.contains(e2)) return true;
  return false;
}
function ue(e2) {
  var t2;
  return !!(e2.enter || e2.enterFrom || e2.enterTo || e2.leave || e2.leaveFrom || e2.leaveTo) || ((t2 = e2.as) != null ? t2 : de) !== reactExports.Fragment || React.Children.count(e2.children) === 1;
}
let w = reactExports.createContext(null);
w.displayName = "TransitionContext";
var _e = ((n2) => (n2.Visible = "visible", n2.Hidden = "hidden", n2))(_e || {});
function De() {
  let e2 = reactExports.useContext(w);
  if (e2 === null) throw new Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
  return e2;
}
function He$1() {
  let e2 = reactExports.useContext(M);
  if (e2 === null) throw new Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
  return e2;
}
let M = reactExports.createContext(null);
M.displayName = "NestingContext";
function U(e2) {
  return "children" in e2 ? U(e2.children) : e2.current.filter(({ el: t2 }) => t2.current !== null).filter(({ state: t2 }) => t2 === "visible").length > 0;
}
function Te(e2, t2) {
  let n2 = s$4(e2), l2 = reactExports.useRef([]), S2 = f(), R2 = p$2(), d2 = o$2((o3, i2 = A$1.Hidden) => {
    let a3 = l2.current.findIndex(({ el: s2 }) => s2 === o3);
    a3 !== -1 && (u$4(i2, { [A$1.Unmount]() {
      l2.current.splice(a3, 1);
    }, [A$1.Hidden]() {
      l2.current[a3].state = "hidden";
    } }), R2.microTask(() => {
      var s2;
      !U(l2) && S2.current && ((s2 = n2.current) == null || s2.call(n2));
    }));
  }), y2 = o$2((o3) => {
    let i2 = l2.current.find(({ el: a3 }) => a3 === o3);
    return i2 ? i2.state !== "visible" && (i2.state = "visible") : l2.current.push({ el: o3, state: "visible" }), () => d2(o3, A$1.Unmount);
  }), C2 = reactExports.useRef([]), p2 = reactExports.useRef(Promise.resolve()), h2 = reactExports.useRef({ enter: [], leave: [] }), g2 = o$2((o3, i2, a3) => {
    C2.current.splice(0), t2 && (t2.chains.current[i2] = t2.chains.current[i2].filter(([s2]) => s2 !== o3)), t2 == null || t2.chains.current[i2].push([o3, new Promise((s2) => {
      C2.current.push(s2);
    })]), t2 == null || t2.chains.current[i2].push([o3, new Promise((s2) => {
      Promise.all(h2.current[i2].map(([r2, f2]) => f2)).then(() => s2());
    })]), i2 === "enter" ? p2.current = p2.current.then(() => t2 == null ? void 0 : t2.wait.current).then(() => a3(i2)) : a3(i2);
  }), v = o$2((o3, i2, a3) => {
    Promise.all(h2.current[i2].splice(0).map(([s2, r2]) => r2)).then(() => {
      var s2;
      (s2 = C2.current.shift()) == null || s2();
    }).then(() => a3(i2));
  });
  return reactExports.useMemo(() => ({ children: l2, register: y2, unregister: d2, onStart: g2, onStop: v, wait: p2, chains: h2 }), [y2, d2, l2, g2, v, h2, p2]);
}
let de = reactExports.Fragment, fe = O$3.RenderStrategy;
function Ae(e2, t2) {
  var ee2, te2;
  let { transition: n2 = true, beforeEnter: l2, afterEnter: S2, beforeLeave: R2, afterLeave: d2, enter: y2, enterFrom: C2, enterTo: p2, entered: h2, leave: g2, leaveFrom: v, leaveTo: o3, ...i$12 } = e2, [a3, s2] = reactExports.useState(null), r2 = reactExports.useRef(null), f2 = ue(e2), j2 = y$2(...f2 ? [r2, t2, s2] : t2 === null ? [] : [t2]), H2 = (ee2 = i$12.unmount) == null || ee2 ? A$1.Unmount : A$1.Hidden, { show: u2, appear: z, initial: K2 } = De(), [m2, G] = reactExports.useState(u2 ? "visible" : "hidden"), Q = He$1(), { register: A2, unregister: I2 } = Q;
  n$3(() => A2(r2), [A2, r2]), n$3(() => {
    if (H2 === A$1.Hidden && r2.current) {
      if (u2 && m2 !== "visible") {
        G("visible");
        return;
      }
      return u$4(m2, { ["hidden"]: () => I2(r2), ["visible"]: () => A2(r2) });
    }
  }, [m2, r2, A2, I2, u2, H2]);
  let B2 = l$1();
  n$3(() => {
    if (f2 && B2 && m2 === "visible" && r2.current === null) throw new Error("Did you forget to passthrough the `ref` to the actual DOM node?");
  }, [r2, m2, B2, f2]);
  let ce = K2 && !z, Y = z && u2 && K2, W = reactExports.useRef(false), L2 = Te(() => {
    W.current || (G("hidden"), I2(r2));
  }, Q), Z2 = o$2((k2) => {
    W.current = true;
    let F2 = k2 ? "enter" : "leave";
    L2.onStart(r2, F2, (_2) => {
      _2 === "enter" ? l2 == null || l2() : _2 === "leave" && (R2 == null || R2());
    });
  }), $2 = o$2((k2) => {
    let F2 = k2 ? "enter" : "leave";
    W.current = false, L2.onStop(r2, F2, (_2) => {
      _2 === "enter" ? S2 == null || S2() : _2 === "leave" && (d2 == null || d2());
    }), F2 === "leave" && !U(L2) && (G("hidden"), I2(r2));
  });
  reactExports.useEffect(() => {
    f2 && n2 || (Z2(u2), $2(u2));
  }, [u2, f2, n2]);
  let pe = /* @__PURE__ */ (() => !(!n2 || !f2 || !B2 || ce))(), [, T2] = x$1(pe, a3, u2, { start: Z2, end: $2 }), Ce = m$4({ ref: j2, className: ((te2 = t$2(i$12.className, Y && y2, Y && C2, T2.enter && y2, T2.enter && T2.closed && C2, T2.enter && !T2.closed && p2, T2.leave && g2, T2.leave && !T2.closed && v, T2.leave && T2.closed && o3, !T2.transition && u2 && h2)) == null ? void 0 : te2.trim()) || void 0, ...R$1(T2) }), N = 0;
  m2 === "visible" && (N |= i.Open), m2 === "hidden" && (N |= i.Closed), u2 && m2 === "hidden" && (N |= i.Opening), !u2 && m2 === "visible" && (N |= i.Closing);
  let he2 = L$1();
  return React.createElement(M.Provider, { value: L2 }, React.createElement(c$1, { value: N }, he2({ ourProps: Ce, theirProps: i$12, defaultTag: de, features: fe, visible: m2 === "visible", name: "Transition.Child" })));
}
function Ie$1(e2, t2) {
  let { show: n2, appear: l2 = false, unmount: S2 = true, ...R2 } = e2, d2 = reactExports.useRef(null), y2 = ue(e2), C2 = y$2(...y2 ? [d2, t2] : t2 === null ? [] : [t2]);
  l$1();
  let p2 = u$1();
  if (n2 === void 0 && p2 !== null && (n2 = (p2 & i.Open) === i.Open), n2 === void 0) throw new Error("A <Transition /> is used but it is missing a `show={true | false}` prop.");
  let [h2, g2] = reactExports.useState(n2 ? "visible" : "hidden"), v = Te(() => {
    n2 || g2("hidden");
  }), [o3, i$12] = reactExports.useState(true), a3 = reactExports.useRef([n2]);
  n$3(() => {
    o3 !== false && a3.current[a3.current.length - 1] !== n2 && (a3.current.push(n2), i$12(false));
  }, [a3, n2]);
  let s2 = reactExports.useMemo(() => ({ show: n2, appear: l2, initial: o3 }), [n2, l2, o3]);
  n$3(() => {
    n2 ? g2("visible") : !U(v) && d2.current !== null && g2("hidden");
  }, [n2, v]);
  let r2 = { unmount: S2 }, f2 = o$2(() => {
    var u2;
    o3 && i$12(false), (u2 = e2.beforeEnter) == null || u2.call(e2);
  }), j2 = o$2(() => {
    var u2;
    o3 && i$12(false), (u2 = e2.beforeLeave) == null || u2.call(e2);
  }), H2 = L$1();
  return React.createElement(M.Provider, { value: v }, React.createElement(w.Provider, { value: s2 }, H2({ ourProps: { ...r2, as: reactExports.Fragment, children: React.createElement(me, { ref: C2, ...r2, ...R2, beforeEnter: f2, beforeLeave: j2 }) }, theirProps: {}, defaultTag: reactExports.Fragment, features: fe, visible: h2 === "visible", name: "Transition" })));
}
function Le(e2, t2) {
  let n2 = reactExports.useContext(w) !== null, l2 = u$1() !== null;
  return React.createElement(React.Fragment, null, !n2 && l2 ? React.createElement(X, { ref: t2, ...e2 }) : React.createElement(me, { ref: t2, ...e2 }));
}
let X = K(Ie$1), me = K(Ae), Fe = K(Le), ze = Object.assign(X, { Child: Fe, Root: X });
var Oe = ((o3) => (o3[o3.Open = 0] = "Open", o3[o3.Closed = 1] = "Closed", o3))(Oe || {}), he = ((t2) => (t2[t2.SetTitleId = 0] = "SetTitleId", t2))(he || {});
let Se = { [0](e2, t2) {
  return e2.titleId === t2.id ? e2 : { ...e2, titleId: t2.id };
} }, k = reactExports.createContext(null);
k.displayName = "DialogContext";
function O(e2) {
  let t2 = reactExports.useContext(k);
  if (t2 === null) {
    let o3 = new Error(`<${e2} /> is missing a parent <Dialog /> component.`);
    throw Error.captureStackTrace && Error.captureStackTrace(o3, O), o3;
  }
  return t2;
}
function Ie(e2, t2) {
  return u$4(t2.type, Se, e2, t2);
}
let V = K(function(t2, o3) {
  let a3 = reactExports.useId(), { id: l$22 = `headlessui-dialog-${a3}`, open: i$12, onClose: p2, initialFocus: d2, role: s2 = "dialog", autoFocus: f2 = true, __demoMode: u2 = false, unmount: P2 = false, ...h2 } = t2, R$12 = reactExports.useRef(false);
  s2 = function() {
    return s2 === "dialog" || s2 === "alertdialog" ? s2 : (R$12.current || (R$12.current = true, console.warn(`Invalid role [${s2}] passed to <Dialog />. Only \`dialog\` and and \`alertdialog\` are supported. Using \`dialog\` instead.`)), "dialog");
  }();
  let c2 = u$1();
  i$12 === void 0 && c2 !== null && (i$12 = (c2 & i.Open) === i.Open);
  let T2 = reactExports.useRef(null), S2 = y$2(T2, o3), F2 = n$1(T2), g2 = i$12 ? 0 : 1, [b$12, q] = reactExports.useReducer(Ie, { titleId: null, descriptionId: null, panelRef: reactExports.createRef() }), m2 = o$2(() => p2(false)), w2 = o$2((r2) => q({ type: 0, id: r2 })), D2 = l$1() ? g2 === 0 : false, [z, Q] = le(), Z2 = { get current() {
    var r2;
    return (r2 = b$12.panelRef.current) != null ? r2 : T2.current;
  } }, v = b(), { resolveContainers: I2 } = R({ mainTreeNode: v, portals: z, defaultContainers: [Z2] }), B2 = c2 !== null ? (c2 & i.Closing) === i.Closing : false;
  y$1(u2 || B2 ? false : D2, { allowed: o$2(() => {
    var r2, H2;
    return [(H2 = (r2 = T2.current) == null ? void 0 : r2.closest("[data-headlessui-portal]")) != null ? H2 : null];
  }), disallowed: o$2(() => {
    var r2;
    return [(r2 = v == null ? void 0 : v.closest("body > *:not(#headlessui-portal-root)")) != null ? r2 : null];
  }) }), R$2(D2, I2, (r2) => {
    r2.preventDefault(), m2();
  }), a$2(D2, F2 == null ? void 0 : F2.defaultView, (r2) => {
    r2.preventDefault(), r2.stopPropagation(), document.activeElement && "blur" in document.activeElement && typeof document.activeElement.blur == "function" && document.activeElement.blur(), m2();
  }), f$2(u2 || B2 ? false : D2, F2, I2), m$2(D2, T2, m2);
  let [ee2, te2] = w$3(), oe$1 = reactExports.useMemo(() => [{ dialogState: g2, close: m2, setTitleId: w2, unmount: P2 }, b$12], [g2, b$12, m2, w2, P2]), U2 = reactExports.useMemo(() => ({ open: g2 === 0 }), [g2]), ne = { ref: S2, id: l$22, role: s2, tabIndex: -1, "aria-modal": u2 ? void 0 : g2 === 0 ? true : void 0, "aria-labelledby": b$12.titleId, "aria-describedby": ee2, unmount: P2 }, re2 = !f$1(), y2 = x.None;
  D2 && !u2 && (y2 |= x.RestoreFocus, y2 |= x.TabLock, f2 && (y2 |= x.AutoFocus), re2 && (y2 |= x.InitialFocus));
  let le$1 = L$1();
  return React.createElement(s$1, null, React.createElement(l, { force: true }, React.createElement(oe, null, React.createElement(k.Provider, { value: oe$1 }, React.createElement(D$1, { target: T2 }, React.createElement(l, { force: false }, React.createElement(te2, { slot: U2 }, React.createElement(Q, null, React.createElement(ye, { initialFocus: d2, initialFocusFallback: T2, containers: I2, features: y2 }, React.createElement(C$1, { value: m2 }, le$1({ ourProps: ne, theirProps: h2, slot: U2, defaultTag: Me, features: Ge, visible: g2 === 0, name: "Dialog" })))))))))));
}), Me = "div", Ge = O$3.RenderStrategy | O$3.Static;
function ke(e2, t2) {
  let { transition: o3 = false, open: a3, ...l2 } = e2, i2 = u$1(), p2 = e2.hasOwnProperty("open") || i2 !== null, d2 = e2.hasOwnProperty("onClose");
  if (!p2 && !d2) throw new Error("You have to provide an `open` and an `onClose` prop to the `Dialog` component.");
  if (!p2) throw new Error("You provided an `onClose` prop to the `Dialog`, but forgot an `open` prop.");
  if (!d2) throw new Error("You provided an `open` prop to the `Dialog`, but forgot an `onClose` prop.");
  if (!i2 && typeof e2.open != "boolean") throw new Error(`You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${e2.open}`);
  if (typeof e2.onClose != "function") throw new Error(`You provided an \`onClose\` prop to the \`Dialog\`, but the value is not a function. Received: ${e2.onClose}`);
  return (a3 !== void 0 || o3) && !l2.static ? React.createElement(O$1, null, React.createElement(ze, { show: a3, transition: o3, unmount: l2.unmount }, React.createElement(V, { ref: t2, ...l2 }))) : React.createElement(O$1, null, React.createElement(V, { ref: t2, open: a3, ...l2 }));
}
let we = "div";
function Be(e2, t2) {
  let o3 = reactExports.useId(), { id: a3 = `headlessui-dialog-panel-${o3}`, transition: l2 = false, ...i2 } = e2, [{ dialogState: p2, unmount: d2 }, s2] = O("Dialog.Panel"), f2 = y$2(t2, s2.panelRef), u2 = reactExports.useMemo(() => ({ open: p2 === 0 }), [p2]), P2 = o$2((S2) => {
    S2.stopPropagation();
  }), h2 = { ref: f2, id: a3, onClick: P2 }, R2 = l2 ? Fe : reactExports.Fragment, c2 = l2 ? { unmount: d2 } : {}, T2 = L$1();
  return React.createElement(R2, { ...c2 }, T2({ ourProps: h2, theirProps: i2, slot: u2, defaultTag: we, name: "Dialog.Panel" }));
}
let Ue = "div";
function He(e2, t2) {
  let { transition: o3 = false, ...a3 } = e2, [{ dialogState: l2, unmount: i2 }] = O("Dialog.Backdrop"), p2 = reactExports.useMemo(() => ({ open: l2 === 0 }), [l2]), d2 = { ref: t2, "aria-hidden": true }, s2 = o3 ? Fe : reactExports.Fragment, f2 = o3 ? { unmount: i2 } : {}, u2 = L$1();
  return React.createElement(s2, { ...f2 }, u2({ ourProps: d2, theirProps: a3, slot: p2, defaultTag: Ue, name: "Dialog.Backdrop" }));
}
let Ne = "h2";
function We(e2, t2) {
  let o3 = reactExports.useId(), { id: a3 = `headlessui-dialog-title-${o3}`, ...l2 } = e2, [{ dialogState: i2, setTitleId: p2 }] = O("Dialog.Title"), d2 = y$2(t2);
  reactExports.useEffect(() => (p2(a3), () => p2(null)), [a3, p2]);
  let s2 = reactExports.useMemo(() => ({ open: i2 === 0 }), [i2]), f2 = { ref: d2, id: a3 };
  return L$1()({ ourProps: f2, theirProps: l2, slot: s2, defaultTag: Ne, name: "Dialog.Title" });
}
let $e = K(ke), je = K(Be);
K(He);
let Ye = K(We), yt = Object.assign($e, { Panel: je, Title: Ye, Description: H$2 });
export {
  React as R,
  Ye as Y,
  reactDomExports as a,
  je as j,
  reactExports as r,
  yt as y,
  ze as z
};
