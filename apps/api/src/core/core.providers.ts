import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { loadEnv, type AppEnv } from "@cc/config";
import { PrismaClient, Prisma } from "@cc/db";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID, createHash } from "crypto";
import pino from "pino";

export { Prisma };

export const ENV = {
  provide: "ENV",
  useFactory: (): AppEnv => loadEnv(),
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Injectable()
export class LoggerService {
  private readonly logger = pino({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  });

  info(msg: string, obj?: object) {
    this.logger.info(obj ?? {}, msg);
  }
  warn(msg: string, obj?: object) {
    this.logger.warn(obj ?? {}, msg);
  }
  error(msg: string, obj?: object) {
    this.logger.error(obj ?? {}, msg);
  }
}

@Injectable()
export class StorageService {
  private localDir() {
    const dir = join(process.cwd(), "uploads");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  async saveImage(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }): Promise<{ storageKey: string; url: string; mimeType: string; sizeBytes: number }> {
    const env = loadEnv();
    const folder = env.CLOUDINARY_FOLDER;

    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
      const signature = createHash("sha1").update(toSign).digest("hex");
      const uploadForm = new FormData();
      uploadForm.append("file", `data:${file.mimetype};base64,${file.buffer.toString("base64")}`);
      uploadForm.append("api_key", env.CLOUDINARY_API_KEY);
      uploadForm.append("timestamp", String(timestamp));
      uploadForm.append("folder", folder);
      uploadForm.append("signature", signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: uploadForm },
      );
      if (!res.ok) throw new Error(`Cloudinary upload failed: ${await res.text()}`);
      const data = (await res.json()) as { public_id: string; secure_url: string };
      return {
        storageKey: data.public_id,
        url: data.secure_url,
        mimeType: file.mimetype,
        sizeBytes: file.buffer.length,
      };
    }

    if (!env.STORAGE_LOCAL_FALLBACK) {
      throw new Error("Cloudinary not configured and local fallback disabled");
    }

    const key = `${Date.now()}-${randomUUID()}`;
    const ext = file.mimetype.split("/")[1] ?? "bin";
    const filename = `${key}.${ext}`;
    const path = join(this.localDir(), filename);
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(path);
      stream.on("finish", () => resolve());
      stream.on("error", reject);
      stream.end(file.buffer);
    });

    // Public media URL must use APP_URL (browser-facing), never loopback API_URL
    const base = env.APP_URL.replace(/\/$/, "");
    return {
      storageKey: filename,
      url: `${base}/api/v1/media/local/${filename}`,
      mimeType: file.mimetype,
      sizeBytes: file.buffer.length,
    };
  }
}
