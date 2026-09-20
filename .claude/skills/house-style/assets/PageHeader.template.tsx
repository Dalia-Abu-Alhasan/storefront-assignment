/**
 * Canonical page header template. This mirrors `components/PageHeader.tsx` —
 * copy it, don't invent new heading markup. Every page (including error,
 * not-found and loading states) renders this shape: uppercase eyebrow, h1,
 * one muted subtitle sentence.
 *
 * Usage:
 *   <PageHeader
 *     eyebrow="Category"          // names the section, e.g. "Category", "Item"
 *     title={category.name}       // the actual h1 text
 *     subtitle={`${category.blurb} ...`} // one sentence, muted, gives context
 *   />
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="page-header">
      <p className="page-header__eyebrow">{eyebrow}</p>
      <h1 className="page-header__title">{title}</h1>
      <p className="page-header__subtitle">{subtitle}</p>
    </header>
  );
}
