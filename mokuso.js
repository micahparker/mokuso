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
		handleModuleHook: function (app, modules, hook) {
			var defs = [];
			for (var x=0; x < modules.length; x++) {
				if ($.isFunction(modules[x][hook])) {
					defs.push(modules[x][hook](app));
				}
			}
			return $.when(defs);
		},
		render: function (kendoView, node, args) {
			//call model's preinit
			kendoView.model.preinit(node, args);
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
		go: function (_node, _page, _args) {
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
				//wait for view
				def.then(function (view) {
					var kendoView = new kendo.View("<div>" + view + "</div>", {
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
							var node = this.element.parent();
							//make sure some attribs are set
							node.attr("data-role", name + "view");
							node.attr("data-view", page);
							//call init and wait...
							$.when(this.model.init(this.element, args)).always(function () {
								var _model = self.model;
								var _element = self.element;
								var _defs = [];
								//now, process sub pages
								_element.find("*[data-role='" + name + "view']").each(function (i, n) {
									var _n = $(n);
									var _args = new kendo.data.ObservableObject({});
									//parse out any args
									if ($.trim(_n.attr("data-view-args")).length) {
										with (_model) {
											var arrBindFields = [];
											var __args = {};
											try {
												//is there any other way to do this?? not very performant at scale...
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
									_defs.push(_.go(_n, _n.attr("data-view"), _args));
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
					//set data and attribute(s)
					node.data(name + "View", kendoView);
					//render!
					_.render(kendoView, node, args);
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
        events: $(["init", "before-route", "after-route"]),
        router: null,
		mobileApp: null,
		modules: [],

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
			_.handleModuleHook(this, this.modules, "beforeInit").then(function () {
				//create router
				if (isMobile && kendo.mobile && kendo.mobile.Application) {
					var def = null;
					//the initial view needs to get loaded before the mobileApp is created, it should contain all the mobile views
					if ($.type(self.options.initial) == "string" && $.trim(self.options.initial).length > 0) {
						def = self.load(self.options.node, options.initial).then(function () {
							var initialNode = $("*[data-role='" + name + "view']:first").data(name + "View").element;
							//need to move all inline declared views out into the main element for mobile stuff to work proper
							initialNode.find("*[data-role='" + name + "view']").each(function () {
								var _node = $(this);
								var view = _node.data(name + "View");
								//move all mobile data-roles into main node so kendo.mobile.Application can pick them up...
								view.element.children("[data-role]").each(function () {
									var __node = $(this);
									//set the view variable
									__node.data(name + "View", view);
									//append to main node for kendo.mobile.Application
									initialNode.append(__node);
								});
							});
						}).then(function () {
							self.options.initial = null;
							//create kendo.mobile.Application off the newly minted inital view
							self.mobileApp = new kendo.mobile.Application($("*[data-role='" + name + "view']:first").data(name + "View").element, self.options);
						});
					}
					else {
						self.options.initial = null
						//assume the content for the mobile app is already there!
						self.mobileApp = new kendo.mobile.Application(self.options.node, self.options);
					}
					return $.when(def).then(function () {
						//use the router from the mobile app, no need for 2!
						self.router = self.mobileApp.router;
						//bind to router to we can trigger events here
						self.router.bind("change", function (e) {
							//trigger before route
							self.trigger("before-route", [e.url, self.options.node]);
							//trigger after route right after cause mobile stuff happens right away, no loading...
							setTimeout(function () {
								self.trigger("after-route", [e.url, self.options.node]);		
							})
						});
					});
				}
				else {
					//setup router!
					self.router = new kendo.Router({ pushState: self.options.pushState, hashBang: self.options.hasBang, root: self.options.root });
					//setup the router...
					self.router.route("*page", function (page, args) {
						_.handleModuleHook(self, self.modules, "beforeRoute").then(function () {
							//trigger after route
							self.trigger("before-route", [page, self.options.node]);
							//insert the view into contentNode
							_.go(self.options.node, page, args).fail(function (_e) {
								self.router.trigger("routeMissing", _e);
							}).then(function () {
								//trigger after route
								self.events.trigger("after-route", [page, self.options.node]);
							});
						}).then(function () {
							return _.handleModuleHook(self, self.modules, "afterRoute");
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
					//call init callbacks
					if ($.isFunction(self.options.init)) {
						self.options.init();
					}
				}
			}).then(function () {
				//and start the routing...
				return _.handleModuleHook(self, self.modules, "afterInit").then(function () {
					self.router.start();
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
            //stuff the view into the node
            if ($.type(page) == "string" && $.trim(page).length > 0 && $.type(node) == "object") {
                return _.go(node, page, args);
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
                    this.events.bind.apply(this.events, arguments);
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
                    this.events.trigger.apply(this.events, arguments);
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
		beforeInit: function () {},
		afterInit: function () {},
		beforeRoute: function () {},
		afterRoute: function () {}
	});
	
	//return for require.js
	
	return Class;
});