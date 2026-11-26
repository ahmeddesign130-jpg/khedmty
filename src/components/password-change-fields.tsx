"use client";

import { useMemo, useRef, useState } from "react";

type PasswordChangeFieldsProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function PasswordChangeFields({ action }: PasswordChangeFieldsProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const rules = useMemo(() => ({
    length: newPassword.length >= 10 && newPassword.length <= 72,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    symbol: /[^A-Za-z0-9]/.test(newPassword),
  }), [newPassword]);
  const valid = Object.values(rules).every(Boolean);
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;

  const Eye = ({ visible }: { visible: boolean }) => visible
    ? <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.4 3.3M6.2 6.2C3.8 7.8 2.7 10 2.5 12c.5 1.2 3.8 7 9.5 7 1.4 0 2.7-.4 3.8-1"/></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.7"/></svg>;

  function toggleVisibility(
    event: React.PointerEvent<HTMLButtonElement>,
    input: React.RefObject<HTMLInputElement | null>,
    setter: (value: boolean) => void,
    visible: boolean,
  ) {
    // Prevent the button inside the field from blurring/re-activating the input label.
    event.preventDefault();
    const element = input.current;
    const start = element?.selectionStart ?? element?.value.length ?? 0;
    const end = element?.selectionEnd ?? start;
    setter(!visible);
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus({ preventScroll: true });
      try { element.setSelectionRange(start, end); } catch {}
    });
  }

  const EyeField = ({ label, name, value, visible, setVisible, onChange, autoComplete, inputRef }: {
    label: string; name: string; value?: string; visible: boolean; setVisible: (v: boolean) => void;
    onChange?: (v: string) => void; autoComplete: string; inputRef: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div className="block text-sm font-semibold text-slate-700">
      <label htmlFor={name}>{label}</label>
      <span className="relative mt-2 block">
        <input ref={inputRef} id={name} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required maxLength={72}
          value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          className="w-full rounded-xl border border-slate-200 p-3 pe-12 text-left outline-none focus:border-orange-500" dir="ltr"/>
        <button type="button" onPointerDown={(event) => toggleVisibility(event, inputRef, setVisible, visible)}
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
          <Eye visible={visible}/>
        </button>
      </span>
    </div>
  );
  const rule = (ok: boolean, label: string) => <span className={ok ? "text-emerald-600" : "text-slate-500"}>{ok ? "✓" : "•"} {label}</span>;

  return (
    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <EyeField label="كلمة المرور الحالية" name="currentPassword" visible={showCurrent} setVisible={setShowCurrent} autoComplete="current-password" inputRef={currentRef}/>
      </div>
      <div>
        <EyeField label="كلمة المرور الجديدة" name="newPassword" value={newPassword} onChange={setNewPassword} visible={showNew} setVisible={setShowNew} autoComplete="new-password" inputRef={newRef}/>
        <div aria-live="polite" className="mt-2 grid gap-1 text-xs leading-5">
          {rule(rules.length, "10 أحرف على الأقل")}
          {rule(rules.upper, "حرف كبير واحد (A)")}
          {rule(rules.lower, "حرف صغير واحد (a)")}
          {rule(rules.number, "رقم واحد على الأقل (0–9)")}
          {rule(rules.symbol, "رمز خاص مثل # أو *")}
        </div>
      </div>
      <div>
        <EyeField label="تأكيد كلمة المرور الجديدة" name="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirm} setVisible={setShowConfirm} autoComplete="new-password" inputRef={confirmRef}/>
        {confirmPassword.length > 0 && <p className={matches ? "mt-2 text-xs text-emerald-600" : "mt-2 text-xs text-red-600"}>{matches ? "✓ كلمتا المرور متطابقتان" : "كلمتا المرور غير متطابقتين"}</p>}
      </div>
      <button type="submit" disabled={!valid || !matches} className="rounded-xl bg-[#14213d] px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2">تحديث كلمة المرور</button>
    </form>
  );
}
