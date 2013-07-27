/*==================================================
 *  Band
 *==================================================
 */
Timeline._Band = function (timeline, bandInfo, index) {
    var self = this;
    // Set up the band's object

    // Munge params: If autoWidth is on for the Timeline, then ensure that
    // bandInfo.width is an integer     
    if (timeline.autoWidth && typeof bandInfo.width == 'string') {
        bandInfo.width = bandInfo.width.indexOf("%") > -1 ? 0 : parseInt(bandInfo.width);
    }

    this._timeline = timeline;
    this._bandInfo = bandInfo;

    this._index = index;

    this._locale = ("locale" in bandInfo) ? bandInfo.locale : Timeline.getDefaultLocale();
    this._timeZone = ("timeZone" in bandInfo) ? bandInfo.timeZone : 0;
    this._labeller = ("labeller" in bandInfo) ? bandInfo.labeller :
        (("createLabeller" in timeline.getUnit()) ?
            timeline.getUnit().createLabeller(this._locale, this._timeZone) :
            new Timeline.GregorianDateLabeller(this._locale, this._timeZone));
    this._theme = bandInfo.theme;
    this._zoomIndex = ("zoomIndex" in bandInfo) ? bandInfo.zoomIndex : 0;
    this._zoomSteps = ("zoomSteps" in bandInfo) ? bandInfo.zoomSteps : null;

    this._dragging = false;
    this._changing = false;
    this._originalScrollSpeed = 5; // pixels
    this._scrollSpeed = this._originalScrollSpeed;
    this._onScrollListeners = [];

    this._orthogonalDragging = false;
    this._viewOrthogonalOffset = 0; // vertical offset if the timeline is horizontal, and vice versa
    this._onOrthogonalScrollListeners = [];

    var b = this;
    this._syncWithBand = null;
    this._syncWithBandHandler = function (band) {
        b._onHighlightBandScroll();
    };
    this._syncWithBandOrthogonalScrollHandler = function (band) {
        b._onHighlightBandOrthogonalScroll();
    };
    this._selectorListener = function (band) {
        b._onHighlightBandScroll();
    };

    /*
     *  Install a textbox to capture keyboard events
     */
    var inputDiv = $("<div class='timeline-band-input'/>").appendTo(this._timeline.getContainer());
    //var inputDiv = this._timeline.getDocument().createElement("div");
    //inputDiv.className = "timeline-band-input";
    //this._timeline.addDiv(inputDiv);

    this._keyboardInput = $("<div class='timeline-band-nofocus' tabindex='-1' /><input type='text'/>")
        .appendTo(inputDiv)
        .on("keydown", function (event) {
            self._onKeyDown(event);
        })
        .on("keyup", function (event) {
            self._onKeyUp(event);
        });

    //this._keyboardInput = document.createElement("input");
    //this._keyboardInput.type = "text";
    //inputDiv.appendChild(this._keyboardInput);
    //$(this._keyboardInput).on("keydown", function (event) { self._onKeyDown(event); });
    //$(this._keyboardInput).on("keyup", function (event) { self._onKeyUp(event); });

    /*
     *  The band's outer most div that slides with respect to the timeline's div
     */
    this._div = this._timeline.getDocument().createElement("div");
    this._div.id = "timeline-band-" + index;
    this._div.className = "timeline-band timeline-band-" + index;
    this._timeline.addDiv(this._div);

    $(this._div).on("dblclick", function (event) { self._onDblClick(event); });
    $(this._div).on("mousedown", function (event) { self._onMouseDown(event); });
    $(this._div).on("touchstart", function (event) { self._onTouchStart(event); });
    $(this._div).on("touchmove", function (event) { self._onTouchMove(event); });
    $(this._div)
        .on("click", function (event) {
            if (!(event.srcElement.tagName == "IMG" || $(event.srcElement).hasClass("timeline-event-label"))) {
                self._keyboardInput.get(1).focus();
            }
        });
    $("body").on("mousemove", function (event) { self._onMouseMove(event); });
    $("body").on("mouseout", function (event) { self._onMouseOut(event); });
    $("body").on("mouseup", function (event) { self._onMouseUp(event); });


    var mouseWheel = this._theme!= null ? this._theme.mouseWheel : 'scroll'; // theme is not always defined
    if (mouseWheel === 'zoom' || mouseWheel === 'scroll' || this._zoomSteps) {
        // capture mouse scroll
        if (SimileAjax.Platform.browser.isFirefox)
            $(this._div).on("DOMMouseScroll", function (event) {
                self._onMouseScroll(event);
            });
        else
            $(this._div).on("mousewheel", function (event) {
                self._onMouseScroll(event);
            });
    }
    
    /*
     *  The inner div that contains layers
     */
    this._innerDiv = this._timeline.getDocument().createElement("div");
    this._innerDiv.className = "timeline-band-inner";
    this._div.appendChild(this._innerDiv);
    
    /*
     *  Initialize parts of the band
     */
    this._ether = bandInfo.ether;
    bandInfo.ether.initialize(this, timeline);
        
    this._etherPainter = bandInfo.etherPainter;
    bandInfo.etherPainter.initialize(this, timeline);
    
    this._eventSource = bandInfo.eventSource;
    if (this._eventSource) {
        this._eventListener = {
            onAddMany: function() { b._onAddMany(); },
            onClear:   function() { b._onClear(); }
        }
        this._eventSource.addListener(this._eventListener);
    }
        
    this._eventPainter = bandInfo.eventPainter;
    this._eventTracksNeeded = 0;   // set by painter via updateEventTrackInfo
    this._eventTrackIncrement = 0; 
    bandInfo.eventPainter.initialize(this, timeline);
    
    this._decorators = ("decorators" in bandInfo) ? bandInfo.decorators : [];
    for (var i = 0; i < this._decorators.length; i++) {
        this._decorators[i].initialize(this, timeline);
    }
    
    this._supportsOrthogonalScrolling = ("supportsOrthogonalScrolling" in this._eventPainter) &&
        this._eventPainter.supportsOrthogonalScrolling();
        
    if (this._supportsOrthogonalScrolling) {
        this._scrollBar = this._timeline.getDocument().createElement("div");
        this._scrollBar.id = "timeline-band-scrollbar-" + index;
        this._scrollBar.className = "timeline-band-scrollbar";
        this._timeline.addDiv(this._scrollBar);
        
        this._scrollBar.innerHTML = '<div class="timeline-band-scrollbar-thumb"> </div>'
        
        var scrollbarThumb = this._scrollBar.firstChild;
        if (SimileAjax.Platform.browser.isIE) {
            scrollbarThumb.style.cursor = "move";
        } else {
            scrollbarThumb.style.cursor = "-moz-grab";
        }

        $(scrollbarThumb).on("mousedown", function (event) {
            r._onScrollBarMouseDown(event)
        })
    }
};

