import { CMS } from "@sherpacms/cms";
import { DrizzleAdapter } from "./db/adapter";

export const cms = new CMS(new DrizzleAdapter());
