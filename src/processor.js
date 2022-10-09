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

/* exported Processor enable disable */

'use strict';

// const Main = imports.ui.main;
// Main.notify('Message Title', 'Message Body');

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
            toExpNeg: -1,
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
        MAX_E_VALUE: 99,
    };

    static Key = {
        ZERO: 0,
        ONE: 1,
        TWO: 2,
        THREE: 3,
        FOUR: 4,
        FIVE: 5,
        SIX: 6,
        SEVEN: 7,
        EIGHT: 8,
        NINE: 9,

        PERIOD: 10,
        SIGN: 11,
        ENTER_E: 12,

        PUSH: 20,
        SWAP: 21,
        CLEAR_X: 22,
        BACK_X: 23,

        PLUS: 30,
        MINUS: 31,
        MULTIPLY: 32,
        DIVIDE: 33,

        F: 90,
        K: 91,

        RESERVED_NULL: 9999,
    };

    static Indicator = {
        MANTISSA: 0,
        EXPONENT: 1,
        REGISTER_X: 2,
        REGISTER_Y: 3,
        REGISTER_Z: 4,
        REGISTER_T: 5,
        REGISTER_X1: 6,
        MODE: 7,
    };

    static Mode = {
        NORMAL_MODE: 0,
        EE_MODE: 1,
        F_MODE: 2,
        K_MODE: 3,
        E_MODE: 4,
    };

    _clear() {
        this._mantissaSign = false;
        this._mantissa = [];
        this._fraction = 0;
        this._real = false;

        this._exponentSign = false;
        this._exponent = [0, 0];

        this._mode = Processor.Mode.NORMAL_MODE;
    }

    _isReal() {
        return this._real === true;
    }

    _isE() {
        return this._mode === Processor.Mode.EE_MODE;
    }

    _isError() {
        return this._mode === Processor.Mode.E_MODE;
    }

    _toDecimal() {
        let value = Decimal.Decimal(0);

        if (this._mantissa.length === 0)
            return value;

        for (let index = 0; index < this._mantissa.length; index++) {
            if (index < this._fraction) {
                value = value.times(Decimal.Decimal(10));
                value = value.plus(Decimal.Decimal(this._mantissa[index]));
            } else {
                value = value.plus(Decimal.Decimal.div(this._mantissa[index], Decimal.Decimal.pow(10, value.decimalPlaces() + 1)));
            }
        }

        let power = this._exponent[0] * 10 + this._exponent[1];
        if (this._exponentSign === true)
            power = -power;
        value = value.times(Decimal.Decimal.pow(10, power));

        if (this._mantissaSign === true)
            value = value.negate();

        return value;
    }

    _toIndicator() {
        let string = '';

        if (this._mantissa.length > 0) {
            let index = 1;
            this._mantissa.forEach(digit => {
                string += digit.toString();
                if (index === this._fraction)
                    string += '.';

                index++;
            });
        } else {
            string += '0.';
        }

        if (this._mantissaSign === true)
            string = `-${string}`;


        return string;
    }

    _toIndicatorE() {
        let string = '';

        if ((this._exponent[0] !== 0) && (this._exponent[1] !== 0)) {
            string = string + this._exponent[0].toString() + this._exponent[1].toString();

            if (this._exponentSign === true)
                string = `-${string}`;
        }

        return string;
    }

    _formatDecimalMantissa(value) {
        let string = value.valueOf().split('e');
        if (string[0].indexOf('.') === -1)
            string[0] = string[0].concat('.');
        return string[0];
    }

    _formatDecimalExponent(value) {
        let string = value.valueOf().split('e');
        if (string.length > 1) {
            let e = string[1].split('');
            if (e[0] === '+')
                e[0] = ' ';
            if (e.length === 2)
                return e[0].concat('0', e[1]);
            else
                return e[0].concat(e[1], e[2]);
        }
        return '';
    }

    _formatDecimal(value) {
        const digit = [
            '\u{2070}', '\u{00b9}', '\u{00b2}', '\u{00b3}', '\u{2074}',
            '\u{2075}', '\u{2076}', '\u{2077}', '\u{2078}', '\u{2079}',
        ];
        let string = value.toString().split('e');
        if (string.length > 1) {
            let exp = '\u{2219}10';
            let e = string[1].split('');
            e.forEach(symbol => {
                switch (symbol) {
                case '-':
                    exp = exp.concat('\u{207b}');
                    break;
                case '+':
                    break;
                default:
                    exp = exp.concat(digit[symbol.charCodeAt(0) - '0'.charCodeAt(0)]);
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

    _updateRegisterIndicators() {
        this._setIndicator(Processor.Indicator.REGISTER_X, this._formatDecimal(this._x));
        this._setIndicator(Processor.Indicator.REGISTER_Y, this._formatDecimal(this._y));
        this._setIndicator(Processor.Indicator.REGISTER_Z, this._formatDecimal(this._z));
        this._setIndicator(Processor.Indicator.REGISTER_T, this._formatDecimal(this._t));
        this._setIndicator(Processor.Indicator.REGISTER_X1, this._formatDecimal(this._x1));
    }

    _updateIndicatorsAfterMantissa() {
        this._updateRegisterIndicators();
        this._setIndicator(Processor.Indicator.MANTISSA, this._toIndicator());
        this._setIndicator(Processor.Indicator.EXPONENT, this._toIndicatorE());
    }

    _updateIndicatorsAfterExponent() {
        this._updateRegisterIndicators();
        this._setIndicator(Processor.Indicator.MANTISSA, this._formatDecimalMantissa(this._x));
        this._setIndicator(Processor.Indicator.EXPONENT, this._toIndicatorE());
    }

    _updateIndicatorsAfterOp() {
        this._updateRegisterIndicators();
        this._setIndicator(Processor.Indicator.MANTISSA, this._formatDecimalMantissa(this._x));
        this._setIndicator(Processor.Indicator.EXPONENT, this._formatDecimalExponent(this._x));
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
        this._t = Decimal.Decimal(0);
    }

    __setE() {
        if (this._mantissa.length === 0) {
            this._mantissa.push(1);
            this._mantissa._fraction = 1;
        }
        this._e = true;
    }

    __point() {
        if (this._isE())
            this._error = true;
        else
            this._real = true;
    }

    __digit(value) {
        if (!this._isE()) {
            if (this._mantissa.length < Processor.Precision.MAX) {
                this._mantissa.push(value);
                if (!this._isReal())
                    this._fraction = this._mantissa.length;
            }
            this._x = this._toDecimal();
            this._updateIndicatorsAfterMantissa();
        } else {
            this._exponent[0] = this._exponent[1];
            this._exponent[1] = value;
            this._x = this._toDecimal();
            this._updateIndicatorsAfterExponent();
        }
    }

    __negate() {
        if (!this._isE()) {
            this._x.negate();
            this._updateIndicatorsAfterOp();
            this._clear();
        }
    }

    __clearX() {
        this._x = Decimal.Decimal(0);
        this._clear();
        this._updateIndicatorsAfterOp();
    }

    __push() {
        this._push();
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    __swap() {
        this._pushX();
        this._r = this._y;
        this._y = this._x;
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    __backX() {
        this._push();
        this._popX();
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    __add() {
        this._pushX();
        this._r = this._y.plus(this._x);
        this._pop();
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    __subtract() {
        this._pushX();
        this._r = this._y.minus(this._x);
        this._pop();
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    __multiply() {
        this._pushX();
        this._r = this._y.times(this._x);
        this._pop();
        this._x = this._r;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    keyPressed(key) {
        switch (key) {
        case Processor.Key.ZERO:
            this.__digit(0);
            break;

        case Processor.Key.ONE:
            this.__digit(1);
            break;

        case Processor.Key.TWO:
            this.__digit(2);
            break;

        case Processor.Key.THREE:
            this.__digit(3);
            break;

        case Processor.Key.FOUR:
            this.__digit(4);
            break;

        case Processor.Key.FIVE:
            this.__digit(5);
            break;

        case Processor.Key.SIX:
            this.__digit(6);
            break;

        case Processor.Key.SEVEN:
            this.__digit(7);
            break;

        case Processor.Key.EIGHT:
            this.__digit(8);
            break;

        case Processor.Key.NINE:
            this.__digit(9);
            break;

        case Processor.Key.PERIOD:
            this.__point();
            break;

        case Processor.Key.PLUS:
            this.__add();
            break;

        case Processor.Key.MINUS:
            this.__subtract();
            break;

        case Processor.Key.MULTIPLY:
            this.__multiply();
            break;

        case Processor.Key.DIVIDE:

            break;

        case Processor.Key.SIGN:
            this.__negate();
            break;

        case Processor.Key.PUSH:
            this.__push();
            break;

        case Processor.Key.SWAP:
            this.__swap();
            break;

        case Processor.Key.BACK_X:
            this.__backX();
            break;

        case Processor.Key.CLEAR_X:
            this.__clearX();
            break;

        default:
        }
    }
};
