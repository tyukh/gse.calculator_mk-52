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

/* exported init */

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

            //-- Init Indicator
            let indicatorSArea = new PopupMenu.PopupSubMenuMenuItem(_("Stack"), false);
            indicatorSArea.setOrnament(PopupMenu.Ornament.HIDDEN);
            this._initIndicatorS(indicatorSArea);

            //-- Init Indicator0
            let indicator0Area = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                style_class: 'panel-calc-rpn-PopupBaseMenuItem'
            });
            indicator0Area.setOrnament(PopupMenu.Ornament.HIDDEN);
            this._initIndicator0(indicator0Area);

            //-- Init Keyboard
            let keyboardArea = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                style_class: 'panel-calc-rpn-PopupBaseMenuItem'
            });
            keyboardArea.setOrnament(PopupMenu.Ornament.HIDDEN);
            this._initKeyboard(keyboardArea);

            //-- Init Popup
            this.menu.addMenuItem(indicatorSArea);
            this.menu.addMenuItem(indicator0Area);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(keyboardArea);

            this._refreshIndicators();
        }

        _refreshIndicators() {
            this._xIndicator.set_text(this._processor.x);
            this._yIndicator.set_text(this._processor.y);
            this._zIndicator.set_text(this._processor.z);
            this._tIndicator.set_text(this._processor.t);
            this._x1Indicator.set_text(this._processor.x1);
        }

        _onKeyboardDispatcher(button) {
            //Main.notify(button.get_label(), String(clicked_button));

            switch (button.get_label()) {
                case this._processor.Glyph.ZERO:
                    this._processor.setDigit(0);
                    break;

                case this._processor.Glyph.ONE:
                    this._processor.setDigit(1);
                    break;

                case this._processor.Glyph.TWO:
                    this._processor.setDigit(2);
                    break;

                case this._processor.Glyph.THREE:
                    this._processor.setDigit(3);
                    break;

                case this._processor.Glyph.FOUR:
                    this._processor.setDigit(4);
                    break;

                case this._processor.Glyph.FIVE:
                    this._processor.setDigit(5);
                    break;

                case this._processor.Glyph.SIX:
                    this._processor.setDigit(6);
                    break;

                case this._processor.Glyph.SEVEN:
                    this._processor.setDigit(7);
                    break;

                case this._processor.Glyph.EIGHT:
                    this._processor.setDigit(8);
                    break;

                case this._processor.Glyph.NINE:
                    this._processor.setDigit(9);
                    break;

                case this._processor.Glyph.PERIOD:
                    this._processor.point();
                    break;

                case this._processor.Glyph.PLUS:

                    break;

                case this._processor.Glyph.MINUS:

                    break;

                case this._processor.Glyph.MULTIPLY:

                    break;

                case this._processor.Glyph.DIVIDE:

                    break;

                case this._processor.Glyph.SIGN:
                    this._processor.negate();
                    break;

                case this._processor.Glyph.UP:
                    this._processor.push();
                    break;

                case this._processor.Glyph.SWAP:
                    this._processor.swap();
                    break;

                case this._processor.Glyph.BACK_X:
                    this._processor.popX();
                    break;

                case this._processor.Glyph.CLEAR_X:
                    this._processor.clearX();
                    break;

                default:
                    return;
            }

            this._refreshIndicators();
            return;
        }

        _initIndicator(indicatorBox, name) {
            let box = new St.BoxLayout({
                vertical: false,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-stackBoxLayout'
            });

            let indicator = new St.Label({
                text: "",
                x_expand: true,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.FILL,
                style_class: 'panel-calc-rpn-stackValueLabel'
            });
            indicator.set_style(`font-family: ${this._fontFamily}`);

            let label = new St.Label({
                text: name,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-stackNameLabel'
            });
            label.set_style(`font-family: ${this._fontFamily}`);

            box.add_actor(indicator);
            box.add_actor(label);

            indicatorBox.add_actor(box);

            return indicator;
        }

        _initIndicatorS(indicatorSArea) {
            let indicator1Box = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                opacity: 150,
                style_class: 'panel-calc-rpn-indicator0BoxLayout'
            });
            let indicator2Box = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                opacity: 150,
                style_class: 'panel-calc-rpn-indicatorBoxLayout'
            });

            this._x1Indicator = this._initIndicator(indicator1Box, "X\u{2081}");
            this._tIndicator = this._initIndicator(indicator2Box, "T");
            this._zIndicator = this._initIndicator(indicator2Box, "Z");
            this._yIndicator = this._initIndicator(indicator2Box, "Y");

            indicatorSArea.menu.box.add(indicator1Box);
            indicatorSArea.menu.box.add(new PopupMenu.PopupSeparatorMenuItem());
            indicatorSArea.menu.box.add(indicator2Box);
        }

        _initIndicator0(indicator0Area) {
            let indicator0Box = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-calc-rpn-indicator0BoxLayout'
            });

            this._xIndicator = this._initIndicator(indicator0Box, "X", 'panel-calc-rpn-stackBoxLayout');
            indicator0Area.actor.add_child(indicator0Box);
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
                    { label: this._processor.Glyph.SEVEN, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.EIGHT, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.NINE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.MINUS, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.DIVIDE, style_class: 'panel-calc-rpn-grayButton' }
                ],
                [
                    { label: this._processor.Glyph.FOUR, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.FIVE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.SIX, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.PLUS, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.MULTIPLY, style_class: 'panel-calc-rpn-grayButton' }
                ],
                [
                    { label: this._processor.Glyph.ONE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.TWO, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.THREE, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.SWAP, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.UP, style_class: 'panel-calc-rpn-grayButton' }
                ],
                [
                    { label: this._processor.Glyph.ZERO, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.PERIOD, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.SIGN, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.BACK_X, style_class: 'panel-calc-rpn-grayButton' },
                    { label: this._processor.Glyph.CLEAR_X, style_class: 'panel-calc-rpn-redButton' }
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
