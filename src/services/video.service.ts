import VideoModel from "../models/video.model";
import { BadRequest, NotFound } from "../lib/apiError";
import { parseVideoUrl } from "../lib/videoUrl";
import type { IVideo, IVideoUpdate } from "../interfaces/video.interface";

/* ==========================================================================
   সার্ভিস স্তর — শুধু ডাটাবেস, কোনো HTTP নয়।
   ========================================================================== */

/**
 * লিংক থেকে provider / video_id / embed_url বসিয়ে দেয়।
 *
 * এগুলো ফর্ম থেকে আসে না, কারণ ক্লায়েন্ট চাইলে যা খুশি পাঠাতে পারত —
 * embed_url টা সরাসরি <iframe src> এ বসে, তাই সেটা সবসময় সার্ভারেই
 * তৈরি হয়। থাম্বনেইল ফাঁকা থাকলে YouTube এর নিজেরটা বসে যায়।
 */
const withDerivedFields = <T extends { video_url?: string; thumbnail?: string }>(
  payload: T,
): T => {
  if (!payload.video_url) return payload;

  const parsed = parseVideoUrl(payload.video_url);
  // zod আগেই আটকে দেয়, তাই এখানে পৌঁছানোর কথা নয় — তবু পাহারা থাকুক
  if (!parsed) throw BadRequest("That video link is not supported");

  return {
    ...payload,
    provider: parsed.provider,
    video_id: parsed.video_id,
    embed_url: parsed.embed_url,
    thumbnail: payload.thumbnail || parsed.thumbnail,
  };
};

/** ড্যাশবোর্ডের তালিকা — বন্ধ ভিডিওগুলোও দেখা যায় */
const getAllVideos = async () => {
  return VideoModel.find().sort({ sort_order: 1, createdAt: -1 });
};

/** হোম পেজের স্লাইডার — শুধু চালু ভিডিও */
const getActiveVideos = async () => {
  return VideoModel.find({ status: "active" }).sort({
    sort_order: 1,
    createdAt: -1,
  });
};

const getVideoById = async (id: string) => {
  const video = await VideoModel.findById(id);
  if (!video) throw NotFound("Video not found");
  return video;
};

const createVideo = async (payload: IVideo) => {
  return VideoModel.create(withDerivedFields(payload));
};

const updateVideo = async (id: string, payload: IVideoUpdate) => {
  const video = await VideoModel.findByIdAndUpdate(
    id,
    { $set: withDerivedFields(payload) },
    { new: true, runValidators: true },
  );
  if (!video) throw NotFound("Video not found");
  return video;
};

const deleteVideo = async (id: string) => {
  const video = await VideoModel.findByIdAndDelete(id);
  if (!video) throw NotFound("Video not found");
  return video;
};

export const VideoService = {
  getAllVideos,
  getActiveVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
};
