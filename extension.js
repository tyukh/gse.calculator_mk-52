/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const { GObject, St } = imports.gi;
const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _(`${Me.metadata.name} Indicator`));

        this.add_child(new St.Icon({
            icon_name: 'org.gnome.Calculator-symbolic',
            style_class: 'system-status-icon',
        }));

//        let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
//        item.connect('activate', () => {
//            Main.notify(_('Whatʼs up, folks?'));
//        });
//        this.menu.addMenuItem(item);

//-- Init display controls

        let displayArea = new PopupMenu.PopupBaseMenuItem({
            reactive: false/*,
            style_class: 'openweather-menu-button-container'*/
        });

        let displayBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER/*,
            style_class: 'system-menu-action openweather-current-summarybox'*/
        });

//-- Insert controls
//        displayBox.add_actor(!);
        this._display = new St.Entry();
        displayBox.add_actor(this._display);

        displayArea.actor.add_child(displayBox);

//-- Init keyboard controls

        let keyboardArea = new PopupMenu.PopupBaseMenuItem({
            reactive: false/*,
            style_class: 'openweather-menu-button-container'*/
        });
        
        let keyboardBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER/*,
            style_class: 'system-menu-action openweather-current-summarybox'*/
        });

//-- Insert controls
//        keyboardBox.add_actor(!);

        keyboardArea.actor.add_child(keyboardBox);

//-- Init Popup

        this.menu.addMenuItem(displayArea);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(keyboardArea);

    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(Me.metadata.uuid);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
