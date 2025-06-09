import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    KMS_API_SECRET_KEY: z.string().optional(),
    KMS_API_PUBLIC_KEY: z.string().optional(),
    SWYFTX_API_SECRET_KEY: z.string().optional(),
    SWYFTX_API_ACCESS_TOKEN: z.string().optional(),
  },
  runtimeEnv: Deno.env.toObject(),
});
