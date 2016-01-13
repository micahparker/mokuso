(function () {
    //private functions (wrapped up all nicely into a singleton)

    var _ = new (kendo.Class.extend({
        isArray: function (obj) {
            if (obj && $.isArray(obj)) {
                return true;
            }
            else if (obj && kendo.isFunction(obj.shift) && kendo.isFunction(obj.slice)) {
                return true;
            }

            return false;
        },
        isObservableObject: function (obj) {
            if (obj && $.type(obj.uid) == "string" && kendo.isFunction(obj.get) && kendo.isFunction(obj.set)) {
                return true;
            }

            return false;
        },
        handleModuleHook: function (modules, hook, args) {
            var defs = [];
            for (var x = 0; x < modules.length; x++) {
                if ($.isFunction(modules[x][hook])) {
                    defs.push(modules[x][hook].apply(modules[x][hook], args || []));
                }
            }
            return $.when.apply(null, defs);
        },
        findNestedViews: function (_node, _parentModel, _renderer) {
            var _defs = [];
            _node.find("*[data-role='mokusoview']").addBack("*[data-role='mokusoview']").each(function (i, n) {
                var _n = $(n);
                var _view = _n.attr("data-view");
                var _args = new kendo.data.ObservableObject({});
                //parse out any args
                if ($.trim(_n.attr("data-view-args")).length) {
                    var arrBindFields = [];
                    var __args = {};
                    if (_parentModel) {
                        try {
                            //is there any other way to do this?? not very performant at scale...
                            eval("__args = " + _n.attr("data-view-args").replace(new RegExp(":\\s?([a-zA-Z_]{1,})", "gi"), ": _parentModel.$1"));
                        }
                        catch (ex) {
                            //eval didnt work most likely
                            console.error("Argument Parsing Error", "Could not parse inline page arguments: " + _n.attr("data-view-args"));
                        }
                    }
                    //get string representation of properties from and to for binding from and to ObservableObjects
                    for (var fProp in __args) {
                        var _type = $.type(__args[fProp]);
                        if (_type == "string" || _type == "number" || _type == "object") {
                            _args.set(fProp, __args[fProp]);
                        }
                        else {
                            for (var tProp in _parentModel) {
                                if (__args[fProp] === _parentModel[tProp]) {
                                    arrBindFields.push({ f: fProp, t: tProp });
                                    //set initial value
                                    _args.set(fProp, _parentModel.get(tProp));
                                    break;
                                }
                            }
                        }
                    }
                    if (arrBindFields.length) {
                        //now bind to the parent model to detect and pass on any changes...
                        _parentModel.bind("change", function (e) {
                            for (var x = 0; x < arrBindFields.length; x++) {
                                if (arrBindFields[x].t == e.field) {
                                    //update child arguments
                                    _args.set(arrBindFields[x].t, this.get(e.field));
                                    break;
                                }
                            }
                        });
                    }
                }
                //load page in node, if mobile setup the kendo.mobile.app to work on initialize
                _defs.push(_renderer.render(_n, _view, _args));
            });
            //await nested pages then resolve go deferred
            return $.when.apply($, _defs);
        },
        createRenderer: function (renderer, options, resolver) {
            var type = $.type(renderer);

            if (type == "function") {
                renderer = new renderer(options, resolver);
                if (renderer instanceof _renderer) {
                    return renderer;
                }
            }
            else if ($.type(renderer) == "string") {
                switch (renderer.toLowerCase()) {
                    case 'kendomobile':
                        return new _renderer_KendoMobile(options, resolver);
                    case 'react':
                        return new _renderer_React(options, resolver);
                    case 'knockout':
                        return new _renderer_Knockout(options, resolver);
                }
            }

            return new _renderer_Kendo(options, resolver);
        },
        createResolver: function (resolver, options) {
            var type = $.type(resolver);

            if (type == "function") {
                resolver = new resolver(options);
                if (resolver instanceof _resolver) {
                    return resolver;
                }
            }
            else if ($.type(resolver) == "string") {
                switch (resolver.toLowerCase()) {
                    case 'browserify':
                        return new _renderer_Browserify(options);
                }
            }

            return new _resolver_RequireJS(options);
        }
    }))();



    //rendering classes

    var _renderer = kendo.Class.extend({
        options: {},

        resolver: null,

        init: function (_options, _resolver) {
            this.options = _options;
            this.resolver = _resolver;
        },
        render: function (node, page, args) {
            //do something with me...
        },
        destroy: function (node) {
            //do something with me too!
        }
    });

    var _renderer_Kendo = _renderer.extend({
        render: function (_node, _page, _args) {
            if ($.type(_page) != "string" || $.trim(_page).length <= 0 || $.type(_node) != "object") {
                //improper args... lets get outta here!
                return;
            }
            var self = this;
            var _def = $.Deferred();
            var qIdx = _page.indexOf("?");
            var page = qIdx > 0 ? _page.substring(0, qIdx) : _page;
            var args = (_.isObservableObject(_args)) ? _args : (new kendo.data.ObservableObject($.isPlainObject(_args) ? _args : {}));
            var node = _node;
            //make sure its a jquery node..
            if (!(_node instanceof $)) {
                node = $(_node);
            }
            //get view
            var def = self.resolver.resolve(self.options.paths.view + "/" + page + ".html");
            //get viewmodel
            this.resolver.resolve(this.options.paths.viewmodel + "/" + page + ".js").then(function (modelview) {
                var _modelview = kendo.observable($.extend(true, {
                    //before the view is rendered
                    preinit: function (node, args) { },
                    //after the view is rendered
                    init: function (node, args) { },
                    __________init: function (e) { return this.init(e.view.element, e.sender.params); },
                    //before the view is destroyed
                    deinit: function (node) { },
                }, modelview));
                //wait for view
                def.then(function (view) {
                    return self._wireTogether(node, page, args, view, _modelview, _def);
                }).fail(function () {
                    //fail go deferred
                    _def.rejectWith(null, arguments);
                });
            }).fail(function () {
                //fail go deferred
                _def.rejectWith(null, arguments);
            });

            return _def;
        },
        destroy: function (node) {
            var def = null;
            //destroy existing node first?
            var inlineViews = node.find("*[data-role='mokusoview']");
            if (node.data("mokusoView")) {
                //add target node, it itself is a view...
                inlineViews.push(node);
            }
            if (inlineViews.length) {
                var ___def = $.Deferred();
                def = $.Deferred();
                //sort inlineViews by depth, destroying the deepest first...
                var __def = $.map(inlineViews, function (node) {
                    var n = $(node);
                    return { depth: n.parents().length, node: n };
                }).sort(function (a, b) {
                    return b.depth - a.depth;
                }).reduce(function (prev, curr, idx, arr) {
                    return prev.then(function () {
                        return curr.node.data("mokusoView").model.deinit(curr.node);
                    });
                }, ___def);
                //after they are all destroyed then resolve the main deferred
                __def.then(function () {
                    if (node.data("mokusoView")) {
                        node.data("mokusoView").destroy();
                    }
                    node.empty();
                    //resolve main!
                    def.resolve();
                }).fail(function () {
                    //reject main...
                    def.reject();
                });
                //and go!
                ___def.resolve();
            }

            if (def === null) {
                def = $.Deferred().resolve();
            }

            return def;
        },
        _initView: function (view, args) {
            var self = this;

            return $.when(view.model.init(view.element, args)).then(function () {
                //await nested pages then resolve go deferred
                return _.findNestedViews(view.element.children(), view.model, self);
            });
        },
        _wireTogether: function (node, page, args, view, modelview, _def) {
            var self = this;
            //create a view and render it in the provided node...
            var kendoView = new kendo.View("<div>" + view + "</div>", {
                model: modelview,
                init: function () {
                    //set data and attribute(s)
                    this.element.data("mokusoView", this);
                    //make sure some attribs are set
                    this.element.attr("data-role", "mokusoview");
                    this.element.attr("data-view", page);
                },
                show: function (e) {
                    //call init if there is no transition or its the only view in the node and wait...
                    if (!self.options.transition || !e.sender.element.closest(self.options.node).length || !e.sender.element.siblings("[data-role=mokusoview]").length) {
                        return self._initView(this, args).then(function () {
                            _def.resolve();
                        }).fail(function () {
                            //fail go deferred
                            _def.rejectWith(null, arguments);
                        });
                    }
                },
                transitionStart: function (e) {
                    //save previous values
                    e.sender.element.data("_prevHeight", e.sender.element.css("height")).data("_prevWidth", e.sender.element.css("width"));
                    e.sender.element.height(node.height()).width(node.width());
                },
                transitionEnd: function (e) {
                    //reset size
                    e.sender.element.css("height", e.sender.element.data("_prevHeight")).css("width", e.sender.element.data("_prevWidth"));
                    //destry or init!
                    if (e.type == "hide" && !e.sender.___destroying) {
                        e.sender.___destroying = true;
                        setTimeout(function () {
                            self.destroy(e.sender.element);
                        }, 250);
                    }
                    else if (e.type == "show" && self.options.transition) {
                        var _self = this;
                        setTimeout(function () {
                            self._initView(_self, args).then(function () {
                                _def.resolve();
                            }).fail(function () {
                                //fail go deferred
                                _def.rejectWith(null, arguments);
                            });
                        }, 250);
                    }
                },
                hide: function (e) {
                    if (!e.sender.___destroying) {
                        e.sender.___destroying = true;
                        self.destroy(e.sender.element);
                    }
                },
                wrap: false
            });
            //call preinit
            return $.when(modelview.preinit(node, args)).then(function () {
                //strip attributes from here so they dont dup with View's element attrs
                node.removeAttr("data-role");
                node.removeAttr("data-view");
                node.removeAttr("data-view-args");
                //nest inside parent Layout?
                var parentLayout = node.parents("*[data-role^='mokuso']:first").data("mokusoLayout");
                if (parentLayout instanceof kendo.Layout) {
                    parentLayout.showIn("#mokusoLayoutNode", kendoView, self.options.transition);
                }
                else {
                    kendoView.render(node);
                }
            });
        }
    });

    var _renderer_KendoMobile = _renderer_Kendo.extend({
        _wireTogether: function (node, page, args, view, modelview, _def) {
            var self = this;
            //check to see if its a mobile view (parent is app content node)
            if (node.parent().is("[data-mokuso-content-node]")) {
                //no view creation, just setup for kendo.mobile.Application
                var _node = $(view);
                var uid = "a" + kendo.guid().replace(new RegExp("-", "g"), "");
                //set global model
                Class.GlobalMobileModels[uid] = modelview;
                _node.each(function (n) {
                    var __node = $(this);
                    var __role = $.trim(__node.attr("data-role") || "").toLowerCase();
                    if (__role.length) {
                        //add model binding
                        __node.attr("data-model", "mokuso.GlobalMobileModels." + uid);
                        //add init event bindings...
                        if (__role == "view") {
                            var bindAttr = (__node.attr("data-bind") || "").replace(new RegExp("events([ ]{0,}):([ ]{0,}){", "i"), "events:{");
                            var bindAttrIdx = bindAttr.indexOf("events:{");
                            if (bindAttrIdx > -1) {
                                __node.attr("data-bind", bindAttr.substring(0, bindAttrIdx + 8) + " init: __________init, " + bindAttr.substring(bindAttrIdx + 8, bindAttr.length));
                            }
                            else {
                                __node.attr("data-bind", $.merge((bindAttr.length ? bindAttr.split(",") : []), ["events: { init: __________init }"]).join(","));
                            }
                        }
                    }
                });
                //call preinit and process nested views
                return $.when(modelview.preinit(node, args)).then(function () {
                    //render setup
                    var _element = _node.insertAfter(node);
                    //await nested pages then resolve go deferred (dont nest them as mobile...)
                    return _.findNestedViews(_element, modelview, self).then(function () {
                        //resolve this views deferred
                        _def.resolve();
                    }).fail(function () {
                        //fail go deferred
                        _def.rejectWith(null, arguments);
                    });
                });
            }
            else {
                return _renderer_Kendo.fn._wireTogether.apply(self, arguments);
            }
        }
    });

    var _renderer_React = _renderer.extend({
        render: function (node, page, args) {
            var _def = $.Deferred();

            this.resolver.resolve(this.options.paths.view + "/" + page + ".js").then(function (component) {
                //clean up any old componenets in this node
                React.unmountComponentAtNode(node[0]);
                //render new component in node!
                React.render(component, node[0], function () {
                    _def.resolve();
                });
            }).fail(function () {
                _def.rejectWith(null, arguments);
            });

            return _def;
        }
    });

    var _renderer_Knockout = _renderer.extend({
        render: function (node, page, args) {
            var _def = $.Deferred();

            $.when(
                this.resolver.resolve(this.options.paths.view + "/" + page + ".html"),
                this.resolver.resolve(this.options.paths.viewmodel + "/" + page + ".js")
            ).then(function (view, modelview) {
                //convert modelview to observables
                for (var key in modelview) {
                    if (_.isArray(modelview[key])) {
                        modelview[key] = ko.observableArray(modelview[key]);
                    }
                    else if (!$.isFunction(modelview[key])) {
                        modelview[key] = ko.observable(modelview[key]);
                    }
                }
                //clean out old views
                ko.cleanNode(node[0]);
                //insert html in do node
                node.html(view);
                //bind observables to node!
                ko.applyBindings(modelview, node[0]);
            }).fail(function () {
                _def.rejectWith(null, arguments);
            });

            return _def;
        }
    });

    //dependancy resolver

    var _resolver = kendo.Class.extend({
        options: null,

        init: function (_options) {
            this.options = _options;
        },

        resolve: function (page) {
            //override me
            throw ("resolver didnt provide a resolve method.");
        }
    });

    var _resolver_JQuery = _resolver.extend({
        resolve: function (page) {
            var def = null;

            if (page.match("js$")) {
                //wont work...
                def = $.ajax({
                    url: page,
                    dataType: "script"
                }).promise();
            }
            else {
                def = $.ajax({
                    url: page
                }).promise();
            }

            return def;
        }
    });

    var _resolver_RequireJS = _resolver.extend({
        cache: {},
        resolve: function (page) {
            var def = null;
            if (page.match("js$")) {
                def = $.Deferred();
                require([page.replace(new RegExp(".js$"), "")], function (dep) {
                    def.resolveWith(null, [dep]);
                }, function () {
                    def.rejectWith(null, arguments);
                });
            }
            else if (!this.cache[page]) {
                var self = this;
                def = $.ajax({
                    url: require.toUrl(page),
                    success: function (html) {
                        self.cache[page] = html;
                    }
                }).promise();
            }
            else {
                def = $.Deferred().resolveWith(null, [this.cache[page]]);
            }

            return def;
        }
    });

    var _resolver_Browserify = _resolver.extend({
        resolve: function (page) {
            var def = null;

            if (page.match(".js$")) {
                def = $.Deferred().resolveWith(null, [require(page.replace(new RegExp(".js$"), ""))]);
            }
            else {
                def = $.ajax({
                    url: page
                }).promise();
            }

            return def;
        }
    });

    //public functions

    var Class = kendo.Class.extend({
        options: {},
        events: ["init", "before-navigate", "after-navigate", "before-load", "after-load"],
        router: null,
        mobileApp: null,
        modules: [],

        _events: $({}),
        _renderer: null,
        _resolver: null,

        /**
         * Initializes the framework
         * @constructor
         * @param {HTMLElement} contentNode - The node containing the content portion of your app.
         * @param {json} options
             * @param {String} options.initial
             * @param {Function} options.init
             * @param {String} options.transition
             * @param {String} options.root
             * @param {boolean} options.pushState
             * @param {boolean} options.hashBang
             * @param {Array} options.modules
             * @param {Array} options.paths
         * @param {mokuso.Renderer} options.renderer
         * @param {mokuso.Resolver} options.resolver
         * @param {boolean} isMobile - this will initialize a kendo.mobile.Application if set to true
         */
        init: function (contentNode, options, isMobile) {
            //constructor - where the magic happens...
            var self = this;
            //save off options
            this.options = $.extend({
                node: $("body"),
                initial: null,
                init: null,
                transition: "swap",
                root: "/",
                pushState: false,
                hashBang: false,
                modules: [],
                paths: {
                    view: "view",
                    viewmodel: "viewmodel"
                },
                renderer: "kendo",
                resolver: "requirejs"
            }, options);
            //setup node
            if (contentNode) {
                if (!(contentNode instanceof $)) {
                    contentNode = $(contentNode);
                }
                this.options.node = contentNode;
            }
            //set modules
            for (var x = 0; x < this.options.modules.length; x++) {
                this.registerModule(this.options.modules[x]);
            }
            //setup resolver and renderer
            self._resolver = _.createResolver(self.options.resolver, self.options);
            self._renderer = _.createRenderer(self.options.renderer, self.options, self._resolver);
            //run beforeInit module hooks before we kick anything off...
            _.handleModuleHook(this.modules, "beforeInit", [this]).then(function () {
                //set attribute to content node
                self.options.node.attr("data-mokuso-content-node", true);
                //create router
                if (isMobile && kendo.mobile && kendo.mobile.Application) {
                    var def = $.Deferred();
                    var _mobile_renderer = _.createRenderer("kendomobile", self.options, self._resolver);
                    //set transition
                    if (!self.options.transition || self.options.transition.toLowerCase() === "swap") {
                        self.options.transition = "slide";
                    }
                    //the initial view needs to get loaded before the mobileApp is created, it should contain all the mobile views
                    if ($.type(self.options.initial) == "string" && $.trim(self.options.initial).length > 0) {
                        self.load(self.options.node, options.initial, {}, _mobile_renderer).then(function () {
                            //need to move all nodes from view out into the body for mobile stuff to work proper
                            self.options.node.prepend(self.options.node.find(">*[data-role='mokusoview']").data("mokusoView").element.children());
                            //create kendo.mobile.Application off the newly minted inital view
                            self.mobileApp = new kendo.mobile.Application(self.options.node, $.extend($.extend({}, self.options), {
                                //override these options for the Application without overwriting self.options
                                initial: null,
                                init: function () { setTimeout(function () { def.resolve(); }, 10); }
                            }));
                        });
                    }
                    else {
                        //load any views
                        _.findNestedViews(self.options.node, null, _mobile_renderer).then(function () {
                            //assume the content for the mobile app is already in the desired node
                            self.mobileApp = new kendo.mobile.Application(self.options.node, $.extend($.extend({}, self.options), {
                                //override these options for the Application without overwriting self.options
                                init: function () { setTimeout(function () { def.resolve(); }, 10); }
                            }));
                        });
                    }
                    return $.when(def).then(function () {
                        //use the router from the mobile app, no need for 2!
                        self.router = self.mobileApp.router;
                        //overload kendo.ui.progress
                        kendo.ui.progress = function (node, onOff) {
                            var pane = kendo.widgetInstance(node.closest(".km-pane").addBack(".km-pane"));
                            if (pane && pane.loader) {
                                onOff ? pane.loader.show() : pane.loader.hide();
                                if (!onOff) {
                                    pane.element.find(".k-loading-mask").remove();
                                }
                            }
                            else {
                                onOff ? self.mobileApp.showLoading() : self.mobileApp.hideLoading();
                                if (!onOff) {
                                    self.options.node.find(".k-loading-mask").remove();
                                }
                            }
                        }
                        //bind to router to we can trigger events here (best we can do for a kendoMobileApp router?)
                        self.router.bind("change", function (e) {
                            //trigger before route
                            self.trigger("before-navigate", [e.url, self.options.node]);
                            _.handleModuleHook(self.modules, "beforeNavigate", [self.options.node, e.url]);
                            //trigger after route right after cause mobile stuff happens right away, no loading...
                            setTimeout(function () {
                                self.trigger("after-navigate", [e.url, self.options.node]);
                                _.handleModuleHook(self.modules, "afterNavigate", [self.options.node, e.url]);
                            }, 10);
                        });
                    });
                }
                else {
                    //setup router!
                    self.router = new kendo.Router({ pushState: self.options.pushState, hashBang: self.options.hasBang, root: self.options.root });
                    //configure the router...
                    self.router.route("*page", function (page, args) {
                        _.handleModuleHook(self.modules, "beforeNavigate", [self.options.node, page, args]).then(function () {
                            //trigger after route
                            self.trigger("before-navigate", [page, self.options.node]);
                            //insert the view into contentNode
                            $.when(self._renderer.render(self.options.node, page, args)).fail(function (_e) {
                                self.router.trigger("routeMissing", _e);
                            }).then(function () {
                                //trigger after route
                                self.trigger("after-navigate", [page, self.options.node]);
                            });
                        }).then(function () {
                            return _.handleModuleHook(self.modules, "afterNavigate", [self.options.node, page, args]);
                        });
                    });
                    //set content node to layout
                    var layout = new kendo.Layout("<div id='mokusoLayoutNode'></div>", { wrap: false });
                    //render layout & reset options.node
                    layout.render(contentNode);
                    self.options.node = contentNode.find("#mokusoLayoutNode");
                    //fake view so the renderer picks it up
                    contentNode.attr("data-role", "mokusolayout");
                    contentNode.data("mokusoLayout", layout);
                    //run default route?
                    var hIdx = location.href.indexOf("#");
                    if ($.trim(self.options.initial).length && (hIdx < 0 || hIdx == (location.href.length - 1))) {
                        if (hIdx < 0) {
                            location.href = location.href + "#" + self.options.initial;
                        }
                        else {
                            location.href = location.href.substring(0, hIdx) + "#" + self.options.initial;
                        }
                    }
                }
            }).then(function () {
                //and start the routing...
                return _.handleModuleHook(self.modules, "afterInit", [self]).then(function () {
                    if (!self.mobileApp) {
                        self.router.start();
                    }
                    //call init callbacks
                    if ($.isFunction(self.options.init)) {
                        self.options.init(self);
                    }
                });
            });
        },
        /**
         * Registers a module with mokuso
         * @param {mokuso.Module} module
         */
        registerModule: function (_module) {
            if (_module instanceof Class.Module && $.grep(this.modules, function (__module) { return _module === __module; }).length === 0) {
                this.modules.push(_module);
            }
            else {
                console.error("Module is not an extension of mokuso.Module");
            }
        },
        /**
         * Deregisters a module with mokuso
         * @param {mokuso.Module} module
         */
        deregisterModule: function (_module) {
            if (_module instanceof Class.Module && $.grep(this.modules, function (__module) { return _module === __module; }).length >= 1) {
                this.modules = $.grep(function (__module) { return _module !== __module; });
            }
            else {
                console.error("Module is not an extension of mokuso.Module");
            }
        },
        /**
         * replaces the content in the initialized contentNode with the page provided
         * @param {String} page - view/viewmodel path minus the extension
         * @param {boolean} silent - if set to true only the router will be updated, no content replaced
         */
        navigate: function (page, silent) {
            if (!this.router) {
                console.error("App not initialized: call initialize(DomNode contentNode, JSON options)");
                return;
            }
            if ($.type(page) == "string" && $.trim(page).length > 0) {
                //send args to router	
                if (this.mobileApp) {
                    return this.mobileApp.navigate.apply(this.mobileApp, arguments);
                }
                return this.router.navigate.apply(this.router, arguments);
            }
            else {
                console.error("Arguments Exception", "Page is empty; Usage: navigate(String page)");
            }
        },
        /**
         * silently replaces curent page with the passed in page in browser history
         * @param {String} page - view/viewmodel path minus the extension
         */
        replace: function (page) {
            if (!this.router) {
                console.error("App not initialized: call initialize(DomNode contentNode, JSON options)");
                return;
            }
            if ($.type(page) == "string" && $.trim(page).length > 0) {
                if (this.mobileApp) {
                    return this.mobileApp.replace.apply(this.mobileApp, arguments);
                }
                return this.router.replace.apply(this.router, arguments);
            }
            else {
                console.error("Arguments Exception", "Page is empty; Usage: replace(String page)");
            }
        },
        /**
         * replaces the content in the initialized contentNode with the page provided
         * @param {HTMLElement} node - the desired node to have the page stuffed into
         * @param {String} page - view/viewmodel path minus the extension
         * @param {json} args - the args to pass into the constructor of the viewmodel (init)
         */
        load: function (node, page, args, renderer) {
            var self = this;
            //get renderer
            var __renderer = this._renderer;
            if ((renderer instanceof _renderer) || (renderer instanceof _renderer_Kendo)) {
                __renderer = renderer;
            }
            //stuff the view into the node
            if ($.type(page) == "string" && $.trim(page).length > 0 && $.type(node) == "object") {
                return _.handleModuleHook(this.modules, "beforeLoad", [node, page, args]).then(function () {
                    self.trigger("before-load", [node, page, args]);
                    return $.when(__renderer.render.apply(__renderer, [node, page, args])).fail(function () {
                        console.error("mokuso error loading", arguments);
                    });
                }).then(function () {
                    return _.handleModuleHook(self.modules, "afterLoad", [node, page, args]).then(function () {
                        self.trigger("after-load", [node, page, args]);
                    });
                });
            }
            else {
                console.error("Arguments Exception", "Page is empty or node is not a DOM element; Usage: load(String page, DomNode node)");
            }
        },
        /**
         * shows a loading animation in the initialized contentNode
         */
        showLoading: function () {
            if (this.mobileApp) {
                this.mobileApp.showLoading();
            }
            else {
                kendo.ui.progress(this.options.node, true);
            }
        },
        /**
         * hides the loading animation in the initialized contentNode
         */
        hideLoading: function () {
            kendo.ui.progress(this.options.node, false);
            if (this.mobileApp) {
                this.mobileApp.hideLoading();
            }
        },
        /**
         * binds a method to an event in the mokuso framework
         * @param {String} event - the desired event to bind to
         * @param {Function} method - the method to be called when the event is triggered
         */
        bind: function (event, method) {
            if ($.type(event) == "string" && $.trim(event).length > 0 && $.isFunction(method)) {
                if (this.mobileApp) {
                    this.mobileApp.bind.apply(this.mobileApp, arguments);
                }
                else {
                    this._events.bind.apply(this._events, arguments);
                }
            }
            else {
                console.error("Arguments Exception", "Event is empty or method is not a function; Usage: bind(String event, Function method, ...)");
            }
        },
        /**
         * triggers an event in the mokuso framework
         * @param {String} event - the desired event to trigger
         */
        trigger: function (event) {
            if ($.type(event) == "string" && $.trim(event).length > 0) {
                if (this.mobileApp) {
                    this.mobileApp.trigger.apply(this.mobileApp, arguments);
                }
                else {
                    this._events.trigger.apply(this._events, arguments);
                }
            }
            else {
                console.error("Arguments Exception", "Event is empty ; Usage: bind(String event, ...)");
            }
        }
    });

    //shim kendo

    kendo.isArray = _.isArray;
    kendo.isObservableObject = _.isObservableObject;
    if (kendo.mobile) {
        kendo.mobile.isArray = _.isArray;
        kendo.mobile.isObservableObject = _.isObservableObject;
    }

    //add some static vars

    Class.Renderer = _renderer;
    Class.Resolver = _resolver;
    Class.Module = kendo.Class.extend({
        beforeInit: function (app) { },
        afterInit: function (app) { },
        beforeNavigate: function (node, page, args) { },
        afterNavigate: function (node, page, args) { },
        beforeLoad: function (node, page, args) { },
        afterLoad: function (node, page, args) { }
    });
    Class.GlobalMobileModels = {};

    //set global var
    window.mokuso = Class;

    //handle module loaders
    if (typeof define == 'function' && define.amd) {
        define(function () {
            return Class;
        });
    }
    else if (typeof module != 'undefined' && module.exports) {
        module.exports = Class;
    }
})();