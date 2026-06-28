import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <Logo className="mb-8 justify-center" />
        <p className="text-7xl font-semibold silver-text">404</p>
        <h1 className="mt-3 text-xl font-semibold">This page isn&apos;t in the pool</h1>
        <p className="mt-2 text-sm text-muted-foreground">The candidate or page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="silver"><Link href="/dashboard">Back to dashboard</Link></Button>
          <Button asChild variant="outline"><Link href="/">Home</Link></Button>
        </div>
      </div>
    </div>
  );
}
