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

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _(`${Me.metadata.name} Indicator`));

            this.add_child(new St.Icon({
                icon_name: 'org.gnome.Calculator-symbolic',
                style_class: 'system-status-icon',
            }));

            //-- Init display controls

            //-- Init stack display
            let stackArea = new PopupMenu.PopupSubMenuMenuItem(_("Stack"), false);
            stackArea.setOrnament(PopupMenu.Ornament.HIDDEN);

            //-- Insert stack display controls
            {
                let stackBox = new St.BoxLayout({
                    vertical: true,
                    x_expand: true,
                    y_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    opacity: 150,
                    style_class: 'panel-calc-rpn-displayBoxLayout'
                });

                let x1StackBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    opacity: 150,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-stackBoxLayout'
                });
                let tStackBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    opacity: 150,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-stackBoxLayout'
                });
                let zStackBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    opacity: 150,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-stackBoxLayout'
                });
                let yStackBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    opacity: 150,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-stackBoxLayout'
                });

                x1StackBox.add_actor(new St.Label({
                    text: "0",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.FILL,
                    style_class: 'panel-calc-rpn-displayLabel'
                }));
                x1StackBox.add_actor(new St.Label({
                    text: ":X₁",
                    x_align: Clutter.ActorAlign.END,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-displayNameLabel'
                }));

                tStackBox.add_actor(new St.Label({
                    text: "0",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.FILL,
                    style_class: 'panel-calc-rpn-displayLabel'
                }));
                tStackBox.add_actor(new St.Label({
                    text: ":T",
                    x_align: Clutter.ActorAlign.END,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-displayNameLabel'
                }));

                zStackBox.add_actor(new St.Label({
                    text: "0",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.FILL,
                    style_class: 'panel-calc-rpn-displayLabel'
                }));
                zStackBox.add_actor(new St.Label({
                    text: ":Z",
                    x_align: Clutter.ActorAlign.END,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-displayNameLabel'
                }));

                yStackBox.add_actor(new St.Label({
                    text: "0",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.FILL,
                    style_class: 'panel-calc-rpn-displayLabel'
                }));
                yStackBox.add_actor(new St.Label({
                    text: ":Y",
                    x_align: Clutter.ActorAlign.END,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-displayNameLabel'
                }));

                stackBox.add_actor(x1StackBox);
                stackBox.add_actor(tStackBox);
                stackBox.add_actor(zStackBox);
                stackBox.add_actor(yStackBox);

                stackArea.menu.box.add(stackBox);
            }

            //-- Init register display
            let registerArea = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                style_class: 'panel-calc-rpn-PopupBaseMenuItem'
            });
            registerArea.setOrnament(PopupMenu.Ornament.HIDDEN);

            //-- Insert register display controls
            {
                let registerBox = new St.BoxLayout({
                    vertical: true,
                    x_expand: true,
                    y_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-displayBoxLayout'
                });

                let xStackBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    y_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-stackBoxLayout'
                });

                this._register = new St.Label({
                    text: "0",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.FILL,
                    style_class: 'panel-calc-rpn-displayLabel'
                });
                this._register.get_clutter_text().set_justify(true); 
                this._register.get_clutter_text().set_line_alignment(Pango.Alignment.RIGHT);

                xStackBox.add_actor(this._register);
                xStackBox.add_actor(new St.Label({
                    text: ":X",
                    x_align: Clutter.ActorAlign.END,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-displayNameLabel'
                }));

                registerBox.add_actor(xStackBox);
                registerArea.actor.add_child(registerBox);
            }

            //-- Init keyboard
            let keyboardArea = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                style_class: 'panel-calc-rpn-PopupBaseMenuItem'
            });
            keyboardArea.setOrnament(PopupMenu.Ornament.HIDDEN);

            //-- Insert keyboard controls
            {
                let keyboardBox = new St.BoxLayout({
                    vertical: true,
                    x_expand: true,
                    y_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-BoxLayout'
                });

                let line1KeyboardBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-BoxLayout'
                });
                let line2KeyboardBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-BoxLayout'
                });
                let line3KeyboardBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-BoxLayout'
                });
                let line4KeyboardBox = new St.BoxLayout({
                    vertical: false,
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-BoxLayout'
                });

                let key0 = new St.Button({
                    label: "0",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key1 = new St.Button({
                    label: "1",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key2 = new St.Button({
                    label: "2",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key3 = new St.Button({
                    label: "3",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key4 = new St.Button({
                    label: "4",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key5 = new St.Button({
                    label: "5",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key6 = new St.Button({
                    label: "6",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key7 = new St.Button({
                    label: "7",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key8 = new St.Button({
                    label: "8",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let key9 = new St.Button({
                    label: "9",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keyPoint = new St.Button({
                    label: ".",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keyAdd = new St.Button({
                    label: "+",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keySubtract = new St.Button({
                    label: "-",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keyMultiply = new St.Button({
                    label: "×",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keyDivide = new St.Button({
                    label: "÷",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keySignToggle = new St.Button({
                    label: "±",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keyPushX = new St.Button({
                    label: "↑",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keySwapXY = new St.Button({
                    label: "↔",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keyBackX = new St.Button({
                    label: "BX",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-grayButton'
                });
                let keyClearX = new St.Button({
                    label: "CX",
                    x_expand: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: 'panel-calc-rpn-redButton'
                });

                line1KeyboardBox.add_actor(key7);
                line1KeyboardBox.add_actor(key8);
                line1KeyboardBox.add_actor(key9);
                line1KeyboardBox.add_actor(keySubtract);
                line1KeyboardBox.add_actor(keyDivide);

                line2KeyboardBox.add_actor(key4);
                line2KeyboardBox.add_actor(key5);
                line2KeyboardBox.add_actor(key6);
                line2KeyboardBox.add_actor(keyAdd);
                line2KeyboardBox.add_actor(keyMultiply);

                line3KeyboardBox.add_actor(key1);
                line3KeyboardBox.add_actor(key2);
                line3KeyboardBox.add_actor(key3);
                line3KeyboardBox.add_actor(keySwapXY);
                line3KeyboardBox.add_actor(keyPushX);

                line4KeyboardBox.add_actor(key0);
                line4KeyboardBox.add_actor(keyPoint);
                line4KeyboardBox.add_actor(keySignToggle);
                line4KeyboardBox.add_actor(keyBackX);
                line4KeyboardBox.add_actor(keyClearX);

                keyboardBox.add_actor(line1KeyboardBox);
                keyboardBox.add_actor(line2KeyboardBox);
                keyboardBox.add_actor(line3KeyboardBox);
                keyboardBox.add_actor(line4KeyboardBox);

                keyboardArea.actor.add_child(keyboardBox);
            }

            //-- Init Popup
            this.menu.addMenuItem(stackArea);
            this.menu.addMenuItem(registerArea);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(keyboardArea);

        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(Me.metadata.uuid);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
