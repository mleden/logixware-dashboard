/*
 * logixwareDashboard 3.0
 *
 * Copyright (c) 2016 Logixware
 * www.logixware.com
 *
 * See the logixwareDashboard-demo.html for details on usage.

 * Dual licensed under the MIT and GPL licenses (same as jQuery):
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * This implementation borrows heavily from the following jQuery plugin:
 * http://connect.gxsoftware.com/dashboardplugin/demo/dashboard.html
 *
 * Copyright (c) 2010 Mark Machielsen
 *
 */

/*
 * BEGIN logixwareDashboard plugin closure.
 */
(function($) {
	/*
	 * BEGIN logixwareDashboard object constructor.
	 */
	$.fn.logixwareDashboard = function(options) {
		// Public properties of logixwareDashboard.
		var logixwareDashboard = {};
		var loading;
		var widgetDirectoryUrl;
		logixwareDashboard.layout;
		logixwareDashboard.element = this;
		logixwareDashboard.id = this.attr("id");
		logixwareDashboard.widgets = {};
		logixwareDashboard.widgetsToAdd = {};
		logixwareDashboard.widgetCategories = {};
		logixwareDashboard.initialized = false;
		logixwareDashboard.dirty = false;
		// Has the user modified the logixwareDashboard (added/deleted/moved a widget or switched layout without saving)

		// Public methods
		logixwareDashboard.serialize = function() {
			logixwareDashboard.log("entering serialize function", 1);
//			var r = '{"layout": "' + dashboard.layout.id + '", "data" : [';
			var r = '{"layout": "' + logixwareDashboard.layout.id + '", "data" : [';
			// add al widgets in the right order
			var i = 0;
			if ($("." + opts.columnClass).length == 0)
				logixwareDashboard.log(opts.columnClass + " class not found", 5);
			$('.' + opts.columnClass).each(function() {
				$(this).children().each(function() {
					if ($(this).hasClass(opts.widgetClass)) {
						if (i > 0) {
							r += ',';
						}
						r += (logixwareDashboard.getWidget($(this).attr("id"))).serialize();
						i++;
					}
				});
			});
			r += ']}';
			return r;
		};

		logixwareDashboard.log = function(msg, level) {
			if (level >= opts.debuglevel && typeof console != 'undefined') {
				var l = '';
				if (level == 1)
					l = 'INFO';
				if (level == 2)
					l = 'EVENT';
				if (level == 3)
					l = 'WARNING';
				if (level == 5)
					l = 'ERROR';
				console.log(l + ' - ' + msg);
			}
		};

		logixwareDashboard.setLayout = function(layout) {
			if (layout != null) {
				logixwareDashboard.log("entering setLayout function with layout " + layout.id, 1);
			} else {
				logixwareDashboard.log("entering setLayout function with layout null", 1);
			}
			logixwareDashboard.layout = layout;

			loading.remove();
			if (logixwareDashboard.layout != null) {
				if ( typeof opts.layoutClass != "undefined") {
					this.element.find('.' + opts.layoutClass).addClass(logixwareDashboard.layout.classname);
				} else {
					this.element.html(logixwareDashboard.layout.html);
				}
			}

			// make the columns sortable, see http://jqueryui.com/demos/sortable/ for explanation
			$('.' + opts.columnClass).sortable({
				connectWith : $('.' + opts.columnClass),
				opacity : opts.opacity,
				handle : '.' + opts.widgetHeaderClass,
				over : function(event, ui) {
					$(this).addClass("selectedcolumn");
				},
				out : function(event, ui) {
					$(this).removeClass("selectedcolumn");
				},
				receive : function(event, ui) {
					// update the column attribute for the widget
					var w = logixwareDashboard.getWidget(ui.item.attr("id"));
					w.column = getColumnIdentifier($(this).attr("class"));

					logixwareDashboard.log('dashboardStateChange event thrown for widget ' + w.id, 2);
					logixwareDashboard.element.trigger("dashboardStateChange", {
						"stateChange" : "widgetMoved",
						"widget" : w
					});

					logixwareDashboard.log('widgetDropped event thrown for widget ' + w.id, 2);
					w.element.trigger("widgetDropped", {
						"widget" : w
					});
				},
				deactivate : function(event, ui) {
					// This event is called for each column
					logixwareDashboard.log('Widget is dropped: check if the column is now empty.', 1);
					var childLength = $(this).children().length;
					if (childLength == 0) {
						logixwareDashboard.log('adding the empty text to the column', 1);
						$(this).html('<div class="emptycolumn">' + opts.emptyColumnHtml + '</div>');
					} else {
						if (childLength == 2) {
							// remove the empty column HTML
							$(this).find('.emptycolumn').remove();
						}
					}
				},
				start : function(event, ui) {
					ui.item.find('.' + opts.widgetTitleClass).addClass('noclick');
				},
				stop : function(event, ui) {
					//sorting changed (within one list)
					setTimeout(function() {
						ui.item.find('.' + opts.widgetTitleClass).removeClass('noclick');
					}, 300);
				}
			});
			fixSortableColumns();

			// trigger the dashboardLayoutLoaded event
			logixwareDashboard.log('dashboardLayoutLoaded event thrown', 2);
			logixwareDashboard.element.trigger("dashboardLayoutLoaded");
		};

		// This is a workaround for the following problem: when I drag a widget from column2 to column1, sometimes the widget is
		// moved to column3, which is not visible
		function fixSortableColumns() {
			logixwareDashboard.log('entering fixSortableColumns function', 1);
			$('.nonsortablecolumn').removeClass('nonsortablecolumn').addClass(opts.columnClass);
			$('.' + opts.columnClass).filter(function() {
				return $(this).css("display") == 'none';
			}).addClass('nonsortablecolumn').removeClass(opts.columnClass);
		}

		function getColumnIdentifier(classes) {
			logixwareDashboard.log('entering getColumnIdentifier function', 1);
			var r;
			var s = classes.split(" ");
			for (var i = 0; i < s.length; i++) {
				if (s[i].indexOf(opts.columnPrefix) === 0) {
					r = s[i];
				};
			};
			return r.replace(opts.columnPrefix, '');
		}

		/*
		 * Wrap EXTERNAL widget such that the user can easily open it in a new browser tab or window (i.e., outside of the logixwareDashboard).
		 */
		function getWrappedWidgetMarkup(title, url, architecture) {
			if (architecture === "EXTERNAL") {
				return '<a href="' + url + '" title="' + title + '" target="_blank">' + title + '&nbsp;<span class="glyphicon glyphicon-new-window"></span></a><iframe src="' + url + '" class="iframewidgetcontent"></iframe>';
			}
			if (architecture === "INDEPENDENT") {
				return '<iframe src="' + url + '" class="iframewidgetcontent"></iframe>';
			}
		}

		/**************************************************
		 * LW: Register the jQ events for the logixwareDashboard object(s).
		 **************************************************/
		function registerDashboardEventHandlers() {
			/*
			 * Bind event handlers for the logixwareDashboard object.
			 * Many of the "triggers" are based upon classnames that are captured as options of the logixwareDashboard object.
			 */
			var eventHandlerDescription;

			// Handle click on widget header to act as collapse/expand toggle.
			$(document).on("click", "#" + logixwareDashboard.id + " ." + opts.widgetTitleClass, function(e, o) {
				logixwareDashboard.log("Click on the header detected for widget " + $(this).attr("id"), 1);
				if (!$(this).hasClass("noclick")) {
					var wi = logixwareDashboard.getWidget($(this).closest("." + opts.widgetClass).attr("id"));
					if (wi.open) {
						logixwareDashboard.log("widgetCollapse event thrown for widget " + wi, 2);
						wi.element.trigger("widgetCollapse", {
							"widget" : wi
						});
					} else {
						logixwareDashboard.log("widgetExpand event thrown for widget " + wi, 2);
						wi.element.trigger("widgetExpand", {
							"widget" : wi
						});
					}
				}
				return false;
			});

			// Handle click on maximimize/normalize button.
			$(document).on("click", "#" + logixwareDashboard.id + " ." + opts.widgetFullScreenClass, function(e, o) {
				var wi = logixwareDashboard.getWidget($(this).closest('.' + opts.widgetClass).attr("id"));
				// Needed to explicitly hide the tooltip to prevent it from bleeding through the maximized widget container.
				$(this).tooltip("hide");
				if (wi.fullscreen) {
					logixwareDashboard.log("widgetNormalize event thrown for widget " + wi.id, 2);
					wi.element.trigger("widgetNormalize", {
						"widget" : wi
					});
				} else {
					logixwareDashboard.log("widgetMaximize event thrown for widget " + wi.id, 2);
					wi.element.trigger("widgetMaximize", {
						"widget" : wi
					});
				}
				return false;
			});

			// Handle "maximize" event.
			$(document).on("widgetMaximize", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				o.widget.maximize();
			});

			// Handle "normalize" event.
			$(document).on("widgetNormalize", "." + opts.widgetClass, function(e, o) {
				o.widget.normalize();
			});

			// Handle click on "widget menu".
			$(document).on("click", "#" + logixwareDashboard.id + " ." + opts.menuClass + " li", function(e, o) {
				// use the class on the li to determine what action to trigger
				var wi = logixwareDashboard.getWidget($(this).closest("." + opts.widgetClass).attr("id"));
				logixwareDashboard.log($(this).attr("class") + " event thrown for widget " + wi.id, 2);
				wi.element.trigger($(this).attr("class"), {
					"widget" : wi
				});
			});

			// Handle "widget menu collapse" event.
			$(document).on("widgetCollapse", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				logixwareDashboard.log("Closing widget " + $(this).attr("id"), 1);
				o.widget.collapse();
			});

			// Handle "widget menu expand" event.
			$(document).on("widgetExpand", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				logixwareDashboard.log("Opening widget " + $(this).attr("id"), 1);
				o.widget.expand();
			});

			// Handle "widget menu delete" event.
			$(document).on("widgetDelete", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				if (confirm(opts.deleteConfirmMessage)) {
					logixwareDashboard.log("Removing widget " + $(this).attr("id"), 1);
					o.widget.remove();
				}
			});

			// Handle "widget menu refresh" event.
			$(document).on("widgetRefresh", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				o.widget.refreshContent();
			});

			// Handle "widget menu about" event.
			$(document).on("widgetAbout", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				o.widget.widgetAbout();
			});

			// Handle "widget show" event.
			$(document).on("widgetShow", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				$(this).find("." + opts.widgetContentClass).show();
			});

			// Handle "widget hide" event.
			$(document).on("widgetHide", "#" + logixwareDashboard.id + " ." + opts.widgetClass, function(e, o) {
				$(this).find("." + opts.widgetContentClass).hide();
			});

			/*
			* Bind event handlers for the logixwareDashboard dialogs/modals.
			*/
			// Handle click on the "edit layout" option.
			$(document).on("click", "body" + " ." + layoutOpts.openDialogClass, function(e, o) {
				logixwareDashboard.log("dashboardOpenLayoutDialog event thrown", 2);
				logixwareDashboard.element.trigger("dashboardOpenLayoutDialog");
				return false;
			});

			// Handle "open edit layout" event.
			$(document).on("dashboardOpenLayoutDialog", "body", function(e, o) {
				logixwareDashboard.log("Opening dialog " + layoutOpts.dialogId, 1);
				// add the layout images to the template
				var h = $("#" + layoutOpts.dialogId).find("." + layoutOpts.layoutClass);
				h.empty();
				if (h.children().length == 0) {
					logixwareDashboard.log("Number of layouts: " + opts.layouts.length, 1);
					$.each(opts.layouts, function(i, item) {
						logixwareDashboard.log("Applying template: " + layoutOpts.layoutTemplate, 1);
						if ($("#" + layoutOpts.layoutTemplate).length == 0)
							logixwareDashboard.log("Template " + layoutOpts.layoutTemplate + " not found", 5);
						h.append(tmpl($("#" + layoutOpts.layoutTemplate).html(), item));
					});
				}
				bindSelectLayout();
				if (opts.uiFramework === "bootstrap3") {
					// add the "selected" class to the image representing the selected layout
					$("#" + layoutOpts.dialogId).find("#" + logixwareDashboard.layout.id).addClass(layoutOpts.selectedLayoutClass);
					$("#" + layoutOpts.dialogId).modal();
				}
			});

			// Handle "close edit layout" event.
			$(document).on("dashboardCloseLayoutDialog", "body", function(e, o) {
				if (opts.uiFramework === "bootstrap3") {
					// close the dialog
					$("#" + layoutOpts.dialogId).modal("hide");
				}
			});

			// Handle click on "add widget" option.
			$(document).on("click", "." + addOpts.openDialogClass, function(e, o) {
				logixwareDashboard.log("dashboardOpenWidgetDialog event thrown", 2);
				logixwareDashboard.element.trigger("dashboardOpenWidgetDialog");
				return false;
			});

			// Handle "open add widget dialog" event.
			/*
			 * Changed from getJSON() method to ajax() method.
			 * Without this change, we were seeing multiple category and widget entries
			 * in the dialog.  Presumably, this was a knock-on effect to the way that we
			 * implemented multiple dashboards.
			 */
			$(document).on("dashboardOpenWidgetDialog", "body", function(e, o) {
				//remove existing categories/widgets from the DOM, to prevent duplications
				$("#" + addOpts.dialogId).find("." + addOpts.categoryClass).empty();
				$("#" + addOpts.dialogId).find("." + addOpts.widgetClass).empty();
				$.ajax({
					url : addOpts.widgetDirectoryUrl,
					dataType : "json",
					success : function(json) {
						if (json.category == 0) {
							logixwareDashboard.log("Empty data returned", 3);
						}
						$.each(json.categories.category, function(i, item) {
							// Add the categories to the logixwareDashboard
							logixwareDashboard.widgetCategories[item.id] = item.url;
							logixwareDashboard.log("Applying template: " + addOpts.categoryTemplate, 1);
							if ($("#" + addOpts.categoryTemplate).length == 0)
								logixwareDashboard.log("Template " + addOpts.categoryTemplate + " not found", 5);
							var html = tmpl($("#" + addOpts.categoryTemplate).html(), item);
							$("#" + addOpts.dialogId).find("." + addOpts.categoryClass).append(html);
						});
						logixwareDashboard.element.trigger("addWidgetDialogCategoriesLoaded");
						logixwareDashboard.element.trigger("addWidgetDialogSelectCategory", {
							"category" : $("#" + addOpts.dialogId).find("." + addOpts.categoryClass + ">li:first")
						});
					}
				});
				if (opts.uiFramework === "bootstrap3") {
					$("#" + addOpts.dialogId).modal();
					//					$("#" + addOpts.dialogId).resizable();
				}
			});

			// Handle click on "add widget dialog select category" option.
			$(document).on("click", "." + addOpts.selectCategoryClass, function(e, o) {
				logixwareDashboard.log("addWidgetDialogSelectCategory event thrown", 2);
				logixwareDashboard.element.trigger("addWidgetDialogSelectCategory", {
					"category" : $(this)
				});
				return false;
			});

			// Handle "add widget select category" event.
			/*
			 * MWE: May 15, 2012
			 * Customized this function.  Changed from getJSON() method to ajax() method.
			 * Without this change, we were seeing multiple category and widget entries
			 * in the dialog.  Presumably, this was a knock-on effect to the way that we
			 * implemented multiple dashboards.
			 */
			$(document).on("addWidgetDialogSelectCategory", "body", function(e, o) {
				// remove the category selection
				$("." + addOpts.selectCategoryClass).removeClass(addOpts.selectedCategoryClass);
				// empty the widgets div
				$("#" + addOpts.dialogId).find("." + addOpts.widgetClass).empty();
				// select the category
				$(o.category).addClass(addOpts.selectedCategoryClass);
				// get the widgets
				url = logixwareDashboard.widgetCategories[$(o.category).attr("id")];
				logixwareDashboard.log("Getting JSON feed : " + url, 1);
				$.ajax({
					url : url,
					dataType : "json",
					success : function(json) {
						// load the widgets from the category
						if (json.result.data == 0)
							logixwareDashboard.log("Empty data returned", 3);
						var items = json.result.data;
						if ( typeof json.result.data.length == "undefined") {
							items = new Array(json.result.data);
						}
						$.each(items, function(i, item) {
							logixwareDashboard.widgetsToAdd[item.id] = item;
							logixwareDashboard.log("Applying template : " + addOpts.widgetTemplate, 1);
							if ($("#" + addOpts.widgetTemplate).length == 0)
								logixwareDashboard.log("Template " + addOpts.widgetTemplate + " not found", 5);
							var html = tmpl($("#" + addOpts.widgetTemplate).html(), item);
							$("#" + addOpts.dialogId).find("." + addOpts.widgetClass).append(html);
						});
						logixwareDashboard.log("addWidgetDialogWidgetsLoaded event thrown", 2);
						logixwareDashboard.element.trigger("addWidgetDialogWidgetsLoaded");
					}
				});
			});

			// Handle click on "add widget dialog add" option.
			$(document).on("click", "." + addOpts.addWidgetClass, function(e, o) {
				var widget = logixwareDashboard.widgetsToAdd[$(this).attr("id").replace("addwidget", "")];
				logixwareDashboard.log("dashboardAddWidget event thrown", 2);
				logixwareDashboard.element.trigger("dashboardAddWidget", {
					"widget" : widget
				});
				logixwareDashboard.log("dashboardCloseWidgetDialog event thrown", 2);
				logixwareDashboard.element.trigger("dashboardCloseWidgetDialog");
				return false;
			});

			// Handle "add widget dialog add" event.
			$(document).on("dashboardAddWidget", "body", function(e, o) {
				logixwareDashboard.log(this.id + ":" + e.type, 1);
				logixwareDashboard.addWidget({
					"id" : o.widget.id,
					"architecture" : o.widget.architecture,
					"creator" : o.widget.creator,
					"description" : o.widget.description,
					"email" : o.widget.email,
					"title" : o.widget.title,
					"url" : o.widget.url
				}, logixwareDashboard.element.find(".column:first"));
			});

			// Handle "add widget dialog close" event.
			$(document).on("dashboardCloseWidgetDialog", "body", function(e, o) {
				if (opts.uiFramework === "bootstrap3") {
					// close the modal
					$("#" + addOpts.dialogId).modal("hide");
				}
			});

			// Handle "dashboard state change" event.
			/*
			 * LW: Custom "state change" event
			 * This seems to handle:
			 * 1) Widget add - YES
			 * 2) Widget delete - YES
			 * 3) Widget relocate - PARTIAL (when moved to another column)
			 * 4) Layout change - NO
			 */
			$(document).on("dashboardStateChange", "body", function(e, o) {
				logixwareDashboard.log(this.id + ":" + e.type, 1);
				logixwareDashboard.dirty = true;
				if ( typeof opts.stateChangeUrl != "undefined" && opts.stateChangeUrl != null && opts.stateChangeUrl != "") {
					$.ajax({
						type : "POST",
						url : opts.stateChangeUrl,
						data : {
							logixwareDashboard : logixwareDashboard.element.attr("id"),
							settings : logixwareDashboard.serialize()
						},
						success : function(data) {
							if (data == "NOK" || data.indexOf("<response>NOK</response>") != -1) {
								logixwareDashboard.log("dashboardSaveFailed event thrown", 2);
								logixwareDashboard.element.trigger("dashboardSaveFailed");
							} else {
								logixwareDashboard.log("dashboardSuccessfulSaved event thrown", 2);
								logixwareDashboard.element.trigger("dashboardSuccessfulSaved");
							}
						},
						error : function(XMLHttpRequest, textStatus, errorThrown) {
							logixwareDashboard.log("dashboardSaveFailed event thrown", 2);
							logixwareDashboard.element.trigger("dashboardSaveFailed");
						},
						dataType : "text"
					});
				}
			});

			// Handle "edit layout dialog change" event.
			$(document).on("dashboardLayoutChanged", "body", function(e, o) {
				logixwareDashboard.log(this.id + ":" + e.type, 1);
				logixwareDashboard.dirty = true;
				// assemble data representing widgets in first column...
				$.each($(".column.first").find(".widget"), function(i) {
					logixwareDashboard.log("Building dashboard first column", 1);
					// MWE
					logixwareDashboard.getWidget(this.id).refreshContent();
				});
				// assemble data representing widgets in second column...
				$.each($(".column.second").find(".widget"), function(i) {
					logixwareDashboard.log("Building dashboard second column", 1);
					// MWE
					logixwareDashboard.getWidget(this.id).refreshContent();
				});
				// assemble data representing widgets in third column...
				$.each($(".column.third").find(".widget"), function(i) {
					logixwareDashboard.log("Building dashboard third column", 1);
					// MWE
					logixwareDashboard.getWidget(this.id).refreshContent();
				});
			});

			// Handle click on "save changes" option.
			$(document).on("click", "body" + " ." + opts.saveChangesClass, function(e, o) {
				logixwareDashboard.log("saveChangesClass event thrown", 2);
				alert("Not yet implemented.");
				return false;
			});

			// Handle "custom widget dropped" event.
			// Force a refresh of the widget to ensure that its content re-flows within its (new) container.
			$(document).on("widgetDropped", ".widget", function(e, o) {
				logixwareDashboard.log(this.id + ":" + e.type, 1);
				o.widget.refreshContent();
			});

			// FIXME: why doesn't the live construct work in this case
			function bindSelectLayout() {
				if ($("." + layoutOpts.selectLayoutClass).length == 0)
					logixwareDashboard.log("Unable to find " + layoutOpts.selectLayoutClass, 5);
				$("." + layoutOpts.selectLayoutClass).bind("click", function(e) {
					var currentLayout = logixwareDashboard.layout;
					logixwareDashboard.log("dashboardCloseLayoutDialog event thrown", 2);
					logixwareDashboard.element.trigger("dashboardCloseLayoutDialog");
					// Now set the new layout
					var newLayout = getLayout($(this).attr("id"));
					logixwareDashboard.layout = newLayout;
					// remove the class of the old layout
					if ( typeof opts.layoutClass != "undefined") {
						logixwareDashboard.element.find("." + opts.layoutClass).removeClass(currentLayout.classname).addClass(newLayout.classname);
						fixSortableColumns();
						// check if there are widgets in hidden columns, move them to the first column
						if ($("." + opts.columnClass).length == 0)
							logixwareDashboard.log("Unable to find " + opts.columnClass, 5);
						logixwareDashboard.element.find(".nonsortablecolumn").each(function() {
							// move the widgets to the first column
							$(this).children().appendTo(logixwareDashboard.element.find("." + opts.columnClass + ":first"));
							$(".emptycolumn").remove();
							// add the text to the empty columns
							$("." + opts.columnClass).each(function() {
								if ($(this).children().length == 0) {
									$(this).html('<div class="emptycolumn">' + opts.emptyColumnHtml + "</div>");
								}
							});
						});
					} else {
						// set the new layout, but first move the logixwareDashboard to a temp
						var temp = $('<div style="display:none" id="tempdashboard"></div>');
						temp.appendTo($("body"));
						logixwareDashboard.element.children().appendTo(temp);
						// reload the logixwareDashboard
						logixwareDashboard.init();
					}
					// throw an event upon changing the layout.
					logixwareDashboard.log("dashboardChangeLayout event thrown", 2);
					logixwareDashboard.element.trigger("dashboardLayoutChanged");
				});
				return false;
			}

		}

		/*
		 * END registerDashboardEventHandlers
		 */

		logixwareDashboard.loadLayout = function() {
			logixwareDashboard.log("entering loadLayout function", 1);
			if ( typeof opts.json_data.url != "undefined" && opts.json_data.url.length > 0) {
				// ajax option
				logixwareDashboard.log("Getting JSON feed : " + opts.json_data.url, 1);
				$.getJSON(opts.json_data.url, function(json) {
					if (json == null) {
						alert("Unable to get json. If you are using chrome: there is an issue with loading json with local files. It works on a server :-)", 5);
						return;
					}
					// set the layout
					var obj = json.result;
					var currentLayout = ( typeof logixwareDashboard.layout != "undefined") ? logixwareDashboard.layout : getLayout(obj.layout);
					logixwareDashboard.setLayout(currentLayout);
					logixwareDashboard.loadWidgets(obj.data);
				});
			} else {
				// set the layout
				var currentLayout = ( typeof logixwareDashboard.layout != "undefined") ? logixwareDashboard.layout : getLayout(json.layout);
				logixwareDashboard.setLayout(currentLayout);
				logixwareDashboard.loadWidgets(opts.json_data.data);
			}
		};

		logixwareDashboard.addWidget = function(obj, column) {
			logixwareDashboard.log("entering addWidget function", 1);
			// add the widget to the column
			var wid = obj.id;

			// check if the widget is already registered and available in the dom
			if ( typeof logixwareDashboard.widgets[wid] != "undefined" && $("#" + wid).length > 0) {
				var wi = $("#" + wid);
				column = logixwareDashboard.widgets[wid].column;

				// add it to the column
				wi.appendTo(column);
			} else {
				// build the widget
				logixwareDashboard.log("Applying template : " + opts.widgetTemplate, 1);
				if ($("#" + opts.widgetTemplate).length == 0)
					logixwareDashboard.log("Template " + opts.widgetTemplate + " not found", 5);
				var widgetStr = tmpl($("#" + opts.widgetTemplate).html(), obj);
				var wi = $(widgetStr);

				// add it to the column
				wi.appendTo(column);

				logixwareDashboard.widgets[wid] = widget({
					id : wid,
					element : wi,
					architecture : obj.architecture,
					column : obj.column,
					creator : obj.creator,
					description : obj.description,
					editurl : obj.editurl,
					email : obj.email,
					open : obj.open,
					title : obj.title,
					url : obj.url
				});
			}

			logixwareDashboard.log("widgetAdded event thrown for widget " + wid, 2);
			logixwareDashboard.widgets[wid].element.trigger("widgetAdded", {
				"widget" : logixwareDashboard.widgets[wid]
			});

			if (logixwareDashboard.initialized) {
				logixwareDashboard.log("dashboardStateChange event thrown for widget " + wid, 2);
				logixwareDashboard.element.trigger("dashboardStateChange", {
					"stateChange" : "widgetAdded",
					"widget" : wi
				});
			}
		};

		logixwareDashboard.loadWidgets = function(data) {
			logixwareDashboard.log("entering loadWidgets function", 1);
			logixwareDashboard.element.find("." + opts.columnClass).empty();

			// This is for the manual feed
			$(data).each(function() {
				var column = this.column;
				logixwareDashboard.addWidget(this, logixwareDashboard.element.find("." + opts.columnPrefix + column));
			});
			// end loop for widgets

			// check if there are widgets in the temp dashboard which needs to be moved
			// this is not the correct place, but otherwise we are too late

			// check if there are still widgets in the temp
			$("#tempdashboard").find("." + opts.widgetClass).each(function() {
				// append it to the first column
				var firstCol = logixwareDashboard.element.find("." + opts.columnClass + ":first");
				$(this).appendTo(firstCol);

				// set the new column
				logixwareDashboard.getWidget($(this).attr("id")).column = firstCol.attr("id");
			});
			$("#tempdashboard").remove();

			// add the text to the empty columns
			$("." + opts.columnClass).each(function() {
				if ($(this).children().length == 0) {
					$(this).html('<div class="emptycolumn">' + opts.emptyColumnHtml + '</div>');
				}
			});
			logixwareDashboard.initialized = true;
		};

		logixwareDashboard.init = function() {
			logixwareDashboard.log("entering init function", 1);
			// load the widgets as fast as we can. After that add the binding
			logixwareDashboard.loadLayout();
		};

		logixwareDashboard.getWidget = function(id) {
			logixwareDashboard.log("entering getWidget function", 1);
			var wi = logixwareDashboard.widgets[id];
			if ( typeof wi != "undefined") {
				return wi;
			} else {
				return null;
			}
		};
		// Merge in the caller's options with the defaults.
		var opts = $.extend({}, $.fn.logixwareDashboard.defaults, options);
		var addOpts = $.extend({}, $.fn.logixwareDashboard.defaults.addWidgetSettings, options.addWidgetSettings);
		var layoutOpts = $.extend({}, $.fn.logixwareDashboard.defaults.editLayoutSettings, options.editLayoutSettings);

		// Execution 'forks' here and restarts in init().  Tell the user we're busy with a loading.
		var loading = $(opts.loadingHtml).appendTo(logixwareDashboard.element);

		/**
		 * widget object
		 *    Private sub-class of logixwareDashboard
		 * Constructor starts
		 */
		function widget(widget) {
			logixwareDashboard.log("entering widget constructor", 1);
			// Merge default options with the options defined for this widget.
			widget = $.extend({}, $.fn.logixwareDashboard.widget.defaults, widget);

			// public functions
			widget.expand = function() {
				logixwareDashboard.log("entering expand function", 1);
				widget.element.find(".widgetExpand").hide();
				widget.element.find(".widgetCollapse").show();
				widget.open = true;
				widget.loaded = false;
				// artificial setting
				if (widget.loaded) {
					logixwareDashboard.log("widgetShow event thrown for widget " + widget.id, 2);
					widget.element.trigger("widgetShow", {
						"widget" : widget
					});
				} else {
					logixwareDashboard.log(this.architecture + " widget", 1);
					// add the loading
					$(opts.loadingHtml).appendTo(widget.element.find("." + opts.widgetContentClass));
					if (this.architecture === "DEPENDENT") {
						widget.element.find("." + opts.widgetContentClass).load(this.url, function(response, status, xhr) {
							if (status == "error") {
								widget.element.find("." + opts.widgetContentClass).html(opts.widgetNotFoundHtml);
							}
							widget.loaded = true;
						});
					} else {
						widget.element.find("." + opts.widgetContentClass).empty().append(getWrappedWidgetMarkup(this.title, this.url, this.architecture));
						/*
						 if (this.architecture === "INDEPENDENT") {
						 // add this class to eliminate "artificial" padding around the iframe
						 $(this).find(".widgetcontent").addClass("widgetcontent-independent");
						 }
						 */
					}
					logixwareDashboard.log("widgetShow event thrown for widget " + widget.id, 2);
					widget.element.trigger("widgetShow", {
						"widget" : widget
					});
					logixwareDashboard.log("widgetLoaded event thrown", 2);
					widget.element.trigger("widgetLoaded", {
						"widget" : widget
					});

				}
				if (logixwareDashboard.initialized) {
					logixwareDashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
					logixwareDashboard.element.trigger("dashboardStateChange", {
						"stateChange" : "widgetExpanded",
						"widget" : widget
					});
				}
			};
			widget.refreshContent = function() {
				logixwareDashboard.log("entering refreshContent function", 1);
				widget.loaded = false;
				if (widget.open) {
					widget.expand();
				}
			};
			widget.setTitle = function(newTitle) {
				logixwareDashboard.log("entering setTitle function", 1);
				widget.title = newTitle;
				widget.element.find("." + opts.widgetTitleClass).html(newTitle);
				if (logixwareDashboard.initialized) {
					logixwareDashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
					logixwareDashboard.element.trigger("dashboardStateChange", {
						"stateChange" : "titleChanged",
						"widget" : widget
					});
				}
			};
			widget.collapse = function() {
				logixwareDashboard.log("entering collapse function", 1);
				widget.open = false;
				logixwareDashboard.log("widgetHide event thrown for widget " + widget.id, 2);
				widget.element.trigger("widgetHide", {
					"widget" : widget
				});
				widget.element.find(".widgetExpand").show();
				widget.element.find(".widgetCollapse").hide();
				logixwareDashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
				logixwareDashboard.element.trigger("dashboardStateChange", {
					"stateChange" : "widgetClosed",
					"widget" : widget
				});
			};
			widget.openMenu = function() {
				logixwareDashboard.log("entering openMenu function", 1);
				widget.element.find("." + opts.menuClass).show();
			};
			widget.closeMenu = function() {
				logixwareDashboard.log("entering closeMenu function", 1);
				widget.element.find("." + opts.menuClass).hide();
			};
			widget.remove = function() {
				logixwareDashboard.log("entering remove function", 1);
				widget.element.remove();
				logixwareDashboard.log("widgetDeleted event thrown for widget " + widget.id, 2);
				widget.element.trigger("widgetDeleted", {
					"widget" : widget
				});
				logixwareDashboard.log("dashboardStateChange event thrown for widget " + widget.id, 2);
				logixwareDashboard.element.trigger("dashboardStateChange", {
					"stateChange" : "widgetRemoved",
					"widget" : widget
				});
			};

			widget.widgetAbout = function() {
				logixwareDashboard.log("entering widgetAbout function", 1);
				var aboutHtml = "Name: " + "<b>" + widget.title + "</b>" + "<br />Creator: " + "<b>" + "<a href=mailto:" + widget.email + "?subject=" + emailSubject + ">" + widget.creator + "</a>" + "</b>" + "<br />Description: " + "<b>" + widget.description + "</b>" + "<br />Architecture: " + "<b>" + widget.architecture + "</b>" + "<br />URL: " + "<b>" + widget.url + "</b>";
				var aboutTitle = "About " + widget.title;
				var emailSubject = escape("About " + widget.title + " widget...");
				if (opts.uiFramework === "bootstrap3") {
					$("#aboutwidgetdialog").find(".modal-header h3").html(aboutTitle);
					$("#aboutwidgetdialog").find(".modal-body").html(aboutHtml);
					$("#aboutwidgetdialog").modal();
					//					$("#aboutwidgetdialog").resizable();
				}
			};

			widget.serialize = function() {
				logixwareDashboard.log("entering serialize function", 1);
				var r = '{"title" : "' + widget.title + '", "id" : "' + widget.id + '", "column" : "' + widget.column + '","editurl" : "' + widget.editurl + '","open" : ' + widget.open + ',"url" : "' + widget.url + '"';
				r += '}';
				return r;
			};
			widget.maximize = function() {
				logixwareDashboard.log("entering maximize function", 1);
				widget.fullscreen = true;
				// create "full-screen container" with "widget copy"
				var fs = $('<ul id="fullscreen_' + logixwareDashboard.id + '" class="columnmaximize"></ul>');
				widget.element.clone().appendTo(fs);
				// hide the layout div from the logixwareDashboard
				$(".layout").hide();
				// add "full-screen container" to the logixwareDashboard
				fs.appendTo(logixwareDashboard.element);
			};
			widget.normalize = function() {
				logixwareDashboard.log("entering normalize function", 1);
				widget.fullscreen = false;
				// remove "full-screen container" from logixwareDashboard
				$("#fullscreen_" + logixwareDashboard.id).remove();
				// show the layout div back on the logixwareDashboard
				$(".layout").show();
			};
			widget.openSettings = function() {
				logixwareDashboard.log("entering openSettings function", 1);
				widget.element.trigger("editSettings", {
					"widget" : widget
				});
			};
			// called when widget is initialized
			if (widget.open) {
				// init widget as expanded
				widget.expand();
			} else {
				// init widget as collapsed
				widget.collapse();
			}
			widget.initialized = true;
			logixwareDashboard.log("widgetInitialized event thrown", 2);
			widget.element.trigger("widgetInitialized", {
				"widget" : widget
			});
			return widget;
		};
		/*
		* End widget object sub-class
		*/

		// FIXME: can this be done easier??
		function getLayout(id) {
			logixwareDashboard.log("entering getLayout function", 1);
			var r = null;
			var first = null;
			if ( typeof opts.layouts != "undefined") {
				$.each(opts.layouts, function(i, item) {
					if (i == 0) {
						first = item;
					}
					if (item.id == id) {
						r = item;
					}
				});
			}
			if (r == null) {
				r = first;
			}
			return r;
		}

		if ($("#" + addOpts.dialogId).length == 0) {
			logixwareDashboard.log("Unable to find " + addOpts.dialogId, 5);
		}

		if ($("#" + layoutOpts.dialogId).length == 0) {
			logixwareDashboard.log("Unable to find " + layoutOpts.dialogId, 5);
		}

		registerDashboardEventHandlers();

		return logixwareDashboard;
	};
	/*
	 * END logixwareDashboard object constructor.
	 */

	/*
	 * BEGIN logixwareDashboard public static properties.  Default settings.
	 */
	$.fn.logixwareDashboard.defaults = {
		addWidgetSettings : {
			addWidgetClass : "addwidget",
			categoryClass : "categories",
			categoryTemplate : "categorytemplate",
			dialogId : "addwidgetdialog",
			openDialogClass : "openaddwidgetdialog",
			selectCategoryClass : "selectcategory",
			selectedCategoryClass : "selected",
			widgetClass : "widgets",
			widgetTemplate : "addwidgettemplate"
		},
		columnClass : "column",
		columnPrefix : "column-",
		dashboardName : "DEFAULT",
		debuglevel : 3,
		deleteConfirmMessage : "Are you sure you want to delete this widget?",
		editLayoutSettings : {
			dialogId : "editLayout",
			layoutClass : "layoutselection",
			layoutTemplate : "selectlayouttemplate",
			openDialogClass : "editlayout",
			selectLayoutClass : "layoutchoice",
			selectedLayoutClass : "selected"
		},
		//    emptyColumnHtml: "Drag your widgets here", // Set this as "empty string" if you want no "drag and drop visual cues" on the "dashboard columns".
		emptyColumnHtml : "", // Set this as "empty string" if you want no "drag and drop visual cues" on the "dashboard columns".
		iconsClass : "icons",
		layouts : [{
			title : "Layout1",
			id : "layout1",
			image : "img/layout1.png",
			classname : "layout-a"
		}, {
			title : "Layout2",
			id : "layout2",
			image : "img/layout2.png",
			classname : "layout-aa"
		}, {
			title : "Layout3",
			id : "layout3",
			image : "img/layout3.png",
			classname : "layout-ba"
		}, {
			title : "Layout4",
			id : "layout4",
			image : "img/layout4.png",
			classname : "layout-ab"
		}, {
			title : "Layout5",
			id : "layout5",
			image : "img/layout5.png",
			classname : "layout-aaa"
		}],
		loadingHtml : '<div class="loading"><img alt="Loading, please wait" src="img/loading.gif" /><p>Loading...</p></div>',
		menuClass : "dropdown-menu",
		opacity : "0.2",
		saveChangesClass : "savechanges",
		stateChangeUrl : "",
		uiFramework : "bootstrap3",
		widgetClass : "widget",
		widgetContentClass : "widgetcontent",
		widgetFullScreenClass : "widgetopenfullscreen",
		widgetHeaderClass : "box-header",
		widgetNotFoundHtml : "The content of this widget has failed to load.  " + "<br /><br />This is likely to be the result of one or more of the following problems:" + "<ul>" + "<li>The widget includes authorization criteria that have not been satisfied.</li>" + "<li>The widget references file(s) or server(s) that no longer exist, are offline, or cannot be reached.</li>" + "<li>The widget's request for data or resources has timed out.</li>" + "</ul>",
		widgetTemplate : "widgettemplate-with-header",
		widgetTitleClass : "box-title",
		json_data : {}
	};
	/*
	 * END logixwareDashboard public static properties.
	 */

	/*
	 * BEGIN widget public static properties.  Default settings.
	 */
	$.fn.logixwareDashboard.widget = {
		defaults : {
			open : true,
			fullscreen : false,
			loaded : false,
			url : ""
		}
	};
	/*
	 * END widget public static properties.
	 */

})(jQuery);
/*
 * END logixwareDashboard plugin closure.
 */
