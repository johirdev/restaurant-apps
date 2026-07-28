/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * AdminManagement
 * ----------------
 * Single page that replaces AllAdmin + AdminCreate + EditAdmin.
 *
 * Desktop (lg and up): two columns.
 *   - Left  : sticky create/edit form
 *   - Right : admin list. Clicking "Edit" fills the left form with that
 *             admin's data (no navigation, no route change).
 *
 * Mobile: form is collapsed behind a "+ New Admin" toggle button so the
 * list gets full width. Tapping "Edit" on a row auto-opens the form.
 *
 * Styling comes from admin-theme.css (dark theme only, CSS variables).
 * Import that file once in your root layout and adjust the two import
 * paths below (DateTimeBd, DeleteModal, AuthContext) to match your project.
 */

import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { toast } from "react-toastify";

type AdminRole = "admin" | "superadmin" | "viewOnly";

interface Admin {
  _id: string;
  admin_name: string;
  admin_role: AdminRole;
  admin_phone: string;
  admin_email: string;
  admin_ip_address?: string;
  login_attempts?: number;
  createdAt?: string;
  [key: string]: any;
}

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

const ROLE_CONFIG: Record<AdminRole, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "active-admin" },
  superadmin: { label: "Super Admin", cls: "active-superadmin" },
  viewOnly: { label: "View Only", cls: "active-view" },
};

const EMPTY_FORM: FormData = {
  admin_role: "admin",
  admin_name: "",
  admin_email: "",
  admin_phone: "",
  admin_password: "",
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
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const widths = ["w-1/4", "w-2/4", "w-3/4", "w-full"];
  return pw
    ? { width: widths[score - 1] ?? "w-1/12", color: colors[score - 1] ?? "bg-red-400" }
    : { width: "w-0", color: "" };
}

