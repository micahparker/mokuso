define([], function () {
    return {
        
        preinit: function (node, args) {

        },

        init: function (node, args) {
            return kendo.fx(node.children()).fade("in").play();
        },

        deinit: function (node) {
            return kendo.fx(node.children()).fade("in").reverse();
        }
        
    };
});