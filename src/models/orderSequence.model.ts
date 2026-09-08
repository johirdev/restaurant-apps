import { Schema, model, models } from "mongoose";

const orderSequenceSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { timestamps: false },
);

const OrderSequenceModel =
  models.OrderSequence || model("OrderSequence", orderSequenceSchema);

export default OrderSequenceModel;