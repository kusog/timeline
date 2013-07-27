/**
 * @fileOverview UI layers and window-wide dragging
 * @name SimileAjax.WindowManager
 */

/**
 *  This is a singleton that keeps track of UI layers (modal and 
 *  modeless) and enables/disables UI elements based on which layers
 *  they belong to. It also provides window-wide dragging 
 *  implementation.
 */ 
SimileAjax.WindowManager = {
    _initialized:       false,
    _listeners:         [],
    _layers:            [],

    initialize: function() {
        if (SimileAjax.WindowManager._initialized) {
            return;
        }

        function preload(arrayOfImages) {
            $(arrayOfImages).each(function () {
                $('<img />').attr('src', Timeline.urlPrefix + "images/"+this).appendTo('body').css('display', 'none');
            });
        }

        setTimeout(function () {
            preload([
                'bubble-arrow-point-down.png',
                'bubble-arrow-point-left.png',
                'bubble-arrow-point-right.png',
                'bubble-arrow-point-up.png',
                'bubble-bottom-arrow.png',
                'bubble-bottom-left.png',
                'bubble-bottom-right.png',
                'bubble-bottom.png',
                'bubble-left-arrow.png',
                'bubble-left.png',
                'bubble-right-arrow.png',
                'bubble-right.png',
                'bubble-top-arrow.png',
                'bubble-top-left.png',
                'bubble-top-right.png',
                'bubble-top.png',
                'close-button.png'
            ]);
        },200);


    
        SimileAjax.DOM.registerEvent(document.body, "mousedown", SimileAjax.WindowManager._onBodyMouseDown);
        SimileAjax.DOM.registerEvent(document.body, "mouseup",   SimileAjax.WindowManager._onBodyMouseUp);
        SimileAjax.DOM.registerEvent(document, "keydown",       SimileAjax.WindowManager._onBodyKeyDown);
        SimileAjax.DOM.registerEvent(document, "keyup",         SimileAjax.WindowManager._onBodyKeyUp);
    
        SimileAjax.WindowManager._layers.push({index: 0});
       
        SimileAjax.WindowManager._initialized = true;
    },

    getBaseLayer: function() {
        SimileAjax.WindowManager.initialize();
        return SimileAjax.WindowManager._layers[0];
    },

    getHighestLayer: function() {
        SimileAjax.WindowManager.initialize();
        return SimileAjax.WindowManager._layers[SimileAjax.WindowManager._layers.length - 1];
    },

    registerEvent: function(elmt, eventName, handler, layer) {
        if (layer == null) {
            layer = SimileAjax.WindowManager.getHighestLayer();
        }
    
        function handler2(elmt, evt, target) {
            if (SimileAjax.WindowManager._canProcessEventAtLayer(layer)) {
                SimileAjax.WindowManager._popToLayer(layer.index);
                try {
                    handler(elmt, evt, target);
                } catch (e) {
                    //SimileAjax.Debug.exception(e);
                }
            }
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        }
    
        SimileAjax.DOM.registerEvent(elmt, eventName, handler2);
    },

    pushLayer: function(f, ephemeral, elmt) {
        var layer = { onPop: f, index: SimileAjax.WindowManager._layers.length, ephemeral: (ephemeral), elmt: elmt };
        SimileAjax.WindowManager._layers.push(layer);
    
        return layer;
    },

    popLayer: function(layer) {
        for (var i = 1; i < SimileAjax.WindowManager._layers.length; i++) {
            if (SimileAjax.WindowManager._layers[i] == layer) {
                SimileAjax.WindowManager._popToLayer(i - 1);
                break;
            }
        }
    },

    _popToLayer: function(level) {
        while (level+1 < SimileAjax.WindowManager._layers.length) {
            try {
                var layer = SimileAjax.WindowManager._layers.pop();
                if (layer.onPop != null) {
                    layer.onPop();
                }
            } catch (e) {
            }
        }
    },

    _canProcessEventAtLayer: function(layer) {
        if (layer.index == (SimileAjax.WindowManager._layers.length - 1)) {
            return true;
        }
        for (var i = layer.index + 1; i < SimileAjax.WindowManager._layers.length; i++) {
            if (!SimileAjax.WindowManager._layers[i].ephemeral) {
                return false;
            }
        }
        return true;
    },

    cancelPopups: function(evt) {
        var evtCoords = (evt) ? SimileAjax.DOM.getEventPageCoordinates(evt) : { x: -1, y: -1 };
    
        var i = SimileAjax.WindowManager._layers.length - 1;
        while (i > 0 && SimileAjax.WindowManager._layers[i].ephemeral) {
            var layer = SimileAjax.WindowManager._layers[i];
            if (layer.elmt != null) { // if event falls within main element of layer then don't cancel
                var elmt = layer.elmt;
                var elmtCoords = SimileAjax.DOM.getPageCoordinates(elmt);
                if (evtCoords.x >= elmtCoords.left && evtCoords.x < (elmtCoords.left + elmt.offsetWidth) &&
                    evtCoords.y >= elmtCoords.top && evtCoords.y < (elmtCoords.top + elmt.offsetHeight)) {
                    break;
                }
            }
            i--;
        }
        SimileAjax.WindowManager._popToLayer(i);
    },

    _onBodyMouseDown: function(elmt, evt, target) {
        if (!("eventPhase" in evt) || evt.eventPhase == evt.BUBBLING_PHASE) {
            SimileAjax.WindowManager.cancelPopups(evt);
        }
    },

    _handleMouseDown: function(elmt, evt, callback) {
        SimileAjax.WindowManager._draggedElement = elmt;
        SimileAjax.WindowManager._draggedElementCallback = callback;
        SimileAjax.WindowManager._lastCoords = { x: evt.clientX, y: evt.clientY };
        
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    },

    _onBodyKeyDown: function(elmt, evt, target) {
        if (SimileAjax.WindowManager._dragging) {
            if (evt.keyCode == 27) { // esc
                SimileAjax.WindowManager._cancelDragging();
            } else if ((evt.keyCode == 17 || evt.keyCode == 16) && SimileAjax.WindowManager._draggingMode != "copy") {
                SimileAjax.WindowManager._draggingMode = "copy";
            
                var img = SimileAjax.Graphics.createTranslucentImage(Timeline.urlPrefix + "images/copy.png");
                img.style.position = "absolute";
                img.style.left = (SimileAjax.WindowManager._ghostCoords.left - 16) + "px";
                img.style.top = (SimileAjax.WindowManager._ghostCoords.top) + "px";
                document.body.appendChild(img);
            
                SimileAjax.WindowManager._draggingModeIndicatorElmt = img;
            }
        }
    },

    _onBodyKeyUp: function(elmt, evt, target) {
        if (SimileAjax.WindowManager._dragging) {
            if (evt.keyCode == 17 || evt.keyCode == 16) {
                SimileAjax.WindowManager._draggingMode = "";
                if (SimileAjax.WindowManager._draggingModeIndicatorElmt != null) {
                    document.body.removeChild(SimileAjax.WindowManager._draggingModeIndicatorElmt);
                    SimileAjax.WindowManager._draggingModeIndicatorElmt = null;
                }
            }
        }
    },

    _onBodyMouseUp: function(elmt, evt, target) {
        if (SimileAjax.WindowManager._draggedElement != null) {
            try {
                if (SimileAjax.WindowManager._dragging) {
                    var callback = SimileAjax.WindowManager._draggedElementCallback;
                    if ("onDragEnd" in callback) {
                        callback.onDragEnd();
                    }
                    if ("droppable" in callback && callback.droppable) {
                        var dropped = false;
                    
                        var target = SimileAjax.WindowManager._potentialDropTarget;
                        if (target != null) {
                            if ((!("canDropOn" in callback) || callback.canDropOn(target)) &&
                                (!("canDrop" in target) || target.canDrop(SimileAjax.WindowManager._draggedElement))) {
                            
                                if ("onDropOn" in callback) {
                                    callback.onDropOn(target);
                                }
                                target.ondrop(SimileAjax.WindowManager._draggedElement, SimileAjax.WindowManager._draggingMode);
                            
                                dropped = true;
                            }
                        }
                    
                        if (!dropped) {
                            // TODO: do holywood explosion here
                        }
                    }
                }
            } finally {
                SimileAjax.WindowManager._cancelDragging();
            }
        
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        }
    },

    _cancelDragging: function() {
        var callback = SimileAjax.WindowManager._draggedElementCallback;
        if ("_ghostElmt" in callback) {
            var ghostElmt = callback._ghostElmt;
            document.body.removeChild(ghostElmt);
        
            delete callback._ghostElmt;
        }
        if (SimileAjax.WindowManager._dropTargetHighlightElement != null) {
            document.body.removeChild(SimileAjax.WindowManager._dropTargetHighlightElement);
            SimileAjax.WindowManager._dropTargetHighlightElement = null;
        }
        if (SimileAjax.WindowManager._draggingModeIndicatorElmt != null) {
            document.body.removeChild(SimileAjax.WindowManager._draggingModeIndicatorElmt);
            SimileAjax.WindowManager._draggingModeIndicatorElmt = null;
        }
    
        SimileAjax.WindowManager._draggedElement = null;
        SimileAjax.WindowManager._draggedElementCallback = null;
        SimileAjax.WindowManager._potentialDropTarget = null;
        SimileAjax.WindowManager._dropTargetHighlightElement = null;
        SimileAjax.WindowManager._lastCoords = null;
        SimileAjax.WindowManager._ghostCoords = null;
        SimileAjax.WindowManager._draggingMode = "";
        SimileAjax.WindowManager._dragging = false;
    },

    _findDropTarget: function(elmt) {
        while (elmt != null) {
            if ("ondrop" in elmt && (typeof elmt.ondrop) == "function") {
                break;
            }
            elmt = elmt.parentNode;
        }
        return elmt;
    }
}
