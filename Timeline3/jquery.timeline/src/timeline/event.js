Timeline.Event = function (args) {
    //
    // args is a hash/object. It supports the following keys. Most are optional
    //   id            -- an internal id. Really shouldn't be used by events.
    //                    Timeline library clients should use eventID
    //   eventID       -- For use by library client when writing custom painters or
    //                    custom fillInfoBubble    
    //   start
    //   end
    //   latestStart
    //   earliestEnd
    //   instant      -- boolean. Controls precise/non-precise logic & duration/instant issues
    //   text         -- event source attribute 'title' -- used as the label on Timelines and in bubbles.
    //   bubbleTitle  -- used as the title header in bubbles; if not specified text will be used for this.
    //   description  -- used in bubbles   
    //   image        -- used in bubbles
    //   link         -- used in bubbles
    //   icon         -- on the Timeline
    //   color        -- Timeline label and tape color
    //   textColor    -- Timeline label color, overrides color attribute
    //   hoverText    -- deprecated, here for backwards compatibility.
    //                   Superceeded by caption
    //   caption      -- tooltip-like caption on the Timeline. Uses HTML title attribute 
    //   classname    -- used to set classname in Timeline. Enables better CSS selector rules
    //   tapeImage    -- background image of the duration event's tape div on the Timeline
    //   tapeRepeat   -- repeat attribute for tapeImage. {repeat | repeat-x | repeat-y }

    function cleanArg(arg) {
        // clean up an arg
        return (args[arg] != null && args[arg] != "") ? args[arg] : null;
    }

    var id = args.id ? args.id.trim() : "";
    this._id = id.length > 0 ? id : Timeline.EventUtils.getNewEventID();

    this._instant = args.instant || (args.end == null);

    this._start = args.start;
    this._end = (args.end != null) ? args.end : args.start;

    this._latestStart = (args.latestStart != null) ?
                        args.latestStart : (args.instant ? this._end : this._start);
    this._earliestEnd = (args.earliestEnd != null) ? args.earliestEnd : this._end;

    // check sanity of dates since incorrect dates will later cause calculation errors
    // when painting
    var err = [];
    if (this._start > this._latestStart) {
        this._latestStart = this._start;
        err.push("start is > latestStart");
    }
    if (this._start > this._earliestEnd) {
        this._earliestEnd = this._latestStart;
        err.push("start is > earliestEnd");
    }
    if (this._start > this._end) {
        this._end = this._earliestEnd;
        err.push("start is > end");
    }
    if (this._latestStart > this._earliestEnd) {
        this._earliestEnd = this._latestStart;
        err.push("latestStart is > earliestEnd");
    }
    if (this._latestStart > this._end) {
        this._end = this._earliestEnd;
        err.push("latestStart is > end");
    }
    if (this._earliestEnd > this._end) {
        this._end = this._earliestEnd;
        err.push("earliestEnd is > end");
    }

    this._eventID = cleanArg('eventID');
    //this._text = (args.text != null) ? SimileAjax.HTML.deEntify(args.text) : ""; // Change blank titles to ""
    this._text = args.text == null ? "" : args.text;
    if (err.length > 0) {
        this._text += " PROBLEM: " + err.join(", ");
    }
    this._bubbleTitle = args.bubbleTitle;

    this._description = args.description;//SimileAjax.HTML.deEntify(args.description);
    this._image = cleanArg('image');
    this._link = cleanArg('link');
    this._title = cleanArg('hoverText');
    this._title = cleanArg('caption');

    this._icon = cleanArg('icon');
    this._color = cleanArg('color');
    this._textColor = cleanArg('textColor');
    this._classname = cleanArg('classname');
    this._tapeImage = cleanArg('tapeImage');
    this._tapeRepeat = cleanArg('tapeRepeat');
    this._trackNum = cleanArg('trackNum');
    if (this._trackNum != null) {
        this._trackNum = parseInt(this._trackNum);
    }

    //this._wikiURL = null;
    //this._wikiSection = null;
};

$.extend(Timeline.Event.prototype, {
    getID: function () { return this._id; },

    isInstant: function () { return this._instant; },
    isImprecise: function () { return this._start != this._latestStart || this._end != this._earliestEnd; },

    getStart: function () { return this._start; },
    getEnd: function () { return this._end; },
    getLatestStart: function () { return this._latestStart; },
    getEarliestEnd: function () { return this._earliestEnd; },

    getEventID: function () { return this._eventID; },
    getText: function () { return this._text; }, // title
    getBubbleTitle: function () { return this._bubbleTitle; },
    getDescription: function () { return this._description; },
    getImage: function () { return this._image; },
    getLink: function () { return this._link; },

    getIcon: function () { return this._icon; },
    getColor: function () { return this._color; },
    getTextColor: function () { return this._textColor; },
    getClassName: function () { return this._classname; },
    getTapeImage: function () { return this._tapeImage; },
    getTapeRepeat: function () { return this._tapeRepeat; },
    getTrackNum: function () { return this._trackNum; },

    getProperty: function (name) { return null; },

    fillInfoBubble: function (elmt, theme, labeller) {
        var doc = elmt.ownerDocument;

        var title = this.getBubbleTitle()?this.getBubbleTitle():this.getText(),
            link = this.getLink(),
            image = this.getImage(),
            desc = this.getDescription();


        if (image != null) {
            theme.event.bubble.imageStyler(
                $("<img src='" + image + "'/>").appendTo(elmt).get(0));
        }

        theme.event.bubble.titleStyler($("<div>" + (link ? "<a href='" + link + "'>" : "") + title + (link ? "</a>" : "") + "</div>").appendTo(elmt).get(0));
        theme.event.bubble.bodyStyler($("<div>" + this.getDescription() + "</div>").appendTo(elmt).get(0));
    }
});
