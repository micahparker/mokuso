define(function () {
    var name = "mokuso";

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
			for (var x=0; x < modules.length; x++) {
				if ($.isFunction(modules[x][hook])) {
					defs.push(modules[x][hook].apply(modules[x][hook], args || []));
				}
			}
			return $.when.apply(null,defs);
		},
		render: function (kendoView, node, args) {
			//nest inside parent Layout?
			var parentLayout = node.parents("*[data-role='" + name + "view']:first").data(name + "View");
			if (parentLayout && parentLayout instanceof kendo.Layout) {
				parentLayout.showIn(kendoView, node);
			}
			else {
				kendoView.render(node);
			}
		},
		getView: function (page) {
			return $.ajax({
				url: require.toUrl("view/" + page + ".html")
			}).promise();
		},
        findNestedViews: function (_node, _parentModel, _mobile) {
            var _defs = [];
            _node.find("*[data-role='" + name + "view']").addBack("*[data-role='" + name + "view']").each(function (i, n) {
				console.log(n)
				var _n = $(n);
				var _args = new kendo.data.ObservableObject({});
				//parse out any args
				if ($.trim(_n.attr("data-view-args")).length) {
                    var arrBindFields = [];
				    var __args = {};
                    if (_parentModel) {
					    with (_parentModel) {
						    try {
							    //is there any other way to do this?? not very performant at scale...
							    eval("__args = " + _n.attr("data-view-args"));
						    }
						    catch (ex) {
							    //eval didnt work most likely
							    console.error("Argument Parsing Error", "Could not parse inline page arguments: " + _n.attr("data-view-args"));
						    }
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
				_defs.push(_.go(_n, _n.attr("data-view"), _args, _mobile, _mobile));
			});
			//await nested pages then resolve go deferred
			return $.when.apply($, _defs);
        },
		go: function (_node, _page, _args, _mobile, _setupmobileviews) {
			if ($.type(_page) != "string" || $.trim(_page).length <= 0 || $.type(_node) != "object") {
				//improper args... lets get outta here!
				return;
			}
			var _def = $.Deferred();
			var qIdx = _page.indexOf("?");
			var page = qIdx > 0 ? _page.substring(0, qIdx) : _page;
			var args = (this.isObservableObject(_args)) ? _args : (new kendo.data.ObservableObject($.isPlainObject(_args) ? _args : {}));
			var node = _node;
			//make sure its a jquery node..
			if (!(_node instanceof $)) {
				node = $(_node);
			}
			//destroy existing node first?
			var inlineViews = node.find("*[data-role='" + name + "view']");
			if (node.data(name + "View")) {
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
					return { depth: n.parents().length, node: n };
				}).sort(function (a, b) {
					return b.depth - a.depth;
				}).reduce(function (prev, curr, idx, arr) {
					return prev.then(function () {
						return curr.node.data(name + "View").model.deinit(curr.node);
					});
				}, ___def);
				//after they are all destroyed then resolve the main deferred
				__def.always(function () {
					node.data(name + "View").destroy();
					node.empty();
				}).always(function () {
					//get view
					return _.getView(page).fail(function (_e) {
						def.rejectWith(null, [_e])
					}).then(function (view) {
						def.resolveWith(null, [view]);
					});
				});
				//and go!
				___def.resolve();
			}
			else {
				//get view
				def = _.getView(page);
			}
			//get viewmodel
			require(["viewmodel/" + page], function (modelview) {
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
                    if (_setupmobileviews) {
                        //no view creation, just setup for kendo.mobile.Application
                        var _node = $(view);
                        var uid = "a"+kendo.guid().replace(new RegExp("-","g"),"");
                        //set global model
                        Class.GlobalMobileModels[uid] = _modelview
                        _node.each(function (n) {
                            var __node = $(this);
                            if ((__node.attr("data-role") || "").toLowerCase() == "view") {
                                //add model binding
                                __node.attr("data-model", name + ".GlobalMobileModels." + uid);
                                //add init event bindings...
                                var bindAttr = (__node.attr("data-bind") || "").replace(new RegExp("events([ ]{0,}):([ ]{0,}){","i"),"events:{");
                                var bindAttrIdx = bindAttr.indexOf("events:{");
                                if (bindAttrIdx> -1) {
                                    __node.attr("data-bind", bindAttr.substring(0,bindAttrIdx+8) + " init: __________init, " + bindAttr.substring(bindAttrIdx+8, bindAttr.length));
                                }
                                else {
                                    __node.attr("data-bind", $.merge((bindAttr.length ? bindAttr.split(",") : []),["events: { init: __________init }"]).join(","));
                                }
                            }
                        });
                        
                        //call preinit and process nested views
                        return $.when(_modelview.preinit(node, args)).then(function () {
                            //render setup
                            var _element = _node.insertAfter(node);
                            //await nested pages then resolve go deferred (dont nest them as mobile...)
                            return _.findNestedViews(_element, _modelview, false).then(function () {
								_def.resolve();
							}).fail(function () {
								//fail go deferred
								_def.rejectWith(null, arguments);
							});
                        });
                    }
                    else {
                        //create a view and render it in the provided node...
					    var kendoView = new kendo.View("<div>" + view + "</div>", {
						    model: _modelview,
						    init: function () {
							    var self = this;
							    var node = this.element.parent();
							    //make sure some attribs are set
							    node.attr("data-role", name + "view");
							    node.attr("data-view", page);
							    //call init and wait...
							    $.when(this.model.init(this.element, args)).always(function () {
								    //await nested pages then resolve go deferred
								    _.findNestedViews(self.element, self.model, _mobile).then(function () {
									    _def.resolve();
								    }).fail(function () {
									    //fail go deferred
									    _def.rejectWith(null, arguments);
								    });
							    });
						    },
						    wrap: false,
					    });
					    //set data and attribute(s)
					    node.data(name + "View", kendoView);
                        //call preinit
			            return $.when(_modelview.preinit(node, args)).then(function () {
					        //render!
					        _.render(kendoView, node, args);
                        });
                    }
				}).fail(function () {
					//fail go deferred
					_def.rejectWith(null, arguments);
				});
			}, function () {
				//fail go deferred
				_def.rejectWith(null, arguments);
			});
	
			return _def;
		}
	}))();
	
    //public functions
    
	var Class = kendo.Class.extend({
        options: {},
        events: ["init", "before-navigate", "after-navigate", "before-load", "after-load"],
        router: null,
		mobileApp: null,
		modules: [],

        _events: $({}),

        init: function (contentNode, options, isMobile) {
            //constructor - where the magic happens...
			var self = this;
            //save off options
            this.options = $.extend({
				node: $("body"),
				initial: null,
				init: null,
				transition: null,
				root: "/",
				pushState: false,
				hashBang: false,
				modules: []
			}, options);
			
            if (contentNode) {
                this.options.node = contentNode;
            }
			//set modules
			for (var x=0; x < this.options.modules.length; x++) {
				this.registerModule(this.options.modules[x]);
			}
			//run beforeInit module hooks before we kick anything off...
			_.handleModuleHook(this.modules, "beforeInit", [this]).then(function () {
				//create router
				if (isMobile && kendo.mobile && kendo.mobile.Application) {
					var def = $.Deferred();
					//the initial view needs to get loaded before the mobileApp is created, it should contain all the mobile views
					if ($.type(self.options.initial) == "string" && $.trim(self.options.initial).length > 0) {
						self.load(self.options.node, options.initial, {}, true).then(function () {
							//need to move all nodes from view out into the body for mobile stuff to work proper
							self.options.node.prepend($("*[data-role='" + name + "view']:first").data(name + "View").element.children());
							//create kendo.mobile.Application off the newly minted inital view
							self.mobileApp = new kendo.mobile.Application(self.options.node, $.extend($.extend({},self.options), {
								//override these options for the Application without overwriting self.options
								initial: null,
								init: function () { setTimeout(function () { def.resolve(); }, 10); }
							}));
						});
					}
					else {
						//assume the content for the mobile app is already in the desired node
						self.mobileApp = new kendo.mobile.Application(self.options.node, $.extend($.extend({},self.options), {
							//override these options for the Application without overwriting self.options
							init: function () { setTimeout(function () { def.resolve(); }, 10); }
						}));
					}
					return $.when(def).then(function () {
						//use the router from the mobile app, no need for 2!
						self.router = self.mobileApp.router;
						//bind to router to we can trigger events here (best we can do for a kendoMobileApp router?)
						self.router.bind("change", function (e) {
							//trigger before route
							self.trigger("before-navigate", [e.url, self.options.node]);
							//trigger after route right after cause mobile stuff happens right away, no loading...
							setTimeout(function () {
								self.trigger("after-navigate", [e.url, self.options.node]);		
							},10)
						});
					});
				}
				else {
					//setup router!
					self.router = new kendo.Router({ pushState: self.options.pushState, hashBang: self.options.hasBang, root: self.options.root });
					//setup the router...
					self.router.route("*page", function (page, args) {
						_.handleModuleHook(self.modules, "beforeNavigate", [self.options.node, page, args]).then(function () {
							//trigger after route
							self.trigger("before-navigate", [page, self.options.node]);
							//insert the view into contentNode
							_.go(self.options.node, page, args).fail(function (_e) {
								self.router.trigger("routeMissing", _e);
							}).then(function () {
								//trigger after route
								self.trigger("after-navigate", [page, self.options.node]);
							});
						}).then(function () {
							return _.handleModuleHook(self.modules, "afterNavigate", [self.options.node, page, args]);
						});
					});
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
		registerModule: function (_module) {
			if (_module instanceof Class.Module && $.grep(this.modules, function (__module) { return _module === __module; }).length == 0) {
				this.modules.push(_module);
			}
			else {
				console.error("Module is not an extension of "+name+".Module");
			}
		},
		deregisterModule: function (_module) {
			if (_module instanceof Class.Module && $.grep(this.modules, function (__module) { return _module === __module; }).length >= 1) {
				this.modules = $.grep(function (__module) { return _module !== __module; });
			}
			else {
				console.error("Module is not an extension of "+name+".Module");
			}
		},
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
        load: function (node, page, args) {
            var self = this;
            var _arguments = arguments;
            //stuff the view into the node
            if ($.type(page) == "string" && $.trim(page).length > 0 && $.type(node) == "object") {
                return _.handleModuleHook(this.modules, "beforeLoad", [node, page, args]).then(function () {
                    self.trigger("before-load", [node, page, args]);
                    return _.go.apply(_, _arguments);
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
        showLoading: function () {
            if (this.mobileApp) {
                this.mobileApp.showLoading();
            }
            else {
                kendo.ui.progress(this.options.node, true);
            }
        },
        hideLoading: function () {
            kendo.ui.progress(this.options.node, false);
            if (this.mobileApp) {
                this.mobileApp.hideLoading();
            }
        },
        bind: function (event, method) {
            if ($.type(event) == "string" && $.trim(event).length > 0 && $.isFunction(method)) {
                if (this.mobileApp) {
                    this.mobileApp.bind.apply(this.mobileApp, arguments)
                }
                else {
                    this._events.bind.apply(this._events, arguments);
                }
            }
            else {
                console.error("Arguments Exception", "Event is empty or method is not a function; Usage: bind(String event, Function method, ...)");
            }
        },
        trigger: function (event) {
            if ($.type(event) == "string" && $.trim(event).length > 0) {
                if (this.mobileApp) {
                    this.mobileApp.trigger.apply(this.mobileApp, arguments)
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
	
	Class.Module = kendo.Class.extend({
		beforeInit: function (app) {},
		afterInit: function (app) {},
		beforeNavigate: function (node, page, args) {},
		afterNavigate: function (node, page, args) {},
        beforeLoad: function (node, page, args) {},
		afterLoad: function (node, page, args) {}
	});
    Class.GlobalMobileModels = {};
	
    //set global var

    window[name] = Class;

	//return for require.js
	
	return Class;
});