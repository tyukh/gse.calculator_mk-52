/* prefs.js
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

'use strict';

const {GObject, Gtk, Gio} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const PrefsWidget = GObject.registerClass({
    GTypeName: 'PrefsWidget',
    Template: Me.dir.get_child('prefs.ui').get_uri(),
    InternalChildren: ['fontFamily', 'iconPanel', 'iconPosition']
}, class PrefsWidget extends Gtk.Box {
    _init(params = {}) {
        super._init(params);

        this._settings = ExtensionUtils.getSettings(); // 'org.gnome.shell.extensions.gse.panel-calc-rpn'

        this._fontFamily.set_font(this._settings.get_string('font-family'));
        this._iconPanel.set_active_id(this._settings.get_enum('icon-panel').toString());
        this._iconPosition.set_active_id(this._settings.get_enum('icon-position').toString());

        //this._settings.bind('font-family', this._fontFamily, 'value', Gio.SettingsBindFlags.DEFAULT);
    }  

    _onFontFamilyFontSet() {
        this._settings.set_string('font-family', this._fontFamily.get_font_family().get_name());
    }

    _onIconPanelChanged() {
        this._settings.set_enum('icon-panel', parseInt(this._iconPanel.get_active_id()));
    }

    _onIconPositionChanged() {
        this._settings.set_enum('icon-position', parseInt(this._iconPosition.get_active_id()));
    }
});

function init() {
    ExtensionUtils.initTranslations(); // Me.metadata.uuid
}

function buildPrefsWidget() {
    return new PrefsWidget();
}