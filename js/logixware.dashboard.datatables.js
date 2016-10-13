/*
 * MWE: Functions to extend our use of DataTables jQuery plugin and its companion Grouping plugin.  
 * These plugins are used by multiple widgets. 
 */
function addDataTablesExpandCollapseAllButton(dataTablesId) {
	var wrapper = dataTablesId + "_wrapper";
	$(wrapper + ' input.expandedOrCollapsedGroup').remove();
	$(wrapper).find('.dataTables_filter').append($('<input />', { 'type': 'button', 'class': 'expandedOrCollapsedGroup collapsed', 'value': 'Expand All' }).button());
	$(wrapper + ' .expandedOrCollapsedGroup').off('click').on('click', function () {	
		if ($(this).hasClass('collapsed')) {
			$(this).addClass('expanded').removeClass('collapsed').val('Collapse All').parents(wrapper).find('.collapsed-group').trigger('click');
		}
		else {
			$(this).addClass('collapsed').removeClass('expanded').val('Expand All').parents(wrapper).find('.expanded-group').trigger('click');
		}
	});
}

function dataTablesCollapseAll(dataTablesId) {
	var wrapper = dataTablesId + "_wrapper";
	$(wrapper).find('[id|=group-id]').each(function () {
		$(this).addClass('collapsed').removeClass('expanded').parents(wrapper).find('.expanded-group').trigger('click');
	});
}

function addDataTablesGroupCount(dataTablesId, prefix) {
	var wrapper = dataTablesId + "_wrapper";
	$(wrapper + 'span.rowCount-grid').remove();
	$(wrapper).find('[id|=group-id]').each(function () {
		var rowCount = $(this).nextUntil('[id|=group-id]').length;
		$(this).find('td').append($('<span />', { 'class': 'rowCount-grid' }).append($('<span />', { 'text': prefix + rowCount })));
	});
}

function getGroupIconMarkup(icon, group, row, statusJson) {
	var markup;
	var iconFile;
	var iconClasses;
	var status = "UNKNOWN";
	var summary = "Unknown status.";
	var zones = "";
	
	//
	if (icon === "SERVER-STATUS") {
		// iterate over the status Json, matching up with the "group row value" from the DB data where applicable
		$.each(statusJson.serverStatus, function(i, v) {
    		if (group === v.server) {
	   			status = v.status;
   				summary = v.summary;
   				return false; // break out of loop
			}   			
		});	
	
		if (status === "GREEN") {
			iconClasses = "glyphicon glyphicon-flag lwd-icon-green";
		}
		if (status === "YELLOW") {
			iconClasses = "glyphicon glyphicon-flag lwd-icon-yellow";
		}
		if (status === "RED") {
			iconClasses = "glyphicon glyphicon-flag lwd-icon-red";
		}
		if (status === "UNKNOWN") {
			iconClasses = "glyphicon glyphicon-flag lwd-icon-gray";
		}
		markup = "<a href='#' title='" +
			group + 
			"<br />" + 
			summary +  
			"'>" + 
				"<span class='" + iconClasses + "'></span>" +
			"</a>";
	}
	//
	if (icon === "SERVER-ZONES") {
		// iterate over the status Json, matching up with the "group row value" from the DB data where applicable
		$.each(statusJson.aaData, function(i, v) {
			// since I am using the DataTables Json here, and it uses "numbered keys" I had to use "array indexing" to dig out the data
    		if (group === v[2]) {
    			status = "GREEN";
	   			zones += "Zone: " + v[0] + " User Alias: " + v[1] + "<br />";
	   			// this a one-to-many relationship, so cannot break out of the loop at the first match
			}   			
		});
		if (status === "GREEN") {
			iconClasses = "glyphicon glyphicon-star lwd-icon-green";
		}
		else {
			iconClasses = "glyphicon glyphicon-star lwd-icon-gray";
		}
		markup =
			"<a href='#' title='" + 
			group + 
			"<br />" + zones +
			"'>" + 
				"<span class='" + iconClasses + "'></span>" +
			"</a>";
	}
	//
	if (icon === "SERVER-INFO") {
		iconClasses = "glyphicon glyphicon-info-sign";
		markup =
			"<a href='#' title='" + 
			group +  
			"<br />Model: " + row.children('td').eq(5).text() + 
			"<br />Serial: " + row.children('td').eq(6).text() + 
			"<br />Location: " + row.children('td').eq(7).text() + 
			"<br />Memory: " + row.children('td').eq(10).text() + 
			"<br />CPU: " + row.children('td').eq(11).text() + 
			"<br />Comments: " + row.children('td').eq(8).text() + 
			"'>" + 
				"<span class='" + iconClasses + "'></span>" +
			"</a>";
	}
	//
	if (icon === "ENVIRONMENT-STATUS") {
		markup = "<img class='datatables-info-icon' src='/reporting/img/" + 
			row.children('td').eq(7).text() +
			".png" + 
			"' />" +
			"</a>";
	}
	//
	if (icon === "ENVIRONMENT-INFO") {
		markup =
			"<a href='#' title='" + 
			group +  
			"<br />Long Name: " + row.children('td').eq(6).text() + 
			"<br />Comments: " + row.children('td').eq(9).text() + 
			"'>" + 
				"<span class='" + iconClasses + "'></span>" +
			"</a>";
	}
	//
	return markup;	
}

function addIconTooltip(dataTablesId) {
	var wrapper = dataTablesId + "_wrapper";
	$(dataTablesId + " [title]").tooltip({
		placement: "right",
		html: true
	}); 
}	
