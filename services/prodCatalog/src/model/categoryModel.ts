import mongoose from "mongoose";


const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    default: null 
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
  },
}, {
  collection: "categories",
  timestamps: true,
  versionKey: false,
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
