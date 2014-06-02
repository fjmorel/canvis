// CanVis jQuery plugin version 1.2.1
// (c) 2013 Ben Pickles
// http://benpickles.github.io/canvis
//
// CanVis jQuery plugin version 0.9.0
// (c) 2014 Fred Morel
// http://fmorel90.github.io/canvis
//
// Released under MIT license.
(function($, Math, pluginName, mouseData) {
	var canvasSupported = document.createElement("canvas").getContext;

	//Create object with defaults and drawers
	var CanVis = function($el, type, opt) { this.$el = $el; this.type = type; this.opt = opt; };
	//Minifies references to the prototype
	var CanVisPrototype = CanVis.prototype;

	var canvis = $.fn.canvis = function(type, options) {
		if(canvasSupported) {
			this.each(function() {
				//See if element is already a CanVis chart and load
				var $this = $(this);
				var chart = $this.data(pluginName);

				if(chart) {
					//If chart already exists, pass new options and redraw
					if(type) { chart.type = type; }
					$.extend(true, chart.opt, options);
					chart.draw();
				} else {
					//Initialize with defaults
					var defaults = canvis.defaults[type];
					//Then load from data attributes on element
					var data = {};
					$.each($this.data(), function(name, value) { data[name] = value; });
					//Then combine with passed options
					var opt = $.extend({}, defaults, data, options);

					//Create and draw
					chart = new CanVis($this, type, opt);
					chart.draw();

					//Adds change handler that redraws the chart
					$this.change(function() { chart.draw(); }).data(pluginName, chart);
				}
			});
		}
		return this;
	};

	CanVisPrototype.draw = function() { canvis.graphers[this.type].call(this, this.opt); };

	//Prepare a canvas element to draw on
	CanVisPrototype.createCanvas = function(width, height) {
		var self = this;
		var canvas = self.canvas;

		//If pre-existing canvas, clear it, otherwise create it.
		if(!canvas) {
			self.canvas = canvas = $("<canvas/>", { class: pluginName })[0];
			self.context = canvas.getContext("2d", {alpha: false});
			self.$el.hide().removeData(mouseData).after(canvas);
		}
		canvas.width = width;//Reset width to clear it instead of drawing blank rectangle. Fixes flicker in Firefox
		canvas.height = height;
		Drawers.rect(self.context, 0, 0, width, height, "#fff", 0);//Draw white background. Necessary since canvas is opaque black with alpha:false option.
		$(canvas).css({ height: height, width: width }).data(pluginName, self);
		return canvas;
	};

	//Splits values string into array by delimiter and returns the numbers. Split into multiple series if necessary 
	CanVisPrototype.values = function() {
		//Parse all values of an array as floats
		var parser = function(e) { return parseFloat(e); };
		var delims = arguments;
		var text = this.$el.text().split(delims[0]);
		if(delims.length === 1) { return text.map(parser); }
		return text.map(function(e) { return e.split(delims[1]).map(parser); });
	};

	//Default properties for an axis/tooltip (font color and size, plus label formatter)
	var DefaulTextProperties = function() { return { color: "#000", size: 13, formatter: function(e) { return e; } }; };
	//Some common code that's not categorized
	var Helpers = {
		//Figures out how many levels a label will take (split by space)
		labelLevels: function(labels) { return Math.max.apply(this, labels.map(function(e) { return e.replace(/[^ ]/g, "").length; })) + 1; },
		//Given values and formatter, returns strings for text output
		toString: function(values, formatter) {
			if(formatter) { return values.map(function(e) { return "" + formatter(e); }); }
			return values.map(function(e) { return "" + e; });
		},
		//Function to extract given property from object
		extractor: function(propName) { return function(e) { return e[propName]; }; },
		//Convert array of items to function that returns those
		toFunction: function(items) {
			//If given an array of fills (multiple colors for one series and/or multiple series
			if($.isArray(items)) {
				//If first item is sub-array or function, that means there are multiple series
				if($.isArray(items[0]) || $.isFunction(items[0])) {
					//Return array of functions (original function if given, otherwise function to return relevant array element
					return items.map(function(e) {
						if($.isFunction(e)) { return e; }
						return function(value, i) { return e[i % e.length]; };
					});
				}
				//If only one series, return function to return relevant element
				return function(value, i) { return items[i % items.length]; };
			}
			//If any other type of object or already a function, return it
			return items;
		},
		//Labels size of string if drawn
		getWidth: function(context, string) { return context.measureText(string).width; }
	};

	//Add event listeners to charts to redraw hover effects
	CanVisPrototype.addEvents = function() {
		$(this.canvas).on('mousemove mouseout', function(evt) {
			var rect = this.getBoundingClientRect();
			$(this).off().prev().data(mouseData, JSON.stringify({ x: evt.clientX - rect.left, y: evt.clientY - rect.top })).change();
		});
	};

	//Function to draw specific items
	var Drawers = {
		strokeLine_ : function(context, width, color){
			context.lineWidth = width;
			context.strokeStyle = color;
			context.stroke();
		},
		arc: function(context, x, y, r, start, end, color, width) {
			//x & y are center coordinates. r = radius. start & end are radians for arc. Color & width for stroke
			context.beginPath();
			context.arc(x, y, r, start, end, true);//true = counterclockwise
			Drawers.strokeLine_(context, width, color);
		},
		circle: function(context, x, y, r, start, end, color) {
			context.beginPath();
			context.moveTo(x, y);
			context.arc(x, y, r, start, end, true);//true = counterclockwise
			context.fillStyle = color;
			context.fill();
		},
		line: function(context, points, color, width) {
			context.beginPath();
			for(var i = 0; i < points.length; i++) { context.lineTo(Math.round(points[i].x), Math.round(points[i].y)); }
			Drawers.strokeLine_(context, width, color);
		},
		rect: function(context, x, y, width, height, fill, strokeWidth, stroke) {
			x=Math.round(x);y=Math.round(y);
			width=Math.round(width);height=Math.round(height);
			if(fill) {
				context.fillStyle = fill;
				context.fillRect(x, y, width, height);
			}
			if(stroke) {
				context.strokeStyle = stroke;
				context.lineWidth = strokeWidth;
				context.strokeRect(x, y, width, height);
			}

		}
	};

	//Draw tooltip for hovered value(s)
	Drawers.tooltip = function(context, x, y, values, names, colors, fontSize, fontColor, valueFormatter, label, labelFormatter) {
		//Set properties
		context.font = fontSize + "px sans-serif";
		context.textAlign = "left";
		context.textBaseline = "top";

		//Convert values to labels and measure longest
		values = Helpers.toString(values, valueFormatter).map(function(e, i) { return e !== "" ? names[i] !== "" ? names[i] + ": " + e : e : ""; });
		if(label) { values.splice(0, 0, Helpers.toString([label], labelFormatter)[0]); }
		values = values.filter(function(e) { return e !== ""; });
		var textWidth = Math.max.apply([], values.map(function(e) { return Helpers.getWidth(context, e); }));
		var blockWidth = Helpers.getWidth(context, "■");
		var totalLabelWidth = textWidth + blockWidth;

		//Move tooltip slightly left and adjust based on position within canvas and mouse
		x -= 6;
		var ySize = values.length * fontSize;
		if(y > ySize - 6) { y -= ySize; }
		if(x <= totalLabelWidth + 9) { x += totalLabelWidth + 20 + 9; }

		//Draw outlined rectangle for tooltip
		Drawers.rect(context, x - totalLabelWidth - 6, y - 3, totalLabelWidth + 8, ySize + 8, "#fff", 1, "#000");

		//Draw each label
		if(label) {
			context.fillStyle = fontColor;
			context.fillText(values.splice(0, 1)[0], x - totalLabelWidth - 2, y);
			y += fontSize;
		}
		values.forEach(function(e, i) {
			if(e === "") { return; }
			var labelY = y + i * fontSize;
			context.fillStyle = colors[i % colors.length];
			context.fillText("■", x - totalLabelWidth - 3, labelY);
			context.fillStyle = fontColor;
			context.fillText(e, x - textWidth - 2, labelY);
		});
	};

	//Default options and drawing functions per type
	canvis.defaults = {}; canvis.graphers = {};
	canvis.register = function(type, defaults, grapher) { this.defaults[type] = defaults; this.graphers[type] = grapher; };

	//Pie chart
	canvis.register("pie", {
		fill: ["#f90", "#ffd", "#fc6"],
		line: { color: "#000", width: 0 },
		focus: { color: "#000", width: 0 },
		delimiter: null,
		diameter: 16,
		tooltip: DefaulTextProperties(),
		label: DefaulTextProperties()
	},
		function(opt) {
			var self = this;
			var delimiter = opt.delimiter;
			if(!delimiter) {
				//Default to first non-digit and non-period character found, or comma
				delimiter = self.$el.text().match(/[^0-9\.]/);
				delimiter = delimiter ? delimiter[0] : ",";
			}
			var values = self.values.apply(self, [delimiter]);
			//If something like 3/5, then this makes 3 and 2
			if(delimiter === "/") { values = [values[0], values[1] - values[0]]; }

			var i, sum = 0, length = values.length;
			for(i = 0; i < length; i++) { sum += values[i]; }

			//Try width and height, but default to diameter (add 1 for a slight offset from edge)
			var hoverPos = self.$el.data(mouseData);
			var focus = opt.focus;
			var line = opt.line;
			var padding = Math.max(focus.width, line.width) + 1;
			var diameter = opt.diameter;
			var canvas = self.createCanvas(diameter + padding, diameter + padding);
			var context = self.context;
			var width = canvas.width;
			var height = canvas.height;
			var radius = width / 2 - padding;
			var pi = Math.PI;
			var tau = 2 * pi;
			var unit = tau / sum;
			var fill = Helpers.toFunction(opt.fill);
			var tooltip = opt.tooltip;
			var label = opt.label;
			var focusI, polarHover;
			//Identify labels and height needed to display them
			var labels = opt.labels;
			if(labels) { labels = Helpers.toString(labels); }

			if(focus.width && hoverPos) {
				polarHover = JSON.parse(hoverPos);
				//x and y are position from top left. r and a are radius and angle from center
				//Move origin from 0,0 to center of canvas
				polarHover.x -= width / 2;
				polarHover.y -= height / 2;
				polarHover.y *= -1;
				//Find polar coordinates
				polarHover.r = Math.sqrt(polarHover.x * polarHover.x + polarHover.y * polarHover.y);
				polarHover.a = Math.atan2(polarHover.y, polarHover.x);
				while(polarHover.a < 0) { polarHover.a += tau; }
				while(polarHover.a > tau) { polarHover.a -= tau; }
			}

			//Save state and then move axes to be in center
			context.save();
			context.translate(width / 2, height / 2);

			var value, slice, start = 0;
			for(i = 0; i < length; i++) {
				value = values[i];
				slice = value * unit;//Size of slice
				Drawers.circle(context, 0, 0, radius, -start, -(start + slice), fill.call(self, value, i, values));

				//Draw focus at hovered arc
				if(focus.width && polarHover && polarHover.a > start && polarHover.a < (start + slice) && polarHover.r < radius) {
					Drawers.arc(context, 0, 0, radius + focus.width / 2, -start, -(start + slice), focus.color, focus.width);
					focusI = i;
				}
				start += slice;
			}

			if(line.width) { Drawers.arc(context, 0, 0, radius + line.width / 2, 0, tau, line.color, line.width); }
			if(focus.width) {
				if(hoverPos && focusI !== undefined) {
					//Refetch in order to reset origin
					hoverPos = JSON.parse(hoverPos);
					context.restore();
					Drawers.tooltip(context, hoverPos.x, hoverPos.y, [values[focusI]], [opt.name || ""], [fill.call(self, values[focusI], focusI, values)], tooltip.size, tooltip.color, tooltip.formatter, labels ? labels[focusI] : undefined, label.formatter);
				}
				self.addEvents();
			}
		}
	);

	//Line and Bar chart
	canvis.register("combo", {
		series: [{ type: "bar", color: ["#48f"] }, { type: "line", color: ["#827"], width: 1, points: 3 }],
		delimiters: ["|", ","],
		height: 50, width: 200, left: 0, gap: 1, seriesGap: 0,
		max: null, min: 0,
		xAxis: DefaulTextProperties(), yAxis: DefaulTextProperties(), tooltip: DefaulTextProperties(),
		focus: { color: "#000", width: 0 },
		gridlines: { widths: [1, 0], colors: ["#000", "#bbb"] }
	},
		function(opt) {
			var typeBar = "bar", typeLine = "line", typeStep = "step";

			//Declare variables
			var self = this;

			//Find minimum and maximum in values to determine range
			var values = self.values.apply(self, opt.delimiters);
			var seriesNum = values.length;
			var allValues = [].concat.apply([opt.max, opt.min], values);
			var value, i, j, y, pieces;

			//Identify labels and height needed to display them
			var labels = opt.labels;
			var levels = 0;
			if(labels) {
				labels = Helpers.toString(labels);
				levels = Helpers.labelLevels(labels);
			}

			//Find range of values
			var maxLength = Math.max.apply(Math, values.map(function(e) { return e.length; }));
			var max = Math.max.apply(Math, allValues);
			var min = Math.min.apply(Math, allValues);
			var range = max - min;
			var region = opt.region || (range / 5);
			if(max !== 0) { max = Math.ceil(max + region / 2); }
			if(min !== 0) { min = Math.floor(min - region / 2); }
			range = (max - min) || 1;
			region = opt.region || (range / 5);

			//Formatting options
			var series = opt.series;
			var barSeries = series.filter(function(e) { return e.type === typeBar; });
			var barSeriesNum = barSeries.length;
			var yAxis = opt.yAxis;
			var xAxis = opt.xAxis;
			var focus = opt.focus;
			var tooltip = opt.tooltip;
			var gridlines = opt.gridlines;

			//Prepare canvas
			var hoverPos = self.$el.data(mouseData);
			var canvas = self.createCanvas(opt.width, opt.height);
			var context = self.context;
			
			//Size
			var fullWidth = canvas.width;
			var fullHeight = canvas.height;
			var gap = opt.gap;
			var seriesGap = opt.seriesGap;
			var left = opt.left;
			var bottom = levels * xAxis.size + (levels ? 4 : 0);
			var width = fullWidth - left;
			var height = fullHeight - bottom - gridlines.widths[0];


			//Value to Pixel conversion
			var yQuotient = max === min ? 0 : height / range;
			var xQuotient = (width - (gap * maxLength)) / maxLength;
			var valueToY = function() { return height - (yQuotient * (value - min)); };

			//Baseline
			if(gridlines.widths[0]) {
				value = 0;
				y = valueToY();
				Drawers.line(context, [{ x: left, y: y }, { x: fullWidth, y: y }], gridlines.colors[0], gridlines.widths[0]);
			}

			//Gridlines
			if(gridlines.widths[1]) {
				context.fillStyle = yAxis.color;
				context.font = yAxis.size + "px sans-serif";
				context.textAlign = "right";

				for(value = min; value <= max; value += region) {
					y = valueToY();
					Drawers.line(context, [{ x: left, y: y }, { x: fullWidth, y: y }], gridlines.colors[1], gridlines.widths[1]);
					if(left) {
						//Draw label (align based on position near edge
						context.textBaseline = y > yAxis.size / 2 ? y > height - yAxis.size / 2 ? "bottom" : "middle" : "top";
						context.fillText("" + yAxis.formatter(value), left - 2, y);
					}
				}
			}

			//Loop through values and draw each bar
			var boxes = [], box, barSeriesIndex = -1, currentBoxes, currentValues, currentType, currentSeries, currentColors;
			var midpoints = [];
			for(i = 0; i < maxLength; i++) { midpoints.push(left + (gap + xQuotient) * (1 / 2 + i)); }
			for(i = 0; i < seriesNum; i++) {
				currentValues = values[i];
				currentSeries = series[i];
				currentColors = currentSeries.color = Helpers.toFunction(currentSeries.color);
				currentType = currentSeries.type;

				if(currentType === typeBar) { barSeriesIndex++; }
				currentBoxes = [];
				for(j = 0; j < currentValues.length; j++) {
					value = currentValues[j];
					y = valueToY();
					if(currentType === typeBar) {
						box = {
							//left margin + group*groupWidth + groupWidth/#series*series + groupMargin
							x: left + gap / 2 + j * (gap + xQuotient) + xQuotient / barSeriesNum * barSeriesIndex,//x
							y: y,//y
							//groupWidth/#series
							w: xQuotient / barSeriesNum - seriesGap / 2,//w
							h: value === 0 ? 1 : yQuotient * value//h
						};
						Drawers.rect(context, box.x, box.y, box.w, box.h, currentColors.call(self, value, j, currentValues), 0);
					} else { box = { x: midpoints[j], y: y }; }
					currentBoxes[j] = box;

					if(currentType === typeStep && value) {
						Drawers.line(context, [{ x: midpoints[j] - xQuotient / 2 * 0.62, y: y }, { x: midpoints[j] + xQuotient / 2 * 0.62, y: y }], currentColors.call(self, value, j, currentValues), currentSeries.width);
					}
				}
				//Draw full line
				if(currentType === typeLine) {
					for(j = 0; j < currentBoxes.length; j++) { Drawers.circle(context, currentBoxes[j].x, currentBoxes[j].y, currentSeries.points, 0, 2 * Math.PI, currentColors.call(self, currentValues[j], j, currentValues)); }
					Drawers.line(context, currentBoxes, currentColors.call(self, currentValues[0], 0, currentValues), currentSeries.width);
				}

				boxes.push(currentBoxes.slice(0));
			}

			//Draw x-axis
			if(levels) {
				context.fillStyle = xAxis.color;
				context.font = xAxis.size + "px sans-serif";
				context.textBaseline = "top";
				context.textAlign = "center";
				for(i = 0; i < midpoints.length; i++) {
					pieces = labels[i].split(" ");
					for(j = 0; j < pieces.length; j++) { context.fillText(pieces[j], midpoints[i], height + 1 + j * xAxis.size); }
				}
			}

			//Draw focus around hovered rectangle and write value
			if(focus.width) {
				if(hoverPos) {
					hoverPos = JSON.parse(hoverPos);

					//Loop through values again
					for(j = 0; j < midpoints.length; j++) {
						//Check if mouse is within this group's horizontal space
						if(hoverPos.x >= midpoints[j] - xQuotient / 2 && hoverPos.x <= midpoints[j] + xQuotient / 2) {
							//If mouse is within a bar, draw a focus
							for(i = 0; i < boxes.length; i++) {
								if(series[i].type === typeBar) {
									Drawers.rect(context, boxes[i][j].x - focus.width / 2, boxes[i][j].y - focus.width / 2, boxes[i][j].w + focus.width, boxes[i][j].h + focus.width, undefined, focus.width, focus.color);
								}
							}
							Drawers.tooltip(context, hoverPos.x, hoverPos.y, values.map(Helpers.extractor(j)), series.map(function(e) { return e.name || ""; }), values.map(function(e, i) { return series[i].color.call(self, e[j], j, e); }), tooltip.size, tooltip.color, tooltip.formatter, labels ? labels[j] : undefined, xAxis.formatter);
							break;//Don't analyze other values
						}
					}

				}
				self.addEvents();
			}
		}
	);

})(jQuery, Math, "canvis", "canvis-mouse");