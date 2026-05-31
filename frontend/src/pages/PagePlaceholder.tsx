type PagePlaceholderProps = {
  title: string;
};

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <div>
      <h1 className="font-display text-3xl text-text-primary">{title}</h1>
      <p className="mt-2 text-text-secondary">Content coming soon.</p>
    </div>
  );
}
