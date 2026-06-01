import { cms } from "@/lib/cms";

export default async function AdminDashboard() {
  const [pages, areas, components] = await Promise.all([
    cms.pages.findAll().catch(() => []),
    cms.areas.findAll().catch(() => []),
    cms.components.findAll().catch(() => []),
  ]);

  const stats = [
    { label: "Pages",      value: pages.length },
    { label: "Areas",      value: areas.length },
    { label: "Components", value: components.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Recent Pages
        </h2>
        {pages.length === 0 ? (
          <p className="text-gray-400 text-sm">No pages yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pages.slice(0, 10).map((p) => (
              <li
                key={p.id}
                className="py-2 flex items-center justify-between text-sm"
              >
                <span className="text-gray-700 font-medium">{p.title}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === "published"
                      ? "bg-green-100 text-green-700"
                      : p.status === "draft"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
