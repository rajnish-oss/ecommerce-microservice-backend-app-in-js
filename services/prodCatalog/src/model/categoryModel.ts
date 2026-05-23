import mongoose from "mongoose";


const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true }, // e.g., "gaming-laptops"
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    default: null 
  }
});

const Category = mongoose.model('Category', categorySchema);

export default Category;