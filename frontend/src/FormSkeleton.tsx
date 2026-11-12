export function FormSkeleton() {
  return (
    <main
      className="form-page form-skeleton"
      aria-busy="true"
      aria-label="Chargement du formulaire"
    >
      <span className="sr-only" role="status">
        Chargement du formulaire…
      </span>
      <div className="form-heading" aria-hidden="true">
        <i className="skeleton-piece skeleton-icon" />
        <i className="skeleton-piece skeleton-title" />
        <i className="skeleton-piece skeleton-subtitle" />
      </div>
      <div className="form-sheet" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div className="skeleton-field" key={i}>
            <i className="skeleton-piece skeleton-label" />
            <i className="skeleton-piece skeleton-input" />
          </div>
        ))}
        <i className="skeleton-piece skeleton-button" />
      </div>
    </main>
  );
}
