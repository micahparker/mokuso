define([], function () {
    return {
        
        bWindowVisible: false,

        preinit: function (node, args) {

        },

        init: function (node, args) {
            
        },

        deinit: function (node) {
            $(".k-window-content").data("kendoWindow").destroy();
        },

        openwindow_click: function (e) {
            this.set("bWindowVisible", true);
        },

        closewindow_click: function (e) {
            this.set("bWindowVisible", false);
        }
        
    };
});