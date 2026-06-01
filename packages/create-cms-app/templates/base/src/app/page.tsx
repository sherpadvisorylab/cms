import { cms } from "@/lib/cms";

export default async function HomePage() {
  const result = await cms.renderContent("Public", "home").catch(() => null);

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome</h1>
          <p className="text-gray-500">
            No home page found.{" "}
            <a href="/admin" className="text-blue-600 underline">
              Create one in the admin.
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
