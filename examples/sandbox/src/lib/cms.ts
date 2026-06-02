import { CMS } from "@sherpacms/cms";
import { DrizzleAdapter } from "./db/adapter";
import { revalidateTag } from "next/cache";

export const cms = new CMS(new DrizzleAdapter(), {
  onRevalidate: (slugs) => {
    for (const slug of slugs) revalidateTag(`page:${slug}`);
    revalidateTag("pages");
  },
});
