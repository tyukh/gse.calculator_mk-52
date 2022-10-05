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
    Template: Me.dir.get_child('ui').get_child('prefs.ui').get_uri(),
    InternalChildren: ['font', 'launcherPanel', 'launcherPosition']
}, class PrefsWidget extends Gtk.Box {
    constructor(properties = {}) {
        super(properties);

        this._settings = ExtensionUtils.getSettings();

        this._font.set_font(this._settings.get_string('font'));
        this._launcherPanel.set_active_id(this._settings.get_enum('launcher-panel').toString());
        this._launcherPosition.set_active_id(this._settings.get_enum('launcher-position').toString());

        //this._settings.bind('font-family', this._fontFamily, 'value', Gio.SettingsBindFlags.DEFAULT);
    }

    _onFontSet() {
        this._settings.set_string('font', this._font.get_font_family().get_name());
    }

    _onLauncherPanelChanged() {
        this._settings.set_enum('launcher-panel', parseInt(this._launcherPanel.get_active_id()));
    }

    _onLauncherPositionChanged() {
        this._settings.set_enum('launcher-position', parseInt(this._launcherPosition.get_active_id()));
    }
});

function init() {
    ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
    return new PrefsWidget();
}