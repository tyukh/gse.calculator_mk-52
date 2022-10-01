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

'use strict';

const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

const Main = imports.ui.main;
const Calculator = Me.imports.interface;

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(Me.metadata.uuid);
    }

    enable() {
        this._calculator = new Calculator.Calculator();
        /* 
         * In here we are adding the button in the status area
         * - `PopupMenuExample` is tha role, must be unique. You can access it from the Looking Glass  in 'Main.panel.statusArea.PopupMenuExample`
         * - button is and instance of panelMenu.Button
         * - 0 is the position
         * - `right` is the box where we want our button to be displayed (left/center/right)
         */
        // Main.panel.addToStatusArea(this._uuid, this._calculator);
        Main.panel.addToStatusArea(this._uuid, this._calculator, 0, 'center');
    }

    disable() {
        this._calculator.destroy();
        this._calculator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
