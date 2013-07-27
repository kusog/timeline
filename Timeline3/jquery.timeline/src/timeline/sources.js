/*==================================================
 *  Default Event Source
 *==================================================
 */


Timeline.DefaultEventSource = function(eventIndex) {
    this._events = (eventIndex instanceof Object) ? eventIndex : new SimileAjax.EventIndex();
    this._listeners = [];
};

$.extend(Timeline.DefaultEventSource.prototype, {
    addListener: function(listener) {
        this._listeners.push(listener);
    },

    removeListener: function(listener) {
        for (var i = 0; i < this._listeners.length; i++) {
            if (this._listeners[i] == listener) {
                this._listeners.splice(i, 1);
                break;
            }
        }
    },

    loadXML: function(xml, url) {
        var base = this._getBaseURL(url);
    
        //var wikiURL = xml.documentElement.getAttribute("wiki-url");
        //var wikiSection = xml.documentElement.getAttribute("wiki-section");

        var dateTimeFormat = xml.documentElement.getAttribute("date-time-format");
        var parseDateTimeFunction = this._events.getUnit().getParser(dateTimeFormat);

        var node = xml.documentElement.firstChild;
        var added = false;
        while (node != null) {
            if (node.nodeType == 1) {
                var description = "";
                if (node.firstChild != null && node.firstChild.nodeType == 3) {
                    description = node.firstChild.nodeValue;
                }
                // instant event: default is true. Or use values from isDuration or durationEvent
                var instant = (node.getAttribute("isDuration")    === null &&
                               node.getAttribute("durationEvent") === null) ||
                              node.getAttribute("isDuration") == "false" ||
                              node.getAttribute("durationEvent") == "false";
            
                var evt = new Timeline.Event( {
                    id: node.getAttribute("id"),
                    start: parseDateTimeFunction(node.getAttribute("start")),
                    end: parseDateTimeFunction(node.getAttribute("end")),
                    latestStart: parseDateTimeFunction(node.getAttribute("latestStart")),
                    earliestEnd: parseDateTimeFunction(node.getAttribute("earliestEnd")),
                    instant: instant,
                    text: node.getAttribute("title"),
                    bubbleTitle: node.getAttribute("bubbleTitle"),
                    description: description,
                    image: this._resolveRelativeURL(node.getAttribute("image"), base),
                    link: this._resolveRelativeURL(node.getAttribute("link") , base),
                    icon: this._resolveRelativeURL(node.getAttribute("icon") , Timeline.urlPrefix + "images/"),
                    color: node.getAttribute("color"),
                    textColor: node.getAttribute("textColor"),
                    hoverText: node.getAttribute("hoverText"),
                    classname: node.getAttribute("classname"),
                    tapeImage: node.getAttribute("tapeImage"),
                    tapeRepeat: node.getAttribute("tapeRepeat"),
                    caption: node.getAttribute("caption"),
                    eventID: node.getAttribute("eventID"),
                    trackNum: node.getAttribute("trackNum")
                });

                evt._node = node;
                evt.getProperty = function(name) {
                    return this._node.getAttribute(name);
                };
                //evt.setWikiInfo(wikiURL, wikiSection);
            
                this._events.add(evt);
            
                added = true;
            }
            node = node.nextSibling;
        }

        if (added) {
            this._fire("onAddMany", []);
        }
    },

    loadJSON: function(data, url) {
        var base = this._getBaseURL(url);
        var added = false;  
        if (data && data.events){
            //var wikiURL = ("wikiURL" in data) ? data.wikiURL : null;
            //var wikiSection = ("wikiSection" in data) ? data.wikiSection : null;
    
            var dateTimeFormat = ("dateTimeFormat" in data) ? data.dateTimeFormat : null;
            var parseDateTimeFunction = this._events.getUnit().getParser(dateTimeFormat);
       
            for (var i=0; i < data.events.length; i++){
                var evnt = data.events[i];
            
                // New feature: attribute synonyms. The following attribute names are interchangable.
                // The shorter names enable smaller load files.
                //    eid -- eventID
                //      s -- start
                //      e -- end
                //     ls -- latestStart
                //     ee -- earliestEnd
                //      d -- description
                //     de -- durationEvent
                //      t -- title,
                //      c -- classname

                // Fixing issue 33:
                // instant event: default (for JSON only) is false. Or use values from isDuration or durationEvent
                // isDuration was negated (see issue 33, so keep that interpretation
                var instant = evnt.isDuration ||
                              (('durationEvent' in evnt) && !evnt.durationEvent) ||
                              (('de' in evnt) && !evnt.de);
                var evt = new Timeline.Event({
                    id: ("id" in evnt) ? evnt.id : undefined,
                    start: parseDateTimeFunction(evnt.start || evnt.s),
                    end: parseDateTimeFunction(evnt.end || evnt.e),
                    latestStart: parseDateTimeFunction(evnt.latestStart || evnt.ls),
                    earliestEnd: parseDateTimeFunction(evnt.earliestEnd || evnt.ee),
                    instant: instant,
                    text: evnt.title || evnt.t,
                    bubbleTitle: evnt.bubbleTitle || evnt.bt,
                    description: evnt.description || evnt.d,
                    image: this._resolveRelativeURL(evnt.image, base),
                    link: this._resolveRelativeURL(evnt.link, base),
                    icon: this._resolveRelativeURL(evnt.icon, Timeline.urlPrefix + "images/"),
                    color: evnt.color,                                      
                    textColor: evnt.textColor,
                    hoverText: evnt.hoverText,
                    classname: evnt.classname || evnt.c,
                    tapeImage: evnt.tapeImage,
                    tapeRepeat: evnt.tapeRepeat,
                    caption: evnt.caption,
                    eventID: evnt.eventID  || evnt.eid,
                    trackNum: evnt.trackNum
                });
                evt._obj = evnt;
                evt.getProperty = function(name) {
                    return this._obj[name];
                };
                //evt.setWikiInfo(wikiURL, wikiSection);

                this._events.add(evt);
                added = true;
            }
        }
   
        if (added) {
            this._fire("onAddMany", []);
        }
    },

    add: function(evt) {
        this._events.add(evt);
        this._fire("onAddOne", [evt]);
    },

    addMany: function(events) {
        for (var i = 0; i < events.length; i++) {
            this._events.add(events[i]);
        }
        this._fire("onAddMany", []);
    },

    clear: function() {
        this._events.removeAll();
        this._fire("onClear", []);
    },

    getEvent: function(id) {
        return this._events.getEvent(id);
    },

    getEventIterator: function(startDate, endDate) {
        return this._events.getIterator(startDate, endDate);
    },

    getEventReverseIterator: function(startDate, endDate) {
        return this._events.getReverseIterator(startDate, endDate);
    },

    getAllEventIterator: function() {
        return this._events.getAllIterator();
    },

    getCount: function() {
        return this._events.getCount();
    },

    getEarliestDate: function() {
        return this._events.getEarliestDate();
    },

    getLatestDate: function() {
        return this._events.getLatestDate();
    },

    _fire: function(handlerName, args) {
        for (var i = 0; i < this._listeners.length; i++) {
            var listener = this._listeners[i];
            if (handlerName in listener) {
                try {
                    listener[handlerName].apply(listener, args);
                } catch (e) {
                    //SimileAjax.Debug.exception(e);
                }
            }
        }
    },

    _getBaseURL: function(url) {
        if (url.indexOf("://") < 0) {
            var url2 = this._getBaseURL(document.location.href);
            if (url.substr(0,1) == "/") {
                url = url2.substr(0, url2.indexOf("/", url2.indexOf("://") + 3)) + url;
            } else {
                url = url2 + url;
            }
        }
    
        var i = url.lastIndexOf("/");
        if (i < 0) {
            return "";
        } else {
            return url.substr(0, i+1);
        }
    },

    _resolveRelativeURL: function(url, base) {
        if (url == null || url == "") {
            return url;
        } else if (url.indexOf("://") > 0) {
            return url;
        } else if (url.substr(0,1) == "/") {
            return base.substr(0, base.indexOf("/", base.indexOf("://") + 3)) + url;
        } else {
            return base + url;
        }
    }
});




