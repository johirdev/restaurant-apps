/* ==========================================================================
   সেটিংস পাতার ছোট প্রেজেন্টেশন হেল্পার
   --------------------------------------------------------------------------
   কার্ড, লেবেলওয়ালা মাঠ আর টগল — সেটিংস আর সাইট-কনটেন্ট দুই ফাইলেই
   লাগে, তাই একটাই কপি এখানে। রঙ/বর্ডার সব ড্যাশবোর্ডের নিজের ক্লাস
   (`bg-card`, `border-default`, `text-primary`) থেকে আসে।
   ========================================================================== */

export function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border-default rounded-xl p-5 md:p-6">
      <h2 className="text-primary text-[15px] font-medium">{title}</h2>
      {hint && <p className="text-secondary mt-0.5 text-[12.5px]">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-primary text-[13px] font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {hint && <span className="text-muted text-[11.5px]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer"
      />
      <span>
        <span className="text-primary block text-[13px] font-medium">
          {label}
        </span>
        {hint && (
          <span className="text-secondary block text-[12px]">{hint}</span>
        )}
      </span>
    </label>
  );
}
