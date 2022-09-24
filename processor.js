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
            maxE: Processor.Precision.MAX_E_VALUE
        });

        this._x = new Decimal.Decimal(0);
        this._y = new Decimal.Decimal(0);
        this._z = new Decimal.Decimal(0);
        this._t = new Decimal.Decimal(0);
        this._x1 = new Decimal.Decimal(0);
        this._r = new Decimal.Decimal(0);
        
        this._clear();
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
        
        if(this._number.length == 0)
            return value;

        for(let index = 0; index < this._number.length; index++) {
            if(index < this._point) {
                value = value.times(Decimal.Decimal(10));
                value = value.plus(Decimal.Decimal(this._number[index]));
            } else {
                value = value.plus(Decimal.Decimal.div(this._number[index], Decimal.Decimal.pow(10, value.decimalPlaces() + 1)));
            }
        }

/*        let power = this._numberE[0] * 10 + this._numberE[1];
        if(this._signE == true)
            power = -power;
        value = value.times(Decimal.Decimal.pow(10, power));
*/
        if(this._sign == true)
            value = value.negate();

        return value;
    }

    _toIndicator() {
        let number = Array(" ", " ", " ", " ", " ", " ", " ", " ");
        let string = "";
        
        if(this._sign == true) {
            string = "-" + string;
        }

        let index = 0;
        if(this._number.length > 0) {
            this._number.forEach(digit => {
                number[index] = digit.toString();
                index ++;
            });
            number.splice(this._point, 0, ".");
        } else {
            number[0] = "0";
            number[1] = ".";
        }

        return string + number.join("");
    }

    _setIndicator(indicator, value) {
        this._indicatorsCallback(indicator, value);
    }

    connectIndicators(callback) {
        this._indicatorsCallback = callback; 
    }

    _updateIndicators() {
        this._setIndicator(Processor.Indicator.REGISTER_X, this._x.toString());
        this._setIndicator(Processor.Indicator.REGISTER_Y, this._y.toString());
        this._setIndicator(Processor.Indicator.REGISTER_Z, this._z.toString());
        this._setIndicator(Processor.Indicator.REGISTER_T, this._t.toString());
        this._setIndicator(Processor.Indicator.REGISTER_X1, this._x1.toString());

        this._setIndicator(Processor.Indicator.INDICATOR, this._toIndicator());
        this._setIndicator(Processor.Indicator.INDICATOR_E, "");
    }

    _updateX() {
        this._setIndicator(Processor.Indicator.REGISTER_X, this._x.toString());
        this._setIndicator(Processor.Indicator.INDICATOR, this._toIndicator());
    }
    
    init() {
        this._updateIndicators();
    }

    clearX() {
        this._x = Decimal.Decimal(0);
        this._clear();
        this._updateIndicators();
    }

    pushX() {
        this._x1 = this._x;
    }

    popX() {
        this.push();
        this._x = this._x1;
    }

    push() {
        this._t = this._z;
        this._z = this._y;
        this._y = this._x;
    }

    pop() {
        this.pushX();
        this._x = this._y;
        this._y = this._z;
        this._z = this._t;
    }

    swap() {
        let temporal = this._y;
        this._y = this._x;
        this._x = temporal;
    }

    negate() {
        // this._x.negate();
    }

    point() {
        if (this._isE()) {
            this._error = true;
        } else {
            this._real = true;
        }
    }

/*    setE() {
        if(this._number.length == 0) {
            this._number.push(1);
            this._number._point = 1;
        }
        this._e = true;
    }
*/

    digit(value) {
        if (!this._isE()) {
            if(this._number.length < Processor.Precision.MAX) {
                this._number.push(value);
                if(!this._isReal()) {
                    this._point = this._number.length;
                }
            }
        } else {
            this._numberE[0] = this._numberE[1];
            this._numberE[1] = value;
        }
        this._x = this._toDecimal();
        this._updateX();
    }

};
