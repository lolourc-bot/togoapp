/** Official uploaded mark, on a circular badge. */
export function BrandLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img
      src="/logo-togo.png"
      alt="TOGO"
      width={48}
      height={48}
      className={`shrink-0 object-cover rounded-full ${className}`}
    />
  );
}