"use client";
import { useState } from "react";
type Props={id:string;name:string;autoComplete?:string;required?:boolean;minLength?:number;maxLength?:number;placeholder?:string;className?:string};
export function PasswordInput({id,name,autoComplete="current-password",required=true,minLength,maxLength=72,placeholder,className=""}:Props){
 const [visible,setVisible]=useState(false);
 return <span className="relative block">
  <input id={id} name={name} type={visible?"text":"password"} autoComplete={autoComplete} required={required} minLength={minLength} maxLength={maxLength} placeholder={placeholder} dir="ltr" className={className+" pe-12 text-left"}/>
  <button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?"إخفاء كلمة المرور":"إظهار كلمة المرور"} className="absolute inset-y-0 right-2 my-auto flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title={visible?"إخفاء كلمة المرور":"إظهار كلمة المرور"}>
   {visible?<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.4 3.3M6.2 6.2C3.8 7.8 2.7 10 2.5 12c.5 1.2 3.8 7 9.5 7 1.4 0 2.7-.4 3.8-1"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.7"/></svg>}
  </button>
 </span>;
}
