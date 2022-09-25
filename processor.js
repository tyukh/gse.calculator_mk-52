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

//const Main = imports.ui.main;
//Main.notify('Message Title', 'Message Body');

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Decimal = Me.imports.decimal.decimal;

var Processor = class Processor {

    constructor() {
        Decimal.Decimal.set({
            precision: Processor.Precision.MAX,
            rounding: Decimal.Decimal.ROUND_HALF_UP,
            minE: Processor.Precision.MIN_E_VALUE,
            maxE: Processor.Precision.MAX_E_VALUE,
            toExpPos: Processor.Precision.MAX,
            toExpNeg: -1
        });

        this._x = new Decimal.Decimal(0);
        this._y = new Decimal.Decimal(0);
        this._z = new Decimal.Decimal(0);
        this._t = new Decimal.Decimal(0);
        this._x1 = new Decimal.Decimal(0);
        this._r = new Decimal.Decimal(0);

        this._clear();
    }

    connectIndicators(callback) {
        this._indicatorsCallback = callback;
    }

    init() {
        this._updateIndicatorsAfterOp();
    }

    static Precision = {
        MAX: 8,
        MAX_E: 2,
        MIN_E_VALUE: -99,
        MAX_E_VALUE: 99
    }

    static Indicator = {
        INDICATOR: 0,
        INDICATOR_E: 1,
        REGISTER_X: 2,
        REGISTER_Y: 3,
        REGISTER_Z: 4,
        REGISTER_T: 5,
        REGISTER_X1: 6
    }

    static Glyph = {
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

    _clear() {
        this._sign = false;
        this._number = [];
        this._point = 0;
        this._real = false;

        this._e = false;
        this._signE = false;
        this._numberE = [0, 0];

        this._error = false;
    }

    _isReal() {
        return (this._real == true);
    }

    _isE() {
        return (this._e == true);
    }

    _isError() {
        return (this._error == true);
    }

    _toDecimal() {
        let value = Decimal.Decimal(0);

        if (this._number.length == 0)
            return value;

        for (let index = 0; index < this._number.length; index++) {
            if (index < this._point) {
                value = value.times(Decimal.Decimal(10));
                value = value.plus(Decimal.Decimal(this._number[index]));
            } else {
                value = value.plus(Decimal.Decimal.div(this._number[index], Decimal.Decimal.pow(10, value.decimalPlaces() + 1)));
            }
        }

        let power = this._numberE[0] * 10 + this._numberE[1];
        if (this._signE == true)
            power = -power;
        value = value.times(Decimal.Decimal.pow(10, power));

        if (this._sign == true)
            value = value.negate();

        return value;
    }

    _toIndicator() {
        let string = "";

        if (this._number.length > 0) {
            let index = 1;
            this._number.forEach(digit => {
                string = string + digit.toString();
                if (index == this._point) {
                    string = string + ".";
                }
                index++;
            });
        } else {
            string = string + "0.";
        }

        if (this._sign == true) {
            string = "-" + string;
        }

        return string;
    }

    _toIndicatorE() {
        let string = "";

        if ((this._numberE[0] != 0) && (this._numberE[1] != 0)) {
            string = string + this._numberE[0].toString() + this._numberE[1].toString();

            if (this._signE == true) {
                string = "-" + string;
            }
        }

        return string;
    }

    _formatDecimalMantissa(value) {
        let string = value.valueOf().split("e");
        if (string[0].indexOf(".") == -1)
            string[0] = string[0].concat(".");
        return string[0];
    }

    _formatDecimalExponent(value) {
        let string = value.valueOf().split("e");
        if (string.length > 1) {
            let e = string[1].split("");
            if (e[0] == "+")
                e[0] = " ";
            if (e.length == 2)
                return e[0].concat("0", e[1]);
            else
                return e[0].concat(e[1], e[2]);
        }
        return "";
    }

    _formatDecimal(value) {
        const digit = [
            "\u{2070}", "\u{00b9}", "\u{00b2}", "\u{00b3}", "\u{2074}",
            "\u{2075}", "\u{2076}", "\u{2077}", "\u{2078}", "\u{2079}"
        ];
        let string = value.toString().split("e");
        if (string.length > 1) {
            let exp = "\u{2219}10";
            let e = string[1].split("");
            e.forEach(symbol => {
                switch (symbol) {
                    case "-":
                        exp = exp.concat("\u{207b}");
                        break;
                    case "+":
                        break;
                    default:
                        exp = exp.concat(digit[symbol.charCodeAt(0) - "0".charCodeAt(0)]);
                        break;
                }
            });
            return string[0].concat(exp); 
        }
        return string[0];
    }

    _setIndicator(indicator, value) {
        this._indicatorsCallback(indicator, value);
    }

    _updateIndicators() {
        this._setIndicator(Processor.Indicator.REGISTER_X, this._formatDecimal(this._x));
        this._setIndicator(Processor.Indicator.REGISTER_Y, this._formatDecimal(this._y));
        this._setIndicator(Processor.Indicator.REGISTER_Z, this._formatDecimal(this._z));
        this._setIndicator(Processor.Indicator.REGISTER_T, this._formatDecimal(this._t));
        this._setIndicator(Processor.Indicator.REGISTER_X1, this._formatDecimal(this._x1));

        this._setIndicator(Processor.Indicator.INDICATOR, this._toIndicator());
        this._setIndicator(Processor.Indicator.INDICATOR_E, this._toIndicatorE());
    }

    _updateIndicatorsAfterOp() {
        this._setIndicator(Processor.Indicator.REGISTER_X, this._formatDecimal(this._x));
        this._setIndicator(Processor.Indicator.REGISTER_Y, this._formatDecimal(this._y));
        this._setIndicator(Processor.Indicator.REGISTER_Z, this._formatDecimal(this._z));
        this._setIndicator(Processor.Indicator.REGISTER_T, this._formatDecimal(this._t));
        this._setIndicator(Processor.Indicator.REGISTER_X1, this._formatDecimal(this._x1));

        this._setIndicator(Processor.Indicator.INDICATOR, this._formatDecimalMantissa(this._x));
        this._setIndicator(Processor.Indicator.INDICATOR_E, this._formatDecimalExponent(this._x));
    }

    _pushX() {
        this._x1 = this._x;
    }

    _popX() {
        this._x = this._x1;
    }

    _push() {
        this._t = this._z;
        this._z = this._y;
        this._y = this._x;
    }

    _pop() {
        this._x = this._y;
        this._y = this._z;
        this._z = this._t;
    }

    /*    setE() {
            if(this._number.length == 0) {
                this._number.push(1);
                this._number._point = 1;
            }
            this._e = true;
        }
    */

    point() {
        if (this._isE()) {
            this._error = true;
        } else {
            this._real = true;
        }
    }

    digit(value) {
        if (!this._isE()) {
            if (this._number.length < Processor.Precision.MAX) {
                this._number.push(value);
                if (!this._isReal()) {
                    this._point = this._number.length;
                }
            }
        } else {
            this._numberE[0] = this._numberE[1];
            this._numberE[1] = value;
        }
        this._x = this._toDecimal();
        this._updateIndicators();
    }

    negate() {
        if (this._isE()) {
        } else {
            this._x.negate();
            this._updateIndicatorsAfterOp();
            this._clear();
        }
    }

    clearX() {
        this._x = Decimal.Decimal(0);
        this._clear();
        this._updateIndicatorsAfterOp();
    }

    up() {
        this._push();
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    swap() {
        this._pushX();
        this._r = this._y;
        this._y = this._x;
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    backX() {
        this._push();
        this._popX();
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    add() {
        this._pushX();
        this._r = this._y.plus(this._x);
        this._pop();
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    subtract() {
        this._pushX();
        this._r = this._y.minus(this._x);
        this._pop();
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    multiply() {
        this._pushX();
        this._r = this._y.times(this._x);
        this._pop();
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

};
