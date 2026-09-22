import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime, d as useControllableState, h as Primitive } from "./@radix-ui/react-accordion+[...].mjs";
import { t as composeEventHandlers } from "./radix-ui__primitive.mjs";
//#region node_modules/@radix-ui/react-toggle/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});
var NAME = "Toggle";
var Toggle = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function Toggle2(props, forwardedRef) {
	const { pressed: pressedProp, defaultPressed, onPressedChange, ...buttonProps } = props;
	const [pressed, setPressed] = useControllableState({
		prop: pressedProp,
		onChange: onPressedChange,
		defaultProp: defaultPressed ?? false,
		caller: NAME
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.button, {
		type: "button",
		"aria-pressed": pressed,
		"data-state": pressed ? "on" : "off",
		"data-disabled": props.disabled ? "" : void 0,
		...buttonProps,
		ref: forwardedRef,
		onClick: composeEventHandlers(props.onClick, () => {
			if (!props.disabled) setPressed(!pressed);
		})
	});
}, "Toggle"));
var Root = Toggle;
//#endregion
export { Toggle as n, Root as t };
