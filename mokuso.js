(function () {
    var name = "mokuso";
    var events = {};
    var viewDataKey = name+"View";
    var render = function (kendoView, node, args) {
        //call model's preinit
        kendoView.model.preinit(node, args);
        //nest inside parent Layout?
        var parentLayout = node.closest("*[data-" + viewDataKey + "]");
        if (parentLayout.length) {
            parentLayout.data(viewDataKey).showIn(kendoView, node);
        }
        else {
            kendoView.render(node);
        }
    };
    var getView = function (page) {
        return $.ajax({
            url: require.toUrl("view/"+page+".html")
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
        var args = (kendo.isObservableObject(_args)) ? _args : (new kendo.data.ObservableObject($.isPlainObject(_args) ? _args : {}));
        var node = _node;
        //make sure its a jquery node..
        if (!(_node instanceof $)) {
            node = $(_node);
        }
        //destroy existing node first?
        var inlineViews = node.find("[data-attr-"+viewDataKey+"]");
        if (node.data(viewDataKey)) {
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
                return { depth: n.parents().length, node: n};
            }).sort(function (a, b) {
                return b.depth - a.depth;
            }).reduce(function(prev, curr, idx, arr) {
                return prev.then(function () {
                    return curr.node.data(viewDataKey).model.deinit(curr.node);
                });
            }, ___def);
            //after they are all destroyed then resolve the main deferred
            __def.always(function () {
                node.data(viewDataKey).destroy();
                node.empty();
            }).always(function () {
                //trigger before route
                $(events).trigger("before-route", [page, node]);
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
            $(events).trigger("before-route", [page, node]);
            //get view
            def = getView(page);
        }
        //get viewmodel
        require(["viewmodel/" + page], function (modelview) {
            //wait for view
            def.then(function (view) {
                var kendoView = new kendo.Layout("<div>" + view + "</div>", {
                    model: kendo.observable($.extend(true, {
                        //before the view is rendered
                        preinit: function (node, args) { },
                        //after the view is rendered
                        init: function (node, args) { },
                        //before the view is destroyed
                        deinit: function (node) { },
                    }, modelview)),
                    init: function () {
                        var self = this;
                        //call init and wait...
                        $.when(this.model.init(this.element, args)).always(function () {
                            var _model = self.model;
                            var _element = self.element;
                            var _defs = [];
                            //now, process sub pages
                            _element.find("*[data-page]").each(function (i, n) {
                                var _n = $(n);
                                var _args = new kendo.data.ObservableObject({});
                                //parse out any args
                                if ($.trim(_n.attr("data-page-args")).length) {
                                    with (_model) {
                                        var arrBindFields = [];
                                        var __args = {};
                                        try {
                                            //is there any other way to do this?? not very performant at scale...
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
                                _defs.push(go(_n, _n.attr("data-page"), _args));
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
                //render!
                render(kendoView, node, args);
                //set data and attribute
                node.attr("data-attr-"+viewDataKey, true);
                node.data(viewDataKey, kendoView);
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
            $(events).trigger("after-route", [page, node]);
        });

        return _def;
    };
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

        init: function () {
            //constructor
        },
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
            }
        },
        load: function (node, page, args) {
            //stuff the view into the node
            if ($.type(page) == "string" && $.trim(page).length > 0 && $.type(node) == "object") {
                if (page.substring(0, 1) == "/") {
                    page = page.substring(1, page.length);
                }
                return go(node, page, args);
            }
            else {
                console.error("Arguments Exception", "Page is empty or node is not a DOM element; Usage: load(String page, DomNode node)");
            }
        },
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
})();