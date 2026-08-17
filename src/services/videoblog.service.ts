/* eslint-disable @typescript-eslint/no-explicit-any */
import { IVideoBlog, IVideoBlogUpdate } from "../interfaces/videoblog.interface";
import VideoBlogModel from "../models/videoblog.model";



interface ListOptions {
  status?: string;
  platform?: string;
  search?: string;
}

const getAllVideos = async (options: ListOptions = {}) => {
  const { status, platform, search } = options;

  const query: Record<string, any> = {};
  if (status) query.status = status;
  if (platform) query.platform = platform;
  if (search) query.$text = { $search: search };

  return VideoBlogModel.find(query).sort({ sort_order: 1, createdAt: -1 });
};

const getActiveVideos = async () => {
  return VideoBlogModel.find({ status: "active" }).sort({ sort_order: 1 });
};

const getVideoById = async (id: string) => {
  return VideoBlogModel.findById(id);
};

const createVideo = async (payload: IVideoBlog) => {
  return VideoBlogModel.create(payload);
};

const updateVideo = async (id: string, payload: IVideoBlogUpdate) => {
  return VideoBlogModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
};

const deleteVideo = async (id: string) => {
  return VideoBlogModel.findByIdAndDelete(id);
};

export const VideoBlogService = {
  getAllVideos,
  getActiveVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
};
