/* processor.js
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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Decimal = Me.imports.decimal.decimal;

var Processor = class Processor {
    constructor() {

        Decimal.Decimal.set({
            precision: 8,
            rounding: Decimal.Decimal.ROUND_HALF_UP
        });

        this._x = new Decimal.Decimal(0);
        this._y = new Decimal.Decimal(0);
        this._z = new Decimal.Decimal(0);
        this._t = new Decimal.Decimal(0);
        this._x1 = new Decimal.Decimal(0);

    }

    getX() {
        return this._x.toString();
    }

    getY() {
        return this._y.toString();
    }

    getZ() {
        return this._z.toString();
    }

    getT() {
        return this._t.toString();
    }

    getX1() {
        return this._x1.toString();
    }

};