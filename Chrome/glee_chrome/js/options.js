var prefs = {};
var bg_window;
var sync;

// propagate change in preferences to all currently open tabs
// updates preference cache in background.html
// also, if sync is enabled, save data in bookmark as well
function propagate()
{
	chrome.windows.getAll({populate:true}, function(windows){
	    var w_len = windows.length;
		for(var i = 0; i < w_len; i++)
		{
		    var t_len = windows[i].tabs.length;
			for (var j = 0; j < t_len; j++)
			{
				chrome.tabs.sendRequest(windows[i].tabs[j].id,
				    {value: "updateOptions", preferences: prefs},
				    function(response){}
				);
			}
		}
	});
	// update background.html cache
	bg_window.cache.prefs = prefs;
	
	// if sync is enabled, also save data in bookmark
	if (localStorage['gleebox_sync'] == 1) {
        bg_window.saveSyncData(prefs);
    }
}

// Restores select box state to saved value from DB
function initSettings(response)
{
    prefs = response;
	initDefaultTexts();

    // disabled urls
	var len = prefs.disabledUrls.length;
	if (len != 0)
	{
		for (var i = 0; i < len; i++)
			addItem('domain', prefs.disabledUrls[i]);
	}
	
	// position
	var pos = parseInt(prefs.position);
	if (pos != undefined)
		document.getElementsByName("position")[pos].checked = true;
	else
		document.getElementsByName("position")[1].checked = true;

	// size
	var size = parseInt(prefs.size);
	if (size != undefined)
		document.getElementsByName("size")[size].checked = true;
	else
		document.getElementsByName("size")[1].checked = true;

	// search engine
	document.getElementsByName("search_engine")[0].value = prefs.search_engine;

	// theme
	tRadios = document.getElementsByName("theme");
	var r_len = tRadios.length;
	for (var i = 0; i < r_len; i++)
	{
		if (prefs.theme == tRadios[i].value)
		{
			tRadios[i].checked = true;
			break;
		}
	}

    // bookmark search status
	if (prefs.bookmark_search == 1)
		document.getElementsByName("bookmark_search")[0].checked = true;
	else
		document.getElementsByName("bookmark_search")[1].checked = true;

	// scroll animation
	if (prefs.scroll_animation == 0)
		document.getElementsByName("scroll_animation")[1].checked = true;
	else
		document.getElementsByName("scroll_animation")[0].checked = true;
		
	// tab manager shortcut status
	if (prefs.tab_shortcut_status != undefined)
	{
	    if (prefs.tab_shortcut_status == 0)
    		document.getElementsByName("tab_shortcut_status")[1].checked = true;
    	else
    		document.getElementsByName("tab_shortcut_status")[0].checked = true;
	}
	
	// scraper commands
	var len = prefs.scrapers.length;
	if (len != 0)
	{
		// last element is a string only containing a ,
		for (var i = 0; i < len; i++)
			addItem('scraper', prefs.scrapers[i].command, prefs.scrapers[i].selector);
	}	

	// esp status
	if (prefs.esp_status == 0)
		document.getElementsByName("esp_status")[1].checked = true;
	else
		document.getElementsByName("esp_status")[0].checked = true;
	
	// esp visions
	var espList = document.getElementById("esp-modifiers");
	var len = prefs.espModifiers.length;
	if (len != 0)
	{
		for (var i = 0; i < len; i++)
			addItem('esp', prefs.espModifiers[i].url, prefs.espModifiers[i].selector);
	}
	else
	{
		// add default examples
		var newLI = document.createElement('li');
		var inputBt = "<input class='button' style='float:right' type='button' value='Remove' onclick='removeItem(\"esp\")'/>";
		newLI.className = "esp";
		newLI.id = "esp0";
		newLI.innerHTML = "<span class='esp-url'>google.com/search</span> : <span class='esp-sel'>h3:not(ol.nobr>li>h3)</span>" + inputBt;
		espList.insertBefore(newLI, document.getElementById("addEspModifier"));

		var newLI_2 = document.createElement('li');
		var inputBt_2 = "<input class='button' style='float:right' type='button' value='Remove' onclick='removeItem(\"esp\")'/>";
		newLI_2.className = "esp";
		newLI_2.id = "esp1";
		newLI_2.innerHTML = "<span class='esp-url'>bing.com/search</span> : <span class='esp-sel'>div.sb_tlst</span>" + inputBt_2;
		espList.insertBefore(newLI_2, document.getElementById("addEspModifier"));
	}
	
    // gleebox shortcut key
	if (prefs.shortcut_key)
		document.getElementsByName("shortcut_key_span")[0].innerText = prefs.shortcut_key;
	else
		document.getElementsByName("shortcut_key_span")[0].innerText = 71; // default is g

	KeyCombo.init(document.getElementsByName("shortcut_key")[0], document.getElementsByName("shortcut_key_span")[0]);
	
	// tab manager shortcut key
	if (prefs.tab_shortcut_key != undefined)
	{
	    if (prefs.tab_shortcut_key)
    		document.getElementsByName("tab_shortcut_key_span")[0].innerText = prefs.tab_shortcut_key;
    	else
    		document.getElementsByName("tab_shortcut_key_span")[0].innerText = 190; //default is .
	}
	KeyCombo.init(document.getElementsByName("tab_shortcut_key")[0], document.getElementsByName("tab_shortcut_key_span")[0]);
	
	setSyncUI();	
	attachListeners();
    bg_window = chrome.extension.getBackgroundPage();
}

