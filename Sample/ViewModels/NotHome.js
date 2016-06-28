define([], function () {
    return {
        
        preinit: function (node, args) {
           
        },

        init: function (node, args) {
            
        },

        deinit: function (node) {
            return kendo.fx(node.children()).slideIn("right").reverse();
        }
        
    };
});