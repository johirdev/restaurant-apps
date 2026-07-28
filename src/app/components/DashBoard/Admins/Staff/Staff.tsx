/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { toast } from "react-toastify";

type StaffRole = "waiter" | "chef" | "manager" | "cashier" | "cleaner";
type Shift = "morning" | "evening" | "night";
type Status = "active" | "inactive";

interface Staff {
  _id: string;
  staff_name: string;
  staff_role: StaffRole;
  staff_phone: string;
  staff_email: string;
  staff_image?: string;
  staff_image_public_id?: string;
  shift: Shift;
  status: Status;
  createdAt?: string;
  [key: string]: any;
}

interface FormData {
  staff_role: StaffRole;
  staff_name: string;
  staff_email: string;
  staff_phone: string;
  staff_password: string;
  staff_image: string;
  staff_image_public_id: string;
  shift: Shift;
  status: Status;
}

interface FormErrors {
  staff_name?: string;
  staff_email?: string;
  staff_phone?: string;
  staff_password?: string;
}

const ROLE_CONFIG: Record<StaffRole, { label: string; cls: string }> = {
  waiter: { label: "Waiter", cls: "active-admin" },
  chef: { label: "Chef", cls: "active-superadmin" },
  manager: { label: "Manager", cls: "active-view" },
  cashier: { label: "Cashier", cls: "active-admin" },
  cleaner: { label: "Cleaner", cls: "active-view" },
};

const SHIFT_LABEL: Record<Shift, string> = {
  morning: "Morning",
  evening: "Evening",
  night: "Night",
};

const EMPTY_FORM: FormData = {
  staff_role: "waiter",
  staff_name: "",
  staff_email: "",
  staff_phone: "",
  staff_password: "",
  staff_image: "",
  staff_image_public_id: "",
  shift: "morning",
  status: "active",
};

const MAX_SIZE_MB = 2;

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "ST";
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

