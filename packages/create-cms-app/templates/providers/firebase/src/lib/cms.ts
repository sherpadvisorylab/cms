import { CMS } from "@sherpacms/cms";
import { FirebaseAdapter } from "./db/adapter";
import { initAdmin } from "./firebase/admin";

initAdmin();

export const cms = new CMS(new FirebaseAdapter());
