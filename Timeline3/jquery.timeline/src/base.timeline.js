window.Timeline = {
    DateTime: SimileAjax.DateTime,
    urlPrefix: "/jquery.timeline/content/",
    clientLocale: "en",
    version: '4.0.2',
    strings: []
};

function SyrinxTimeline(element, options) {
    var self = this,
        $el = self.$el = $(element);
    var op = self.options = $.extend({}, self.defaultOptions, self.getObject($el.data("timelineOptions")), options),
        bands = [];
    $(op.bands).each(function (index) {
        var etherPainter = this.etherPainter,
            hi = this.highlight,
            theme = this.theme,
            bi = Timeline.createBandInfo(this);

        if (etherPainter)
            bi.etherPainter = etherPainter;
        if (hi)
            bi.highlight = hi;
        if (theme)
            bi.theme = theme;
        if(index > 0)
            bi.syncWith = 0;
        bands.push(bi);
    });
    $(window).on("resize", function (event) {
        clearTimeout(self._resizeTimer);
        self._resizeTimer = setTimeout(function () {
            self.layout();
        }, 300);
     });


    self.timeline = Timeline.create(element, bands, options.direction);
    bands = self.timeline.getBands();
    bands[0].addOnScrollListener(function () {
        $el.trigger("timeline-scroll", [bands]);
    });
    $(bands).each(function (i,band) {
        this.getEventPainter().addOnSelectListener(function () {
            $el.trigger("timeline-event-select",[band]);
        });
    });


    self.layout();
}

SyrinxTimeline.prototype = {
    defaultOptions: {
        direction: Timeline.HORIZONTAL
    },

    getOptions: function () {
        return this.options;
    },

    getObject: function (css) {
        if (typeof (css) == "string")
            return (css != null && css.length != 0) ? eval("(" + css + ")") : null;
        return css;
    },

    layout: function () {
        this.timeline.layout();
    }
};

$.fn.syrinxTimeline = function (op) {
    var passed = Array.prototype.slice.call(arguments, 1);
    var rc = this;
    this.each(function () {
        var plugin = $(this).data('SyrinxTimeline');
        if (undefined === plugin) {
            var $el = $(this);
            plugin = new SyrinxTimeline(this, op);
            $el.data('SyrinxTimeline', plugin, this.href);
        }
        else if (plugin[op]) {
            rc = plugin[op].apply(plugin, passed);
        }
    });
    return rc;
}