function makeItemsEditable() {
	// make domains editable
	var domainNames = document.getElementsByClassName("domain-name");
	var len = domainNames.length;
	for (var i = 0; i < len; i++)
		makeItemEditable(domainNames[i]);
	
	// make scrapers editable
	var scraperNames = document.getElementsByClassName("scraper-name");
	var scraperSels = document.getElementsByClassName("scraper-sel");
	len = scraperNames.length;
	for (var i = 0; i < len; i++)
	{
		makeItemEditable(scraperNames[i]);
		makeItemEditable(scraperSels[i]);
	}
	
	// make visions editable
	var espUrls = document.getElementsByClassName("esp-url");
	var espSels = document.getElementsByClassName("esp-sel");
	len = espUrls.length;
	for (var i = 0; i < len; i++)
	{
		makeItemEditable(espUrls[i]);
		makeItemEditable(espSels[i]);
	}
}

function makeItemEditable(el) {
	function clickHandler(e) {
	    if ((e.type == 'keydown' && e.keyCode != 13) || e.target.id == "temporary-edit-field") return true;
	    e.stopPropagation();
	    var editableField = $("#temporary-edit-field")[0];
        if (editableField) {
            closeEditableField(editableField);
        }
        var textField = document.createElement("input");
        textField.type = "text";
        textField.value = filter(this.innerHTML);
        textField.id = "temporary-edit-field";
        this.innerHTML = "";
        // invalidate the class name to avoid CSS
        this.className += "##";
        this.appendChild(textField);
        textField.focus();
        
        textField.addEventListener("keydown", function(e){
         if (e.keyCode == 13 || e.keyCode == 27)
             closeEditableField(this);
        }, false);
        
		// add event listener to document to remove editable field (if it exists)
        document.addEventListener("click", closeEditableField, false);
        
		return false;
	}
	
	el.addEventListener(
	"click",
	clickHandler,
    false
	);
	
	el.addEventListener(
	"keydown",
	clickHandler,
    false
	);
}

