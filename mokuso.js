(function () {
    var name = "mokuso";
<<<<<<< HEAD
        
    //private functions
    var isArray = function (obj) {
        if (obj && $.isArray(obj)) {
            return true;
        }
        else if (obj && kendo.isFunction(obj.shift) && kendo.isFunction(obj.slice)) {
            return true;
        }

        return false;
    };
    var isObservableObject = function (obj) {
        if (obj && $.type(obj.uid) == "string" && kendo.isFunction(obj.get) && kendo.isFunction(obj.set)) {
            return true;
        }

        return false;
    };
    var parseQueryString = function (queryString) {
        if (queryString == "") {
            return {};
        }
        else {
            a = queryString.split('&');
        }
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    };
    var mergeOptions = function (options) {
        return $.extend({
            node: $("body"),
            initial: null,
            init: null,
            transition: null,
            root: "/",
            pushState: false,
            hashBang: false,
            kendoMobileApplication: null,
        }, options);
    };
=======
    var events = {};
    var viewDataKey = name+"View";
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
    var render = function (kendoView, node, args) {
        //call model's preinit
        kendoView.model.preinit(node, args);
        //nest inside parent Layout?
<<<<<<< HEAD
        var parentLayout = node.parents("*[data-role='" + name + "view']:first").data(name + "View");
        if (parentLayout && parentLayout instanceof kendo.Layout) {
            parentLayout.showIn(kendoView, node);
=======
        var parentLayout = node.closest("*[data-" + viewDataKey + "]");
        if (parentLayout.length) {
            parentLayout.data(viewDataKey).showIn(kendoView, node);
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
        }
        else {
            kendoView.render(node);
        }
    };
    var getView = function (page) {
        return $.ajax({
<<<<<<< HEAD
            url: require.toUrl("view/" + page + ".html")
=======
            url: require.toUrl("view/"+page+".html")
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
        }).promise();
    };
    var go = function (_node, _page, _args) {
        if ($.type(_page) != "string" || $.trim(_page).length <= 0 || $.type(_node) != "object") {
            //improper args... lets get outta here!
            return;
        }
        var _def = $.Deferred();
        var qIdx = _page.indexOf("?");
        var page = qIdx > 0 ? _page.substring(0, qIdx) : _page;
<<<<<<< HEAD
        var args = (isObservableObject(_args)) ? _args : (new kendo.data.ObservableObject($.isPlainObject(_args) ? _args : {}));
=======
        var args = (kendo.isObservableObject(_args)) ? _args : (new kendo.data.ObservableObject($.isPlainObject(_args) ? _args : {}));
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
        var node = _node;
        //make sure its a jquery node..
        if (!(_node instanceof $)) {
            node = $(_node);
        }
        //destroy existing node first?
<<<<<<< HEAD
        var inlineViews = node.find("*[data-role='" + name + "view']");
        if (node.data(name + "View")) {
=======
        var inlineViews = node.find("[data-attr-"+viewDataKey+"]");
        if (node.data(viewDataKey)) {
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
            //add target node, it itself is a view...
            inlineViews.push(node);
        }
        var def = null;
        if (inlineViews.length) {
            var ___def = $.Deferred();
            def = $.Deferred();
            //sort inlineViews by depth, destroying the deepest first...
            var __def = $.map(inlineViews, function (node) {
                var n = $(node);
<<<<<<< HEAD
                return { depth: n.parents().length, node: n };
            }).sort(function (a, b) {
                return b.depth - a.depth;
            }).reduce(function (prev, curr, idx, arr) {
                return prev.then(function () {
                    return curr.node.data(name + "View").model.deinit(curr.node);
=======
                return { depth: n.parents().length, node: n};
            }).sort(function (a, b) {
                return b.depth - a.depth;
            }).reduce(function(prev, curr, idx, arr) {
                return prev.then(function () {
                    return curr.node.data(viewDataKey).model.deinit(curr.node);
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                });
            }, ___def);
            //after they are all destroyed then resolve the main deferred
            __def.always(function () {
<<<<<<< HEAD
                node.data(name + "View").destroy();
                node.empty();
            }).always(function () {
                //trigger before route
                events.trigger("before-route", [page, node]);
=======
                node.data(viewDataKey).destroy();
                node.empty();
            }).always(function () {
                //trigger before route
                $(events).trigger("before-route", [page, node]);
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                //get view
                return getView(page).always(function (view) {
                    def.resolveWith(null, [view]);
                });
            });
            //and go!
            ___def.resolve();
        }
        else {
            //trigger before route
<<<<<<< HEAD
            events.trigger("before-route", [page, node]);
=======
            $(events).trigger("before-route", [page, node]);
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
            //get view
            def = getView(page);
        }
        //get viewmodel
        require(["viewmodel/" + page], function (modelview) {
            //wait for view
            def.then(function (view) {
<<<<<<< HEAD
                var kendoView = new kendo.View("<div>" + view + "</div>", {
=======
                var kendoView = new kendo.Layout("<div>" + view + "</div>", {
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                    model: kendo.observable($.extend(true, {
                        //before the view is rendered
                        preinit: function (node, args) { },
                        //after the view is rendered
                        init: function (node, args) { },
<<<<<<< HEAD
                        //after the view is re-rendered into the same node (only for mobile)
                        reinit: function (node, args) { },
=======
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                        //before the view is destroyed
                        deinit: function (node) { },
                    }, modelview)),
                    init: function () {
                        var self = this;
<<<<<<< HEAD
                        var node = this.element.parent();
                        //make sure some attribs are set
                        node.attr("data-role", name + "view");
                        node.attr("data-view", page);
=======
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                        //call init and wait...
                        $.when(this.model.init(this.element, args)).always(function () {
                            var _model = self.model;
                            var _element = self.element;
                            var _defs = [];
                            //now, process sub pages
<<<<<<< HEAD
                            _element.find("*[data-role='" + name + "view']").each(function (i, n) {
                                var _n = $(n);
                                var _args = new kendo.data.ObservableObject({});
                                //parse out any args
                                if ($.trim(_n.attr("data-view-args")).length) {
=======
                            _element.find("*[data-page]").each(function (i, n) {
                                var _n = $(n);
                                var _args = new kendo.data.ObservableObject({});
                                //parse out any args
                                if ($.trim(_n.attr("data-page-args")).length) {
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                                    with (_model) {
                                        var arrBindFields = [];
                                        var __args = {};
                                        try {
                                            //is there any other way to do this?? not very performant at scale...
<<<<<<< HEAD
                                            eval("__args = " + _n.attr("data-view-args"));
                                        }
                                        catch (ex) {
                                            //eval didnt work most likely
                                            console.error("Argument Parsing Error", "Could not parse inline page arguments: " + _n.attr("data-view-args"));
                                        }
                                        //get string representation of properties from and to for binding from and to ObservableObjects
                                        for (var fProp in __args) {
                                            var _type = $.type(__args[fProp]);
                                            if (_type == "string" || _type == "number" || _type == "object") {
                                                _args.set(fProp, __args[fProp]);
                                            }
                                            else {
                                                for (var tProp in _model) {
                                                    if (__args[fProp] === _model[tProp]) {
                                                        arrBindFields.push({ f: fProp, t: tProp });
                                                        //set initial value
                                                        _args.set(fProp, _model.get(tProp));
                                                        break;
                                                    }
=======
                                            eval("__args = " + _n.attr("data-page-args"));
                                        }
                                        catch (ex) {
                                            //eval didnt work most likely
                                            console.error("Argument Parsing Error", "Could not parse inline page arguments: " + _n.attr("data-page-args"));
                                        }
                                        //get string representation of properties from and to for binding from and to ObservableObjects
                                        for (var fProp in __args) {
                                            for (var tProp in _model) {
                                                if (__args[fProp] === _model[tProp]) {
                                                    arrBindFields.push({ f: fProp, t: tProp });
                                                    //set initial value
                                                    _args.set(fProp, _model.get(tProp));
                                                    break;
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                                                }
                                            }
                                        }
                                        if (arrBindFields.length) {
                                            //now bind to the parent model to detect and pass on any changes...
                                            _model.bind("change", function (e) {
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
                                }
                                //load page in node...
<<<<<<< HEAD
                                _defs.push(go(_n, _n.attr("data-view"), _args));
=======
                                _defs.push(go(_n, _n.attr("data-page"), _args));
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                            });
                            //await nested pages then resolve go deferred
                            $.when.apply($, _defs).then(function () {
                                _def.resolve();
                            }).fail(function () {
                                //fail go deferred
                                _def.rejectWith(null, arguments);
                            });
                        });
                    },
                    wrap: false,
                });
<<<<<<< HEAD
                //set data and attribute(s)
                node.data(name + "View", kendoView);
                //render!
                render(kendoView, node, args);
=======
                //render!
                render(kendoView, node, args);
                //set data and attribute
                node.attr("data-attr-"+viewDataKey, true);
                node.data(viewDataKey, kendoView);
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
            }).fail(function () {
                //fail go deferred
                _def.rejectWith(null, arguments);
            });
        }, function () {
            //fail go deferred
            _def.rejectWith(null, arguments);
        });

        //hide loading
        _def.fail(function () {
            console.error("Page load failed: ", arguments);
        }).always(function () {
            //trigger after route
<<<<<<< HEAD
            events.trigger("after-route", [page, node]);
=======
            $(events).trigger("after-route", [page, node]);
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
        });

        return _def;
    };
<<<<<<< HEAD
    //private vars
    var events = $({});
    //shim kendo
    kendo.isArray = isArray;
    kendo.isObservableObject = isObservableObject;
    if (kendo.mobile) {
        kendo.mobile.isArray = isArray;
        kendo.mobile.isObservableObject = isObservableObject;
    }
    //and return the module...
    var Class = kendo.Class.extend({
        options: {},
        events: ["init", "before-route", "after-route"],
        router: null,
=======
    //create a kendo router!
    var router = null
    //shim kendo
    kendo.isArray = function (obj) {
        if (obj && $.isArray(obj)) {
            return true;
        }
        else if (obj && kendo.isFunction(obj.shift) && kendo.isFunction(obj.slice)) {
            return true;
        }

        return false;
    };
    kendo.isObservableObject = function (obj) {
        if (obj && $.type(obj.uid) == "string" && kendo.isFunction(obj.get) && kendo.isFunction(obj.set)) {
            return true;
        }

        return false;
    };
    //and return the module...
    var Class = kendo.Class.extend({
        events: ["before-route", "after-route"],
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60

        init: function () {
            //constructor
        },
<<<<<<< HEAD
        initialize: function (contentNode, options) {
            var self = this;

            //this will, for sure, get skipped if coming from initMobile...
            this.options = mergeOptions(options);
            if (contentNode) {
                this.options.node = contentNode;
            }
            
            if (kendo.mobile && kendo.mobile.Application && this.options.kendoMobileApplication && this.options.kendoMobileApplication instanceof kendo.mobile.Application) {
                //use the router from the mobil app, no need for 2!
                this.router = this.options.kendoMobileApplication.router;
            }
            else {
                //make sure mobile app reference is empty so it doesnt get used
                this.options.kendoMobileApplication = null;
                //setup router!
                this.router = new kendo.Router({ pushState: this.options.pushState, hashBang: this.options.hasBang, root: this.options.root });
                //setup the router...
                this.router.route("*page", function (page, args) {
                    go(self.options.node, page, args);
                });
                //run default route?
                var hIdx = location.href.indexOf("#");
                if ($.trim(this.options.initial).length && (hIdx < 0 || hIdx == (location.href.length - 1))) {
                    if (hIdx < 0) {
                        location.href = location.href + "#" + this.options.initial;
                    }
                    else {
                        location.href = location.href.substring(0, hIdx) + "#" + this.options.initial;
                    }
                }
                //and start the routing...
                this.router.start();
                //call init callbacks
                if ($.isFunction(this.options.init)) {
                    this.options.init();
                }
                this.trigger("init");
            }
        },
        initializeMobile: function (contentNode, options) {
            var self = this;

            this.options = mergeOptions(options);
            if (contentNode) {
                this.options.node = contentNode;
            }

            var loadMobile = function (node) {
                //init framework with mobile app defined...
                return self.initialize(contentNode, $.extend(
                    $.extend({}, options, {
                        initial: null,
                        kendoMobileApplication: new kendo.mobile.Application(node, $.extend(
                            $.extend({}, options),
                            {
                                init: function () {
                                    //call reinit on view when router changes
                                    this.router.bind("change", function (e) {
                                        var qIdx = e.url.indexOf("?");
                                        var viewNode = $("*[data-role='view'][id='" + (qIdx > 0 ? e.url.substring(0, qIdx) : e.url) + "']")
                                        var view = viewNode.data(name + "View");
                                        if (view) {
                                            view.model.reinit(viewNode, e.params);
                                        }
                                    });
                                    //call reinit on first route, or the currently visible view
                                    var url = $.trim(location.hash.replace("#", ""));
                                    if (url.length) {
                                        var qIdx = url.indexOf("?");
                                        this.router.trigger("change", { url: url, params: (qIdx > 0 ? parseQueryString(url.substring(qIdx + 1)) : {}) });
                                    }
                                    else {
                                        var viewNode = $("*[data-role='view']:visible");
                                        if (viewNode.length) {
                                            this.router.trigger("change", { url: viewNode.attr("id"), params: {} });
                                        }
                                    }
                                    //now call back original init function
                                    if ($.isFunction(options.init)) {
                                        options.init();
                                    }
                                },
                                //initial is reserved for the framework...
                                initial: options._initial || null
                            }
                        ))
                    })
                ));
            }
            //handle the initial view outside the router
            if (kendo.mobile && kendo.mobile.Application) {
                if ($.type(options.initial) == "string" && $.trim(options.initial).length > 0) {
                    return this.load(contentNode, options.initial).then(function () {
                        var initialNode = $("*[data-role='" + name + "view']:first").data(name + "View").element;
                        //need to move all inline declared views out into the main element for mobile stuff to work proper
                        initialNode.find("*[data-role='" + name + "view']").each(function () {
                            var view = $(this).data(name+"View");
                            //move all mobile data-roles into main node so kendo.mobile.Application can pick them up...
                            $(this).data(name + "View").element.children("[data-role]").each(function () {
                                //set the view variable
                                $(this).data(name+"View", view);
                                //append to main node for kendo.mobile.Application
                                initialNode.append(this);
                            });
                        });
                    }).then(function () {
                        return loadMobile($("*[data-role='" + name + "view']:first").data(name + "View").element);
                    });
                }
                else {
                    return loadMobile(contentNode);
                }
            }
            else {
                console.error("App not initialized: kendo mobile libs required (kendo.mobile.Application)");
            }
        },
        navigate: function (page, silent) {
            if (!this.router) {
                console.error("App not initialized: call initialize(DomNode contentNode, JSON options)");
                return;
            }
            if ($.type(page) == "string" && $.trim(page).length > 0) {
                if (this.options.kendoMobileApplication) {
                    return this.options.kendoMobileApplication.navigate.apply(this.options.kendoMobileApplication, arguments);
                }
                return this.router.navigate.apply(this.router, arguments);
            }
            else {
                console.error("Arguments Exception", "Page is empty; Usage: navigate(String page)");
            }
        },
        replace: function (page) {
            if (!this.router) {
                console.error("App not initialized: call initialize(DomNode contentNode, JSON options)");
                return;
            }
            if ($.type(page) == "string" && $.trim(page).length > 0) {
                if (this.options.kendoMobileApplication) {
                    return this.options.kendoMobileApplication.replace.apply(this.options.kendoMobileApplication, arguments);
                }
                return this.router.replace.apply(this.router, arguments);
            }
            else {
                console.error("Arguments Exception", "Page is empty; Usage: replace(String page)");
=======
        initialize: function (contentNode, startPage) {
            if ($.type(contentNode) == "object") {
                router = new kendo.Router({ pushState: false, root: startPage });
                //setup the router...
                router.route("/*page", function (page, args) {
                    go(contentNode, page, args);
                });
                //and start the routing...
                router.start();
                //run default route?
                var hIdx = location.href.indexOf("#");
                if ($.trim(startPage).length && (hIdx < 0 || hIdx == (location.href.length-1))) {
                    this.route(startPage);
                }
            }
            else {
                console.error("Could not initialize app, invalid content node!");
            }
        },
        route: function (page, silent) {
            if (!router) {
                console.error("App not initialized: call initialize(DomNode contentNode, String startPage)");
                return
            }
            if ($.type(page) == "string" && $.trim(page).length > 0) {
                router.navigate("/" + page, silent);
            }
            else {
                console.error("Arguments Exception", "Page is empty; Usage: route(String page)");
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
            }
        },
        load: function (node, page, args) {
            //stuff the view into the node
            if ($.type(page) == "string" && $.trim(page).length > 0 && $.type(node) == "object") {
<<<<<<< HEAD
=======
                if (page.substring(0, 1) == "/") {
                    page = page.substring(1, page.length);
                }
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
                return go(node, page, args);
            }
            else {
                console.error("Arguments Exception", "Page is empty or node is not a DOM element; Usage: load(String page, DomNode node)");
            }
        },
<<<<<<< HEAD
        showLoading: function () {
            if (this.options.kendoMobileApplication) {
                this.options.kendoMobileApplication.showLoading();
            }
            else {
                kendo.ui.progress(this.options.node, true);
            }
        },
        hideLoading: function () {
            kendo.ui.progress(this.options.node, false);
            if (this.options.kendoMobileApplication) {
                this.options.kendoMobileApplication.hideLoading();
            }
        },
        bind: function (event, method) {
            if ($.type(event) == "string" && $.trim(event).length > 0 && $.isFunction(method)) {
                if (this.options.kendoMobileApplication) {
                    this.options.kendoMobileApplication.bind.apply(this.options.kendoMobileApplication, arguments)
                }
                else {
                    events.bind.apply(events, arguments);
                }
            }
            else {
                console.error("Arguments Exception", "Event is empty or method is not a function; Usage: bind(String event, Function method, ...)");
            }
        },
        trigger: function (event) {
            if ($.type(event) == "string" && $.trim(event).length > 0) {
                if (this.options.kendoMobileApplication) {
                    this.options.kendoMobileApplication.trigger.apply(this.options.kendoMobileApplication, arguments)
                }
                else {
                    events.trigger.apply(events, arguments);
                }
            }
            else {
                console.error("Arguments Exception", "Event is empty ; Usage: bind(String event, ...)");
            }
        }
    });

    window[name] = new Class();

    return window[name];
=======
        bind: function (event, method) {
            if ($.type(event) == "string" && $.trim(event).length > 0 && $.isFunction(method)) {
                $(events).bind(event, method);
            }
            else {
                console.error("Arguments Exception", "Event is empty or method is not a function; Usage: bind(String event, Function method)");
            }
        }
    });
    //singleton
    window[name] = new Class();
>>>>>>> d9dc60156afda9d7a2616a7b6d116f2fa7c15c60
})();