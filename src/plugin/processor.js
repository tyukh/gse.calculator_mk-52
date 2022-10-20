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

class Value {
    constructor() {
        this.empty();
    }

    get mantissa() {
        let integer = `${this._mantissaSign}${this._integer.length === 0 ? '0' : this._integer}`;
        let fraction = `${this._fraction}`;
        return `${integer}.${fraction}`;
    }

    get exponent() {
        let exponent = `${this._exponentSign}${this._exponent}`;
        return `${exponent}`;
    }

    fromDecimal(value) { // .split(/(\+|-)?(\d+)(?:\.)?(\d+)?(?:e|E)?(\+|-)?(\d+)?/).toString()); JS LOG: ,-,123,456,+,78,
        this.empty();
        let parts = value.valueOf().split(/(\+|-)?(\d+)(?:\.)?(\d+)?(?:e|E)?(\+|-)?(\d+)?/);
        const defined = (item, no, yes) => item === undefined ? no : yes(item);
        this._mantissaSign = defined(parts[1], '', part => part === '-' ? '-' : '');
        this._integer = defined(parts[2], '', part => part);
        this._fraction = defined(parts[3], '', part => part);
        this._exponentSign = defined(parts[4], '', part => part === '-' ? '-' : '');
        this._exponent = defined(parts[5], '', part => part);
    }

    toDecimal() {
        let integer = `${this._mantissaSign}${this._integer.length === 0 ? '0' : this._integer}`;
        let fraction = `${this._fraction.length !== 0 ? '.' : ''}${this._fraction}`;
        let exponent = `${this._exponent.length !== 0 ? 'e' : ''}${this._exponentSign}${this._exponent}`;
        return Decimal.Decimal(`${integer}${fraction}${exponent}`);
    }

    empty() {
        this._mantissaSign = '';
        this._integer = '';
        this._fraction = '';
        this._exponentSign = '';
        this._exponent = '';
    }

    pad() {
        if (this._exponent.length === 0)
            this._exponent = ''.padStart(Processor.Precision.MAX_E, '0');
    }

    isInteger() {
        return this._integer.length !== 0;
    }

    isMantissaFull() {
        return (this._integer.length + this._fraction.length) >= Processor.Precision.MAX;
    }

    integerExtend(value) {
        this._integer += value.toString();
    }

    fractionExtend(value) {
        this._fraction += value.toString();
    }

    exponentExtend(value) {
        this._exponent = this._exponent.slice(1) + value.toString();
    }

