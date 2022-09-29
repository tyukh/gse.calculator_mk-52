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

const { GObject, St, Clutter, Pango } = imports.gi;
const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Processor = Me.imports.processor;

const Key = GObject.registerClass({
    GTypeName: 'Key',
    Properties: {
        'button-id': GObject.ParamSpec.uint(
            'button-id',
            'Button Id',
            'A read-write integer property',
            GObject.ParamFlags.READWRITE,
            0
        ),
    }
}, class Key extends St.Button {
    constructor(properties = {}) {
        super(properties);
    }

    get buttonId() {
        if (this._buttonId === undefined)
            this._buttonId = null;
        return this._buttonId;
    }

    set buttonId(value) {
        if (this._buttonId === value)
            return;
        this._buttonId = value;
    }
});


const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _(`${Me.metadata.name} Indicator`));

            this._processor = new Processor.Processor();
            this._fontFamily = "monospace";

            this.add_child(new St.Icon({
                icon_name: 'org.gnome.Calculator-symbolic',
                style_class: 'system-status-icon',
            }));

            //-- Init controls

            //-- Init Stack
            let stackArea = new PopupMenu.PopupSubMenuMenuItem(_("Stack registers"), false);
            stackArea.setOrnament(PopupMenu.Ornament.HIDDEN);
            this._initStack(stackArea);

            //-- Init Indicator
            let indicatorArea = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
                activate: false,
                style_class: 'panel-calc-rpn-PopupBaseMenuItem'
            });
            indicatorArea.setOrnament(PopupMenu.Ornament.HIDDEN);
            this._initIndicator(indicatorArea);

            this._processor.connectIndicators(this._onIndicatorSet.bind(this));

            //-- Init Keyboard
            let keyboardArea = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
                activate: false,
                style_class: 'panel-calc-rpn-PopupBaseMenuItem'
            });
            keyboardArea.setOrnament(PopupMenu.Ornament.HIDDEN);
            this._initKeyboard(keyboardArea);

            //-- Init Popup
            this.menu.addMenuItem(stackArea);
            this.menu.addMenuItem(indicatorArea);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(keyboardArea);

            this.menu.actor.connectObject('key-press-event', this._onKeyboardKeyEvent.bind(this), this);

            this._processor.init();
        }

        static Glyph = {
            NONE: "",
            
            MODE_EE: _("EE"),
            MODE_F: "F",
            MODE_K: "K",
            MODE_E: _("E"),

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
            PI: "\u{03C0}",
            POINT: ".",
            SIGN: "/-/",
            
            OP_ENTER_EXPONENT: _("EE"),

            OP_CLEAR_X: _("Cx"),
            OP_CLEAR_F: _("CF"),
            OP_NOP: _("NOP"),

            OP_PUSH_X: _("E\u{2191}"),
            OP_BACK_X: _("Bx"),
            OP_SWAP: "\u{27F7}",
            OP_CIRCLE: "\u{2941}",

            OP_ADD: "+",
            OP_SUBTRACT: "-",
            OP_MULTIPLY: "\u{00D7}",
            OP_DIVIDE: "\u{00F7}",
            OP_1_DIV_X: "1/x",

            OP_SINE: "sin",
            OP_COSINE: "cos",
            OP_TANGENT: "tg",
            OP_ARCSINE: "sin\u{207B}\u{00B9}",
            OP_ARCCOSINE: "cos\u{207B}\u{00B9}",
            OP_ARCTANGENT: "tg\u{207B}\u{00B9}",

            OP_X_SQ: "x\u{00B2}",
            OP_SQRT: "\u{221A}",
            OP_TEN_POW_X: "10\u{02E3}",
            OP_X_POW_Y: "x\u{02b8}",

            OP_E_POW_X: "e\u{02E3}",
            OP_LG: "lg",
            OP_LN: "ln",

            OP_INTEGER: "[x]",
            OP_DECIMAL: "{x}",
            OP_ABSOLUTE: "|x|",
        };

        _initRegister(stackBox, name) {
            let box = new St.BoxLayout({
                vertical: false,
                x_expand: true,
                y_expand: true,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-registerBoxLayout'
            });

            let register = new St.Label({
                text: "",
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-registerValueLabel'
            });
            register.set_style(`font-family: ${this._fontFamily}`);

            let label = new St.Label({
                text: name,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-registerNameLabel'
            });
            label.set_style(`font-family: ${this._fontFamily}`);

            box.add_actor(register);
            box.add_actor(label);

            stackBox.add_actor(box);

            return register;
        }

        _initStack(stackArea) {
            let stack1Box = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                opacity: 150,
                style_class: 'panel-calc-rpn-stack1BoxLayout'
            });
            let stack2Box = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                opacity: 150,
                style_class: 'panel-calc-rpn-stack2BoxLayout'
            });

            this._x1Register = this._initRegister(stack1Box, "X\u{2081}");
            this._tRegister = this._initRegister(stack2Box, "T");
            this._zRegister = this._initRegister(stack2Box, "Z");
            this._yRegister = this._initRegister(stack2Box, "Y");
            this._xRegister = this._initRegister(stack2Box, "X");

            stackArea.menu.box.add(stack1Box);
            stackArea.menu.box.add(new PopupMenu.PopupSeparatorMenuItem());
            stackArea.menu.box.add(stack2Box);
        }

        _initIndicator(indicatorArea) {
            let indicatorBox = new St.BoxLayout({
                vertical: false,
                x_expand: true,
                y_expand: true,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-indicatorBoxLayout'
            });

            this._indicator = new St.Label({
                text: "",
                x_expand: true,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.FILL,
                style_class: 'panel-calc-rpn-indicatorLabel'
            });
            this._indicator.set_style(`font-family: ${this._fontFamily}`);
            this._indicatorE = new St.Label({
                text: "",
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.FILL,
                style_class: 'panel-calc-rpn-indicatorELabel'
            });
            this._indicatorE.set_style(`font-family: ${this._fontFamily}`);

            indicatorBox.add_actor(this._indicator);
            indicatorBox.add_actor(this._indicatorE);

            this._indicatorModeLabel = new St.Label({
                text: "",
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.FILL,
                style_class: 'panel-calc-rpn-indicatorModeNLabel'
            });
            this._indicatorModeLabel.set_style(`font-family: ${this._fontFamily}`);
            indicatorBox.add_actor(this._indicatorModeLabel);

            indicatorArea.actor.add_child(indicatorBox);
        }

        _initKeyboard(keyboardArea) {
            let keyboardBox = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-BoxLayout'
            });

            let keyMatrix = [
                {
                    keys: [
                        {
                            buttonId: Processor.Processor.Key.F,
                            label: Indicator.Glyph.MODE_F,
                            labelF: Indicator.Glyph.NONE,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-yellowButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.K,
                            label: Indicator.Glyph.MODE_K,
                            labelF: Indicator.Glyph.NONE,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-blueButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.RESERVED_NULL,
                        }
                    ], labels: false
                }, {
                    keys: [
                        {
                            buttonId: Processor.Processor.Key.SEVEN,
                            label: Indicator.Glyph.SEVEN,
                            labelF: Indicator.Glyph.OP_SINE,
                            labelK: Indicator.Glyph.OP_INTEGER,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.EIGHT,
                            label: Indicator.Glyph.EIGHT,
                            labelF: Indicator.Glyph.OP_COSINE,
                            labelK: Indicator.Glyph.OP_DECIMAL,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.NINE,
                            label: Indicator.Glyph.NINE,
                            labelF: Indicator.Glyph.OP_TANGENT,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.MINUS,
                            label: Indicator.Glyph.OP_SUBTRACT,
                            labelF: Indicator.Glyph.OP_SQRT,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.DIVIDE,
                            label: Indicator.Glyph.OP_DIVIDE,
                            labelF: Indicator.Glyph.OP_1_DIV_X,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        }
                    ], labels: true
                }, {
                    keys: [
                        {
                            buttonId: Processor.Processor.Key.FOUR,
                            label: Indicator.Glyph.FOUR,
                            labelF: Indicator.Glyph.OP_ARCSINE,
                            labelK: Indicator.Glyph.OP_ABSOLUTE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.FIVE,
                            label: Indicator.Glyph.FIVE,
                            labelF: Indicator.Glyph.OP_ARCCOSINE,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.SIX,
                            label: Indicator.Glyph.SIX,
                            labelF: Indicator.Glyph.OP_ARCTANGENT,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.PLUS,
                            label: Indicator.Glyph.OP_ADD,
                            labelF: Indicator.Glyph.PI,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.MULTIPLY,
                            label: Indicator.Glyph.OP_MULTIPLY,
                            labelF: Indicator.Glyph.OP_X_SQ,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        }
                    ], labels: true
                }, {
                    keys: [
                        {
                            buttonId: Processor.Processor.Key.ONE,
                            label: Indicator.Glyph.ONE,
                            labelF: Indicator.Glyph.OP_E_POW_X,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.TWO,
                            label: Indicator.Glyph.TWO,
                            labelF: Indicator.Glyph.OP_LG,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.THREE,
                            label: Indicator.Glyph.THREE,
                            labelF: Indicator.Glyph.OP_LN,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.SWAP,
                            label: Indicator.Glyph.OP_SWAP,
                            labelF: Indicator.Glyph.OP_X_POW_Y,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.PUSH,
                            label: Indicator.Glyph.OP_PUSH_X,
                            labelF: Indicator.Glyph.OP_BACK_X,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        }
                    ], labels: true
                }, {
                    keys: [
                        {
                            buttonId: Processor.Processor.Key.ZERO,
                            label: Indicator.Glyph.ZERO,
                            labelF: Indicator.Glyph.OP_TEN_POW_X,
                            labelK: Indicator.Glyph.OP_NOP,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.PERIOD,
                            label: Indicator.Glyph.POINT,
                            labelF: Indicator.Glyph.OP_CIRCLE,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.SIGN,
                            label: Indicator.Glyph.SIGN,
                            labelF: Indicator.Glyph.NONE,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.ENTER_E,
                            label: Indicator.Glyph.OP_ENTER_EXPONENT,
                            labelF: Indicator.Glyph.NONE,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-grayButton'
                        },
                        {
                            buttonId: Processor.Processor.Key.CLEAR_X,
                            label: Indicator.Glyph.OP_CLEAR_X,
                            labelF: Indicator.Glyph.OP_CLEAR_F,
                            labelK: Indicator.Glyph.NONE,
                            style_class: 'panel-calc-rpn-redButton'
                        }
                    ], labels: true
                }
            ];

            keyMatrix.forEach(row => {
                let lineKeyboardBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-BoxLayout'
                });
                row.keys.forEach(key => {
                    if (key.buttonId != Processor.Processor.Key.RESERVED_NULL) {
                        let keyButton = new Key({
                            label: key.label,
                            style_class: key.style_class,
                            x_expand: false,
                            x_align: Clutter.ActorAlign.START,
                            y_align: Clutter.ActorAlign.CENTER,
                        });
                        keyButton.buttonId = key.buttonId;
                        keyButton.set_style(`font-family: ${this._fontFamily}`);
                        keyButton.connect('clicked', this._onKeyboardDispatcher.bind(this));

                        if (row.labels == true) {
                            let placeholderBox = new St.BoxLayout({
                                vertical: true,
                                x_expand: true,
                                y_expand: true,
                                x_align: Clutter.ActorAlign.START,
                                y_align: Clutter.ActorAlign.END,
                                style_class: 'panel-calc-rpn-BoxLayout'
                            });
                            let labelBox = new St.BoxLayout({
                                vertical: false,
                                x_expand: true,
                                y_expand: true,
                                x_align: Clutter.ActorAlign.FILL,
                                y_align: Clutter.ActorAlign.FILL,
                                style_class: 'panel-calc-rpn-BoxLayout'
                            });
                            if (key.labelF != "") {
                                let labelFBox = new St.BoxLayout({
                                    vertical: false,
                                    x_expand: true,
                                    y_expand: true,
                                    x_align: Clutter.ActorAlign.CENTER,
                                    y_align: Clutter.ActorAlign.FILL,
                                    style_class: 'panel-calc-rpn-BoxLayout'
                                });
                                labelFBox.add_actor(new St.Label({
                                    text: key.labelF,
                                    x_align: Clutter.ActorAlign.CENTER,
                                    y_align: Clutter.ActorAlign.CENTER,
                                    style_class: 'panel-calc-rpn-labelFLabel'
                                }));
                                labelBox.add_actor(labelFBox);
                            }
                            if (key.labelK != "") {
                                let labelKBox = new St.BoxLayout({
                                    vertical: false,
                                    x_expand: true,
                                    y_expand: true,
                                    x_align: Clutter.ActorAlign.CENTER,
                                    y_align: Clutter.ActorAlign.FILL,
                                    style_class: 'panel-calc-rpn-BoxLayout'
                                });
                                labelKBox.add_actor(new St.Label({
                                    text: key.labelK,
                                    x_align: Clutter.ActorAlign.CENTER,
                                    y_align: Clutter.ActorAlign.CENTER,
                                    style_class: 'panel-calc-rpn-labelKLabel'
                                }));
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
                            style_class: 'panel-calc-rpn-controlBoxLayout'
                        });
                        let settingsButton = new St.Button({
                            can_focus: true,
                            reactive: true,
                            track_hover: true,
                            icon_name: 'org.gnome.Settings-symbolic',
                            style_class: 'panel-calc-rpn-controlButton',
                            x_align: Clutter.ActorAlign.END,
                            y_align: Clutter.ActorAlign.CENTER
                        });
                        let helpButton = new St.Button({
                            can_focus: true,
                            reactive: true,
                            track_hover: true,
                            icon_name: 'help-about-symbolic',
                            style_class: 'panel-calc-rpn-controlButton',
                            x_align: Clutter.ActorAlign.END,
                            y_align: Clutter.ActorAlign.CENTER
                        });
                        settingsButton.connect('clicked', this._onSettingsButtonClicked.bind(this));
                        helpButton.connect('clicked', this._onHelpButtonClicked.bind(this));

                        controlBox.add_actor(new St.BoxLayout({
                            vertical: false,
                            x_expand: true,
                            x_align: Clutter.ActorAlign.CENTER,
                            y_align: Clutter.ActorAlign.FILL
                        }));
                        controlBox.add_actor(settingsButton);
                        controlBox.add_actor(helpButton);
                        lineKeyboardBox.add_actor(controlBox);
                    }
                })
                keyboardBox.add_actor(lineKeyboardBox);
            })

            keyboardArea.actor.add_child(keyboardBox);
        }

        _onIndicatorSet(indicator, value) {
            switch (indicator) {
                case Processor.Processor.Indicator.INDICATOR:
                    this._indicator.set_text(value);
                    break;

                case Processor.Processor.Indicator.INDICATOR_E:
                    this._indicatorE.set_text(value);
                    break;

                case Processor.Processor.Indicator.REGISTER_X:
                    this._xRegister.set_text(value);
                    break;

                case Processor.Processor.Indicator.REGISTER_Y:
                    this._yRegister.set_text(value);
                    break;

                case Processor.Processor.Indicator.REGISTER_Z:
                    this._zRegister.set_text(value);
                    break;

                case Processor.Processor.Indicator.REGISTER_T:
                    this._tRegister.set_text(value);
                    break;

                case Processor.Processor.Indicator.REGISTER_X1:
                    this._x1Register.set_text(value);
                    break;

                case Processor.Processor.Indicator.INDICATOR_MODE:
                    switch (value) {
                        case Processor.Processor.Mode.NORMAL_MODE:
                            this._indicatorModeLabel.set_text(Indicator.Glyph.NONE);
                            this._indicatorModeLabel.set_style('panel-calc-rpn-indicatorModeNLabel');
                            break;

                        case Processor.Processor.Mode.EE_MODE:
                            this._indicatorModeLabel.set_text(Indicator.Glyph.MODE_EE);
                            this._indicatorModeLabel.set_style('panel-calc-rpn-indicatorModeNLabel');
                            break;

                        case Processor.Processor.Mode.F_MODE:
                            this._indicatorModeLabel.set_text(Indicator.Glyph.MODE_F);
                            this._indicatorModeLabel.set_style('panel-calc-rpn-indicatorModeFLabel');
                            break;

                        case Processor.Processor.Mode.K_MODE:
                            this._indicatorModeLabel.set_text(Indicator.Glyph.MODE_K);
                            this._indicatorModeLabel.set_style('panel-calc-rpn-indicatorModeKLabel');
                            break;

                        case Processor.Processor.Mode.E_MODE:
                            this._indicatorModeLabel.set_text(Indicator.Glyph.MODE_E);
                            this._indicatorModeLabel.set_style('panel-calc-rpn-indicatorModeELabel');
                            break;

                        default:
                            break;
                    }
                    break;

                default:
                    return;
            }
        }

        _onKeyboardDispatcher(button) {
            this._processor.keyPressed(button.buttonId);
        }

        _onKeyboardKeyEvent(actor, event) {
            let state = event.get_state();

            // if user has a modifier down (except capslock, numlock, alt)
            // then don't handle the key press here
            state &= ~Clutter.ModifierType.LOCK_MASK;
            state &= ~Clutter.ModifierType.MOD1_MASK;
            state &= ~Clutter.ModifierType.MOD2_MASK;
            state &= Clutter.ModifierType.MODIFIER_MASK;

            if (state)
                return Clutter.EVENT_PROPAGATE;

            let symbol = event.get_key_symbol();

            if ((event.get_state() & Clutter.ModifierType.MOD1_MASK) != 0) {
                switch (symbol) {
                    case Clutter.KEY_KP_Subtract:
                        this._processor.keyPressed(Processor.Processor.Key.SIGN);
                        break;

                    case Clutter.KEY_KP_Enter:
                        this._processor.keyPressed(Processor.Processor.Key.SWAP);
                        break;

                    case Clutter.KEY_BackSpace:
                        this._processor.keyPressed(Processor.Processor.Key.BACK_X);
                        break;

                    default:
                        return Clutter.EVENT_PROPAGATE;
                }
            } else {
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
                        this._processor.keyPressed(Processor.Processor.Key.PERIOD);
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

                    default:
                        return Clutter.EVENT_PROPAGATE;
                }
            }
            return Clutter.EVENT_STOP;
        }

        _onSettingsButtonClicked() {
        }

        _onHelpButtonClicked() {
        }
    }
);

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(Me.metadata.uuid);
    }

    enable() {
        this._indicator = new Indicator();
        /* 
         * In here we are adding the button in the status area
         * - `PopupMenuExample` is tha role, must be unique. You can access it from the Looking Glass  in 'Main.panel.statusArea.PopupMenuExample`
         * - button is and instance of panelMenu.Button
         * - 0 is the position
         * - `right` is the box where we want our button to be displayed (left/center/right)
         */
        // Main.panel.addToStatusArea(this._uuid, this._indicator);
        Main.panel.addToStatusArea(this._uuid, this._indicator, 0, 'center');
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
