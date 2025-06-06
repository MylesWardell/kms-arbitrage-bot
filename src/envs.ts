import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    KMS_API_SECRET_KEY: z.string().min(1),
    KMS_API_PUBLIC_KEY: z.string().min(1),
  },
  runtimeEnv: Deno.env.toObject(),
});
