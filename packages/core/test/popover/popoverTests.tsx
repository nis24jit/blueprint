/*
 * Copyright 2015 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the terms of the LICENSE file distributed with this project.
 */

import { assert } from "chai";
import { mount, ReactWrapper, shallow } from "enzyme";
import * as React from "react";
import { Arrow } from "react-popper";
import * as sinon from "sinon";

import { dispatchMouseEvent, expectPropValidationError } from "@blueprintjs/test-commons";

import * as Classes from "../../src/common/classes";
import * as Errors from "../../src/common/errors";
import * as Keys from "../../src/common/keys";
import { Position } from "../../src/common/position";
import * as Utils from "../../src/common/utils";
import { Overlay } from "../../src/components/overlay/overlay";
import { IPopoverProps, IPopoverState, Popover, PopoverInteractionKind } from "../../src/components/popover/popover";
import { Tooltip } from "../../src/components/tooltip/tooltip";
import { Portal } from "../../src/index";

describe("<Popover>", () => {
    let testsContainerElement: HTMLElement;
    let wrapper: IPopoverWrapper;

    beforeEach(() => {
        testsContainerElement = document.createElement("div");
        document.body.appendChild(testsContainerElement);
    });

    afterEach(() => {
        if (wrapper !== undefined) {
            // clean up wrapper to remove Portal element from DOM
            wrapper.detach();
            wrapper = undefined;
        }
        testsContainerElement.remove();
    });

    describe.skip("validation:", () => {
        it("throws error if given no target", () => {
            expectPropValidationError(Popover, {}, Errors.POPOVER_REQUIRES_TARGET);
        });

        it("warns if given > 2 target elements", () => {
            const warnSpy = sinon.spy(console, "warn");
            shallow(
                <Popover>
                    <h1 />
                    <h2 />
                    {"h3"}
                </Popover>,
            );
            assert.isTrue(warnSpy.calledWith(Errors.POPOVER_WARN_TOO_MANY_CHILDREN));
            warnSpy.restore();
        });

        it("warns if given children and target prop", () => {
            const warnSpy = sinon.spy(console, "warn");
            shallow(<Popover target="boom">pow</Popover>);
            assert.isTrue(warnSpy.calledWith(Errors.POPOVER_WARN_DOUBLE_TARGET));
            warnSpy.restore();
        });

        it("warns if given two children and content prop", () => {
            const warnSpy = sinon.spy(console, "warn");
            shallow(
                <Popover content="boom">
                    {"pow"}
                    {"jab"}
                </Popover>,
            );
            assert.isTrue(warnSpy.calledWith(Errors.POPOVER_WARN_DOUBLE_CONTENT));
            warnSpy.restore();
        });
    });

    it("propagates class names correctly", () => {
        wrapper = renderPopover({
            className: "bar",
            interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
            popoverClassName: "foo",
            targetClassName: "baz",
        }).simulateTarget("click");
        assert.isTrue(wrapper.findClass(Classes.POPOVER).hasClass("foo"));
        assert.isTrue(wrapper.findClass(Classes.POPOVER_WRAPPER).hasClass("bar"));
        assert.isTrue(wrapper.findClass(Classes.POPOVER_TARGET).hasClass("baz"));
    });

    it("adds .pt-popover-open class to target when the popover is open", () => {
        wrapper = renderPopover();
        assert.isFalse(wrapper.findClass(Classes.POPOVER_TARGET).hasClass(Classes.POPOVER_OPEN));
        wrapper.setState({ isOpen: true });
        assert.isTrue(wrapper.findClass(Classes.POPOVER_TARGET).hasClass(Classes.POPOVER_OPEN));
    });

    it("does not render Portal when inline=true", () => {
        wrapper = renderPopover({ inline: true, isOpen: true });
        assert.lengthOf(wrapper.find(Portal).find(`.${Classes.POPOVER}`), 0);
    });

    it("renders Portal when inline=false", () => {
        wrapper = renderPopover({ inline: false, isOpen: true });
        assert.lengthOf(wrapper.find(Portal).find(`.${Classes.POPOVER}`), 1);
    });

    it("empty content disables it and warns", () => {
        const warnSpy = sinon.spy(console, "warn");
        const popover = mount(
            <Popover content={undefined} isOpen={true}>
                <button />
            </Popover>,
        );
        assert.isFalse(popover.find(Overlay).prop("isOpen"));

        popover.setProps({ content: "    " });
        assert.isFalse(popover.find(Overlay).prop("isOpen"));

        assert.equal(warnSpy.callCount, 2);
        warnSpy.restore();
    });

    it("lifecycle methods are called appropriately", () => {
        const popoverWillOpen = sinon.spy(() =>
            assert.lengthOf(testsContainerElement.getElementsByClassName(Classes.POPOVER), 0),
        );
        const popoverDidOpen = sinon.spy(() =>
            assert.lengthOf(testsContainerElement.getElementsByClassName(Classes.POPOVER), 1),
        );
        const popoverWillClose = sinon.spy(() =>
            assert.lengthOf(testsContainerElement.getElementsByClassName(Classes.POPOVER), 1),
        );

        wrapper = renderPopover({
            interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
            popoverDidOpen,
            popoverWillClose,
            popoverWillOpen,
        }).simulateTarget("click");
        assert.isTrue(popoverWillOpen.calledOnce);
        assert.isTrue(popoverDidOpen.calledOnce);
        assert.isTrue(popoverWillClose.notCalled);

        wrapper.simulateTarget("click");
        assert.isTrue(popoverDidOpen.calledOnce);
        assert.isTrue(popoverWillOpen.calledOnce);
        assert.isTrue(popoverWillClose.calledOnce);
    });

    it("popoverDidOpen is called even if popoverWillOpen is not specified", () => {
        const popoverDidOpen = sinon.spy();
        renderPopover({
            interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
            popoverDidOpen,
        }).simulateTarget("click");

        assert.isTrue(popoverDidOpen.calledOnce);
    });

    it("inherits .pt-dark from trigger ancestor", () => {
        testsContainerElement.classList.add(Classes.DARK);
        const { popover } = renderPopover({ inline: false, isOpen: true, inheritDarkTheme: true });
        assert.isTrue(popover.matches(`.${Classes.DARK}`));
        testsContainerElement.classList.remove(Classes.DARK);
    });

    it("inheritDarkTheme=false disables inheriting .pt-dark from trigger ancestor", () => {
        testsContainerElement.classList.add(Classes.DARK);
        const { popover } = renderPopover({ inheritDarkTheme: false, inline: false, isOpen: true });
        assert.isFalse(popover.matches(`.${Classes.DARK}`));
        testsContainerElement.classList.remove(Classes.DARK);
    });

    it("allows user to apply dark theme explicitly", () => {
        const { popover } = renderPopover({
            inline: true,
            isOpen: true,
            popoverClassName: Classes.DARK,
        });
        assert.isNotNull(popover.matches(`.${Classes.DARK}`));
    });

    it("hasBackdrop=false does not render backdrop element", () => {
        const { popover } = renderPopover({ inline: false, hasBackdrop: false, isOpen: true });
        assert.lengthOf(popover.parentElement.getElementsByClassName(Classes.POPOVER_BACKDROP), 0);
    });

    it("hasBackdrop=true renders backdrop element", () => {
        const { popover } = renderPopover({ inline: false, hasBackdrop: true, isOpen: true });
        const expectedBackdrop = popover.parentElement.previousElementSibling;
        assert.isTrue(expectedBackdrop.matches(`.${Classes.POPOVER_BACKDROP}`));
    });

    it("rootElementTag prop renders the right elements", () => {
        wrapper = renderPopover({ isOpen: true, rootElementTag: "g" });
        assert.isNotNull(wrapper.find("g"));
    });

    describe("openOnTargetFocus", () => {
        describe("if true (default)", () => {
            it('adds tabindex="0" to target\'s child node when interactionKind is HOVER', () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.HOVER, true, true);
            });

            it('adds tabindex="0" to target\'s child node when interactionKind is HOVER_TARGET_ONLY', () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.HOVER_TARGET_ONLY, true, true);
            });

            it("does not add tabindex to target's child node when interactionKind is CLICK", () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.CLICK, false, true);
            });

            it("does not add tabindex to target's child node when interactionKind is CLICK_TARGET_ONLY", () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.CLICK_TARGET_ONLY, false, true);
            });

            it("opens popover on target focus when interactionKind is HOVER", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.HOVER, true);
            });

            it("opens popover on target focus when interactionKind is HOVER_TARGET_ONLY", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.HOVER_TARGET_ONLY, true);
            });

            it("does not open popover on target focus when interactionKind is CLICK", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.CLICK, false);
            });

            it("does not open popover on target focus when interactionKind is CLICK_TARGET_ONLY", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.CLICK_TARGET_ONLY, false);
            });

            it.skip("closes popover on target blur if autoFocus={false}", () => {
                // TODO (clewis): This is really tricky to test given the setTimeout in the onBlur implementation.
            });

            it("popover remains open after target focus if autoFocus={true}", () => {
                wrapper = renderPopover({
                    autoFocus: true,
                    inline: false,
                    interactionKind: PopoverInteractionKind.HOVER,
                });
                const targetElement = wrapper.findClass(Classes.POPOVER_TARGET);
                targetElement.simulate("focus");
                targetElement.simulate("blur");
                assert.isTrue(wrapper.state("isOpen"));
            });
        });

        describe("if false", () => {
            it("does not add tabindex to target's child node when interactionKind is HOVER", () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.HOVER, false, false);
            });

            it("does not add tabindex to target's child node when interactionKind is HOVER_TARGET_ONLY", () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.HOVER_TARGET_ONLY, false, false);
            });

            it("does not add tabindex to target's child node when interactionKind is CLICK", () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.CLICK, false, false);
            });

            it("does not add tabindex to target's child node when interactionKind is CLICK_TARGET_ONLY", () => {
                assertPopoverTargetTabIndex(PopoverInteractionKind.CLICK_TARGET_ONLY, false, false);
            });

            it("does not open popover on target focus when interactionKind is HOVER", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.HOVER, false, false);
            });

            it("does not open popover on target focus when interactionKind is HOVER_TARGET_ONLY", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.HOVER_TARGET_ONLY, false, false);
            });

            it("does not open popover on target focus when interactionKind is CLICK", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.CLICK, false, false);
            });

            it("does not open popover on target focus when interactionKind is CLICK_TARGET_ONLY", () => {
                assertPopoverOpenStateForInteractionKind(PopoverInteractionKind.CLICK_TARGET_ONLY, false, false);
            });
        });

        function assertPopoverOpenStateForInteractionKind(
            interactionKind: PopoverInteractionKind,
            isOpen: boolean,
            openOnTargetFocus?: boolean,
        ) {
            wrapper = renderPopover({
                inline: false,
                interactionKind,
                openOnTargetFocus,
            });
            const targetElement = wrapper.findClass(Classes.POPOVER_TARGET);
            targetElement.simulate("focus");
            assert.equal(wrapper.state("isOpen"), isOpen);
        }

        function assertPopoverTargetTabIndex(
            interactionKind: PopoverInteractionKind,
            shouldTabIndexExist: boolean,
            openOnTargetFocus?: boolean,
        ) {
            wrapper = renderPopover({ inline: false, interactionKind, openOnTargetFocus });
            const targetElement = wrapper
                .findClass(Classes.POPOVER_TARGET)
                .childAt(0)
                .getDOMNode();

            if (shouldTabIndexExist) {
                assert.equal(targetElement.getAttribute("tabindex"), "0");
            } else {
                assert.isNull(targetElement.getAttribute("tabindex"));
            }
        }
    });

    describe("in controlled mode", () => {
        it("state respects isOpen prop", () => {
            renderPopover()
                .assertIsOpen(false)
                .setProps({ isOpen: true })
                .assertIsOpen();
        });

        it("state does not update on user interaction", () => {
            renderPopover({ isOpen: true })
                .simulateTarget("click")
                .assertIsOpen()
                .setProps({ isOpen: false })
                .simulateTarget("click")
                .assertIsOpen(false);
            renderPopover({ canEscapeKeyClose: true, isOpen: true })
                .sendEscapeKey()
                .assertIsOpen();
        });

        it("disabled is ignored", () => {
            renderPopover({ disabled: true, isOpen: true }).assertIsOpen();
        });

        it("onClose is invoked with event when popover would close", () => {
            const onClose = sinon.spy();
            renderPopover({ isOpen: true, onClose }).simulateTarget("click");
            assert.isTrue(onClose.calledOnce);
            assert.isNotNull(onClose.args[0][0]);
        });

        describe("onInteraction()", () => {
            let onInteraction: sinon.SinonSpy;
            beforeEach(() => (onInteraction = sinon.spy()));

            it("is invoked with `true` when closed popover target is clicked", () => {
                renderPopover({ isOpen: false, onInteraction }).simulateTarget("click");
                assert.isTrue(onInteraction.calledOnce);
                assert.isTrue(onInteraction.calledWith(true));
            });

            it("is invoked with `false` when open popover target is clicked", () => {
                renderPopover({ isOpen: true, onInteraction }).simulateTarget("click");
                assert.isTrue(onInteraction.calledOnce);
                assert.isTrue(onInteraction.calledWith(false));
            });

            it("is invoked with `false` when open modal popover backdrop is clicked", () => {
                renderPopover({
                    backdropProps: { className: "test-hook" },
                    hasBackdrop: true,
                    inline: false,
                    isOpen: true,
                    onInteraction,
                });
                dispatchMouseEvent(document.getElementsByClassName("test-hook")[0], "mousedown");
                assert.isTrue(onInteraction.calledOnce, "A");
                assert.isTrue(onInteraction.calledWith(false), "B");
            });

            it("is invoked with `false` when clicking .pt-popover-dismiss", () => {
                renderPopover(
                    { isOpen: true, onInteraction },
                    <button className="pt-button pt-popover-dismiss">Dismiss</button>,
                )
                    .findClass(Classes.POPOVER_DISMISS)
                    .simulate("click");
                assert.isTrue(onInteraction.calledOnce);
                assert.isTrue(onInteraction.calledWith(false));
            });

            it("is invoked with `false` when the document is mousedowned", () => {
                renderPopover({ isOpen: true, onInteraction });
                dispatchMouseEvent(document.documentElement, "mousedown");
                assert.isTrue(onInteraction.calledOnce);
                assert.isTrue(onInteraction.calledWith(false));
            });
        });
    });

    describe("in uncontrolled mode", () => {
        it("setting defaultIsOpen=true renders open popover", () => {
            renderPopover({ defaultIsOpen: true }).assertIsOpen();
        });

        it("with defaultIsOpen=true, popover can still be closed", () => {
            renderPopover({ defaultIsOpen: true })
                .assertIsOpen()
                .simulateTarget("click")
                .assertIsOpen(false);
        });

        it("CLICK_TARGET_ONLY works properly", () => {
            renderPopover({ interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY })
                .simulateTarget("click")
                .assertIsOpen()
                .simulateTarget("click")
                .assertIsOpen(false);
        });

        it("HOVER_TARGET_ONLY works properly", () => {
            renderPopover({ inline: false, interactionKind: PopoverInteractionKind.HOVER_TARGET_ONLY })
                .simulateTarget("mouseenter")
                .assertIsOpen()
                .simulateTarget("mouseleave")
                .assertIsOpen(false);
        });

        it("inline HOVER_TARGET_ONLY works properly when openOnTargetFocus={false}", () => {
            wrapper = renderPopover({
                inline: true,
                interactionKind: PopoverInteractionKind.HOVER_TARGET_ONLY,
                openOnTargetFocus: false,
            });

            wrapper.simulateTarget("mouseenter").assertIsOpen();

            wrapper.findClass(Classes.POPOVER).simulate("mouseenter");
            wrapper.assertIsOpen(false);
        });

        it("inline HOVER works properly", () => {
            wrapper = renderPopover({ inline: true, interactionKind: PopoverInteractionKind.HOVER });

            wrapper.simulateTarget("mouseenter").assertIsOpen();

            wrapper.findClass(Classes.POPOVER).simulate("mouseenter");
            wrapper.assertIsOpen();

            wrapper.findClass(Classes.POPOVER).simulate("mouseleave");
            wrapper.assertIsOpen(false);
        });

        it("clicking .pt-popover-dismiss closes popover when inline=false", () => {
            wrapper = renderPopover(
                {
                    inline: false,
                    interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
                },
                <button className="pt-button pt-popover-dismiss">Dismiss</button>,
            );

            wrapper.simulateTarget("click").assertIsOpen();

            dispatchMouseEvent(document.getElementsByClassName(Classes.POPOVER_DISMISS)[0], "click");
            wrapper.update().assertIsOpen(false);
        });

        it("clicking .pt-popover-dismiss closes popover when inline=true", () => {
            wrapper = renderPopover(
                {
                    inline: true,
                    interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
                },
                <button className="pt-button pt-popover-dismiss">Dismiss</button>,
            );

            wrapper.simulateTarget("click").assertIsOpen();

            wrapper.findClass(Classes.POPOVER_DISMISS).simulate("click");
            wrapper.assertIsOpen(false);
        });

        it("pressing Escape closes popover when canEscapeKeyClose=true and inline=true", () => {
            renderPopover({ canEscapeKeyClose: true, inline: true })
                .simulateTarget("click")
                .assertIsOpen()
                .sendEscapeKey()
                .assertIsOpen(false);
        });

        it("setting disabled=true prevents opening popover", () => {
            renderPopover({
                disabled: true,
                interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
            })
                .simulateTarget("click")
                .assertIsOpen(false);
        });

        it("setting disabled=true hides open popover", () => {
            renderPopover({ interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY })
                .simulateTarget("click")
                .assertIsOpen()
                .setProps({ disabled: true })
                .assertIsOpen(false);
        });

        it.skip("console.warns if onInteraction is set", () => {
            const warnSpy = sinon.spy(console, "warn");
            renderPopover({ onInteraction: () => false });
            assert.strictEqual(warnSpy.firstCall.args[0], Errors.POPOVER_WARN_UNCONTROLLED_ONINTERACTION);
            warnSpy.restore();
        });
    });

    describe("when composed with <Tooltip>", () => {
        let root: ReactWrapper<any, any>;
        beforeEach(() => {
            root = mount(
                <Popover content="popover" hoverOpenDelay={0} hoverCloseDelay={0} inline={true}>
                    <Tooltip content="tooltip" hoverOpenDelay={0} hoverCloseDelay={0} inline={true}>
                        <button>Target</button>
                    </Tooltip>
                </Popover>,
                { attachTo: testsContainerElement },
            );
        });
        afterEach(() => root.detach());

        it("shows tooltip on hover", () => {
            root
                .find(`.${Classes.POPOVER_TARGET}`)
                .last()
                .simulate("mouseenter");
            assert.lengthOf(root.find(`.${Classes.TOOLTIP}`), 1);
        });

        it("shows popover on click", () => {
            root
                .find(`.${Classes.POPOVER_TARGET}`)
                .first()
                .simulate("click");
            assert.lengthOf(root.find(`.${Classes.POPOVER}`), 1);
        });
    });

    describe("Popper.js integration", () => {
        it("renders arrow element by default", () => {
            wrapper = renderPopover({ isOpen: true });
            assert.lengthOf(wrapper.find(Arrow), 1);
        });

        it("arrow can be disabled via modifiers", () => {
            wrapper = renderPopover({ isOpen: true, modifiers: { arrow: { enabled: false } } });
            assert.lengthOf(wrapper.find(Arrow), 0);
        });

        it("arrow can be disabled via minimal prop", () => {
            wrapper = renderPopover({ minimal: true, isOpen: true });
            assert.lengthOf(wrapper.find(Arrow), 0);
        });

        it("computes arrow rotation", done => {
            renderPopover({ isOpen: true, position: Position.TOP }).then(
                () => assert.equal(wrapper.state("arrowRotation"), 90),
                done,
            );
        });

        it("computes transformOrigin with arrow", done => {
            // unreliable to test actual state value as it depends on browser (chrome and karma behave differently).
            // so we'll just check that state was set _at all_ (it starts undefined).
            renderPopover({ isOpen: true }).then(() => assert.isDefined(wrapper.state("transformOrigin")), done);
        });

        it("computes transformOrigin without arrow", done => {
            renderPopover({ minimal: true, isOpen: true }).then(
                () => assert.equal(wrapper.state("transformOrigin"), "center top"),
                done,
            );
        });
    });

    describe("deprecated prop shims", () => {
        it("should convert isModal to hasBackdrop", () => {
            const popover = shallow(
                <Popover inline={true} isModal={true}>
                    child
                </Popover>,
            );
            assert.isTrue(popover.find(Overlay).prop("hasBackdrop"));

            popover.setProps({ isModal: false });
            assert.isFalse(popover.find(Overlay).prop("hasBackdrop"));
        });

        it("should convert isDisabled to disabled", () => {
            renderPopover({
                interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
                isDisabled: true,
            })
                .simulateTarget("click")
                .assertIsOpen(false)
                .setProps({ isDisabled: false })
                .simulateTarget("click")
                .assertIsOpen(true);
        });

        it("hasBackdrop should take precedence over isModal", () => {
            const popover = shallow(
                <Popover inline={true} hasBackdrop={true} isModal={false}>
                    child
                </Popover>,
            );
            assert.isTrue(popover.find(Overlay).prop("hasBackdrop"));

            popover.setProps({ hasBackdrop: false, isModal: true });
            assert.isFalse(popover.find(Overlay).prop("hasBackdrop"));
        });

        it("disabled should take precedence over isDisabled", () => {
            renderPopover({
                disabled: true,
                interactionKind: PopoverInteractionKind.CLICK_TARGET_ONLY,
                isDisabled: false,
            })
                .simulateTarget("click")
                .assertIsOpen(false)
                .setProps({ disabled: false, isDisabled: true })
                .simulateTarget("click")
                .assertIsOpen(true);
        });
    });

    interface IPopoverWrapper extends ReactWrapper<IPopoverProps, IPopoverState> {
        popover: HTMLElement;
        assertIsOpen(isOpen?: boolean): this;
        simulateTarget(eventName: string): this;
        findClass(className: string): ReactWrapper<React.HTMLAttributes<HTMLElement>, any>;
        sendEscapeKey(): this;
        then(next: (wrap: IPopoverWrapper) => void, done?: MochaDone): void;
    }

    function renderPopover(props: Partial<IPopoverProps> = {}, content?: any) {
        wrapper = mount(
            <Popover inline={true} {...props} hoverCloseDelay={0} hoverOpenDelay={0}>
                <button>Target</button>
                <p>Text {content}</p>
            </Popover>,
            { attachTo: testsContainerElement },
        ) as IPopoverWrapper;
        wrapper.popover = (wrapper.instance() as Popover).popoverElement;
        wrapper.assertIsOpen = (isOpen = true) => {
            assert.equal(wrapper.find(Overlay).prop("isOpen"), isOpen);
            return wrapper;
        };
        wrapper.findClass = (className: string) => wrapper.find(`.${className}`).hostNodes();
        wrapper.simulateTarget = (eventName: string) => {
            wrapper.findClass(Classes.POPOVER_TARGET).simulate(eventName);
            return wrapper;
        };
        wrapper.sendEscapeKey = () => {
            wrapper.findClass(Classes.OVERLAY_OPEN).simulate("keydown", {
                nativeEvent: new KeyboardEvent("keydown"),
                which: Keys.ESCAPE,
            });
            return wrapper;
        };
        wrapper.then = (next, done) => {
            setTimeout(() => {
                next(wrapper);
                Utils.safeInvoke(done);
            });
        };
        return wrapper;
    }
});