function closeEditableField(e) {
    var field = $("#temporary-edit-field")[0];
    if (e.target == field)
        return true;
	var val = field.value;
	var parent = field.parentNode;
	parent.removeChild(field);
	parent.className = parent.className.slice(0, parent.className.length - 2);
	parent.innerHTML = val;
	parent.focus();
	// save changes
	var container = parent.parentNode;
	switch (container.className) {
	    case "domain":  var id = container.id.slice(6);
	                    prefs.disabledUrls[id] = val;
                        saveDisabledUrls(prefs.disabledUrls, function(){});
	                    break;
	    
        case "scraper": var id = container.id.slice(7);
                        var $container = $(container);
                        prefs.scrapers[id].command = $container.find('.scraper-name').html();
                        prefs.scrapers[id].selector = $container.find('.scraper-sel').html();
                        saveScrapers(prefs.scrapers, function(){});
                        break;
        
        case "esp": var id = container.id.slice(3);
                    var $container = $(container);
                    prefs.espModifiers[id].url = $container.find('.esp-url').html();
                    prefs.espModifiers[id].selector = $container.find('.esp-sel').html();
                    saveESP(prefs.espModifiers, function(){});
                    break;
	}
    propagate();
    document.removeEventListener("click", closeEditableField, false);
}

function addURL(value) {
    prefs.disabledUrls.push(value);
	saveDisabledUrls(prefs.disabledUrls, function(){});
	propagate();
}

function addScraper(value) {
    prefs.scrapers.push(value);
    saveScrapers(prefs.scrapers, function(){});
	propagate();
}

function addESP(value) {
    prefs.espModifiers.push(value);
    saveESP(prefs.espModifiers, function(){});
	propagate();
}

function addItem(type, value1, value2, shouldSave) {
	var listOfItems;
	var lastEl;
	var content;
	switch (type) {
	    
		case "domain":
			var domainName = document.getElementById("add_domain");
			if (!value1)
			{
				value1 = domainName.value;
			    domainName.value = domainName.defaultText;
			}

			if (validateURL(value1))
			{
				listOfItems = document.getElementById("domains");
				lastEl = document.getElementById("addDomainLI");
 				content = "<span class='domain-name' tabIndex=0 >" + value1 + "</span>";
 				if (shouldSave) {
                    addURL(value1);
 				}
			}
			else
				return false;
			break;
			
		case "scraper":
			var scraperName = document.getElementById("scraper-name");
			var scraperSel = document.getElementById("scraper-selector");
			if (!value1)
			{
				value1 = scraperName.value;
				value2 = scraperSel.value;
				scraperName.value = scraperName.defaultText;
				scraperSel.value = scraperSel.defaultText;
			}

			if (validateScraper(value1, value2))
			{
 				listOfItems = document.getElementById("scraper-commands");
				lastEl = document.getElementById("addScraper");
 				content = "<strong>?</strong><span class='scraper-name' tabIndex=0 >"+ value1 +"</span> : <span class='scraper-sel' tabIndex=0 >"+ value2 +"</span>";
 				if (shouldSave) {
 				    addScraper({ command: value1, selector: value2, cssStyle: "GleeReaped", nullMessage: "Could not find any elements" });
 				}
			}
			else
				return false;
			break;

		case "esp":
			var espUrl = document.getElementById("add-esp-url");
			var espSel = document.getElementById("add-esp-selector");
			if (!value1)
			{
				value1 = espUrl.value;
				value2 = espSel.value;
				espUrl.value = espUrl.defaultText;
				espSel.value = espSel.defaultText;
			}
			if (validateEspModifier(value1, value2))
			{
 				listOfItems = document.getElementById("esp-modifiers");
				lastEl = document.getElementById("addEspModifier");
 				content = "<span class='esp-url' tabIndex=0>" + value1 + "</span> : <span class='esp-sel' tabIndex=0 >" + value2 + "</span>";
 				if (shouldSave) {
 				    addESP({url: value1, selector: value2});
 				}
			}
			else
				return false;
	}

	var	no = $('li.' + type).length;
	var newEl = $('<li>', {
	   id: type + no,
	   class: type,
	   html: content
	});
	var inputBt = $("<input>", {
	    class: 'button',
	    style: 'float: right',
	    type: 'button',
	    value: 'Remove'
	})
	.click(function(e) {
	    removeItem(e, type);
	});

    newEl.append(inputBt)
	listOfItems.insertBefore(newEl[0], lastEl);

	var children = newEl[0].children;
	var len = children.length;
	for (var i = 0; i < len; i++)
	{
		if (children[i].tagName == "SPAN")
			makeItemEditable(children[i]);
	}
}

