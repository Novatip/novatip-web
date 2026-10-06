/**
 * app/[slug]/page.tsx
 *
 * Public tip page — accessible at /@alice or /alice.
 * Server component that fetches creator data, then hands off to the
 * client-side TipForm for wallet interaction.
 */

import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { ApiError, resolverApi, type ResolvedPage } from "@/lib/api";
import { normalizeSlug } from "@/lib/slug";
import { Header } from "@/components/Header";
import { TipForm } from "@/components/TipForm";
import { Badge } from "@/components/ui/Badge";
import { QRDownload } from "@/components/QRDownload";
import { SplitBreakdown } from "@/components/SplitBreakdown";
import { PublicSupportersFeed } from "@/components/PublicSupportersFeed";
import { Avatar } from "@/components/Avatar";

interface Props {
  // Next 15 resolves route params asynchronously, so this is a Promise.
  params: Promise<{ slug: string }>;
}

/** True for the one failure that means "nobody has claimed this slug". */
function isUnclaimedSlug(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Resolve the creator once per request via React's cache().
 * Both generateMetadata and TipPage call this function, but resolverApi.resolve
 * is only executed once per request pass.
 */
const resolveCreator = cache(async (slug: string): Promise<ResolvedPage> => {
  return await resolverApi.resolve(slug);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = normalizeSlug((await params).slug);

  try {
    const { creator, tipUrl } = await resolveCreator(slug);
    const title       = `Tip ${creator.displayName ?? `@${slug}`} on Novatip`;
    const description = creator.bio ?? `Send USDC tips to @${slug} in seconds on Stellar.`;

    return {
      title,
      description,
      // No `images` here on purpose. opengraph-image.tsx in this directory is a
      // Next file convention: it generates the preview image for this route and
      // injects the absolute URL into both openGraph and twitter automatically.
      // Setting them by hand pointed at /api/og/<slug>, a route that does not
      // exist, which meant every social preview 404'd.
      openGraph: {
        title,
        description,
        url:      tipUrl,
        siteName: "Novatip",
        type:     "profile",
      },
      twitter: {
        card:        "summary_large_image",
        title,
        description,
      },
    };
  } catch (error) {
    // Bailing out here as well as in the page body is what gets a dead link
    // the right <title>.  Metadata is resolved before the shell is flushed, so
    // this is the last point at which we can still influence what a link
    // scraper reads; leave it out and a mistyped slug is served under the
    // generic "Novatip" title.  It does not fix the *status* — see the note in
    // not-found.tsx about loading.tsx pinning that at 200.
    if (isUnclaimedSlug(error)) notFound();

    // A transient backend failure must not become a 404; leave the title
    // generic and let the page body decide what to do about it.
    return { title: "Novatip" };
  }
}

export default async function TipPage({ params }: Props) {
  const slug = normalizeSlug((await params).slug);

  let data: ResolvedPage;
  try {
    data = await resolveCreator(slug);
  } catch (error) {
    if (isUnclaimedSlug(error)) notFound();
    throw error;
  }

  const { creator, qrPngUrl, recentTips } = data;
  const displayName = creator.displayName ?? `@${slug}`;

  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start py-12 px-4 outline-none">
        <div className="w-full max-w-md animate-slide-up">

          {/* Creator profile header */}
          <div className="flex flex-col items-center gap-3 mb-8 text-center">
            <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-brand-500/30">
              <Avatar
                src={creator.avatarUrl}
                displayName={displayName}
                slug={slug}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fg break-words">{displayName}</h1>
              <p className="text-sm text-accent font-mono">@{slug}</p>
            </div>
            {creator.bio && (
              <p className="text-sm text-fg-subtle max-w-xs break-words line-clamp-3">{creator.bio}</p>
            )}
            <div className="flex gap-2 flex-wrap justify-center">
              <Badge variant="usdc">USDC tips</Badge>
              {creator.splits.length === 0 ? (
                <Badge variant="warning">Unconfigured</Badge>
              ) : creator.splits.length === 1 ? (
                <Badge variant="success">Solo creator</Badge>
              ) : (
                <Badge variant="success">
                  {`${creator.splits.length} collaborators`}
                </Badge>
              )}
            </div>
          </div>

          {/* Split breakdown — who gets paid and how much, before the supporter signs */}
          <div className="mb-6">
            <SplitBreakdown splits={creator.splits} />
          </div>

          {/* Tip form — client component */}
          <TipForm jarId={creator.jarId} slug={slug} splits={creator.splits} />

          {/* QR download */}
          <div className="mt-6 flex justify-center">
            <QRDownload slug={slug} pngUrl={qrPngUrl} />
          </div>

          {/* Social proof — recent tips */}
          <div className="mt-6">
            <PublicSupportersFeed tips={recentTips} />
          </div>

        </div>
      </main>
    </>
  );
}
