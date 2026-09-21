// Google "G" is exported from Figma as 4 separate coloured paths, each keeping
// its own inset within the 15x15 icon box.
const PARTS = [
  {
    src: "/images/auth/google-blue.svg",
    className: "inset-[41.96%_5.89%_15.78%_50.87%]",
  },
  {
    src: "/images/auth/google-green.svg",
    className: "inset-[58.73%_19.32%_4.99%_10.67%]",
  },
  {
    src: "/images/auth/google-yellow.svg",
    className: "inset-[29.8%_74.43%_29.8%_5.89%]",
  },
  {
    src: "/images/auth/google-red.svg",
    className: "inset-[4.99%_19.03%_58.63%_10.67%]",
  },
];

function GoogleIcon() {
  return (
    <span className="relative block size-[15px] shrink-0">
      {PARTS.map((part) => (
        <span key={part.src} className={`absolute ${part.className}`}>
          <img alt="" src={part.src} className="block size-full max-w-none" />
        </span>
      ))}
    </span>
  );
}

export { GoogleIcon };