function removeItem(e, type) {
	var listOfItems;
	var i = e.target.parentNode.id.substr(type.length);
	switch (type) {
		case "domain":
 			listOfItems = document.getElementById("domains");
            prefs.disabledUrls.splice(i, 1);
            saveDisabledUrls(prefs.disabledUrls, function(){});
			break;
			
		case "scraper":
 			listOfItems = document.getElementById("scraper-commands");
            prefs.scrapers.splice(i, 1);
            saveScrapers(prefs.scrapers, function(){});
			break;
			
		case "esp":
 			listOfItems = document.getElementById("esp-modifiers");
            prefs.espModifiers.splice(i, 1);
            saveESP(prefs.espModifiers, function(){});
	}
	var el = document.getElementById(type + i);
	listOfItems.removeChild(el);
    updateItemIndexes(type);
	propagate();
	return 0;
}

function updateItemIndexes(type) {
    var li = $('li.' + type);
    var len = li.length;
    for (var i = 0; i < len; i++) {
        li[i].id = type + i;
    }
}

function filter(text) {
	var index1 = 0;
	var index2 = 0;
	while (index1 != -1 || index2 != -1)
	{
		text = text.replace("&lt;", "<").replace("&gt;", ">");
		index1 = text.indexOf("&lt;");
		index2 = text.indexOf("&gt;");
	}
	return text;
}

/** Validation Methods **/
function validateURL(url)
{
    if (url == "Page URL" || url == "")
        return false;
    return true;
}

function validateScraper(name,selector)
{
	// check that command name/selector should not be blank
	if (name == "" || selector == "" || name == "Name" || selector == "jQuery Selector")
		return false;
	// check that command name does not conflict with the default scraper command names
	if (name == "h" || name == "?" || name == "img" || name == "a")
		return false;
	if (name.indexOf('`')!=-1 || selector.indexOf('`')!= -1)
		return false;
	return true;
}

function validateEspModifier(name,selector)
{
	// check that name/selector should not be blank
	if (name == "" || selector == "" || name == "Page URL" || selector == "jQuery Selector")
		return false;
	return true;
}

/** Manage default texts **/

function clearDefaultText(e) {
    var target = window.event ? window.event.srcElement : e ? e.target : null;
    if (!target) return;
    
    if (target.value == target.defaultText) {
        target.value = '';
    }
}

function replaceDefaultText(e) {
    var target = window.event ? window.event.srcElement : e ? e.target : null;
    if (!target) return;
    
    if (target.value == '' && target.defaultText) {
        target.value = target.defaultText;
    }
}

function initDefaultTexts() {
    var formInputs = document.getElementsByTagName('input');
    for (var i = 0; i < formInputs.length; i++) {
        var theInput = formInputs[i];
        
        if (theInput.type == 'text') {
            /* Add event handlers */
            theInput.addEventListener('focus', clearDefaultText, false);
            theInput.addEventListener('blur', replaceDefaultText, false);
            /* Save the current value */
            if (theInput.value != '') {
                theInput.defaultText = theInput.value;
            }
        }
	}
}

/** Backup: Export / Import **/

function exportSettings() {
    var text = 'Copy the contents of this text field, and save them to a textfile:';
    showBackupPopup(text, 'export');
    $("#settingsText").text(JSON.stringify(prefs));
}

function importSettings() {
    var text = 'Paste previously exported settings here:';
    showBackupPopup(text, 'import');
    $("#settingsText").text('');
}

function showBackupPopup(infoText, func) {
    var popup = $('#popup');
    if (popup.length == 0)
        initBackupPopup();
        
    if (func == 'import') {
        $('#importButton').show();
        $('#exportButton').hide();
    }
    else {
        $('#importButton').hide();
        $('#exportButton').show();
    }

    $('#backupInfo').text(infoText);
    $('#popup').fadeIn(200);
    
    setTimeout(function() {
        $('#settingsText')[0].focus();
    }, 0);
}

