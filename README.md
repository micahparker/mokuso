# mokuso
a SPA framework built around kendo ui bits
=======
##MOKUSO
 
A simple easy to use Single Page Application (SPA) framework with MVVM.

Get up and running quickly without the overhead of larger frameworks and build a modern app experience. Works great for both desktop browser applications and Cordova PhoneGap applications. 

Libraries needed (CDN's already referenced in sample project):

* [Require.js](http://requirejs.org): Great JavaScript code organization tool, you have probably heard of it. 
* [Kendo UI](http://www.telerik.com/kendo-ui): Very low startup overhead but deep in content. 
* [JQuery](https://jquery.com): required to run Kendo. 
 
####What you get: 

* **Deep linking**: Navigate using links, buttons, native browser buttons or whatever else and watch the smooth page animations without a page reload. 
* **Excellent JavaScript code organization**: Group page specific content with a consistent naming convention for easy project management. 
* **Easy (I mean EASY) to use**: Click around on the sample project and you will see what I mean.

####Why Kendo?

Unlike other frameworks, there is much less to learn to get started. With that said, most of the tooling you need is available. Looking for [templates](http://demos.telerik.com/kendo-ui/templates/index)? Check. How about engaging [widgets](http://demos.telerik.com/kendo-ui/)? Double check! Want to use Ionic widgets instead? No worries, only include what you need.

###Basic Overview:

Use mokuso to load a HTML file into an element:

```javascript
mokuso.load($("#nav"),"Navigation");
```

Specify an element to contain the main content for your application. In the case below, the page will navigate to 'http://yoursite.com#/Home' and will open 'Home.html' inside the *content* element.

```javascript
mokuso.initialize($("#content"), "Home");
```

For each HTML file, include a view model JavaScript file with the same name. View models should include the following functions:

* preinit - Run any logic required prior to the view being rendered.
* init - mokuso will preform any kendo MVVM data binding. Add any additional logic needed now that the view has been rendered
* deinit - This is run when a view is being transitioned out. Preform any clean up logic here.

Example template of a mokuso view model:

```javascript
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
```

Of course you can extend the view model or add any additional functionality as needed. 

####Enjoy!

##Creators:
**[Decisive Data](http://decisivedata.net)** - Web development consultants focused on line of business applications for business intelligence

 [Micah Parker](http://github.com/micahparker),
 [Trevor](http://github.com/overremorto),
 [Jason Cannon](http://github.com/jcannon98188),
 [Paige](http://github.com/PennyPriddy),
 [John Jackson](http://github.com/JohnDennisJackson),
 [James Huffaker](http://github.com/huffaker)
