/* plugin.js
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
/* exported plugin enable disable */

'use strict';

const {GObject} = imports.gi;
const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
// const ngettext = Domain.ngettext;

const Main = imports.ui.main;
const Interface = Me.imports.plugin.interface;

const Plugin = GObject.registerClass({
    Properties: {
        'uuid': GObject.ParamSpec.string(
            'uuid',
            'uuid',
            'A read-write string property',
            GObject.ParamFlags.READWRITE,
            ''
        ),
    },
}, class Plugin extends GObject.Object {
    constructor(properties = {}) {
        super(properties);

        ExtensionUtils.initTranslations();

        this._settings = ExtensionUtils.getSettings();

        this._settings.connect('changed::font', this._onExtensionSettingsChanged.bind(this));
        this._settings.connect('changed::launcher-panel', this._onExtensionSettingsChanged.bind(this));
        this._settings.connect('changed::launcher-position', this._onExtensionSettingsChanged.bind(this));

        this._font = this._settings.get_string('font');
        this._launcherPanel = this._settings.get_string('launcher-panel');
        this._launcherPosition = this._settings.get_enum('launcher-position');
    }

    get uuid() {
        if (this._uuid === undefined)
            this._uuid = null;

        return this._uuid;
    }

    set uuid(value) {
        if (this._uuid !== value)
            this._uuid = value;
    }

    enable() {
        this._calculator = new Interface.Calculator({
            font: this._font,
        });
        /* In here we are adding the button in the status area
         * - `PopupMenuExample` is tha role, must be unique. You can access it from the Looking Glass  in 'Main.panel.statusArea.PopupMenuExample`
         * - button is and instance of panelMenu.Button
         * - 0 is the position
         * - `right` is the box where we want our button to be displayed (left/center/right)
         */
        Main.panel.addToStatusArea(this._uuid, this._calculator.launcher, this._launcherPosition, this._launcherPanel);
    }

    disable() {
        this._calculator.destroy();
        this._calculator = null;
    }

    _onExtensionSettingsChanged() {
        this._font = this._settings.get_string('font');
        this._launcherPanel = this._settings.get_string('launcher-panel');
        this._launcherPosition = this._settings.get_enum('launcher-position');

        this.disable();
        this.enable();
    }
});

function plugin(meta) {
    return new Plugin({uuid: meta.uuid});
}
