/**
 * app/[slug]/page.tsx
 *
 * Public tip page — accessible at /@alice or /alice.
 * Server component that fetches creator data, then hands off to the
 * client-side TipForm for wallet interaction.
 */

import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { ApiError, resolverApi, type ResolvedPage } from "@/lib/api";
import { Header } from "@/components/Header";
import { TipForm } from "@/components/TipForm";
import { Badge } from "@/components/ui/Badge";
import { QRDownload } from "@/components/QRDownload";

interface Props {
  params: { slug: string };
}

// Strip leading @ if the user typed /@alice in the URL
function normalizeSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/^@/, "");
}

/** True for the one failure that means "nobody has claimed this slug". */
function isUnclaimedSlug(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Resolve the creator, or hand control to the right boundary.
 *
 * Only a 404 from the resolver means the slug is unclaimed.  Every other
 * failure — a 500, a timeout, the backend being unreachable — is our fault,
 * and rendering "no tip jar here" for those would tell a visitor a creator
 * does not exist when they do, sending them away for good over a blip.  Those
 * are rethrown so app/error.tsx offers a retry instead.
 */
async function resolveCreator(slug: string): Promise<ResolvedPage> {
  try {
    return await resolverApi.resolve(slug);
  } catch (error) {
    if (isUnclaimedSlug(error)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = normalizeSlug(params.slug);

  try {
    const { creator } = await resolverApi.resolve(slug);
    return {
      title:       `Tip ${creator.displayName ?? `@${slug}`} on Novatip`,
      description: creator.bio ?? `Send USDC tips to @${slug} in seconds.`,
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
  const slug = normalizeSlug(params.slug);

  const { creator, qrPngUrl } = await resolveCreator(slug);
  const displayName = creator.displayName ?? `@${slug}`;
  const avatarUrl   =
    creator.avatarUrl ??
    `https://api.dicebear.com/8.x/identicon/svg?seed=${slug}`;

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start py-12 px-4">
        <div className="w-full max-w-md animate-slide-up">

          {/* Creator profile header */}
          <div className="flex flex-col items-center gap-3 mb-8 text-center">
            <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-brand-500/30">
              <Image
                src={avatarUrl}
                alt={`${displayName} avatar`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-fg">{displayName}</h1>
              <p className="text-sm text-accent font-mono">@{slug}</p>
            </div>
            {creator.bio && (
              <p className="text-sm text-fg-subtle max-w-xs">{creator.bio}</p>
            )}
            <div className="flex gap-2 flex-wrap justify-center">
              <Badge variant="usdc">USDC tips</Badge>
              <Badge variant="success">
                {creator.splits.length > 1
                  ? `${creator.splits.length} collaborators`
                  : "Solo creator"}
              </Badge>
            </div>
          </div>

          {/* Tip form — client component */}
          <TipForm jarId={creator.jarId} slug={slug} />

          {/* QR download */}
          <div className="mt-6 flex justify-center">
            <QRDownload slug={slug} pngUrl={qrPngUrl} />
          </div>

        </div>
      </main>
    </>
  );
}
