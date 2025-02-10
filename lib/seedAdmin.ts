import User from "../models/User";
import dbConnect from "./dbConnect";
import bcrypt from "bcryptjs";

export async function seedDefaultAdmin() {
  try {
    // Ensure MongoDB connection is established first
    const mongoose = await dbConnect();
    
    const { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } = process.env;
    
    if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
      console.warn("Default admin credentials not provided in .env.local");
      return;
    }
    
    // Only proceed if we're connected to the database
    if (mongoose.connection.readyState !== 1) {
      console.warn("MongoDB connection not ready. Skipping admin seeding.");
      return;
    }
    
    const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await User.create({
        name: "Default Admin",
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin"
      });
      console.log("Default admin has been created with the provided credentials.");
    } else {
      console.log("Default admin already exists.");
    }
  } catch (error) {
    console.error("Error seeding default admin:", error);
    throw error;
  }
}
