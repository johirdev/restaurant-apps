/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useContext, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2"; // ✅ FIXED
import { AuthContext } from "@/src/app/dashboard/AuthProvider";

interface DeleteModalProps {
  deleteUrl: string;
  title?: string;
  onDeleted?: () => void;
  closeModal?: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  deleteUrl,
  title = "Items",
  onDeleted,
  closeModal,
}) => {
  const { token } = useContext(AuthContext);

  useEffect(() => {
    Swal.fire({
      title: "Are you sure?",
      text: `Once deleted, you will not be able to recover this ${title}!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${deleteUrl}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          Swal.fire({
            title: "Deleted!",
            text: `${title} deleted successfully.`,
            icon: "success",
            timer: 1000,
            showConfirmButton: false,
          });

          onDeleted?.();
        } catch (error: any) {
          Swal.fire({
            title: "Error!",
            text: error?.response?.data?.message || "Failed to delete",
            icon: "error",
          });
        }
      }

      closeModal?.();
    });
  }, [deleteUrl, title, onDeleted, closeModal, token]);

  return null;
};

export default DeleteModal;
