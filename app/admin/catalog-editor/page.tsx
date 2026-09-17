export const dynamic = 'force-dynamic';

export default function AdminCatalogEditorPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide">Admin catalog controls</p>
        <h1 className="text-3xl font-bold">Test &amp; Package Editor</h1>
        <p className="mt-2 text-sm text-slate-600">Edit approved descriptive and pricing metadata. Activation, booking and serviceability remain protected.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <h2 className="text-xl font-semibold">Tests</h2>
          <p>Search a partner test and edit MRP, Selling price, Description, Sample type, Preparation and TAT.</p>
        </div>
        <div className="rounded-xl border p-5">
          <h2 className="text-xl font-semibold">Packages</h2>
          <p>Search a partner package and edit MRP, Selling price, Description, Sample type, Preparation and TAT.</p>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Pricing &amp; Gross margin</h2>
        <p>Review customer Selling price against MRP before saving. Gross margin visibility is informational and does not change partner activation or serviceability.</p>
      </section>
    </main>
  );
}
