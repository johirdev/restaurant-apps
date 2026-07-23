"use client";

import { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { AuthContext } from "@/app/admins/AuthProvider";

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
        width: widths[score - 1] ?? "w-1/4",
        color: colors[score - 1] ?? "bg-red-400",
      }
    : { width: "w-0", color: "" };
}

export const EditAdmin = () => {
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState<FormData>({
    admin_role: "admin",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_password: "",
  });
  const { token } = useContext(AuthContext);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showPw, setShowPw] = useState(false);

  // ✅ Fetch Existing Admin
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch(`/api/v1/admins/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (data.success) {
          setForm({
            admin_role: data.data.admin_role,
            admin_name: data.data.admin_name,
            admin_email: data.data.admin_email,
            admin_phone: data.data.admin_phone,
            admin_password: "",
          });
        } else {
          toast.error("Admin not found");
        }
      } catch {
        toast.error("Failed to load admin");
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) fetchAdmin();
  }, [id]);

  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!form.admin_name.trim()) errs.admin_name = "Full name is required";

    if (!form.admin_email || !/^\S+@\S+\.\S+$/.test(form.admin_email))
      errs.admin_email = "Valid email required";

    if (!form.admin_phone || form.admin_phone.length < 8)
      errs.admin_phone = "Valid phone required";

    // ✅ password optional in edit
    if (form.admin_password && form.admin_password.length < 6) {
      errs.admin_password = "Min 6 characters";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ✅ UPDATE ADMIN
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/v1/admins/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Admin updated successfully!");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.admin_password);

  if (initialLoading) {
    return <p className="p-10 text-center">Loading admin data...</p>;
  }

  return (
    <>
      <div className="min-h-screen">
        <div className="md:max-w-[60%]">
          <div className="rounded-xl border border-gray-300 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 px-8 py-5 border-b">
              <div className="flex-1">
                <h2 className="text-[17px] font-medium">Edit Admin</h2>
                <p className="text-sm text-gray-100">
                  Update administrator information
                </p>
              </div>

              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                {getInitials(form.admin_name)}
              </div>
            </div>

            {/* Form */}
            <div className="px-8 py-7 space-y-6">
              {/* Role */}
              <div>
                <label className="text-sm font-medium">Role</label>
                <div className="flex gap-2 mt-2">
                  {(Object.keys(ROLE_CONFIG) as AdminRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() =>
                        setForm((p) => ({ ...p, admin_role: role }))
                      }
                      className={`px-4 py-1.5 rounded-full border ${
                        form.admin_role === role
                          ? ROLE_CONFIG[role].color
                          : "border-gray-300 bg-transparent text-white"
                      }`}
                    >
                      {ROLE_CONFIG[role].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[14px] font-medium text-white">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.admin_name}
                    onChange={(e) => handleChange("admin_name", e.target.value)}
                    placeholder="Full Name"
                    className="input w-full h-10 px-3 pr-10 rounded-md border border-gray-400 text-[14px] text-[#fff] bg-transparent outline-none transition-all
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="text-[14px] font-medium text-white">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.admin_phone}
                    onChange={(e) =>
                      handleChange("admin_phone", e.target.value)
                    }
                    placeholder="Phone"
                    className="input w-full h-10 px-3 pr-10 rounded-md border border-gray-400 text-[14px] text-[#fff] bg-transparent outline-none transition-all
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[14px] font-medium text-white">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.admin_email}
                  className="input w-full h-10 px-3 pr-10 rounded-md border border-gray-400 text-[14px] text-[#fff] bg-transparent outline-none transition-all
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[14px] font-medium text-white">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={form.admin_password}
                  onChange={(e) =>
                    handleChange("admin_password", e.target.value)
                  }
                  placeholder="New Password (optional)"
                  className="input w-full h-10 px-3 pr-10 rounded-md border border-gray-400 text-[14px] text-[#fff] bg-transparent outline-none transition-all
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {form.admin_password && (
                  <div className="h-1 mt-2 bg-gray-200 rounded">
                    <div
                      className={`${strength.width} ${strength.color} h-full`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-8 py-4 border-t">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 cursor-pointer text-white rounded-md"
              >
                {loading ? "Updating..." : "Update Admin"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};;
