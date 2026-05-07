"use client";

type CategoryLandingPanelProps = {
  title: string;
  description: string;
  subcategories: string[];
  dataAvailability: string;
  keyPoints: string[];
  dataSource?: string[];
};

export function CategoryLandingPanel({
  title,
  description,
  subcategories,
  dataAvailability,
  keyPoints,
  dataSource = [],
}: CategoryLandingPanelProps) {
  return (
    <section className="px-2 py-2 sm:px-4 sm:py-4">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">Overview</p>
      <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-5xl text-lg leading-8 text-muted sm:text-xl">{description}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Subcategories</p>
          <ul className="mt-3 space-y-2 text-lg leading-7 text-muted">
            {subcategories.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Data Availability</p>
          <p className="mt-3 text-lg leading-7 text-muted">{dataAvailability}</p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Key Information</p>
        <ul className="mt-3 space-y-2 text-lg leading-7 text-muted">
          {keyPoints.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>

      {dataSource.length > 0 ? (
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Data Source</p>
          <ul className="mt-3 space-y-2 text-lg leading-7 text-muted">
            {dataSource.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