export const AdminManagement = () => {
  const { token } = useContext(AuthContext);

  // list state
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  // form state (shared by create + edit)
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // responsive toggle (mobile only — desktop form is always visible)
  const [formOpen, setFormOpen] = useState(false);

  // delete modal
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`/api/v1/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------------------
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setMode("create");
    setEditingId(null);
    setShowPw(false);
  };

  const startEdit = (admin: Admin) => {
    setForm({
      admin_role: admin.admin_role,
      admin_name: admin.admin_name,
      admin_email: admin.admin_email,
      admin_phone: admin.admin_phone,
      admin_password: "",
    });
    setErrors({});
    setMode("edit");
    setEditingId(admin._id);
    setFormOpen(true); // auto-open form on mobile
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.admin_name.trim()) errs.admin_name = "Full name is required";
    if (!form.admin_email || !/^\S+@\S+\.\S+$/.test(form.admin_email))
      errs.admin_email = "Valid email address required";
    if (!form.admin_phone || form.admin_phone.length < 8)
      errs.admin_phone = "Valid phone number required";
    // Password required on both create and edit, per requirement.
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
    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await axios.post(`/api/v1/admins`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success(`Admin "${form.admin_name}" created successfully!`);
          resetForm();
          fetchAdmins();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Something went wrong.");
        }
      } else {
        const res = await axios.patch(`/api/v1/admins/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Admin updated successfully!");
          resetForm();
          fetchAdmins();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Update failed.");
        }
      }
    } catch {
      toast.error("Failed to connect to server.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------
  const closeDeleteModal = (): void => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = (): void => {
    if (!deleteId) return;
    setAdmins((prev) => prev.filter((a) => a._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  const strength = getStrength(form.admin_password);

  return (
    <div className="admin-panel bg-app rounded-md text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/admins/${deleteId}`}
          title="Admin"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      {/* Mobile header + toggle */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h1 className="text-lg font-semibold text-primary">Admins</h1>
        <button
          type="button"
          onClick={() => {
            if (!formOpen && mode === "edit") resetForm();
            setFormOpen((o) => !o);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Admin"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* ============== LEFT: CREATE / EDIT FORM ============== */}
        <div
          className={`${formOpen ? "block" : "hidden"} lg:block bg-card border-default rounded-xl overflow-hidden lg:sticky lg:top-6`}
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-default-b">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-blue-soft)" }}
            >
              <svg
                className="w-5 h-5 text-highlight"
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
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Create New Admin" : "Edit Admin"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                {mode === "create"
                  ? "Add a new administrator to the system"
                  : "Update administrator information"}
              </p>
            </div>
          
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Role */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-primary">
                Role <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(ROLE_CONFIG) as AdminRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, admin_role: role }))}
                    className={`role-pill px-4 py-1.5 text-[13px] font-medium ${
                      form.admin_role === role ? ROLE_CONFIG[role].cls : ""
                    }`}
                  >
                    {ROLE_CONFIG[role].label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-secondary">
                Controls what this admin can access and manage.
              </p>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.admin_name}
                onChange={(e) => handleChange("admin_name", e.target.value)}
                placeholder="Md. Johirul Islam"
                className={`input-field w-full h-10 px-3 text-[14px] ${
                  errors.admin_name ? "input-error" : ""
                }`}
              />
              {errors.admin_name && (
                <p className="text-[12px] text-danger">{errors.admin_name}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                value={form.admin_phone}
                onChange={(e) => handleChange("admin_phone", e.target.value)}
                placeholder="01712345678"
                className={`input-field w-full h-10 px-3 text-[14px] ${
                  errors.admin_phone ? "input-error" : ""
                }`}
              />
              {errors.admin_phone && (
                <p className="text-[12px] text-danger">{errors.admin_phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={form.admin_email}
                onChange={(e) => handleChange("admin_email", e.target.value)}
                placeholder="johir@gmail.com"
                className={`input-field w-full h-10 px-3 text-[14px] ${
                  errors.admin_email ? "input-error" : ""
                }`}
              />
              {errors.admin_email && (
                <p className="text-[12px] text-danger">{errors.admin_email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Password <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.admin_password}
                  onChange={(e) => handleChange("admin_password", e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={`input-field w-full h-10 px-3 pr-10 text-[14px] ${
                    errors.admin_password ? "input-error" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                >
                  {showPw ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {form.admin_password && (
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.width} ${strength.color}`} />
                </div>
              )}
              {errors.admin_password && (
                <p className="text-[12px] text-danger">{errors.admin_password}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-default-t">
            <button type="button" onClick={resetForm} className="btn btn-outline px-5 py-2 text-[13px]">
              {mode === "edit" ? "Cancel" : "Reset"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary flex items-center gap-2 px-6 py-2 text-[13px]"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {mode === "create" ? "Create Admin" : "Update Admin"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: ADMIN LIST ============== */}
        <div className="bg-card border-default rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-6 text-secondary text-sm">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-default-b">
                  <tr>
                    <th className="px-4 py-3 text-secondary font-semibold">Name</th>
                    <th className="px-4 py-3 text-secondary font-semibold">Role</th>
                    <th className="px-4 py-3 text-secondary font-semibold">Phone</th>
                    <th className="px-4 py-3 text-secondary font-semibold">Email</th>
                    <th className="px-4 py-3 text-secondary font-semibold">IP Address</th>
                    <th className="px-4 py-3 text-secondary font-semibold">Login Attempts</th>
                    <th className="px-4 py-3 text-secondary font-semibold">Created At</th>
                    <th className="px-4 py-3 text-secondary font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin, index) => (
                    <tr
                      key={admin._id}
                      className={`table-row-hover ${index % 2 === 0 ? "table-row-alt" : ""} ${
                        editingId === admin._id ? "outline outline-1" : ""
                      }`}
                      style={editingId === admin._id ? { outlineColor: "var(--accent-blue)" } : undefined}
                    >
                      <td className="px-4 py-3 text-primary">{admin.admin_name}</td>
                      <td className="px-4 py-3 text-primary capitalize">{admin.admin_role}</td>
                      <td className="px-4 py-3 text-primary">{admin.admin_phone}</td>
                      <td className="px-4 py-3 text-primary">{admin.admin_email}</td>
                      <td className="px-4 py-3 text-secondary">{admin.admin_ip_address}</td>
                      <td className="px-4 py-3 text-secondary">{admin.login_attempts}</td>
                      <td className="px-4 py-3 text-secondary">{DateTimeBd(admin.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center justify-center">
                          <button
                            type="button"
                            onClick={() => startEdit(admin)}
                            className="btn btn-blue px-3 py-1.5 text-[12px]"
                          >
                            Edit
                          </button>
                          {admin.admin_role !== "superadmin" && (
                            <button
                              type="button"
                              onClick={() => {
                                setModalOpen(true);
                                setDeleteId(admin._id);
                              }}
                              className="btn btn-danger px-3 py-1.5 text-[12px]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-secondary">
                        No admins found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;