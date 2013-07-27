/*==================================================
 *  DOM Utility Functions
 *==================================================
 */

SimileAjax.DOM = new Object();

/*
SimileAjax.DOM.registerEventWithObject = function(elmt, eventName, obj, handlerName) {
    SimileAjax.DOM.registerEvent(elmt, eventName, function(elmt2, evt, target) {
        return obj[handlerName].call(obj, elmt2, evt, target);
    });
};
*/

SimileAjax.DOM.registerEvent = function(elmt, eventName, handler) {
    var handler2 = function(evt) {
        evt = (evt) ? evt : ((event) ? event : null);
        if (evt) {
            var target = (evt.target) ? 
                evt.target : ((evt.srcElement) ? evt.srcElement : evt.target?evt.target:null);
            if (target) {
                target = (target.nodeType == 1 || target.nodeType == 9) ? 
                    target : target.parentNode;
            }
            
            return handler(elmt, evt, target);
        }
        return true;
    }
    
    if (SimileAjax.Platform.browser.isIE) {
        elmt.attachEvent("on" + eventName, handler2);
    } else {
        elmt.addEventListener(eventName, handler2, false);
    }
};

SimileAjax.DOM.getPageCoordinates = function(elmt) {
    var left = 0;
    var top = 0;
    
    if (elmt.nodeType != 1) {
        elmt = elmt.parentNode;
    }
    
    var elmt2 = elmt;
    while (elmt2 != null) {
        left += elmt2.offsetLeft;
        top += elmt2.offsetTop;
        elmt2 = elmt2.offsetParent;
    }
    
    var body = document.body;
    while (elmt != null && elmt != body) {
        if ("scrollLeft" in elmt) {
            left -= elmt.scrollLeft;
            top -= elmt.scrollTop;
        }
        elmt = elmt.parentNode;
    }
    
    return { left: left, top: top };
};


SimileAjax.DOM.getEventRelativeCoordinates = function(evt, elmt) {
    if (SimileAjax.Platform.browser.isIE) {
      if (evt.type == "mousewheel") {
        var coords = SimileAjax.DOM.getPageCoordinates(elmt);
        return {
          x: evt.clientX - coords.left, 
          y: evt.clientY - coords.top
        };        
      } else {
        return {
          x: evt.offsetX,
          y: evt.offsetY
        };
      }
    } else {
        var coords = SimileAjax.DOM.getPageCoordinates(elmt);

        if ((evt.type == "DOMMouseScroll") &&
          SimileAjax.Platform.browser.isFirefox &&
          (SimileAjax.Platform.browser.majorVersion == 2)) {
          // Due to: https://bugzilla.mozilla.org/show_bug.cgi?id=352179                  

          return {
            x: evt.screenX - coords.left,
            y: evt.screenY - coords.top 
          };
        } else {
          return {
              x: evt.pageX - coords.left,
              y: evt.pageY - coords.top
          };
        }
    }
};

SimileAjax.DOM.getEventPageCoordinates = function(evt) {
    if (SimileAjax.Platform.browser.isIE) {

        var scrOfY = 0;
        var scrOfX = 0;

        if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
            //DOM compliant
            scrOfY = document.body.scrollTop;
            scrOfX = document.body.scrollLeft;
        } else if (document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
            //IE6 standards compliant mode
            scrOfY = document.documentElement.scrollTop;
            scrOfX = document.documentElement.scrollLeft;
        }

        return { x: evt.clientX + scrOfX, y: evt.clientY + scrOfY }; 
    } else {
        return {
            x: evt.pageX,
            y: evt.pageY
        };
    }
};

SimileAjax.DOM.cancelEvent = function(evt) {
    evt.returnValue = false;
    evt.cancelBubble = true;
    if ("preventDefault" in evt) {
        evt.preventDefault();
    }
};

