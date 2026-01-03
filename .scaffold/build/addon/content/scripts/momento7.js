"use strict";
(() => {
  // node_modules/zotero-plugin-toolkit/dist/chunk-Cl8Af3a2.js
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all) __defProp(target, name, {
      get: all[name],
      enumerable: true
    });
  };

  // node_modules/zotero-plugin-toolkit/dist/index.js
  var version = "5.1.0-beta.13";
  var DebugBridge = class DebugBridge2 {
    static version = 2;
    static passwordPref = "extensions.zotero.debug-bridge.password";
    get version() {
      return DebugBridge2.version;
    }
    _disableDebugBridgePassword;
    get disableDebugBridgePassword() {
      return this._disableDebugBridgePassword;
    }
    set disableDebugBridgePassword(value) {
      this._disableDebugBridgePassword = value;
    }
    get password() {
      return BasicTool.getZotero().Prefs.get(DebugBridge2.passwordPref, true);
    }
    set password(v) {
      BasicTool.getZotero().Prefs.set(DebugBridge2.passwordPref, v, true);
    }
    constructor() {
      this._disableDebugBridgePassword = false;
      this.initializeDebugBridge();
    }
    static setModule(instance) {
      if (!instance.debugBridge?.version || instance.debugBridge.version < DebugBridge2.version) instance.debugBridge = new DebugBridge2();
    }
    initializeDebugBridge() {
      const debugBridgeExtension = {
        noContent: true,
        doAction: async (uri) => {
          const Zotero$1 = BasicTool.getZotero();
          const window$1 = Zotero$1.getMainWindow();
          const uriString = uri.spec.split("//").pop();
          if (!uriString) return;
          const params = {};
          uriString.split("?").pop()?.split("&").forEach((p) => {
            params[p.split("=")[0]] = decodeURIComponent(p.split("=")[1]);
          });
          const skipPasswordCheck = toolkitGlobal_default.getInstance()?.debugBridge.disableDebugBridgePassword;
          let allowed = false;
          if (skipPasswordCheck) allowed = true;
          else if (typeof params.password === "undefined" && typeof this.password === "undefined") allowed = window$1.confirm(`External App ${params.app} wants to execute command without password.
Command:
${(params.run || params.file || "").slice(0, 100)}
If you do not know what it is, please click Cancel to deny.`);
          else allowed = this.password === params.password;
          if (allowed) {
            if (params.run) try {
              const AsyncFunction = Object.getPrototypeOf(async () => {
              }).constructor;
              const f = new AsyncFunction("Zotero,window", params.run);
              await f(Zotero$1, window$1);
            } catch (e) {
              Zotero$1.debug(e);
              window$1.console.log(e);
            }
            if (params.file) try {
              Services.scriptloader.loadSubScript(params.file, {
                Zotero: Zotero$1,
                window: window$1
              });
            } catch (e) {
              Zotero$1.debug(e);
              window$1.console.log(e);
            }
          }
        },
        newChannel(uri) {
          this.doAction(uri);
        }
      };
      Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions["zotero://ztoolkit-debug"] = debugBridgeExtension;
    }
  };
  var PluginBridge = class PluginBridge2 {
    static version = 1;
    get version() {
      return PluginBridge2.version;
    }
    constructor() {
      this.initializePluginBridge();
    }
    static setModule(instance) {
      if (!instance.pluginBridge?.version || instance.pluginBridge.version < PluginBridge2.version) instance.pluginBridge = new PluginBridge2();
    }
    initializePluginBridge() {
      const { AddonManager } = _importESModule("resource://gre/modules/AddonManager.sys.mjs");
      const Zotero$1 = BasicTool.getZotero();
      const pluginBridgeExtension = {
        noContent: true,
        doAction: async (uri) => {
          try {
            const uriString = uri.spec.split("//").pop();
            if (!uriString) return;
            const params = {};
            uriString.split("?").pop()?.split("&").forEach((p) => {
              params[p.split("=")[0]] = decodeURIComponent(p.split("=")[1]);
            });
            if (params.action === "install" && params.url) {
              if (params.minVersion && Services.vc.compare(Zotero$1.version, params.minVersion) < 0 || params.maxVersion && Services.vc.compare(Zotero$1.version, params.maxVersion) > 0) throw new Error(`Plugin is not compatible with Zotero version ${Zotero$1.version}.The plugin requires Zotero version between ${params.minVersion} and ${params.maxVersion}.`);
              const addon2 = await AddonManager.getInstallForURL(params.url);
              if (addon2 && addon2.state === AddonManager.STATE_AVAILABLE) {
                addon2.install();
                hint("Plugin installed successfully.", true);
              } else throw new Error(`Plugin ${params.url} is not available.`);
            }
          } catch (e) {
            Zotero$1.logError(e);
            hint(e.message, false);
          }
        },
        newChannel(uri) {
          this.doAction(uri);
        }
      };
      Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions["zotero://plugin"] = pluginBridgeExtension;
    }
  };
  function hint(content, success) {
    const progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline("Plugin Toolkit");
    progressWindow.progress = new progressWindow.ItemProgress(success ? "chrome://zotero/skin/tick.png" : "chrome://zotero/skin/cross.png", content);
    progressWindow.progress.setProgress(100);
    progressWindow.show();
    progressWindow.startCloseTimer(5e3);
  }
  var ToolkitGlobal = class ToolkitGlobal2 {
    debugBridge;
    pluginBridge;
    prompt;
    currentWindow;
    constructor() {
      initializeModules(this);
      this.currentWindow = BasicTool.getZotero().getMainWindow();
    }
    /**
    * Get the global unique instance of `class ToolkitGlobal`.
    * @returns An instance of `ToolkitGlobal`.
    */
    static getInstance() {
      let _Zotero;
      try {
        if (typeof Zotero !== "undefined") _Zotero = Zotero;
        else _Zotero = BasicTool.getZotero();
      } catch {
      }
      if (!_Zotero) return void 0;
      let requireInit = false;
      if (!("_toolkitGlobal" in _Zotero)) {
        _Zotero._toolkitGlobal = new ToolkitGlobal2();
        requireInit = true;
      }
      const currentGlobal = _Zotero._toolkitGlobal;
      if (currentGlobal.currentWindow !== _Zotero.getMainWindow()) {
        checkWindowDependentModules(currentGlobal);
        requireInit = true;
      }
      if (requireInit) initializeModules(currentGlobal);
      return currentGlobal;
    }
  };
  function initializeModules(instance) {
    new BasicTool().log("Initializing ToolkitGlobal modules");
    setModule(instance, "prompt", {
      _ready: false,
      instance: void 0
    });
    DebugBridge.setModule(instance);
    PluginBridge.setModule(instance);
  }
  function setModule(instance, key, module) {
    if (!module) return;
    if (!instance[key]) instance[key] = module;
    for (const moduleKey in module) instance[key][moduleKey] ??= module[moduleKey];
  }
  function checkWindowDependentModules(instance) {
    instance.currentWindow = BasicTool.getZotero().getMainWindow();
    instance.prompt = void 0;
  }
  var toolkitGlobal_default = ToolkitGlobal;
  var BasicTool = class BasicTool2 {
    /**
    * configurations.
    */
    _basicOptions;
    _console;
    /**
    * @deprecated Use `patcherManager` instead.
    */
    patchSign = "zotero-plugin-toolkit@3.0.0";
    static _version = version;
    /**
    * Get version - checks subclass first, then falls back to parent
    */
    get _version() {
      return version;
    }
    get basicOptions() {
      return this._basicOptions;
    }
    /**
    *
    * @param data Pass an BasicTool instance to copy its options.
    */
    constructor(data) {
      this._basicOptions = {
        log: {
          _type: "toolkitlog",
          disableConsole: false,
          disableZLog: false,
          prefix: ""
        },
        get debug() {
          if (this._debug) return this._debug;
          this._debug = toolkitGlobal_default.getInstance()?.debugBridge || {
            disableDebugBridgePassword: false,
            password: ""
          };
          return this._debug;
        },
        api: { pluginID: "zotero-plugin-toolkit@windingwind.com" },
        listeners: {
          callbacks: {
            onMainWindowLoad: /* @__PURE__ */ new Set(),
            onMainWindowUnload: /* @__PURE__ */ new Set(),
            onPluginUnload: /* @__PURE__ */ new Set()
          },
          _mainWindow: void 0,
          _plugin: void 0
        }
      };
      try {
        if (typeof globalThis.ChromeUtils?.importESModule !== "undefined" || typeof globalThis.ChromeUtils?.import !== "undefined") {
          const { ConsoleAPI } = _importESModule("resource://gre/modules/Console.sys.mjs");
          this._console = new ConsoleAPI({ consoleID: `${this._basicOptions.api.pluginID}-${Date.now()}` });
        }
      } catch {
      }
      this.updateOptions(data);
    }
    getGlobal(k) {
      if (typeof globalThis[k] !== "undefined") return globalThis[k];
      const _Zotero = BasicTool2.getZotero();
      try {
        const window$1 = _Zotero.getMainWindow();
        switch (k) {
          case "Zotero":
          case "zotero":
            return _Zotero;
          case "window":
            return window$1;
          case "windows":
            return _Zotero.getMainWindows();
          case "document":
            return window$1.document;
          case "ZoteroPane":
          case "ZoteroPane_Local":
            return _Zotero.getActiveZoteroPane();
          default:
            return window$1[k];
        }
      } catch (e) {
        Zotero.logError(e);
      }
    }
    /**
    * If it's an XUL element
    * @param elem
    */
    isXULElement(elem) {
      return elem.namespaceURI === "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    }
    /**
    * Create an XUL element
    *
    * For Zotero 6, use `createElementNS`;
    *
    * For Zotero 7+, use `createXULElement`.
    * @param doc
    * @param type
    * @example
    * Create a `<menuitem>`:
    * ```ts
    * const compat = new ZoteroCompat();
    * const doc = compat.getWindow().document;
    * const elem = compat.createXULElement(doc, "menuitem");
    * ```
    */
    createXULElement(doc, type) {
      return doc.createXULElement(type);
    }
    /**
    * Output to both Zotero.debug and console.log
    * @param data e.g. string, number, object, ...
    */
    log(...data) {
      if (data.length === 0) return;
      let _Zotero;
      try {
        if (typeof Zotero !== "undefined") _Zotero = Zotero;
        else _Zotero = BasicTool2.getZotero();
      } catch {
      }
      let options;
      if (data[data.length - 1]?._type === "toolkitlog") options = data.pop();
      else options = this._basicOptions.log;
      try {
        if (options.prefix) data.splice(0, 0, options.prefix);
        if (!options.disableConsole) {
          let _console;
          if (typeof console !== "undefined") _console = console;
          else if (_Zotero) _console = _Zotero.getMainWindow()?.console;
          if (!_console) {
            if (!this._console) return;
            _console = this._console;
          }
          if (_console.groupCollapsed) _console.groupCollapsed(...data);
          else _console.group(...data);
          _console.trace();
          _console.groupEnd();
        }
        if (!options.disableZLog) {
          if (typeof _Zotero === "undefined") return;
          _Zotero.debug(data.map((d) => {
            try {
              return typeof d === "object" ? JSON.stringify(d) : String(d);
            } catch {
              _Zotero.debug(d);
              return "";
            }
          }).join("\n"));
        }
      } catch (e) {
        if (_Zotero) Zotero.logError(e);
        else console.error(e);
      }
    }
    /**
    * Patch a function
    * @deprecated Use {@link PatchHelper} instead.
    * @param object The owner of the function
    * @param funcSign The signature of the function(function name)
    * @param ownerSign The signature of patch owner to avoid patching again
    * @param patcher The new wrapper of the patched function
    */
    patch(object, funcSign, ownerSign, patcher) {
      if (object[funcSign][ownerSign]) throw new Error(`${String(funcSign)} re-patched`);
      this.log("patching", funcSign, `by ${ownerSign}`);
      object[funcSign] = patcher(object[funcSign]);
      object[funcSign][ownerSign] = true;
    }
    /**
    * Add a Zotero event listener callback
    * @param type Event type
    * @param callback Event callback
    */
    addListenerCallback(type, callback) {
      if (["onMainWindowLoad", "onMainWindowUnload"].includes(type)) this._ensureMainWindowListener();
      if (type === "onPluginUnload") this._ensurePluginListener();
      this._basicOptions.listeners.callbacks[type].add(callback);
    }
    /**
    * Remove a Zotero event listener callback
    * @param type Event type
    * @param callback Event callback
    */
    removeListenerCallback(type, callback) {
      this._basicOptions.listeners.callbacks[type].delete(callback);
      this._ensureRemoveListener();
    }
    /**
    * Remove all Zotero event listener callbacks when the last callback is removed.
    */
    _ensureRemoveListener() {
      const { listeners } = this._basicOptions;
      if (listeners._mainWindow && listeners.callbacks.onMainWindowLoad.size === 0 && listeners.callbacks.onMainWindowUnload.size === 0) {
        Services.wm.removeListener(listeners._mainWindow);
        delete listeners._mainWindow;
      }
      if (listeners._plugin && listeners.callbacks.onPluginUnload.size === 0) {
        Zotero.Plugins.removeObserver(listeners._plugin);
        delete listeners._plugin;
      }
    }
    /**
    * Ensure the main window listener is registered.
    */
    _ensureMainWindowListener() {
      if (this._basicOptions.listeners._mainWindow) return;
      const mainWindowListener = {
        onOpenWindow: (xulWindow) => {
          const domWindow = xulWindow.docShell.domWindow;
          const onload = async () => {
            domWindow.removeEventListener("load", onload, false);
            if (domWindow.location.href !== "chrome://zotero/content/zoteroPane.xhtml") return;
            for (const cbk of this._basicOptions.listeners.callbacks.onMainWindowLoad) try {
              cbk(domWindow);
            } catch (e) {
              this.log(e);
            }
          };
          domWindow.addEventListener("load", () => onload(), false);
        },
        onCloseWindow: async (xulWindow) => {
          const domWindow = xulWindow.docShell.domWindow;
          if (domWindow.location.href !== "chrome://zotero/content/zoteroPane.xhtml") return;
          for (const cbk of this._basicOptions.listeners.callbacks.onMainWindowUnload) try {
            cbk(domWindow);
          } catch (e) {
            this.log(e);
          }
        }
      };
      this._basicOptions.listeners._mainWindow = mainWindowListener;
      Services.wm.addListener(mainWindowListener);
    }
    /**
    * Ensure the plugin listener is registered.
    */
    _ensurePluginListener() {
      if (this._basicOptions.listeners._plugin) return;
      const pluginListener = { shutdown: (...args) => {
        for (const cbk of this._basicOptions.listeners.callbacks.onPluginUnload) try {
          cbk(...args);
        } catch (e) {
          this.log(e);
        }
      } };
      this._basicOptions.listeners._plugin = pluginListener;
      Zotero.Plugins.addObserver(pluginListener);
    }
    updateOptions(source) {
      if (!source) return this;
      if (source instanceof BasicTool2) this._basicOptions = source._basicOptions;
      else this._basicOptions = source;
      return this;
    }
    static getZotero() {
      if (typeof Zotero !== "undefined") return Zotero;
      const { Zotero: _Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");
      return _Zotero;
    }
  };
  var ManagerTool = class extends BasicTool {
    _ensureAutoUnregisterAll() {
      this.addListenerCallback("onPluginUnload", (params, _reason) => {
        if (params.id !== this.basicOptions.api.pluginID) return;
        this.unregisterAll();
      });
    }
  };
  function unregister(tools) {
    Object.values(tools).forEach((tool) => {
      if (tool instanceof ManagerTool || typeof tool?.unregisterAll === "function") tool.unregisterAll();
    });
  }
  function makeHelperTool(cls, options) {
    return new Proxy(cls, { construct(target, args) {
      const _origin = new cls(...args);
      if (_origin instanceof BasicTool) _origin.updateOptions(options);
      else _origin._version = BasicTool._version;
      return _origin;
    } });
  }
  function _importESModule(path) {
    if (typeof ChromeUtils.import === "undefined") return ChromeUtils.importESModule(path, { global: "contextual" });
    if (path.endsWith(".sys.mjs")) path = path.replace(/\.sys\.mjs$/, ".jsm");
    return ChromeUtils.import(path);
  }
  var ClipboardHelper = class extends BasicTool {
    transferable;
    clipboardService;
    filePath = "";
    constructor() {
      super();
      this.transferable = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
      this.clipboardService = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
      this.transferable.init(null);
    }
    addText(source, type = "text/plain") {
      const str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
      str.data = source;
      if (type === "text/unicode") type = "text/plain";
      this.transferable.addDataFlavor(type);
      this.transferable.setTransferData(type, str, source.length * 2);
      return this;
    }
    addImage(source) {
      const parts = source.split(",");
      if (!parts[0].includes("base64")) return this;
      const mime = parts[0].match(/:(.*?);/)[1];
      const bstr = this.getGlobal("window").atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const imgTools = Components.classes["@mozilla.org/image/tools;1"].getService(Components.interfaces.imgITools);
      let mimeType;
      let img;
      if (this.getGlobal("Zotero").platformMajorVersion >= 102) {
        img = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mime);
        mimeType = "application/x-moz-nativeimage";
      } else {
        mimeType = `image/png`;
        img = Components.classes["@mozilla.org/supports-interface-pointer;1"].createInstance(Components.interfaces.nsISupportsInterfacePointer);
        img.data = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mimeType);
      }
      this.transferable.addDataFlavor(mimeType);
      this.transferable.setTransferData(mimeType, img, 0);
      return this;
    }
    addFile(path) {
      const file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
      file.initWithPath(path);
      this.transferable.addDataFlavor("application/x-moz-file");
      this.transferable.setTransferData("application/x-moz-file", file);
      this.filePath = path;
      return this;
    }
    copy() {
      try {
        this.clipboardService.setData(this.transferable, null, Components.interfaces.nsIClipboard.kGlobalClipboard);
      } catch (e) {
        if (this.filePath && Zotero.isMac) Zotero.Utilities.Internal.exec(`/usr/bin/osascript`, [`-e`, `set the clipboard to POSIX file "${this.filePath}"`]);
        else throw e;
      }
      return this;
    }
  };
  var UITool = class extends BasicTool {
    get basicOptions() {
      return this._basicOptions;
    }
    /**
    * Store elements created with this instance
    *
    * @remarks
    * > What is this for?
    *
    * In bootstrap plugins, elements must be manually maintained and removed on exiting.
    *
    * This API does this for you.
    */
    elementCache;
    constructor(base) {
      super(base);
      this.elementCache = [];
      if (!this._basicOptions.ui) this._basicOptions.ui = {
        enableElementRecord: true,
        enableElementJSONLog: false,
        enableElementDOMLog: true
      };
    }
    /**
    * Remove all elements created by `createElement`.
    *
    * @remarks
    * > What is this for?
    *
    * In bootstrap plugins, elements must be manually maintained and removed on exiting.
    *
    * This API does this for you.
    */
    unregisterAll() {
      this.elementCache.forEach((e) => {
        try {
          e?.deref()?.remove();
        } catch (e$1) {
          this.log(e$1);
        }
      });
    }
    createElement(...args) {
      const doc = args[0];
      const tagName = args[1].toLowerCase();
      let props = args[2] || {};
      if (!tagName) return;
      if (typeof args[2] === "string") props = {
        namespace: args[2],
        enableElementRecord: args[3]
      };
      if (typeof props.enableElementJSONLog !== "undefined" && props.enableElementJSONLog || this.basicOptions.ui.enableElementJSONLog) this.log(props);
      props.properties = props.properties || props.directAttributes;
      props.children = props.children || props.subElementOptions;
      let elem;
      if (tagName === "fragment") {
        const fragElem = doc.createDocumentFragment();
        elem = fragElem;
      } else {
        let realElem = props.id && (props.checkExistenceParent ? props.checkExistenceParent : doc).querySelector(`#${props.id}`);
        if (realElem && props.ignoreIfExists) return realElem;
        if (realElem && props.removeIfExists) {
          realElem.remove();
          realElem = void 0;
        }
        if (props.customCheck && !props.customCheck(doc, props)) return void 0;
        if (!realElem || !props.skipIfExists) {
          let namespace = props.namespace;
          if (!namespace) {
            const mightHTML = HTMLElementTagNames.includes(tagName);
            const mightXUL = XULElementTagNames.includes(tagName);
            const mightSVG = SVGElementTagNames.includes(tagName);
            if (Number(mightHTML) + Number(mightXUL) + Number(mightSVG) > 1) this.log(`[Warning] Creating element ${tagName} with no namespace specified. Found multiply namespace matches.`);
            if (mightHTML) namespace = "html";
            else if (mightXUL) namespace = "xul";
            else if (mightSVG) namespace = "svg";
            else namespace = "html";
          }
          if (namespace === "xul") realElem = this.createXULElement(doc, tagName);
          else realElem = doc.createElementNS({
            html: "http://www.w3.org/1999/xhtml",
            svg: "http://www.w3.org/2000/svg"
          }[namespace], tagName);
          if (typeof props.enableElementRecord !== "undefined" ? props.enableElementRecord : this.basicOptions.ui.enableElementRecord) this.elementCache.push(new WeakRef(realElem));
        }
        if (props.id) realElem.id = props.id;
        if (props.styles && Object.keys(props.styles).length) Object.keys(props.styles).forEach((k) => {
          const v = props.styles[k];
          typeof v !== "undefined" && (realElem.style[k] = v);
        });
        if (props.properties && Object.keys(props.properties).length) Object.keys(props.properties).forEach((k) => {
          const v = props.properties[k];
          typeof v !== "undefined" && (realElem[k] = v);
        });
        if (props.attributes && Object.keys(props.attributes).length) Object.keys(props.attributes).forEach((k) => {
          const v = props.attributes[k];
          typeof v !== "undefined" && realElem.setAttribute(k, String(v));
        });
        if (props.classList?.length) realElem.classList.add(...props.classList);
        if (props.listeners?.length) props.listeners.forEach(({ type, listener, options }) => {
          listener && realElem.addEventListener(type, listener, options);
        });
        elem = realElem;
      }
      if (props.children?.length) {
        const subElements = props.children.map((childProps) => {
          childProps.namespace = childProps.namespace || props.namespace;
          return this.createElement(doc, childProps.tag, childProps);
        }).filter((e) => e);
        elem.append(...subElements);
      }
      if (typeof props.enableElementDOMLog !== "undefined" ? props.enableElementDOMLog : this.basicOptions.ui.enableElementDOMLog) this.log(elem);
      return elem;
    }
    /**
    * Append element(s) to a node.
    * @param properties See {@link ElementProps}
    * @param container The parent node to append to.
    * @returns A Node that is the appended child (aChild),
    *          except when aChild is a DocumentFragment,
    *          in which case the empty DocumentFragment is returned.
    */
    appendElement(properties, container) {
      return container.appendChild(this.createElement(container.ownerDocument, properties.tag, properties));
    }
    /**
    * Inserts a node before a reference node as a child of its parent node.
    * @param properties See {@link ElementProps}
    * @param referenceNode The node before which newNode is inserted.
    * @returns Node
    */
    insertElementBefore(properties, referenceNode) {
      if (referenceNode.parentNode) return referenceNode.parentNode.insertBefore(this.createElement(referenceNode.ownerDocument, properties.tag, properties), referenceNode);
      else this.log(`${referenceNode.tagName} has no parent, cannot insert ${properties.tag}`);
    }
    /**
    * Replace oldNode with a new one.
    * @param properties See {@link ElementProps}
    * @param oldNode The child to be replaced.
    * @returns The replaced Node. This is the same node as oldChild.
    */
    replaceElement(properties, oldNode) {
      if (oldNode.parentNode) return oldNode.parentNode.replaceChild(this.createElement(oldNode.ownerDocument, properties.tag, properties), oldNode);
      else this.log(`${oldNode.tagName} has no parent, cannot replace it with ${properties.tag}`);
    }
    /**
    * Parse XHTML to XUL fragment. For Zotero 6.
    *
    * To load preferences from a Zotero 7's `.xhtml`, use this method to parse it.
    * @param str xhtml raw text
    * @param entities dtd file list ("chrome://xxx.dtd")
    * @param defaultXUL true for default XUL namespace
    */
    parseXHTMLToFragment(str, entities = [], defaultXUL = true) {
      const parser = new DOMParser();
      const xulns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
      const htmlns = "http://www.w3.org/1999/xhtml";
      const wrappedStr = `${entities.length ? `<!DOCTYPE bindings [ ${entities.reduce((preamble, url, index) => {
        return `${preamble}<!ENTITY % _dtd-${index} SYSTEM "${url}"> %_dtd-${index}; `;
      }, "")}]>` : ""}
      <html:div xmlns="${defaultXUL ? xulns : htmlns}"
          xmlns:xul="${xulns}" xmlns:html="${htmlns}">
      ${str}
      </html:div>`;
      this.log(wrappedStr, parser);
      const doc = parser.parseFromString(wrappedStr, "text/xml");
      this.log(doc);
      if (doc.documentElement.localName === "parsererror") throw new Error("not well-formed XHTML");
      const range = doc.createRange();
      range.selectNodeContents(doc.querySelector("div"));
      return range.extractContents();
    }
  };
  var HTMLElementTagNames = [
    "a",
    "abbr",
    "address",
    "area",
    "article",
    "aside",
    "audio",
    "b",
    "base",
    "bdi",
    "bdo",
    "blockquote",
    "body",
    "br",
    "button",
    "canvas",
    "caption",
    "cite",
    "code",
    "col",
    "colgroup",
    "data",
    "datalist",
    "dd",
    "del",
    "details",
    "dfn",
    "dialog",
    "div",
    "dl",
    "dt",
    "em",
    "embed",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "head",
    "header",
    "hgroup",
    "hr",
    "html",
    "i",
    "iframe",
    "img",
    "input",
    "ins",
    "kbd",
    "label",
    "legend",
    "li",
    "link",
    "main",
    "map",
    "mark",
    "menu",
    "meta",
    "meter",
    "nav",
    "noscript",
    "object",
    "ol",
    "optgroup",
    "option",
    "output",
    "p",
    "picture",
    "pre",
    "progress",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "script",
    "section",
    "select",
    "slot",
    "small",
    "source",
    "span",
    "strong",
    "style",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "template",
    "textarea",
    "tfoot",
    "th",
    "thead",
    "time",
    "title",
    "tr",
    "track",
    "u",
    "ul",
    "var",
    "video",
    "wbr"
  ];
  var XULElementTagNames = [
    "action",
    "arrowscrollbox",
    "bbox",
    "binding",
    "bindings",
    "box",
    "broadcaster",
    "broadcasterset",
    "button",
    "browser",
    "checkbox",
    "caption",
    "colorpicker",
    "column",
    "columns",
    "commandset",
    "command",
    "conditions",
    "content",
    "deck",
    "description",
    "dialog",
    "dialogheader",
    "editor",
    "grid",
    "grippy",
    "groupbox",
    "hbox",
    "iframe",
    "image",
    "key",
    "keyset",
    "label",
    "listbox",
    "listcell",
    "listcol",
    "listcols",
    "listhead",
    "listheader",
    "listitem",
    "member",
    "menu",
    "menubar",
    "menuitem",
    "menulist",
    "menupopup",
    "menuseparator",
    "observes",
    "overlay",
    "page",
    "popup",
    "popupset",
    "preference",
    "preferences",
    "prefpane",
    "prefwindow",
    "progressmeter",
    "radio",
    "radiogroup",
    "resizer",
    "richlistbox",
    "richlistitem",
    "row",
    "rows",
    "rule",
    "script",
    "scrollbar",
    "scrollbox",
    "scrollcorner",
    "separator",
    "spacer",
    "splitter",
    "stack",
    "statusbar",
    "statusbarpanel",
    "stringbundle",
    "stringbundleset",
    "tab",
    "tabbrowser",
    "tabbox",
    "tabpanel",
    "tabpanels",
    "tabs",
    "template",
    "textnode",
    "textbox",
    "titlebar",
    "toolbar",
    "toolbarbutton",
    "toolbargrippy",
    "toolbaritem",
    "toolbarpalette",
    "toolbarseparator",
    "toolbarset",
    "toolbarspacer",
    "toolbarspring",
    "toolbox",
    "tooltip",
    "tree",
    "treecell",
    "treechildren",
    "treecol",
    "treecols",
    "treeitem",
    "treerow",
    "treeseparator",
    "triple",
    "vbox",
    "window",
    "wizard",
    "wizardpage"
  ];
  var SVGElementTagNames = [
    "a",
    "animate",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "foreignObject",
    "g",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "script",
    "set",
    "stop",
    "style",
    "svg",
    "switch",
    "symbol",
    "text",
    "textPath",
    "title",
    "tspan",
    "use",
    "view"
  ];
  var DialogHelper = class extends UITool {
    /**
    * Passed to dialog window for data-binding and lifecycle controls. See {@link DialogHelper.setDialogData}
    */
    dialogData;
    /**
    * Dialog window instance
    */
    window;
    elementProps;
    /**
    * Create a dialog helper with row \* column grids.
    * @param row
    * @param column
    */
    constructor(row, column) {
      super();
      if (row <= 0 || column <= 0) throw new Error(`row and column must be positive integers.`);
      this.elementProps = {
        tag: "vbox",
        attributes: { flex: 1 },
        styles: {
          width: "100%",
          height: "100%"
        },
        children: []
      };
      for (let i = 0; i < Math.max(row, 1); i++) {
        this.elementProps.children.push({
          tag: "hbox",
          attributes: { flex: 1 },
          children: []
        });
        for (let j = 0; j < Math.max(column, 1); j++) this.elementProps.children[i].children.push({
          tag: "vbox",
          attributes: { flex: 1 },
          children: []
        });
      }
      this.elementProps.children.push({
        tag: "hbox",
        attributes: {
          flex: 0,
          pack: "end"
        },
        children: []
      });
      this.dialogData = {};
    }
    /**
    * Add a cell at (row, column). Index starts from 0.
    * @param row
    * @param column
    * @param elementProps Cell element props. See {@link ElementProps}
    * @param cellFlex If the cell is flex. Default true.
    */
    addCell(row, column, elementProps, cellFlex = true) {
      if (row >= this.elementProps.children.length || column >= this.elementProps.children[row].children.length) throw new Error(`Cell index (${row}, ${column}) is invalid, maximum (${this.elementProps.children.length}, ${this.elementProps.children[0].children.length})`);
      this.elementProps.children[row].children[column].children = [elementProps];
      this.elementProps.children[row].children[column].attributes.flex = cellFlex ? 1 : 0;
      return this;
    }
    /**
    * Add a control button to the bottom of the dialog.
    * @param label Button label
    * @param id Button id.
    * The corresponding id of the last button user clicks before window exit will be set to `dialogData._lastButtonId`.
    * @param options Options
    * @param [options.noClose] Don't close window when clicking this button.
    * @param [options.callback] Callback of button click event.
    */
    addButton(label, id, options = {}) {
      id = id || `btn-${Zotero.Utilities.randomString()}-${(/* @__PURE__ */ new Date()).getTime()}`;
      this.elementProps.children[this.elementProps.children.length - 1].children.push({
        tag: "vbox",
        styles: { margin: "10px" },
        children: [{
          tag: "button",
          namespace: "html",
          id,
          attributes: {
            type: "button",
            "data-l10n-id": label
          },
          properties: { innerHTML: label },
          listeners: [{
            type: "click",
            listener: (e) => {
              this.dialogData._lastButtonId = id;
              if (options.callback) options.callback(e);
              if (!options.noClose) this.window.close();
            }
          }]
        }]
      });
      return this;
    }
    /**
    * Dialog data.
    * @remarks
    * This object is passed to the dialog window.
    *
    * The control button id is in `dialogData._lastButtonId`;
    *
    * The data-binding values are in `dialogData`.
    * ```ts
    * interface DialogData {
    *   [key: string | number | symbol]: any;
    *   loadLock?: { promise: Promise<void>; resolve: () => void; isResolved: () => boolean }; // resolve after window load (auto-generated)
    *   loadCallback?: Function; // called after window load
    *   unloadLock?: { promise: Promise<void>; resolve: () => void }; // resolve after window unload (auto-generated)
    *   unloadCallback?: Function; // called after window unload
    *   beforeUnloadCallback?: Function; // called before window unload when elements are accessable.
    * }
    * ```
    * @param dialogData
    */
    setDialogData(dialogData) {
      this.dialogData = dialogData;
      return this;
    }
    /**
    * Open the dialog
    * @param title Window title
    * @param windowFeatures
    * @param windowFeatures.width Ignored if fitContent is `true`.
    * @param windowFeatures.height Ignored if fitContent is `true`.
    * @param windowFeatures.left
    * @param windowFeatures.top
    * @param windowFeatures.centerscreen Open window at the center of screen.
    * @param windowFeatures.resizable If window is resizable.
    * @param windowFeatures.fitContent Resize the window to content size after elements are loaded.
    * @param windowFeatures.noDialogMode Dialog mode window only has a close button. Set `true` to make maximize and minimize button visible.
    * @param windowFeatures.alwaysRaised Is the window always at the top.
    */
    open(title, windowFeatures = {
      centerscreen: true,
      resizable: true,
      fitContent: true
    }) {
      this.window = openDialog(this, `dialog-${Zotero.Utilities.randomString()}-${(/* @__PURE__ */ new Date()).getTime()}`, title, this.elementProps, this.dialogData, windowFeatures);
      return this;
    }
  };
  function openDialog(dialogHelper, targetId, title, elementProps, dialogData, windowFeatures = {
    centerscreen: true,
    resizable: true,
    fitContent: true
  }) {
    dialogData = dialogData || {};
    if (!dialogData.loadLock) {
      let loadResolve;
      let isLoadResolved = false;
      const loadPromise = new Promise((resolve) => {
        loadResolve = resolve;
      });
      loadPromise.then(() => {
        isLoadResolved = true;
      });
      dialogData.loadLock = {
        promise: loadPromise,
        resolve: loadResolve,
        isResolved: () => isLoadResolved
      };
    }
    if (!dialogData.unloadLock) {
      let unloadResolve;
      const unloadPromise = new Promise((resolve) => {
        unloadResolve = resolve;
      });
      dialogData.unloadLock = {
        promise: unloadPromise,
        resolve: unloadResolve
      };
    }
    let featureString = `resizable=${windowFeatures.resizable ? "yes" : "no"},`;
    if (windowFeatures.width || windowFeatures.height) featureString += `width=${windowFeatures.width || 100},height=${windowFeatures.height || 100},`;
    if (windowFeatures.left) featureString += `left=${windowFeatures.left},`;
    if (windowFeatures.top) featureString += `top=${windowFeatures.top},`;
    if (windowFeatures.centerscreen) featureString += "centerscreen,";
    if (windowFeatures.noDialogMode) featureString += "dialog=no,";
    if (windowFeatures.alwaysRaised) featureString += "alwaysRaised=yes,";
    const win = dialogHelper.getGlobal("openDialog")("about:blank", targetId || "_blank", featureString, dialogData);
    dialogData.loadLock?.promise.then(() => {
      win.document.head.appendChild(dialogHelper.createElement(win.document, "title", {
        properties: { innerText: title },
        attributes: { "data-l10n-id": title }
      }));
      let l10nFiles = dialogData.l10nFiles || [];
      if (typeof l10nFiles === "string") l10nFiles = [l10nFiles];
      l10nFiles.forEach((file) => {
        win.document.head.appendChild(dialogHelper.createElement(win.document, "link", { properties: {
          rel: "localization",
          href: file
        } }));
      });
      dialogHelper.appendElement({
        tag: "fragment",
        children: [
          {
            tag: "style",
            properties: { innerHTML: style }
          },
          {
            tag: "link",
            properties: {
              rel: "stylesheet",
              href: "chrome://global/skin/global.css"
            }
          },
          {
            tag: "link",
            properties: {
              rel: "stylesheet",
              href: "chrome://zotero-platform/content/zotero.css"
            }
          }
        ]
      }, win.document.head);
      replaceElement(elementProps, dialogHelper);
      win.document.body.appendChild(dialogHelper.createElement(win.document, "fragment", { children: [elementProps] }));
      Array.from(win.document.querySelectorAll("*[data-bind]")).forEach((elem) => {
        const bindKey = elem.getAttribute("data-bind");
        const bindAttr = elem.getAttribute("data-attr");
        const bindProp = elem.getAttribute("data-prop");
        if (bindKey && dialogData && dialogData[bindKey]) if (bindProp) elem[bindProp] = dialogData[bindKey];
        else elem.setAttribute(bindAttr || "value", dialogData[bindKey]);
      });
      if (windowFeatures.fitContent) setTimeout(() => {
        win.sizeToContent();
      }, 300);
      win.focus();
    }).then(() => {
      dialogData?.loadCallback && dialogData.loadCallback();
    });
    dialogData.unloadLock?.promise.then(() => {
      dialogData?.unloadCallback && dialogData.unloadCallback();
    });
    win.addEventListener("DOMContentLoaded", function onWindowLoad(_ev) {
      win.arguments[0]?.loadLock?.resolve();
      win.removeEventListener("DOMContentLoaded", onWindowLoad, false);
    }, false);
    win.addEventListener("beforeunload", function onWindowBeforeUnload(_ev) {
      Array.from(win.document.querySelectorAll("*[data-bind]")).forEach((elem) => {
        const dialogData$1 = this.window.arguments[0];
        const bindKey = elem.getAttribute("data-bind");
        const bindAttr = elem.getAttribute("data-attr");
        const bindProp = elem.getAttribute("data-prop");
        if (bindKey && dialogData$1) if (bindProp) dialogData$1[bindKey] = elem[bindProp];
        else dialogData$1[bindKey] = elem.getAttribute(bindAttr || "value");
      });
      this.window.removeEventListener("beforeunload", onWindowBeforeUnload, false);
      dialogData?.beforeUnloadCallback && dialogData.beforeUnloadCallback();
    });
    win.addEventListener("unload", function onWindowUnload(_ev) {
      if (!this.window.arguments[0]?.loadLock?.isResolved()) return;
      this.window.arguments[0]?.unloadLock?.resolve();
      this.window.removeEventListener("unload", onWindowUnload, false);
    });
    if (win.document.readyState === "complete") win.arguments[0]?.loadLock?.resolve();
    return win;
  }
  function replaceElement(elementProps, uiTool) {
    let checkChildren = true;
    if (elementProps.tag === "select") {
      let is140 = false;
      try {
        is140 = Number.parseInt(Services.appinfo.platformVersion.match(/^\d+/)[0]) >= 140;
      } catch {
        is140 = false;
      }
      if (!is140) {
        checkChildren = false;
        const customSelectProps = {
          tag: "div",
          classList: ["dropdown"],
          listeners: [{
            type: "mouseleave",
            listener: (ev) => {
              const select = ev.target.querySelector("select");
              select?.blur();
            }
          }],
          children: [Object.assign({}, elementProps, {
            tag: "select",
            listeners: [{
              type: "focus",
              listener: (ev) => {
                const select = ev.target;
                const dropdown = select.parentElement?.querySelector(".dropdown-content");
                dropdown && (dropdown.style.display = "block");
                select.setAttribute("focus", "true");
              }
            }, {
              type: "blur",
              listener: (ev) => {
                const select = ev.target;
                const dropdown = select.parentElement?.querySelector(".dropdown-content");
                dropdown && (dropdown.style.display = "none");
                select.removeAttribute("focus");
              }
            }]
          }), {
            tag: "div",
            classList: ["dropdown-content"],
            children: elementProps.children?.map((option) => ({
              tag: "p",
              attributes: { value: option.properties?.value },
              properties: { innerHTML: option.properties?.innerHTML || option.properties?.textContent },
              classList: ["dropdown-item"],
              listeners: [{
                type: "click",
                listener: (ev) => {
                  const select = ev.target.parentElement?.previousElementSibling;
                  select && (select.value = ev.target.getAttribute("value") || "");
                  select?.blur();
                }
              }]
            }))
          }]
        };
        for (const key in elementProps) delete elementProps[key];
        Object.assign(elementProps, customSelectProps);
      } else {
        const children = elementProps.children || [];
        const randomString = CSS.escape(`${Zotero.Utilities.randomString()}-${(/* @__PURE__ */ new Date()).getTime()}`);
        if (!elementProps.id) elementProps.id = `select-${randomString}`;
        const selectId = elementProps.id;
        const popupId = `popup-${randomString}`;
        const popup = uiTool.appendElement({
          tag: "menupopup",
          namespace: "xul",
          id: popupId,
          children: children.map((option) => ({
            tag: "menuitem",
            attributes: {
              value: option.properties?.value,
              label: option.properties?.innerHTML || option.properties?.textContent
            }
          })),
          listeners: [{
            type: "command",
            listener: (ev) => {
              if (ev.target?.tagName !== "menuitem") return;
              const select = uiTool.window.document.getElementById(selectId);
              const menuitem = ev.target;
              if (select) {
                select.value = menuitem.getAttribute("value") || "";
                select.blur();
              }
              popup.hidePopup();
            }
          }]
        }, uiTool.window.document.body);
        if (!elementProps.listeners) elementProps.listeners = [];
        elementProps.listeners.push(...[{
          type: "click",
          listener: (ev) => {
            const select = ev.target;
            const rect = select.getBoundingClientRect();
            let left = rect.left + uiTool.window.scrollX;
            let top = rect.bottom + uiTool.window.scrollY;
            if (uiTool.getGlobal("Zotero").isMac) {
              left += uiTool.window.screenLeft;
              top += uiTool.window.screenTop + rect.height;
            }
            fixMenuPopup(popup, uiTool);
            popup.openPopup(null, "", left, top, false, false);
            select.setAttribute("focus", "true");
          }
        }]);
      }
    } else if (elementProps.tag === "a") {
      const href = elementProps?.properties?.href || "";
      elementProps.properties ??= {};
      elementProps.properties.href = "javascript:void(0);";
      elementProps.attributes ??= {};
      elementProps.attributes["zotero-href"] = href;
      elementProps.listeners ??= [];
      elementProps.listeners.push({
        type: "click",
        listener: (ev) => {
          const href$1 = ev.target?.getAttribute("zotero-href");
          href$1 && uiTool.getGlobal("Zotero").launchURL(href$1);
        }
      });
      elementProps.classList ??= [];
      elementProps.classList.push("zotero-text-link");
    }
    if (checkChildren) elementProps.children?.forEach((child) => replaceElement(child, uiTool));
  }
  var style = `
html {
  color-scheme: light dark;
}
.zotero-text-link {
  -moz-user-focus: normal;
  color: -moz-nativehyperlinktext;
  text-decoration: underline;
  border: 1px solid transparent;
  cursor: pointer;
}
.dropdown {
  position: relative;
  display: inline-block;
}
.dropdown-content {
  display: none;
  position: absolute;
  background-color: var(--material-toolbar);
  min-width: 160px;
  box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, 0.5);
  border-radius: 5px;
  padding: 5px 0 5px 0;
  z-index: 999;
}
.dropdown-item {
  margin: 0px;
  padding: 5px 10px 5px 10px;
}
.dropdown-item:hover {
  background-color: var(--fill-quinary);
}
`;
  function fixMenuPopup(popup, uiTool) {
    for (const item of popup.querySelectorAll("menuitem")) if (!item.innerHTML) uiTool.appendElement({
      tag: "fragment",
      children: [
        {
          tag: "image",
          namespace: "xul",
          classList: ["menu-icon"],
          attributes: { "aria-hidden": "true" }
        },
        {
          tag: "label",
          namespace: "xul",
          classList: ["menu-text"],
          properties: { value: item.getAttribute("label") || "" },
          attributes: {
            crop: "end",
            "aria-hidden": "true"
          }
        },
        {
          tag: "label",
          namespace: "xul",
          classList: ["menu-highlightable-text"],
          properties: { textContent: item.getAttribute("label") || "" },
          attributes: {
            crop: "end",
            "aria-hidden": "true"
          }
        },
        {
          tag: "label",
          namespace: "xul",
          classList: ["menu-accel"],
          attributes: { "aria-hidden": "true" }
        }
      ]
    }, item);
  }
  var FilePickerHelper = class extends BasicTool {
    title;
    mode;
    filters;
    suggestion;
    directory;
    window;
    filterMask;
    constructor(title, mode, filters, suggestion, window$1, filterMask, directory) {
      super();
      this.title = title;
      this.mode = mode;
      this.filters = filters;
      this.suggestion = suggestion;
      this.directory = directory;
      this.window = window$1;
      this.filterMask = filterMask;
    }
    async open() {
      const Backend = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs").FilePicker;
      const fp = new Backend();
      fp.init(this.window || this.getGlobal("window"), this.title, this.getMode(fp));
      for (const [label, ext] of this.filters || []) fp.appendFilter(label, ext);
      if (this.filterMask) fp.appendFilters(this.getFilterMask(fp));
      if (this.suggestion) fp.defaultString = this.suggestion;
      if (this.directory) fp.displayDirectory = this.directory;
      const userChoice = await fp.show();
      switch (userChoice) {
        case fp.returnOK:
        case fp.returnReplace:
          return this.mode === "multiple" ? fp.files : fp.file;
        default:
          return false;
      }
    }
    getMode(fp) {
      switch (this.mode) {
        case "open":
          return fp.modeOpen;
        case "save":
          return fp.modeSave;
        case "folder":
          return fp.modeGetFolder;
        case "multiple":
          return fp.modeOpenMultiple;
        default:
          return 0;
      }
    }
    getFilterMask(fp) {
      switch (this.filterMask) {
        case "all":
          return fp.filterAll;
        case "html":
          return fp.filterHTML;
        case "text":
          return fp.filterText;
        case "images":
          return fp.filterImages;
        case "xml":
          return fp.filterXML;
        case "apps":
          return fp.filterApps;
        case "urls":
          return fp.filterAllowURLs;
        case "audio":
          return fp.filterAudio;
        case "video":
          return fp.filterVideo;
        default:
          return 1;
      }
    }
  };
  var GuideHelper = class extends BasicTool {
    _steps = [];
    constructor() {
      super();
    }
    addStep(step) {
      this._steps.push(step);
      return this;
    }
    addSteps(steps) {
      this._steps.push(...steps);
      return this;
    }
    async show(doc) {
      if (!doc?.ownerGlobal) throw new Error("Document is required.");
      const guide = new Guide(doc.ownerGlobal);
      await guide.show(this._steps);
      const promise = new Promise((resolve) => {
        guide._panel.addEventListener("guide-finished", () => resolve(guide));
      });
      await promise;
      return guide;
    }
    async highlight(doc, step) {
      if (!doc?.ownerGlobal) throw new Error("Document is required.");
      const guide = new Guide(doc.ownerGlobal);
      await guide.show([step]);
      const promise = new Promise((resolve) => {
        guide._panel.addEventListener("guide-finished", () => resolve(guide));
      });
      await promise;
      return guide;
    }
  };
  var Guide = class {
    _window;
    _id = `guide-${Zotero.Utilities.randomString()}`;
    _panel;
    _header;
    _body;
    _footer;
    _progress;
    _closeButton;
    _prevButton;
    _nextButton;
    _steps;
    _noClose;
    _closed;
    _autoNext;
    _currentIndex;
    initialized;
    _cachedMasks = [];
    get content() {
      return this._window.MozXULElement.parseXULToFragment(`
      <panel id="${this._id}" class="guide-panel" type="arrow" align="top" noautohide="true">
          <html:div class="guide-panel-content">
              <html:div class="guide-panel-header"></html:div>
              <html:div class="guide-panel-body"></html:div>
              <html:div class="guide-panel-footer">
                  <html:div class="guide-panel-progress"></html:div>
                  <html:div class="guide-panel-buttons">
                      <button id="prev-button" class="guide-panel-button" hidden="true"></button>
                      <button id="next-button" class="guide-panel-button" hidden="true"></button>
                      <button id="close-button" class="guide-panel-button" hidden="true"></button>
                  </html:div>
              </html:div>
          </html:div>
          <html:style>
              .guide-panel {
                  background-color: var(--material-menu);
                  color: var(--fill-primary);
              }
              .guide-panel-content {
                  display: flex;
                  flex-direction: column;
                  padding: 0;
              }
              .guide-panel-header {
                  font-size: 1.2em;
                  font-weight: bold;
                  margin-bottom: 10px;
              }
              .guide-panel-header:empty {
                display: none;
              }
              .guide-panel-body {
                  align-items: center;
                  display: flex;
                  flex-direction: column;
                  white-space: pre-wrap;
              }
              .guide-panel-body:empty {
                display: none;
              }
              .guide-panel-footer {
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                  justify-content: space-between;
                  margin-top: 10px;
              }
              .guide-panel-progress {
                  font-size: 0.8em;
              }
              .guide-panel-buttons {
                  display: flex;
                  flex-direction: row;
                  flex-grow: 1;
                  justify-content: flex-end;
              }
          </html:style>
      </panel>
  `);
    }
    get currentStep() {
      if (!this._steps) return void 0;
      return this._steps[this._currentIndex];
    }
    get currentTarget() {
      const step = this.currentStep;
      if (!step?.element) return void 0;
      let elem;
      if (typeof step.element === "function") elem = step.element();
      else if (typeof step.element === "string") elem = this._window.document.querySelector(step.element);
      else if (!step.element) elem = this._window.document.documentElement || void 0;
      else elem = step.element;
      return elem;
    }
    get hasNext() {
      return this._steps && this._currentIndex < this._steps.length - 1;
    }
    get hasPrevious() {
      return this._steps && this._currentIndex > 0;
    }
    get hookProps() {
      return {
        config: this.currentStep,
        state: {
          step: this._currentIndex,
          steps: this._steps,
          controller: this
        }
      };
    }
    get panel() {
      return this._panel;
    }
    constructor(win) {
      this._window = win;
      this._noClose = false;
      this._closed = false;
      this._autoNext = true;
      this._currentIndex = 0;
      const doc = win.document;
      const content = this.content;
      if (content) doc.documentElement?.append(doc.importNode(content, true));
      this._panel = doc.querySelector(`#${this._id}`);
      this._header = this._panel.querySelector(".guide-panel-header");
      this._body = this._panel.querySelector(".guide-panel-body");
      this._footer = this._panel.querySelector(".guide-panel-footer");
      this._progress = this._panel.querySelector(".guide-panel-progress");
      this._closeButton = this._panel.querySelector("#close-button");
      this._prevButton = this._panel.querySelector("#prev-button");
      this._nextButton = this._panel.querySelector("#next-button");
      this._closeButton.addEventListener("click", async () => {
        if (this.currentStep?.onCloseClick) await this.currentStep.onCloseClick(this.hookProps);
        this.abort();
      });
      this._prevButton.addEventListener("click", async () => {
        if (this.currentStep?.onPrevClick) await this.currentStep.onPrevClick(this.hookProps);
        this.movePrevious();
      });
      this._nextButton.addEventListener("click", async () => {
        if (this.currentStep?.onNextClick) await this.currentStep.onNextClick(this.hookProps);
        this.moveNext();
      });
      this._panel.addEventListener("popupshown", this._handleShown.bind(this));
      this._panel.addEventListener("popuphidden", this._handleHidden.bind(this));
      this._window.addEventListener("resize", this._centerPanel);
    }
    async show(steps) {
      if (steps) {
        this._steps = steps;
        this._currentIndex = 0;
      }
      const index = this._currentIndex;
      this._noClose = false;
      this._closed = false;
      this._autoNext = true;
      const step = this.currentStep;
      if (!step) return;
      const elem = this.currentTarget;
      if (step.onBeforeRender) {
        await step.onBeforeRender(this.hookProps);
        if (index !== this._currentIndex) {
          await this.show();
          return;
        }
      }
      if (step.onMask) step.onMask({ mask: (_e) => this._createMask(_e) });
      else this._createMask(elem);
      let x;
      let y = 0;
      let position = step.position || "after_start";
      if (position === "center") {
        position = "overlap";
        x = this._window.innerWidth / 2;
        y = this._window.innerHeight / 2;
      }
      this._panel.openPopup(elem, step.position || "after_start", x, y, false, false);
    }
    hide() {
      this._panel.hidePopup();
    }
    abort() {
      this._closed = true;
      this.hide();
      this._steps = void 0;
    }
    moveTo(stepIndex) {
      if (!this._steps) {
        this.hide();
        return;
      }
      if (stepIndex < 0) stepIndex = 0;
      if (!this._steps[stepIndex]) {
        this._currentIndex = this._steps.length;
        this.hide();
        return;
      }
      this._autoNext = false;
      this._noClose = true;
      this.hide();
      this._noClose = false;
      this._autoNext = true;
      this._currentIndex = stepIndex;
      this.show();
    }
    moveNext() {
      this.moveTo(this._currentIndex + 1);
    }
    movePrevious() {
      this.moveTo(this._currentIndex - 1);
    }
    _handleShown() {
      if (!this._steps) return;
      const step = this.currentStep;
      if (!step) return;
      this._header.innerHTML = step.title || "";
      this._body.innerHTML = step.description || "";
      this._panel.querySelectorAll(".guide-panel-button").forEach((elem) => {
        elem.hidden = true;
        elem.disabled = false;
      });
      let showButtons = step.showButtons;
      if (!showButtons) {
        showButtons = [];
        if (this.hasPrevious) showButtons.push("prev");
        if (this.hasNext) showButtons.push("next");
        else showButtons.push("close");
      }
      if (showButtons?.length) showButtons.forEach((btn) => {
        this._panel.querySelector(`#${btn}-button`).hidden = false;
      });
      if (step.disableButtons) step.disableButtons.forEach((btn) => {
        this._panel.querySelector(`#${btn}-button`).disabled = true;
      });
      if (step.showProgress) {
        this._progress.hidden = false;
        this._progress.textContent = step.progressText || `${this._currentIndex + 1}/${this._steps.length}`;
      } else this._progress.hidden = true;
      this._closeButton.label = step.closeBtnText || "Done";
      this._nextButton.label = step.nextBtnText || "Next";
      this._prevButton.label = step.prevBtnText || "Previous";
      if (step.onRender) step.onRender(this.hookProps);
      if (step.position === "center") {
        this._centerPanel();
        this._window.setTimeout(this._centerPanel, 10);
      }
    }
    async _handleHidden() {
      this._removeMask();
      this._header.innerHTML = "";
      this._body.innerHTML = "";
      this._progress.textContent = "";
      if (!this._steps) return;
      const step = this.currentStep;
      if (step && step.onExit) await step.onExit(this.hookProps);
      if (!this._noClose && (this._closed || !this.hasNext)) {
        this._panel.dispatchEvent(new this._window.CustomEvent("guide-finished"));
        this._panel.remove();
        this._window.removeEventListener("resize", this._centerPanel);
        return;
      }
      if (this._autoNext) this.moveNext();
    }
    _centerPanel = () => {
      const win = this._window;
      this._panel.moveTo(win.screenX + win.innerWidth / 2 - this._panel.clientWidth / 2, win.screenY + win.innerHeight / 2 - this._panel.clientHeight / 2);
    };
    _createMask(targetElement) {
      const doc = targetElement?.ownerDocument || this._window.document;
      const NS = "http://www.w3.org/2000/svg";
      const svg = doc.createElementNS(NS, "svg");
      svg.id = "guide-panel-mask";
      svg.style.position = "fixed";
      svg.style.top = "0";
      svg.style.left = "0";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.zIndex = "9999";
      const mask = doc.createElementNS(NS, "mask");
      mask.id = "mask";
      const fullRect = doc.createElementNS(NS, "rect");
      fullRect.setAttribute("x", "0");
      fullRect.setAttribute("y", "0");
      fullRect.setAttribute("width", "100%");
      fullRect.setAttribute("height", "100%");
      fullRect.setAttribute("fill", "white");
      mask.appendChild(fullRect);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const targetRect = doc.createElementNS(NS, "rect");
        targetRect.setAttribute("x", rect.left.toString());
        targetRect.setAttribute("y", rect.top.toString());
        targetRect.setAttribute("width", rect.width.toString());
        targetRect.setAttribute("height", rect.height.toString());
        targetRect.setAttribute("fill", "black");
        mask.appendChild(targetRect);
      }
      const maskedRect = doc.createElementNS(NS, "rect");
      maskedRect.setAttribute("x", "0");
      maskedRect.setAttribute("y", "0");
      maskedRect.setAttribute("width", "100%");
      maskedRect.setAttribute("height", "100%");
      maskedRect.setAttribute("mask", "url(#mask)");
      maskedRect.setAttribute("opacity", "0.7");
      svg.appendChild(mask);
      svg.appendChild(maskedRect);
      this._cachedMasks.push(new WeakRef(svg));
      doc.documentElement?.appendChild(svg);
    }
    _removeMask() {
      this._cachedMasks.forEach((ref) => {
        const mask = ref.deref();
        if (mask) mask.remove();
      });
      this._cachedMasks = [];
    }
  };
  var LargePrefHelper = class extends BasicTool {
    keyPref;
    valuePrefPrefix;
    innerObj;
    hooks;
    /**
    *
    * @param keyPref The preference name for storing the keys of the data.
    * @param valuePrefPrefix The preference name prefix for storing the values of the data.
    * @param hooks Hooks for parsing the values of the data.
    * - `afterGetValue`: A function that takes the value of the data as input and returns the parsed value.
    * - `beforeSetValue`: A function that takes the key and value of the data as input and returns the parsed key and value.
    * If `hooks` is `"default"`, no parsing will be done.
    * If `hooks` is `"parser"`, the values will be parsed as JSON.
    * If `hooks` is an object, the values will be parsed by the hooks.
    */
    constructor(keyPref, valuePrefPrefix, hooks = "default") {
      super();
      this.keyPref = keyPref;
      this.valuePrefPrefix = valuePrefPrefix;
      if (hooks === "default") this.hooks = defaultHooks;
      else if (hooks === "parser") this.hooks = parserHooks;
      else this.hooks = {
        ...defaultHooks,
        ...hooks
      };
      this.innerObj = {};
    }
    /**
    * Get the object that stores the data.
    * @returns The object that stores the data.
    */
    asObject() {
      return this.constructTempObj();
    }
    /**
    * Get the Map that stores the data.
    * @returns The Map that stores the data.
    */
    asMapLike() {
      const mapLike = {
        get: (key) => this.getValue(key),
        set: (key, value) => {
          this.setValue(key, value);
          return mapLike;
        },
        has: (key) => this.hasKey(key),
        delete: (key) => this.deleteKey(key),
        clear: () => {
          for (const key of this.getKeys()) this.deleteKey(key);
        },
        forEach: (callback) => {
          return this.constructTempMap().forEach(callback);
        },
        get size() {
          return this._this.getKeys().length;
        },
        entries: () => {
          return this.constructTempMap().values();
        },
        keys: () => {
          const keys = this.getKeys();
          return keys[Symbol.iterator]();
        },
        values: () => {
          return this.constructTempMap().values();
        },
        [Symbol.iterator]: () => {
          return this.constructTempMap()[Symbol.iterator]();
        },
        [Symbol.toStringTag]: "MapLike",
        _this: this
      };
      return mapLike;
    }
    /**
    * Get the keys of the data.
    * @returns The keys of the data.
    */
    getKeys() {
      const rawKeys = Zotero.Prefs.get(this.keyPref, true);
      const keys = rawKeys ? JSON.parse(rawKeys) : [];
      for (const key of keys) {
        const value = "placeholder";
        this.innerObj[key] = value;
      }
      return keys;
    }
    /**
    * Set the keys of the data.
    * @param keys The keys of the data.
    */
    setKeys(keys) {
      keys = [...new Set(keys.filter((key) => key))];
      Zotero.Prefs.set(this.keyPref, JSON.stringify(keys), true);
      for (const key of keys) {
        const value = "placeholder";
        this.innerObj[key] = value;
      }
    }
    /**
    * Get the value of a key.
    * @param key The key of the data.
    * @returns The value of the key.
    */
    getValue(key) {
      const value = Zotero.Prefs.get(`${this.valuePrefPrefix}${key}`, true);
      if (typeof value === "undefined") return;
      const { value: newValue } = this.hooks.afterGetValue({ value });
      this.innerObj[key] = newValue;
      return newValue;
    }
    /**
    * Set the value of a key.
    * @param key The key of the data.
    * @param value The value of the key.
    */
    setValue(key, value) {
      const { key: newKey, value: newValue } = this.hooks.beforeSetValue({
        key,
        value
      });
      this.setKey(newKey);
      Zotero.Prefs.set(`${this.valuePrefPrefix}${newKey}`, newValue, true);
      this.innerObj[newKey] = newValue;
    }
    /**
    * Check if a key exists.
    * @param key The key of the data.
    * @returns Whether the key exists.
    */
    hasKey(key) {
      return this.getKeys().includes(key);
    }
    /**
    * Add a key.
    * @param key The key of the data.
    */
    setKey(key) {
      const keys = this.getKeys();
      if (!keys.includes(key)) {
        keys.push(key);
        this.setKeys(keys);
      }
    }
    /**
    * Delete a key.
    * @param key The key of the data.
    */
    deleteKey(key) {
      const keys = this.getKeys();
      const index = keys.indexOf(key);
      if (index > -1) {
        keys.splice(index, 1);
        delete this.innerObj[key];
        this.setKeys(keys);
      }
      Zotero.Prefs.clear(`${this.valuePrefPrefix}${key}`, true);
      return true;
    }
    constructTempObj() {
      return new Proxy(this.innerObj, {
        get: (target, prop, receiver) => {
          this.getKeys();
          if (typeof prop === "string" && prop in target) this.getValue(prop);
          return Reflect.get(target, prop, receiver);
        },
        set: (target, p, newValue, receiver) => {
          if (typeof p === "string") {
            if (newValue === void 0) {
              this.deleteKey(p);
              return true;
            }
            this.setValue(p, newValue);
            return true;
          }
          return Reflect.set(target, p, newValue, receiver);
        },
        has: (target, p) => {
          this.getKeys();
          return Reflect.has(target, p);
        },
        deleteProperty: (target, p) => {
          if (typeof p === "string") {
            this.deleteKey(p);
            return true;
          }
          return Reflect.deleteProperty(target, p);
        }
      });
    }
    constructTempMap() {
      const map = /* @__PURE__ */ new Map();
      for (const key of this.getKeys()) map.set(key, this.getValue(key));
      return map;
    }
  };
  var defaultHooks = {
    afterGetValue: ({ value }) => ({ value }),
    beforeSetValue: ({ key, value }) => ({
      key,
      value
    })
  };
  var parserHooks = {
    afterGetValue: ({ value }) => {
      try {
        value = JSON.parse(value);
      } catch {
        return { value };
      }
      return { value };
    },
    beforeSetValue: ({ key, value }) => {
      value = JSON.stringify(value);
      return {
        key,
        value
      };
    }
  };
  var PatchHelper = class extends BasicTool {
    options;
    constructor() {
      super();
      this.options = void 0;
    }
    setData(options) {
      this.options = options;
      const Zotero$1 = this.getGlobal("Zotero");
      const { target, funcSign, patcher } = options;
      const origin = target[funcSign];
      this.log("patching ", funcSign);
      target[funcSign] = function(...args) {
        if (options.enabled) try {
          return patcher(origin).apply(this, args);
        } catch (e) {
          Zotero$1.logError(e);
        }
        return origin.apply(this, args);
      };
      return this;
    }
    enable() {
      if (!this.options) throw new Error("No patch data set");
      this.options.enabled = true;
      return this;
    }
    disable() {
      if (!this.options) throw new Error("No patch data set");
      this.options.enabled = false;
      return this;
    }
  };
  var icons = {
    success: "chrome://zotero/skin/tick.png",
    fail: "chrome://zotero/skin/cross.png"
  };
  var ProgressWindowHelper = class {
    win;
    lines;
    closeTime;
    /**
    *
    * @param header window header
    * @param options
    * @param options.window
    * @param options.closeOnClick
    * @param options.closeTime
    * @param options.closeOtherProgressWindows
    */
    constructor(header, options = {
      closeOnClick: true,
      closeTime: 5e3
    }) {
      this.win = new (BasicTool.getZotero()).ProgressWindow(options);
      this.lines = [];
      this.closeTime = options.closeTime || 5e3;
      this.win.changeHeadline(header);
      if (options.closeOtherProgressWindows) BasicTool.getZotero().ProgressWindowSet.closeAll();
    }
    /**
    * Create a new line
    * @param options
    * @param options.type
    * @param options.icon
    * @param options.text
    * @param options.progress
    * @param options.idx
    */
    createLine(options) {
      const icon = this.getIcon(options.type, options.icon);
      const line = new this.win.ItemProgress(icon || "", options.text || "");
      if (typeof options.progress === "number") line.setProgress(options.progress);
      this.lines.push(line);
      this.updateIcons();
      return this;
    }
    /**
    * Change the line content
    * @param options
    * @param options.type
    * @param options.icon
    * @param options.text
    * @param options.progress
    * @param options.idx
    */
    changeLine(options) {
      if (this.lines?.length === 0) return this;
      const idx = typeof options.idx !== "undefined" && options.idx >= 0 && options.idx < this.lines.length ? options.idx : 0;
      const icon = this.getIcon(options.type, options.icon);
      if (icon) this.lines[idx].setItemTypeAndIcon(icon);
      options.text && this.lines[idx].setText(options.text);
      typeof options.progress === "number" && this.lines[idx].setProgress(options.progress);
      this.updateIcons();
      return this;
    }
    show(closeTime = void 0) {
      this.win.show();
      typeof closeTime !== "undefined" && (this.closeTime = closeTime);
      if (this.closeTime && this.closeTime > 0) this.win.startCloseTimer(this.closeTime);
      setTimeout(this.updateIcons.bind(this), 50);
      return this;
    }
    /**
    * Set custom icon uri for progress window
    * @param key
    * @param uri
    */
    static setIconURI(key, uri) {
      icons[key] = uri;
    }
    getIcon(type, defaultIcon) {
      return type && type in icons ? icons[type] : defaultIcon;
    }
    updateIcons() {
      try {
        this.lines.forEach((line) => {
          const box = line._image;
          const icon = box.dataset.itemType;
          if (icon && !box.style.backgroundImage.includes("progress_arcs")) box.style.backgroundImage = `url(${box.dataset.itemType})`;
        });
      } catch {
      }
    }
    changeHeadline(text, icon, postText) {
      this.win.changeHeadline(text, icon, postText);
      return this;
    }
    addLines(labels, icons$1) {
      this.win.addLines(labels, icons$1);
      return this;
    }
    addDescription(text) {
      this.win.addDescription(text);
      return this;
    }
    startCloseTimer(ms, requireMouseOver) {
      this.win.startCloseTimer(ms, requireMouseOver);
      return this;
    }
    close() {
      this.win.close();
      return this;
    }
  };
  var VirtualizedTableHelper = class extends BasicTool {
    props;
    localeStrings;
    containerId;
    treeInstance;
    window;
    React;
    ReactDOM;
    VirtualizedTable;
    IntlProvider;
    constructor(win) {
      super();
      this.window = win;
      const Zotero$1 = this.getGlobal("Zotero");
      const _require = win.require;
      this.React = _require("react");
      this.ReactDOM = _require("react-dom");
      this.VirtualizedTable = _require("components/virtualized-table");
      this.IntlProvider = _require("react-intl").IntlProvider;
      this.props = {
        id: `vtable-${Zotero$1.Utilities.randomString()}-${(/* @__PURE__ */ new Date()).getTime()}`,
        getRowCount: () => 0
      };
      this.localeStrings = Zotero$1.Intl.strings;
    }
    setProp(...args) {
      if (args.length === 1) Object.assign(this.props, args[0]);
      else if (args.length === 2) this.props[args[0]] = args[1];
      return this;
    }
    /**
    * Set locale strings, which replaces the table header's label if matches. Default it's `Zotero.Intl.strings`
    * @param localeStrings
    */
    setLocale(localeStrings) {
      Object.assign(this.localeStrings, localeStrings);
      return this;
    }
    /**
    * Set container element id that the table will be rendered on.
    * @param id element id
    */
    setContainerId(id) {
      this.containerId = id;
      return this;
    }
    /**
    * Render the table.
    * @param selectId Which row to select after rendering
    * @param onfulfilled callback after successfully rendered
    * @param onrejected callback after rendering with error
    */
    render(selectId, onfulfilled, onrejected) {
      const refreshSelection = () => {
        this.treeInstance.invalidate();
        if (typeof selectId !== "undefined" && selectId >= 0) this.treeInstance.selection.select(selectId);
        else this.treeInstance.selection.clearSelection();
      };
      if (!this.treeInstance) new Promise((resolve) => {
        const vtableProps = Object.assign({}, this.props, { ref: (ref) => {
          this.treeInstance = ref;
          resolve(void 0);
        } });
        if (vtableProps.getRowData && !vtableProps.renderItem) Object.assign(vtableProps, { renderItem: this.VirtualizedTable.makeRowRenderer(vtableProps.getRowData) });
        const elem = this.React.createElement(this.IntlProvider, {
          locale: Zotero.locale,
          messages: Zotero.Intl.strings
        }, this.React.createElement(this.VirtualizedTable, vtableProps));
        const container = this.window.document.getElementById(this.containerId);
        this.ReactDOM.createRoot(container).render(elem);
      }).then(() => {
        this.getGlobal("setTimeout")(() => {
          refreshSelection();
        });
      }).then(onfulfilled, onrejected);
      else refreshSelection();
      return this;
    }
  };
  var FieldHookManager = class extends ManagerTool {
    data = {
      getField: {},
      setField: {},
      isFieldOfBase: {}
    };
    patchHelpers = {
      getField: new PatchHelper(),
      setField: new PatchHelper(),
      isFieldOfBase: new PatchHelper()
    };
    constructor(base) {
      super(base);
      const _thisHelper = this;
      for (const type of Object.keys(this.patchHelpers)) {
        const helper = this.patchHelpers[type];
        helper.setData({
          target: this.getGlobal("Zotero").Item.prototype,
          funcSign: type,
          patcher: (original) => function(field, ...args) {
            const originalThis = this;
            const handler = _thisHelper.data[type][field];
            if (typeof handler === "function") try {
              return handler(field, args[0], args[1], originalThis, original);
            } catch (e) {
              return field + String(e);
            }
            return original.apply(originalThis, [field, ...args]);
          },
          enabled: true
        });
      }
    }
    register(type, field, hook) {
      this.data[type][field] = hook;
    }
    unregister(type, field) {
      delete this.data[type][field];
    }
    unregisterAll() {
      this.data.getField = {};
      this.data.setField = {};
      this.data.isFieldOfBase = {};
      this.patchHelpers.getField.disable();
      this.patchHelpers.setField.disable();
      this.patchHelpers.isFieldOfBase.disable();
    }
  };
  var wait_exports = {};
  __export(wait_exports, {
    waitForReader: () => waitForReader,
    waitUntil: () => waitUntil,
    waitUntilAsync: () => waitUntilAsync,
    waitUtilAsync: () => waitUtilAsync
  });
  var basicTool = new BasicTool();
  function waitUntil(condition, callback, interval = 100, timeout = 1e4) {
    const start = Date.now();
    const intervalId = basicTool.getGlobal("setInterval")(() => {
      if (condition()) {
        basicTool.getGlobal("clearInterval")(intervalId);
        callback();
      } else if (Date.now() - start > timeout) basicTool.getGlobal("clearInterval")(intervalId);
    }, interval);
  }
  var waitUtilAsync = waitUntilAsync;
  function waitUntilAsync(condition, interval = 100, timeout = 1e4) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const intervalId = basicTool.getGlobal("setInterval")(() => {
        if (condition()) {
          basicTool.getGlobal("clearInterval")(intervalId);
          resolve();
        } else if (Date.now() - start > timeout) {
          basicTool.getGlobal("clearInterval")(intervalId);
          reject(/* @__PURE__ */ new Error("timeout"));
        }
      }, interval);
    });
  }
  async function waitForReader(reader) {
    await reader._initPromise;
    await reader._lastView.initializedPromise;
    if (reader.type === "pdf") await reader._lastView._iframeWindow.PDFViewerApplication.initializedPromise;
  }
  var KeyboardManager = class extends ManagerTool {
    _keyboardCallbacks = /* @__PURE__ */ new Set();
    _cachedKey;
    id;
    constructor(base) {
      super(base);
      this.id = `kbd-${Zotero.Utilities.randomString()}`;
      this._ensureAutoUnregisterAll();
      this.addListenerCallback("onMainWindowLoad", this.initKeyboardListener);
      this.addListenerCallback("onMainWindowUnload", this.unInitKeyboardListener);
      this.initReaderKeyboardListener();
      for (const win of Zotero.getMainWindows()) this.initKeyboardListener(win);
    }
    /**
    * Register a keyboard event listener.
    * @param callback The callback function.
    */
    register(callback) {
      this._keyboardCallbacks.add(callback);
    }
    /**
    * Unregister a keyboard event listener.
    * @param callback The callback function.
    */
    unregister(callback) {
      this._keyboardCallbacks.delete(callback);
    }
    /**
    * Unregister all keyboard event listeners.
    */
    unregisterAll() {
      this._keyboardCallbacks.clear();
      this.removeListenerCallback("onMainWindowLoad", this.initKeyboardListener);
      this.removeListenerCallback("onMainWindowUnload", this.unInitKeyboardListener);
      for (const win of Zotero.getMainWindows()) this.unInitKeyboardListener(win);
    }
    initKeyboardListener = this._initKeyboardListener.bind(this);
    unInitKeyboardListener = this._unInitKeyboardListener.bind(this);
    initReaderKeyboardListener() {
      Zotero.Reader.registerEventListener("renderToolbar", (event) => this.addReaderKeyboardCallback(event), this._basicOptions.api.pluginID);
      Zotero.Reader._readers.forEach((reader) => this.addReaderKeyboardCallback({ reader }));
    }
    async addReaderKeyboardCallback(event) {
      const reader = event.reader;
      const initializedKey = `_ztoolkitKeyboard${this.id}Initialized`;
      await waitForReader(reader);
      if (!reader._iframeWindow) return;
      if (reader._iframeWindow[initializedKey]) return;
      this._initKeyboardListener(reader._iframeWindow);
      waitUntil(() => !Components.utils.isDeadWrapper(reader._internalReader) && reader._internalReader?._primaryView?._iframeWindow, () => this._initKeyboardListener(reader._internalReader._primaryView?._iframeWindow));
      reader._iframeWindow[initializedKey] = true;
    }
    _initKeyboardListener(win) {
      if (!win) return;
      win.addEventListener("keydown", this.triggerKeydown);
      win.addEventListener("keyup", this.triggerKeyup);
    }
    _unInitKeyboardListener(win) {
      if (!win) return;
      win.removeEventListener("keydown", this.triggerKeydown);
      win.removeEventListener("keyup", this.triggerKeyup);
    }
    triggerKeydown = (e) => {
      if (!this._cachedKey) this._cachedKey = new KeyModifier(e);
      else this._cachedKey.merge(new KeyModifier(e), { allowOverwrite: false });
      this.dispatchCallback(e, { type: "keydown" });
    };
    triggerKeyup = async (e) => {
      if (!this._cachedKey) return;
      const currentShortcut = new KeyModifier(this._cachedKey);
      this._cachedKey = void 0;
      this.dispatchCallback(e, {
        keyboard: currentShortcut,
        type: "keyup"
      });
    };
    dispatchCallback(...args) {
      this._keyboardCallbacks.forEach((cbk) => cbk(...args));
    }
  };
  var KeyModifier = class KeyModifier2 {
    accel = false;
    shift = false;
    control = false;
    meta = false;
    alt = false;
    key = "";
    useAccel = false;
    constructor(raw, options) {
      this.useAccel = options?.useAccel || false;
      if (typeof raw === "undefined") {
      } else if (typeof raw === "string") {
        raw = raw || "";
        raw = this.unLocalized(raw);
        this.accel = raw.includes("accel");
        this.shift = raw.includes("shift");
        this.control = raw.includes("control");
        this.meta = raw.includes("meta");
        this.alt = raw.includes("alt");
        this.key = raw.replace(/(accel|shift|control|meta|alt|[ ,\-])/g, "").toLocaleLowerCase();
        if (!this.key && (raw.includes(",,") || raw === ",")) this.key = ",";
      } else if (raw instanceof KeyModifier2) this.merge(raw, { allowOverwrite: true });
      else {
        if (options?.useAccel) if (Zotero.isMac) this.accel = raw.metaKey;
        else this.accel = raw.ctrlKey;
        this.shift = raw.shiftKey;
        this.control = raw.ctrlKey;
        this.meta = raw.metaKey;
        this.alt = raw.altKey;
        if (![
          "Shift",
          "Meta",
          "Ctrl",
          "Alt",
          "Control"
        ].includes(raw.key)) this.key = raw.key;
      }
    }
    /**
    * Merge another KeyModifier into this one.
    * @param newMod the new KeyModifier
    * @param options
    * @param options.allowOverwrite
    * @returns KeyModifier
    */
    merge(newMod, options) {
      const allowOverwrite = options?.allowOverwrite || false;
      this.mergeAttribute("accel", newMod.accel, allowOverwrite);
      this.mergeAttribute("shift", newMod.shift, allowOverwrite);
      this.mergeAttribute("control", newMod.control, allowOverwrite);
      this.mergeAttribute("meta", newMod.meta, allowOverwrite);
      this.mergeAttribute("alt", newMod.alt, allowOverwrite);
      this.mergeAttribute("key", newMod.key, allowOverwrite);
      return this;
    }
    /**
    * Check if the current KeyModifier equals to another KeyModifier.
    * @param newMod the new KeyModifier
    * @returns true if equals
    */
    equals(newMod) {
      if (typeof newMod === "string") newMod = new KeyModifier2(newMod);
      if (this.shift !== newMod.shift || this.alt !== newMod.alt || this.key.toLowerCase() !== newMod.key.toLowerCase()) return false;
      if (this.accel || newMod.accel) {
        if (Zotero.isMac) {
          if ((this.accel || this.meta) !== (newMod.accel || newMod.meta) || this.control !== newMod.control) return false;
        } else if ((this.accel || this.control) !== (newMod.accel || newMod.control) || this.meta !== newMod.meta) return false;
      } else if (this.control !== newMod.control || this.meta !== newMod.meta) return false;
      return true;
    }
    /**
    * Get the raw string representation of the KeyModifier.
    */
    getRaw() {
      const enabled = [];
      this.accel && enabled.push("accel");
      this.shift && enabled.push("shift");
      this.control && enabled.push("control");
      this.meta && enabled.push("meta");
      this.alt && enabled.push("alt");
      this.key && enabled.push(this.key);
      return enabled.join(",");
    }
    /**
    * Get the localized string representation of the KeyModifier.
    */
    getLocalized() {
      const raw = this.getRaw();
      if (Zotero.isMac) return raw.replaceAll("control", "\u2303").replaceAll("alt", "\u2325").replaceAll("shift", "\u21E7").replaceAll("meta", "\u2318");
      else return raw.replaceAll("control", "Ctrl").replaceAll("alt", "Alt").replaceAll("shift", "Shift").replaceAll("meta", "Win");
    }
    /**
    * Get the un-localized string representation of the KeyModifier.
    */
    unLocalized(raw) {
      if (Zotero.isMac) return raw.replaceAll("\u2303", "control").replaceAll("\u2325", "alt").replaceAll("\u21E7", "shift").replaceAll("\u2318", "meta");
      else return raw.replaceAll("Ctrl", "control").replaceAll("Alt", "alt").replaceAll("Shift", "shift").replaceAll("Win", "meta");
    }
    mergeAttribute(attribute, value, allowOverwrite) {
      if (allowOverwrite || !this[attribute]) this[attribute] = value;
    }
  };
  var MenuManager = class extends ManagerTool {
    ui;
    constructor(base) {
      super(base);
      this.ui = new UITool(this);
    }
    /**
    * Insert an menu item/menu(with popup)/menuseprator into a menupopup
    * @remarks
    * options:
    * ```ts
    * export interface MenuitemOptions {
    *   tag: "menuitem" | "menu" | "menuseparator";
    *   id?: string;
    *   label?: string;
    *   // data url (chrome://xxx.png) or base64 url (data:image/png;base64,xxx)
    *   icon?: string;
    *   class?: string;
    *   styles?: { [key: string]: string };
    *   hidden?: boolean;
    *   disabled?: boolean;
    *   oncommand?: string;
    *   commandListener?: EventListenerOrEventListenerObject;
    *   // Attributes below are used when type === "menu"
    *   popupId?: string;
    *   onpopupshowing?: string;
    *   subElementOptions?: Array<MenuitemOptions>;
    * }
    * ```
    * @param menuPopup
    * @param options
    * @param insertPosition
    * @param anchorElement The menuitem will be put before/after `anchorElement`. If not set, put at start/end of the menupopup.
    * @example
    * Insert menuitem with icon into item menupopup
    * ```ts
    * // base64 or chrome:// url
    * const menuIcon = "chrome://addontemplate/content/icons/favicon@0.5x.png";
    * ztoolkit.Menu.register("item", {
    *   tag: "menuitem",
    *   id: "zotero-itemmenu-addontemplate-test",
    *   label: "Addon Template: Menuitem",
    *   oncommand: "alert('Hello World! Default Menuitem.')",
    *   icon: menuIcon,
    * });
    * ```
    * @example
    * Insert menu into file menupopup
    * ```ts
    * ztoolkit.Menu.register(
    *   "menuFile",
    *   {
    *     tag: "menu",
    *     label: "Addon Template: Menupopup",
    *     subElementOptions: [
    *       {
    *         tag: "menuitem",
    *         label: "Addon Template",
    *         oncommand: "alert('Hello World! Sub Menuitem.')",
    *       },
    *     ],
    *   },
    *   "before",
    *   Zotero.getMainWindow().document.querySelector(
    *     "#zotero-itemmenu-addontemplate-test"
    *   )
    * );
    * ```
    */
    register(menuPopup, options, insertPosition = "after", anchorElement) {
      let popup;
      if (typeof menuPopup === "string") popup = this.getGlobal("document").querySelector(MenuSelector[menuPopup]);
      else popup = menuPopup;
      if (!popup) return false;
      const doc = popup.ownerDocument;
      const genMenuElement = (menuitemOption) => {
        const elementOption = {
          tag: menuitemOption.tag,
          id: menuitemOption.id,
          namespace: "xul",
          attributes: {
            label: menuitemOption.label || "",
            hidden: Boolean(menuitemOption.hidden),
            disabled: Boolean(menuitemOption.disabled),
            class: menuitemOption.class || "",
            oncommand: menuitemOption.oncommand || ""
          },
          classList: menuitemOption.classList,
          styles: menuitemOption.styles || {},
          listeners: [],
          children: []
        };
        if (menuitemOption.icon) {
          if (!this.getGlobal("Zotero").isMac) if (menuitemOption.tag === "menu") elementOption.attributes.class += " menu-iconic";
          else elementOption.attributes.class += " menuitem-iconic";
          elementOption.styles["list-style-image"] = `url(${menuitemOption.icon})`;
        }
        if (menuitemOption.commandListener) elementOption.listeners?.push({
          type: "command",
          listener: menuitemOption.commandListener
        });
        if (menuitemOption.tag === "menuitem") {
          elementOption.attributes.type = menuitemOption.type || "";
          elementOption.attributes.checked = menuitemOption.checked || false;
        }
        const menuItem = this.ui.createElement(doc, menuitemOption.tag, elementOption);
        if (menuitemOption.isHidden || menuitemOption.getVisibility) popup?.addEventListener("popupshowing", async (ev) => {
          let hidden;
          if (menuitemOption.isHidden) hidden = await menuitemOption.isHidden(menuItem, ev);
          else if (menuitemOption.getVisibility) {
            const visible = await menuitemOption.getVisibility(menuItem, ev);
            hidden = typeof visible === "undefined" ? void 0 : !visible;
          }
          if (typeof hidden === "undefined") return;
          if (hidden) menuItem.setAttribute("hidden", "true");
          else menuItem.removeAttribute("hidden");
        });
        if (menuitemOption.isDisabled) popup?.addEventListener("popupshowing", async (ev) => {
          const disabled = await menuitemOption.isDisabled(menuItem, ev);
          if (typeof disabled === "undefined") return;
          if (disabled) menuItem.setAttribute("disabled", "true");
          else menuItem.removeAttribute("disabled");
        });
        if ((menuitemOption.tag === "menuitem" || menuitemOption.tag === "menuseparator") && menuitemOption.onShowing) popup?.addEventListener("popupshowing", async (ev) => {
          await menuitemOption.onShowing(menuItem, ev);
        });
        if (menuitemOption.tag === "menu") {
          const subPopup = this.ui.createElement(doc, "menupopup", {
            id: menuitemOption.popupId,
            attributes: { onpopupshowing: menuitemOption.onpopupshowing || "" }
          });
          menuitemOption.children?.forEach((childOption) => {
            subPopup.append(genMenuElement(childOption));
          });
          menuItem.append(subPopup);
        }
        return menuItem;
      };
      const topMenuItem = genMenuElement(options);
      if (popup.childElementCount) {
        if (!anchorElement) anchorElement = insertPosition === "after" ? popup.lastElementChild : popup.firstElementChild;
        anchorElement[insertPosition](topMenuItem);
      } else popup.appendChild(topMenuItem);
    }
    unregister(menuId) {
      this.getGlobal("document").querySelector(`#${menuId}`)?.remove();
    }
    unregisterAll() {
      this.ui.unregisterAll();
    }
  };
  var MenuSelector = /* @__PURE__ */ (function(MenuSelector$1) {
    MenuSelector$1["menuFile"] = "#menu_FilePopup";
    MenuSelector$1["menuEdit"] = "#menu_EditPopup";
    MenuSelector$1["menuView"] = "#menu_viewPopup";
    MenuSelector$1["menuGo"] = "#menu_goPopup";
    MenuSelector$1["menuTools"] = "#menu_ToolsPopup";
    MenuSelector$1["menuHelp"] = "#menu_HelpPopup";
    MenuSelector$1["collection"] = "#zotero-collectionmenu";
    MenuSelector$1["item"] = "#zotero-itemmenu";
    return MenuSelector$1;
  })(MenuSelector || {});
  var Prompt = class {
    ui;
    base;
    get document() {
      return this.base.getGlobal("document");
    }
    /**
    * Record the last text entered
    */
    lastInputText = "";
    /**
    * Default text
    */
    defaultText = {
      placeholder: "Select a command...",
      empty: "No commands found."
    };
    /**
    * It controls the max line number of commands displayed in `commandsNode`.
    */
    maxLineNum = 12;
    /**
    * It controls the max number of suggestions.
    */
    maxSuggestionNum = 100;
    /**
    * The top-level HTML div node of `Prompt`
    */
    promptNode;
    /**
    * The HTML input node of `Prompt`.
    */
    inputNode;
    /**
    * Save all commands registered by all addons.
    */
    commands = [];
    /**
    * Initialize `Prompt` but do not create UI.
    */
    constructor() {
      this.base = new BasicTool();
      this.ui = new UITool();
      this.initializeUI();
    }
    /**
    * Initialize `Prompt` UI and then bind events on it.
    */
    initializeUI() {
      this.addStyle();
      this.createHTML();
      this.initInputEvents();
      this.registerShortcut();
    }
    createHTML() {
      this.promptNode = this.ui.createElement(this.document, "div", {
        styles: { display: "none" },
        children: [{
          tag: "div",
          styles: {
            position: "fixed",
            left: "0",
            top: "0",
            backgroundColor: "transparent",
            width: "100%",
            height: "100%"
          },
          listeners: [{
            type: "click",
            listener: () => {
              this.promptNode.style.display = "none";
            }
          }]
        }]
      });
      this.promptNode.appendChild(this.ui.createElement(this.document, "div", {
        id: `zotero-plugin-toolkit-prompt`,
        classList: ["prompt-container"],
        children: [
          {
            tag: "div",
            classList: ["input-container"],
            children: [{
              tag: "input",
              classList: ["prompt-input"],
              attributes: {
                type: "text",
                placeholder: this.defaultText.placeholder
              }
            }, {
              tag: "div",
              classList: ["cta"]
            }]
          },
          {
            tag: "div",
            classList: ["commands-containers"]
          },
          {
            tag: "div",
            classList: ["instructions"],
            children: [
              {
                tag: "div",
                classList: ["instruction"],
                children: [{
                  tag: "span",
                  classList: ["key"],
                  properties: { innerText: "\u2191\u2193" }
                }, {
                  tag: "span",
                  properties: { innerText: "to navigate" }
                }]
              },
              {
                tag: "div",
                classList: ["instruction"],
                children: [{
                  tag: "span",
                  classList: ["key"],
                  properties: { innerText: "enter" }
                }, {
                  tag: "span",
                  properties: { innerText: "to trigger" }
                }]
              },
              {
                tag: "div",
                classList: ["instruction"],
                children: [{
                  tag: "span",
                  classList: ["key"],
                  properties: { innerText: "esc" }
                }, {
                  tag: "span",
                  properties: { innerText: "to exit" }
                }]
              }
            ]
          }
        ]
      }));
      this.inputNode = this.promptNode.querySelector("input");
      this.document.documentElement.appendChild(this.promptNode);
    }
    /**
    * Show commands in a new `commandsContainer`
    * All other `commandsContainer` is hidden
    * @param commands Command[]
    * @param clear remove all `commandsContainer` if true
    */
    showCommands(commands, clear = false) {
      if (clear) this.promptNode.querySelectorAll(".commands-container").forEach((e) => e.remove());
      this.inputNode.placeholder = this.defaultText.placeholder;
      const commandsContainer = this.createCommandsContainer();
      for (const command of commands) {
        try {
          if (!command.name || command.when && !command.when()) continue;
        } catch {
          continue;
        }
        commandsContainer.appendChild(this.createCommandNode(command));
      }
    }
    /**
    * Create a `commandsContainer` div element, append to `commandsContainer` and hide others.
    * @returns commandsNode
    */
    createCommandsContainer() {
      const commandsContainer = this.ui.createElement(this.document, "div", { classList: ["commands-container"] });
      this.promptNode.querySelectorAll(".commands-container").forEach((e) => {
        e.style.display = "none";
      });
      this.promptNode.querySelector(".commands-containers").appendChild(commandsContainer);
      return commandsContainer;
    }
    /**
    * Return current displayed `commandsContainer`
    * @returns
    */
    getCommandsContainer() {
      return [...Array.from(this.promptNode.querySelectorAll(".commands-container"))].find((e) => {
        return e.style.display !== "none";
      });
    }
    /**
    * Create a command item for `Prompt` UI.
    * @param command
    * @returns
    */
    createCommandNode(command) {
      const commandNode = this.ui.createElement(this.document, "div", {
        classList: ["command"],
        children: [{
          tag: "div",
          classList: ["content"],
          children: [{
            tag: "div",
            classList: ["name"],
            children: [{
              tag: "span",
              properties: { innerText: command.name }
            }]
          }, {
            tag: "div",
            classList: ["aux"],
            children: command.label ? [{
              tag: "span",
              classList: ["label"],
              properties: { innerText: command.label }
            }] : []
          }]
        }],
        listeners: [{
          type: "mousemove",
          listener: () => {
            this.selectItem(commandNode);
          }
        }, {
          type: "click",
          listener: async () => {
            await this.execCallback(command.callback);
          }
        }]
      });
      commandNode.command = command;
      return commandNode;
    }
    /**
    * Called when `enter` key is pressed.
    */
    trigger() {
      [...Array.from(this.promptNode.querySelectorAll(".commands-container"))].find((e) => e.style.display !== "none").querySelector(".selected").click();
    }
    /**
    * Called when `escape` key is pressed.
    */
    exit() {
      this.inputNode.placeholder = this.defaultText.placeholder;
      if (this.promptNode.querySelectorAll(".commands-containers .commands-container").length >= 2) {
        this.promptNode.querySelector(".commands-container:last-child").remove();
        const commandsContainer = this.promptNode.querySelector(".commands-container:last-child");
        commandsContainer.style.display = "";
        commandsContainer.querySelectorAll(".commands").forEach((e) => e.style.display = "flex");
        this.inputNode.focus();
      } else this.promptNode.style.display = "none";
    }
    async execCallback(callback) {
      if (Array.isArray(callback)) this.showCommands(callback);
      else await callback(this);
    }
    /**
    * Match suggestions for user's entered text.
    */
    async showSuggestions(inputText) {
      const _w = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]/;
      const jw = /\s/;
      const Ww = /[\u0F00-\u0FFF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF66-\uFF9F]/;
      function Yw(e$1, t, n, i) {
        if (e$1.length === 0) return 0;
        let r = 0;
        r -= Math.max(0, e$1.length - 1), r -= i / 10;
        const o = e$1[0][0];
        return r -= (e$1[e$1.length - 1][1] - o + 1 - t) / 100, r -= o / 1e3, r -= n / 1e4;
      }
      function $w(e$1, t, n, i) {
        if (e$1.length === 0) return null;
        for (var r = n.toLowerCase(), o = 0, a = 0, s = [], l = 0; l < e$1.length; l++) {
          const c = e$1[l];
          const u = r.indexOf(c, a);
          if (u === -1) return null;
          const h = n.charAt(u);
          if (u > 0 && !_w.test(h) && !Ww.test(h)) {
            const p = n.charAt(u - 1);
            if (h.toLowerCase() !== h && p.toLowerCase() !== p || h.toUpperCase() !== h && !_w.test(p) && !jw.test(p) && !Ww.test(p)) if (i) {
              if (u !== a) {
                a += c.length, l--;
                continue;
              }
            } else o += 1;
          }
          if (s.length === 0) s.push([u, u + c.length]);
          else {
            const d = s[s.length - 1];
            d[1] < u ? s.push([u, u + c.length]) : d[1] = u + c.length;
          }
          a = u + c.length;
        }
        return {
          matches: s,
          score: Yw(s, t.length, r.length, o)
        };
      }
      function Gw(e$1) {
        for (var t = e$1.toLowerCase(), n = [], i = 0, r = 0; r < t.length; r++) {
          const o = t.charAt(r);
          jw.test(o) ? (i !== r && n.push(t.substring(i, r)), i = r + 1) : (_w.test(o) || Ww.test(o)) && (i !== r && n.push(t.substring(i, r)), n.push(o), i = r + 1);
        }
        return i !== t.length && n.push(t.substring(i, t.length)), {
          query: e$1,
          tokens: n,
          fuzzy: t.split("")
        };
      }
      function Xw(e$1, t) {
        if (e$1.query === "") return {
          score: 0,
          matches: []
        };
        const n = $w(e$1.tokens, e$1.query, t, false);
        return n || $w(e$1.fuzzy, e$1.query, t, true);
      }
      const e = Gw(inputText);
      let container = this.getCommandsContainer();
      if (container.classList.contains("suggestions")) this.exit();
      if (inputText.trim() == "") return true;
      const suggestions = [];
      this.getCommandsContainer().querySelectorAll(".command").forEach((commandNode) => {
        const spanNode = commandNode.querySelector(".name span");
        const spanText = spanNode.innerText;
        const res = Xw(e, spanText);
        if (res) {
          commandNode = this.createCommandNode(commandNode.command);
          let spanHTML = "";
          let i = 0;
          for (let j = 0; j < res.matches.length; j++) {
            const [start, end] = res.matches[j];
            if (start > i) spanHTML += spanText.slice(i, start);
            spanHTML += `<span class="highlight">${spanText.slice(start, end)}</span>`;
            i = end;
          }
          if (i < spanText.length) spanHTML += spanText.slice(i, spanText.length);
          commandNode.querySelector(".name span").innerHTML = spanHTML;
          suggestions.push({
            score: res.score,
            commandNode
          });
        }
      });
      if (suggestions.length > 0) {
        suggestions.sort((a, b) => b.score - a.score).slice(this.maxSuggestionNum);
        container = this.createCommandsContainer();
        container.classList.add("suggestions");
        suggestions.forEach((suggestion) => {
          container.appendChild(suggestion.commandNode);
        });
        return true;
      } else {
        const anonymousCommand = this.commands.find((c) => !c.name && (!c.when || c.when()));
        if (anonymousCommand) await this.execCallback(anonymousCommand.callback);
        else this.showTip(this.defaultText.empty);
        return false;
      }
    }
    /**
    * Bind events of pressing `keydown` and `keyup` key.
    */
    initInputEvents() {
      this.promptNode.addEventListener("keydown", (event) => {
        if (["ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          let selectedIndex;
          const allItems = [...Array.from(this.getCommandsContainer().querySelectorAll(".command"))].filter((e) => e.style.display != "none");
          selectedIndex = allItems.findIndex((e) => e.classList.contains("selected"));
          if (selectedIndex != -1) {
            allItems[selectedIndex].classList.remove("selected");
            selectedIndex += event.key == "ArrowUp" ? -1 : 1;
          } else if (event.key == "ArrowUp") selectedIndex = allItems.length - 1;
          else selectedIndex = 0;
          if (selectedIndex == -1) selectedIndex = allItems.length - 1;
          else if (selectedIndex == allItems.length) selectedIndex = 0;
          allItems[selectedIndex].classList.add("selected");
          const commandsContainer = this.getCommandsContainer();
          commandsContainer.scrollTo(0, commandsContainer.querySelector(".selected").offsetTop - commandsContainer.offsetHeight + 7.5);
          allItems[selectedIndex].classList.add("selected");
        }
      });
      this.promptNode.addEventListener("keyup", async (event) => {
        if (event.key == "Enter") this.trigger();
        else if (event.key == "Escape") if (this.inputNode.value.length > 0) this.inputNode.value = "";
        else this.exit();
        else if (["ArrowUp", "ArrowDown"].includes(event.key)) return;
        const currentInputText = this.inputNode.value;
        if (currentInputText == this.lastInputText) return;
        this.lastInputText = currentInputText;
        window.setTimeout(async () => {
          await this.showSuggestions(currentInputText);
        });
      });
    }
    /**
    * Create a commandsContainer and display a text
    */
    showTip(text) {
      const tipNode = this.ui.createElement(this.document, "div", {
        classList: ["tip"],
        properties: { innerText: text }
      });
      const container = this.createCommandsContainer();
      container.classList.add("suggestions");
      container.appendChild(tipNode);
      return tipNode;
    }
    /**
    * Mark the selected item with class `selected`.
    * @param item HTMLDivElement
    */
    selectItem(item) {
      this.getCommandsContainer().querySelectorAll(".command").forEach((e) => e.classList.remove("selected"));
      item.classList.add("selected");
    }
    addStyle() {
      const style$1 = this.ui.createElement(this.document, "style", {
        namespace: "html",
        id: "prompt-style"
      });
      style$1.innerText = `
      .prompt-container * {
        box-sizing: border-box;
      }
      .prompt-container {
        ---radius---: 10px;
        position: fixed;
        left: 25%;
        top: 10%;
        width: 50%;
        border-radius: var(---radius---);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 18px;
        box-shadow: 0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
                    0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
                    0px 30px 90px rgba(0, 0, 0, 0.2);
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
        background-color: var(--material-background) !important;
        border: var(--material-border-quarternary) !important;
      }
      
      /* input */
      .prompt-container .input-container  {
        width: 100%;
      }

      .input-container input {
        width: -moz-available;
        height: 40px;
        padding: 24px;
        border: none;
        outline: none;
        font-size: 18px;
        margin: 0 !important;
        border-radius: var(---radius---);
        background-color: var(--material-background);
      }
      
      .input-container .cta {
        border-bottom: var(--material-border-quarternary);
        margin: 5px auto;
      }
      
      /* results */
      .commands-containers {
        width: 100%;
        height: 100%;
      }
      .commands-container {
        max-height: calc(${this.maxLineNum} * 35.5px);
        width: calc(100% - 12px);
        margin-left: 12px;
        margin-right: 0%;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      .commands-container .command {
        display: flex;
        align-content: baseline;
        justify-content: space-between;
        border-radius: 5px;
        padding: 6px 12px;
        margin-right: 12px;
        margin-top: 2px;
        margin-bottom: 2px;
      }
      .commands-container .command .content {
        display: flex;
        width: 100%;
        justify-content: space-between;
        flex-direction: row;
        overflow: hidden;
      }
      .commands-container .command .content .name {
        white-space: nowrap; 
        text-overflow: ellipsis;
        overflow: hidden;
      }
      .commands-container .command .content .aux {
        display: flex;
        align-items: center;
        align-self: center;
        flex-shrink: 0;
      }
      
      .commands-container .command .content .aux .label {
        font-size: 15px;
        color: var(--fill-primary);
        padding: 2px 6px;
        background-color: var(--color-background);
        border-radius: 5px;
      }
      
      .commands-container .selected {
          background-color: var(--material-mix-quinary);
      }

      .commands-container .highlight {
        font-weight: bold;
      }

      .tip {
        color: var(--fill-primary);
        text-align: center;
        padding: 12px 12px;
        font-size: 18px;
      }

      /* instructions */
      .instructions {
        display: flex;
        align-content: center;
        justify-content: center;
        font-size: 15px;
        height: 2.5em;
        width: 100%;
        border-top: var(--material-border-quarternary);
        color: var(--fill-secondary);
        margin-top: 5px;
      }
      
      .instructions .instruction {
        margin: auto .5em;  
      }
      
      .instructions .key {
        margin-right: .2em;
        font-weight: 600;
      }
    `;
      this.document.documentElement.appendChild(style$1);
    }
    registerShortcut() {
      this.document.addEventListener("keydown", (event) => {
        if (event.shiftKey && event.key.toLowerCase() == "p") {
          if (event.originalTarget.isContentEditable || "value" in event.originalTarget || this.commands.length == 0) return;
          event.preventDefault();
          event.stopPropagation();
          if (this.promptNode.style.display == "none") {
            this.promptNode.style.display = "flex";
            if (this.promptNode.querySelectorAll(".commands-container").length == 1) this.showCommands(this.commands, true);
            this.promptNode.focus();
            this.inputNode.focus();
          } else this.promptNode.style.display = "none";
        }
      }, true);
    }
  };
  var PromptManager = class extends ManagerTool {
    prompt;
    /**
    * Save the commands registered from this manager
    */
    commands = [];
    constructor(base) {
      super(base);
      const globalCache = toolkitGlobal_default.getInstance()?.prompt;
      if (!globalCache) throw new Error("Prompt is not initialized.");
      if (!globalCache._ready) {
        globalCache._ready = true;
        globalCache.instance = new Prompt();
      }
      this.prompt = globalCache.instance;
    }
    /**
    * Register commands. Don't forget to call `unregister` on plugin exit.
    * @param commands Command[]
    * @example
    * ```ts
    * let getReader = () => {
    *   return BasicTool.getZotero().Reader.getByTabID(
    *     (Zotero.getMainWindow().Zotero_Tabs).selectedID
    *   )
    * }
    *
    * register([
    *   {
    *     name: "Split Horizontally",
    *     label: "Zotero",
    *     when: () => getReader() as boolean,
    *     callback: (prompt: Prompt) => getReader().menuCmd("splitHorizontally")
    *   },
    *   {
    *     name: "Split Vertically",
    *     label: "Zotero",
    *     when: () => getReader() as boolean,
    *     callback: (prompt: Prompt) => getReader().menuCmd("splitVertically")
    *   }
    * ])
    * ```
    */
    register(commands) {
      commands.forEach((c) => c.id ??= c.name);
      this.prompt.commands = [...this.prompt.commands, ...commands];
      this.commands = [...this.commands, ...commands];
      this.prompt.showCommands(this.commands, true);
    }
    /**
    * You can delete a command registed before by its name.
    * @remarks
    * There is a premise here that the names of all commands registered by a single plugin are not duplicated.
    * @param id Command.name
    */
    unregister(id) {
      this.prompt.commands = this.prompt.commands.filter((c) => c.id != id);
      this.commands = this.commands.filter((c) => c.id != id);
    }
    /**
    * Call `unregisterAll` on plugin exit.
    */
    unregisterAll() {
      this.prompt.commands = this.prompt.commands.filter((c) => {
        return this.commands.every((_c) => _c.id != c.id);
      });
      this.commands = [];
    }
  };
  var ExtraFieldTool = class extends BasicTool {
    getExtraFields(item, parser = "enhanced") {
      const extraFiledRaw = item.getField("extra");
      if (parser === "classical") return this.getGlobal("Zotero").Utilities.Internal.extractExtraFields(extraFiledRaw).fields;
      else {
        const map = /* @__PURE__ */ new Map();
        const nonStandardFields = [];
        extraFiledRaw.split("\n").forEach((line) => {
          if (!line) return;
          const split = line.split(": ");
          if (split.length >= 2 && split[0]) {
            const key = split[0];
            const value = split.slice(1).join(": ");
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(value);
          } else nonStandardFields.push(line);
        });
        if (nonStandardFields.length > 0) map.set("__nonStandard__", [nonStandardFields.join("\n")]);
        return map;
      }
    }
    getExtraField(item, key, all = false) {
      const fields = this.getExtraFields(item, "enhanced");
      const values = fields.get(key);
      if (!values) return void 0;
      return all ? values : values[0];
    }
    /**
    * Replace extra field of an item.
    * @param item
    * @param fields
    * @param [options] Additional options.
    * @param [options.save] Whether to save the item, default to true.
    */
    async replaceExtraFields(item, fields, options = {}) {
      const { save = true } = options;
      const kvs = [];
      fields.forEach((values, key) => {
        key === "__nonStandard__" ? kvs.push(...fields.get("__nonStandard__")) : values.forEach((v) => kvs.push(`${key}: ${v}`));
      });
      item.setField("extra", kvs.join("\n"));
      if (save) await item.saveTx();
    }
    /**
    * Set a key-value pair in the item's extra field.
    * If the key already exists, it can be overwritten or appended.
    * @param item Zotero item
    * @param key Field key
    * @param value Field value or list of values
    * @param options Additional options
    * @param [options.append] Whether to append to existing values, default to false
    * @param [options.save] Whether to save the item, default to true
    */
    async setExtraField(item, key, value, options = {}) {
      const { append = false, save = true } = options;
      const fields = this.getExtraFields(item, "enhanced");
      if (value === "" || typeof value === "undefined") fields.delete(key);
      else {
        const values = Array.isArray(value) ? value : [value];
        if (append && fields.has(key)) fields.get(key).push(...values);
        else fields.set(key, values);
      }
      await this.replaceExtraFields(item, fields, { save });
    }
  };
  var ReaderTool = class extends BasicTool {
    /**
    * Get the selected tab reader.
    * @param waitTime Wait for n MS until the reader is ready
    */
    async getReader(waitTime = 5e3) {
      const Zotero_Tabs = this.getGlobal("Zotero_Tabs");
      if (Zotero_Tabs.selectedType !== "reader") return void 0;
      let reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
      let delayCount = 0;
      const checkPeriod = 50;
      while (!reader && delayCount * checkPeriod < waitTime) {
        await new Promise((resolve) => setTimeout(resolve, checkPeriod));
        reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
        delayCount++;
      }
      await reader?._initPromise;
      return reader;
    }
    /**
    * Get all window readers.
    */
    getWindowReader() {
      const Zotero_Tabs = this.getGlobal("Zotero_Tabs");
      const windowReaders = [];
      const tabs = Zotero_Tabs._tabs.map((e) => e.id);
      for (let i = 0; i < Zotero.Reader._readers.length; i++) {
        let flag = false;
        for (let j = 0; j < tabs.length; j++) if (Zotero.Reader._readers[i].tabID === tabs[j]) {
          flag = true;
          break;
        }
        if (!flag) windowReaders.push(Zotero.Reader._readers[i]);
      }
      return windowReaders;
    }
    /**
    * Get Reader tabpanel deck element.
    * @deprecated - use item pane api
    * @alpha
    */
    getReaderTabPanelDeck() {
      const deck = this.getGlobal("window").document.querySelector(".notes-pane-deck")?.previousElementSibling;
      return deck;
    }
    /**
    * Add a reader tabpanel deck selection change observer.
    * @deprecated - use item pane api
    * @alpha
    * @param callback
    */
    async addReaderTabPanelDeckObserver(callback) {
      await waitUtilAsync(() => !!this.getReaderTabPanelDeck());
      const deck = this.getReaderTabPanelDeck();
      const observer = new (this.getGlobal("MutationObserver"))(async (mutations) => {
        mutations.forEach(async (mutation) => {
          const target = mutation.target;
          if (target.classList.contains("zotero-view-tabbox") || target.tagName === "deck") callback();
        });
      });
      observer.observe(deck, {
        attributes: true,
        attributeFilter: ["selectedIndex"],
        subtree: true
      });
      return observer;
    }
    /**
    * Get the selected annotation data.
    * @param reader Target reader
    * @returns The selected annotation data.
    */
    getSelectedAnnotationData(reader) {
      const annotation = reader?._internalReader._lastView._selectionPopup?.annotation;
      return annotation;
    }
    /**
    * Get the text selection of reader.
    * @param reader Target reader
    * @returns The text selection of reader.
    */
    getSelectedText(reader) {
      return this.getSelectedAnnotationData(reader)?.text ?? "";
    }
  };
  var ZoteroToolkit = class extends BasicTool {
    static _version = BasicTool._version;
    UI = new UITool(this);
    Reader = new ReaderTool(this);
    ExtraField = new ExtraFieldTool(this);
    FieldHooks = new FieldHookManager(this);
    Keyboard = new KeyboardManager(this);
    Prompt = new PromptManager(this);
    Menu = new MenuManager(this);
    Clipboard = makeHelperTool(ClipboardHelper, this);
    FilePicker = makeHelperTool(FilePickerHelper, this);
    Patch = makeHelperTool(PatchHelper, this);
    ProgressWindow = makeHelperTool(ProgressWindowHelper, this);
    VirtualizedTable = makeHelperTool(VirtualizedTableHelper, this);
    Dialog = makeHelperTool(DialogHelper, this);
    LargePrefObject = makeHelperTool(LargePrefHelper, this);
    Guide = makeHelperTool(GuideHelper, this);
    constructor() {
      super();
    }
    /**
    * Unregister everything created by managers.
    */
    unregisterAll() {
      unregister(this);
    }
  };

  // package.json
  var config = {
    addonName: "Moment-o7",
    addonID: "momento7@zotero.org",
    addonRef: "momento7",
    addonInstance: "MomentO7",
    prefsPrefix: "extensions.momento7"
  };

  // src/utils/locale.ts
  function initLocale() {
    const l10n = new (typeof Localization === "undefined" ? ztoolkit.getGlobal("Localization") : Localization)([`${config.addonRef}-addon.ftl`], true);
    addon.data.locale = {
      current: l10n
    };
  }
  function getString(...inputs) {
    if (inputs.length === 1) {
      return _getString(inputs[0]);
    } else if (inputs.length === 2) {
      if (typeof inputs[1] === "string") {
        return _getString(inputs[0], { branch: inputs[1] });
      } else {
        return _getString(inputs[0], inputs[1]);
      }
    } else {
      throw new Error("Invalid arguments");
    }
  }
  function _getString(localeString, options = {}) {
    const localStringWithPrefix = `${config.addonRef}-${localeString}`;
    const { branch, args } = options;
    const pattern = addon.data.locale?.current.formatMessagesSync([
      { id: localStringWithPrefix, args }
    ])[0];
    if (!pattern) {
      return localStringWithPrefix;
    }
    if (branch && pattern.attributes) {
      return pattern.attributes.find((attr) => attr.name === branch)?.value || localStringWithPrefix;
    } else {
      return pattern.value || localStringWithPrefix;
    }
  }

  // src/utils/SecureCredentialStorage.ts
  var SecureCredentialStorage = class {
    static ORIGIN = "chrome://zotero";
    static REALM = "Momento7 Credentials";
    /**
     * Store credential securely using nsILoginManager
     * Creates or updates a credential in the OS keychain
     */
    static async set(key, value) {
      if (!key || !value) {
        throw new Error("Credential key and value are required");
      }
      try {
        const loginInfo = Components.classes["@mozilla.org/login-manager/loginInfo;1"].createInstance(Components.interfaces.nsILoginInfo);
        loginInfo.init(
          this.ORIGIN,
          // origin: identifies the storage location
          null,
          // formActionOrigin: not used for generic credentials
          this.REALM,
          // httpRealm: identifies the credential set
          key,
          // username: credential key (e.g., "iaAccessKey")
          value,
          // password: credential value (the actual API key)
          "",
          // usernameField: not used
          ""
          // passwordField: not used
        );
        const existing = await this.get(key);
        if (existing !== void 0) {
          const oldLogins = await Services.logins.searchLoginsAsync({
            origin: this.ORIGIN,
            httpRealm: this.REALM
          });
          const oldLogin = oldLogins.find((login) => login.username === key);
          if (oldLogin) {
            Services.logins.modifyLogin(oldLogin, loginInfo);
            Zotero.debug(`MomentO7: Updated credential ${key} in secure storage`);
            return;
          }
        }
        await Services.logins.addLoginAsync(loginInfo);
        Zotero.debug(`MomentO7: Stored credential ${key} in secure storage`);
      } catch (error) {
        Zotero.debug(`MomentO7: Failed to store credential ${key}: ${error}`);
        throw new Error(
          `Failed to store credential: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    /**
     * Retrieve credential from nsILoginManager
     * Returns undefined if credential not found
     */
    static async get(key) {
      if (!key) return void 0;
      try {
        const logins = await Services.logins.searchLoginsAsync({
          origin: this.ORIGIN,
          httpRealm: this.REALM
        });
        const login = logins.find((login2) => login2.username === key);
        return login?.password;
      } catch (error) {
        Zotero.debug(`MomentO7: Failed to retrieve credential ${key}: ${error}`);
        return void 0;
      }
    }
    /**
     * Delete credential from nsILoginManager
     * Removes the credential from the OS keychain
     */
    static async delete(key) {
      if (!key) return;
      try {
        const logins = await Services.logins.searchLoginsAsync({
          origin: this.ORIGIN,
          httpRealm: this.REALM
        });
        const login = logins.find((login2) => login2.username === key);
        if (login) {
          Services.logins.removeLogin(login);
          Zotero.debug(`MomentO7: Deleted credential ${key} from secure storage`);
        }
      } catch (error) {
        Zotero.debug(`MomentO7: Failed to delete credential ${key}: ${error}`);
      }
    }
    /**
     * Clear all Momento7 credentials from nsILoginManager
     * Removes all credentials in the Momento7 Credentials set
     */
    static async clear() {
      try {
        const logins = await Services.logins.searchLoginsAsync({
          origin: this.ORIGIN,
          httpRealm: this.REALM
        });
        for (const login of logins) {
          Services.logins.removeLogin(login);
        }
        Zotero.debug(
          `MomentO7: Cleared all ${logins.length} credentials from secure storage`
        );
      } catch (error) {
        Zotero.debug(`MomentO7: Failed to clear credentials: ${error}`);
      }
    }
    /**
     * Check if any credentials exist
     * Useful for determining if credentials have been set up
     */
    static async exists(key) {
      const credential = await this.get(key);
      return credential !== void 0;
    }
  };

  // src/utils/CredentialManager.ts
  var CredentialManager = class _CredentialManager {
    static instance;
    migrationComplete = false;
    constructor() {
    }
    static getInstance() {
      if (!_CredentialManager.instance) {
        _CredentialManager.instance = new _CredentialManager();
      }
      return _CredentialManager.instance;
    }
    /**
     * Get a profile-specific identifier for key derivation
     * Used only for migration of old encrypted credentials
     */
    getProfileIdentifier() {
      try {
        const zotero = Zotero;
        const profileDir = zotero.Profile?.dir || zotero.DataDirectory?.dir || "unknown";
        return `momento7:${profileDir}`;
      } catch {
        return "momento7:fallback-profile";
      }
    }
    /**
     * Store a credential securely using nsILoginManager
     * Replaces old encrypted storage with OS-native keychain
     */
    async set(key, value) {
      if (!key || !value) {
        throw new Error("Credential key and value are required");
      }
      await SecureCredentialStorage.set(key, value);
      this.cleanupLegacyStorage(key);
    }
    /**
     * Retrieve a credential from nsILoginManager
     * Attempts to read from old storage for backward compatibility
     */
    async get(key) {
      if (!key) return void 0;
      return await SecureCredentialStorage.get(key);
    }
    /**
     * Delete a credential from nsILoginManager
     */
    async delete(key) {
      if (!key) return;
      await SecureCredentialStorage.delete(key);
      this.cleanupLegacyStorage(key);
    }
    /**
     * Clear all credentials from nsILoginManager
     */
    async clear() {
      await SecureCredentialStorage.clear();
      const legacyKeys = [
        "iaAccessKey",
        "iaSecretKey",
        "permaCCApiKey",
        "orcidApiKey"
      ];
      for (const key of legacyKeys) {
        this.cleanupLegacyStorage(key);
      }
    }
    /**
     * Check if a credential exists
     */
    async exists(key) {
      const value = await this.get(key);
      return value !== void 0;
    }
    /**
     * Compatibility method for old API
     */
    async storeCredential(key, value) {
      return this.set(key, value);
    }
    /**
     * Compatibility method for old API
     */
    async getCredential(key) {
      return this.get(key);
    }
    /**
     * Compatibility method for old API
     */
    async hasCredential(key) {
      return this.exists(key);
    }
    /**
     * Migrate credentials from old storage (Zotero.Prefs) to nsILoginManager
     * Handles all legacy formats: plaintext, base64 obfuscated, and encrypted
     */
    async migrateIfNeeded() {
      if (this.migrationComplete) return;
      const credentialKeys = [
        "iaAccessKey",
        "iaSecretKey",
        "permaCCApiKey",
        "orcidApiKey"
      ];
      for (const key of credentialKeys) {
        const prefKey = `extensions.momento7.${key}`;
        const storedValue = Zotero.Prefs.get(prefKey);
        if (!storedValue || typeof storedValue !== "string") continue;
        try {
          let decryptedValue;
          if (storedValue.startsWith("encrypted:")) {
            const encrypted = storedValue.substring(10);
            decryptedValue = await this.attemptDecryption(encrypted);
            if (!decryptedValue) {
              Zotero.debug(
                `MomentO7: Cannot decrypt credential ${key} - user must re-enter`
              );
              continue;
            }
          } else if (storedValue.startsWith("b64:")) {
            const obfuscated = storedValue.substring(4);
            decryptedValue = this.deobfuscateBase64(obfuscated);
          } else {
            decryptedValue = storedValue;
          }
          if (decryptedValue) {
            await SecureCredentialStorage.set(key, decryptedValue);
            Zotero.Prefs.clear(prefKey);
            Zotero.debug(
              `MomentO7: Migrated credential ${key} to secure storage`
            );
          }
        } catch (error) {
          Zotero.debug(`MomentO7: Failed to migrate credential ${key}: ${error}`);
        }
      }
      this.migrationComplete = true;
    }
    /**
     * Attempt to decrypt old Web Crypto encrypted credentials
     * Uses profile-based key derivation (same as old implementation)
     * Returns undefined if decryption fails
     */
    async attemptDecryption(encryptedData) {
      try {
        const profileId = this.getProfileIdentifier();
        const salt = new TextEncoder().encode("momento7-credential-salt-v1");
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(profileId),
          "PBKDF2",
          false,
          ["deriveBits", "deriveKey"]
        );
        const key = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt,
            iterations: 1e5,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
        const decoded = atob(encryptedData);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          bytes[i] = decoded.charCodeAt(i);
        }
        const iv = bytes.slice(0, 12);
        const ciphertext = bytes.slice(12);
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          ciphertext
        );
        return new TextDecoder().decode(decrypted);
      } catch (error) {
        Zotero.debug(`MomentO7: Decryption attempt failed: ${error}`);
        return void 0;
      }
    }
    /**
     * Deobfuscate old base64-encoded credentials for migration
     */
    deobfuscateBase64(value) {
      try {
        const decoded = atob(value);
        return decoded.split("").reverse().join("");
      } catch {
        return "";
      }
    }
    /**
     * Remove legacy credential storage from Zotero.Prefs
     */
    cleanupLegacyStorage(key) {
      const prefKey = `extensions.momento7.${key}`;
      if (Zotero.Prefs.get(prefKey)) {
        Zotero.Prefs.clear(prefKey);
      }
    }
  };

  // src/modules/preferences/PreferencesManager.ts
  var PreferencesManager = class _PreferencesManager {
    static instance;
    prefix = config.prefsPrefix;
    // Default preferences
    defaults = {
      autoArchive: true,
      defaultService: "internetarchive",
      iaTimeout: 12e4,
      iaMaxRetries: 3,
      iaRetryDelay: 5e3,
      robustLinkServices: ["internetarchive", "archivetoday"],
      fallbackOrder: [
        "internetarchive",
        "archivetoday",
        "arquivopt",
        "permacc",
        "ukwebarchive"
      ],
      checkBeforeArchive: true,
      archiveAgeThresholdHours: 24,
      skipExistingMementos: false,
      // Empty string means use direct submission (no proxy)
      // Users can configure their own Cloudflare Worker proxy URL
      archiveTodayProxyUrl: ""
    };
    constructor() {
    }
    static getInstance() {
      if (!_PreferencesManager.instance) {
        _PreferencesManager.instance = new _PreferencesManager();
      }
      return _PreferencesManager.instance;
    }
    /**
     * Initialize preferences with defaults
     */
    async init() {
      for (const [key, value] of Object.entries(this.defaults)) {
        const prefKey = `${this.prefix}.${key}`;
        if (Zotero.Prefs.get(prefKey) === void 0) {
          this.setPref(key, value);
        }
      }
      const credManager = CredentialManager.getInstance();
      await credManager.migrateIfNeeded();
    }
    /**
     * Get all preferences
     */
    getAll() {
      return {
        autoArchive: this.getPref("autoArchive"),
        defaultService: this.getPref("defaultService"),
        iaTimeout: this.getPref("iaTimeout"),
        iaMaxRetries: this.getPref("iaMaxRetries"),
        iaRetryDelay: this.getPref("iaRetryDelay"),
        robustLinkServices: this.getPref("robustLinkServices"),
        fallbackOrder: this.getPref("fallbackOrder"),
        checkBeforeArchive: this.getPref("checkBeforeArchive"),
        archiveAgeThresholdHours: this.getPref("archiveAgeThresholdHours"),
        skipExistingMementos: this.getPref("skipExistingMementos"),
        archiveTodayProxyUrl: this.getPref("archiveTodayProxyUrl")
      };
    }
    /**
     * Get a single preference
     */
    getPref(key) {
      const prefKey = `${this.prefix}.${key}`;
      const defaultValue = this.defaults[key];
      const value = Zotero.Prefs.get(prefKey);
      if (value === void 0) {
        return defaultValue;
      }
      if (Array.isArray(defaultValue) && typeof value === "string") {
        return value.split(",").map((s) => s.trim());
      }
      return value;
    }
    /**
     * Set a preference
     */
    setPref(key, value) {
      const prefKey = `${this.prefix}.${key}`;
      if (Array.isArray(value)) {
        Zotero.Prefs.set(prefKey, value.join(","));
      } else {
        Zotero.Prefs.set(prefKey, value);
      }
    }
    /**
     * Reset all preferences to defaults
     */
    resetToDefaults() {
      for (const key of Object.keys(this.defaults)) {
        this.setPref(key, this.defaults[key]);
      }
    }
    // Static convenience methods
    static getTimeout() {
      return _PreferencesManager.getInstance().getPref("iaTimeout");
    }
    static getRobustLinkServices() {
      return _PreferencesManager.getInstance().getPref("robustLinkServices");
    }
    static getFallbackOrder() {
      return _PreferencesManager.getInstance().getPref("fallbackOrder");
    }
    static async hasIACredentials() {
      const credManager = CredentialManager.getInstance();
      const accessKey = await credManager.getCredential("iaAccessKey");
      const secretKey = await credManager.getCredential("iaSecretKey");
      return !!(accessKey && secretKey);
    }
    static async getIACredentials() {
      const credManager = CredentialManager.getInstance();
      return {
        accessKey: await credManager.getCredential("iaAccessKey"),
        secretKey: await credManager.getCredential("iaSecretKey")
      };
    }
    static getCheckBeforeArchive() {
      return _PreferencesManager.getInstance().getPref("checkBeforeArchive");
    }
    static getArchiveAgeThreshold() {
      const hours = _PreferencesManager.getInstance().getPref(
        "archiveAgeThresholdHours"
      );
      return hours * 60 * 60 * 1e3;
    }
    static getSkipExistingMementos() {
      return _PreferencesManager.getInstance().getPref("skipExistingMementos");
    }
    // Alias methods for backward compatibility
    static shouldCheckBeforeArchive() {
      return _PreferencesManager.getCheckBeforeArchive();
    }
    static shouldSkipExistingMementos() {
      return _PreferencesManager.getSkipExistingMementos();
    }
    static getArchiveAgeThresholdMs() {
      return _PreferencesManager.getArchiveAgeThreshold();
    }
    static async getPermaCCApiKey() {
      const credManager = CredentialManager.getInstance();
      return credManager.getCredential("permaCCApiKey");
    }
    static getEnabledServices() {
      return _PreferencesManager.getInstance().getPref("fallbackOrder");
    }
    static getDefaultService() {
      return _PreferencesManager.getInstance().getPref("defaultService");
    }
    static isAutoArchiveEnabled() {
      return _PreferencesManager.getInstance().getPref("autoArchive");
    }
    /**
     * Get the Archive.today proxy URL
     * Returns empty string if no proxy configured (use direct submission)
     */
    static getArchiveTodayProxyUrl() {
      return _PreferencesManager.getInstance().getPref("archiveTodayProxyUrl");
    }
  };

  // src/modules/monitoring/Metrics.ts
  var DEFAULT_CONFIG = {
    maxEntries: 5e3,
    aggregationIntervals: [
      60 * 60 * 1e3,
      // 1 hour
      24 * 60 * 60 * 1e3,
      // 1 day
      7 * 24 * 60 * 60 * 1e3
      // 1 week
    ],
    enablePersistence: true,
    maxErrorCounters: 100,
    // Limit unique error type counters
    counterHistoryLimit: 500
    // Reduced from 1000 for memory efficiency
  };
  var Counter = class {
    constructor(name, labels = {}, historyLimit = 500) {
      this.name = name;
      this.labels = labels;
      this.historyLimit = historyLimit;
    }
    value = 0;
    history = [];
    lastAccess = Date.now();
    historyLimit;
    inc(delta = 1) {
      this.value += delta;
      this.lastAccess = Date.now();
      this.history.push({ timestamp: Date.now(), value: this.value });
      if (this.history.length > this.historyLimit) {
        this.history = this.history.slice(-this.historyLimit);
      }
    }
    getLastAccess() {
      return this.lastAccess;
    }
    get() {
      return this.value;
    }
    getRate(windowMs) {
      const now = Date.now();
      const windowStart = now - windowMs;
      const inWindow = this.history.filter((h) => h.timestamp >= windowStart);
      if (inWindow.length < 2) return 0;
      const first = inWindow[0];
      const last = inWindow[inWindow.length - 1];
      const duration = (last.timestamp - first.timestamp) / 1e3;
      return duration > 0 ? (last.value - first.value) / duration : 0;
    }
    reset() {
      this.value = 0;
      this.history = [];
    }
  };
  var Gauge = class {
    constructor(name, labels = {}) {
      this.name = name;
      this.labels = labels;
    }
    value = 0;
    set(value) {
      this.value = value;
    }
    inc(delta = 1) {
      this.value += delta;
    }
    dec(delta = 1) {
      this.value -= delta;
    }
    get() {
      return this.value;
    }
  };
  var Histogram = class {
    constructor(name, bucketBoundaries = [
      10,
      50,
      100,
      250,
      500,
      1e3,
      2500,
      5e3,
      1e4
    ], labels = {}, maxValues = 5e3) {
      this.name = name;
      this.bucketBoundaries = bucketBoundaries;
      this.labels = labels;
      this.maxValues = maxValues;
      for (const boundary of bucketBoundaries) {
        this.buckets.set(boundary, 0);
      }
      this.buckets.set(Infinity, 0);
    }
    values = [];
    buckets = /* @__PURE__ */ new Map();
    sum = 0;
    count = 0;
    maxValues;
    observe(value) {
      this.values.push(value);
      this.sum += value;
      this.count++;
      for (const boundary of [...this.bucketBoundaries, Infinity]) {
        if (value <= boundary) {
          this.buckets.set(boundary, (this.buckets.get(boundary) || 0) + 1);
        }
      }
      if (this.values.length > this.maxValues) {
        this.values = this.values.slice(-this.maxValues);
      }
    }
    getPercentile(p) {
      if (this.values.length === 0) return 0;
      const sorted = [...this.values].sort((a, b) => a - b);
      const index = Math.ceil(p / 100 * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    }
    getMean() {
      return this.count > 0 ? this.sum / this.count : 0;
    }
    getCount() {
      return this.count;
    }
    getSum() {
      return this.sum;
    }
    getBuckets() {
      return new Map(this.buckets);
    }
    reset() {
      this.values = [];
      this.sum = 0;
      this.count = 0;
      for (const boundary of this.buckets.keys()) {
        this.buckets.set(boundary, 0);
      }
    }
  };
  var Timer = class {
    constructor(name, labels = {}) {
      this.name = name;
      this.labels = labels;
      this.histogram = new Histogram(
        name,
        [10, 50, 100, 250, 500, 1e3, 2500, 5e3, 1e4, 3e4, 6e4],
        labels
      );
    }
    histogram;
    activeTimers = /* @__PURE__ */ new Map();
    start(id = "default") {
      this.activeTimers.set(id, Date.now());
    }
    stop(id = "default") {
      const startTime = this.activeTimers.get(id);
      if (!startTime) {
        return 0;
      }
      const duration = Date.now() - startTime;
      this.histogram.observe(duration);
      this.activeTimers.delete(id);
      return duration;
    }
    /**
     * Time an async operation
     */
    async time(fn) {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        this.histogram.observe(duration);
        return { result, duration };
      } catch (error) {
        const duration = Date.now() - start;
        this.histogram.observe(duration);
        throw error;
      }
    }
    /**
     * Observe a duration directly (without start/stop)
     */
    observe(duration) {
      this.histogram.observe(duration);
    }
    getPercentile(p) {
      return this.histogram.getPercentile(p);
    }
    getMean() {
      return this.histogram.getMean();
    }
    getCount() {
      return this.histogram.getCount();
    }
  };
  var MetricsRegistry = class _MetricsRegistry {
    static instance;
    config;
    // Core metrics
    archiveAttempts;
    archiveSuccesses;
    archiveFailures;
    archiveDuration;
    activeOperations;
    serviceErrors = /* @__PURE__ */ new Map();
    archiveHistory = [];
    constructor(config2 = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config2 };
      this.archiveAttempts = new Counter("archive_attempts_total");
      this.archiveSuccesses = new Counter("archive_successes_total");
      this.archiveFailures = new Counter("archive_failures_total");
      this.archiveDuration = new Timer("archive_duration_ms");
      this.activeOperations = new Gauge("active_operations");
    }
    static getInstance(config2) {
      if (!_MetricsRegistry.instance) {
        _MetricsRegistry.instance = new _MetricsRegistry(config2);
      }
      return _MetricsRegistry.instance;
    }
    /**
     * Record an archive operation
     */
    recordArchive(metrics) {
      this.archiveAttempts.inc();
      if (metrics.success) {
        this.archiveSuccesses.inc();
      } else {
        this.archiveFailures.inc();
        const errorKey = `${metrics.serviceId}:${metrics.errorType || "unknown"}`;
        if (!this.serviceErrors.has(errorKey)) {
          if (this.serviceErrors.size >= this.config.maxErrorCounters) {
            this.cleanupStaleErrorCounters();
          }
          if (this.serviceErrors.size < this.config.maxErrorCounters) {
            this.serviceErrors.set(
              errorKey,
              new Counter(
                `errors_${errorKey}`,
                {},
                this.config.counterHistoryLimit
              )
            );
          }
        }
        this.serviceErrors.get(errorKey)?.inc();
      }
      this.archiveDuration.observe(metrics.duration);
      this.archiveHistory.push(metrics);
      if (this.archiveHistory.length > this.config.maxEntries) {
        this.archiveHistory = this.archiveHistory.slice(-this.config.maxEntries);
      }
    }
    /**
     * Remove stale error counters that haven't been accessed recently
     * Keeps the most recently used counters up to half the limit
     */
    cleanupStaleErrorCounters() {
      const maxToKeep = Math.floor(this.config.maxErrorCounters / 2);
      const countersWithAccess = [];
      for (const [key, counter] of this.serviceErrors) {
        countersWithAccess.push({ key, lastAccess: counter.getLastAccess() });
      }
      countersWithAccess.sort((a, b) => a.lastAccess - b.lastAccess);
      const toRemove = countersWithAccess.slice(
        0,
        countersWithAccess.length - maxToKeep
      );
      for (const { key } of toRemove) {
        this.serviceErrors.delete(key);
      }
    }
    /**
     * Track active operations
     */
    startOperation() {
      this.activeOperations.inc();
    }
    endOperation() {
      this.activeOperations.dec();
    }
    /**
     * Create a timer for an operation
     */
    createTimer(name, labels) {
      return new Timer(name, labels);
    }
    /**
     * Get current metrics snapshot
     */
    getSnapshot() {
      const attempts = this.archiveAttempts.get();
      const successes = this.archiveSuccesses.get();
      const errorBreakdown = {};
      for (const [key, counter] of this.serviceErrors) {
        errorBreakdown[key] = counter.get();
      }
      return {
        archiveAttempts: attempts,
        archiveSuccesses: successes,
        archiveFailures: this.archiveFailures.get(),
        successRate: attempts > 0 ? successes / attempts : 0,
        avgDuration: this.archiveDuration.getMean(),
        p50Duration: this.archiveDuration.getPercentile(50),
        p95Duration: this.archiveDuration.getPercentile(95),
        p99Duration: this.archiveDuration.getPercentile(99),
        activeOperations: this.activeOperations.get(),
        errorBreakdown
      };
    }
    /**
     * Get aggregated stats for a time period
     */
    getAggregatedStats(periodMs) {
      const now = Date.now();
      const startTime = now - periodMs;
      const periodArchives = this.archiveHistory.filter(
        (a) => a.duration >= startTime
        // Using duration as timestamp proxy
      );
      const serviceBreakdown = {};
      const errorBreakdown = {};
      const uniqueUrls = /* @__PURE__ */ new Set();
      for (const archive of periodArchives) {
        uniqueUrls.add(archive.url);
        if (!serviceBreakdown[archive.serviceId]) {
          serviceBreakdown[archive.serviceId] = {
            attempts: 0,
            successes: 0,
            failures: 0,
            avgLatency: 0
          };
        }
        const svc = serviceBreakdown[archive.serviceId];
        svc.attempts++;
        if (archive.success) {
          svc.successes++;
        } else {
          svc.failures++;
          const errKey = archive.errorType || "unknown";
          errorBreakdown[errKey] = (errorBreakdown[errKey] || 0) + 1;
        }
        svc.avgLatency = (svc.avgLatency * (svc.attempts - 1) + archive.duration) / svc.attempts;
      }
      const period = periodMs <= 36e5 ? "hour" : periodMs <= 864e5 ? "day" : periodMs <= 6048e5 ? "week" : "month";
      return {
        period,
        startTime,
        endTime: now,
        archiveAttempts: periodArchives.length,
        archiveSuccesses: periodArchives.filter((a) => a.success).length,
        archiveFailures: periodArchives.filter((a) => !a.success).length,
        serviceBreakdown,
        errorBreakdown,
        uniqueUrls: uniqueUrls.size
      };
    }
    /**
     * Get service-specific metrics
     */
    getServiceMetrics(serviceId) {
      const serviceArchives = this.archiveHistory.filter(
        (a) => a.serviceId === serviceId
      );
      const successes = serviceArchives.filter((a) => a.success).length;
      const totalDuration = serviceArchives.reduce(
        (sum, a) => sum + a.duration,
        0
      );
      return {
        attempts: serviceArchives.length,
        successes,
        failures: serviceArchives.length - successes,
        successRate: serviceArchives.length > 0 ? successes / serviceArchives.length : 0,
        avgDuration: serviceArchives.length > 0 ? totalDuration / serviceArchives.length : 0,
        recentErrors: serviceArchives.filter((a) => !a.success && a.errorType).slice(-10).map((a) => a.errorType)
      };
    }
    /**
     * Get recent archive history
     */
    getRecentArchives(limit = 50) {
      return this.archiveHistory.slice(-limit);
    }
    /**
     * Export metrics for debugging/reporting
     */
    export() {
      return JSON.stringify(
        {
          snapshot: this.getSnapshot(),
          recentArchives: this.getRecentArchives(100),
          hourlyStats: this.getAggregatedStats(36e5),
          dailyStats: this.getAggregatedStats(864e5)
        },
        null,
        2
      );
    }
    /**
     * Reset all metrics
     */
    reset() {
      this.archiveAttempts.reset();
      this.archiveSuccesses.reset();
      this.archiveFailures.reset();
      this.archiveDuration = new Timer("archive_duration_ms");
      this.activeOperations.set(0);
      this.serviceErrors.clear();
      this.archiveHistory = [];
    }
  };

  // src/modules/monitoring/Logger.ts
  var DEFAULT_CONFIG2 = {
    minLevel: 6 /* INFO */,
    maxEntries: 1e3,
    enableConsole: true,
    enablePersistence: true,
    category: "MomentO7"
  };
  var Logger = class _Logger {
    static instance;
    config;
    entries = [];
    currentTraceId;
    constructor(config2 = {}) {
      this.config = { ...DEFAULT_CONFIG2, ...config2 };
    }
    static getInstance(config2) {
      if (!_Logger.instance) {
        _Logger.instance = new _Logger(config2);
      }
      return _Logger.instance;
    }
    /**
     * Set trace ID for correlating log entries
     */
    setTraceId(traceId) {
      this.currentTraceId = traceId;
    }
    clearTraceId() {
      this.currentTraceId = void 0;
    }
    /**
     * Create a child logger with a specific category
     */
    child(category) {
      return new CategoryLogger(this, category);
    }
    /**
     * Log with full control
     */
    log(level, category, message, context, error) {
      if (level > this.config.minLevel) {
        return;
      }
      const entry = {
        timestamp: Date.now(),
        level,
        category: `${this.config.category}:${category}`,
        message,
        context,
        traceId: this.currentTraceId,
        ...error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        }
      };
      this.addEntry(entry);
      if (this.config.enableConsole) {
        this.outputToZotero(entry);
      }
    }
    // Convenience methods
    debug(category, message, context) {
      this.log(7 /* DEBUG */, category, message, context);
    }
    info(category, message, context) {
      this.log(6 /* INFO */, category, message, context);
    }
    notice(category, message, context) {
      this.log(5 /* NOTICE */, category, message, context);
    }
    warning(category, message, context) {
      this.log(4 /* WARNING */, category, message, context);
    }
    error(category, message, error, context) {
      this.log(3 /* ERROR */, category, message, context, error);
    }
    critical(category, message, error, context) {
      this.log(2 /* CRITICAL */, category, message, context, error);
    }
    /**
     * Add entry and maintain max size
     */
    addEntry(entry) {
      this.entries.push(entry);
      if (this.entries.length > this.config.maxEntries) {
        this.entries = this.entries.slice(-this.config.maxEntries);
      }
    }
    /**
     * Output to Zotero debug console
     */
    outputToZotero(entry) {
      const levelNames = {
        [7 /* DEBUG */]: "DEBUG",
        [6 /* INFO */]: "INFO",
        [5 /* NOTICE */]: "NOTICE",
        [4 /* WARNING */]: "WARN",
        [3 /* ERROR */]: "ERROR",
        [2 /* CRITICAL */]: "CRIT",
        [1 /* ALERT */]: "ALERT",
        [0 /* EMERGENCY */]: "EMERG"
      };
      const prefix = entry.traceId ? `[${entry.traceId.slice(0, 8)}] ` : "";
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
      const errorStr = entry.error ? ` | Error: ${entry.error.message}` : "";
      const formatted = `[${entry.category}] ${levelNames[entry.level]}: ${prefix}${entry.message}${contextStr}${errorStr}`;
      Zotero.debug(formatted);
    }
    /**
     * Get log entries for a time range
     */
    getEntries(options = {}) {
      let filtered = this.entries;
      if (options.since) {
        filtered = filtered.filter((e) => e.timestamp >= options.since);
      }
      if (options.until) {
        filtered = filtered.filter((e) => e.timestamp <= options.until);
      }
      if (options.level !== void 0) {
        filtered = filtered.filter((e) => e.level <= options.level);
      }
      if (options.category) {
        filtered = filtered.filter((e) => e.category.includes(options.category));
      }
      if (options.traceId) {
        filtered = filtered.filter((e) => e.traceId === options.traceId);
      }
      if (options.limit) {
        filtered = filtered.slice(-options.limit);
      }
      return filtered;
    }
    /**
     * Get error summary
     */
    getErrorSummary(since) {
      const errors = this.getEntries({
        since,
        level: 3 /* ERROR */
      });
      const summary = {};
      for (const entry of errors) {
        const key = entry.error?.name || entry.category;
        summary[key] = (summary[key] || 0) + 1;
      }
      return summary;
    }
    /**
     * Export logs to JSON
     */
    export(options = {}) {
      const entries = this.getEntries({ since: options.since });
      return JSON.stringify(entries, null, options.pretty ? 2 : void 0);
    }
    /**
     * Clear all entries
     */
    clear() {
      this.entries = [];
    }
    /**
     * Update configuration
     */
    configure(config2) {
      this.config = { ...this.config, ...config2 };
    }
  };
  var CategoryLogger = class _CategoryLogger {
    constructor(parent, category) {
      this.parent = parent;
      this.category = category;
    }
    debug(message, context) {
      this.parent.debug(this.category, message, context);
    }
    info(message, context) {
      this.parent.info(this.category, message, context);
    }
    notice(message, context) {
      this.parent.notice(this.category, message, context);
    }
    warning(message, context) {
      this.parent.warning(this.category, message, context);
    }
    error(message, error, context) {
      this.parent.error(this.category, message, error, context);
    }
    critical(message, error, context) {
      this.parent.critical(this.category, message, error, context);
    }
    child(subcategory) {
      return new _CategoryLogger(this.parent, `${this.category}:${subcategory}`);
    }
  };

  // src/utils/CircuitBreaker.ts
  var CircuitBreaker = class {
    state = "CLOSED" /* CLOSED */;
    failures = 0;
    successes = 0;
    consecutiveSuccesses = 0;
    lastFailureTime;
    totalCalls = 0;
    halfOpenCalls = 0;
    halfOpenPending = 0;
    // Track in-flight HALF_OPEN calls
    stateChangeLock = false;
    // Prevent concurrent state transitions
    options;
    constructor(options = {}) {
      this.options = {
        failureThreshold: options.failureThreshold ?? 5,
        successThreshold: options.successThreshold ?? 2,
        timeout: options.timeout ?? 6e4,
        // 1 minute
        volumeThreshold: options.volumeThreshold ?? 10,
        errorFilter: options.errorFilter ?? (() => true)
      };
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async execute(operation, fallback) {
      this.checkStateTransition();
      if (this.state === "OPEN" /* OPEN */) {
        if (fallback) {
          return fallback();
        }
        throw new Error("Circuit breaker is OPEN - service unavailable");
      }
      const isHalfOpenTest = this.state === "HALF_OPEN" /* HALF_OPEN */;
      if (isHalfOpenTest) {
        if (this.halfOpenPending >= this.options.successThreshold) {
          if (fallback) {
            return fallback();
          }
          throw new Error(
            "Circuit breaker is testing - service may be unavailable"
          );
        }
        this.halfOpenPending++;
        this.halfOpenCalls++;
      }
      this.totalCalls++;
      try {
        const result = await operation();
        this.onSuccess(isHalfOpenTest);
        return result;
      } catch (error) {
        this.onFailure(error, isHalfOpenTest);
        throw error;
      }
    }
    /**
     * Get current circuit breaker state
     */
    getState() {
      return {
        state: this.state,
        failures: this.failures,
        successes: this.successes,
        lastFailureTime: this.lastFailureTime,
        totalCalls: this.totalCalls,
        consecutiveSuccesses: this.consecutiveSuccesses
      };
    }
    /**
     * Manually reset the circuit breaker
     */
    reset() {
      this.state = "CLOSED" /* CLOSED */;
      this.failures = 0;
      this.successes = 0;
      this.consecutiveSuccesses = 0;
      this.lastFailureTime = void 0;
      this.totalCalls = 0;
      this.halfOpenCalls = 0;
      this.halfOpenPending = 0;
      this.stateChangeLock = false;
    }
    /**
     * Force the circuit to open
     */
    trip() {
      this.state = "OPEN" /* OPEN */;
      this.lastFailureTime = Date.now();
      this.consecutiveSuccesses = 0;
    }
    /**
     * Check if state should transition
     */
    checkStateTransition() {
      if (this.state === "OPEN" /* OPEN */ && this.lastFailureTime) {
        const timeSinceFailure = Date.now() - this.lastFailureTime;
        if (timeSinceFailure >= this.options.timeout) {
          this.state = "HALF_OPEN" /* HALF_OPEN */;
          this.halfOpenCalls = 0;
        }
      }
    }
    /**
     * Handle successful operation
     * @param wasHalfOpenTest - Whether this was a HALF_OPEN test call
     */
    onSuccess(wasHalfOpenTest = false) {
      this.successes++;
      this.consecutiveSuccesses++;
      if (wasHalfOpenTest) {
        this.halfOpenPending--;
      }
      if (this.state === "HALF_OPEN" /* HALF_OPEN */ && !this.stateChangeLock) {
        if (this.consecutiveSuccesses >= this.options.successThreshold) {
          this.stateChangeLock = true;
          this.state = "CLOSED" /* CLOSED */;
          this.failures = 0;
          this.halfOpenCalls = 0;
          this.halfOpenPending = 0;
          this.stateChangeLock = false;
        }
      }
    }
    /**
     * Handle failed operation
     * @param wasHalfOpenTest - Whether this was a HALF_OPEN test call
     */
    onFailure(error, wasHalfOpenTest = false) {
      if (!this.options.errorFilter(error)) {
        if (wasHalfOpenTest) {
          this.halfOpenPending--;
        }
        return;
      }
      this.failures++;
      this.consecutiveSuccesses = 0;
      this.lastFailureTime = Date.now();
      if (wasHalfOpenTest) {
        this.halfOpenPending--;
      }
      if (this.state === "HALF_OPEN" /* HALF_OPEN */ && !this.stateChangeLock) {
        this.stateChangeLock = true;
        this.state = "OPEN" /* OPEN */;
        this.halfOpenCalls = 0;
        this.halfOpenPending = 0;
        this.stateChangeLock = false;
      } else if (this.state === "CLOSED" /* CLOSED */ && this.totalCalls >= this.options.volumeThreshold && this.failures >= this.options.failureThreshold) {
        this.state = "OPEN" /* OPEN */;
      }
    }
  };
  var CircuitBreakerManager = class {
    breakers = /* @__PURE__ */ new Map();
    /**
     * Get or create a circuit breaker for a service
     */
    getBreaker(serviceId, options) {
      if (!this.breakers.has(serviceId)) {
        this.breakers.set(serviceId, new CircuitBreaker(options));
      }
      return this.breakers.get(serviceId);
    }
    /**
     * Execute operation with circuit breaker for a service
     */
    async execute(serviceId, operation, options) {
      const breaker = this.getBreaker(serviceId, options?.breakerOptions);
      return breaker.execute(operation, options?.fallback);
    }
    /**
     * Get all circuit breaker states
     */
    getAllStates() {
      const states = /* @__PURE__ */ new Map();
      for (const [id, breaker] of this.breakers) {
        states.set(id, breaker.getState());
      }
      return states;
    }
    /**
     * Reset all circuit breakers
     */
    resetAll() {
      for (const breaker of this.breakers.values()) {
        breaker.reset();
      }
    }
    /**
     * Get services that are currently available (not OPEN)
     */
    getAvailableServices() {
      return Array.from(this.breakers.entries()).filter(([_, breaker]) => breaker.getState().state !== "OPEN" /* OPEN */).map(([id]) => id);
    }
  };

  // src/modules/monitoring/HealthChecker.ts
  var DEFAULT_CONFIG3 = {
    checkIntervalMs: 3e5,
    // 5 minutes
    healthyThreshold: 0.95,
    degradedThreshold: 0.7,
    latencyThresholdMs: 3e4,
    windowMs: 36e5
    // 1 hour
  };
  var HealthChecker = class _HealthChecker {
    static instance;
    config;
    logger;
    metrics;
    circuitBreakers;
    serviceHealth = /* @__PURE__ */ new Map();
    checkInterval;
    lastCheck = 0;
    constructor(config2 = {}) {
      this.config = { ...DEFAULT_CONFIG3, ...config2 };
      this.logger = Logger.getInstance().child("HealthChecker");
      this.metrics = MetricsRegistry.getInstance();
      this.circuitBreakers = new CircuitBreakerManager();
    }
    static getInstance(config2) {
      if (!_HealthChecker.instance) {
        _HealthChecker.instance = new _HealthChecker(config2);
      }
      return _HealthChecker.instance;
    }
    /**
     * Initialize health checking for services
     */
    init(serviceIds) {
      for (const serviceId of serviceIds) {
        this.serviceHealth.set(serviceId, {
          serviceId,
          status: "unknown" /* UNKNOWN */,
          lastCheck: 0,
          successRate: 1,
          avgLatency: 0,
          circuitState: "CLOSED",
          errorCount: 0
        });
      }
      this.logger.info("Health checker initialized", { services: serviceIds });
    }
    /**
     * Start periodic health checks
     */
    startPeriodicChecks() {
      if (this.checkInterval) {
        return;
      }
      this.checkInterval = setInterval(() => {
        this.checkAllServices();
      }, this.config.checkIntervalMs);
      this.checkAllServices();
    }
    /**
     * Stop periodic health checks
     */
    stopPeriodicChecks() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = void 0;
      }
    }
    /**
     * Check health of all services
     */
    checkAllServices() {
      this.lastCheck = Date.now();
      for (const [serviceId] of this.serviceHealth) {
        this.updateServiceHealth(serviceId);
      }
      this.logger.debug("Health check complete", {
        services: this.serviceHealth.size,
        unhealthy: Array.from(this.serviceHealth.values()).filter((h) => h.status === "unhealthy" /* UNHEALTHY */).map((h) => h.serviceId)
      });
    }
    /**
     * Update health status for a single service
     */
    updateServiceHealth(serviceId) {
      const metrics = this.metrics.getServiceMetrics(serviceId);
      const circuitBreaker = this.circuitBreakers.getBreaker(serviceId);
      const circuitState = circuitBreaker.getState();
      let status;
      let message;
      if (circuitState.state === "OPEN" /* OPEN */) {
        status = "unhealthy" /* UNHEALTHY */;
        message = "Circuit breaker is open";
      } else if (metrics.successRate >= this.config.healthyThreshold) {
        if (metrics.avgDuration > this.config.latencyThresholdMs) {
          status = "degraded" /* DEGRADED */;
          message = "High latency";
        } else {
          status = "healthy" /* HEALTHY */;
        }
      } else if (metrics.successRate >= this.config.degradedThreshold) {
        status = "degraded" /* DEGRADED */;
        message = `Success rate: ${(metrics.successRate * 100).toFixed(1)}%`;
      } else if (metrics.attempts === 0) {
        status = "unknown" /* UNKNOWN */;
        message = "No recent activity";
      } else {
        status = "unhealthy" /* UNHEALTHY */;
        message = `Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`;
      }
      const health = {
        serviceId,
        status,
        lastCheck: Date.now(),
        successRate: metrics.successRate,
        avgLatency: metrics.avgDuration,
        circuitState: circuitState.state,
        errorCount: metrics.failures,
        message
      };
      this.serviceHealth.set(serviceId, health);
      const previousHealth = this.serviceHealth.get(serviceId);
      if (previousHealth && previousHealth.status !== status) {
        this.logger.notice(`Service health changed: ${serviceId}`, {
          from: previousHealth.status,
          to: status,
          message
        });
      }
    }
    /**
     * Get health status for a service
     */
    getServiceHealth(serviceId) {
      return this.serviceHealth.get(serviceId);
    }
    /**
     * Get all service health statuses
     */
    getAllHealth() {
      return Array.from(this.serviceHealth.values());
    }
    /**
     * Get only healthy services
     */
    getHealthyServices() {
      return Array.from(this.serviceHealth.entries()).filter(([_, health]) => health.status === "healthy" /* HEALTHY */).map(([id]) => id);
    }
    /**
     * Get services that are available (healthy or degraded)
     */
    getAvailableServices() {
      return Array.from(this.serviceHealth.entries()).filter(
        ([_, health]) => health.status === "healthy" /* HEALTHY */ || health.status === "degraded" /* DEGRADED */
      ).map(([id]) => id);
    }
    /**
     * Check if a service is available
     */
    isServiceAvailable(serviceId) {
      const health = this.serviceHealth.get(serviceId);
      return health !== void 0 && (health.status === "healthy" /* HEALTHY */ || health.status === "degraded" /* DEGRADED */ || health.status === "unknown" /* UNKNOWN */);
    }
    /**
     * Get circuit breaker manager for services
     */
    getCircuitBreakers() {
      return this.circuitBreakers;
    }
    /**
     * Record a successful operation (updates health)
     */
    recordSuccess(serviceId) {
      this.updateServiceHealth(serviceId);
    }
    /**
     * Record a failed operation (updates health)
     */
    recordFailure(serviceId, _error) {
      this.updateServiceHealth(serviceId);
    }
    /**
     * Get overall system health
     */
    getSystemHealth() {
      const healths = this.getAllHealth();
      const healthyCount = healths.filter(
        (h) => h.status === "healthy" /* HEALTHY */
      ).length;
      const degradedCount = healths.filter(
        (h) => h.status === "degraded" /* DEGRADED */
      ).length;
      const unhealthyCount = healths.filter(
        (h) => h.status === "unhealthy" /* UNHEALTHY */
      ).length;
      let status;
      if (unhealthyCount === healths.length) {
        status = "unhealthy" /* UNHEALTHY */;
      } else if (healthyCount === healths.length) {
        status = "healthy" /* HEALTHY */;
      } else if (unhealthyCount > 0 || degradedCount > 0) {
        status = "degraded" /* DEGRADED */;
      } else {
        status = "unknown" /* UNKNOWN */;
      }
      return {
        status,
        healthyCount,
        degradedCount,
        unhealthyCount,
        lastCheck: this.lastCheck
      };
    }
    /**
     * Generate health report
     */
    generateReport() {
      const systemHealth = this.getSystemHealth();
      const services = this.getAllHealth();
      const lines = [
        "=== Moment-o7 Health Report ===",
        `Generated: ${(/* @__PURE__ */ new Date()).toISOString()}`,
        `System Status: ${systemHealth.status.toUpperCase()}`,
        `  Healthy: ${systemHealth.healthyCount}`,
        `  Degraded: ${systemHealth.degradedCount}`,
        `  Unhealthy: ${systemHealth.unhealthyCount}`,
        "",
        "--- Service Details ---"
      ];
      for (const service of services) {
        const statusIcon = {
          ["healthy" /* HEALTHY */]: "\u2713",
          ["degraded" /* DEGRADED */]: "\u26A0",
          ["unhealthy" /* UNHEALTHY */]: "\u2717",
          ["unknown" /* UNKNOWN */]: "?"
        }[service.status];
        lines.push(`${statusIcon} ${service.serviceId}`);
        lines.push(`    Status: ${service.status}`);
        lines.push(
          `    Success Rate: ${(service.successRate * 100).toFixed(1)}%`
        );
        lines.push(`    Avg Latency: ${service.avgLatency.toFixed(0)}ms`);
        lines.push(`    Circuit: ${service.circuitState}`);
        if (service.message) {
          lines.push(`    Note: ${service.message}`);
        }
      }
      return lines.join("\n");
    }
  };

  // src/modules/archive/ServiceRegistry.ts
  var ServiceRegistry = class _ServiceRegistry {
    static instance;
    services = /* @__PURE__ */ new Map();
    initialized = false;
    constructor() {
    }
    static getInstance() {
      if (!_ServiceRegistry.instance) {
        _ServiceRegistry.instance = new _ServiceRegistry();
      }
      return _ServiceRegistry.instance;
    }
    init() {
      if (this.initialized) {
        return;
      }
      this.services.clear();
      this.initialized = true;
      Zotero.debug("MomentO7: Service Registry initialized");
    }
    register(id, service) {
      if (!this.initialized) {
        throw new Error("Service Registry not initialized");
      }
      if (this.services.has(id)) {
        Zotero.debug(`MomentO7: Service ${id} already registered, replacing`);
      }
      this.services.set(id, service);
      Zotero.debug(`MomentO7: Registered service: ${id}`);
    }
    unregister(id) {
      return this.services.delete(id);
    }
    get(id) {
      return this.services.get(id);
    }
    getAll() {
      return Array.from(this.services.entries()).map(([id, service]) => ({
        id,
        service
      }));
    }
    async getAvailable() {
      const available = [];
      for (const [id, service] of this.services.entries()) {
        try {
          if (await service.isAvailable()) {
            available.push({ id, service });
          }
        } catch (error) {
          Zotero.debug(
            `MomentO7: Service ${id} availability check failed: ${error}`
          );
        }
      }
      return available;
    }
    clear() {
      this.services.clear();
      this.initialized = false;
    }
  };

  // src/modules/archive/types.ts
  var ArchiveError = class extends Error {
    constructor(type, message, statusCode, retryAfter) {
      super(message);
      this.type = type;
      this.statusCode = statusCode;
      this.retryAfter = retryAfter;
      this.name = "ArchiveError";
    }
  };

  // src/utils/TrafficMonitor.ts
  var TrafficMonitor = class _TrafficMonitor {
    static instance;
    // Request timing state: requestId → { startTime, serviceId }
    requestTimers = /* @__PURE__ */ new Map();
    // Service scores: serviceId → [score1, score2, ...] (valid scores only)
    serviceScores = /* @__PURE__ */ new Map();
    // Services that have exceeded jamming threshold in current batch
    jammedServices = /* @__PURE__ */ new Set();
    // Timestamp when batch started (for stale timer cleanup)
    batchStartTime = Date.now();
    constructor() {
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
      if (!_TrafficMonitor.instance) {
        _TrafficMonitor.instance = new _TrafficMonitor();
      }
      return _TrafficMonitor.instance;
    }
    /**
     * Start tracking a request (called after 1 second delay)
     */
    startRequest(requestId, serviceId, url) {
      this.requestTimers.set(requestId, {
        startTime: Date.now(),
        serviceId
      });
      Zotero.debug(
        `MomentO7 Traffic: Start tracking ${serviceId} (${requestId}) - ${url}`
      );
    }
    /**
     * End tracking a request and calculate score
     */
    endRequest(requestId, success) {
      const timer = this.requestTimers.get(requestId);
      if (!timer) {
        return;
      }
      const { startTime, serviceId } = timer;
      const duration = (Date.now() - startTime) / 1e3;
      const score = duration * 0.1;
      this.requestTimers.delete(requestId);
      if (score >= 2) {
        this.jammedServices.add(serviceId);
        Zotero.debug(
          `MomentO7 Traffic: SERVICE JAMMED ${serviceId} (score: ${score.toFixed(2)})`
        );
      }
      if (score && score > 0 && isFinite(score)) {
        if (!this.serviceScores.has(serviceId)) {
          this.serviceScores.set(serviceId, []);
        }
        this.serviceScores.get(serviceId).push(score);
        Zotero.debug(
          `MomentO7 Traffic: ${serviceId} score=${score.toFixed(2)} mean=${this.getMeanScore(serviceId).toFixed(2)}`
        );
      }
    }
    /**
     * Get mean traffic score for a service (exclude invalid scores)
     */
    getMeanScore(serviceId) {
      const scores = this.serviceScores.get(serviceId);
      if (!scores || scores.length === 0) {
        return 0;
      }
      const sum = scores.reduce((a, b) => a + b, 0);
      return sum / scores.length;
    }
    /**
     * Check if a service is jammed for this batch
     */
    isServiceJammed(serviceId) {
      return this.jammedServices.has(serviceId);
    }
    /**
     * Get formatted traffic summary for ProgressWindow headline
     * Example: "IA: 1.2 | AT: 0.8 | PC: JAMMED"
     */
    getTrafficSummary() {
      const summaryParts = [];
      const allServices = /* @__PURE__ */ new Set();
      this.serviceScores.forEach((_, serviceId) => allServices.add(serviceId));
      this.jammedServices.forEach((serviceId) => allServices.add(serviceId));
      const sortedServices = Array.from(allServices).sort();
      for (const serviceId of sortedServices) {
        if (this.jammedServices.has(serviceId)) {
          summaryParts.push(`${this.getServiceShortName(serviceId)}: JAMMED`);
        } else {
          const mean = this.getMeanScore(serviceId);
          if (mean > 0) {
            summaryParts.push(
              `${this.getServiceShortName(serviceId)}: ${mean.toFixed(1)}`
            );
          }
        }
      }
      return summaryParts.length > 0 ? summaryParts.join(" | ") : "No traffic data";
    }
    /**
     * Get service short name for display
     */
    getServiceShortName(serviceId) {
      const shortNames = {
        internetarchive: "IA",
        archivetoday: "AT",
        permacc: "PC",
        ukwebarchive: "UWA",
        arquivopt: "APT"
      };
      return shortNames[serviceId] || serviceId.substring(0, 3).toUpperCase();
    }
    /**
     * Reset all batch-scoped state for new batch operation
     */
    resetBatch() {
      Zotero.debug("MomentO7 Traffic: Reset batch state");
      this.requestTimers.clear();
      this.serviceScores.clear();
      this.jammedServices.clear();
      this.batchStartTime = Date.now();
    }
    /**
     * Clean up stale timers (requests that never completed)
     * Called periodically to prevent memory leaks
     */
    cleanupStaleTimers() {
      const now = Date.now();
      const maxAge = 3e5;
      let staleCount = 0;
      for (const [requestId, timer] of this.requestTimers.entries()) {
        if (now - timer.startTime > maxAge) {
          this.requestTimers.delete(requestId);
          staleCount++;
        }
      }
      if (staleCount > 0) {
        Zotero.debug(`MomentO7 Traffic: Cleaned up ${staleCount} stale timers`);
      }
    }
    /**
     * Get traffic statistics for a service (for metrics/dashboard)
     */
    getServiceStats(serviceId) {
      const scores = this.serviceScores.get(serviceId) || [];
      const isJammed = this.jammedServices.has(serviceId);
      if (scores.length === 0) {
        return {
          mean: 0,
          min: 0,
          max: 0,
          count: 0,
          isJammed
        };
      }
      return {
        mean: scores.reduce((a, b) => a + b, 0) / scores.length,
        min: Math.min(...scores),
        max: Math.max(...scores),
        count: scores.length,
        isJammed
      };
    }
    /**
     * Get all jammedservices in current batch
     */
    getJammedServices() {
      return Array.from(this.jammedServices);
    }
    /**
     * Export state for debugging
     */
    getDebugState() {
      const services = {};
      const allServices = /* @__PURE__ */ new Set();
      this.serviceScores.forEach((_, id) => allServices.add(id));
      this.jammedServices.forEach((id) => allServices.add(id));
      for (const serviceId of allServices) {
        services[serviceId] = this.getServiceStats(serviceId);
      }
      return {
        activeRequests: this.requestTimers.size,
        jammedCount: this.jammedServices.size,
        batchAge: Date.now() - this.batchStartTime,
        services
      };
    }
  };

  // src/modules/archive/BaseArchiveService.ts
  var BaseArchiveService = class {
    constructor(config2) {
      this.config = config2;
    }
    lastRequest = null;
    get name() {
      return this.config.name;
    }
    get id() {
      return this.config.id;
    }
    /**
     * Archive multiple items
     */
    async archive(items) {
      const results = [];
      const progress = this.createProgressWindow();
      progress.show(
        `Archiving with ${this.name}`,
        `Processing ${items.length} items...`
      );
      for (const item of items) {
        try {
          const url = this.getBestUrl(item);
          if (!url || !this.checkValidUrl(url)) {
            results.push({
              item,
              success: false,
              error: "No valid URL found"
            });
            continue;
          }
          progress.update(`Archiving: ${url}`);
          const result = await this.archiveUrl(url, {
            onStatusUpdate: (status) => progress.update(status)
          });
          if (result.success && result.url) {
            await this.saveToItem(item, result.url);
            results.push({
              item,
              success: true,
              archivedUrl: result.url,
              service: this.name
            });
          } else {
            results.push({
              item,
              success: false,
              error: result.error || "Archive failed"
            });
          }
        } catch (error) {
          results.push({
            item,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      progress.close();
      return results;
    }
    /**
     * Check if URL is valid for archiving
     */
    checkValidUrl(url) {
      return /^https?:\/\/.+/.test(url);
    }
    /**
     * Get the best URL for archiving (prefer DOI if available)
     */
    getBestUrl(item) {
      const doiField = item.getField("DOI");
      const doi = typeof doiField === "string" ? doiField : null;
      if (doi) {
        return `https://doi.org/${doi}`;
      }
      const urlField = item.getField("url");
      const url = typeof urlField === "string" ? urlField : "";
      return url;
    }
    /**
     * Make HTTP request with traffic monitoring
     * Wraps request with TrafficMonitor to track service response times
     * Uses 1-second delayed timer start to account for network overhead
     */
    async makeHttpRequest(url, options) {
      const trafficMonitor = TrafficMonitor.getInstance();
      const requestId = `${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let monitoringStarted = false;
      const timerHandle = Zotero.setTimeout(() => {
        monitoringStarted = true;
        trafficMonitor.startRequest(requestId, this.id, url);
      }, 1e3);
      try {
        const requestOptions = {
          ...options,
          method: options.method || "GET"
        };
        const response = await Zotero.HTTP.request(url, requestOptions);
        if (!monitoringStarted) {
          Zotero.clearTimeout(timerHandle);
        } else {
          trafficMonitor.endRequest(requestId, true);
        }
        return {
          success: true,
          data: response.responseText,
          status: response.status
        };
      } catch (error) {
        if (!monitoringStarted) {
          Zotero.clearTimeout(timerHandle);
        } else {
          trafficMonitor.endRequest(requestId, false);
        }
        return {
          success: false,
          data: error.responseText || "",
          error: error.message || "Request failed",
          status: error.status
        };
      }
    }
    /**
     * Check rate limiting
     */
    async checkRateLimit() {
      if (!this.lastRequest) {
        return;
      }
      const timeSinceLastRequest = Date.now() - this.lastRequest;
      const minDelay = 1e3;
      if (timeSinceLastRequest < minDelay) {
        const waitTime = Math.ceil((minDelay - timeSinceLastRequest) / 1e3);
        throw new ArchiveError(
          "RATE_LIMIT" /* RateLimit */,
          `Rate limit: Please wait ${waitTime} seconds before trying again`,
          429,
          waitTime
        );
      }
    }
    /**
     * Update last request timestamp
     */
    updateLastRequest() {
      this.lastRequest = Date.now();
    }
    /**
     * Create robust link HTML
     */
    createRobustLinkHTML(originalUrl, archivedUrl, linkText, useArchivedHref = false) {
      const versionDate = (/* @__PURE__ */ new Date()).toISOString();
      const href = useArchivedHref ? archivedUrl : originalUrl;
      return `<a href="${this.escapeHtml(href)}" data-originalurl="${this.escapeHtml(originalUrl)}" data-versionurl="${this.escapeHtml(archivedUrl)}" data-versiondate="${versionDate}">${this.escapeHtml(linkText)}</a>`;
    }
    /**
     * Escape HTML for safe insertion
     */
    escapeHtml(text) {
      if (!text) return "";
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    }
    /**
     * Save archive URL to item
     */
    async saveToItem(item, archivedUrl, metadata = {}) {
      const originalUrlField = item.getField("url");
      const originalUrl = typeof originalUrlField === "string" ? originalUrlField : "";
      const titleField = item.getField("title");
      const linkText = typeof titleField === "string" && titleField ? titleField : originalUrl;
      const extraField = item.getField("extra");
      let extra = typeof extraField === "string" ? extraField : "";
      const archiveField = `${this.id}Archived: ${archivedUrl}`;
      if (!extra.includes(archiveField)) {
        extra = extra ? extra + "\n" + archiveField : archiveField;
        item.setField("extra", extra);
      }
      const robustLinkHTML = this.createRobustLinkHTML(
        originalUrl,
        archivedUrl,
        linkText
      );
      const noteContent = `<p>Archived version: ${robustLinkHTML}</p>
<p>Archive date: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}</p>
<p>Archive service: ${this.name}</p>
${metadata.additionalInfo ? `<p>${metadata.additionalInfo}</p>` : ""}

<p><strong>Robust Link HTML (copy and paste):</strong></p>
<pre>${this.escapeHtml(robustLinkHTML)}</pre>`;
      const note = new Zotero.Item("note");
      note.setNote(noteContent);
      note.parentID = item.id;
      await note.saveTx();
    }
    /**
     * Create progress window wrapper
     */
    createProgressWindow() {
      let progressWindow = null;
      return {
        show(title, message) {
          progressWindow = new Zotero.ProgressWindow({
            closeOnClick: false
          });
          progressWindow.changeHeadline(title);
          if (message) {
            progressWindow.addDescription(message);
          }
          progressWindow.show();
        },
        update(message) {
          if (progressWindow) {
            progressWindow.addDescription(message);
          }
        },
        close() {
          if (progressWindow) {
            progressWindow.close();
          }
        },
        error(message) {
          if (progressWindow) {
            progressWindow.close();
          }
          const errorWindow = new Zotero.ProgressWindow({
            closeOnClick: true
          });
          errorWindow.changeHeadline(`${this.name} Error`);
          errorWindow.addDescription(message);
          errorWindow.show();
          errorWindow.startCloseTimer(5e3);
        },
        success(message) {
          if (progressWindow) {
            progressWindow.close();
          }
          const successWindow = new Zotero.ProgressWindow({
            closeOnClick: true
          });
          successWindow.changeHeadline(`${this.name} Success`);
          successWindow.addDescription(message);
          successWindow.show();
          successWindow.startCloseTimer(3e3);
        }
      };
    }
    /**
     * Map HTTP error to ArchiveError
     */
    mapHttpError(error) {
      const status = error.status || error.statusCode;
      switch (status) {
        case 429:
          return new ArchiveError(
            "RATE_LIMIT" /* RateLimit */,
            "Rate limited. Please wait before trying again.",
            429
          );
        case 401:
        case 403:
          if (this.config.capabilities?.requiresAuthentication) {
            return new ArchiveError(
              "AUTH_REQUIRED" /* AuthRequired */,
              "Authentication required or invalid.",
              status
            );
          }
          return new ArchiveError(
            "BLOCKED" /* Blocked */,
            "Access denied - this site blocks archiving services.",
            status
          );
        case 404:
          return new ArchiveError(
            "NOT_FOUND" /* NotFound */,
            "The URL could not be found.",
            404
          );
        case 523:
          return new ArchiveError(
            "BLOCKED" /* Blocked */,
            "This site cannot be archived (blocked by publisher).",
            523
          );
        default:
          if (status >= 500) {
            return new ArchiveError(
              "SERVER_ERROR" /* ServerError */,
              "Archive service is temporarily unavailable.",
              status
            );
          }
          if (error.message?.includes("timeout")) {
            return new ArchiveError(
              "TIMEOUT" /* Timeout */,
              "Archive request timed out.",
              0
            );
          }
          return new ArchiveError(
            "UNKNOWN" /* Unknown */,
            error.message || "An unknown error occurred.",
            status
          );
      }
    }
  };

  // src/modules/archive/InternetArchiveService.ts
  var CREDENTIAL_PATTERN = /^[a-zA-Z0-9_-]+$/;
  function isValidCredential(value) {
    if (!value || value.length === 0) return false;
    if (value.length > 256) return false;
    return CREDENTIAL_PATTERN.test(value);
  }
  var InternetArchiveService = class extends BaseArchiveService {
    timeout;
    maxRetries;
    retryDelay;
    constructor() {
      super({
        name: "Internet Archive",
        id: "internetarchive",
        homepage: "https://archive.org",
        capabilities: {
          acceptsUrl: true,
          returnsUrl: true,
          preservesJavaScript: true,
          preservesInteractiveElements: true
        }
      });
      this.reloadSettings();
    }
    async isAvailable() {
      return true;
    }
    async archiveUrl(url, progress) {
      this.reloadSettings();
      const hasCredentials = await PreferencesManager.hasIACredentials();
      if (hasCredentials) {
        return this.archiveWithSPN2(url, progress);
      } else {
        return this.archiveWithPublicAPI(url, progress);
      }
    }
    /**
     * Archive using the authenticated SPN2 API
     */
    async archiveWithSPN2(url, progress) {
      const credentials = await PreferencesManager.getIACredentials();
      if (!isValidCredential(credentials.accessKey) || !isValidCredential(credentials.secretKey)) {
        return {
          success: false,
          error: "Invalid API credentials format. Credentials must contain only alphanumeric characters, dashes, and underscores."
        };
      }
      let lastError = new Error("Unknown error");
      let attempt = 0;
      while (attempt < this.maxRetries) {
        if (attempt > 0) {
          progress?.onStatusUpdate(
            `Retrying (attempt ${attempt + 1}/${this.maxRetries})...`
          );
          await this.delay(this.retryDelay);
        }
        try {
          progress?.onStatusUpdate(
            `Submitting ${url} to Internet Archive (authenticated)...`
          );
          const response = await Zotero.HTTP.request(
            "https://web.archive.org/save",
            {
              method: "POST",
              timeout: this.timeout,
              headers: {
                Accept: "application/json",
                Authorization: `LOW ${credentials.accessKey}:${credentials.secretKey}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: `url=${encodeURIComponent(url)}`
            }
          );
          const result = JSON.parse(response.responseText || "{}");
          if (result.url) {
            return {
              success: true,
              url: result.url,
              metadata: {
                originalUrl: url,
                archiveDate: (/* @__PURE__ */ new Date()).toISOString(),
                service: this.name,
                jobId: result.job_id
              }
            };
          } else if (result.job_id) {
            progress?.onStatusUpdate(
              "Archive job submitted, waiting for completion..."
            );
            const archivedUrl = await this.pollJobStatus(
              result.job_id,
              credentials,
              progress
            );
            if (archivedUrl) {
              return {
                success: true,
                url: archivedUrl,
                metadata: {
                  originalUrl: url,
                  archiveDate: (/* @__PURE__ */ new Date()).toISOString(),
                  service: this.name,
                  jobId: result.job_id
                }
              };
            }
          }
          throw new Error(result.message || "Failed to archive URL");
        } catch (error) {
          lastError = error;
          attempt++;
          const archiveError = error instanceof ArchiveError ? error : this.mapHttpError(error);
          if (archiveError.type === "BLOCKED" /* Blocked */ || archiveError.type === "NOT_FOUND" /* NotFound */ || archiveError.type === "INVALID_URL" /* InvalidUrl */) {
            break;
          }
        }
      }
      return {
        success: false,
        error: lastError.message
      };
    }
    /**
     * Poll the SPN2 job status endpoint
     */
    async pollJobStatus(jobId, credentials, progress) {
      if (!isValidCredential(credentials.accessKey) || !isValidCredential(credentials.secretKey)) {
        return null;
      }
      const maxPolls = 30;
      const pollInterval = 2e3;
      for (let i = 0; i < maxPolls; i++) {
        await this.delay(pollInterval);
        try {
          const response = await Zotero.HTTP.request(
            `https://web.archive.org/save/status/${jobId}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                Authorization: `LOW ${credentials.accessKey}:${credentials.secretKey}`
              }
            }
          );
          const result = JSON.parse(response.responseText || "{}");
          if (result.status === "success") {
            return `https://web.archive.org/web/${result.timestamp}/${result.original_url}`;
          } else if (result.status === "error") {
            throw new Error(result.message || "Archive job failed");
          }
          progress?.onStatusUpdate(
            `Archive in progress... (${i + 1}/${maxPolls})`
          );
        } catch (error) {
        }
      }
      return null;
    }
    /**
     * Archive using the public (unauthenticated) API - may fail if login required
     */
    async archiveWithPublicAPI(url, progress) {
      let lastError = new Error("Unknown error");
      let attempt = 0;
      let currentTimeout = this.timeout;
      while (attempt < this.maxRetries) {
        if (attempt > 0) {
          progress?.onStatusUpdate(
            `Retrying (attempt ${attempt + 1}/${this.maxRetries})...`
          );
          await this.delay(this.retryDelay);
        }
        try {
          progress?.onStatusUpdate(`Submitting ${url} to Internet Archive...`);
          const response = await Zotero.HTTP.request(
            `https://web.archive.org/save/${url}`,
            {
              timeout: currentTimeout,
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Zotero)"
              }
            }
          );
          const archivedUrl = this.extractArchivedUrl(response);
          if (archivedUrl) {
            return {
              success: true,
              url: archivedUrl,
              metadata: {
                originalUrl: url,
                archiveDate: (/* @__PURE__ */ new Date()).toISOString(),
                service: this.name
              }
            };
          } else {
            throw new Error("Could not extract archived URL from response");
          }
        } catch (error) {
          lastError = error;
          attempt++;
          if (error?.status === 401 || error?.status === 403) {
            return {
              success: false,
              error: "Internet Archive requires authentication. Please add your API keys in Moment-o7 preferences."
            };
          }
          const archiveError = error instanceof ArchiveError ? error : this.mapHttpError(error);
          if (archiveError.type === "BLOCKED" /* Blocked */ || archiveError.type === "NOT_FOUND" /* NotFound */ || archiveError.type === "INVALID_URL" /* InvalidUrl */) {
            break;
          }
          if (archiveError.type === "TIMEOUT" /* Timeout */) {
            currentTimeout = Math.min(currentTimeout * 1.5, 3e5);
          }
        }
      }
      const finalError = lastError instanceof ArchiveError ? lastError : this.mapHttpError(lastError);
      if (finalError.type === "TIMEOUT" /* Timeout */) {
        return {
          success: false,
          error: `Archive request timed out after ${attempt} attempts - the site may be slow or blocking archiving`
        };
      }
      return {
        success: false,
        error: finalError.message
      };
    }
    extractArchivedUrl(response) {
      const linkHeader = response.getResponseHeader("Link");
      if (linkHeader) {
        const matches = linkHeader.match(/<([^>]+)>;\s*rel="memento"/g);
        if (matches && matches.length > 0) {
          const lastMatch = matches[matches.length - 1];
          const urlMatch = lastMatch.match(/<([^>]+)>/);
          if (urlMatch && urlMatch.length > 1 && urlMatch[1]) {
            return urlMatch[1];
          }
        }
      }
      if (response.responseText) {
        const match = response.responseText.match(
          /https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<>]+/
        );
        if (match) {
          return match[0];
        }
      }
      return null;
    }
    async delay(ms) {
      return new Promise((resolve) => Zotero.setTimeout(resolve, ms));
    }
    reloadSettings() {
      this.timeout = PreferencesManager.getTimeout();
      this.maxRetries = Zotero.Prefs.get("extensions.momento7.iaMaxRetries") || 3;
      this.retryDelay = Zotero.Prefs.get("extensions.momento7.iaRetryDelay") || 5e3;
    }
    /**
     * Test Internet Archive credentials with a simple API call
     * Uses the API endpoint that checks credential validity
     * @static
     */
    static async testCredentials(credentials) {
      try {
        if (!isValidCredential(credentials.accessKey) || !isValidCredential(credentials.secretKey)) {
          return {
            success: false,
            message: "Invalid credential format (alphanumeric, dashes, underscores only)"
          };
        }
        const timeout = 1e4;
        const response = await Zotero.HTTP.request(
          "https://web.archive.org/save",
          {
            method: "POST",
            timeout,
            headers: {
              Accept: "application/json",
              Authorization: `LOW ${credentials.accessKey}:${credentials.secretKey}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            // Test with a simple test URL
            body: "url=https://example.com"
          }
        );
        try {
          const result = JSON.parse(response.responseText || "{}");
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              message: "Invalid credentials - Authentication failed"
            };
          }
          if (result.url || result.job_id || result.success) {
            return {
              success: true,
              message: "Credentials valid"
            };
          }
          if (result.message && result.message.includes("is not a valid")) {
            return {
              success: false,
              message: `API error: ${result.message}`
            };
          }
          return {
            success: true,
            message: "Credentials valid"
          };
        } catch {
          return response.status < 400 ? { success: true, message: "Credentials valid" } : {
            success: false,
            message: `HTTP ${response.status} error`
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Connection error: ${message}`
        };
      }
    }
  };

  // src/modules/archive/PermaCCService.ts
  var PermaCCService = class _PermaCCService extends BaseArchiveService {
    static API_BASE = "https://api.perma.cc/v1";
    defaultFolder = null;
    constructor() {
      super({
        id: "permacc",
        name: "Perma.cc",
        homepage: "https://perma.cc",
        capabilities: {
          acceptsUrl: true,
          returnsUrl: true,
          preservesJavaScript: true,
          preservesInteractiveElements: true,
          requiresAuthentication: true,
          hasQuota: true
        }
      });
      this.defaultFolder = Zotero.Prefs.get("extensions.momento7.permaccFolder") || null;
    }
    async isAvailable() {
      const apiKey = await PreferencesManager.getPermaCCApiKey();
      return apiKey !== void 0 && apiKey !== null;
    }
    /**
     * Get API key securely
     */
    async getApiKey() {
      const apiKey = await PreferencesManager.getPermaCCApiKey();
      return apiKey || null;
    }
    async archiveUrl(url, progress) {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: "Perma.cc API key not configured. Please add your API key in preferences."
        };
      }
      try {
        progress?.onStatusUpdate(`Creating Perma.cc archive for ${url}...`);
        const timeout = PreferencesManager.getTimeout();
        const body = { url };
        if (this.defaultFolder) {
          body.folder = this.defaultFolder;
        }
        const response = await this.makeHttpRequest(
          `${_PermaCCService.API_BASE}/archives/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `ApiKey ${apiKey}`
            },
            body: JSON.stringify(body),
            timeout
          }
        );
        if (!response.success) {
          return {
            success: false,
            error: this.parsePermaCCError(response)
          };
        }
        const data = JSON.parse(response.data);
        if (!data.guid) {
          return {
            success: false,
            error: "No GUID returned from Perma.cc"
          };
        }
        const archivedUrl = `https://perma.cc/${data.guid}`;
        return {
          success: true,
          url: archivedUrl,
          metadata: {
            originalUrl: url,
            archiveDate: data.creation_timestamp || (/* @__PURE__ */ new Date()).toISOString(),
            service: this.config.name,
            guid: data.guid,
            title: data.title,
            organization: data.organization,
            folder: data.folder
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred"
        };
      }
    }
    parsePermaCCError(response) {
      try {
        const error = JSON.parse(response.data);
        if (error.detail?.includes("quota")) {
          return "Perma.cc quota exceeded. Free tier allows 10 links per month.";
        }
        if (error.detail?.includes("Invalid API key")) {
          return "Invalid Perma.cc API key. Please check your credentials.";
        }
        return error.detail || error.error || response.error || "Perma.cc request failed";
      } catch {
        return response.error || "Perma.cc request failed";
      }
    }
    async checkAvailability(_url) {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { available: false };
      }
      try {
        const response = await this.makeHttpRequest(
          `${_PermaCCService.API_BASE}/user/`,
          {
            method: "GET",
            headers: {
              Authorization: `ApiKey ${apiKey}`
            },
            timeout: 3e4
          }
        );
        if (response.success) {
          return { available: true };
        }
        return { available: false };
      } catch (error) {
        return { available: false };
      }
    }
    async getFolders() {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return [];
      }
      try {
        const response = await this.makeHttpRequest(
          `${_PermaCCService.API_BASE}/folders/`,
          {
            method: "GET",
            headers: {
              Authorization: `ApiKey ${apiKey}`
            },
            timeout: 3e4
          }
        );
        if (response.success) {
          const folders = JSON.parse(response.data);
          return folders.objects || [];
        }
      } catch (error) {
        console.error("Failed to fetch Perma.cc folders:", error);
      }
      return [];
    }
    async validateApiKey(apiKey) {
      try {
        const response = await this.makeHttpRequest(
          `${_PermaCCService.API_BASE}/user/`,
          {
            method: "GET",
            headers: {
              Authorization: `ApiKey ${apiKey}`
            },
            timeout: 3e4
          }
        );
        return response.success && response.status === 200;
      } catch {
        return false;
      }
    }
    /**
     * Test Perma.cc credentials by validating API key
     * Makes a GET request to /user/ endpoint which requires valid auth
     * @static
     */
    static async testCredentials(credentials) {
      try {
        if (!credentials.apiKey || credentials.apiKey.length === 0) {
          return {
            success: false,
            message: "API key is required"
          };
        }
        const timeout = 1e4;
        const response = await Zotero.HTTP.request(
          `${_PermaCCService.API_BASE}/user/`,
          {
            method: "GET",
            timeout,
            headers: {
              Authorization: `ApiKey ${credentials.apiKey}`
            }
          }
        );
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            message: "Invalid API key - Authentication failed"
          };
        }
        if (response.status === 200) {
          return {
            success: true,
            message: "API key valid"
          };
        }
        if (response.status >= 400) {
          return {
            success: false,
            message: `HTTP ${response.status} error`
          };
        }
        return {
          success: true,
          message: "API key valid"
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Connection error: ${message}`
        };
      }
    }
  };

  // src/modules/archive/ArchiveTodayService.ts
  var ArchiveTodayService = class extends BaseArchiveService {
    // Proxy availability is tracked per-session
    proxyAvailable = true;
    constructor() {
      super({
        id: "archivetoday",
        name: "Archive.today",
        homepage: "https://archive.today",
        capabilities: {
          acceptsUrl: true,
          returnsUrl: true,
          preservesJavaScript: true,
          preservesInteractiveElements: true
        }
      });
    }
    async isAvailable() {
      return true;
    }
    async archiveUrl(url, progress) {
      try {
        const proxyUrl = PreferencesManager.getArchiveTodayProxyUrl();
        if (proxyUrl && this.proxyAvailable) {
          try {
            const result = await this.archiveViaProxy(url, proxyUrl, progress);
            if (result.success) {
              return result;
            }
          } catch (error) {
            Zotero.debug(
              `Moment-o7: Archive.today proxy failed, falling back to direct: ${error}`
            );
            this.proxyAvailable = false;
          }
        }
        return await this.archiveDirectly(url, progress);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred"
        };
      }
    }
    /**
     * Archive via a configured proxy (e.g., Cloudflare Worker)
     * Users can deploy their own proxy to handle CORS issues
     */
    async archiveViaProxy(url, proxyUrl, progress) {
      progress?.onStatusUpdate(`Submitting ${url} to Archive.today via proxy...`);
      const timeout = PreferencesManager.getTimeout();
      const response = await this.makeHttpRequest(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url }),
        timeout
      });
      if (!response.success) {
        throw new Error(response.error || "Proxy request failed");
      }
      const data = JSON.parse(response.data);
      if (data.error) {
        throw new Error(data.error);
      }
      if (!data.archivedUrl) {
        throw new Error("No archived URL returned from proxy");
      }
      return {
        success: true,
        url: data.archivedUrl,
        metadata: {
          originalUrl: url,
          archiveDate: (/* @__PURE__ */ new Date()).toISOString(),
          service: this.config.name
        }
      };
    }
    async archiveDirectly(url, progress) {
      progress?.onStatusUpdate(`Submitting ${url} directly to Archive.today...`);
      const timeout = PreferencesManager.getTimeout();
      const submitResponse = await this.makeHttpRequest(
        "https://archive.today/submit/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: `url=${encodeURIComponent(url)}`,
          timeout
        }
      );
      if (!submitResponse.success) {
        throw new Error(submitResponse.error || "Direct submission failed");
      }
      const archivedUrl = this.extractArchivedUrl(submitResponse.data);
      if (!archivedUrl) {
        throw new Error("Could not extract archived URL from response");
      }
      return {
        success: true,
        url: archivedUrl,
        metadata: {
          originalUrl: url,
          archiveDate: (/* @__PURE__ */ new Date()).toISOString(),
          service: this.config.name
        }
      };
    }
    extractArchivedUrl(html) {
      const patterns = [
        /https?:\/\/archive\.(today|is|ph|md|li)\/[A-Za-z0-9]+/,
        /<input[^>]+id="SHARE_LONGLINK"[^>]+value="([^"]+)"/,
        /<a[^>]+href="(https?:\/\/archive\.[^"]+)"[^>]*>.*?View\s+snapshot/i
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match.length > 1 && match[1]) {
          return match[1];
        }
        if (match && match[0]) {
          return match[0];
        }
      }
      return null;
    }
    async checkAvailability(url) {
      try {
        const checkUrl = `https://archive.today/${encodeURIComponent(url)}`;
        const response = await this.makeHttpRequest(checkUrl, {
          method: "GET",
          timeout: 3e4
        });
        if (response.success && response.status === 200) {
          const archivedUrl = this.extractArchivedUrl(response.data);
          if (archivedUrl) {
            return { available: true, existingUrl: archivedUrl };
          }
        }
        return { available: true };
      } catch (error) {
        return { available: false };
      }
    }
    /**
     * Test Archive.today proxy URL connection
     * Validates that a configured proxy URL is accessible and working
     * @static
     */
    static async testCredentials(credentials) {
      try {
        if (!credentials.proxyUrl || credentials.proxyUrl.length === 0) {
          return {
            success: true,
            message: "No proxy configured (using direct submission)"
          };
        }
        try {
          new URL(credentials.proxyUrl);
        } catch {
          return {
            success: false,
            message: "Invalid proxy URL format"
          };
        }
        const timeout = 1e4;
        const response = await Zotero.HTTP.request(credentials.proxyUrl, {
          method: "POST",
          timeout,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: "https://example.com" })
        });
        if (response.status >= 400) {
          return {
            success: false,
            message: `Proxy returned HTTP ${response.status}`
          };
        }
        return {
          success: true,
          message: "Proxy URL is accessible"
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Connection error: ${message}`
        };
      }
    }
  };

  // src/modules/preferences/ui/PreferencesPanel.ts
  var PreferencesPanel = class {
    container = null;
    window = null;
    serviceSection = null;
    credentialsSection = null;
    preferencesSection = null;
    healthChecker;
    isDirty = false;
    saveButton = null;
    listeners = [];
    onSaveCallback = null;
    onCloseCallback = null;
    isInitialized = false;
    constructor(options) {
      this.healthChecker = HealthChecker.getInstance();
      this.container = options?.container || null;
      this.window = options?.window || null;
      this.onSaveCallback = options?.onSave || null;
      this.onCloseCallback = options?.onClose || null;
    }
    /**
     * Check if panel is initialized
     */
    getIsInitialized() {
      return this.isInitialized;
    }
    /**
     * Initialize and render the preferences panel
     *
     * @throws Error if container element not found
     */
    async initialize() {
      if (!document) {
        throw new Error("Document object not available in this environment");
      }
      if (!this.container) {
        this.container = document.getElementById(
          "momento7-preferences-panel-container"
        );
        if (!this.container) {
          this.container = document.getElementById(
            "momento7-preferences"
          );
        }
      }
      if (!this.container) {
        throw new Error("Preferences container not found");
      }
      await this.render();
      this.bindEventHandlers();
      if (this.serviceSection) {
        try {
          await this.serviceSection.refreshHealthStatus();
        } catch (error) {
          Zotero.debug(
            `Momento7: Failed to refresh health status on panel open: ${error}`
          );
        }
      }
      this.isInitialized = true;
    }
    /**
     * Render the preferences panel UI
     */
    async render() {
      if (!this.container) return;
      this.serviceSection = new ServiceConfigSection(this.healthChecker);
      this.credentialsSection = new CredentialsSection();
      this.preferencesSection = new PreferencesSection();
      await Promise.all([
        this.serviceSection.render(this.container),
        this.credentialsSection.render(this.container),
        this.preferencesSection.render(this.container)
      ]);
      this.renderActionButtons();
    }
    /**
     * Render save/cancel buttons
     */
    renderActionButtons() {
      if (!this.container) return;
      const buttonGroup = document.createElement("div");
      buttonGroup.className = "momento7-action-buttons";
      this.saveButton = document.createElement("button");
      this.saveButton.textContent = "Save";
      this.saveButton.className = "momento7-btn momento7-btn-primary";
      this.saveButton.disabled = !this.isDirty;
      this.saveButton.addEventListener("click", () => this.onSave());
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.className = "momento7-btn momento7-btn-secondary";
      cancelBtn.addEventListener("click", () => this.onCancel());
      buttonGroup.appendChild(this.saveButton);
      buttonGroup.appendChild(cancelBtn);
      this.container.appendChild(buttonGroup);
    }
    /**
     * Bind event handlers for preference changes
     */
    bindEventHandlers() {
      if (!this.serviceSection || !this.credentialsSection || !this.preferencesSection) {
        return;
      }
      const onServiceToggle = (serviceId, enabled) => {
        this.onServiceToggle(serviceId, enabled);
        this.markDirty();
      };
      this.serviceSection.on("serviceToggle", onServiceToggle);
      this.listeners.push({
        section: this.serviceSection,
        event: "serviceToggle",
        handler: onServiceToggle
      });
      const onServiceReorder = (order) => {
        this.onServiceReorder(order);
        this.markDirty();
      };
      this.serviceSection.on("serviceReorder", onServiceReorder);
      this.listeners.push({
        section: this.serviceSection,
        event: "serviceReorder",
        handler: onServiceReorder
      });
      const onTestConnection = (serviceId) => {
        this.onTestConnection(serviceId);
      };
      this.serviceSection.on("testConnection", onTestConnection);
      this.listeners.push({
        section: this.serviceSection,
        event: "testConnection",
        handler: onTestConnection
      });
      const onCredentialUpdate = (serviceId, credentials) => {
        this.onCredentialUpdate(serviceId, credentials);
        this.markDirty();
      };
      this.credentialsSection.on("credentialUpdate", onCredentialUpdate);
      this.listeners.push({
        section: this.credentialsSection,
        event: "credentialUpdate",
        handler: onCredentialUpdate
      });
      const onTestCredentials = (serviceId) => {
        this.onTestCredentials(serviceId);
      };
      this.credentialsSection.on("credentialTest", onTestCredentials);
      this.listeners.push({
        section: this.credentialsSection,
        event: "credentialTest",
        handler: onTestCredentials
      });
      const onPreferenceUpdate = () => {
        this.markDirty();
      };
      this.preferencesSection.on("preferenceUpdate", onPreferenceUpdate);
      this.listeners.push({
        section: this.preferencesSection,
        event: "preferenceUpdate",
        handler: onPreferenceUpdate
      });
    }
    /**
     * Mark preferences as having unsaved changes
     */
    markDirty() {
      if (!this.isDirty) {
        this.isDirty = true;
        if (this.saveButton) {
          this.saveButton.disabled = false;
        }
      }
    }
    /**
     * Handle service enable/disable toggle
     */
    onServiceToggle(serviceId, enabled) {
      const enabledServices = PreferencesManager.getEnabledServices();
      const index = enabledServices.indexOf(serviceId);
      if (enabled && index === -1) {
        enabledServices.push(serviceId);
      } else if (!enabled && index !== -1) {
        enabledServices.splice(index, 1);
      }
      Zotero.debug(`Momento7: Service ${serviceId} toggled to ${enabled}`);
    }
    /**
     * Handle service priority reordering
     */
    onServiceReorder(order) {
      Zotero.debug(`Momento7: Service order changed: ${order.join(", ")}`);
    }
    /**
     * Handle service connection test
     */
    async onTestConnection(serviceId) {
      if (!this.serviceSection) return;
      try {
        this.serviceSection.setTestLoading(serviceId, true);
        const availableServices = this.healthChecker.getAvailableServices();
        const isAvailable = availableServices.includes(serviceId);
        this.serviceSection.setTestResult(serviceId, isAvailable);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        Zotero.debug(`Momento7: Service test failed for ${serviceId}: ${msg}`);
        this.serviceSection.setTestResult(serviceId, false, msg);
      } finally {
        this.serviceSection.setTestLoading(serviceId, false);
      }
    }
    /**
     * Handle credential update
     */
    onCredentialUpdate(serviceId, credentials) {
      Zotero.debug(`Momento7: Credentials updated for service ${serviceId}`);
    }
    /**
     * Handle credential test
     */
    async onTestCredentials(serviceId) {
      if (!this.credentialsSection) return;
      try {
        this.credentialsSection.setTestLoading(serviceId, true);
        const isValid = await this.testServiceCredentials(serviceId);
        this.credentialsSection.setTestResult(serviceId, isValid);
      } catch (error) {
        Zotero.debug(
          `Momento7: Credential test failed for ${serviceId}: ${error}`
        );
        this.credentialsSection.setTestResult(
          serviceId,
          false,
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        this.credentialsSection.setTestLoading(serviceId, false);
      }
    }
    /**
     * Test service credentials by calling the service's test method
     */
    async testServiceCredentials(serviceId) {
      if (!this.credentialsSection) {
        throw new Error("Credentials section not initialized");
      }
      const credentials = this.credentialsSection.getInputCredentials(serviceId);
      if (serviceId === "internetarchive") {
        const result = await InternetArchiveService.testCredentials({
          accessKey: credentials.accessKey,
          secretKey: credentials.secretKey
        });
        if (!result.success) {
          throw new Error(result.message);
        }
        return true;
      } else if (serviceId === "permacc") {
        const result = await PermaCCService.testCredentials({
          apiKey: credentials.apiKey
        });
        if (!result.success) {
          throw new Error(result.message);
        }
        return true;
      } else if (serviceId === "archivetoday") {
        const result = await ArchiveTodayService.testCredentials({
          proxyUrl: credentials.proxyUrl
        });
        if (!result.success) {
          throw new Error(result.message);
        }
        return true;
      }
      throw new Error(`Unknown service: ${serviceId}`);
    }
    /**
     * Handle save action
     */
    async onSave() {
      try {
        const preferences = {
          enabledServices: this.serviceSection?.getEnabledServices() || [],
          fallbackOrder: this.serviceSection?.getServiceOrder() || [],
          timeout: this.preferencesSection?.getTimeout() || 12e4,
          checkBeforeArchive: this.preferencesSection?.getCheckBeforeArchive() || true,
          archiveAgeThreshold: this.preferencesSection?.getArchiveAgeThreshold() || 30 * 24 * 60 * 60 * 1e3,
          autoArchive: this.preferencesSection?.getAutoArchive() || true
        };
        if (this.onSaveCallback) {
          await this.onSaveCallback(preferences);
        } else {
          await this.persistPreferences(preferences);
        }
        this.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        Zotero.debug(`Momento7: Failed to save preferences: ${msg}`);
        try {
          Zotero.showNotification?.(`Failed to save preferences: ${msg}`);
        } catch {
        }
      }
    }
    /**
     * Persist preferences to storage
     */
    async persistPreferences(prefs) {
      const manager = PreferencesManager.getInstance();
      manager.setPref("robustLinkServices", prefs.enabledServices);
      manager.setPref("fallbackOrder", prefs.fallbackOrder);
      manager.setPref("iaTimeout", prefs.timeout);
      manager.setPref("checkBeforeArchive", prefs.checkBeforeArchive);
      manager.setPref("archiveAgeThresholdHours", prefs.archiveAgeThreshold);
      manager.setPref("autoArchive", prefs.autoArchive);
    }
    /**
     * Handle cancel action
     */
    onCancel() {
      this.close();
    }
    /**
     * Close preferences panel and clean up listeners
     */
    close() {
      for (const listener of this.listeners) {
        listener.section.unlisten?.(listener.event, listener.handler);
      }
      this.listeners = [];
      if (this.container) {
        this.container.innerHTML = "";
      }
      this.isDirty = false;
      this.saveButton = null;
      this.isInitialized = false;
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  };
  var ServiceConfigSection = class {
    container = null;
    healthChecker;
    services = /* @__PURE__ */ new Map();
    eventHandlers = /* @__PURE__ */ new Map();
    enabledServices = /* @__PURE__ */ new Set();
    serviceOrder = [];
    serviceStatus = /* @__PURE__ */ new Map();
    draggedServiceId = null;
    constructor(healthChecker) {
      this.healthChecker = healthChecker;
    }
    async render(parent) {
      this.container = document.createElement("div");
      this.container.className = "momento7-section momento7-services-section";
      this.container.innerHTML = `
      <h3>\u{1F4CB} Archive Services</h3>
      <p class="momento7-section-description">
        Enable or disable archive services and set their priority order. Drag services to reorder.
      </p>
      <div class="momento7-services-list"></div>
    `;
      parent.appendChild(this.container);
      this.loadInitialState();
      await this.renderServiceList();
      await this.loadServiceStatus();
    }
    loadInitialState() {
      this.enabledServices = new Set(PreferencesManager.getEnabledServices());
      this.serviceOrder = [...PreferencesManager.getFallbackOrder()];
    }
    async loadServiceStatus() {
      const registry = ServiceRegistry.getInstance();
      const entries = registry.getAll();
      const healthyServices = this.healthChecker.getHealthyServices();
      const availableServices = this.healthChecker.getAvailableServices();
      for (const { id } of entries) {
        const available = availableServices.includes(id);
        this.serviceStatus.set(id, {
          available,
          checked: true
        });
      }
    }
    async renderServiceList() {
      const listContainer = this.container?.querySelector(
        ".momento7-services-list"
      );
      if (!listContainer) return;
      const registry = ServiceRegistry.getInstance();
      const entries = registry.getAll();
      const sortedServices = entries.sort((a, b) => {
        const aIndex = this.serviceOrder.indexOf(a.id);
        const bIndex = this.serviceOrder.indexOf(b.id);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      listContainer.innerHTML = "";
      for (const { id, service } of sortedServices) {
        const serviceElement = this.createServiceElement(service);
        listContainer.appendChild(serviceElement);
        this.services.set(id, serviceElement);
      }
    }
    createServiceElement(service) {
      const status = this.serviceStatus.get(service.id);
      const isEnabled = this.enabledServices.has(service.id);
      const health = this.healthChecker.getServiceHealth(service.id);
      const item = document.createElement("div");
      item.className = "momento7-service-item";
      if (isEnabled) {
        item.classList.add("momento7-service-item--enabled");
      } else {
        item.classList.add("momento7-service-item--disabled");
      }
      item.draggable = true;
      item.dataset.serviceId = service.id;
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.className = "momento7-service-toggle";
      toggle.checked = isEnabled;
      toggle.setAttribute("aria-label", `Enable ${service.name}`);
      toggle.addEventListener(
        "change",
        (e) => this.handleToggle(service.id, e.target.checked)
      );
      const info = document.createElement("div");
      info.className = "momento7-service-info";
      const name = document.createElement("div");
      name.className = "momento7-service-name";
      name.textContent = service.name;
      info.appendChild(name);
      if (health && health.status !== "unknown" /* UNKNOWN */) {
        const details = document.createElement("div");
        details.className = "momento7-service-health-details";
        const lastCheckTime = health.lastCheck ? new Date(health.lastCheck).toLocaleTimeString() : "Never";
        const successPercent = (health.successRate * 100).toFixed(1);
        details.innerHTML = `
        <span class="momento7-health-metric">\u{1F4CA} ${successPercent}%</span>
        <span class="momento7-health-metric">\u23F1 ${health.avgLatency.toFixed(0)}ms</span>
        <span class="momento7-health-timestamp">\u2713 ${lastCheckTime}</span>
      `;
        info.appendChild(details);
      }
      const statusEl = document.createElement("div");
      statusEl.className = "momento7-service-status";
      if (status?.checked) {
        statusEl.classList.add(
          status.available ? "momento7-service-status--online" : "momento7-service-status--offline"
        );
        statusEl.innerHTML = status.available ? "\u2713 Online" : "\u26A0 Offline";
      } else if (health) {
        statusEl.classList.add(
          `momento7-service-status--${health.status.toLowerCase()}`
        );
        statusEl.textContent = health.status;
      } else {
        statusEl.classList.add("momento7-service-status--unknown");
        statusEl.textContent = "? Checking...";
      }
      const actions = document.createElement("div");
      actions.className = "momento7-service-actions";
      const dragHandle = document.createElement("div");
      dragHandle.className = "momento7-service-drag-handle";
      dragHandle.title = "Drag to reorder";
      dragHandle.innerHTML = "\u22EE\u22EE";
      const testBtn = document.createElement("button");
      testBtn.className = "momento7-btn momento7-btn-small";
      testBtn.textContent = "Test";
      testBtn.setAttribute("aria-label", `Test ${service.name} connection`);
      testBtn.addEventListener(
        "click",
        () => this.handleTestConnection(service.id)
      );
      actions.appendChild(dragHandle);
      actions.appendChild(testBtn);
      item.appendChild(toggle);
      item.appendChild(info);
      item.appendChild(statusEl);
      item.appendChild(actions);
      item.addEventListener(
        "dragstart",
        (e) => this.handleDragStart(e, service.id)
      );
      item.addEventListener(
        "dragover",
        (e) => this.handleDragOver(e)
      );
      item.addEventListener(
        "drop",
        (e) => this.handleDrop(e, service.id)
      );
      item.addEventListener("dragend", (e) => this.handleDragEnd(e));
      item.statusElement = statusEl;
      return item;
    }
    handleToggle(serviceId, enabled) {
      if (enabled) {
        this.enabledServices.add(serviceId);
      } else {
        this.enabledServices.delete(serviceId);
      }
      const item = this.services.get(serviceId);
      if (item) {
        if (enabled) {
          item.classList.add("momento7-service-item--enabled");
          item.classList.remove("momento7-service-item--disabled");
        } else {
          item.classList.remove("momento7-service-item--enabled");
          item.classList.add("momento7-service-item--disabled");
        }
      }
      this.emit("serviceToggle", serviceId, enabled);
    }
    handleTestConnection(serviceId) {
      this.emit("testConnection", serviceId);
    }
    handleDragStart(e, serviceId) {
      this.draggedServiceId = serviceId;
      const item = this.services.get(serviceId);
      if (item) {
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      }
    }
    handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const items = Array.from(
        this.container?.querySelectorAll(".momento7-service-item") || []
      );
      const afterElement = this.getDragAfterElement(e.clientY, items);
      const draggingItem = this.services.get(this.draggedServiceId || "");
      if (!draggingItem) return;
      if (afterElement) {
        afterElement.parentNode?.insertBefore(draggingItem, afterElement);
      } else {
        this.container?.querySelector(".momento7-services-list")?.appendChild(draggingItem);
      }
    }
    handleDrop(e, serviceId) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleDragEnd(e) {
      const item = this.services.get(this.draggedServiceId || "");
      if (item) {
        item.classList.remove("dragging");
      }
      const listContainer = this.container?.querySelector(
        ".momento7-services-list"
      );
      if (listContainer) {
        const items = Array.from(
          listContainer.querySelectorAll(".momento7-service-item")
        );
        this.serviceOrder = items.map((item2) => item2.dataset.serviceId).filter((id) => !!id);
        this.emit("serviceReorder", this.serviceOrder);
      }
      this.draggedServiceId = null;
    }
    getDragAfterElement(y, items) {
      for (const item of items) {
        const box = item.getBoundingClientRect();
        if (y < box.top + box.height / 2) {
          return item;
        }
      }
      return null;
    }
    setTestLoading(serviceId, loading) {
      const item = this.services.get(serviceId);
      if (!item) return;
      const statusEl = item.statusElement;
      if (!statusEl) return;
      if (loading) {
        statusEl.className = "momento7-service-status momento7-service-status--testing";
        statusEl.innerHTML = '<span class="momento7-spinner"></span> Testing...';
      }
    }
    setTestResult(serviceId, success, error) {
      const item = this.services.get(serviceId);
      if (!item) return;
      const statusEl = item.statusElement;
      if (!statusEl) return;
      this.serviceStatus.set(serviceId, {
        available: success,
        checked: true,
        error
      });
      statusEl.className = "momento7-service-status";
      if (success) {
        statusEl.classList.add("momento7-service-status--online");
        statusEl.innerHTML = "\u2713 Online";
      } else {
        statusEl.classList.add("momento7-service-status--offline");
        statusEl.innerHTML = `\u26A0 Offline${error ? `: ${error}` : ""}`;
      }
    }
    getEnabledServices() {
      return Array.from(this.enabledServices);
    }
    getServiceOrder() {
      return this.serviceOrder;
    }
    emit(event, ...args) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(...args);
        }
      }
    }
    /**
     * Refresh health status for all services
     * Called when preferences panel opens to get latest health data
     */
    async refreshHealthStatus() {
      try {
        const allHealth = this.healthChecker.getAllHealth();
        for (const health of allHealth) {
          this.serviceStatus.set(health.serviceId, {
            available: health.status === "healthy" /* HEALTHY */ || health.status === "degraded" /* DEGRADED */,
            checked: true,
            error: health.message
          });
          const item = this.services.get(health.serviceId);
          if (item) {
            const statusEl = item.statusElement;
            if (statusEl) {
              statusEl.className = `momento7-service-status momento7-service-status--${health.status.toLowerCase()}`;
              statusEl.textContent = health.status;
              const infoEl = item.querySelector(".momento7-service-info");
              const detailsEl = infoEl?.querySelector(
                ".momento7-service-health-details"
              );
              if (detailsEl) {
                const lastCheckTime = health.lastCheck ? new Date(health.lastCheck).toLocaleTimeString() : "Never";
                const successPercent = (health.successRate * 100).toFixed(1);
                detailsEl.innerHTML = `
                <span class="momento7-health-metric">\u{1F4CA} ${successPercent}%</span>
                <span class="momento7-health-metric">\u23F1 ${health.avgLatency.toFixed(0)}ms</span>
                <span class="momento7-health-timestamp">\u2713 ${lastCheckTime}</span>
              `;
              }
            }
          }
        }
      } catch (error) {
        Zotero.debug(`Momento7: Failed to refresh health status: ${error}`);
      }
    }
    on(event, handler) {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
      this.eventHandlers.get(event)?.push(handler);
    }
    unlisten(event, handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }
  };
  var CredentialsSection = class {
    container = null;
    eventHandlers = /* @__PURE__ */ new Map();
    credentialManager;
    iaAccessKeyInput = null;
    iaSecretKeyInput = null;
    permaCCApiKeyInput = null;
    archiveTodayProxyInput = null;
    testingServices = /* @__PURE__ */ new Set();
    constructor() {
      this.credentialManager = CredentialManager.getInstance();
    }
    async render(parent) {
      this.container = document.createElement("div");
      this.container.className = "momento7-section momento7-credentials-section";
      this.container.innerHTML = `
      <h3>\u{1F510} Credentials</h3>
      <p class="momento7-section-description">
        Configure credentials for archive services that require authentication. Credentials are encrypted at rest.
      </p>
      <div class="momento7-credentials-form"></div>
    `;
      parent.appendChild(this.container);
      await this.renderCredentialForms();
    }
    async renderCredentialForms() {
      const formContainer = this.container?.querySelector(
        ".momento7-credentials-form"
      );
      if (!formContainer) return;
      await this.renderInternetArchiveForm(formContainer);
      await this.renderPermaCCForm(formContainer);
      await this.renderArchiveTodayForm(formContainer);
    }
    async renderInternetArchiveForm(container) {
      const group = document.createElement("div");
      group.className = "momento7-credential-group";
      const title = document.createElement("div");
      title.className = "momento7-credential-group-title";
      title.textContent = "Internet Archive";
      group.appendChild(title);
      const fields = document.createElement("div");
      fields.className = "momento7-credential-fields";
      const accessKeyField = document.createElement("div");
      accessKeyField.className = "momento7-credential-field";
      const accessKeyLabel = document.createElement("label");
      accessKeyLabel.className = "momento7-credential-label";
      accessKeyLabel.textContent = "Access Key";
      accessKeyField.appendChild(accessKeyLabel);
      this.iaAccessKeyInput = document.createElement("input");
      this.iaAccessKeyInput.type = "password";
      this.iaAccessKeyInput.className = "momento7-credential-input";
      this.iaAccessKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      this.iaAccessKeyInput.setAttribute(
        "aria-label",
        "Internet Archive access key"
      );
      this.iaAccessKeyInput.addEventListener("change", () => {
        this.emit("credentialUpdate", "internetarchive", {
          accessKey: this.iaAccessKeyInput?.value
        });
      });
      accessKeyField.appendChild(this.iaAccessKeyInput);
      fields.appendChild(accessKeyField);
      const secretKeyField = document.createElement("div");
      secretKeyField.className = "momento7-credential-field";
      const secretKeyLabel = document.createElement("label");
      secretKeyLabel.className = "momento7-credential-label";
      secretKeyLabel.textContent = "Secret Key";
      secretKeyField.appendChild(secretKeyLabel);
      this.iaSecretKeyInput = document.createElement("input");
      this.iaSecretKeyInput.type = "password";
      this.iaSecretKeyInput.className = "momento7-credential-input";
      this.iaSecretKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      this.iaSecretKeyInput.setAttribute(
        "aria-label",
        "Internet Archive secret key"
      );
      this.iaSecretKeyInput.addEventListener("change", () => {
        this.emit("credentialUpdate", "internetarchive", {
          secretKey: this.iaSecretKeyInput?.value
        });
      });
      secretKeyField.appendChild(this.iaSecretKeyInput);
      fields.appendChild(secretKeyField);
      group.appendChild(fields);
      const hasAccessKey = await this.credentialManager.hasCredential("iaAccessKey");
      const hasSecretKey = await this.credentialManager.hasCredential("iaSecretKey");
      const status = document.createElement("div");
      status.className = "momento7-credential-status";
      if (hasAccessKey && hasSecretKey) {
        status.classList.add("momento7-credential-status--configured");
        status.innerHTML = "\u2713 Configured";
      } else {
        status.classList.add("momento7-credential-status--empty");
        status.innerHTML = "\u25CB Not configured";
      }
      group.appendChild(status);
      const actions = document.createElement("div");
      actions.className = "momento7-credential-actions";
      const testBtn = document.createElement("button");
      testBtn.className = "momento7-btn momento7-btn-small";
      testBtn.textContent = "Test";
      testBtn.setAttribute("aria-label", "Test Internet Archive credentials");
      testBtn.addEventListener(
        "click",
        () => this.handleTestCredentials("internetarchive", status)
      );
      actions.appendChild(testBtn);
      const clearBtn = document.createElement("button");
      clearBtn.className = "momento7-btn momento7-btn-small momento7-btn-danger";
      clearBtn.textContent = "Clear";
      clearBtn.setAttribute("aria-label", "Clear Internet Archive credentials");
      clearBtn.addEventListener(
        "click",
        () => this.handleClearCredentials(
          "iaAccessKey",
          "iaSecretKey",
          status,
          this.iaAccessKeyInput,
          this.iaSecretKeyInput
        )
      );
      actions.appendChild(clearBtn);
      group.appendChild(actions);
      container.appendChild(group);
      if (hasAccessKey) {
        const accessKey = await this.credentialManager.getCredential("iaAccessKey");
        if (accessKey) this.iaAccessKeyInput.value = accessKey;
      }
      if (hasSecretKey) {
        const secretKey = await this.credentialManager.getCredential("iaSecretKey");
        if (secretKey) this.iaSecretKeyInput.value = secretKey;
      }
    }
    async renderPermaCCForm(container) {
      const group = document.createElement("div");
      group.className = "momento7-credential-group";
      const title = document.createElement("div");
      title.className = "momento7-credential-group-title";
      title.textContent = "Perma.cc";
      group.appendChild(title);
      const fields = document.createElement("div");
      fields.className = "momento7-credential-fields";
      const apiKeyField = document.createElement("div");
      apiKeyField.className = "momento7-credential-field";
      const apiKeyLabel = document.createElement("label");
      apiKeyLabel.className = "momento7-credential-label";
      apiKeyLabel.textContent = "API Key";
      apiKeyField.appendChild(apiKeyLabel);
      this.permaCCApiKeyInput = document.createElement("input");
      this.permaCCApiKeyInput.type = "password";
      this.permaCCApiKeyInput.className = "momento7-credential-input";
      this.permaCCApiKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      this.permaCCApiKeyInput.setAttribute("aria-label", "Perma.cc API key");
      this.permaCCApiKeyInput.addEventListener("change", () => {
        this.emit("credentialUpdate", "permacc", {
          apiKey: this.permaCCApiKeyInput?.value
        });
      });
      apiKeyField.appendChild(this.permaCCApiKeyInput);
      fields.appendChild(apiKeyField);
      group.appendChild(fields);
      const hasApiKey = await this.credentialManager.hasCredential("permaCCApiKey");
      const status = document.createElement("div");
      status.className = "momento7-credential-status";
      if (hasApiKey) {
        status.classList.add("momento7-credential-status--configured");
        status.innerHTML = "\u2713 Configured";
      } else {
        status.classList.add("momento7-credential-status--empty");
        status.innerHTML = "\u25CB Not configured";
      }
      group.appendChild(status);
      const actions = document.createElement("div");
      actions.className = "momento7-credential-actions";
      const testBtn = document.createElement("button");
      testBtn.className = "momento7-btn momento7-btn-small";
      testBtn.textContent = "Test";
      testBtn.setAttribute("aria-label", "Test Perma.cc credentials");
      testBtn.addEventListener(
        "click",
        () => this.handleTestCredentials("permacc", status)
      );
      actions.appendChild(testBtn);
      const clearBtn = document.createElement("button");
      clearBtn.className = "momento7-btn momento7-btn-small momento7-btn-danger";
      clearBtn.textContent = "Clear";
      clearBtn.setAttribute("aria-label", "Clear Perma.cc credentials");
      clearBtn.addEventListener(
        "click",
        () => this.handleClearCredentials(
          "permaCCApiKey",
          void 0,
          status,
          this.permaCCApiKeyInput
        )
      );
      actions.appendChild(clearBtn);
      group.appendChild(actions);
      container.appendChild(group);
      if (hasApiKey) {
        const apiKey = await this.credentialManager.getCredential("permaCCApiKey");
        if (apiKey) this.permaCCApiKeyInput.value = apiKey;
      }
    }
    async renderArchiveTodayForm(container) {
      const group = document.createElement("div");
      group.className = "momento7-credential-group";
      const title = document.createElement("div");
      title.className = "momento7-credential-group-title";
      title.textContent = "Archive.today Proxy (Optional)";
      group.appendChild(title);
      const fields = document.createElement("div");
      fields.className = "momento7-credential-fields";
      const proxyField = document.createElement("div");
      proxyField.className = "momento7-credential-field";
      const proxyLabel = document.createElement("label");
      proxyLabel.className = "momento7-credential-label";
      proxyLabel.textContent = "Proxy URL";
      proxyField.appendChild(proxyLabel);
      this.archiveTodayProxyInput = document.createElement("input");
      this.archiveTodayProxyInput.type = "text";
      this.archiveTodayProxyInput.className = "momento7-credential-input";
      this.archiveTodayProxyInput.placeholder = "https://proxy.example.com";
      this.archiveTodayProxyInput.setAttribute(
        "aria-label",
        "Archive.today proxy URL"
      );
      this.archiveTodayProxyInput.addEventListener("change", () => {
        this.emit("credentialUpdate", "archivetoday", {
          proxyUrl: this.archiveTodayProxyInput?.value
        });
      });
      proxyField.appendChild(this.archiveTodayProxyInput);
      const help = document.createElement("p");
      help.className = "momento7-preference-help";
      help.textContent = "Optional proxy URL for accessing archive.today if direct access is blocked.";
      proxyField.appendChild(help);
      fields.appendChild(proxyField);
      group.appendChild(fields);
      const hasProxy = await this.credentialManager.hasCredential(
        "archiveTodayProxyUrl"
      );
      const status = document.createElement("div");
      status.className = "momento7-credential-status";
      if (hasProxy) {
        status.classList.add("momento7-credential-status--configured");
        status.innerHTML = "\u2713 Configured";
      } else {
        status.classList.add("momento7-credential-status--empty");
        status.innerHTML = "\u25CB Not configured";
      }
      group.appendChild(status);
      const actions = document.createElement("div");
      actions.className = "momento7-credential-actions";
      const testBtn = document.createElement("button");
      testBtn.className = "momento7-btn momento7-btn-small";
      testBtn.textContent = "Test";
      testBtn.setAttribute("aria-label", "Test Archive.today proxy");
      testBtn.addEventListener(
        "click",
        () => this.handleTestCredentials("archivetoday", status)
      );
      actions.appendChild(testBtn);
      const clearBtn = document.createElement("button");
      clearBtn.className = "momento7-btn momento7-btn-small momento7-btn-danger";
      clearBtn.textContent = "Clear";
      clearBtn.setAttribute("aria-label", "Clear Archive.today proxy");
      clearBtn.addEventListener(
        "click",
        () => this.handleClearCredentials(
          "archiveTodayProxyUrl",
          void 0,
          status,
          this.archiveTodayProxyInput
        )
      );
      actions.appendChild(clearBtn);
      group.appendChild(actions);
      container.appendChild(group);
      if (hasProxy) {
        const proxyUrl = await this.credentialManager.getCredential(
          "archiveTodayProxyUrl"
        );
        if (proxyUrl) this.archiveTodayProxyInput.value = proxyUrl;
      }
    }
    async handleClearCredentials(key1, key2, statusEl, input1, input2) {
      const shouldClear = Zotero.confirmationPrompt ? Zotero.confirmationPrompt(
        "Clear these credentials? This action cannot be undone."
      ) : true;
      if (!shouldClear) {
        return;
      }
      try {
        Zotero.Prefs.clear(`extensions.momento7.${key1}`);
        if (key2) {
          Zotero.Prefs.clear(`extensions.momento7.${key2}`);
        }
        if (input1) input1.value = "";
        if (input2) input2.value = "";
        statusEl.className = "momento7-credential-status momento7-credential-status--empty";
        statusEl.innerHTML = "\u25CB Not configured";
      } catch (error) {
        Zotero.debug(`Momento7: Failed to clear credentials: ${error}`);
      }
    }
    async handleTestCredentials(serviceId, statusEl) {
      this.testingServices.add(serviceId);
      statusEl.className = "momento7-credential-status momento7-credential-status--testing";
      statusEl.innerHTML = '<span class="momento7-spinner"></span> Testing...';
      try {
        this.emit("credentialTest", serviceId);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        statusEl.className = "momento7-credential-status momento7-credential-status--error";
        statusEl.innerHTML = `\u2717 Test failed: ${msg}`;
      } finally {
        this.testingServices.delete(serviceId);
      }
    }
    setTestLoading(serviceId, loading) {
    }
    setTestResult(serviceId, success, error) {
      const groups = this.container?.querySelectorAll(".momento7-credential-group") || [];
      let statusEl = null;
      if (serviceId === "internetarchive") {
        statusEl = groups[0]?.querySelector(
          ".momento7-credential-status"
        );
      } else if (serviceId === "permacc") {
        statusEl = groups[1]?.querySelector(
          ".momento7-credential-status"
        );
      } else if (serviceId === "archivetoday") {
        statusEl = groups[2]?.querySelector(
          ".momento7-credential-status"
        );
      }
      if (!statusEl) return;
      if (success) {
        statusEl.className = "momento7-credential-status momento7-credential-status--configured";
        statusEl.innerHTML = "\u2713 Valid";
      } else {
        statusEl.className = "momento7-credential-status momento7-credential-status--error";
        statusEl.innerHTML = `\u2717 Invalid${error ? `: ${error}` : ""}`;
      }
    }
    async getCredentials() {
      const credentials = {};
      if (this.iaAccessKeyInput?.value) {
        await this.credentialManager.storeCredential(
          "iaAccessKey",
          this.iaAccessKeyInput.value
        );
        credentials.iaAccessKey = this.iaAccessKeyInput.value;
      }
      if (this.iaSecretKeyInput?.value) {
        await this.credentialManager.storeCredential(
          "iaSecretKey",
          this.iaSecretKeyInput.value
        );
        credentials.iaSecretKey = this.iaSecretKeyInput.value;
      }
      if (this.permaCCApiKeyInput?.value) {
        await this.credentialManager.storeCredential(
          "permaCCApiKey",
          this.permaCCApiKeyInput.value
        );
        credentials.permaCCApiKey = this.permaCCApiKeyInput.value;
      }
      if (this.archiveTodayProxyInput?.value) {
        await this.credentialManager.storeCredential(
          "archiveTodayProxyUrl",
          this.archiveTodayProxyInput.value
        );
        credentials.archiveTodayProxyUrl = this.archiveTodayProxyInput.value;
      }
      return credentials;
    }
    /**
     * Get current credential values from inputs (for testing)
     */
    getInputCredentials(serviceId) {
      if (serviceId === "internetarchive") {
        return {
          accessKey: this.iaAccessKeyInput?.value || "",
          secretKey: this.iaSecretKeyInput?.value || ""
        };
      } else if (serviceId === "permacc") {
        return {
          apiKey: this.permaCCApiKeyInput?.value || ""
        };
      } else if (serviceId === "archivetoday") {
        return {
          proxyUrl: this.archiveTodayProxyInput?.value || ""
        };
      }
      return {};
    }
    emit(event, ...args) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(...args);
        }
      }
    }
    on(event, handler) {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
      this.eventHandlers.get(event)?.push(handler);
    }
    unlisten(event, handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }
  };
  var PreferencesSection = class {
    container = null;
    eventHandlers = /* @__PURE__ */ new Map();
    timeout = 12e4;
    checkBeforeArchive = true;
    archiveAgeThreshold = 30;
    // In days
    autoArchive = true;
    timeoutInput = null;
    checkBeforeArchiveCheckbox = null;
    ageThresholdInput = null;
    autoArchiveCheckbox = null;
    async render(parent) {
      this.container = document.createElement("div");
      this.container.className = "momento7-section momento7-preferences-section";
      this.container.innerHTML = `
      <h3>\u2699\uFE0F Preferences</h3>
      <p class="momento7-section-description">
        Configure archiving behavior and preferences.
      </p>
      <div class="momento7-preferences-form"></div>
    `;
      parent.appendChild(this.container);
      this.loadInitialPreferences();
      this.renderForm();
    }
    loadInitialPreferences() {
      const manager = PreferencesManager.getInstance();
      this.timeout = manager.getPref("iaTimeout") || 12e4;
      this.checkBeforeArchive = manager.getPref("checkBeforeArchive") ?? true;
      this.archiveAgeThreshold = (manager.getPref("archiveAgeThresholdHours") || 720) / 24;
      this.autoArchive = manager.getPref("autoArchive") ?? true;
    }
    renderForm() {
      const formContainer = this.container?.querySelector(
        ".momento7-preferences-form"
      );
      if (!formContainer) return;
      const timeoutGroup = document.createElement("div");
      timeoutGroup.className = "momento7-preference-group";
      const timeoutLabel = document.createElement("label");
      timeoutLabel.className = "momento7-preference-label";
      timeoutLabel.innerHTML = "Request Timeout";
      const timeoutContainer = document.createElement("div");
      timeoutContainer.className = "momento7-flex-row";
      this.timeoutInput = document.createElement("input");
      this.timeoutInput.type = "number";
      this.timeoutInput.className = "momento7-preference-input";
      this.timeoutInput.min = "1000";
      this.timeoutInput.max = "600000";
      this.timeoutInput.step = "1000";
      this.timeoutInput.value = String(this.timeout);
      this.timeoutInput.setAttribute(
        "aria-label",
        "Request timeout in milliseconds"
      );
      this.timeoutInput.addEventListener("change", () => {
        this.timeout = Math.max(
          1e3,
          Math.min(6e5, parseInt(this.timeoutInput.value, 10))
        );
        this.timeoutInput.value = String(this.timeout);
        this.emit("preferenceUpdate");
      });
      const timeoutUnit = document.createElement("span");
      timeoutUnit.textContent = "ms";
      timeoutUnit.style.marginLeft = "8px";
      timeoutUnit.style.alignSelf = "center";
      timeoutContainer.appendChild(this.timeoutInput);
      timeoutContainer.appendChild(timeoutUnit);
      timeoutGroup.appendChild(timeoutLabel);
      timeoutGroup.appendChild(timeoutContainer);
      const timeoutHelp = document.createElement("p");
      timeoutHelp.className = "momento7-preference-help";
      timeoutHelp.textContent = "Maximum time to wait for archive service responses. Range: 1-600 seconds.";
      timeoutGroup.appendChild(timeoutHelp);
      formContainer.appendChild(timeoutGroup);
      const checkGroup = document.createElement("div");
      checkGroup.className = "momento7-preference-group";
      this.checkBeforeArchiveCheckbox = document.createElement("input");
      this.checkBeforeArchiveCheckbox.type = "checkbox";
      this.checkBeforeArchiveCheckbox.className = "momento7-preference-checkbox";
      this.checkBeforeArchiveCheckbox.checked = this.checkBeforeArchive;
      this.checkBeforeArchiveCheckbox.setAttribute(
        "aria-label",
        "Check for existing archives before archiving"
      );
      this.checkBeforeArchiveCheckbox.addEventListener("change", () => {
        this.checkBeforeArchive = this.checkBeforeArchiveCheckbox.checked;
        this.emit("preferenceUpdate");
      });
      const checkLabel = document.createElement("label");
      checkLabel.className = "momento7-preference-label";
      checkLabel.appendChild(this.checkBeforeArchiveCheckbox);
      checkLabel.appendChild(
        document.createTextNode("Check for existing archives before archiving")
      );
      checkGroup.appendChild(checkLabel);
      const checkHelp = document.createElement("p");
      checkHelp.className = "momento7-preference-help";
      checkHelp.textContent = "Query archive services for existing mementos of the URL before archiving.";
      checkGroup.appendChild(checkHelp);
      formContainer.appendChild(checkGroup);
      const ageGroup = document.createElement("div");
      ageGroup.className = "momento7-preference-group";
      if (!this.checkBeforeArchive) {
        ageGroup.style.display = "none";
      }
      const ageLabel = document.createElement("label");
      ageLabel.className = "momento7-preference-label";
      ageLabel.textContent = "Archive age threshold";
      const ageContainer = document.createElement("div");
      ageContainer.className = "momento7-flex-row";
      this.ageThresholdInput = document.createElement("input");
      this.ageThresholdInput.type = "number";
      this.ageThresholdInput.className = "momento7-preference-input";
      this.ageThresholdInput.min = "1";
      this.ageThresholdInput.max = "3650";
      this.ageThresholdInput.value = String(this.archiveAgeThreshold);
      this.ageThresholdInput.setAttribute(
        "aria-label",
        "Minimum age of archive in days"
      );
      this.ageThresholdInput.addEventListener("change", () => {
        this.archiveAgeThreshold = Math.max(
          1,
          parseInt(this.ageThresholdInput.value, 10)
        );
        this.ageThresholdInput.value = String(this.archiveAgeThreshold);
        this.emit("preferenceUpdate");
      });
      const ageUnit = document.createElement("span");
      ageUnit.textContent = "days";
      ageUnit.style.marginLeft = "8px";
      ageUnit.style.alignSelf = "center";
      ageContainer.appendChild(this.ageThresholdInput);
      ageContainer.appendChild(ageUnit);
      ageGroup.appendChild(ageLabel);
      ageGroup.appendChild(ageContainer);
      const ageHelp = document.createElement("p");
      ageHelp.className = "momento7-preference-help";
      ageHelp.textContent = "Only archive if existing memento is older than this threshold. Skip archiving if recent enough.";
      ageGroup.appendChild(ageHelp);
      formContainer.appendChild(ageGroup);
      this.checkBeforeArchiveCheckbox.addEventListener("change", () => {
        ageGroup.style.display = this.checkBeforeArchive ? "flex" : "none";
      });
      const autoGroup = document.createElement("div");
      autoGroup.className = "momento7-preference-group";
      this.autoArchiveCheckbox = document.createElement("input");
      this.autoArchiveCheckbox.type = "checkbox";
      this.autoArchiveCheckbox.className = "momento7-preference-checkbox";
      this.autoArchiveCheckbox.checked = this.autoArchive;
      this.autoArchiveCheckbox.setAttribute(
        "aria-label",
        "Automatically archive new items"
      );
      this.autoArchiveCheckbox.addEventListener("change", () => {
        this.autoArchive = this.autoArchiveCheckbox.checked;
        this.emit("preferenceUpdate");
      });
      const autoLabel = document.createElement("label");
      autoLabel.className = "momento7-preference-label";
      autoLabel.appendChild(this.autoArchiveCheckbox);
      autoLabel.appendChild(
        document.createTextNode("Automatically archive new items")
      );
      autoGroup.appendChild(autoLabel);
      const autoHelp = document.createElement("p");
      autoHelp.className = "momento7-preference-help";
      autoHelp.textContent = "When enabled, new items added to Zotero will be automatically archived.";
      autoGroup.appendChild(autoHelp);
      formContainer.appendChild(autoGroup);
      const resetBtn = document.createElement("button");
      resetBtn.className = "momento7-btn momento7-btn-secondary";
      resetBtn.textContent = "Reset to Defaults";
      resetBtn.setAttribute(
        "aria-label",
        "Reset all preferences to default values"
      );
      resetBtn.addEventListener("click", () => this.resetToDefaults());
      const resetGroup = document.createElement("div");
      resetGroup.style.marginTop = "16px";
      resetGroup.appendChild(resetBtn);
      formContainer.appendChild(resetGroup);
    }
    resetToDefaults() {
      this.timeout = 12e4;
      this.checkBeforeArchive = true;
      this.archiveAgeThreshold = 30;
      this.autoArchive = true;
      if (this.timeoutInput) this.timeoutInput.value = String(this.timeout);
      if (this.checkBeforeArchiveCheckbox)
        this.checkBeforeArchiveCheckbox.checked = this.checkBeforeArchive;
      if (this.ageThresholdInput)
        this.ageThresholdInput.value = String(this.archiveAgeThreshold);
      if (this.autoArchiveCheckbox)
        this.autoArchiveCheckbox.checked = this.autoArchive;
      this.emit("preferenceUpdate");
    }
    getTimeout() {
      return this.timeout;
    }
    getCheckBeforeArchive() {
      return this.checkBeforeArchive;
    }
    getArchiveAgeThreshold() {
      return this.archiveAgeThreshold * 24;
    }
    getAutoArchive() {
      return this.autoArchive;
    }
    emit(event, ...args) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(...args);
        }
      }
    }
    on(event, handler) {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
      this.eventHandlers.get(event)?.push(handler);
    }
    unlisten(event, handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }
  };

  // src/modules/preferenceScript.ts
  var preferencesPanel = null;
  async function registerPrefsScripts(_window) {
    if (!addon.data.prefs) {
      addon.data.prefs = {
        window: _window,
        columns: [],
        rows: [],
        preferencesPanel: null
      };
    } else {
      addon.data.prefs.window = _window;
    }
    try {
      await initPreferencesPanelUI(_window);
    } catch (error) {
      ztoolkit.log(`Failed to initialize PreferencesPanel: ${error}`);
      await initPrefsUI(_window);
      bindPrefEvents(_window);
    }
    _window.addEventListener("unload", () => {
      if (preferencesPanel) {
        preferencesPanel.close();
        preferencesPanel = null;
      }
      if (addon.data.prefs) {
        addon.data.prefs.preferencesPanel = null;
      }
    });
  }
  async function initPreferencesPanelUI(_window) {
    const doc = _window.document;
    if (!doc) {
      throw new Error("Document not available");
    }
    const container = doc.querySelector("#momento7-preferences-panel-container");
    if (!container) {
      throw new Error("Preferences panel container not found");
    }
    const prefsManager = PreferencesManager.getInstance();
    await prefsManager.init();
    preferencesPanel = new PreferencesPanel({
      container,
      window: _window,
      onSave: async (changes) => {
        await onPreferencesSave(changes);
      },
      onClose: () => {
        onPreferencesClose();
      }
    });
    await preferencesPanel.initialize();
    if (addon.data.prefs) {
      addon.data.prefs.preferencesPanel = preferencesPanel;
    }
    ztoolkit.log("Modern PreferencesPanel initialized successfully");
  }
  async function onPreferencesSave(changes) {
    try {
      const prefsManager = PreferencesManager.getInstance();
      const keyMapping = {
        enabledServices: "robustLinkServices",
        fallbackOrder: "fallbackOrder",
        timeout: "iaTimeout",
        checkBeforeArchive: "checkBeforeArchive",
        archiveAgeThreshold: "archiveAgeThresholdHours",
        autoArchive: "autoArchive"
      };
      for (const [key, value] of Object.entries(changes)) {
        const prefKey = keyMapping[key] || key;
        if (key === "credentials") {
          continue;
        }
        if (prefKey in keyMapping || key.match(/^[a-zA-Z]/)) {
          try {
            prefsManager.setPref(prefKey, value);
          } catch {
            ztoolkit.log(`Warning: Could not save preference ${prefKey}`);
          }
        }
      }
      ztoolkit.log("Preferences saved successfully");
    } catch (error) {
      ztoolkit.log(`Error saving preferences: ${error}`);
      throw error;
    }
  }
  function onPreferencesClose() {
    ztoolkit.log("Preferences panel closed");
  }
  async function initPrefsUI(_window) {
    const doc = _window.document;
    if (!doc) return;
    const credManager = CredentialManager.getInstance();
    await credManager.migrateIfNeeded();
    const hasIACredentials = await credManager.hasCredential("iaAccessKey");
    if (hasIACredentials) {
      const accessKeyInput = doc.querySelector(
        `#zotero-prefpane-${config.addonRef}-ia-access-key`
      );
      const secretKeyInput = doc.querySelector(
        `#zotero-prefpane-${config.addonRef}-ia-secret-key`
      );
      if (accessKeyInput) accessKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      if (secretKeyInput) secretKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    }
    const hasPermaCCKey = await credManager.hasCredential("permaCCApiKey");
    if (hasPermaCCKey) {
      const permaCCInput = doc.querySelector(
        `#zotero-prefpane-${config.addonRef}-permacc-key`
      );
      if (permaCCInput) permaCCInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    }
    ztoolkit.log("Moment-o7 preferences UI initialized");
  }
  function bindPrefEvents(_window) {
    const doc = _window.document;
    if (!doc) return;
    const autoArchiveCheckbox = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-auto-archive`
    );
    autoArchiveCheckbox?.addEventListener("command", (e) => {
      const checked = e.target.checked;
      ztoolkit.log(`Auto-archive set to: ${checked}`);
    });
    const serviceSelect = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-default-service`
    );
    serviceSelect?.addEventListener("command", (e) => {
      const value = e.target.value;
      ztoolkit.log(`Default service set to: ${value}`);
    });
    const iaSaveBtn = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-save`
    );
    iaSaveBtn?.addEventListener("click", () => saveIACredentials(doc));
    const iaClearBtn = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-clear`
    );
    iaClearBtn?.addEventListener("click", () => clearIACredentials(doc));
    const permaCCSaveBtn = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-permacc-save`
    );
    permaCCSaveBtn?.addEventListener("click", () => savePermaCCCredentials(doc));
    const permaCCClearBtn = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-permacc-clear`
    );
    permaCCClearBtn?.addEventListener(
      "click",
      () => clearPermaCCCredentials(doc)
    );
  }
  async function saveIACredentials(doc) {
    const accessKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-access-key`
    );
    const secretKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-secret-key`
    );
    const accessKey = accessKeyInput?.value?.trim();
    const secretKey = secretKeyInput?.value?.trim();
    if (!accessKey || !secretKey) {
      showCredentialStatus(
        doc,
        "ia",
        "Please enter both access key and secret key",
        "error"
      );
      return;
    }
    try {
      const credManager = CredentialManager.getInstance();
      await credManager.storeCredential("iaAccessKey", accessKey);
      await credManager.storeCredential("iaSecretKey", secretKey);
      accessKeyInput.value = "";
      secretKeyInput.value = "";
      accessKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      secretKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      showCredentialStatus(
        doc,
        "ia",
        "Credentials saved successfully",
        "success"
      );
      ztoolkit.log("Internet Archive credentials saved");
    } catch (error) {
      showCredentialStatus(
        doc,
        "ia",
        `Error saving credentials: ${error}`,
        "error"
      );
      ztoolkit.log(`Error saving IA credentials: ${error}`);
    }
  }
  async function clearIACredentials(doc) {
    try {
      const credManager = CredentialManager.getInstance();
      await credManager.storeCredential("iaAccessKey", "");
      await credManager.storeCredential("iaSecretKey", "");
      const accessKeyInput = doc.querySelector(
        `#zotero-prefpane-${config.addonRef}-ia-access-key`
      );
      const secretKeyInput = doc.querySelector(
        `#zotero-prefpane-${config.addonRef}-ia-secret-key`
      );
      if (accessKeyInput) {
        accessKeyInput.value = "";
        accessKeyInput.placeholder = "";
      }
      if (secretKeyInput) {
        secretKeyInput.value = "";
        secretKeyInput.placeholder = "";
      }
      showCredentialStatus(doc, "ia", "Credentials cleared", "success");
      ztoolkit.log("Internet Archive credentials cleared");
    } catch (error) {
      showCredentialStatus(
        doc,
        "ia",
        `Error clearing credentials: ${error}`,
        "error"
      );
    }
  }
  async function savePermaCCCredentials(doc) {
    const apiKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-permacc-key`
    );
    const apiKey = apiKeyInput?.value?.trim();
    if (!apiKey) {
      showCredentialStatus(doc, "permacc", "Please enter an API key", "error");
      return;
    }
    try {
      const credManager = CredentialManager.getInstance();
      await credManager.storeCredential("permaCCApiKey", apiKey);
      apiKeyInput.value = "";
      apiKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      showCredentialStatus(
        doc,
        "permacc",
        "API key saved successfully",
        "success"
      );
      ztoolkit.log("Perma.cc API key saved");
    } catch (error) {
      showCredentialStatus(
        doc,
        "permacc",
        `Error saving API key: ${error}`,
        "error"
      );
      ztoolkit.log(`Error saving Perma.cc API key: ${error}`);
    }
  }
  async function clearPermaCCCredentials(doc) {
    try {
      const credManager = CredentialManager.getInstance();
      await credManager.storeCredential("permaCCApiKey", "");
      const apiKeyInput = doc.querySelector(
        `#zotero-prefpane-${config.addonRef}-permacc-key`
      );
      if (apiKeyInput) {
        apiKeyInput.value = "";
        apiKeyInput.placeholder = "";
      }
      showCredentialStatus(doc, "permacc", "API key cleared", "success");
      ztoolkit.log("Perma.cc API key cleared");
    } catch (error) {
      showCredentialStatus(
        doc,
        "permacc",
        `Error clearing API key: ${error}`,
        "error"
      );
    }
  }
  function showCredentialStatus(doc, section, message, type) {
    const progressWin = new ztoolkit.ProgressWindow(config.addonName, {
      closeOnClick: true,
      closeTime: 3e3
    });
    progressWin.createLine({
      text: message,
      type: type === "success" ? "success" : "fail"
    });
    progressWin.show();
  }

  // src/utils/ztoolkit.ts
  function createZToolkit() {
    const _ztoolkit = new ZoteroToolkit();
    initZToolkit(_ztoolkit);
    return _ztoolkit;
  }
  function initZToolkit(_ztoolkit) {
    const env = "production";
    _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
    _ztoolkit.basicOptions.log.disableConsole = env === "production";
    _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = false;
    _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = false;
    _ztoolkit.basicOptions.api.pluginID = config.addonID;
    _ztoolkit.ProgressWindow.setIconURI(
      "default",
      `chrome://${config.addonRef}/content/icons/favicon.png`
    );
  }

  // src/modules/archive/ConfigurableArchiveService.ts
  var ConfigurableArchiveService = class extends BaseArchiveService {
    constructor(config2) {
      if (!config2.runtime) {
        throw new Error(
          `ConfigurableArchiveService requires runtime configuration for service ${config2.id}`
        );
      }
      super(config2);
    }
    async isAvailable() {
      if (this.config.runtime?.auth) {
        const credManager = CredentialManager.getInstance();
        try {
          const credential = await credManager.get(
            this.config.runtime.auth.credentialKey
          );
          return !!credential;
        } catch {
          return false;
        }
      }
      return true;
    }
    async archiveUrl(url, progress) {
      const runtime = this.config.runtime;
      try {
        if (runtime.urlValidator) {
          const validationResult = this.validateUrl(url);
          if (!validationResult.valid) {
            return {
              success: false,
              error: validationResult.error
            };
          }
        }
        if (runtime.checkEndpoint) {
          progress?.onStatusUpdate?.(
            `Checking for existing archives on ${this.name}...`
          );
          const existingUrl = await this.checkExisting(url);
          if (existingUrl) {
            return {
              success: true,
              url: existingUrl,
              metadata: {
                originalUrl: url,
                archiveDate: (/* @__PURE__ */ new Date()).toISOString(),
                service: this.name
              }
            };
          }
        }
        progress?.onStatusUpdate?.(
          `Submitting ${url.substring(0, 50)}... to ${this.name}...`
        );
        await this.checkRateLimit();
        const requestUrl = this.interpolate(runtime.archiveEndpoint.url, {
          url
        });
        const requestBody = runtime.archiveEndpoint.bodyTemplate ? this.interpolate(runtime.archiveEndpoint.bodyTemplate, { url }) : void 0;
        const headers = await this.buildHeaders(
          runtime.archiveEndpoint.headers
        );
        const response = await this.makeHttpRequest(requestUrl, {
          method: runtime.archiveEndpoint.method,
          headers,
          body: requestBody,
          timeout: runtime.archiveEndpoint.timeout
        });
        this.updateLastRequest();
        if (!response.success) {
          const errorType = this.mapHttpErrorToArchiveError(response.status);
          throw new ArchiveError(
            errorType,
            response.error || "Archive request failed",
            response.status
          );
        }
        const archivedUrl = this.parseResponse(
          response.data,
          runtime.responseParser
        );
        if (!archivedUrl) {
          return {
            success: false,
            error: "Could not extract archive URL from service response"
          };
        }
        return {
          success: true,
          url: archivedUrl,
          metadata: {
            originalUrl: url,
            archiveDate: (/* @__PURE__ */ new Date()).toISOString(),
            service: this.name
          }
        };
      } catch (error) {
        if (error instanceof ArchiveError) {
          return {
            success: false,
            error: error.message
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
    /**
     * Validate URL against configured patterns
     */
    validateUrl(url) {
      const validator = this.config.runtime.urlValidator;
      if (validator.type === "regex") {
        try {
          const regex = new RegExp(validator.pattern);
          if (!regex.test(url)) {
            return {
              valid: false,
              error: validator.errorMessage || `URL does not match required pattern for ${this.name}`
            };
          }
        } catch (error) {
          return {
            valid: false,
            error: `Invalid regex pattern: ${validator.pattern}`
          };
        }
      }
      return { valid: true };
    }
    /**
     * Check if URL already has an archive
     */
    async checkExisting(url) {
      const checkConfig = this.config.runtime.checkEndpoint;
      try {
        const requestUrl = this.interpolate(checkConfig.url, { url });
        const headers = await this.buildHeaders(checkConfig.headers);
        const response = await this.makeHttpRequest(requestUrl, {
          method: checkConfig.method,
          headers,
          timeout: 3e4
        });
        if (!response.success) {
          return null;
        }
        return this.parseResponse(response.data, checkConfig.parser);
      } catch {
        return null;
      }
    }
    /**
     * Parse response to extract archive URL
     */
    parseResponse(data, parser) {
      if (!data) {
        return null;
      }
      try {
        if (parser.type === "json") {
          const json = JSON.parse(data);
          const value = this.getNestedValue(json, parser.path || "");
          if (!value) {
            return null;
          }
          return parser.urlPrefix ? `${parser.urlPrefix}${value}` : String(value);
        }
        if (parser.type === "regex") {
          if (!parser.pattern) {
            return null;
          }
          const regex = new RegExp(parser.pattern);
          const match = data.match(regex);
          if (!match) {
            return null;
          }
          const captured = parser.captureGroup !== void 0 ? match[parser.captureGroup] : match[0];
          if (!captured) {
            return null;
          }
          return parser.urlPrefix ? `${parser.urlPrefix}${captured}` : captured;
        }
      } catch {
        return null;
      }
      return null;
    }
    /**
     * Template string interpolation
     * Replaces {{url}} with encoded URL value
     */
    interpolate(template, vars) {
      return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const value = vars[key];
        return value ? encodeURIComponent(value) : "";
      });
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
      if (!path) {
        return obj;
      }
      return path.split(".").reduce((current, key) => {
        if (current == null) {
          return void 0;
        }
        return current[key];
      }, obj);
    }
    /**
     * Build HTTP headers including authentication if configured
     */
    async buildHeaders(baseHeaders) {
      const headers = { ...baseHeaders };
      if (this.config.runtime?.auth?.type === "header") {
        const auth = this.config.runtime.auth;
        const credManager = CredentialManager.getInstance();
        try {
          const credential = await credManager.get(auth.credentialKey);
          if (credential) {
            const headerValue = auth.template ? auth.template.replace("{{credential}}", credential) : credential;
            headers[auth.headerName] = headerValue;
          }
        } catch {
        }
      }
      return headers;
    }
    /**
     * Map HTTP status code to ArchiveErrorType
     */
    mapHttpErrorToArchiveError(status) {
      if (!status) {
        return "UNKNOWN" /* Unknown */;
      }
      if (status === 401 || status === 403) {
        return "AUTH_REQUIRED" /* AuthRequired */;
      }
      if (status === 429) {
        return "RATE_LIMIT" /* RateLimit */;
      }
      if (status === 404) {
        return "NOT_FOUND" /* NotFound */;
      }
      if (status >= 500) {
        return "SERVER_ERROR" /* ServerError */;
      }
      if (status >= 400) {
        return "BLOCKED" /* Blocked */;
      }
      return "UNKNOWN" /* Unknown */;
    }
  };

  // src/config/services/permacc.config.ts
  var permaCCConfig = {
    id: "permacc",
    name: "Perma.cc",
    homepage: "https://perma.cc",
    capabilities: {
      acceptsUrl: true,
      returnsUrl: true,
      preservesJavaScript: true,
      preservesInteractiveElements: true,
      requiresAuthentication: true,
      hasQuota: true,
      regionRestricted: false
    },
    runtime: {
      // Archive submission endpoint
      archiveEndpoint: {
        url: "https://api.perma.cc/v1/archives/",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        bodyTemplate: '{"url":"{{url}}"}',
        timeout: 12e4
      },
      // Extract archive URL from response
      // Response format: {"guid":"XXXXX-XXXXX","url":"https://perma.cc/XXXXX-XXXXX", ...}
      responseParser: {
        type: "json",
        path: "guid",
        urlPrefix: "https://perma.cc/"
      },
      // Authenticate with API key
      auth: {
        type: "header",
        credentialKey: "permaCCApiKey",
        headerName: "Authorization",
        template: "ApiKey {{credential}}"
      }
    }
  };

  // src/config/services/arquivopt.config.ts
  var arquivoPtConfig = {
    id: "arquivopt",
    name: "Arquivo.pt",
    homepage: "https://arquivo.pt",
    capabilities: {
      acceptsUrl: true,
      returnsUrl: true,
      preservesJavaScript: false,
      preservesInteractiveElements: false,
      requiresAuthentication: false,
      hasQuota: false,
      regionRestricted: true
    },
    runtime: {
      // Check for existing archives first
      // Query wayback machine: GET /wayback/*/url
      // Response contains redirect with timestamp if exists
      checkEndpoint: {
        url: "https://arquivo.pt/wayback/*/{{url}}",
        method: "GET",
        parser: {
          type: "regex",
          pattern: "/wayback/(\\d{14})/",
          captureGroup: 1,
          urlPrefix: "https://arquivo.pt/wayback/"
        }
      },
      // Submit URL for archiving
      archiveEndpoint: {
        url: "https://arquivo.pt/save",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        bodyTemplate: "url={{url}}",
        timeout: 12e4
      },
      // Extract archive URL from HTML response using regex
      // Response contains: <a href="https://arquivo.pt/wayback/20231201120000/example.com">
      responseParser: {
        type: "regex",
        pattern: `https?://arquivo\\.pt/wayback/\\d{14}/[^\\s"'<>]+`,
        captureGroup: 0
      }
    }
  };

  // src/config/services/ukwebarchive.config.ts
  var ukWebArchiveConfig = {
    id: "ukwebarchive",
    name: "UK Web Archive",
    homepage: "https://www.webarchive.org.uk",
    capabilities: {
      acceptsUrl: true,
      returnsUrl: false,
      preservesJavaScript: true,
      preservesInteractiveElements: true,
      requiresAuthentication: false,
      hasQuota: false,
      regionRestricted: true
    },
    runtime: {
      // Validate UK domain
      urlValidator: {
        type: "regex",
        pattern: "\\.uk$|\\.co\\.uk$|\\.org\\.uk$|\\.ac\\.uk$|\\.gov\\.uk$",
        errorMessage: "UK Web Archive primarily accepts UK domains (.uk, .co.uk, .org.uk, etc.)"
      },
      // Check for existing archives
      checkEndpoint: {
        url: "https://www.webarchive.org.uk/en/ukwa/search?q={{url}}",
        method: "GET",
        parser: {
          type: "regex",
          pattern: `https://www\\.webarchive\\.org\\.uk/[^/]+/\\d{14}/[^\\s"'<>]+`,
          captureGroup: 0
        }
      },
      // Submit nomination for archiving
      archiveEndpoint: {
        url: "https://www.webarchive.org.uk/en/ukwa/nominate",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        bodyTemplate: "url={{url}}&nomination_reason=Academic research resource&your_name=Zotero User",
        timeout: 6e4
      },
      // Parse confirmation from response
      responseParser: {
        type: "regex",
        pattern: "Thank you for your nomination|successfully nominated|We will consider your nomination",
        captureGroup: 0,
        urlPrefix: "https://www.webarchive.org.uk/en/ukwa/nominate"
      }
    }
  };

  // src/modules/archive/ServiceConfigLoader.ts
  var ServiceConfigLoader = class {
    /**
     * Load and register all archive services
     */
    static loadAllServices() {
      const registry = ServiceRegistry.getInstance();
      registry.init();
      try {
        registry.register("internetarchive", new InternetArchiveService());
        Zotero.debug("MomentO7: Registered InternetArchiveService");
      } catch (error) {
        Zotero.debug(
          `MomentO7: Failed to register InternetArchiveService: ${error}`
        );
      }
      try {
        registry.register("archivetoday", new ArchiveTodayService());
        Zotero.debug("MomentO7: Registered ArchiveTodayService");
      } catch (error) {
        Zotero.debug(
          `MomentO7: Failed to register ArchiveTodayService: ${error}`
        );
      }
      const configs = [permaCCConfig, arquivoPtConfig, ukWebArchiveConfig];
      for (const config2 of configs) {
        try {
          const service = new ConfigurableArchiveService(config2);
          registry.register(config2.id, service);
          Zotero.debug(`MomentO7: Registered config-driven service: ${config2.id}`);
        } catch (error) {
          Zotero.debug(
            `MomentO7: Failed to load service ${config2.id}: ${error}`
          );
        }
      }
      Zotero.debug("MomentO7: Archive services initialization complete");
    }
  };

  // src/modules/memento/MementoProtocol.ts
  var MementoProtocol = class {
    static LINK_HEADER = "Link";
    static MEMENTO_DATETIME_HEADER = "Memento-Datetime";
    // private static readonly ACCEPT_DATETIME_HEADER = 'Accept-Datetime';
    /**
     * Parse Link header according to RFC 5988
     */
    static parseLinkHeader(header) {
      const links = [];
      const linkPattern = /<([^>]+)>([^,]*)/g;
      let match;
      while ((match = linkPattern.exec(header)) !== null) {
        const url = match[1];
        const params = match[2];
        const link = {
          url,
          rel: []
        };
        const paramPattern = /(\w+)="?([^";]+)"?/g;
        let paramMatch;
        while ((paramMatch = paramPattern.exec(params)) !== null) {
          const key = paramMatch[1];
          const value = paramMatch[2];
          switch (key) {
            case "rel":
              link.rel = value.split(/\s+/);
              break;
            case "datetime":
              link.datetime = value;
              break;
            case "type":
              link.type = value;
              break;
            case "from":
              link.from = value;
              break;
            case "until":
              link.until = value;
              break;
          }
        }
        if (link.rel.length > 0) {
          links.push(link);
        }
      }
      return links;
    }
    /**
     * Format Link header
     */
    static formatLinkHeader(links) {
      return links.map((link) => {
        let header = `<${link.url}>`;
        const params = [];
        if (link.rel.length > 0) {
          params.push(`rel="${link.rel.join(" ")}"`);
        }
        if (link.datetime) {
          params.push(`datetime="${link.datetime}"`);
        }
        if (link.type) {
          params.push(`type="${link.type}"`);
        }
        if (link.from) {
          params.push(`from="${link.from}"`);
        }
        if (link.until) {
          params.push(`until="${link.until}"`);
        }
        if (params.length > 0) {
          header += "; " + params.join("; ");
        }
        return header;
      }).join(", ");
    }
    /**
     * Parse TimeMap from JSON
     */
    static parseTimeMap(json) {
      const timemap = {
        original: "",
        mementos: []
      };
      if (json.original_uri) {
        timemap.original = json.original_uri;
      }
      if (json.timegate_uri) {
        timemap.timegate = json.timegate_uri;
      }
      if (json.timemap_uri) {
        timemap.timemap = json.timemap_uri;
      }
      if (json.mementos && Array.isArray(json.mementos.list)) {
        timemap.mementos = json.mementos.list.map((m) => ({
          url: m.uri,
          datetime: m.datetime,
          rel: m.rel ? m.rel.split(/\s+/) : []
        }));
      }
      return timemap;
    }
    /**
     * Parse TimeMap from link format
     */
    static parseTimemapLinkFormat(text) {
      const timemap = {
        original: "",
        mementos: []
      };
      const lines = text.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const links = this.parseLinkHeader(line);
        for (const link of links) {
          if (link.rel.includes("original")) {
            timemap.original = link.url;
          } else if (link.rel.includes("timegate")) {
            timemap.timegate = link.url;
          } else if (link.rel.includes("self") && link.type?.includes("timemap")) {
            timemap.timemap = link.url;
          } else if (link.rel.includes("memento") && link.datetime) {
            timemap.mementos.push({
              url: link.url,
              datetime: link.datetime,
              rel: link.rel
            });
          }
        }
      }
      return timemap;
    }
    /**
     * Find the best memento for a given datetime
     */
    static findBestMemento(mementos, targetDate) {
      if (mementos.length === 0) {
        return null;
      }
      if (!targetDate) {
        return mementos.reduce((latest, current) => {
          const latestDate = new Date(latest.datetime);
          const currentDate = new Date(current.datetime);
          return currentDate > latestDate ? current : latest;
        });
      }
      return mementos.reduce((closest, current) => {
        const closestDiff = Math.abs(
          new Date(closest.datetime).getTime() - targetDate.getTime()
        );
        const currentDiff = Math.abs(
          new Date(current.datetime).getTime() - targetDate.getTime()
        );
        return currentDiff < closestDiff ? current : closest;
      });
    }
    /**
     * Format HTTP date
     */
    static formatHttpDate(date) {
      return date.toUTCString();
    }
    /**
     * Parse HTTP date
     */
    static parseHttpDate(dateStr) {
      return new Date(dateStr);
    }
    /**
     * Check if a response is a memento
     */
    static isMemento(headers) {
      const linkHeader = headers[this.LINK_HEADER] || headers["link"];
      if (!linkHeader) {
        return false;
      }
      const links = this.parseLinkHeader(linkHeader);
      return links.some((link) => link.rel.includes("memento"));
    }
    /**
     * Extract memento information from response headers
     */
    static extractMementoInfo(headers) {
      const linkHeader = headers[this.LINK_HEADER] || headers["link"];
      const mementoDatetime = headers[this.MEMENTO_DATETIME_HEADER] || headers["memento-datetime"];
      if (!linkHeader) {
        return null;
      }
      const links = this.parseLinkHeader(linkHeader);
      const mementoLink = links.find((link) => link.rel.includes("memento"));
      const originalLink = links.find((link) => link.rel.includes("original"));
      if (!mementoLink || !originalLink) {
        return null;
      }
      return {
        mementoUrl: mementoLink.url,
        mementoDatetime: mementoDatetime || mementoLink.datetime || "",
        original: originalLink.url,
        links
      };
    }
  };

  // src/modules/memento/MementoChecker.ts
  var MementoChecker = class {
    static AGGREGATORS = [
      {
        name: "Time Travel",
        timegateUrl: "http://timetravel.mementoweb.org/timegate/",
        timemapUrl: "http://timetravel.mementoweb.org/timemap/json/"
      },
      {
        name: "MemGator",
        timegateUrl: "https://memgator.cs.odu.edu/timegate/",
        timemapUrl: "https://memgator.cs.odu.edu/timemap/json/"
      }
    ];
    static KNOWN_ARCHIVES = [
      {
        name: "Internet Archive",
        pattern: /web\.archive\.org/i,
        timegateUrl: "https://web.archive.org/web/",
        timemapUrl: "https://web.archive.org/web/timemap/json/"
      },
      {
        name: "Archive.today",
        pattern: /archive\.(today|is|ph|md|li)/i,
        // Archive.today doesn't support Memento Protocol directly
        timegateUrl: null,
        timemapUrl: null
      },
      {
        name: "UK Web Archive",
        pattern: /webarchive\.org\.uk/i,
        timegateUrl: "https://www.webarchive.org.uk/wayback/",
        timemapUrl: "https://www.webarchive.org.uk/wayback/timemap/json/"
      },
      {
        name: "Arquivo.pt",
        pattern: /arquivo\.pt/i,
        timegateUrl: "https://arquivo.pt/wayback/",
        timemapUrl: "https://arquivo.pt/wayback/timemap/json/"
      }
    ];
    /**
     * Check for existing mementos of a URL
     */
    static async checkUrl(url) {
      const result = {
        hasMemento: false,
        mementos: []
      };
      for (const aggregator of this.AGGREGATORS) {
        try {
          const timemap = await this.fetchTimeMap(
            aggregator.timemapUrl + encodeURIComponent(url)
          );
          if (timemap && timemap.mementos.length > 0) {
            result.hasMemento = true;
            result.timegate = aggregator.timegateUrl + url;
            result.timemap = aggregator.timemapUrl + url;
            result.mementos = this.extractMementoInfo(timemap);
            return result;
          }
        } catch (error) {
          console.warn(`Failed to check ${aggregator.name}:`, error);
        }
      }
      for (const archive of this.KNOWN_ARCHIVES) {
        if (archive.timemapUrl) {
          try {
            const timemap = await this.fetchTimeMap(
              archive.timemapUrl + encodeURIComponent(url)
            );
            if (timemap && timemap.mementos.length > 0) {
              result.hasMemento = true;
              result.mementos.push(
                ...this.extractMementoInfo(timemap, archive.name)
              );
            }
          } catch (error) {
            console.warn(`Failed to check ${archive.name}:`, error);
          }
        }
      }
      return result;
    }
    /**
     * Check if a specific archive has a memento
     */
    static async checkArchive(url, archiveName) {
      const archive = this.KNOWN_ARCHIVES.find(
        (a) => a.name.toLowerCase() === archiveName.toLowerCase()
      );
      if (!archive || !archive.timemapUrl) {
        return null;
      }
      try {
        const timemap = await this.fetchTimeMap(
          archive.timemapUrl + encodeURIComponent(url)
        );
        if (timemap && timemap.mementos.length > 0) {
          const bestMemento = MementoProtocol.findBestMemento(timemap.mementos);
          if (bestMemento) {
            return {
              url: bestMemento.url,
              datetime: bestMemento.datetime,
              service: archive.name
            };
          }
        }
      } catch (error) {
        console.warn(`Failed to check ${archive.name}:`, error);
      }
      return null;
    }
    /**
     * Fetch TimeMap from a URL
     */
    static async fetchTimeMap(timemapUrl) {
      try {
        const response = await Zotero.HTTP.request(timemapUrl, {
          method: "GET",
          timeout: 3e4,
          headers: {
            Accept: "application/json, application/link-format"
          }
        });
        if (response.status !== 200) {
          return null;
        }
        try {
          const json = JSON.parse(response.responseText || "{}");
          return MementoProtocol.parseTimeMap(json);
        } catch {
          return MementoProtocol.parseTimemapLinkFormat(
            response.responseText || ""
          );
        }
      } catch (error) {
        console.error("Failed to fetch TimeMap:", error);
        return null;
      }
    }
    /**
     * Extract memento information from TimeMap
     */
    static extractMementoInfo(timemap, serviceName) {
      return timemap.mementos.map((memento) => {
        let service = serviceName || "Unknown";
        if (!serviceName) {
          for (const archive of this.KNOWN_ARCHIVES) {
            if (archive.pattern.test(memento.url)) {
              service = archive.name;
              break;
            }
          }
        }
        return {
          url: memento.url,
          datetime: memento.datetime,
          service
        };
      });
    }
    /**
     * Find existing mementos in item data
     */
    static findExistingMementos(item) {
      const mementos = [];
      const extra = item.getField("extra");
      if (extra) {
        const patterns = [
          /Archived:\s*(https?:\/\/[^\s]+)/gi,
          /Internet Archive:\s*(https?:\/\/[^\s]+)/gi,
          /Archive\.today:\s*(https?:\/\/[^\s]+)/gi,
          /Perma\.cc:\s*(https?:\/\/[^\s]+)/gi
        ];
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(extra)) !== null) {
            const url = match[1];
            let service = "Unknown";
            for (const archive of this.KNOWN_ARCHIVES) {
              if (archive.pattern.test(url)) {
                service = archive.name;
                break;
              }
            }
            mementos.push({
              url,
              datetime: (/* @__PURE__ */ new Date()).toISOString(),
              // We don't have the actual datetime
              service
            });
          }
        }
      }
      const notes = item.getNotes ? item.getNotes() : [];
      for (const noteId of notes) {
        const note = Zotero.Items.get(noteId);
        if (note && note.getNote) {
          const noteContent = note.getNote();
          const robustLinkPattern = /data-versionurl="([^"]+)"/g;
          let match;
          while ((match = robustLinkPattern.exec(noteContent)) !== null) {
            const url = match[1];
            let service = "Unknown";
            for (const archive of this.KNOWN_ARCHIVES) {
              if (archive.pattern.test(url)) {
                service = archive.name;
                break;
              }
            }
            const datetimeMatch = noteContent.match(
              new RegExp(
                `data-versiondate="([^"]+)"[^>]*data-versionurl="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`
              )
            );
            const datetime = datetimeMatch && datetimeMatch.length > 1 && datetimeMatch[1] ? datetimeMatch[1] : (/* @__PURE__ */ new Date()).toISOString();
            mementos.push({
              url,
              datetime,
              service
            });
          }
        }
      }
      const uniqueMementos = /* @__PURE__ */ new Map();
      for (const memento of mementos) {
        uniqueMementos.set(memento.url, memento);
      }
      return Array.from(uniqueMementos.values());
    }
  };

  // src/utils/ConcurrentArchiveQueue.ts
  var ConcurrentArchiveQueue = class {
    maxConcurrency;
    trafficMonitor;
    progressWindow = null;
    itemProgress = /* @__PURE__ */ new Map();
    activeCount = 0;
    /**
     * Convert item ID to string key (items may have numeric IDs)
     */
    getItemKey(item) {
      return String(item.id);
    }
    constructor(maxConcurrency = 4) {
      this.maxConcurrency = Math.min(Math.max(1, maxConcurrency), 8);
      this.trafficMonitor = TrafficMonitor.getInstance();
    }
    /**
     * Process items with concurrent queue pattern
     * @param items Items to archive
     * @param archiveFn Function to archive a single item: (item) => Promise<ArchiveResult>
     * @returns Results in original item order
     */
    async process(items, archiveFn) {
      if (!items || items.length === 0) {
        return [];
      }
      this.trafficMonitor.resetBatch();
      this.initializeProgressTracking(items);
      this.createProgressWindow(items.length);
      const queue = [...items];
      const activePromises = [];
      const completedResults = /* @__PURE__ */ new Map();
      try {
        while (this.activeCount < this.maxConcurrency && queue.length > 0) {
          const item = queue.shift();
          const promise = this.processItem(item, archiveFn);
          const id = this.getItemKey(item);
          activePromises.push({ promise, id });
          this.activeCount++;
        }
        while (queue.length > 0 || activePromises.length > 0) {
          if (activePromises.length === 0) break;
          let result;
          let failedEntryId;
          try {
            const wrappedPromises = activePromises.map(
              (entry) => entry.promise.then((r) => ({ result: r, entryId: entry.id, failed: false })).catch((e) => {
                Zotero.debug(
                  `MomentO7 Queue: Item ${entry.id} failed: ${e instanceof Error ? e.message : String(e)}`
                );
                return { result: void 0, entryId: entry.id, failed: true };
              })
            );
            const settledResult = await Promise.race(wrappedPromises);
            if (settledResult.failed) {
              failedEntryId = settledResult.entryId;
            } else {
              result = settledResult.result;
            }
          } catch (error) {
            Zotero.debug(
              `MomentO7 Queue: Unexpected Promise.race error: ${error instanceof Error ? error.message : String(error)}`
            );
            continue;
          }
          if (failedEntryId) {
            const failedIndex = activePromises.findIndex(
              (e) => e.id === failedEntryId
            );
            if (failedIndex >= 0) {
              activePromises.splice(failedIndex, 1);
              this.activeCount = Math.max(0, this.activeCount - 1);
            }
            continue;
          }
          if (result) {
            const completedId = this.getItemKey(result.item);
            completedResults.set(completedId, result);
            const completedIndex = activePromises.findIndex(
              (entry) => entry.id === completedId
            );
            if (completedIndex >= 0) {
              activePromises.splice(completedIndex, 1);
            }
            this.activeCount--;
          }
          if (queue.length > 0) {
            const nextItem = queue.shift();
            const nextPromise = this.processItem(nextItem, archiveFn);
            const nextId = this.getItemKey(nextItem);
            activePromises.push({ promise: nextPromise, id: nextId });
            this.activeCount++;
          }
          const completedCount = completedResults.size;
          this.updateHeadline(completedCount, items.length);
        }
        this.closeProgressWindow(completedResults.size, items.length);
        return items.map(
          (item) => completedResults.get(this.getItemKey(item)) || {
            item,
            success: false,
            error: "Item was not processed"
          }
        );
      } catch (error) {
        Zotero.debug(`MomentO7 Queue: Fatal error during processing: ${error}`);
        try {
          this.closeProgressWindow(0, items.length);
        } catch (e) {
          Zotero.debug(`MomentO7 Queue: Error closing progress window: ${e}`);
        }
        throw error;
      }
    }
    /**
     * Process a single item and update its progress line
     */
    async processItem(item, archiveFn) {
      const itemKey = this.getItemKey(item);
      const itemProgress = this.itemProgress.get(itemKey);
      if (!itemProgress) {
        throw new Error(`Item ${itemKey} not found in progress tracking`);
      }
      itemProgress.status = "processing";
      this.updateItemLine(itemProgress, "Processing...");
      try {
        const result = await archiveFn(item);
        itemProgress.status = "completed";
        itemProgress.result = result;
        if (result.success) {
          const url = result.archivedUrl || "Unknown";
          this.updateItemLine(
            itemProgress,
            `\u2713 Archived: ${url.substring(0, 50)}...`,
            "success"
          );
        } else {
          const error = result.error || "Unknown error";
          this.updateItemLine(
            itemProgress,
            `\u2717 Failed: ${error.substring(0, 50)}...`,
            "fail"
          );
        }
        return result;
      } catch (error) {
        itemProgress.status = "failed";
        const errorMessage = error instanceof Error ? error.message : String(error);
        itemProgress.error = errorMessage;
        this.updateItemLine(
          itemProgress,
          `\u2717 Error: ${errorMessage.substring(0, 50)}...`,
          "fail"
        );
        return {
          item,
          success: false,
          error: errorMessage
        };
      }
    }
    /**
     * Create progress window with multi-line support
     */
    createProgressWindow(itemCount) {
      this.progressWindow = new Zotero.ProgressWindow({
        closeOnClick: false
      });
      this.progressWindow.changeHeadline(
        `Archiving (0/${itemCount}) | Loading...`
      );
      for (const [, itemProgress] of this.itemProgress) {
        const itemTitle = itemProgress.item.getField("title") || "Untitled";
        const truncatedTitle = itemTitle.substring(0, 50);
        itemProgress.lineHandle = this.progressWindow.addDescription(
          `\u23F3 ${truncatedTitle}`
        );
      }
      this.progressWindow.show();
    }
    /**
     * Update a single item's progress line
     */
    updateItemLine(itemProgress, message, type = "default") {
      if (!this.progressWindow || !itemProgress.lineHandle) {
        return;
      }
      const itemTitle = itemProgress.item.getField("title") || "Untitled";
      const icon = type === "success" ? "\u2713" : type === "fail" ? "\u2717" : "\u23F3";
      const prefix = icon;
      this.progressWindow.addDescription(
        `${prefix} ${itemTitle.substring(0, 40)}: ${message}`
      );
    }
    /**
     * Update headline with progress and traffic summary
     */
    updateHeadline(completedCount, totalCount) {
      if (!this.progressWindow) {
        return;
      }
      const percentage = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
      const trafficSummary = this.trafficMonitor.getTrafficSummary();
      let headline = `Archiving (${completedCount}/${totalCount} - ${percentage}%)`;
      if (trafficSummary !== "No traffic data") {
        headline += ` | ${trafficSummary}`;
      }
      this.progressWindow.changeHeadline(headline);
    }
    /**
     * Close progress window with summary
     */
    closeProgressWindow(completedCount, totalCount) {
      if (!this.progressWindow) {
        return;
      }
      const successCount = Array.from(this.itemProgress.values()).filter(
        (p) => p.result?.success
      ).length;
      const failCount = completedCount - successCount;
      const percentage = totalCount > 0 ? Math.round(successCount / totalCount * 100) : 0;
      this.progressWindow.changeHeadline(
        `Complete: ${successCount} archived, ${failCount} failed (${percentage}%)`
      );
      this.progressWindow.startCloseTimer(5e3);
    }
    /**
     * Initialize progress tracking for items
     */
    initializeProgressTracking(items) {
      this.itemProgress.clear();
      for (const item of items) {
        this.itemProgress.set(this.getItemKey(item), {
          item,
          status: "queued",
          lineHandle: null
        });
      }
    }
  };

  // src/modules/archive/ArchiveCoordinator.ts
  var ArchiveCoordinator = class _ArchiveCoordinator {
    static instance;
    registry;
    currentTrafficMonitor = null;
    requestedServiceId;
    constructor() {
      this.registry = ServiceRegistry.getInstance();
    }
    static getInstance() {
      if (!_ArchiveCoordinator.instance) {
        _ArchiveCoordinator.instance = new _ArchiveCoordinator();
      }
      return _ArchiveCoordinator.instance;
    }
    /**
     * Archive items using concurrent queue (max 4 items simultaneously)
     * In test environment, falls back to sequential processing to avoid memory issues
     */
    async archiveItems(items, serviceId) {
      if (!items || items.length === 0) {
        throw new Error("No items provided for archiving");
      }
      this.requestedServiceId = serviceId;
      this.currentTrafficMonitor = TrafficMonitor.getInstance();
      try {
        if (false) {
          const results = [];
          for (const item of items) {
            results.push(await this.archiveItemWithContext(item));
          }
          return results;
        }
        const queue = new ConcurrentArchiveQueue(4);
        return await queue.process(
          items,
          (item) => this.archiveItemWithContext(item)
        );
      } finally {
        this.currentTrafficMonitor = null;
        this.requestedServiceId = void 0;
      }
    }
    /**
     * Archive a single item within batch context
     * Wraps archiveItem to integrate with concurrent queue and traffic monitoring
     */
    async archiveItemWithContext(item) {
      try {
        return await this.archiveItem(item, this.requestedServiceId);
      } catch (error) {
        Zotero.debug(`MomentO7: Error archiving item ${item.id}: ${error}`);
        return {
          item,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    /**
     * Archive a single item
     * Checks for existing mementos before archiving if preference enabled
     */
    async archiveItem(item, serviceId) {
      const urlField = item.getField("url");
      const url = typeof urlField === "string" ? urlField : "";
      if (!url) {
        throw new Error("Item has no URL to archive");
      }
      if (PreferencesManager.shouldCheckBeforeArchive()) {
        const existingResult = await this.checkExistingMemento(url, item);
        if (existingResult) {
          return existingResult;
        }
      }
      if (serviceId) {
        const service = this.registry.get(serviceId);
        if (!service) {
          throw new Error(`Service ${serviceId} not found`);
        }
        return await this.archiveWithService(item, service, serviceId);
      }
      return await this.archiveWithFallback(item);
    }
    /**
     * Check for existing mementos before archiving
     * Returns ArchiveResult if recent memento found and should skip, null otherwise
     */
    async checkExistingMemento(url, item) {
      try {
        Zotero.debug(`MomentO7: Checking for existing mementos of ${url}`);
        const storedMementos = MementoChecker.findExistingMementos(item);
        if (storedMementos.length > 0) {
          const recentMemento = this.findRecentMemento(storedMementos);
          if (recentMemento) {
            Zotero.debug(
              `MomentO7: Found recent stored memento from ${recentMemento.service}`
            );
            return this.createExistingMementoResult(
              item,
              recentMemento,
              "stored"
            );
          }
        }
        const mementoResult = await MementoChecker.checkUrl(url);
        if (mementoResult.hasMemento && mementoResult.mementos.length > 0) {
          const recentMemento = this.findRecentMemento(mementoResult.mementos);
          if (recentMemento) {
            Zotero.debug(
              `MomentO7: Found recent remote memento from ${recentMemento.service}`
            );
            if (PreferencesManager.shouldSkipExistingMementos()) {
              return this.createExistingMementoResult(
                item,
                recentMemento,
                "remote"
              );
            }
            return {
              item,
              success: true,
              archivedUrl: recentMemento.url,
              service: recentMemento.service,
              message: `Recent archive found (${this.formatAge(recentMemento.datetime)})`,
              existingArchive: {
                memento: recentMemento,
                source: "remote",
                checkResult: mementoResult
              }
            };
          }
        }
        return null;
      } catch (error) {
        Zotero.debug(`MomentO7: Memento check failed: ${error}`);
        return null;
      }
    }
    /**
     * Find a memento within the age threshold
     */
    findRecentMemento(mementos) {
      const thresholdMs = PreferencesManager.getArchiveAgeThresholdMs();
      const now = Date.now();
      const sorted = [...mementos].sort(
        (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      );
      for (const memento of sorted) {
        const mementoAge = now - new Date(memento.datetime).getTime();
        if (mementoAge < thresholdMs) {
          return memento;
        }
      }
      return null;
    }
    /**
     * Create ArchiveResult for existing memento
     */
    createExistingMementoResult(item, memento, source) {
      return {
        item,
        success: true,
        archivedUrl: memento.url,
        service: memento.service,
        message: `Using existing archive from ${memento.service} (${this.formatAge(memento.datetime)})`,
        existingArchive: {
          memento,
          source,
          skipped: true
        }
      };
    }
    /**
     * Format memento age for display
     */
    formatAge(datetime) {
      const ageMs = Date.now() - new Date(datetime).getTime();
      const hours = Math.floor(ageMs / (1e3 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) {
        return `${days} day${days > 1 ? "s" : ""} old`;
      }
      if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} old`;
      }
      return "less than 1 hour old";
    }
    /**
     * Archive with a specific service
     */
    async archiveWithService(item, service, serviceId) {
      try {
        const results = await service.archive([item]);
        return results[0] || {
          item,
          success: false,
          service: serviceId,
          error: "No result returned from service"
        };
      } catch (error) {
        return {
          item,
          success: false,
          service: serviceId,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    /**
     * Archive using fallback order from preferences
     * Filters out jammed services based on traffic monitoring
     */
    async archiveWithFallback(item) {
      const availableServices = await this.registry.getAvailable();
      if (availableServices.length === 0) {
        throw new Error("No archiving services available");
      }
      const fallbackOrder = this.getFallbackOrder();
      let orderedServices = this.orderServices(availableServices, fallbackOrder);
      if (this.currentTrafficMonitor) {
        orderedServices = orderedServices.filter(
          ({ id }) => !this.currentTrafficMonitor.isServiceJammed(id)
        );
        if (orderedServices.length === 0) {
          throw new Error(
            "No non-jammed archiving services available - consider retrying later"
          );
        }
        Zotero.debug(
          `MomentO7: Filtering jammed services, ${orderedServices.length} services available for fallback`
        );
      }
      const errors = [];
      for (const { id, service } of orderedServices) {
        try {
          const result = await this.archiveWithService(item, service, id);
          if (result.success) {
            return result;
          }
          errors.push(`${id}: ${result.error}`);
        } catch (error) {
          errors.push(
            `${id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      throw new Error(`All archive services failed:
${errors.join("\n")}`);
    }
    /**
     * Auto-archive an item using the default service
     */
    async autoArchive(item) {
      const urlField = item.getField("url");
      const url = typeof urlField === "string" ? urlField : "";
      if (!url || !this.shouldAutoArchive(url)) {
        return null;
      }
      const defaultService = Zotero.Prefs.get("extensions.momento7.defaultService") || "internetarchive";
      try {
        return await this.archiveItem(item, defaultService);
      } catch (error) {
        Zotero.debug(
          `MomentO7: Auto-archive failed for item ${item.id}: ${error}`
        );
        return null;
      }
    }
    /**
     * Check if URL should be auto-archived
     */
    shouldAutoArchive(url) {
      const excludePatterns = [
        /^file:/i,
        /^chrome:/i,
        /^about:/i,
        /^data:/i,
        /localhost/i,
        /127\.0\.0\.1/,
        /192\.168\./,
        /10\.\d+\.\d+\.\d+/,
        /172\.(1[6-9]|2[0-9]|3[0-1])\./
      ];
      return !excludePatterns.some((pattern) => pattern.test(url));
    }
    /**
     * Get fallback order from preferences
     */
    getFallbackOrder() {
      const order = Zotero.Prefs.get("extensions.momento7.fallbackOrder") || "internetarchive,archivetoday,arquivopt,permacc,ukwebarchive";
      return order.split(",").filter((id) => id.trim());
    }
    /**
     * Order services according to fallback preferences
     */
    orderServices(services, fallbackOrder) {
      const ordered = [];
      const remaining = new Map(services.map((s) => [s.id, s]));
      for (const serviceId of fallbackOrder) {
        const service = remaining.get(serviceId);
        if (service) {
          ordered.push(service);
          remaining.delete(serviceId);
        }
      }
      ordered.push(...remaining.values());
      return ordered;
    }
  };

  // src/modules/archive/RobustLinkCreator.ts
  var RobustLinkCreator = class _RobustLinkCreator {
    static DEFAULT_TEMPLATE = `
    <div class="robust-link-wrapper">
      <a href="{originalUrl}"
         data-originalurl="{originalUrl}"
         data-versionurl="{primaryArchiveUrl}"
         data-versiondate="{versionDate}"
         class="robust-link">
        {title}
      </a>
      <span class="robust-link-archives">
        [Archives: {archiveLinks}]
      </span>
    </div>
  `;
    /**
     * Creates a robust link HTML snippet with multiple archive sources
     */
    static create(data) {
      const {
        originalUrl,
        archiveUrls,
        versionDate = (/* @__PURE__ */ new Date()).toISOString(),
        title = originalUrl
      } = data;
      const enabledServices = PreferencesManager.getEnabledServices();
      const filteredArchiveUrls = Object.entries(archiveUrls).filter(([service]) => enabledServices.includes(service)).reduce(
        (acc, [service, url]) => {
          acc[service] = url;
          return acc;
        },
        {}
      );
      if (Object.keys(filteredArchiveUrls).length === 0) {
        return `<a href="${this.escapeHtml(originalUrl)}">${this.escapeHtml(title)}</a>`;
      }
      const primaryArchiveUrl = this.getPrimaryArchiveUrl(filteredArchiveUrls);
      const archiveLinks = this.createArchiveLinks(filteredArchiveUrls);
      const html = _RobustLinkCreator.DEFAULT_TEMPLATE.replace(
        /{originalUrl}/g,
        this.escapeHtml(originalUrl)
      ).replace(/{primaryArchiveUrl}/g, this.escapeHtml(primaryArchiveUrl)).replace(/{versionDate}/g, this.escapeHtml(versionDate)).replace(/{title}/g, this.escapeHtml(title)).replace(/{archiveLinks}/g, archiveLinks);
      return html.trim();
    }
    /**
     * Creates a simple robust link for notes
     */
    static createSimple(originalUrl, archiveUrl, service = "Unknown") {
      const versionDate = (/* @__PURE__ */ new Date()).toISOString();
      return `<a href="${this.escapeHtml(originalUrl)}"
       data-originalurl="${this.escapeHtml(originalUrl)}"
       data-versionurl="${this.escapeHtml(archiveUrl)}"
       data-versiondate="${this.escapeHtml(versionDate)}"
       title="Archived by ${this.escapeHtml(service)}">
      ${this.escapeHtml(originalUrl)}
    </a>
    [<a href="${this.escapeHtml(archiveUrl)}">Archived</a>]`;
    }
    /**
     * Parses robust link data from an HTML element
     */
    static parse(html) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const link = doc.querySelector("a[data-originalurl]");
        if (!link) {
          return null;
        }
        const originalUrl = link.getAttribute("data-originalurl") || "";
        const versionUrl = link.getAttribute("data-versionurl") || "";
        const versionDate = link.getAttribute("data-versiondate") || "";
        const title = link.textContent || originalUrl;
        const archiveUrls = {};
        const archiveLinks = doc.querySelectorAll(".robust-link-archives a");
        archiveLinks.forEach((archiveLink) => {
          const href = archiveLink.getAttribute("href");
          const text = archiveLink.textContent || "";
          if (href && text) {
            const service = this.detectService(href, text);
            if (service) {
              archiveUrls[service] = href;
            }
          }
        });
        if (versionUrl && Object.keys(archiveUrls).length === 0) {
          const service = this.detectService(versionUrl, "");
          if (service) {
            archiveUrls[service] = versionUrl;
          }
        }
        return {
          originalUrl,
          archiveUrls,
          versionDate,
          title
        };
      } catch (error) {
        Zotero.debug(`MomentO7: Failed to parse robust link: ${error}`);
        return null;
      }
    }
    /**
     * Create robust links for a Zotero item based on existing archives
     */
    static createFromItem(item) {
      const url = item.getField("url");
      if (!url) return null;
      const title = item.getField("title") || url;
      const archiveUrls = {};
      const extra = item.getField("extra") || "";
      const lines = extra.split("\n");
      const servicePatterns = [
        { pattern: /^Internet Archive:\s*(.+)$/i, service: "internetarchive" },
        { pattern: /^Archive\.today:\s*(.+)$/i, service: "archivetoday" },
        { pattern: /^Perma\.cc:\s*(.+)$/i, service: "permacc" },
        { pattern: /^UK Web Archive:\s*(.+)$/i, service: "ukwebarchive" },
        { pattern: /^Arquivo\.pt:\s*(.+)$/i, service: "arquivopt" }
      ];
      for (const line of lines) {
        for (const { pattern, service } of servicePatterns) {
          const match = line.match(pattern);
          if (match && match.length > 1 && match[1]) {
            archiveUrls[service] = match[1].trim();
          }
        }
      }
      if (Object.keys(archiveUrls).length === 0) {
        return null;
      }
      return this.create({
        originalUrl: url,
        archiveUrls,
        title
      });
    }
    static getPrimaryArchiveUrl(archiveUrls) {
      const fallbackOrder = PreferencesManager.getFallbackOrder();
      for (const service of fallbackOrder) {
        if (archiveUrls[service]) {
          return archiveUrls[service];
        }
      }
      const firstUrl = Object.values(archiveUrls)[0];
      return firstUrl || "";
    }
    static createArchiveLinks(archiveUrls) {
      const serviceNames = {
        internetarchive: "IA",
        archivetoday: "AT",
        permacc: "Perma",
        ukwebarchive: "UK",
        arquivopt: "PT"
      };
      return Object.entries(archiveUrls).map(([service, url]) => {
        const name = serviceNames[service] || service;
        return `<a href="${this.escapeHtml(url)}" title="${this.escapeHtml(service)}">${this.escapeHtml(name)}</a>`;
      }).join(", ");
    }
    static detectService(url, text) {
      const patterns = {
        internetarchive: [/web\.archive\.org/i, /wayback/i],
        archivetoday: [/archive\.(today|is|ph|md|li)/i],
        permacc: [/perma\.cc/i],
        ukwebarchive: [/webarchive\.org\.uk/i],
        arquivopt: [/arquivo\.pt/i]
      };
      for (const [service, servicePatterns] of Object.entries(patterns)) {
        for (const pattern of servicePatterns) {
          if (pattern.test(url) || pattern.test(text)) {
            return service;
          }
        }
      }
      return null;
    }
    static escapeHtml(text) {
      const doc = document.implementation.createHTMLDocument("sandbox");
      const div = doc.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/utils/HtmlUtils.ts
  var HtmlUtils = class {
    /**
     * Create an isolated document for safe HTML parsing.
     * The returned document is sandboxed - scripts won't execute.
     */
    static createIsolatedDocument(html) {
      const doc = document.implementation.createHTMLDocument("sandbox");
      if (doc.body) {
        doc.body.innerHTML = html;
      }
      return doc;
    }
    /**
     * Escape HTML special characters to prevent XSS
     */
    static escape(text) {
      if (!text) return "";
      const escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
        "/": "&#x2F;"
      };
      return text.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
    }
    /**
     * Unescape HTML entities safely.
     * Uses isolated document for decoding - scripts won't execute.
     */
    static unescape(text) {
      if (!text) return "";
      const doc = document.implementation.createHTMLDocument("sandbox");
      const textarea = doc.createElement("textarea");
      textarea.innerHTML = text;
      return textarea.value;
    }
    /**
     * Strip HTML tags from text safely using isolated document.
     */
    static stripTags(html) {
      if (!html) return "";
      const doc = this.createIsolatedDocument(html);
      return doc.body?.textContent || doc.body?.innerText || "";
    }
    /**
     * Create a safe HTML element from text
     */
    static createSafeElement(tag, text, attributes) {
      const escapedText = this.escape(text);
      const attrStr = attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${this.escape(value)}"`).join(" ") : "";
      return `<${tag}${attrStr ? " " + attrStr : ""}>${escapedText}</${tag}>`;
    }
    /**
     * Create a robust link with data attributes
     */
    static createRobustLink(originalUrl, archivedUrl, linkText, versionDate = (/* @__PURE__ */ new Date()).toISOString()) {
      return this.createSafeElement("a", linkText, {
        href: originalUrl,
        "data-originalurl": originalUrl,
        "data-versionurl": archivedUrl,
        "data-versiondate": versionDate
      });
    }
    /**
     * Parse attributes from an HTML string safely using isolated document.
     */
    static parseAttributes(html) {
      const doc = this.createIsolatedDocument(html);
      const element = doc.body?.firstElementChild;
      if (!element) return {};
      const attributes = {};
      Array.from(element.attributes).forEach((attr) => {
        attributes[attr.name] = attr.value;
      });
      return attributes;
    }
    /**
     * Extract URLs from HTML content safely using isolated document.
     */
    static extractUrls(html) {
      const doc = this.createIsolatedDocument(html);
      const body = doc.body;
      if (!body) return [];
      const urls = /* @__PURE__ */ new Set();
      body.querySelectorAll("[href]").forEach((element) => {
        const href = element.getAttribute("href");
        if (href && href.startsWith("http")) {
          urls.add(href);
        }
      });
      body.querySelectorAll("[src]").forEach((element) => {
        const src = element.getAttribute("src");
        if (src && src.startsWith("http")) {
          urls.add(src);
        }
      });
      return Array.from(urls);
    }
    /**
     * Sanitize HTML to remove potentially dangerous elements.
     * Uses isolated document for safe parsing - scripts won't execute.
     */
    static sanitize(html, allowedTags = ["p", "a", "span", "div", "pre"]) {
      const doc = this.createIsolatedDocument(html);
      const body = doc.body;
      if (!body) return "";
      body.querySelectorAll("script, style").forEach((el) => el.remove());
      body.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          if (attr.name.startsWith("on")) {
            el.removeAttribute(attr.name);
          }
        });
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
          const children = [];
          for (let i = 0; i < el.childNodes.length; i++) {
            const child = el.childNodes[i];
            if (child) {
              children.push(child);
            }
          }
          if (children.length > 0) {
            el.replaceWith(...children);
          } else {
            el.remove();
          }
        }
      });
      return body.innerHTML;
    }
  };

  // src/modules/archive/ZoteroItemHandler.ts
  var ZoteroItemHandler = class {
    static ARCHIVE_TAG = "archived";
    /**
     * Extract metadata from Zotero item
     */
    static extractMetadata(item) {
      const urlField = item.getField("url");
      const url = typeof urlField === "string" ? urlField : "";
      const doiField = item.getField("DOI");
      const doi = typeof doiField === "string" ? doiField : void 0;
      const titleField = item.getField("title");
      const title = typeof titleField === "string" && titleField ? titleField : url;
      const tags = typeof item.getTags === "function" ? item.getTags().map((t) => t.tag) : [];
      return {
        url: doi ? `https://doi.org/${doi}` : url,
        title,
        doi,
        tags,
        hasArchiveTag: tags.includes(this.ARCHIVE_TAG)
      };
    }
    /**
     * Save archive information to item
     */
    static async saveArchiveToItem(item, archiveUrl, serviceName, metadata) {
      await this.updateExtraField(item, archiveUrl, serviceName);
      if (!this.hasTag(item, this.ARCHIVE_TAG)) {
        item.addTag(this.ARCHIVE_TAG);
      }
      await this.createArchiveNote(item, archiveUrl, serviceName, metadata);
      await item.saveTx();
    }
    /**
     * Update Extra field with archive information
     */
    static async updateExtraField(item, archiveUrl, serviceName) {
      const extra = item.getField("extra") || "";
      const archiveField = `${serviceName}: ${archiveUrl}`;
      if (!extra.includes(archiveField)) {
        const newExtra = extra ? `${extra}
${archiveField}` : archiveField;
        item.setField("extra", newExtra);
      }
    }
    /**
     * Create archive note with robust link
     */
    static async createArchiveNote(item, archiveUrl, serviceName, metadata) {
      const originalUrl = item.getField("url") || "";
      const title = item.getField("title") || originalUrl;
      const archiveDate = (/* @__PURE__ */ new Date()).toISOString();
      const robustLink = HtmlUtils.createRobustLink(
        originalUrl,
        archiveUrl,
        title,
        archiveDate
      );
      const noteContent = this.generateNoteContent(
        robustLink,
        archiveUrl,
        serviceName,
        archiveDate,
        metadata
      );
      const note = new Zotero.Item("note");
      note.setNote(noteContent);
      note.parentID = item.id;
      await note.saveTx();
    }
    /**
     * Generate note content
     */
    static generateNoteContent(robustLink, archiveUrl, serviceName, archiveDate, metadata) {
      const sections = [
        `<h3>Archived Version</h3>`,
        `<p>${robustLink}</p>`,
        `<p><strong>Archive URL:</strong> <a href="${HtmlUtils.escape(archiveUrl)}">${HtmlUtils.escape(archiveUrl)}</a></p>`,
        `<p><strong>Archive Service:</strong> ${HtmlUtils.escape(serviceName)}</p>`,
        `<p><strong>Archive Date:</strong> ${new Date(archiveDate).toLocaleDateString()}</p>`
      ];
      if (metadata) {
        sections.push(`<h4>Additional Information</h4>`);
        for (const [key, value] of Object.entries(metadata)) {
          sections.push(
            `<p><strong>${HtmlUtils.escape(key)}:</strong> ${HtmlUtils.escape(String(value))}</p>`
          );
        }
      }
      sections.push(
        `<h4>Robust Link HTML</h4>`,
        `<p>Copy and paste this HTML to cite with archived version:</p>`,
        `<pre>${HtmlUtils.escape(robustLink)}</pre>`
      );
      return sections.join("\n");
    }
    /**
     * Check if item has a specific tag
     */
    static hasTag(item, tag) {
      const tags = item.getTags ? item.getTags() : [];
      return tags.some((t) => t.tag === tag);
    }
    /**
     * Find existing archive URLs in item
     */
    static findExistingArchives(item) {
      const archives = /* @__PURE__ */ new Map();
      const extraField = item.getField("extra");
      const extra = typeof extraField === "string" ? extraField : "";
      const lines = extra.split("\n");
      for (const line of lines) {
        const match = line.match(/^(.+?):\s*(https?:\/\/.+)$/);
        if (match && match.length > 2 && match[1] && match[2]) {
          archives.set(match[1].toLowerCase(), match[2]);
        }
      }
      const notes = this.getItemNotes(item);
      for (const note of notes) {
        const links = this.extractArchiveLinksFromNote(note);
        links.forEach((url, service) => archives.set(service, url));
      }
      return archives;
    }
    /**
     * Get notes for an item
     */
    static getItemNotes(item) {
      const noteIds = typeof item.getNotes === "function" ? item.getNotes() : [];
      return noteIds.map((id) => Zotero.Items.get(id)).filter((note) => note != null);
    }
    /**
     * Extract archive links from note content
     */
    static extractArchiveLinksFromNote(note) {
      const links = /* @__PURE__ */ new Map();
      if (!note.getNote) return links;
      const content = note.getNote();
      const versionUrlMatch = content.match(/data-versionurl="([^"]+)"/);
      if (versionUrlMatch) {
        const url = versionUrlMatch[1];
        const service = this.detectServiceFromUrl(url);
        if (service) {
          links.set(service, url);
        }
      }
      return links;
    }
    /**
     * Detect service from URL
     */
    static detectServiceFromUrl(url) {
      const patterns = [
        { pattern: /web\.archive\.org/i, service: "internetarchive" },
        { pattern: /archive\.(today|is|ph|md|li)/i, service: "archivetoday" },
        { pattern: /perma\.cc/i, service: "permacc" },
        { pattern: /webarchive\.org\.uk/i, service: "ukwebarchive" },
        { pattern: /arquivo\.pt/i, service: "arquivopt" }
      ];
      for (const { pattern, service } of patterns) {
        if (pattern.test(url)) {
          return service;
        }
      }
      return null;
    }
    /**
     * Check if item needs archiving
     */
    static needsArchiving(item) {
      const metadata = this.extractMetadata(item);
      if (!metadata.url) return false;
      if (metadata.hasArchiveTag) return false;
      const itemType = item.itemType ?? "";
      const skipTypes = ["note", "attachment", "annotation"];
      if (skipTypes.includes(itemType)) return false;
      return true;
    }
  };

  // src/hooks.ts
  async function onStartup() {
    try {
      await Promise.all([
        Zotero.initializationPromise,
        Zotero.unlockPromise,
        Zotero.uiReadyPromise
      ]);
    } catch (error) {
      Zotero.debug(
        `[Moment-o7] Zotero initialization promise failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    initLocale();
    await PreferencesManager.getInstance().init();
    initializeServices();
    registerPrefsObserver();
    registerNotifier();
    await Promise.all(
      Zotero.getMainWindows().map((win) => onMainWindowLoad(win))
    );
    addon.data.initialized = true;
    addon.data.momento7.servicesInitialized = true;
    ztoolkit.log("Moment-o7 initialized successfully");
  }
  function initializeServices() {
    ServiceConfigLoader.loadAllServices();
    ztoolkit.log("Archive services registered");
  }
  async function onMainWindowLoad(win) {
    addon.data.ztoolkit = createZToolkit();
    win.MozXULElement.insertFTLIfNeeded(
      `${addon.data.config.addonRef}-mainWindow.ftl`
    );
    registerMenuItems(win);
    const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: true,
      closeTime: 3e3
    }).createLine({
      text: getString("startup-ready") || "Moment-o7 ready",
      type: "success"
    }).show();
  }
  async function onMainWindowUnload(_win) {
    ztoolkit.unregisterAll();
    addon.data.dialog?.window?.close();
  }
  function onShutdown() {
    if (addon.data.momento7.notifierId) {
      Zotero.Notifier.unregisterObserver(addon.data.momento7.notifierId);
    }
    ztoolkit.unregisterAll();
    addon.data.dialog?.window?.close();
    addon.data.alive = false;
    delete Zotero[addon.data.config.addonInstance];
  }
  function registerNotifier() {
    const callback = {
      notify: async (event, type, ids, _extraData) => {
        if (!addon?.data?.alive) return;
        try {
          await onNotify(event, type, ids, _extraData);
        } catch (error) {
          ztoolkit.log(`Notifier error: ${error}`, "error");
        }
      }
    };
    addon.data.momento7.notifierId = Zotero.Notifier.registerObserver(callback, [
      "item"
    ]);
  }
  function registerPrefsObserver() {
    ztoolkit.log("Preferences observer registered");
  }
  function registerMenuItems(_win) {
    const safeAsyncCommand = (fn) => async () => {
      try {
        await fn();
      } catch (error) {
        ztoolkit.log(`Menu command error: ${error}`, "error");
        showNotification("fail", `Error: ${error}`);
      }
    };
    ztoolkit.Menu.register("item", {
      tag: "menu",
      label: getString("menu-archive") || "Archive",
      id: `${addon.data.config.addonRef}-item-menu`,
      children: [
        {
          tag: "menuitem",
          label: getString("menu-archive-selected") || "Archive Selected Items",
          commandListener: safeAsyncCommand(onArchiveSelected)
        },
        {
          tag: "menuitem",
          label: getString("menu-check-mementos") || "Check for Existing Archives",
          commandListener: safeAsyncCommand(onCheckMementos)
        },
        {
          tag: "menuseparator"
        },
        // Individual service menu items
        {
          tag: "menu",
          label: "Archive to...",
          children: [
            {
              tag: "menuitem",
              label: "Internet Archive",
              commandListener: safeAsyncCommand(
                () => onArchiveToService("internetarchive")
              )
            },
            {
              tag: "menuitem",
              label: "Archive.today",
              commandListener: safeAsyncCommand(
                () => onArchiveToService("archivetoday")
              )
            },
            {
              tag: "menuitem",
              label: "Perma.cc",
              commandListener: safeAsyncCommand(
                () => onArchiveToService("permacc")
              )
            },
            {
              tag: "menuitem",
              label: "UK Web Archive",
              commandListener: safeAsyncCommand(
                () => onArchiveToService("ukwebarchive")
              )
            },
            {
              tag: "menuitem",
              label: "Arquivo.pt",
              commandListener: safeAsyncCommand(
                () => onArchiveToService("arquivopt")
              )
            }
          ]
        },
        {
          tag: "menuseparator"
        },
        {
          tag: "menuitem",
          label: getString("menu-create-robust-links") || "Create Robust Links",
          commandListener: safeAsyncCommand(onCreateRobustLinks)
        }
      ]
    });
    ztoolkit.Menu.register("menuTools", {
      tag: "menu",
      label: getString("menu-momento7") || "Moment-o7",
      id: `${addon.data.config.addonRef}-tools-menu`,
      children: [
        {
          tag: "menuitem",
          label: getString("menu-archive-all") || "Archive All Items with URLs",
          commandListener: safeAsyncCommand(onArchiveAll)
        },
        {
          tag: "menuseparator"
        },
        {
          tag: "menuitem",
          label: getString("menu-preferences") || "Preferences...",
          commandListener: () => {
            try {
              Zotero.Utilities.Internal.openPreferences(
                addon.data.config.addonRef
              );
            } catch (error) {
              ztoolkit.log(`Preferences error: ${error}`, "error");
            }
          }
        }
      ]
    });
  }
  async function onArchiveToService(serviceId) {
    const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
    if (items.length === 0) {
      showNotification("warning", "No items selected");
      return;
    }
    const archivableItems = items.filter(
      (item) => ZoteroItemHandler.needsArchiving(item)
    );
    if (archivableItems.length === 0) {
      showNotification("info", "All selected items are already archived");
      return;
    }
    const serviceNames = {
      internetarchive: "Internet Archive",
      archivetoday: "Archive.today",
      permacc: "Perma.cc",
      ukwebarchive: "UK Web Archive",
      arquivopt: "Arquivo.pt"
    };
    const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: false
    });
    progressWin.createLine({
      text: `Archiving ${archivableItems.length} items to ${serviceNames[serviceId] || serviceId}...`,
      type: "default",
      progress: 0
    });
    progressWin.show();
    try {
      const coordinator = ArchiveCoordinator.getInstance();
      const results = await coordinator.archiveItems(archivableItems, serviceId);
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;
      progressWin.changeLine({
        text: `${serviceNames[serviceId]}: ${successCount} succeeded, ${failCount} failed`,
        type: successCount > 0 ? "success" : "fail",
        progress: 100
      });
      progressWin.startCloseTimer(5e3);
    } catch (error) {
      progressWin.changeLine({
        text: `Archive failed: ${error}`,
        type: "fail",
        progress: 100
      });
      progressWin.startCloseTimer(5e3);
    }
  }
  async function onNotify(event, type, ids, _extraData) {
    if (type !== "item") return;
    if (event === "add") {
      if (PreferencesManager.isAutoArchiveEnabled()) {
        const items = ids.map((id) => Zotero.Items.get(id)).filter((item) => item != null);
        const archivableItems = items.filter(
          (item) => ZoteroItemHandler.needsArchiving(item)
        );
        if (archivableItems.length > 0) {
          ztoolkit.log(`Auto-archiving ${archivableItems.length} new items`);
          const coordinator = ArchiveCoordinator.getInstance();
          for (const item of archivableItems) {
            try {
              await coordinator.autoArchive(item);
            } catch (error) {
              ztoolkit.log(`Auto-archive failed for item ${item.id}: ${error}`);
            }
          }
        }
      }
    }
  }
  async function onPrefsEvent(type, data) {
    switch (type) {
      case "load":
        registerPrefsScripts(data.window);
        break;
      default:
        return;
    }
  }
  async function onArchiveSelected() {
    const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
    if (items.length === 0) {
      showNotification("warning", "No items selected");
      return;
    }
    const archivableItems = items.filter(
      (item) => ZoteroItemHandler.needsArchiving(item)
    );
    if (archivableItems.length === 0) {
      showNotification("info", "All selected items are already archived");
      return;
    }
    ztoolkit.log(`Archiving ${archivableItems.length} selected items`);
    const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: false
    });
    progressWin.createLine({
      text: `Archiving ${archivableItems.length} items...`,
      type: "default",
      progress: 0
    });
    progressWin.show();
    try {
      const coordinator = ArchiveCoordinator.getInstance();
      const results = await coordinator.archiveItems(archivableItems);
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;
      progressWin.changeLine({
        text: `Archived: ${successCount} succeeded, ${failCount} failed`,
        type: successCount > 0 ? "success" : "fail",
        progress: 100
      });
      progressWin.startCloseTimer(5e3);
    } catch (error) {
      progressWin.changeLine({
        text: `Archive failed: ${error}`,
        type: "fail",
        progress: 100
      });
      progressWin.startCloseTimer(5e3);
      ztoolkit.log(`Archive error: ${error}`);
    }
  }
  async function onCheckMementos() {
    const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
    if (items.length === 0) {
      showNotification("warning", "No items selected");
      return;
    }
    const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: false
    });
    progressWin.createLine({
      text: `Checking ${items.length} items for existing archives...`,
      type: "default",
      progress: 0
    });
    progressWin.show();
    let foundCount = 0;
    let checkedCount = 0;
    for (const item of items) {
      const urlField = item.getField("url");
      const url = typeof urlField === "string" ? urlField : "";
      if (!url) {
        checkedCount++;
        continue;
      }
      try {
        const result = await MementoChecker.checkUrl(url);
        if (result.hasMemento) {
          foundCount++;
          ztoolkit.log(`Found ${result.mementos.length} mementos for ${url}`);
        }
      } catch (error) {
        ztoolkit.log(`Memento check failed for ${url}: ${error}`);
      }
      checkedCount++;
      progressWin.changeLine({
        text: `Checked ${checkedCount}/${items.length} items, found ${foundCount} with archives`,
        progress: Math.round(checkedCount / items.length * 100)
      });
    }
    progressWin.changeLine({
      text: `Found ${foundCount} items with existing archives`,
      type: foundCount > 0 ? "success" : "info",
      progress: 100
    });
    progressWin.startCloseTimer(5e3);
  }
  async function onCreateRobustLinks() {
    const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
    if (items.length === 0) {
      showNotification("warning", "No items selected");
      return;
    }
    let createdCount = 0;
    let skippedCount = 0;
    let lastRobustLink = "";
    for (const item of items) {
      const robustLink = RobustLinkCreator.createFromItem(item);
      if (robustLink) {
        lastRobustLink = robustLink;
        createdCount++;
        ztoolkit.log(`Created robust link for item ${item.id}`);
      } else {
        skippedCount++;
      }
    }
    if (createdCount > 0) {
      if (lastRobustLink) {
        new ztoolkit.Clipboard().addText(lastRobustLink, "text/html").copy();
      }
      showNotification(
        "success",
        `Created robust link${createdCount > 1 ? "s" : ""} for ${createdCount} item${createdCount > 1 ? "s" : ""} (copied to clipboard)`
      );
    } else {
      showNotification(
        "warning",
        "No items have archived URLs. Archive items first."
      );
    }
  }
  async function onArchiveAll() {
    ztoolkit.log("Archive all items requested");
    const libraryID = Zotero.Libraries.userLibraryID;
    const allItems = await Zotero.Items.getAll(libraryID);
    const archivableItems = allItems.filter(
      (item) => ZoteroItemHandler.needsArchiving(item)
    );
    if (archivableItems.length === 0) {
      showNotification("info", "All items are already archived");
      return;
    }
    const win = Zotero.getMainWindow();
    if (!win) return;
    const confirmed = win.confirm(
      `This will archive ${archivableItems.length} items. This may take a while. Continue?`
    );
    if (!confirmed) {
      return;
    }
    const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: false
    });
    progressWin.createLine({
      text: `Archiving ${archivableItems.length} items...`,
      type: "default",
      progress: 0
    });
    progressWin.show();
    const coordinator = ArchiveCoordinator.getInstance();
    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;
    for (const item of archivableItems) {
      try {
        const result = await coordinator.autoArchive(item);
        if (result?.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        ztoolkit.log(`Archive failed for item ${item.id}: ${error}`);
      }
      processedCount++;
      progressWin.changeLine({
        text: `Processed ${processedCount}/${archivableItems.length}: ${successCount} succeeded, ${failCount} failed`,
        progress: Math.round(processedCount / archivableItems.length * 100)
      });
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    progressWin.changeLine({
      text: `Complete: ${successCount} archived, ${failCount} failed`,
      type: successCount > 0 ? "success" : "fail",
      progress: 100
    });
    progressWin.startCloseTimer(5e3);
  }
  function showNotification(type, message) {
    const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
      closeOnClick: true,
      closeTime: 3e3
    });
    progressWin.createLine({
      text: message,
      type
    });
    progressWin.show();
  }
  var hooks_default = {
    onStartup,
    onShutdown,
    onMainWindowLoad,
    onMainWindowUnload,
    onNotify,
    onPrefsEvent
  };

  // src/addon.ts
  var Addon = class {
    data;
    // Lifecycle hooks
    hooks;
    // Public APIs for external access
    api;
    constructor() {
      this.data = {
        alive: true,
        config,
        env: "production",
        initialized: false,
        ztoolkit: createZToolkit(),
        momento7: {
          servicesInitialized: false
        }
      };
      this.hooks = hooks_default;
      this.api = {};
    }
  };
  var addon_default = Addon;

  // src/index.ts
  var basicTool2 = new BasicTool();
  if (typeof _globalThis.onunhandledrejection === "undefined") {
    _globalThis.onunhandledrejection = (event) => {
      const error = event.reason || "Unknown error";
      console.error(`[${config.addonName}] Unhandled promise rejection:`, error);
    };
  }
  if (!basicTool2.getGlobal("Zotero")[config.addonInstance]) {
    _globalThis.addon = new addon_default();
    defineGlobal("ztoolkit", () => {
      return _globalThis.addon.data.ztoolkit;
    });
    Zotero[config.addonInstance] = _globalThis.addon;
  }
  function defineGlobal(name, getter) {
    Object.defineProperty(_globalThis, name, {
      get() {
        return getter ? getter() : basicTool2.getGlobal(name);
      }
    });
  }
})();
