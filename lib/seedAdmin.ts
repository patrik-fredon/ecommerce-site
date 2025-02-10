import { userService } from "../services/UserService";
import dbConnect from "./dbConnect";
import { UserRole, ApiUser } from "../types/auth";
import { toApiUser } from "../utils/userUtils";

interface DefaultAdminConfig {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

interface SeedResult {
  success: boolean;
  message: string;
  admin?: ApiUser;
  error?: any;
}

export async function seedDefaultAdmin(config?: Partial<DefaultAdminConfig>): Promise<SeedResult> {
  try {
    // Ensure MongoDB connection is established first
    await dbConnect();
    
    const DEFAULT_ADMIN_EMAIL = config?.email || process.env.DEFAULT_ADMIN_EMAIL;
    const DEFAULT_ADMIN_PASSWORD = config?.password || process.env.DEFAULT_ADMIN_PASSWORD;
    const DEFAULT_ADMIN_NAME = config?.name || process.env.DEFAULT_ADMIN_NAME || 'Admin';
    
    if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
      console.warn("Default admin credentials not provided in .env.local");
      return {
        success: false,
        message: 'Missing admin credentials in environment variables'
      };
    }

    console.log('Checking for existing admin...');
    
    // Check for existing admin
    const existingAdmin = await userService.findByEmail(DEFAULT_ADMIN_EMAIL);
    
    if (!existingAdmin) {
      console.log('No admin found, creating default admin...');
      
      // Create new admin user
      const adminUser = await userService.create({
        name: DEFAULT_ADMIN_NAME,
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        role: 'admin',
        isBlocked: false
      });

      console.log("Default admin has been created with email:", DEFAULT_ADMIN_EMAIL);
      
      // Verify the admin was created correctly
      const verifyAdmin = await userService.findByEmail(DEFAULT_ADMIN_EMAIL, true);
      
      if (verifyAdmin) {
        const isValidPassword = await verifyAdmin.comparePassword(DEFAULT_ADMIN_PASSWORD);
        if (isValidPassword) {
          console.log("Default admin credentials verified successfully!");

          // Convert to API user format
          const adminResponse = toApiUser(adminUser);

          return {
            success: true,
            message: 'Admin created and verified',
            admin: adminResponse
          };
        } else {
          console.error("Warning: Default admin password verification failed!");
          return {
            success: false,
            message: 'Admin created but password verification failed'
          };
        }
      }

      return {
        success: false,
        message: 'Failed to verify admin creation'
      };
    } else {
      console.log("Default admin already exists.");

      // Convert existing admin to API user format
      const adminResponse = toApiUser(existingAdmin);

      return {
        success: true,
        message: 'Admin already exists',
        admin: adminResponse
      };
    }
  } catch (error) {
    console.error("Error seeding default admin:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      error
    };
  }
}
