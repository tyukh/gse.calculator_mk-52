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

        this._xSign = new Decimal.Decimal(1);
        this._xDigits = 8;
        this._xPeriod = false;

        this._x = new Decimal.Decimal(0);
        this._y = new Decimal.Decimal(0);
        this._z = new Decimal.Decimal(0);
        this._t = new Decimal.Decimal(0);
        this._x1 = new Decimal.Decimal(0);

    }

    Register = {
        X: 0,
        Y: 1,
        Z: 2,
        T: 3,
        X1: 4
    };

    Glyph = {
        ZERO: "0",
        ONE: "1",
        TWO: "2",
        THREE: "3",
        FOUR: "4",
        FIVE: "5",
        SIX: "6",
        SEVEN: "7",
        EIGHT: "8",
        NINE: "9",
        PERIOD: ".",
        PLUS: "+",
        MINUS: "-",
        MULTIPLY: "\u{00D7}",
        DIVIDE: "\u{00F7}",
        SIGN: "\u{00B1}",
        UP: "\u{2191}",
        SWAP: "\u{27F7}",
        BACK_X: "BX",
        CLEAR_X: "CX"
    };

    _format(register) {
        let string = "-1.2345678-99";
        const digits = [
            '\u{1F100}', '\u{2488}', '\u{2489}', '\u{248A}', '\u{248B}', '\u{248C}', '\u{248D}', '\u{248E}', '\u{248F}', '\u{2490}'
        ];

        switch (register) {
            case this.Register.X:
                string = this._x.valueOf();
                break;
            case this.Register.Y:
                string = this._y.valueOf();
                break;
            case this.Register.Z:
                string = this._z.valueOf();
                break;
            case this.Register.T:
                string = this._t.valueOf();
                break;
            case this.Register.X1:
                string = this._x1.valueOf();
                break;
        }

        return string;
    }

    get x() {
        return this._format(this.Register.X);
    }

    get y() {
        return this._format(this.Register.Y);
    }

    get z() {
        return this._format(this.Register.Z);
    }

    get t() {
        return this._format(this.Register.T);
    }

    get x1() {
        return this._format(this.Register.X1);
    }

    _defaultXParameters() {
        this._xSign = Decimal.Decimal(1);
        this._xDigits = 8;
        this._xPeriod = false;
        return Decimal.Decimal(0);
    }

    clearX() {
        this._x = this._clearXParameters();
    }

    _unsignZeroX() {
        if (this._x.isZero() && this._x.isNegative())
            this.negate();
        return this._x;
    }

    pushX() {
        this._x1 = this._unsignZeroX();
    }

    popX() {
        this.push();
        this._x = this._x1;
    }

    push() {
        this._t = this._z;
        this._z = this._y;
        this._y = this._unsignZeroX();
    }

    pop() {
        this.pushX();
        this._x = this._y;
        this._y = this._z;
        this._z = this._t;
    }

    swap() {
        let s = this._y;
        this._y = this._unsignZeroX();
        this._x = s;
    }

    negate() {
        this._xSign = this._xSign.negated();
        this._x = this._x.negated();
    }

    point() {
        this._xPeriod = true;
    }

    setDigit(digit) {
        return;
    }

};