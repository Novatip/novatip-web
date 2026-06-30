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
import { resolverApi } from "@/lib/api";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = normalizeSlug(params.slug);
  try {
    const { creator } = await resolverApi.resolve(slug).then((r) => r);
    return {
      title:       `Tip ${creator.displayName ?? `@${slug}`} on Novatip`,
      description: creator.bio ?? `Send USDC tips to @${slug} in seconds.`,
    };
  } catch {
    return { title: "Novatip" };
  }
}

export default async function TipPage({ params }: Props) {
  const slug = normalizeSlug(params.slug);

  let resolved;
  try {
    resolved = await resolverApi.resolve(slug);
  } catch {
    notFound();
  }

  const { creator, qrPngUrl } = resolved;
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
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-brand-400 font-mono">@{slug}</p>
            </div>
            {creator.bio && (
              <p className="text-sm text-gray-400 max-w-xs">{creator.bio}</p>
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
