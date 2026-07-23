'use client'
import { AuthContext } from "@/app/dashboard/AuthProvider";
import config from "@/app/config/Config";
import { useContext, useState } from "react";
import { toast } from "react-toastify";

type AdminRole = "admin" | "superadmin" | "viewOnly";

interface FormData {
  admin_role: AdminRole;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  admin_password: string;
}

interface FormErrors {
  admin_name?: string;
  admin_email?: string;
  admin_phone?: string;
  admin_password?: string;
}

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-blue-50 border-blue-500 text-blue-700" },
  superadmin: {
    label: "Super Admin",
    color: "bg-purple-50 border-purple-500 text-purple-700",
  },
  viewOnly: {
    label: "View Only",
    color: "bg-green-50 border-green-500 text-green-700",
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "AD";
}

function getStrength(pw: string): { width: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const colors = [
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-500",
  ];
  const widths = ["w-1/4", "w-2/4", "w-3/4", "w-full"];
  return pw
    ? {
        width: widths[score - 1] ?? "w-1/12",
        color: colors[score - 1] ?? "bg-red-400",
      }
    : { width: "w-0", color: "" };
}

export const AdminCreate = () => {
  const { token } = useContext(AuthContext);

  const [form, setForm] = useState<FormData>({
    admin_role: "admin",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.admin_name.trim()) errs.admin_name = "Full name is required";
    if (!form.admin_email || !/^\S+@\S+\.\S+$/.test(form.admin_email))
      errs.admin_email = "Valid email address required";
    if (!form.admin_phone || form.admin_phone.length < 8)
      errs.admin_phone = "Valid phone number required";
    if (!form.admin_password || form.admin_password.length < 6)
      errs.admin_password = "Password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Admin "${form.admin_name}" created successfully!`);
        setForm({
          admin_role: "admin",
          admin_name: "",
          admin_email: "",
          admin_phone: "",
          admin_password: "",
        });
        setErrors({});
      } else {
        toast.error(data.message || "Something went wrong.");
      }
    } catch {
      toast.error("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.admin_password);

  return (
    <div className="min-h-screen  ">
      <div className="md:max-w-[60%]">
        {/* Card */}
        <div className=" rounded-xl border border-gray-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-8 py-5 border-b border-gray-400">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[17px] font-medium text-[#fff]">
                Create New Admin
              </h2>
              <p className="text-[13px] text-[#fff] mt-0.5">
                Add a new administrator to the system
              </p>
            </div>
            {/* Avatar Preview */}
            <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-gray-200 flex items-center justify-center text-blue-700 font-medium text-base">
              {form.admin_name ? getInitials(form.admin_name) : "AD"}
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-7 space-y-6">
            {/* Role */}
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-white">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(ROLE_CONFIG) as AdminRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, admin_role: role }))
                    }
                    className={`px-4 py-1.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all
                      ${
                        form.admin_role === role
                          ? ROLE_CONFIG[role].color
                          : "border-gray-200 text-[#fff] hover:border-gray-400 bg-transparent"
                      }`}
                  >
                    {ROLE_CONFIG[role].label}
                  </button>
                ))}
              </div>
              <p className="text-[14px] text-[#fff]">
                Controls what this admin can access and manage.
              </p>
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[14px] font-medium text-white">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.admin_name}
                  onChange={(e) => handleChange("admin_name", e.target.value)}
                  placeholder="Md. Johirul Islam"
                  className={`w-full h-10 px-3 rounded-md border text-[14px] text-[#fff] bg-transparent outline-none transition-all
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    ${errors.admin_name ? "border-red-400" : "border-gray-400"}`}
                />
                {errors.admin_name && (
                  <p className="text-[12px] text-red-500">
                    {errors.admin_name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[14px] font-medium text-white">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.admin_phone}
                  onChange={(e) => handleChange("admin_phone", e.target.value)}
                  placeholder="01712345678"
                  className={`w-full h-10 px-3 rounded-md border text-[14px] text-[#fff] bg-transparent outline-none transition-all
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    ${errors.admin_phone ? "border-red-400" : "border-gray-400"}`}
                />
                {errors.admin_phone && (
                  <p className="text-[12px] text-red-500">
                    {errors.admin_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-white">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.admin_email}
                onChange={(e) => handleChange("admin_email", e.target.value)}
                placeholder="johir@gmail.com"
                className={`w-full h-10 px-3 rounded-md border text-[14px] text-[#fff] bg-transparent outline-none transition-all
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  ${errors.admin_email ? "border-red-400" : "border-gray-400"}`}
              />
              {errors.admin_email && (
                <p className="text-[12px] text-red-500">{errors.admin_email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-white">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.admin_password}
                  onChange={(e) =>
                    handleChange("admin_password", e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  className={`w-full h-10 px-3 pr-10 rounded-md border text-[14px] text-[#fff] bg-transparent outline-none transition-all
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                    ${errors.admin_password ? "border-red-400" : "border-gray-400"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565959] hover:text-[#0f1111]"
                >
                  {showPw ? (
                    <svg
                      width="17"
                      height="17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="17"
                      height="17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Strength bar */}
              {form.admin_password && (
                <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.width} ${strength.color}`}
                  />
                </div>
              )}
              {errors.admin_password && (
                <p className="text-[12px] text-red-500">
                  {errors.admin_password}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-4  border-t border-black/[0.07]">
            <button
              type="button"
              onClick={() => {
                setForm({
                  admin_role: "admin",
                  admin_name: "",
                  admin_email: "",
                  admin_phone: "",
                  admin_password: "",
                });
                setErrors({});
              }}
              className="px-5 py-2 rounded-md border border-gray-400 text-[14px] text-[#fff] hover:bg-red-500 transition-colors bg-transparent"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-700! text-white text-[14px] font-medium bg-[#6d4cefc1] cursor-pointer hover:bg-[#7e60f4c1] transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Create Admin
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


