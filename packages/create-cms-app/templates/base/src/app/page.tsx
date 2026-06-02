import { cms } from "@/lib/cms";
import { resolveHomePageSlug } from "@/lib/publicPageResolver";
import { unstable_cache } from "next/cache";

const getHomeContent = unstable_cache(
  async () => {
    const { areaName, slug } = await resolveHomePageSlug();
    const result = await cms.renderContent(areaName, slug).catch(() => null);
    return { result, slug };
  },
  ["home-page"],
  { revalidate: false, tags: ["home-page", "pages"] },
);

export default async function HomePage() {
  const { result } = await getHomeContent();

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">No published homepage yet</h1>
          <p className="text-gray-500">
            Create or publish a page in the root area and it will render here automatically.{" "}
            <a href="/admin" className="text-blue-600 underline">
              Open the admin.
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {result.css && <style dangerouslySetInnerHTML={{ __html: result.css }} />}
      <div dangerouslySetInnerHTML={{ __html: result.html }} />
      {result.js && (
        <script dangerouslySetInnerHTML={{ __html: result.js }} />
      )}
    </>
  );
}