function initBackupPopup() {
    var popup = $('<div/>',{
        id:"popup"
    });
    
    $('<div id="backupInfo"></div>').appendTo(popup);
    $('<textarea id="settingsText"></textarea>').appendTo(popup);
    
    // import settings button
    var importBtn = $('<input type="button" class="button" value="Import Settings" id="importButton" />')
    .appendTo(popup);
    
    // copy to clipboard button (displayed in export)
    $('<input type="button" class="button" value="Copy to Clipboard" id="exportButton" />')
    .appendTo(popup)
    .click(function(e) {
        chrome.extension.sendRequest({value: "copyToClipboard", text: $('#settingsText')[0].value}, function(){});
    });
    
    $('body').append(popup);
    
    // add events
    $(document).keyup(function(e) {
        if (e.keyCode == 27)
        {
            var backupPopup = $('#popup');
            if (backupPopup.length != 0)
                hideBackupPopup();
        }
    });
    
    $(document).click(function(e) {
        if (e.target.id == "popup" || e.target.id == "settingsText" || e.target.id == "backupInfo" || e.target.type == "button")
            return true;
        var backupPopup = $('#popup');
        if (backupPopup.length != 0)
            hideBackupPopup();
    });
    
    importBtn.click(function(e) {
        try {
            var jsonString = $('#settingsText')[0].value;
            var tempPref = JSON.parse(jsonString);
            // set version to current
            tempPref.version = prefs.version;
            clearSettings();
            initSettings(tempPref);
            prefs = tempPref;
            saveAllPrefs(prefs, prefs.scrapers, prefs.disabledUrls, prefs.espModifiers, function(){});
            saveSyncData();
            $('#backupInfo').text("Settings successfully imported!");
            hideBackupPopup();
        }
        
        catch(e) {
            $('#backupInfo').text("The import format is incorrect!");
            $('#settingsText')[0].focus();
        }
    });
}

function hideBackupPopup() {
    $('#popup').fadeOut(200);
}

function clearSettings() {
    // clearing disabled urls
    var parent = document.getElementById("domains");
    $('li.domain').remove();
    $('li.scraper').remove();
    $('li.esp').remove();
}

function attachListeners() {
    function saveOption(name, value) {
        value = translateOptionValue(name, value);
        savePreference(name, value);
        prefs[name] = value;
		propagate();
    }
    
    // radio
    // for some reason, change event does not fire when using keyboard
    $('.option-field input[type=radio]').bind('change keyup', function(e) {
        if (e.type == 'keyup' && e.keyCode == 9)
            return true;
        saveOption(e.target.name, e.target.value);
    });
    
    // textfields
    $('.option-field input[type=text]:not(#add_domain, #scraper-name, #scraper-selector, #add-esp-url, #add-esp-selector)').keyup(function(e) {
        saveOption(e.target.name, e.target.value);
    });
}

function translateOptionValue(name, value) {
    switch (name) {
        case "shortcut_key": return document.getElementsByName("shortcut_key_span")[0].innerText;
        case "tab_shortcut_key": return document.getElementsByName("tab_shortcut_key_span")[0].innerText;
    }
    return value;
}

function changeSearchEngine(engine) {
    var value = "http://www.google.com/search?q=";
    switch (engine) {
        case "bing": value = "http://www.bing.com/search?q="; break;
        case "yahoo": value = "http://search.yahoo.com/search?p="; break;
    }
    var ui = $('input[name=search_engine]');
    ui.attr('value', value)
    .keyup();
}

function closeOptions(text){
	chrome.tabs.getSelected(null, function(tab){
		chrome.tabs.remove(tab.id, function(){});
	});
}

/** Sync **/

function toggleSyncing() {
    if (localStorage['gleebox_sync'] == 1) {
        localStorage['gleebox_sync'] = 0;
        bg_window.disableSync();
    }
    else {
        localStorage['gleebox_sync'] = 1;
        bg_window.enableSync(true);
    }
    setSyncUI();
}

function setSyncUI() {
    if (localStorage['gleebox_sync'] == 1) {
        $('#sync-button').attr("value", "Disable Sync");
    }
    else {
        $('#sync-button').attr("value", "Enable Sync");
    }
}