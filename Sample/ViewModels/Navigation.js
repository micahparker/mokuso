﻿define([], function () {
    return {
        
        preinit: function (node, args) {

        },

        init: function (node, args) {
            
        },

        deinit: function (node) {
            
        },

        go_home: function (e) {
            window.app.navigate("Home");
        },

        go_other: function (e) {
            window.app.navigate("NotHome");
        }
    };
});