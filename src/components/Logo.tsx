/**
 * UNO SUJATA wordmark. Text only: UNO in steel silver, SUJATA in industrial red.
 * Solid colours, no gradients, no icon, no animation, so the name stays sharp at any size.
 * Colour pairs are chosen for contrast on their backgrounds (AA for large text).
 * Light: silver #5E656F on bone, red #B3202A on bone.
 * Dark:  silver #C7CDD4 on steel, red #F05A5F on steel.
 */
export type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, string> = {
  sm: "text-[15px] tracking-[0.06em]",
  md: "text-[18px] tracking-[0.06em] sm:text-[20px]",
  lg: "text-[28px] tracking-[0.05em] sm:text-[36px] lg:text-[42px]",
};

export default function Logo({
  inverted = false,
  size = "md",
  className = "",
}: {
  inverted?: boolean;
  size?: LogoSize;
  className?: string;
}) {
  const silver = inverted ? "text-[#C7CDD4]" : "text-[#5E656F]";
  const red = inverted ? "text-[#F05A5F]" : "text-[#B3202A]";
  return (
    <span
      role="img"
      aria-label="UNO SUJATA"
      className={`inline-flex items-baseline whitespace-nowrap font-display font-extrabold leading-none ${SIZES[size]} ${className}`}
    >
      <span aria-hidden="true" className={silver}>UNO</span>
      <span aria-hidden="true" className={`ml-[0.3em] ${red}`}>SUJATA</span>
    </span>
  );
}