    exponentNegate() {
        this._exponentSign = this._exponentSign === '-' ? '' : '-';
    }
}

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

        this._actionsIs();

        this._number = new Value();
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

        CLEAR_F: 81,
        NOP: 82,

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

    _isMode(mode) {
        return ((this._mode & mode) !== 0) || (this._mode === mode);
    }

    _modeIs(mode) {
        this._mode = mode;
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
            this._indicatorsCallback(Processor.Indicator.MANTISSA, this._number.mantissa);
            this._indicatorsCallback(Processor.Indicator.EXPONENT, this._number.exponent);
        }
    }

    _input() {
        this._x = this._number.toDecimal();
        this._display();
    }

    _output() {
        this._number.fromDecimal(this._x);
        this._display();
    }

    _save() {
        this._x1 = this._x;
    }

    _restore() {
        this._x0 = this._x1;
        this._x = this._x0;
    }

    _swap() {
        this._x0 = this._y;
        this._y = this._x;
        this._x = this._x0;
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

    _doEnterE() { // "-123.456E-01".split(/(?:\+|-)?(?:\d+)(?:\.)?(?:\d+)?(?:e|E)?(?:\+)?(\-)?(?:0*([1-9][0-9]*|0))?/).toString() JS LOG: ,-,1,
        if (this._x.isZero()) { // 1. +00? 2. x0/x
            this._number.empty();
            this._modeIs(Processor.Mode.INTEGER);
            this._doDigit(Processor.Key.ONE);
        }
        this._number.pad();
        this._modeIs(Processor.Mode.EXPONENT);
        this._input();
    }

    _doPoint() {
        if (this._isMode(Processor.Mode.EXPONENT))
            this._modeIs(Processor.Mode.ERROR);
        else
        if (this._number.isInteger())
            this._modeIs(Processor.Mode.FRACTION);
    }

    _doDigit(lambda) {
        let digit = lambda();
        if (this._isMode(Processor.Mode.EXPONENT)) {
            this._number.exponentExtend(digit);
        } else {
            if (this._isMode(Processor.Mode.RESULT))
                this._doPush();
            if (this._isMode(Processor.Mode.READY)) {
                this._number.empty();
                this._modeIs(Processor.Mode.INTEGER);
            }
            if (!this._number.isMantissaFull()) {
                switch (this._mode) {
                case Processor.Mode.INTEGER:
                    this._number.integerExtend(digit);
                    break;
                case Processor.Mode.FRACTION:
                    this._number.fractionExtend(digit);
                    break;
                }
            }
        }
        this._input();
    }

    _doNegate() {
        if (this._isMode(Processor.Mode.EXPONENT)) {
            this._number.exponentNegate();
            this._input();
        } else {
            this._x0 = this._x.neg();
            this._x = this._x0;
            this._modeIs(Processor.Mode.READY);
            this._output();
        }
    }

    _doClearX() {
        this._x0 = Decimal.Decimal(0);
        this._x = this._x0;
        this._modeIs(Processor.Mode.READY);
        this._output();
    }

    _doPush() {
        this._push();
        this._modeIs(Processor.Mode.READY);
        this._output();
    }

    _doOp2(lambda) {
        this._save();
        this._x0 = lambda();
        this._pop();
        this._x = this._x0;
        this._modeIs(Processor.Mode.RESULT);
        this._output();
    }

    _doOp0(lambda) {
        lambda();
        this._modeIs(Processor.Mode.RESULT);
        this._output();
    }

    _doMode(lambda) {
        this._modeIs(lambda());
    }

    _actionsIs() {
        this._actions = new Map([
            [Processor.Key.ZERO, {
                action: this._doDigit.bind(this), lambda: () => '0',
            }],
            [Processor.Key.ONE, {
                action: this._doDigit.bind(this), lambda: () => '1',
            }],
            [Processor.Key.TWO, {
                action: this._doDigit.bind(this), lambda: () => '2',
            }],
            [Processor.Key.THREE, {
                action: this._doDigit.bind(this), lambda: () => '3',
            }],
            [Processor.Key.FOUR, {
                action: this._doDigit.bind(this), lambda: () => '4',
            }],
            [Processor.Key.FIVE, {
                action: this._doDigit.bind(this), lambda: () => '5',
            }],
            [Processor.Key.SIX, {
                action: this._doDigit.bind(this), lambda: () => '6',
            }],
            [Processor.Key.SEVEN, {
                action: this._doDigit.bind(this), lambda: () => '7',
            }],
            [Processor.Key.EIGHT, {
                action: this._doDigit.bind(this), lambda: () => '8',
            }],
            [Processor.Key.NINE, {
                action: this._doDigit.bind(this), lambda: () => '9',
            }],
            [Processor.Key.POINT, {
                action: this._doPoint.bind(this), lambda: null,
            }],
            [Processor.Key.ENTER_E, {
                action: this._doEnterE.bind(this), lambda: null,
            }],
            [Processor.Key.SIGN, {
                action: this._doNegate.bind(this), lambda: null,
            }],
            [Processor.Key.PUSH, {
                action: this._doPush.bind(this), lambda: null,
            }],
            [Processor.Key.SWAP, {
                action: this._doOp0.bind(this), lambda: () => {
                    this._save();
                    this._swap();
                },
            }],
            [Processor.Key.BACK_X, {
                action: this._doOp0.bind(this), lambda: () => {
                    this._push();
                    this._restore();
                },
            }],
            [Processor.Key.CLEAR_X, {
                action: this._doClearX.bind(this), lambda: null,
            }],
            [Processor.Key.PLUS, {
                action: this._doOp2.bind(this), lambda: () => this._y.plus(this._x),
            }],
            [Processor.Key.MINUS, {
                action: this._doOp2.bind(this), lambda: () => this._y.minus(this._x),
            }],
            [Processor.Key.MULTIPLY, {
                action: this._doOp2.bind(this), lambda: () => this._y.times(this._x),
            }],

            [Processor.Key.CLEAR_F, {
                action: this._doMode.bind(this), lambda: () => Processor.Mode.READY,
            }],
            [Processor.Key.NOP, {
                action: this._doMode.bind(this), lambda: () => Processor.Mode.READY,
            }],

            [Processor.Key.F, {
                action: this._doMode.bind(this), lambda: () => Processor.Mode.F,
            }],
            [Processor.Key.K, {
                action: this._doMode.bind(this), lambda: () => Processor.Mode.K,
            }],
        ]);

        this._translateF = new Map([
            [Processor.Key.PUSH, Processor.Key.BACK_X],
            [Processor.Key.CLEAR_X, Processor.Key.CLEAR_F],
        ]);

        this._translateK = new Map([
            [Processor.Key.ZERO, Processor.Key.NOP],
        ]);
    }

    keyPressed(key) {
        if (this._isMode(Processor.Mode.F))
            key = this._translateF.get(key);
        if (this._isMode(Processor.Mode.K))
            key = this._translateK.get(key);

        if (key === undefined)
            return;

        let action = this._actions.get(key);
        if (action === undefined)
            return;
        if (action.lambda === null)
            action.action();
        else
            action.action(action.lambda);
    }
};
