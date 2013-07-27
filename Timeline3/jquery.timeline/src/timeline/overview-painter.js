/*==================================================
 *  Overview Event Painter
 *==================================================
 */

Timeline.OverviewEventPainter = function(params) {
    this._params = params;
    this._onSelectListeners = [];
    
    this._filterMatcher = null;
    this._highlightMatcher = null;
};

$.extend(Timeline.OverviewEventPainter.prototype, {
    initialize: function (band, timeline) {
        this._band = band;
        this._timeline = timeline;

        this._eventLayer = null;
        this._highlightLayer = null;
    },

    getType: function () {
        return 'overview';
    },

    addOnSelectListener: function (listener) {
        this._onSelectListeners.push(listener);
    },

    removeOnSelectListener: function (listener) {
        for (var i = 0; i < this._onSelectListeners.length; i++) {
            if (this._onSelectListeners[i] == listener) {
                this._onSelectListeners.splice(i, 1);
                break;
            }
        }
    },

    getFilterMatcher: function () {
        return this._filterMatcher;
    },

    setFilterMatcher: function (filterMatcher) {
        this._filterMatcher = filterMatcher;
    },

    getHighlightMatcher: function () {
        return this._highlightMatcher;
    },

    setHighlightMatcher: function (highlightMatcher) {
        this._highlightMatcher = highlightMatcher;
    },

    paint: function () {
        var eventSource = this._band.getEventSource();
        if (eventSource == null) {
            return;
        }

        this._prepareForPainting();

        var eventTheme = this._params.theme.event;
        var metrics = {
            trackOffset: eventTheme.overviewTrack.offset,
            trackHeight: eventTheme.overviewTrack.height,
            trackGap: eventTheme.overviewTrack.gap,
            trackIncrement: eventTheme.overviewTrack.height + eventTheme.overviewTrack.gap
        }

        var minDate = this._band.getMinDate();
        var maxDate = this._band.getMaxDate();

        var filterMatcher = (this._filterMatcher != null) ?
            this._filterMatcher :
            function (evt) { return true; };
        var highlightMatcher = (this._highlightMatcher != null) ?
            this._highlightMatcher :
            function (evt) { return -1; };

        var iterator = eventSource.getEventReverseIterator(minDate, maxDate);
        while (iterator.hasNext()) {
            var evt = iterator.next();
            if (filterMatcher(evt)) {
                this.paintEvent(evt, metrics, this._params.theme, highlightMatcher(evt));
            }
        }

        this._highlightLayer.style.display = "block";
        this._eventLayer.style.display = "block";
        // update the band object for max number of tracks in this section of the ether
        this._band.updateEventTrackInfo(this._tracks.length, metrics.trackIncrement);
    },

    softPaint: function () {
    },

    _prepareForPainting: function () {
        var band = this._band;

        this._tracks = [];

        if (this._highlightLayer != null) {
            band.removeLayerDiv(this._highlightLayer);
        }
        this._highlightLayer = band.createLayerDiv(105, "timeline-band-highlights").get(0);

        if (this._eventLayer != null) {
            band.removeLayerDiv(this._eventLayer);
        }
        this._eventLayer = band.createLayerDiv(110, "timeline-band-events").get(0);
    },

    paintEvent: function (evt, metrics, theme, highlightIndex) {
        if (evt.isInstant()) {
            this.paintInstantEvent(evt, metrics, theme, highlightIndex);
        } else {
            this.paintDurationEvent(evt, metrics, theme, highlightIndex);
        }
    },

    paintInstantEvent: function (evt, metrics, theme, highlightIndex) {
        var startDate = evt.getStart();
        var startPixel = Math.round(this._band.dateToPixelOffset(startDate));

        var color = evt.getColor(),
            klassName = evt.getClassName();
        if (klassName) {
            color = null;
        } else {
            color = color != null ? color : theme.event.duration.color;
        }

        var tickElmtData = this._paintEventTick(evt, startPixel, color, 100, metrics, theme);

        this._createHighlightDiv(highlightIndex, tickElmtData, theme);
    },

    paintDurationEvent: function (evt, metrics, theme, highlightIndex) {
        var latestStartDate = evt.getLatestStart();
        var earliestEndDate = evt.getEarliestEnd();

        var latestStartPixel = Math.round(this._band.dateToPixelOffset(latestStartDate));
        var earliestEndPixel = Math.round(this._band.dateToPixelOffset(earliestEndDate));

        var tapeTrack = 0;
        for (; tapeTrack < this._tracks.length; tapeTrack++) {
            if (earliestEndPixel < this._tracks[tapeTrack]) {
                break;
            }
        }
        this._tracks[tapeTrack] = earliestEndPixel;

        var color = evt.getColor(),
            klassName = evt.getClassName();
        if (klassName) {
            color = null;
        } else {
            color = color != null ? color : theme.event.duration.color;
        }

        var tapeElmtData = this._paintEventTape(evt, tapeTrack, latestStartPixel, earliestEndPixel,
          color, 100, metrics, theme, klassName);

        this._createHighlightDiv(highlightIndex, tapeElmtData, theme);
    },

    _paintEventTape: function (
        evt, track, left, right, color, opacity, metrics, theme, klassName) {

        var top = metrics.trackOffset + track * metrics.trackIncrement;
        var width = right - left;
        var height = metrics.trackHeight;

        var tapeDiv = $("div class='timeline-small-event-tape" + (klassName ? " small-" + klassName : "") + "'/>")
            .css({
                left: left + "px",
                width: width + "px",
                top: top + "px",
                height: height + "px"
            }).appendTo(this._eventLayer);

        if (color) {
            tapeDiv.css("backgroundColor", color); // set color here if defined by event. Else use css
        }

        if (opacity < 100) SimileAjax.Graphics.setOpacity(tapeDiv.get(0), opacity);

        return {
            left: left,
            top: top,
            width: width,
            height: height,
            elmt: tapeDiv.get(0)
        };
    },

    _paintEventTick: function (
        evt, left, color, opacity, metrics, theme) {

        var height = theme.event.overviewTrack.tickHeight;
        var top = metrics.trackOffset - height;
        var width = 1;

        var tickDiv = this._timeline.getDocument().createElement("div");
        tickDiv.className = 'timeline-small-event-icon'
        tickDiv.style.left = left + "px";
        tickDiv.style.top = top + "px";
        //  tickDiv.style.width = width + "px";
        //  tickDiv.style.position = "absolute";
        //  tickDiv.style.height = height + "px";
        //  tickDiv.style.backgroundColor = color;
        //  tickDiv.style.overflow = "hidden";

        var klassName = evt.getClassName()
        if (klassName) { tickDiv.className += ' small-' + klassName };

        if (opacity < 100) { SimileAjax.Graphics.setOpacity(tickDiv, opacity); }

        this._eventLayer.appendChild(tickDiv);

        return {
            left: left,
            top: top,
            width: width,
            height: height,
            elmt: tickDiv
        };
    },

    _createHighlightDiv: function (highlightIndex, dimensions, theme) {
        if (highlightIndex >= 0) {
            var doc = this._timeline.getDocument();
            var eventTheme = theme.event;

            var color = eventTheme.highlightColors[Math.min(highlightIndex, eventTheme.highlightColors.length - 1)];

            var div = doc.createElement("div");
            div.style.position = "absolute";
            div.style.overflow = "hidden";
            div.style.left = (dimensions.left - 1) + "px";
            div.style.width = (dimensions.width + 2) + "px";
            div.style.top = (dimensions.top - 1) + "px";
            div.style.height = (dimensions.height + 2) + "px";
            div.style.background = color;

            this._highlightLayer.appendChild(div);
        }
    },

    showBubble: function (evt) {
        // not implemented
    }
});
