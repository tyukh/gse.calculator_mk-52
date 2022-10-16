/* preferences.js
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

/* eslint-disable jsdoc/require-jsdoc */
/* exported preferences enable disable */

'use strict';

const {GObject, Adw, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext;

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
// const ngettext = Domain.ngettext;

const Preferences = GObject.registerClass({
    GTypeName: 'Preferences',
    Template: Me.dir.get_child('ui').get_child('preferences.ui').get_uri(),
    InternalChildren: ['font', 'launcherPanel', 'launcherPosition'],
}, class Preferences extends Adw.PreferencesPage {
    constructor(window, properties = {}) {
        super(properties);

        this._settings = ExtensionUtils.getSettings();

        this._font.set_font(this._settings.get_string('font'));
        this._launcherPanel.set_value(['left', 'center', 'right'].indexOf(this._settings.get_string('launcher-panel')));
        this._launcherPosition.set_value([0, -1].indexOf(this._settings.get_enum('launcher-position')));

        /*
                this._launcherPanel.set_format_value_func(([], value) => {
                    return ([_("left"), _("center"), _("right")]).at(value);
                });
                this._launcherPosition.set_format_value_func(([], value) => {
                    return ([_("first"), _("last")]).at(value);
                });
        */

        this._launcherPanel.set_format_value_func(() => {
            return _('icon');
        });
        this._launcherPosition.set_format_value_func(() => {
            return _('icon');
        });

        window.connect('close-request', () => {
            this._launcherPanel.set_format_value_func(null);
            this._launcherPosition.set_format_value_func(null);
        });

        [_('left'), _('center'), _('right')].forEach((label, index) => {
            this._launcherPanel.add_mark(index, Gtk.PositionType.BOTTOM, label);
        });
        [_('first'), _('last')].forEach((label, index) => {
            this._launcherPosition.add_mark(index, Gtk.PositionType.BOTTOM, label);
        });
    }

    _onFontSet() {
        this._settings.set_string('font', this._font.get_font_family().get_name());
    }

    _onLauncherPanelChange() {
        this._settings.set_string('launcher-panel', ['left', 'center', 'right'].at(this._launcherPanel.get_value()));
    }

    _onLauncherPositionChange() {
        this._settings.set_enum('launcher-position', [0, -1].at(this._launcherPosition.get_value()));
    }
});

function preferences(window) {
    return new Preferences(window);
}
