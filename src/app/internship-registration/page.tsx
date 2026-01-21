import InternshipRegistrationClient from "@/components/internship-registration-client";

export default function InternshipRegistrationPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const earlyIdParam = searchParams?.earlyId;
  const earlyId = Array.isArray(earlyIdParam)
    ? earlyIdParam[0]
    : (earlyIdParam as string | undefined);

  return <InternshipRegistrationClient earlyId={earlyId} />;
}