Timeline._Band.SCROLL_MULTIPLES = 5;

$.extend(Timeline._Band.prototype, {
    dispose: function() {
    this.closeBubble();
    
    if (this._eventSource) {
        this._eventSource.removeListener(this._eventListener);
        this._eventListener = null;
        this._eventSource = null;
    }
    
    this._timeline = null;
    this._bandInfo = null;
    
    this._labeller = null;
    this._ether = null;
    this._etherPainter = null;
    this._eventPainter = null;
    this._decorators = null;
    
    this._onScrollListeners = null;
    this._syncWithBandHandler = null;
    this._syncWithBandOrthogonalScrollHandler = null;
    this._selectorListener = null;
    
    this._div = null;
    this._innerDiv = null;
    this._keyboardInput = null;
    this._scrollBar = null;
},

addOnScrollListener: function(listener) {
    this._onScrollListeners.push(listener);
},

removeOnScrollListener: function(listener) {
    for (var i = 0; i < this._onScrollListeners.length; i++) {
        if (this._onScrollListeners[i] == listener) {
            this._onScrollListeners.splice(i, 1);
            break;
        }
    }
},

addOnOrthogonalScrollListener: function(listener) {
    this._onOrthogonalScrollListeners.push(listener);
},

removeOnOrthogonalScrollListener: function(listener) {
    for (var i = 0; i < this._onOrthogonalScrollListeners.length; i++) {
        if (this._onOrthogonalScrollListeners[i] == listener) {
            this._onOrthogonalScrollListeners.splice(i, 1);
            break;
        }
    }
},

    setSyncWithBand: function (band, highlight) {
        if (this._syncWithBand) {
            this._syncWithBand.removeOnScrollListener(this._syncWithBandHandler);
            this._syncWithBand.removeOnOrthogonalScrollListener(this._syncWithBandOrthogonalScrollHandler);
        }

        this._syncWithBand = band;
        this._syncWithBand.addOnScrollListener(this._syncWithBandHandler);
        this._syncWithBand.addOnOrthogonalScrollListener(this._syncWithBandOrthogonalScrollHandler);
        this._highlight = highlight;
        this._positionHighlight();
    },

    getLocale: function () {
        return this._locale;
    },

    getTimeZone: function () {
        return this._timeZone;
    },

    getLabeller: function () {
        return this._labeller;
    },

    getIndex: function () {
        return this._index;
    },

    getEther: function () {
        return this._ether;
    },

    getEtherPainter: function () {
        return this._etherPainter;
    },

    getEventSource: function () {
        return this._eventSource;
    },

    getEventPainter: function () {
        return this._eventPainter;
    },

    getTimeline: function () {
        return this._timeline;
    },

    // Autowidth support
    updateEventTrackInfo: function (tracks, increment) {
        this._eventTrackIncrement = increment; // doesn't vary for a specific band

        if (tracks > this._eventTracksNeeded) {
            this._eventTracksNeeded = tracks;
        }
    },

    // Autowidth support
    checkAutoWidth: function () {
        // if a new (larger) width is needed by the band
        // then: a) updates the band's bandInfo.width
        //
        // desiredWidth for the band is 
        //   (number of tracks + margin) * track increment
        if (!this._timeline.autoWidth) {
            return; // early return
        }

        var overviewBand = this._eventPainter.getType() == 'overview';
        var margin = overviewBand ?
           this._theme.event.overviewTrack.autoWidthMargin :
           this._theme.event.track.autoWidthMargin;
        var desiredWidth = Math.ceil((this._eventTracksNeeded + margin) *
                           this._eventTrackIncrement);
        // add offset amount (additional margin)
        desiredWidth += overviewBand ? this._theme.event.overviewTrack.offset :
                                       this._theme.event.track.offset;
        var bandInfo = this._bandInfo;

        if (desiredWidth > bandInfo.width) {
            bandInfo.width = desiredWidth;
        }
    },

    layout: function () {
        this.paint();
    },

    paint: function () {
        this._etherPainter.paint();
        this._paintDecorators();
        this._paintEvents();
    },

    softLayout: function () {
        this.softPaint();
    },

    softPaint: function () {
        this._etherPainter.softPaint();
        this._softPaintDecorators();
        this._softPaintEvents();
    },

    setBandShiftAndWidth: function (shift, width) {
        var inputDiv = this._keyboardInput.parent()[0];
        var middle = shift + Math.floor(width / 2);
        if (this._timeline.isHorizontal()) {
            this._div.style.top = shift + "px";
            this._div.style.height = width + "px";

            inputDiv.style.top = middle + "px";
            inputDiv.style.left = "-1em";
        } else {
            this._div.style.left = shift + "px";
            this._div.style.width = width + "px";

            inputDiv.style.left = middle + "px";
            inputDiv.style.top = "-1em";
        }
    },

    getViewWidth: function () {
        if (this._timeline.isHorizontal()) {
            return this._div.offsetHeight;
        } else {
            return this._div.offsetWidth;
        }
    },

    setViewLength: function (length) {
        if (length != this._viewLength) {
            this._viewLength = length;
            this._recenterDiv();
            this._onChanging();
        }
        else
            this._showScrollbar();

    },

    getViewLength: function () {
        return this._viewLength;
    },

    getTotalViewLength: function () {
        return Timeline._Band.SCROLL_MULTIPLES * this._viewLength;
    },

    getViewOffset: function () {
        return this._viewOffset;
    },

    getMinDate: function () {
        return this._ether.pixelOffsetToDate(this._viewOffset);
    },

    getMaxDate: function () {
        return this._ether.pixelOffsetToDate(this._viewOffset + Timeline._Band.SCROLL_MULTIPLES * this._viewLength);
    },

    getMinVisibleDate: function () {
        return this._ether.pixelOffsetToDate(0);
    },

    getMinVisibleDateAfterDelta: function (delta) {
        return this._ether.pixelOffsetToDate(delta);
    },

    getMaxVisibleDate: function () {
        // Max date currently visible on band
        return this._ether.pixelOffsetToDate(this._viewLength);
    },

    getMaxVisibleDateAfterDelta: function (delta) {
        // Max date visible on band after delta px view change is applied 
        return this._ether.pixelOffsetToDate(this._viewLength + delta);
    },

    getCenterVisibleDate: function () {
        return this._ether.pixelOffsetToDate(this._viewLength / 2);
    },

    setMinVisibleDate: function (date) {
        if (!this._changing) {
            this._moveEther(Math.round(-this._ether.dateToPixelOffset(date)));
        }
    },

    setMaxVisibleDate: function (date) {
        if (!this._changing) {
            this._moveEther(Math.round(this._viewLength - this._ether.dateToPixelOffset(date)));
        }
    },

    setCenterVisibleDate: function (date) {
        if (!this._changing) {
            this._moveEther(Math.round(this._viewLength / 2 - this._ether.dateToPixelOffset(date)));
        }
    },

    dateToPixelOffset: function (date) {
        return this._ether.dateToPixelOffset(date) - this._viewOffset;
    },

    pixelOffsetToDate: function (pixels) {
        return this._ether.pixelOffsetToDate(pixels + this._viewOffset);
    },

    getViewOrthogonalOffset: function () {
        return this._viewOrthogonalOffset;
    },

    setViewOrthogonalOffset: function (offset) {
        this._viewOrthogonalOffset = Math.max(0, offset);
    },

    createLayerDiv: function (zIndex, className) {
        var $div = $("<div classname='" + className + " timeline-band-layer' style='z-index:" + zIndex + "'/>").appendTo(this._innerDiv),
            $innerDiv = $("<div className='timeline-band-layer-inner' style='cursor:" + (SimileAjax.Platform.browser.isIE ? "move" : "-moz-grab") + "'/>").appendTo($div);
        return $innerDiv.hide();
    },

    removeLayerDiv: function (div) {
        try {
            this._innerDiv.removeChild(div.parentNode);
        }
        catch (e) {
        }
    },

    scrollToCenter: function (date, f) {
        var pixelOffset = this._ether.dateToPixelOffset(date);
        if (pixelOffset < -this._viewLength / 2) {
            this.setCenterVisibleDate(this.pixelOffsetToDate(pixelOffset + this._viewLength));
        } else if (pixelOffset > 3 * this._viewLength / 2) {
            this.setCenterVisibleDate(this.pixelOffsetToDate(pixelOffset - this._viewLength));
        }
        this._autoScroll(Math.round(this._viewLength / 2 - this._ether.dateToPixelOffset(date)), f);
    },

    showBubbleForEvent: function (eventID) {
        var evt = this.getEventSource().getEvent(eventID);
        if (evt) {
            var self = this;
            this.scrollToCenter(evt.getStart(), function () {
                self._eventPainter.showBubble(evt);
            });
        }
    },

    zoom: function(zoomIn, x, y, target) {
        if (!this._zoomSteps) {
            // zoom disabled
            return;
        }
  
        // shift the x value by our offset
        x += this._viewOffset;

        var zoomDate = this._ether.pixelOffsetToDate(x);
        var netIntervalChange = this._ether.zoom(zoomIn);
        this._etherPainter.zoom(netIntervalChange);

        // shift our zoom date to the far left
        this._moveEther(Math.round(-this._ether.dateToPixelOffset(zoomDate)));
        // then shift it back to where the mouse was
        this._moveEther(x);
    },

_onMouseDown: function(event) {
    if (!this._dragging) {
        this.closeBubble();
    
        this._dragging = true;
        this._dragX = event.clientX;
        this._dragY = event.clientY;
    
        return this._cancelEvent(event);
    }
},

_onMouseMove: function(event) {
    if (this._dragging || this._orthogonalDragging) {
        var diffX = event.clientX - this._dragX;
        var diffY = event.clientY - this._dragY;
        
        this._dragX = event.clientX;
        this._dragY = event.clientY;
    }
    
    if (this._dragging) {
        if (this._timeline.isHorizontal()) {
            this._moveEther(diffX, diffY);
        } else {
            this._moveEther(diffY, diffX);
        }
    } else if (this._orthogonalDragging) {
        var viewWidth = this.getViewWidth();
        var scrollbarThumb = this._scrollBar.firstChild;
        if (this._timeline.isHorizontal()) {
            this._moveEther(0, -diffY * viewWidth / scrollbarThumb.offsetHeight);
        } else {
            this._moveEther(0, -diffX * viewWidth / scrollbarThumb.offsetWidth);
        }
    } else {
        return;
    }
    
    this._positionHighlight();
    this._showScrollbar();
    
    return this._cancelEvent(event);
},

_onMouseUp: function (event) {
    if (this._dragging) {
        this._dragging = false;
    } else if (this._orthogonalDragging) {
        this._orthogonalDragging = false;
    } else {
        return;
    }
    this._keyboardInput.focus();
    this._bounceBack();
    
    return this._cancelEvent(event);
},

_onMouseOut: function (event) {
    if (event.toElement == null || event.toElement.tagName == "HTML") {
        if (this._dragging) {
            this._dragging = false;
        } else if (this._orthogonalDragging) {
            this._orthogonalDragging = false;
        } else {
            return;
        }
        this._bounceBack();
        
        return this._cancelEvent(event);
    }
},

_onScrollBarMouseDown: function (event) {
    if (!this._orthogonalDragging) {
        this.closeBubble();
    
        this._orthogonalDragging = true;
        this._dragX = event.clientX;
        this._dragY = event.clientY;
    
        return this._cancelEvent(event);
    }
},

_onMouseScroll: function (event) {
    var now = new Date(), evt = event.originalEvent;
    now = now.getTime();

    if (!this._lastScrollTime || ((now - this._lastScrollTime) > 50)) {
        // limit 1 scroll per 200ms due to FF3 sending multiple events back to back
        this._lastScrollTime = now;

        var delta = 0;
        if (evt.wheelDelta) {
            delta = evt.wheelDelta/120;
        } else if (evt.detail) {
            delta = -evt.detail/3;
        }
    
        // either scroll or zoom
        var mouseWheel = this._theme.mouseWheel;
    
        if (this._zoomSteps || mouseWheel === 'zoom') {
            var loc = SimileAjax.DOM.getEventRelativeCoordinates(evt, innerFrame);
            if (delta != 0) {
                var zoomIn;
                if (delta > 0)
                    zoomIn = true;
                if (delta < 0)
                    zoomIn = false;
                // call zoom on the timeline so we could zoom multiple bands if desired
                this._timeline.zoom(zoomIn, loc.x, loc.y, innerFrame);
            }
        }
        else if (mouseWheel === 'scroll') {
            var move_amt = 50 * (delta < 0 ? -1 : 1);
            this._moveEther(move_amt);
        }
    }

    // prevent bubble
    if (evt.stopPropagation) {
        evt.stopPropagation();
    }
    evt.cancelBubble = true;

    // prevent the default action
    if (evt.preventDefault) {
        evt.preventDefault();
    }
    evt.returnValue = false;
},

_onDblClick: function (event) {
    var element = event.srcElement ? event.srcElement : event.target;
    if($(element).hasClass("timeline-band-inner") || (element = $(element).parents(".timeline-band-inner").get(0))) {
        var coords = SimileAjax.DOM.getEventRelativeCoordinates(event.originalEvent, element);
        var distance = coords.x - (this._viewLength / 2 - this._viewOffset);
    
        this._autoScroll(-distance);
    }
},

_onKeyDown: function(event) {
    if (!this._dragging) {
        switch (event.keyCode) {
            case 27: // ESC
                break;
            case 37: // left arrow
            case 38: // up arrow
                this._scrollSpeed = Math.min(50, Math.abs(this._scrollSpeed * 1.05));
                this._moveEther(this._scrollSpeed);
                break;
            case 39: // right arrow
            case 40: // down arrow
                this._scrollSpeed = -Math.min(50, Math.abs(this._scrollSpeed * 1.05));
                this._moveEther(this._scrollSpeed);
                break;
            default:
                return true;
        }
        this.closeBubble();
        
        SimileAjax.DOM.cancelEvent(event);
        return false;
    }
    return true;
},

_onKeyUp: function(event) {
    if (!this._dragging) {
        this._scrollSpeed = this._originalScrollSpeed;
        
        switch (event.keyCode) {
            case 35: // end
                this.setCenterVisibleDate(this._eventSource.getLatestDate());
                break;
            case 36: // home
                this.setCenterVisibleDate(this._eventSource.getEarliestDate());
                break;
            case 33: // page up
                this._autoScroll(this._timeline.getPixelLength());
                break;
            case 34: // page down
                this._autoScroll(-this._timeline.getPixelLength());
                break;
            default:
                return true;
        }
        
        this.closeBubble();
        
        SimileAjax.DOM.cancelEvent(event);
        return false;
    }
    return true;
},

_autoScroll: function(distance, f) {
    var b = this;
    var a = SimileAjax.Graphics.createAnimation(
        function(abs, diff) {
            b._moveEther(diff);
        }, 
        0, 
        distance, 
        1000, 
        f
    );
    a.run();
},

_moveEther: function(shift, orthogonalShift) {
    if (orthogonalShift === undefined) {
        orthogonalShift = 0;
    }
    
    this.closeBubble();
    
    // A positive shift means back in time
    // Check that we're not moving beyond Timeline's limits
    if (!this._timeline.shiftOK(this._index, shift)) {
        return; // early return
    }

    this._viewOffset += shift;
    this._ether.shiftPixels(-shift);
    if (this._timeline.isHorizontal()) {
        this._div.style.left = this._viewOffset + "px";
    } else {
        this._div.style.top = this._viewOffset + "px";
    }
    
    if (this._supportsOrthogonalScrolling) {
        if (this._eventPainter.getOrthogonalExtent() <= this.getViewWidth()) {
            this._viewOrthogonalOffset = 0;
        } else {
            this._viewOrthogonalOffset = this._viewOrthogonalOffset + orthogonalShift;
        }
    }
    
    if (this._viewOffset > -this._viewLength * 0.5 ||
        this._viewOffset < -this._viewLength * (Timeline._Band.SCROLL_MULTIPLES - 1.5)) {
        
        this._recenterDiv();
    } else {
        this.softLayout();
    }    
    
    this._onChanging();
},

_onChanging: function() {
    this._changing = true;

    this._fireOnScroll();
    this._setSyncWithBandDate();
    
    this._changing = false;
},

busy: function() {
    // Is this band busy changing other bands?
    return(this._changing);
},

_fireOnScroll: function() {
    for (var i = 0; i < this._onScrollListeners.length; i++) {
        this._onScrollListeners[i](this);
    }
},

_fireOnOrthogonalScroll: function() {
    for (var i = 0; i < this._onOrthogonalScrollListeners.length; i++) {
        this._onOrthogonalScrollListeners[i](this);
    }
},

_setSyncWithBandDate: function() {
    if (this._syncWithBand) {
        var centerDate = this._ether.pixelOffsetToDate(this.getViewLength() / 2);
        this._syncWithBand.setCenterVisibleDate(centerDate);
    }
},

_onHighlightBandScroll: function() {
    if (this._syncWithBand) {
        var centerDate = this._syncWithBand.getCenterVisibleDate();
        var centerPixelOffset = this._ether.dateToPixelOffset(centerDate);
        
        this._moveEther(Math.round(this._viewLength / 2 - centerPixelOffset));
        this._positionHighlight();
    }
},

_onHighlightBandOrthogonalScroll: function() {
    if (this._syncWithBand) {
        this._positionHighlight();
    }
},

_onAddMany: function() {
    this._paintEvents();
    this._timeline.layout();
},

_onClear: function() {
    this._paintEvents();
},

_positionHighlight: function() {
    if (this._syncWithBand) {
        var startDate = this._syncWithBand.getMinVisibleDate();
        var endDate = this._syncWithBand.getMaxVisibleDate();
        
        if (this._highlight) {
            var offset = 0; // percent
            var extent = 1.0; // percent
            var syncEventPainter = this._syncWithBand.getEventPainter();
            if ("supportsOrthogonalScrolling" in syncEventPainter && 
                syncEventPainter.supportsOrthogonalScrolling()) {

                var orthogonalExtent = syncEventPainter.getOrthogonalExtent();
                var visibleWidth = this._syncWithBand.getViewWidth();
                var totalWidth = Math.max(visibleWidth, orthogonalExtent);
                extent = visibleWidth / totalWidth;
                offset = -this._syncWithBand.getViewOrthogonalOffset() / totalWidth;
            }
            
            this._etherPainter.setHighlight(startDate, endDate, offset, extent);
        }
    }
},

_recenterDiv: function() {
    this._viewOffset = -this._viewLength * (Timeline._Band.SCROLL_MULTIPLES - 1) / 2;
    if (this._timeline.isHorizontal()) {
        this._div.style.left = this._viewOffset + "px";
        this._div.style.width = (Timeline._Band.SCROLL_MULTIPLES * this._viewLength) + "px";
    } else {
        this._div.style.top = this._viewOffset + "px";
        this._div.style.height = (Timeline._Band.SCROLL_MULTIPLES * this._viewLength) + "px";
    }
    this.layout();
},

_paintEvents: function() {
    this._eventPainter.paint();
    this._showScrollbar();
    this._fireOnOrthogonalScroll();
},

    _softPaintEvents: function () {
        this._eventPainter.softPaint();
    },

    _paintDecorators: function () {
        for (var i = 0; i < this._decorators.length; i++) {
            this._decorators[i].paint();
        }
    },

    _softPaintDecorators: function () {
        for (var i = 0; i < this._decorators.length; i++) {
            this._decorators[i].softPaint();
        }
    },

    closeBubble: function () {
        SimileAjax.WindowManager.cancelPopups();
    },

    _bounceBack: function (f) {
        if (!this._supportsOrthogonalScrolling) {
            return;
        }

        var target = 0;
        if (this._viewOrthogonalOffset < 0) {
            var orthogonalExtent = this._eventPainter.getOrthogonalExtent();
            if (this._viewOrthogonalOffset + orthogonalExtent >= this.getViewWidth()) {
                target = this._viewOrthogonalOffset;
            } else {
                target = Math.min(0, this.getViewWidth() - orthogonalExtent);
            }
        }

        if (target != this._viewOrthogonalOffset) {
            var self = this;
            SimileAjax.Graphics.createAnimation(
                function (abs, diff) {
                    self._viewOrthogonalOffset = abs;
                    self._eventPainter.softPaint();
                    self._showScrollbar();
                    self._fireOnOrthogonalScroll();
                },
                this._viewOrthogonalOffset,
                target,
                300,
                function () {
                    self._hideScrollbar();
                }
            ).run();
        } else {
            this._hideScrollbar();
        }
    },

    _showScrollbar: function () {
        if (!this._supportsOrthogonalScrolling) {
            return;
        }

        var orthogonalExtent = this._eventPainter.getOrthogonalExtent();
        var visibleWidth = this.getViewWidth();
        var totalWidth = Math.max(visibleWidth, orthogonalExtent);
        var ratio = (visibleWidth / totalWidth);
        var thumbWidth = Math.round(visibleWidth * ratio) + "px";
        var thumbOffset = Math.round(-this._viewOrthogonalOffset * ratio) + "px";
        var thumbThickness = 12;

        var thumb = this._scrollBar.firstChild;
        if (this._timeline.isHorizontal()) {
            this._scrollBar.style.top = this._div.style.top;
            this._scrollBar.style.height = this._div.style.height;

            this._scrollBar.style.right = "0px";
            this._scrollBar.style.width = thumbThickness + "px";

            thumb.style.top = thumbOffset;
            thumb.style.height = thumbWidth;
        } else {
            this._scrollBar.style.left = this._div.style.left;
            this._scrollBar.style.width = this._div.style.width;

            this._scrollBar.style.bottom = "0px";
            this._scrollBar.style.height = thumbThickness + "px";

            thumb.style.left = thumbOffset;
            thumb.style.width = thumbWidth;
        }

        if (ratio >= 1 && this._viewOrthogonalOffset == 0) {
            this._scrollBar.style.display = "none";
        } else {
            this._scrollBar.style.display = "block";
        }
    },

    _hideScrollbar: function () {
        if (!this._supportsOrthogonalScrolling) {
            return;
        }
        //this._scrollBar.style.display = "none";
    },

    _cancelEvent: function (evt) {
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    }
});
