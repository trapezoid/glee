/* Glee's very own List Manager. Currently only used for the Tab manager */

Glee.ListManager = {
    items: null,

    box: null,

    searchField: null,

    selected: null,

    currentIndex: null,

    // method to be called once an action is executed on any item
    callback: null,

    openBox: function(data, callback) {
        this.callback = callback;
        this.items = data;
        if (!this.box)
            this.createBox();
        else
            this.box.html('');
        this.createSearchField();
        this.createList();
        this.initKeyBindings();
        this.box.fadeIn(150, function() {
            setTimeout(function() {
                Glee.ListManager.currentIndex = -1;
                Glee.ListManager.selectSearchField();
            }, 0);
        });
    },

    closeBox: function(returnFocus, callback) {
        this.box.fadeOut(150, function() {
            Glee.ListManager.box.html('');
            Glee.ListManager.items = null;
            Glee.ListManager.selected = null;
            Glee.ListManager.currentIndex = null;
            if (returnFocus)
                Glee.getBackInitialState();
            if (callback)
                callback();
        });
    },

    createBox: function() {
        this.box = $("<div id='gleeListManager' ></div>");
        this.box.addClass(Glee.options.theme)
        .appendTo(document.body);
    },

    exists: function() {
        if (this.box)
            return true;
        else
            return false;
    },

    applyTheme: function() {
        if (this.exists()) {
            this.resetTheme;
            this.box.addClass(Glee.options.theme);
        }
    },

    resetTheme: function() {
        this.box.removeClass(Glee.defaults.themes.join(' '));
    },

    initKeyBindings: function() {
        $('#gleeListSearchField, .gleeListItem').bind('keydown', function(e) {
            if (e.keyCode == 27) // ESC
                Glee.ListManager.closeBox(true);

            // TAB
            else if (e.keyCode == 9) {
                e.preventDefault();
                e.stopPropagation();
                if (e.shiftKey)
                    Glee.ListManager.getPreviousItem();
                else
                    Glee.ListManager.getNextItem();
            }
            // up/down arrow keys
            else if (e.keyCode == 40 || e.keyCode == 38) {
                e.preventDefault();
                e.stopPropagation();
                if (e.keyCode == 40)
                    Glee.ListManager.getNextItem();
                else
                    Glee.ListManager.getPreviousItem();
            }
            // ENTER
            else if (e.keyCode == 13) {
                e.preventDefault();
                Glee.ListManager.openItem();
            }
        });
        $('#gleeListSearchField').bind('keyup', function(e) {
            Glee.ListManager.refreshList();
        });
        $('.gleeListItem').bind('keydown', function(e) {

            if (e.keyCode == 8 || e.keyCode == 67) {
                e.preventDefault();
                Glee.ListManager.removeItem();
            }
            else if (e.keyCode == Glee.shortcutKey) {
                e.preventDefault();
                Glee.ListManager.closeBox(false);
            }
        });
    },

    createSearchField: function() {
        this.searchField = $("<input id='gleeListSearchField' type='text' />");
        this.box.append(this.searchField);
    },

    createList: function() {
        var listDIV = $('<div id="gleeList"></div>');
        var len = this.items.length;
        var item;
        for (var i = 0; i < len; i++) {
            item = $('<a href="#" id="gleeList' + i + '" class="gleeListItem"></a>');
            if (this.items[i].title)
                item.html(this.items[i].title);
            else
                item.html('Untitled');
            listDIV.append(item);
        }
        this.box.append(listDIV);
    },

    refreshList: function() {
        var query = this.searchField.attr('value');

        var listItems = $('.gleeListItem');
        var len = listItems.length;
        var self = this;
        chrome.extension.sendRequest(
                'pocnedlaincikkkcmlpcbipcflgjnjlj' // ChromeMigemo の Extension ID (Extension Gallery からインストールした場合)
                ,{"action": "getRegExpString", "query": query}
                ,function(response) {
                    var regexp = new RegExp(response.result, 'i');

                    for (var i = 0; i < len; i++) {
                        if (regexp.test(listItems[i].innerText.toLowerCase())) {
                            self.showInList(i);
                        } else {
                            self.hideFromList(i);
                        }
                    }
                    self.currentIndex = -1;
                    self.selected = $('.gleeListItem:visible')[0];
                }
                );

    },

    getSelectedItemIndex: function() {
        var idString = this.selected.id;
        return idString.substring(8, idString.length);
    },

    hideFromList: function(index) {
        $($('.gleeListItem')[index])
        .css('display', 'none');
    },

    showInList: function(index) {
        $($('.gleeListItem')[index])
        .css('display', 'block');
    },

    selectSearchField: function() {
        this.selected = $('.gleeListItem:visible')[0];
        setTimeout(function() {
                Glee.ListManager.searchField.focus();
        },0);
    },

    select: function(index) {
        if (index == -1) return;
        this.selected = $('.gleeListItem:visible')[index];
        setTimeout(function() {
                Glee.ListManager.selected.focus();
        },0);
        $(this.selected).addClass('gleeListItemHover');
    },

    deselect: function(index) {
        if (index == -1) return;
        $($('.gleeListItem:visible')[index]).removeClass('gleeListItemHover');
    },

    getNextItem: function() {
        this.deselect(this.currentIndex);
        var listLen = $('.gleeListItem:visible').length;
        if (this.currentIndex >= (listLen - 1)) {
            this.currentIndex = -1;
            this.selectSearchField();
        }
        else {
            this.currentIndex += 1;
            this.select(this.currentIndex);
        }
    },

    getPreviousItem: function() {
        this.deselect(this.currentIndex);
        var listLen = $('.gleeListItem:visible').length;
        if (this.currentIndex == 0) {
            this.currentIndex = -1;
            this.selectSearchField();
            return;
        }
        else if (this.currentIndex == -1)
            this.currentIndex = listLen - 1;
        else
            this.currentIndex -= 1;

        this.select(this.currentIndex);
    },

    removeItem: function() {
        var itemIndex = this.getSelectedItemIndex();
        var item = this.items[itemIndex];
        $(Glee.ListManager.selected)
        .animate({
            height: '0',
            paddingTop: 0,
            paddingBottom: 0
        }, 200,
        function() {
            $(Glee.ListManager.selected).remove();
            Glee.ListManager.currentIndex -= 1;
            Glee.ListManager.getNextItem();
        });
        this.callback('remove', item);
    },

    openItem: function() {
        var item = this.items[Glee.ListManager.getSelectedItemIndex()];
        this.closeBox(true, function() {
            Glee.ListManager.callback('open', item);
        });
    }
};
