define([], function () {
    return {
        
        sText: "",
        
        preinit: function (node, args) {

        },

        init: function (node, args) {
            this.set("sText", args.foo);
            return kendo.fx(node.children()).zoom("in").play();
        },

        deinit: function (node) {
            return kendo.fx(node.children()).zoom("out").play();
        }
        
    };
});