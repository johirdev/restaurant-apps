/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";
import Link from "next/link";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";

export const AllAdmin = () => {
  const { token } = useContext(AuthContext);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  // DELETE
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await axios.get(`/api/v1/admins`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAdmins(res.data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  // ======================
  // DELETE
  // ======================

  interface Admin {
    _id: string;
    // add other fields if needed
    [key: string]: any;
  }

  const closeDeleteModal = (): void => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = (): void => {
    if (!deleteId) return;

    setAdmins((prev: Admin[]) => prev.filter((a) => a._id !== deleteId));
    closeDeleteModal();
  };

  if (loading) {
    return <p className="p-4 text-primary">Loading...</p>;
  }

  return (
    <>
      {/* DELETE MODAL */}
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/admins/${deleteId}`}
          title="Admin"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 ">
          <thead className="bg-transparent text-left text-sm font-semibold">
            <tr>
              <th className="px-3 py-3 text-white">Name</th>
              <th className="px-3 py-3 text-white">Role</th>
              <th className="px-3 py-3 text-white">Phone</th>
              <th className="px-3 py-3 text-white">Email</th>
              <th className="px-3 py-3 text-white">IP Address</th>
              <th className="px-3 py-3 text-white">Login Attempts</th>
              <th className="px-3 py-3 text-white">Created At</th>
              <th className="px-3 py-3 text-white">Action</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="text-sm">
            {admins.map((admin, index) => (
              <tr
                key={admin._id}
                className={index % 2 === 0 ? "bg-gray-800" : ""}
              >
                <td className="px-3 py-3 text-white">{admin.admin_name}</td>
                <td className="px-3 py-3 text-white">{admin.admin_role}</td>
                <td className="px-3 py-3 text-white">{admin.admin_phone}</td>
                <td className="px-3 py-3 text-white">{admin.admin_email}</td>
                <td className="px-3 py-3 text-white">{admin.admin_ip_address}</td>
                <td className="px-3 py-3 text-white">{admin.login_attempts}</td>
                <td className="px-3 py-3 text-white">{DateTimeBd(admin.createdAt)}</td>
                <td className="px-3 py-3 text-white">
                  <div className="flex gap-2 items-center justify-center">
                    <Link
                      href={`/admins/all-admin/edit/${admin._id}`}
                      className="items-center justify-center bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                    >
                      Edit
                    </Link>
                    {admin?.admin_role !== "superAdmin" && (
                      <button
                        onClick={() => {
                          setModalOpen(true);
                          setDeleteId(admin?._id);
                        }}
                        className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
