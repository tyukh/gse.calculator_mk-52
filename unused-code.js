//        let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
//        item.connect('activate', () => {
//            Main.notify(_('Whatʼs up, folks?'));
//        });
//        this.menu.addMenuItem(item);

this._display = new St.Entry({
    text: "0\n0\n10.1\n13.5\n0",
    x_expand: true,
    y_expand: true, 
    x_align: Clutter.ActorAlign.FILL,
    y_align: Clutter.ActorAlign.FILL
});

this._display.get_clutter_text().set_single_line_mode(false);
this._display.get_clutter_text().set_justify(false);        
this._display.get_clutter_text().set_line_alignment(Pango.Alignment.RIGHT);
//        this._display.get_clutter_text().set_cursor_visible(false);
//        this._display.get_clutter_text().set_activatable(false);
//        this._display.get_clutter_text().set_markup("<tt>0\n0\n0\n<b>12.011</b>\n0</tt>");