export const StaffManagement = () => {
  const { token } = useContext(AuthContext);

  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ---- image state ----
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchStaffs = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`/api/v1/staffs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStaffs(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load staff list");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setMode("create");
    setEditingId(null);
    setShowPw(false);
    setImageFile(null);
    setImagePreview("");
  };

  const startEdit = (staff: Staff) => {
    setForm({
      staff_role: staff.staff_role,
      staff_name: staff.staff_name,
      staff_email: staff.staff_email,
      staff_phone: staff.staff_phone,
      staff_password: "",
      staff_image: staff.staff_image || "",
      staff_image_public_id: staff.staff_image_public_id || "",
      shift: staff.shift,
      status: staff.status,
    });
    setErrors({});
    setMode("edit");
    setEditingId(staff._id);
    setImageFile(null);
    setImagePreview(staff.staff_image || "");
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.staff_name.trim()) errs.staff_name = "Full name is required";
    if (!form.staff_email || !/^\S+@\S+\.\S+$/.test(form.staff_email))
      errs.staff_email = "Valid email address required";
    if (!form.staff_phone || form.staff_phone.length < 8)
      errs.staff_phone = "Valid phone number required";

    if (mode === "create") {
      if (!form.staff_password || form.staff_password.length < 6) {
        errs.staff_password = "Password must be at least 6 characters";
      }
    } else if (form.staff_password && form.staff_password.length < 6) {
      errs.staff_password = "Password must be at least 6 characters";
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

  // ---- image select + validate ----
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ---- delete old image from cloudinary ----
  const deleteOldImage = async (publicId: string) => {
    if (!publicId) return;
    try {
      await axios.delete("/api/v1/upload", { data: { public_id: publicId } });
    } catch {
      // silent fail — না delete হলেও নতুন upload block করার দরকার নাই
      console.warn("Old image delete failed:", publicId);
    }
  };

  // ---- upload new image, delete old if replacing ----
  const uploadImage = async (): Promise<{ url: string; public_id: string }> => {
    if (!imageFile) {
      return {
        url: form.staff_image,
        public_id: form.staff_image_public_id,
      };
    }

    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);

      // Content-Type header manually সেট করা হয় না —
      // axios/browser নিজেই boundary সহ সঠিক multipart Content-Type বসিয়ে দেয়
      const res = await axios.post("/api/v1/upload", fd);

      const { url, public_id } = res.data;

      if (mode === "edit" && form.staff_image_public_id) {
        await deleteOldImage(form.staff_image_public_id);
      }

      return { url, public_id };
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Image upload failed");
      throw new Error("Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { url, public_id } = await uploadImage();
      const payload = {
        ...form,
        staff_name: form.staff_name.trim(),
        staff_email: form.staff_email.trim().toLowerCase(),
        staff_phone: form.staff_phone.trim(),
        staff_image: url,
        staff_image_public_id: public_id,
      } as typeof form & { staff_password?: string };

      if (mode === "create" || form.staff_password) {
        payload.staff_password = form.staff_password;
      }
      if (mode === "create") {
        const res = await axios.post(`/api/v1/staffs`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success(`Staff "${form.staff_name}" created successfully!`);
          resetForm();
          fetchStaffs();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Something went wrong.");
        }
      } else {
        const res = await axios.patch(`/api/v1/staffs/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Staff updated successfully!");
          resetForm();
          fetchStaffs();
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

  const toggleStatus = async (staff: Staff) => {
    const nextStatus: Status =
      staff.status === "active" ? "inactive" : "active";
    try {
      const res = await axios.patch(
        `/api/v1/staffs/${staff._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setStaffs((prev) =>
          prev.map((s) =>
            s._id === staff._id ? { ...s, status: nextStatus } : s,
          ),
        );
      } else {
        toast.error(res.data.message || "Could not update status.");
      }
    } catch {
      toast.error("Failed to connect to server.");
    }
  };

  const closeDeleteModal = (): void => {
    setModalOpen(false);
    setDeleteId(null);
  };

  // Staff delete হলে তার Cloudinary image ও delete করা ভালো
  const handleDeleted = (): void => {
    if (!deleteId) return;
    const staff = staffs.find((s) => s._id === deleteId);
    if (staff?.staff_image_public_id) {
      deleteOldImage(staff.staff_image_public_id);
    }
    setStaffs((prev) => prev.filter((s) => s._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  const strength = getStrength(form.staff_password);

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/staffs/${deleteId}`}
          title="Staff"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h1 className="text-lg font-semibold text-primary">Staff / Waiters</h1>
        <button
          type="button"
          onClick={() => {
            if (!formOpen && mode === "edit") resetForm();
            setFormOpen((o) => !o);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Staff"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* ============== LEFT: CREATE / EDIT FORM ============== */}
        <div
          className={`${formOpen ? "block" : "hidden"} lg:block bg-card border-default rounded-xl overflow-hidden lg:sticky lg:top-6`}
        >
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Staff / Waiter" : "Edit Staff"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                {mode === "create"
                  ? "Add a new staff member to your restaurant"
                  : "Update staff member information"}
              </p>
            </div>
            <div
              className="w-11 h-11 rounded-full border-default flex items-center justify-center font-medium text-[13px] text-highlight flex-shrink-0 overflow-hidden"
              style={{ background: "var(--accent-blue-soft)" }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : form.staff_name ? (
                getInitials(form.staff_name)
              ) : (
                "ST"
              )}
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Staff Photo */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-primary">
                Staff Photo
              </label>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full border-default overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--accent-blue-soft)" }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[13px] text-highlight font-medium">
                      {form.staff_name ? getInitials(form.staff_name) : "ST"}
                    </span>
                  )}
                </div>
                <label className="btn btn-outline px-4 py-2 text-[13px] cursor-pointer">
                  {imagePreview ? "Change Photo" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-secondary">
                Max {MAX_SIZE_MB}MB, JPG/PNG
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-primary">
                Role <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(ROLE_CONFIG) as StaffRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, staff_role: role }))
                    }
                    className={`role-pill px-4 py-1.5 text-[13px] font-medium ${
                      form.staff_role === role ? ROLE_CONFIG[role].cls : ""
                    }`}
                  >
                    {ROLE_CONFIG[role].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shift + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Shift
                </label>
                <select
                  value={form.shift}
                  onChange={(e) => handleChange("shift", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[14px]"
                >
                  {(Object.keys(SHIFT_LABEL) as Shift[]).map((s) => (
                    <option
                      key={s}
                      value={s}
                      className="bg-elevated text-primary"
                    >
                      {SHIFT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[14px]"
                >
                  <option value="active" className="bg-elevated text-primary">
                    Active
                  </option>
                  <option value="inactive" className="bg-elevated text-primary">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.staff_name}
                onChange={(e) => handleChange("staff_name", e.target.value)}
                placeholder="Rahim Uddin"
                className={`input-field w-full h-10 px-3 text-[14px] ${
                  errors.staff_name ? "input-error" : ""
                }`}
              />
              {errors.staff_name && (
                <p className="text-[12px] text-danger">{errors.staff_name}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                value={form.staff_phone}
                onChange={(e) => handleChange("staff_phone", e.target.value)}
                placeholder="01712345678"
                className={`input-field w-full h-10 px-3 text-[14px] ${
                  errors.staff_phone ? "input-error" : ""
                }`}
              />
              {errors.staff_phone && (
                <p className="text-[12px] text-danger">{errors.staff_phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={form.staff_email}
                onChange={(e) => handleChange("staff_email", e.target.value)}
                placeholder="rahim@gmail.com"
                className={`input-field w-full h-10 px-3 text-[14px] ${
                  errors.staff_email ? "input-error" : ""
                }`}
              />
              {errors.staff_email && (
                <p className="text-[12px] text-danger">{errors.staff_email}</p>
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
                  value={form.staff_password}
                  onChange={(e) =>
                    handleChange("staff_password", e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  className={`input-field w-full h-10 px-3 pr-10 text-[14px] ${
                    errors.staff_password ? "input-error" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                >
                  {showPw ? (
                    <svg
                      width="16"
                      height="16"
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
                      width="16"
                      height="16"
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
              {form.staff_password && (
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.width} ${strength.color}`}
                  />
                </div>
              )}
              {errors.staff_password && (
                <p className="text-[12px] text-danger">
                  {errors.staff_password}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-default-t">
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-outline px-5 py-2 text-[13px]"
            >
              {mode === "edit" ? "Cancel" : "Reset"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploadingImage}
              className="btn btn-primary flex items-center gap-2 px-6 py-2 text-[13px]"
            >
              {uploadingImage ? (
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
                  Uploading photo...
                </>
              ) : submitting ? (
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
                  {mode === "create" ? "Adding..." : "Updating..."}
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
                  {mode === "create" ? "Add Staff" : "Update Staff"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: STAFF LIST ============== */}
        <div className="bg-card border-default rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-6 text-secondary text-sm">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-default-b">
                  <tr>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Photo
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Name
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Role
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Shift
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Email
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staffs.map((staff, index) => (
                    <tr
                      key={staff._id}
                      className={`table-row-hover ${index % 2 === 0 ? "table-row-alt" : ""} ${
                        editingId === staff._id ? "outline outline-1" : ""
                      }`}
                      style={
                        editingId === staff._id
                          ? { outlineColor: "var(--accent-blue)" }
                          : undefined
                      }
                    >
                      <td className="px-4 py-3">
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden border-default flex items-center justify-center text-[11px] font-medium text-highlight"
                          style={{ background: "var(--accent-blue-soft)" }}
                        >
                          {staff.staff_image ? (
                            <img
                              src={staff.staff_image}
                              alt={staff.staff_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(staff.staff_name)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-primary">
                        {staff.staff_name}
                      </td>
                      <td className="px-4 py-3 text-primary capitalize">
                        {staff.staff_role}
                      </td>
                      <td className="px-4 py-3 text-secondary capitalize">
                        {staff.shift}
                      </td>
                      <td className="px-4 py-3 text-primary">
                        {staff.staff_phone}
                      </td>
                      <td className="px-4 py-3 text-primary">
                        {staff.staff_email}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleStatus(staff)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            staff.status === "active"
                              ? "text-success"
                              : "text-danger"
                          }`}
                          style={{
                            borderColor: "var(--border-color)",
                            background:
                              staff.status === "active"
                                ? "var(--accent-green-soft)"
                                : "rgba(239,68,68,0.12)",
                          }}
                          title="Click to toggle status"
                        >
                          {staff.status === "active" ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {DateTimeBd(staff.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center justify-center">
                          <button
                            type="button"
                            onClick={() => startEdit(staff)}
                            className="btn btn-blue px-3 py-1.5 text-[12px]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModalOpen(true);
                              setDeleteId(staff._id);
                            }}
                            className="btn btn-danger px-3 py-1.5 text-[12px]"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staffs.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-secondary"
                      >
                        No staff found.
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
};;

export default StaffManagement;
