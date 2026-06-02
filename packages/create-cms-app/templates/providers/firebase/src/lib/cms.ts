import { CMS } from "@sherpacms/cms";
import { FirebaseAdapter } from "./db/adapter";
import { initAdmin } from "./firebase/admin";
import { revalidateTag } from "next/cache";

initAdmin();

export const cms = new CMS(new FirebaseAdapter(), {
  onRevalidate: (slugs) => {
    for (const slug of slugs) revalidateTag(`page:${slug}`);
    revalidateTag("pages");
  },
});
