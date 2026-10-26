"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[4471],{25031:(e,t,r)=>{r.d(t,{HY:()=>u,NB:()=>p,S3:()=>o,cj:()=>b,eV:()=>c,os:()=>g,qL:()=>s,yh:()=>l});var n=r(95155),a=r(12115);let i=`
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;function o({title:e="Tweaks",children:t}){let[r,s]=(0,a.useState)(!1),d=(0,a.useRef)(null),l=(0,a.useRef)({x:16,y:16}),p=(0,a.useCallback)(()=>{let e=d.current;if(!e)return;let t=e.offsetWidth,r=e.offsetHeight,n=Math.max(16,window.innerWidth-t-16),a=Math.max(16,window.innerHeight-r-16);l.current={x:Math.min(n,Math.max(16,l.current.x)),y:Math.min(a,Math.max(16,l.current.y))},e.style.right=`${l.current.x}px`,e.style.bottom=`${l.current.y}px`},[]);return((0,a.useLayoutEffect)(()=>{r&&p()},[r,p]),(0,a.useEffect)(()=>{if(!r)return;if("u"<typeof ResizeObserver)return window.addEventListener("resize",p),()=>window.removeEventListener("resize",p);let e=new ResizeObserver(p);return e.observe(document.documentElement),()=>e.disconnect()},[r,p]),(0,a.useEffect)(()=>{let e=e=>{let t=e.data?.type;"__activate_edit_mode"===t?s(!0):"__deactivate_edit_mode"===t&&s(!1)};return window.addEventListener("message",e),window.parent.postMessage({type:"__edit_mode_available"},"*"),()=>window.removeEventListener("message",e)},[]),r)?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)("style",{children:i}),(0,n.jsxs)("div",{ref:d,className:"twk-panel","data-omelette-chrome":"",children:[(0,n.jsxs)("div",{className:"twk-hd",onMouseDown:e=>{let t=d.current;if(!t)return;let r=t.getBoundingClientRect(),n=e.clientX,a=e.clientY,i=window.innerWidth-r.right,o=window.innerHeight-r.bottom,s=e=>{l.current={x:i-(e.clientX-n),y:o-(e.clientY-a)},p()},c=()=>{window.removeEventListener("mousemove",s),window.removeEventListener("mouseup",c)};window.addEventListener("mousemove",s),window.addEventListener("mouseup",c)},children:[(0,n.jsx)("b",{children:e}),(0,n.jsx)("button",{type:"button",className:"twk-x","aria-label":"Close tweaks",onMouseDown:e=>e.stopPropagation(),onClick:()=>{s(!1),window.parent.postMessage({type:"__edit_mode_dismissed"},"*")},children:"✕"})]}),(0,n.jsx)("div",{className:"twk-body",children:t})]})]}):null}function s({label:e,children:t}){return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)("div",{className:"twk-sect",children:e}),t]})}function d({label:e,value:t,children:r,inline:a=!1}){return(0,n.jsxs)("div",{className:a?"twk-row twk-row-h":"twk-row",children:[(0,n.jsxs)("div",{className:"twk-lbl",children:[(0,n.jsx)("span",{children:e}),null!=t&&(0,n.jsx)("span",{className:"twk-val",children:t})]}),r]})}function l({label:e,value:t,min:r=0,max:a=100,step:i=1,unit:o="",onChange:s}){return(0,n.jsx)(d,{label:e,value:`${t}${o}`,children:(0,n.jsx)("input",{type:"range",className:"twk-slider",min:r,max:a,step:i,value:t,onChange:e=>s(Number(e.target.value))})})}function p({label:e,value:t,onChange:r}){return(0,n.jsxs)("div",{className:"twk-row twk-row-h",children:[(0,n.jsx)("div",{className:"twk-lbl",children:(0,n.jsx)("span",{children:e})}),(0,n.jsx)("button",{type:"button",className:"twk-toggle","data-on":t?"1":"0",role:"switch","aria-checked":t,onClick:()=>r(!t),children:(0,n.jsx)("i",{})})]})}function c({label:e,value:t,options:r,onChange:i}){let o=(0,a.useRef)(null),[s,l]=(0,a.useState)(!1),p=(0,a.useRef)(t);if((0,a.useLayoutEffect)(()=>{p.current=t},[t]),!(r.reduce((e,t)=>Math.max(e,String("object"==typeof t?t.label:t).length),0)<=(({2:16,3:10})[r.length]??0)))return(0,n.jsx)(u,{label:e,value:t,options:r,onChange:e=>{let t;return i(void 0===(t=r.find(t=>String("object"==typeof t?t.value:t)===e))?e:"object"==typeof t?t.value:t)}});let b=r.map(e=>"object"==typeof e?e:{value:e,label:e}),x=Math.max(0,b.findIndex(e=>e.value===t)),g=b.length,h=e=>{let t=o.current;if(!t)return p.current;let r=t.getBoundingClientRect(),n=r.width-4,a=Math.floor((e-r.left-2)/n*g),i=b[Math.max(0,Math.min(g-1,a))];return i?i.value:p.current};return(0,n.jsx)(d,{label:e,children:(0,n.jsxs)("div",{ref:o,role:"radiogroup","aria-label":e,onPointerDown:e=>{l(!0);let t=h(e.clientX);t!==p.current&&i(t);let r=e=>{if(!o.current)return;let t=h(e.clientX);t!==p.current&&i(t)},n=()=>{l(!1),window.removeEventListener("pointermove",r),window.removeEventListener("pointerup",n)};window.addEventListener("pointermove",r),window.addEventListener("pointerup",n)},className:s?"twk-seg dragging":"twk-seg",children:[(0,n.jsx)("div",{className:"twk-seg-thumb",style:{left:`calc(2px + ${x} * (100% - 4px) / ${g})`,width:`calc((100% - 4px) / ${g})`}}),b.map(e=>(0,n.jsx)("button",{type:"button",role:"radio","aria-checked":e.value===t,children:e.label},e.value))]})})}function u({label:e,value:t,options:r,onChange:a}){return(0,n.jsx)(d,{label:e,children:(0,n.jsx)("select",{className:"twk-field",value:t,onChange:e=>a(e.target.value),children:r.map(e=>{let t="object"==typeof e?e.value:e,r="object"==typeof e?e.label:e;return(0,n.jsx)("option",{value:t,children:r},t)})})})}function b({label:e,value:t,placeholder:r,onChange:a}){return(0,n.jsx)(d,{label:e,children:(0,n.jsx)("input",{className:"twk-field",type:"text",value:t,placeholder:r,onChange:e=>a(e.target.value)})})}function x({light:e}){return(0,n.jsx)("svg",{viewBox:"0 0 14 14","aria-hidden":"true",children:(0,n.jsx)("path",{d:"M3 7.2 5.8 10 11 4.2",fill:"none",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round",stroke:e?"rgba(0,0,0,.78)":"#fff"})})}function g({label:e,value:t,options:r,onChange:a}){if(!r||!r.length){let r="string"==typeof t?t:t[0]??"#000000";return(0,n.jsxs)("div",{className:"twk-row twk-row-h",children:[(0,n.jsx)("div",{className:"twk-lbl",children:(0,n.jsx)("span",{children:e})}),(0,n.jsx)("input",{type:"color",className:"twk-swatch",value:r,onChange:e=>a(e.target.value)})]})}let i=e=>String(JSON.stringify(e)).toLowerCase(),o=i(t);return(0,n.jsx)(d,{label:e,children:(0,n.jsx)("div",{className:"twk-chips",role:"radiogroup","aria-label":e,children:r.map((e,t)=>{let r,s,d=Array.isArray(e)?e:[e],l=d[0]??"#000000",p=d.slice(1).slice(0,4),c=i(e)===o;return(0,n.jsxs)("button",{type:"button",className:"twk-chip",role:"radio","aria-checked":c,"data-on":c?"1":"0","aria-label":d.join(", "),title:d.join(" \xb7 "),style:{background:l},onClick:()=>a(e),children:[p.length>0&&(0,n.jsx)("span",{children:p.map((e,t)=>(0,n.jsx)("i",{style:{background:e}},t))}),c&&(0,n.jsx)(x,{light:!!Number.isNaN(s=parseInt((3===(r=String(l).replace("#","")).length?r.replace(/./g,e=>e+e):r.padEnd(6,"0")).slice(0,6),16))||299*(s>>16&255)+587*(s>>8&255)+114*(255&s)>148e3})]},t)})})})}},39837:(e,t,r)=>{r.d(t,{n:()=>a});var n=r(12115);function a(e){let[t,r]=(0,n.useState)(e);return[t,(0,n.useCallback)((e,t)=>{let n="object"==typeof e&&null!==e?e:{[e]:t};r(e=>({...e,...n})),window.parent.postMessage({type:"__edit_mode_set_keys",edits:n},"*"),window.dispatchEvent(new CustomEvent("tweakchange",{detail:n}))},[])]}}}]);