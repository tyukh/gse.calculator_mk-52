/* interface.js
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

/* exported Calculator enable disable */

'use strict';

const {GObject, St, Clutter} = imports.gi;
const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
// const ngettext = Domain.ngettext;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Processor = Me.imports.plugin.processor;

const Key = GObject.registerClass({
    Properties: {
        'key-id': GObject.ParamSpec.uint(
            'key-id',
            'keyId',
            'A read-write integer property',
            GObject.ParamFlags.READWRITE,
            0, 65535,
            0
        ),
    },
}, class Key extends St.Button {
    get keyId() {
        if (this._keyId === undefined)
            this._keyId = null;
        return this._keyId;
    }

    set keyId(value) {
        if (this._keyId !== value)
            this._keyId = value;
    }
});


var Calculator = GObject.registerClass({
    Properties: {
        'font': GObject.ParamSpec.string(
            'font',
            'Font family name',
            'A read-write string property',
            GObject.ParamFlags.READWRITE,
            'Cantarell'
        ),
    },
}, class Calculator extends GObject.Object {
    constructor(properties = {}) {
        super(properties);

        this._settings = ExtensionUtils.getSettings();

        this._launcher = new PanelMenu.Button(0.0, _(`${Me.metadata.name} Indicator`));
        this._menu = this._launcher.menu;

        this._processor = new Processor.Processor();

        this._launcher.add_child(new St.Icon({
            icon_name: 'org.gnome.Calculator-symbolic',
            style_class: 'system-status-icon',
        }));

        this._initControls(this._menu, this.font);

        // -- Init connections
        this._processor.connectIndicators(this._onIndicatorSet.bind(this));
        this._menu.actor.connectObject('key-press-event', this._onKeyboardKeyEvent.bind(this), this);
    }

    get font() {
        if (this._font === undefined)
            this._font = null;
        return this._font;
    }

    set font(value) {
        if (this._font !== value)
            this._font = value;
    }

    get launcher() {
        return this._launcher;
    }

    destroy() {
        if (this._launcher !== null) {
            this._launcher.destroy();
            this._launcher = null;
        }
    }

    static Glyph = {
        NONE: '',

        MODE_EE: _('EE'),
        MODE_F: 'F',
        MODE_K: 'K',
        MODE_E: _('E'),

        ZERO: '0',
        ONE: '1',
        TWO: '2',
        THREE: '3',
        FOUR: '4',
        FIVE: '5',
        SIX: '6',
        SEVEN: '7',
        EIGHT: '8',
        NINE: '9',
        PI: '\u{03C0}',
        POINT: '.',
        SIGN: '/-/',

        OP_ENTER_EXPONENT: _('EE'),

        OP_CLEAR_X: _('Cx'),
        OP_CLEAR_F: _('CF'),
        OP_NOP: _('NOP'),

        OP_PUSH_X: _('E\u{2191}'),
        OP_BACK_X: _('Bx'),
        OP_SWAP: '\u{27F7}',
        OP_CIRCLE: '\u{2941}',

        OP_ADD: '+',
        OP_SUBTRACT: '-',
        OP_MULTIPLY: '\u{00D7}',
        OP_DIVIDE: '\u{00F7}',
        OP_1_DIV_X: '1/x',

        OP_SINE: 'sin',
        OP_COSINE: 'cos',
        OP_TANGENT: 'tg',
        OP_ARCSINE: 'sin\u{207B}\u{00B9}',
        OP_ARCCOSINE: 'cos\u{207B}\u{00B9}',
        OP_ARCTANGENT: 'tg\u{207B}\u{00B9}',

        OP_X_SQ: 'x\u{00B2}',
        OP_SQRT: '\u{221A}',
        OP_TEN_POW_X: '10\u{02E3}',
        OP_X_POW_Y: 'x\u{02b8}',

        OP_E_POW_X: 'e\u{02E3}',
        OP_LG: 'lg',
        OP_LN: 'ln',

        OP_INTEGER: '[x]',
        OP_DECIMAL: '{x}',
        OP_ABSOLUTE: '|x|',
    };

    _initControls(menu, font) {
        // -- Init Stack
        let stackArea = new PopupMenu.PopupSubMenuMenuItem(_('Stack registers'), false);
        stackArea.setOrnament(PopupMenu.Ornament.HIDDEN);
        this._initStack(stackArea, font);

        // -- Init Indicator
        let indicatorArea = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            activate: false,
            style_class: 'panel-calc-rpn-PopupBaseMenuItem',
        });
        indicatorArea.setOrnament(PopupMenu.Ornament.HIDDEN);
        this._initIndicator(indicatorArea, font);

        // -- Init Keyboard
        let keyboardArea = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            activate: false,
            style_class: 'panel-calc-rpn-PopupBaseMenuItem',
        });
        keyboardArea.setOrnament(PopupMenu.Ornament.HIDDEN);
        this._initKeyboard(keyboardArea, font);

        // -- Init Popup
        menu.addMenuItem(stackArea);
        menu.addMenuItem(indicatorArea);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addMenuItem(keyboardArea);
    }

    _initRegister(stackBox, label, font) {
        let box = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-registerBoxLayout',
        });

        let valueBox = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-registerValueBoxLayout',
        });
        let nameBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-registerNameBoxLayout',
        });

        let value = new St.Label({
            text: '',
            x_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-registerValueLabel',
        });
        value.set_style(`font-family: ${font}`);

        let name = new St.Label({
            text: label,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-registerNameLabel',
        });
        name.set_style(`font-family: ${font}`);

        valueBox.add_actor(value);
        nameBox.add_actor(name);

        box.add_actor(valueBox);
        box.add_actor(nameBox);
        stackBox.add_actor(box);

        return value;
    }

    _initStack(stackArea, font) {
        let stack1Box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            opacity: 150,
            style_class: 'panel-calc-rpn-stack1BoxLayout',
        });
        let stack2Box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            opacity: 150,
            style_class: 'panel-calc-rpn-stack2BoxLayout',
        });

        this._x1RegisterLabel = this._initRegister(stack1Box, 'X\u{2081}', font);
        this._tRegisterLabel = this._initRegister(stack2Box, 'T', font);
        this._zRegisterLabel = this._initRegister(stack2Box, 'Z', font);
        this._yRegisterLabel = this._initRegister(stack2Box, 'Y', font);
        this._xRegisterLabel = this._initRegister(stack2Box, 'X', font);

        stackArea.menu.box.add(stack1Box);
        stackArea.menu.box.add(new PopupMenu.PopupSeparatorMenuItem());
        stackArea.menu.box.add(stack2Box);
    }

    _initIndicator(indicatorArea, font) {
        let indicatorBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'panel-calc-rpn-indicatorBoxLayout',
        });

        let mantissaBox = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-indicatorMantissaBoxLayout',
        });
        let exponentBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-indicatorExponentBoxLayout',
        });

        this._mantissaIndicatorLabel = new St.Label({
            text: '',
            x_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-indicatorMantissaLabel',
        });
        this._mantissaIndicatorLabel.set_style(`font-family: ${font}`);

        this._exponentIndicatorLabel = new St.Label({
            text: '',
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-indicatorExponentLabel',
        });
        this._exponentIndicatorLabel.set_style(`font-family: ${font}`);

        mantissaBox.add_actor(this._mantissaIndicatorLabel);
        exponentBox.add_actor(this._exponentIndicatorLabel);

        indicatorBox.add_actor(mantissaBox);
        indicatorBox.add_actor(exponentBox);

        indicatorArea.actor.add_child(indicatorBox);
    }

    _initKeyboard(keyboardArea, font) {
        let keyMatrix = [
            {
                keys: [
                    {
                        id: Processor.Processor.Key.F,
                        label: Calculator.Glyph.MODE_F,
                        labelF: Calculator.Glyph.NONE,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-yellowButton',
                    },
                    {
                        id: Processor.Processor.Key.K,
                        label: Calculator.Glyph.MODE_K,
                        labelF: Calculator.Glyph.NONE,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-blueButton',
                    },
                    {
                        id: Processor.Processor.Key.RESERVED_NULL,
                    },
                ], labels: false,
            }, {
                keys: [
                    {
                        id: Processor.Processor.Key.SEVEN,
                        label: Calculator.Glyph.SEVEN,
                        labelF: Calculator.Glyph.OP_SINE,
                        labelK: Calculator.Glyph.OP_INTEGER,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.EIGHT,
                        label: Calculator.Glyph.EIGHT,
                        labelF: Calculator.Glyph.OP_COSINE,
                        labelK: Calculator.Glyph.OP_DECIMAL,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.NINE,
                        label: Calculator.Glyph.NINE,
                        labelF: Calculator.Glyph.OP_TANGENT,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.MINUS,
                        label: Calculator.Glyph.OP_SUBTRACT,
                        labelF: Calculator.Glyph.OP_SQRT,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.DIVIDE,
                        label: Calculator.Glyph.OP_DIVIDE,
                        labelF: Calculator.Glyph.OP_1_DIV_X,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                ], labels: true,
            }, {
                keys: [
                    {
                        id: Processor.Processor.Key.FOUR,
                        label: Calculator.Glyph.FOUR,
                        labelF: Calculator.Glyph.OP_ARCSINE,
                        labelK: Calculator.Glyph.OP_ABSOLUTE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.FIVE,
                        label: Calculator.Glyph.FIVE,
                        labelF: Calculator.Glyph.OP_ARCCOSINE,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.SIX,
                        label: Calculator.Glyph.SIX,
                        labelF: Calculator.Glyph.OP_ARCTANGENT,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.PLUS,
                        label: Calculator.Glyph.OP_ADD,
                        labelF: Calculator.Glyph.PI,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.MULTIPLY,
                        label: Calculator.Glyph.OP_MULTIPLY,
                        labelF: Calculator.Glyph.OP_X_SQ,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                ], labels: true,
            }, {
                keys: [
                    {
                        id: Processor.Processor.Key.ONE,
                        label: Calculator.Glyph.ONE,
                        labelF: Calculator.Glyph.OP_E_POW_X,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.TWO,
                        label: Calculator.Glyph.TWO,
                        labelF: Calculator.Glyph.OP_LG,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.THREE,
                        label: Calculator.Glyph.THREE,
                        labelF: Calculator.Glyph.OP_LN,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.SWAP,
                        label: Calculator.Glyph.OP_SWAP,
                        labelF: Calculator.Glyph.OP_X_POW_Y,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.PUSH,
                        label: Calculator.Glyph.OP_PUSH_X,
                        labelF: Calculator.Glyph.OP_BACK_X,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                ], labels: true,
            }, {
                keys: [
                    {
                        id: Processor.Processor.Key.ZERO,
                        label: Calculator.Glyph.ZERO,
                        labelF: Calculator.Glyph.OP_TEN_POW_X,
                        labelK: Calculator.Glyph.OP_NOP,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.POINT,
                        label: Calculator.Glyph.POINT,
                        labelF: Calculator.Glyph.OP_CIRCLE,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.SIGN,
                        label: Calculator.Glyph.SIGN,
                        labelF: Calculator.Glyph.NONE,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.ENTER_E,
                        label: Calculator.Glyph.OP_ENTER_EXPONENT,
                        labelF: Calculator.Glyph.NONE,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-grayButton',
                    },
                    {
                        id: Processor.Processor.Key.CLEAR_X,
                        label: Calculator.Glyph.OP_CLEAR_X,
                        labelF: Calculator.Glyph.OP_CLEAR_F,
                        labelK: Calculator.Glyph.NONE,
                        style_class: 'panel-calc-rpn-redButton',
                    },
                ], labels: true,
            },
        ];

        let controlButtons = [
            {
                icon: 'edit-copy-symbolic',
                handler: this._onCopyButtonClicked.bind(this),
            },
            {
                icon: 'org.gnome.Settings-symbolic',
                handler: this._onSettingsButtonClicked.bind(this),
            },
            {
                icon: 'help-about-symbolic',
                handler: this._onHelpButtonClicked.bind(this),
            },
        ];

        let keyboardBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-calc-rpn-BoxLayout',
        });

        keyMatrix.forEach(row => {
            let lineKeyboardBox = new St.BoxLayout({
                vertical: false,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-BoxLayout',
            });
            row.keys.forEach(key => {
                if (key.id !== Processor.Processor.Key.RESERVED_NULL) {
                    let keyButton = new Key({
                        label: key.label,
                        style_class: key.style_class,
                        x_expand: false,
                        x_align: Clutter.ActorAlign.START,
                        y_align: Clutter.ActorAlign.CENTER,
                        key_id: key.id,
                    });
                    keyButton.set_style(`font-family: ${font}`);
                    keyButton.connect('clicked', this._onKeyboardDispatcher.bind(this));

                    if (row.labels === true) {
                        let placeholderBox = new St.BoxLayout({
                            vertical: true,
                            x_expand: true,
                            y_expand: true,
                            x_align: Clutter.ActorAlign.START,
                            y_align: Clutter.ActorAlign.END,
                            style_class: 'panel-calc-rpn-BoxLayout',
                        });
                        let labelBox = new St.BoxLayout({
                            vertical: false,
                            x_expand: true,
                            y_expand: true,
                            x_align: Clutter.ActorAlign.FILL,
                            y_align: Clutter.ActorAlign.END,
                            style_class: 'panel-calc-rpn-BoxLayout',
                        });
                        if (key.labelF !== '') {
                            let labelFBox = new St.BoxLayout({
                                vertical: false,
                                x_expand: true,
                                y_expand: true,
                                x_align: Clutter.ActorAlign.CENTER,
                                y_align: Clutter.ActorAlign.END,
                                style_class: 'panel-calc-rpn-BoxLayout',
                            });
                            let labelF = new St.Label({
                                text: key.labelF,
                                x_align: Clutter.ActorAlign.CENTER,
                                y_align: Clutter.ActorAlign.END,
                                style_class: 'panel-calc-rpn-labelFLabel',
                            });
                            labelF.set_style(`font-family: ${font}`);
                            labelFBox.add_actor(labelF);
                            labelBox.add_actor(labelFBox);
                        }
                        if (key.labelK !== '') {
                            let labelKBox = new St.BoxLayout({
                                vertical: false,
                                x_expand: true,
                                y_expand: true,
                                x_align: Clutter.ActorAlign.CENTER,
                                y_align: Clutter.ActorAlign.END,
                                style_class: 'panel-calc-rpn-BoxLayout',
                            });
                            let labelK = new St.Label({
                                text: key.labelK,
                                x_align: Clutter.ActorAlign.CENTER,
                                y_align: Clutter.ActorAlign.END,
                                style_class: 'panel-calc-rpn-labelKLabel',
                            });
                            labelK.set_style(`font-family: ${font}`);
                            labelKBox.add_actor(labelK);
                            labelBox.add_actor(labelKBox);
                        }
                        placeholderBox.add_actor(labelBox);
                        placeholderBox.add_actor(keyButton);
                        lineKeyboardBox.add_actor(placeholderBox);
                    } else {
                        lineKeyboardBox.add_actor(keyButton);
                    }
                } else {
                    let controlBox = new St.BoxLayout({
                        vertical: false,
                        x_expand: true,
                        x_align: Clutter.ActorAlign.FILL,
                        y_align: Clutter.ActorAlign.FILL,
                        style_class: 'panel-calc-rpn-controlBoxLayout',
                    });
                    controlBox.add_actor(new St.BoxLayout({
                        vertical: false,
                        x_expand: true,
                        x_align: Clutter.ActorAlign.CENTER,
                        y_align: Clutter.ActorAlign.FILL,
                    }));
                    controlButtons.forEach(controlButton => {
                        let button = new St.Button({
                            can_focus: true,
                            reactive: true,
                            track_hover: true,
                            style_class: 'panel-calc-rpn-controlButton',
                            x_align: Clutter.ActorAlign.END,
                            y_align: Clutter.ActorAlign.CENTER,
                        });
                        button.add_actor(new St.Icon({
                            icon_name: controlButton.icon,
                        }));
                        button.connect('clicked', controlButton.handler);
                        controlBox.add_actor(button);
                    });
                    lineKeyboardBox.add_actor(controlBox);
                }
            });
            keyboardBox.add_actor(lineKeyboardBox);
        });

        keyboardArea.actor.add_child(keyboardBox);
    }

    _formatDecimal(value) {
        const digit = [
            '\u{2070}', '\u{00b9}', '\u{00b2}', '\u{00b3}', '\u{2074}',
            '\u{2075}', '\u{2076}', '\u{2077}', '\u{2078}', '\u{2079}',
        ];
        let string = value.split('e');
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

    _onIndicatorSet(indicator, value) {
        switch (indicator) {
        case Processor.Processor.Indicator.MANTISSA:
            this._mantissaIndicatorLabel.set_text(value);
            break;

        case Processor.Processor.Indicator.EXPONENT:
            this._exponentIndicatorLabel.set_text(value);
            break;

        case Processor.Processor.Indicator.REGISTER_X:
            this._xRegisterLabel.set_text(this._formatDecimal(value));
            break;

        case Processor.Processor.Indicator.REGISTER_Y:
            this._yRegisterLabel.set_text(this._formatDecimal(value));
            break;

        case Processor.Processor.Indicator.REGISTER_Z:
            this._zRegisterLabel.set_text(this._formatDecimal(value));
            break;

        case Processor.Processor.Indicator.REGISTER_T:
            this._tRegisterLabel.set_text(this._formatDecimal(value));
            break;

        case Processor.Processor.Indicator.REGISTER_X1:
            this._x1RegisterLabel.set_text(this._formatDecimal(value));
            break;

        case Processor.Processor.Indicator.MODE:
            switch (value) {
            case Processor.Processor.Mode.NORMAL_MODE:
                break;

            case Processor.Processor.Mode.EE_MODE:
                break;

            case Processor.Processor.Mode.F_MODE:
                break;

            case Processor.Processor.Mode.K_MODE:
                break;

            case Processor.Processor.Mode.E_MODE:
                break;

            default:
                break;
            }
            break;

        default:
        }
    }

    _onKeyboardDispatcher(button) {
        this._processor.keyPressed(button.keyId);
    }

    _onKeyboardKeyEvent(actor, event) {
        let state = event.get_state();

        /*
         * BUTTON1_MASK - the first mouse button.
         * BUTTON2_MASK - the second mouse button.
         * BUTTON3_MASK - the third mouse button.
         * BUTTON4_MASK - the fourth mouse button.
         * BUTTON5_MASK - the fifth mouse button.
         * CONTROL_MASK - the Control key.
         * HYPER_MASK - the Hyper modifier.
         * LOCK_MASK - a Lock key (depending on the modifier mapping of the X server this may either be CapsLock or ShiftLock).
         * META_MASK - the Meta modifier.
         * MOD1_MASK - normally it is the Alt key.
         * MOD2_MASK - normally it is the Numlock key.
         * MOD3_MASK - the sixth modifier key ( it depends on the modifier mapping of the X server which key is interpreted as this modifier).
         * MOD4_MASK - the seventh modifier key (it depends on the modifier mapping of the X server which key is interpreted as this modifier).
         * MOD5_MASK - the eighth modifier key ( it depends on the modifier mapping of the X server which key is interpreted as this modifier).
         * MODIFIER_MASK - a mask covering all modifier types.
         * RELEASE_MASK - not used in GDK itself.
         * SHIFT_MASK - the Shift key.
         * SUPER_MASK - the Super modifier.
         */
        // if user has a modifier down (except capslock, numlock, alt ...)
        // then don't handle the key press here
        state &= ~Clutter.ModifierType.LOCK_MASK;
        state &= ~Clutter.ModifierType.MOD1_MASK;
        state &= ~Clutter.ModifierType.MOD2_MASK;
        state &= ~Clutter.ModifierType.SHIFT_MASK;
        state &= Clutter.ModifierType.MODIFIER_MASK;

        if (state)
            return Clutter.EVENT_PROPAGATE;

        let symbol = event.get_key_symbol();

        // Shift + Key
        if ((event.get_state() & Clutter.ModifierType.SHIFT_MASK) !== 0) {
            switch (symbol) {
            case Clutter.KEY_KP_Subtract:
                this._processor.keyPressed(Processor.Processor.Key.SIGN);
                break;

            case Clutter.KEY_KP_Enter:
                this._processor.keyPressed(Processor.Processor.Key.SWAP);
                break;

            default:
                return Clutter.EVENT_PROPAGATE;
            }
            return Clutter.EVENT_STOP;
        }

        // Key & Numlock + Key
        switch (symbol) {
        case Clutter.KEY_KP_0:
        case Clutter.KEY_KP_Insert:
            this._processor.keyPressed(Processor.Processor.Key.ZERO);
            break;

        case Clutter.KEY_KP_1:
        case Clutter.KEY_KP_End:
            this._processor.keyPressed(Processor.Processor.Key.ONE);
            break;

        case Clutter.KEY_KP_2:
        case Clutter.KEY_KP_Down:
            this._processor.keyPressed(Processor.Processor.Key.TWO);
            break;

        case Clutter.KEY_KP_3:
        case Clutter.KEY_KP_Page_Down:
            this._processor.keyPressed(Processor.Processor.Key.THREE);
            break;

        case Clutter.KEY_KP_4:
        case Clutter.KEY_KP_Left:
            this._processor.keyPressed(Processor.Processor.Key.FOUR);
            break;

        case Clutter.KEY_KP_5:
        case Clutter.KEY_KP_Begin:
            this._processor.keyPressed(Processor.Processor.Key.FIVE);
            break;

        case Clutter.KEY_KP_6:
        case Clutter.KEY_KP_Right:
            this._processor.keyPressed(Processor.Processor.Key.SIX);
            break;

        case Clutter.KEY_KP_7:
        case Clutter.KEY_KP_Home:
            this._processor.keyPressed(Processor.Processor.Key.SEVEN);
            break;

        case Clutter.KEY_KP_8:
        case Clutter.KEY_KP_Up:
            this._processor.keyPressed(Processor.Processor.Key.EIGHT);
            break;

        case Clutter.KEY_KP_9:
        case Clutter.KEY_KP_Page_Up:
            this._processor.keyPressed(Processor.Processor.Key.NINE);
            break;

        case Clutter.KEY_KP_Decimal:
        case Clutter.KEY_KP_Delete:
            this._processor.keyPressed(Processor.Processor.Key.POINT);
            break;

        case Clutter.KEY_KP_Add:
            this._processor.keyPressed(Processor.Processor.Key.PLUS);
            break;

        case Clutter.KEY_KP_Subtract:
            this._processor.keyPressed(Processor.Processor.Key.MINUS);
            break;

        case Clutter.KEY_KP_Multiply:
            this._processor.keyPressed(Processor.Processor.Key.MULTIPLY);
            break;

        case Clutter.KEY_KP_Divide:
            this._processor.keyPressed(Processor.Processor.Key.DIVIDE);
            break;

        case Clutter.KEY_KP_Enter:
            this._processor.keyPressed(Processor.Processor.Key.PUSH);
            break;

        case Clutter.KEY_BackSpace:
            this._processor.keyPressed(Processor.Processor.Key.CLEAR_X);
            break;

        case Clutter.KEY_Alt_L:
            this._processor.keyPressed(Processor.Processor.Key.F);
            break;

        default:
            return Clutter.EVENT_PROPAGATE;
        }

        return Clutter.EVENT_STOP;
    }

    _onSettingsButtonClicked() {
        this._menu.toggle();
        ExtensionUtils.openPrefs();
    }

    _onHelpButtonClicked() {
    }

    _onCopyButtonClicked() {
    }
}
);
