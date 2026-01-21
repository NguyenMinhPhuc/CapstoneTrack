import InternshipRegistrationClient from "@/components/internship-registration-client";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function InternshipRegistrationPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const earlyIdParam = resolvedSearchParams?.earlyId;
  const earlyId = Array.isArray(earlyIdParam)
    ? earlyIdParam[0]
    : (earlyIdParam as string | undefined);

  return <InternshipRegistrationClient earlyId={earlyId} />;
}
