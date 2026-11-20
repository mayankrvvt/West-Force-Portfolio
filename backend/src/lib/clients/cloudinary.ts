import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";
import { logger } from "../logger";

// Cloudinary is optional: routes that need it fail on use when it is not set.
// Configured exactly once here (CLOUDINARY_URL wins over the three separate vars).
function configureCloudinary(): void {
  if (config.CLOUDINARY_URL) {
    try {
      const parsed = new URL(config.CLOUDINARY_URL);

      cloudinary.config({
        cloud_name: parsed.hostname,
        api_key: decodeURIComponent(parsed.username),
        api_secret: decodeURIComponent(parsed.password),
        secure: true,
      });

      logger.info(
        {
          cloud_name: parsed.hostname,
          api_key: parsed.username ? "LOADED" : "MISSING",
          api_secret: parsed.password ? "LOADED" : "MISSING",
        },
        "Cloudinary configuration check"
      );
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to parse CLOUDINARY_URL"
      );
    }
    return;
  }

  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });

  logger.info(
    {
      cloud_name: config.CLOUDINARY_CLOUD_NAME || "MISSING",
      api_key: config.CLOUDINARY_API_KEY ? "LOADED" : "MISSING",
      api_secret: config.CLOUDINARY_API_SECRET ? "LOADED" : "MISSING",
    },
    "Cloudinary configuration check"
  );
}

configureCloudinary();

export default cloudinary;
