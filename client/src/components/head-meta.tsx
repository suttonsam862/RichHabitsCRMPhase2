
import { Helmet } from 'react-helmet-async';

export function HeadMeta({ title, desc }: { title: string; desc?: string }) {
  return (
    <Helmet>
      <title>{title ? `${title} · Rich Habits` : 'Rich Habits'}</title>
      {desc && <meta name="description" content={desc} />}
      <meta name="theme-color" content="#7c3aed" />
    </Helmet>
  );
}
