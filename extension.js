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
                style_class: 'panel-calc-rpn-PopupBaseMenuItem'
            });
            indicatorArea.setOrnament(PopupMenu.Ornament.HIDDEN);
            this._initIndicator(indicatorArea);

            this._processor.connectIndicators(this._onIndicatorSet.bind(this));

            //-- Init Keyboard
            let keyboardArea = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
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

        _initRegister(stackBox, name) {
            let box = new St.BoxLayout({
                vertical: false,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-registerBoxLayout'
            });

            let register = new St.Label({
                text: "",
                x_expand: true,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.FILL,
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
                [
                    { label: Processor.Processor.Glyph.SEVEN, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.EIGHT, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.NINE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.MINUS, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.DIVIDE, style_class: 'panel-calc-rpn-grayButton' }
                ],
                [
                    { label: Processor.Processor.Glyph.FOUR, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.FIVE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.SIX, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.PLUS, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.MULTIPLY, style_class: 'panel-calc-rpn-grayButton' }
                ],
                [
                    { label: Processor.Processor.Glyph.ONE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.TWO, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.THREE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.SWAP, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.UP, style_class: 'panel-calc-rpn-grayButton' }
                ],
                [
                    { label: Processor.Processor.Glyph.ZERO, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.PERIOD, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.SIGN, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.BACK_X, style_class: 'panel-calc-rpn-grayButton' },
                    { label: Processor.Processor.Glyph.CLEAR_X, style_class: 'panel-calc-rpn-redButton' }
                ]
            ];

            keyMatrix.forEach(row => {
                let lineKeyboardBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-BoxLayout'
                });
                row.forEach(key => {
                    let keyButton = new St.Button({
                        label: key.label,
                        style_class: key.style_class,
                        x_expand: true,
                        x_align: Clutter.ActorAlign.CENTER
                    });
                    keyButton.set_style(`font-family: ${this._fontFamily}`);
                    keyButton.connect('clicked', this._onKeyboardDispatcher.bind(this));
                    lineKeyboardBox.add_actor(keyButton);
                })
                keyboardBox.add_actor(lineKeyboardBox);
            })

            keyboardArea.actor.add_child(keyboardBox);
        }

        _processorExecute(action) {
            switch (action) {
                case Processor.Processor.Glyph.ZERO:
                    this._processor.digit(0);
                    break;

                case Processor.Processor.Glyph.ONE:
                    this._processor.digit(1);
                    break;

                case Processor.Processor.Glyph.TWO:
                    this._processor.digit(2);
                    break;

                case Processor.Processor.Glyph.THREE:
                    this._processor.digit(3);
                    break;

                case Processor.Processor.Glyph.FOUR:
                    this._processor.digit(4);
                    break;

                case Processor.Processor.Glyph.FIVE:
                    this._processor.digit(5);
                    break;

                case Processor.Processor.Glyph.SIX:
                    this._processor.digit(6);
                    break;

                case Processor.Processor.Glyph.SEVEN:
                    this._processor.digit(7);
                    break;

                case Processor.Processor.Glyph.EIGHT:
                    this._processor.digit(8);
                    break;

                case Processor.Processor.Glyph.NINE:
                    this._processor.digit(9);
                    break;

                case Processor.Processor.Glyph.PERIOD:
                    this._processor.point();
                    break;

                case Processor.Processor.Glyph.PLUS:
                    this._processor.add();
                    break;

                case Processor.Processor.Glyph.MINUS:
                    this._processor.subtract();
                    break;

                case Processor.Processor.Glyph.MULTIPLY:
                    this._processor.multiply();
                    break;

                case Processor.Processor.Glyph.DIVIDE:

                    break;

                case Processor.Processor.Glyph.SIGN:
                    this._processor.negate();
                    break;


                case Processor.Processor.Glyph.UP:
                    this._processor.up();
                    break;


                case Processor.Processor.Glyph.SWAP:
                    this._processor.swap();
                    break;

                case Processor.Processor.Glyph.BACK_X:
                    this._processor.backX();
                    break;

                case Processor.Processor.Glyph.CLEAR_X:
                    this._processor.clearX();
                    break;

                default:
                    return;
            }
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

                default:
                    return;
            }
        }

        _onKeyboardDispatcher(button) {
            this._processorExecute(button.get_label());
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
                        this._processorExecute(Processor.Processor.Glyph.SIGN);
                        break;

                    case Clutter.KEY_KP_Enter:
                        this._processorExecute(Processor.Processor.Glyph.SWAP);
                        break;

                    case Clutter.KEY_BackSpace:
                        this._processorExecute(Processor.Processor.Glyph.BACK_X);
                        break;

                    default:
                        return Clutter.EVENT_PROPAGATE;
                }
            } else {
                switch (symbol) {
                    case Clutter.KEY_KP_0:
                    case Clutter.KEY_KP_Insert:
                        this._processorExecute(Processor.Processor.Glyph.ZERO);
                        break;

                    case Clutter.KEY_KP_1:
                    case Clutter.KEY_KP_End:
                        this._processorExecute(Processor.Processor.Glyph.ONE);
                        break;

                    case Clutter.KEY_KP_2:
                    case Clutter.KEY_KP_Down:
                        this._processorExecute(Processor.Processor.Glyph.TWO);
                        break;

                    case Clutter.KEY_KP_3:
                    case Clutter.KEY_KP_Page_Down:
                        this._processorExecute(Processor.Processor.Glyph.THREE);
                        break;

                    case Clutter.KEY_KP_4:
                    case Clutter.KEY_KP_Left:
                        this._processorExecute(Processor.Processor.Glyph.FOUR);
                        break;

                    case Clutter.KEY_KP_5:
                    case Clutter.KEY_KP_Begin:
                        this._processorExecute(Processor.Processor.Glyph.FIVE);
                        break;

                    case Clutter.KEY_KP_6:
                    case Clutter.KEY_KP_Right:
                        this._processorExecute(Processor.Processor.Glyph.SIX);
                        break;

                    case Clutter.KEY_KP_7:
                    case Clutter.KEY_KP_Home:
                        this._processorExecute(Processor.Processor.Glyph.SEVEN);
                        break;

                    case Clutter.KEY_KP_8:
                    case Clutter.KEY_KP_Up:
                        this._processorExecute(Processor.Processor.Glyph.EIGHT);
                        break;

                    case Clutter.KEY_KP_9:
                    case Clutter.KEY_KP_Page_Up:
                        this._processorExecute(Processor.Processor.Glyph.NINE);
                        break;

                    case Clutter.KEY_KP_Decimal:
                    case Clutter.KEY_KP_Delete:
                        this._processorExecute(Processor.Processor.Glyph.PERIOD);
                        break;

                    case Clutter.KEY_KP_Add:
                        this._processorExecute(Processor.Processor.Glyph.PLUS);
                        break;

                    case Clutter.KEY_KP_Subtract:
                        this._processorExecute(Processor.Processor.Glyph.MINUS);
                        break;

                    case Clutter.KEY_KP_Multiply:
                        this._processorExecute(Processor.Processor.Glyph.MULTIPLY);
                        break;

                    case Clutter.KEY_KP_Divide:
                        this._processorExecute(Processor.Processor.Glyph.DIVIDE);
                        break;

                    case Clutter.KEY_KP_Enter:
                        this._processorExecute(Processor.Processor.Glyph.UP);
                        break;

                    case Clutter.KEY_BackSpace:
                        this._processorExecute(Processor.Processor.Glyph.CLEAR_X);
                        break;

                    default:
                        return Clutter.EVENT_PROPAGATE;
                }
            }
            return Clutter.EVENT_STOP;
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
