define(['mokuso'], function (mokuso) {
    return {
        
        preinit: function (node, args) {

        },

        init: function (node, args) {
            
        },

        deinit: function (node) {
            
        },

        go_home: function (e) {
            mokuso.route("Home");
        },

        go_other: function (e) {
            mokuso.route("NotHome");
        }
    };
});