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
        this._x0 = new Decimal.Decimal(0);

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

        POINT: 10,
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
    };

    static Mode = {
        READY: 0,
        INTEGER: 1,
        FRACTION: 2,
        EXPONENT: 3,
        F: 4,
        K: 5,
        ERROR: 6,
    };

    _isMode(mode) {
        return this._mode === mode;
    }

    _modeIs(mode) {
        this._mode = mode;
    }

    _clear() {
        this._mantissaSign = false;
        this._integer = [];
        this._fraction = [];

        this._exponentSign = false;
        this._exponent = [0, 0];

        this._modeIs(Processor.Mode.READY);
    }

    _toDecimal() {
        let value = Decimal.Decimal(0);

        if (this._integer.length === 0)
            return value;

        let integer = this._integer.reduce(
            (accumulator, digit) => accumulator.times(Decimal.Decimal(10)).plus(Decimal.Decimal(digit)),
            Decimal.Decimal(0)
        );

        let fraction = this._fraction.reduceRight(
            (accumulator, digit) => accumulator.plus(Decimal.Decimal(digit)).div(Decimal.Decimal(10)),
            Decimal.Decimal(0)
        );

        value = Decimal.Decimal.add(integer, fraction);

        if (this._mantissaSign === true)
            value = value.neg();

        let exponent = this._exponent.reduce(
            (accumulator, digit) => accumulator.times(Decimal.Decimal(10)).plus(Decimal.Decimal(digit)),
            Decimal.Decimal(0)
        );

        if (this._exponentSign === true)
            exponent = exponent.neg();

        value = value.times(Decimal.Decimal.pow(10, exponent));

        return value;
    }

    _toIndicatorM() {
        let string = '';

        if (this._integer.length === 0)
            string = '0.';
        else
            string = `${this._integer.join('')}.${this._fraction.join('')}`;

        if (this._mantissaSign === true)
            string = `-${string}`;

        return string;
    }

    _toIndicatorE() {
        let string = '';

        if (this._exponent.reduce((total, value) => {
            return total + value;
        }) !== 0) {
            string = this._exponent.join('');
            if (this._exponentSign === true)
                string = `-${string}`;
        }
        return string;
    }

    _formatDecimalM(value) {
        let string = value.valueOf().split('e');
        if (string[0].indexOf('.') === -1)
            string[0] = string[0].concat('.');
        return string[0];
    }

    _formatDecimalE(value) {
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

    // remove unnecessary functions and conversions - indicator should be link only with editor, so add decimal to editor convertor

    _updateIndicatorsAfterMantissa() {
        this._updateRegisterIndicators();
        this._setIndicator(Processor.Indicator.MANTISSA, this._toIndicatorM());
        this._setIndicator(Processor.Indicator.EXPONENT, this._toIndicatorE());
    }

    _updateIndicatorsAfterExponent() {
        this._updateRegisterIndicators();
        this._setIndicator(Processor.Indicator.MANTISSA, this._formatDecimalM(this._x));
        this._setIndicator(Processor.Indicator.EXPONENT, this._toIndicatorE());
    }

    _updateIndicatorsAfterOp() {
        this._updateRegisterIndicators();
        this._setIndicator(Processor.Indicator.MANTISSA, this._formatDecimalM(this._x));
        this._setIndicator(Processor.Indicator.EXPONENT, this._formatDecimalE(this._x));
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

    // change to _do? section and math ops by callback functions

    __enterE() {
        if (this._integer.length === 0) {
            this._modeIs(Processor.Mode.INTEGER);
            this.__digit(Processor.Key.ONE);
        }
        this._modeIs(Processor.Mode.EXPONENT);
    }

    __point() {
        if (this._isMode(Processor.Mode.EXPONENT))
            this._modeIs(Processor.Mode.ERROR);
        else
        if (this._integer.length !== 0)
            this._modeIs(Processor.Mode.FRACTION);
    }

    __digit(value) {
        switch (this._mode) {
        case Processor.Mode.EXPONENT:
            this._exponent[0] = this._exponent[1];
            this._exponent[1] = value;
            break;

        case Processor.Mode.READY: // need clear?
            this._modeIs(Processor.Mode.INTEGER);

        // eslint-disable-next-line no-fallthrough
        case Processor.Mode.INTEGER:
            if ((this._integer.length + this._fraction.length) < Processor.Precision.MAX)
                this._integer.push(value);
            break;

        case Processor.Mode.FRACTION:
            if ((this._integer.length + this._fraction.length) < Processor.Precision.MAX)
                this._fraction.push(value);
            break;
        }

        this._x = this._toDecimal();

        if (this._isMode(Processor.Mode.EXPONENT))
            this._updateIndicatorsAfterExponent();
        else
            this._updateIndicatorsAfterMantissa();
    }

    __negate() {
        if (this._isMode(Processor.Mode.EXPONENT)) {
            this._exponentSign = !this._exponentSign;
            this._x = this._toDecimal();
            this._updateIndicatorsAfterExponent();
        } else {
            this._x = this._x.neg();
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
        this._x0 = this._y;
        this._y = this._x;
        this._x = this._x0;
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
        this._x0 = this._y.plus(this._x);
        this._pop();
        this._x = this._x0;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    __subtract() {
        this._pushX();
        this._x0 = this._y.minus(this._x);
        this._pop();
        this._x = this._x0;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    __multiply() {
        this._pushX();
        this._x0 = this._y.times(this._x);
        this._pop();
        this._x = this._x0;
        this._updateIndicatorsAfterOp();
        this._clear();
    }

    keyPressed(key) {
        switch (key) {
        case Processor.Key.ZERO:
        case Processor.Key.ONE:
        case Processor.Key.TWO:
        case Processor.Key.THREE:
        case Processor.Key.FOUR:
        case Processor.Key.FIVE:
        case Processor.Key.SIX:
        case Processor.Key.SEVEN:
        case Processor.Key.EIGHT:
        case Processor.Key.NINE:
            this.__digit(key);
            break;

        case Processor.Key.POINT:
            this.__point();
            break;

        case Processor.Key.ENTER_E:
            this.__enterE();
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
