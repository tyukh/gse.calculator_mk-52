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

        this._indicatorsCallback = null;

        this._x = new Decimal.Decimal(0);
        this._y = new Decimal.Decimal(0);
        this._z = new Decimal.Decimal(0);
        this._t = new Decimal.Decimal(0);
        this._x1 = new Decimal.Decimal(0);
        this._x0 = new Decimal.Decimal(0);

        this._clear();
        this._modeIs(Processor.Mode.READY);
    }

    connectIndicators(callback) {
        this._indicatorsCallback = callback;
        this._output();
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
        RESULT: 1,
        INTEGER: 2,
        FRACTION: 4,
        EXPONENT: 8,
        F: 16,
        K: 32,
        ERROR: 64,
    };

    static Numerals = {
        MANTISSA_SIGN: 0,
        INTEGER: 1,
        FRACTION: 2,
        EXPONENT_SIGN: 3,
        EXPONENT: 4,
    };

    _isMode(mode) {
        return ((this._mode & mode) !== 0) || (this._mode === mode);
    }

    _modeIs(mode) {
        this._mode = mode;
    }

    _clear() {
        // [MANTISSA_SIGN, INTEGER, FRACTION, EXPONENT_SIGN, EXPONENT]
        this._number = ['', '', '', '', ''];
    }

    _toDecimal() {
        let integer = `${this._number[Processor.Numerals.MANTISSA_SIGN]}${this._number[Processor.Numerals.INTEGER].length === 0 ? '0' : this._number[Processor.Numerals.INTEGER]}`;
        let fraction = `${this._number[Processor.Numerals.FRACTION].length !== 0 ? '.' : ''}${this._number[Processor.Numerals.FRACTION]}`;
        let exponent = `${this._number[Processor.Numerals.EXPONENT].length !== 0 ? 'e' : ''}${this._number[Processor.Numerals.EXPONENT_SIGN]}${this._number[Processor.Numerals.EXPONENT]}`;
        this._x = Decimal.Decimal(`${integer}${fraction}${exponent}`);
    }

    _fromDecimal() {
        this._clear();

        let eParts = this._x.valueOf().split('e');
        let mParts = eParts[0].split('.');
        let mSign = mParts[0].indexOf('-');
        if (mSign === -1) {
            this._number[Processor.Numerals.INTEGER] = mParts[0];
        } else {
            this._number[Processor.Numerals.MANTISSA_SIGN] = '-';
            this._number[Processor.Numerals.INTEGER] = mParts[0].slice(mSign + 1);
        }
        if (mParts.length > 1)
            this._number[Processor.Numerals.FRACTION] = mParts[1];
        if (eParts.length > 1) {
            let eSign = eParts[1].indexOf('-');
            if (eSign === -1) {
                this._number[Processor.Numerals.EXPONENT] = eParts[1];
            } else {
                this._number[Processor.Numerals.EXPONENT_SIGN] = '-';
                this._number[Processor.Numerals.EXPONENT] = eParts[1].slice(eSign + 1);
            }
        }
    }

    _display() {
        this._indicatorsCallback(Processor.Indicator.REGISTER_X, this._x.toString());
        this._indicatorsCallback(Processor.Indicator.REGISTER_Y, this._y.toString());
        this._indicatorsCallback(Processor.Indicator.REGISTER_Z, this._z.toString());
        this._indicatorsCallback(Processor.Indicator.REGISTER_T, this._t.toString());
        this._indicatorsCallback(Processor.Indicator.REGISTER_X1, this._x1.toString());

        if (this._isMode(Processor.Mode.ERROR)) {
            this._indicatorsCallback(Processor.Indicator.MANTISSA, 'ERROR');
            this._indicatorsCallback(Processor.Indicator.EXPONENT, '');
        } else {
            let integer = `${this._number[Processor.Numerals.MANTISSA_SIGN]}${this._number[Processor.Numerals.INTEGER].length === 0 ? '0' : this._number[Processor.Numerals.INTEGER]}`;
            let fraction = `${this._number[Processor.Numerals.FRACTION]}`;
            let exponent = `${this._number[Processor.Numerals.EXPONENT_SIGN]}${this._number[Processor.Numerals.EXPONENT]}`;
            this._indicatorsCallback(Processor.Indicator.MANTISSA, `${integer}.${fraction}`);
            this._indicatorsCallback(Processor.Indicator.EXPONENT, `${exponent}`);
        }
    }

    _input() {
        this._toDecimal();
        this._display();
    }

    _output() {
        this._fromDecimal();
        this._display();
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
        // this._t = Decimal.Decimal(0); prototype calculator error?
    }

    _doEnterE() {
        if (this._x.isZero()) {
            this._clear();
            this._modeIs(Processor.Mode.INTEGER);
            this._doDigit(Processor.Key.ONE);
        }

        if (this._number[Processor.Numerals.EXPONENT].length === 0)
            this._number[Processor.Numerals.EXPONENT] = ''.padStart(Processor.Precision.MAX_E, '0');

        this._modeIs(Processor.Mode.EXPONENT);

        this._input();
    }

    _doPoint() {
        if (this._isMode(Processor.Mode.EXPONENT))
            this._modeIs(Processor.Mode.ERROR);
        else
        if (this._number[Processor.Numerals.INTEGER].length !== 0)
            this._modeIs(Processor.Mode.FRACTION);
    }

    _doDigit(value) {
        if (this._isMode(Processor.Mode.EXPONENT)) {
            this._number[Processor.Numerals.EXPONENT] = this._number[Processor.Numerals.EXPONENT].slice(1) + value.toString();
        } else {
            if (this._isMode(Processor.Mode.RESULT))
                this._doPush();
            if (this._isMode(Processor.Mode.READY)) {
                this._clear();
                this._modeIs(Processor.Mode.INTEGER);
            }
            if ((this._number[Processor.Numerals.INTEGER].length + this._number[Processor.Numerals.FRACTION].length) < Processor.Precision.MAX) {
                switch (this._mode) {
                case Processor.Mode.INTEGER:
                    this._number[Processor.Numerals.INTEGER] += value.toString();
                    break;
                case Processor.Mode.FRACTION:
                    this._number[Processor.Numerals.FRACTION] += value.toString();
                    break;
                }
            }
        }

        this._input();
    }

    _doNegate() {
        if (this._isMode(Processor.Mode.EXPONENT)) {
            this._number[Processor.Numerals.EXPONENT_SIGN] = this._number[Processor.Numerals.EXPONENT_SIGN] === '-' ? '' : '-';
            this._input();
        } else {
            this._x = this._x.neg();
            this._modeIs(Processor.Mode.READY);
            this._output();
        }
    }

    _doClearX() {
        this._x = Decimal.Decimal(0);
        this._modeIs(Processor.Mode.READY);
        this._output();
    }

    _doPush() {
        this._push();
        this._modeIs(Processor.Mode.READY);
        this._output();
    }

    _doSwap() {
        this._pushX();
        this._x0 = this._y;
        this._y = this._x;
        this._x = this._x0;
        this._modeIs(Processor.Mode.RESULT);
        this._output();
    }

    _doBackX() {
        this._push();
        this._popX();
        this._modeIs(Processor.Mode.RESULT);
        this._output();
    }

    __add() {
        this._pushX();
        this._x0 = this._y.plus(this._x);
        this._pop();
        this._x = this._x0;
        this._modeIs(Processor.Mode.RESULT);
        this._output();
    }

    __subtract() {
        this._pushX();
        this._x0 = this._y.minus(this._x);
        this._pop();
        this._x = this._x0;
        this._modeIs(Processor.Mode.RESULT);
        this._output();
    }

    __multiply() {
        this._pushX();
        this._x0 = this._y.times(this._x);
        this._pop();
        this._x = this._x0;
        this._modeIs(Processor.Mode.RESULT);
        this._output();
    }

    keyPressed(key) {
        if (this._isMode(Processor.Mode.F)) {
            switch (key) {
            case Processor.Key.PUSH:
                key = Processor.Key.BACK_X;
                break;

            case Processor.Key.CLEAR_X:
                this._modeIs(Processor.Mode.READY);
                break;

            default:
                return;
            }
        }

        if (this._isMode(Processor.Mode.K)) {
            switch (key) {
            case Processor.Key.ZERO:
                this._modeIs(Processor.Mode.READY);
                break;

            default:
                return;
            }
        }

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
            this._doDigit(key);
            break;

        case Processor.Key.POINT:
            this._doPoint();
            break;

        case Processor.Key.ENTER_E:
            this._doEnterE();
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
            this._doNegate();
            break;

        case Processor.Key.PUSH:
            this._doPush();
            break;

        case Processor.Key.SWAP:
            this._doSwap();
            break;

        case Processor.Key.BACK_X:
            this._doBackX();
            break;

        case Processor.Key.CLEAR_X:
            this._doClearX();
            break;

        case Processor.Key.F:
            this._modeIs(Processor.Mode.F);
            break;

        case Processor.Key.K:
            this._modeIs(Processor.Mode.K);
            break;

        default:
        }
    }
};
