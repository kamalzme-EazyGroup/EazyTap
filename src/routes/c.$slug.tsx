import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { getPublicCard } from "@/lib/cards.functions";
import { rowToCard } from "@/lib/card-types";
import { CardView } from "@/components/CardView";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ params }) => {
    const row = await getPublicCard({ data: { slug: params.slug } });
    if (!row) throw notFound();
    return { card: rowToCard(row) };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.card;
    const title = c ? `${c.full_name || "Contact"} — EazyTap` : "Card unavailable — EazyTap";
    const desc = c ? [c.job_title, c.company].filter(Boolean).join(" · ") || "Save my contact details." : "This card is unavailable.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-3xl">This card doesn't exist</h1>
      <p className="text-muted-foreground">It may have been removed by its owner.</p>
      <Link to="/" className="text-primary hover:underline">Create your own card</Link>
    </div>
  ),
  component: PublicCard,
});

function PublicCard() {
  const { card } = Route.useLoaderData();
  return (
    <div data-card-theme={card.theme} data-card-font={card.font} className="min-h-screen">
      <div className="mx-auto max-w-md px-4 py-8 sm:py-14">
        <CardView card={card} pageUrl={typeof window !== "undefined" ? window.location.href : undefined} />
        <p className="mt-8 text-center text-xs text-c-muted">
          Made with{" "}
          <Link to="/" className="underline">
            EazyTap
          </Link>
        </p>
      </div>
    </div>
  );
}
