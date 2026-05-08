import { useState } from "react";

const IMAGE_PROXY = "https://wsrv.nl/?url=";

const FALLBACK_CREST =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%23333' stroke='%23555' stroke-width='2'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%23aaa' font-size='12'%3E?%3C/text%3E%3C/svg%3E";

interface CrestImageProps {
  url?: string | null;
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-16 w-16",
};

const CrestImage: React.FC<CrestImageProps> = ({
  url,
  alt = "",
  className = "",
  size = "md",
}) => {
  const [imgError, setImgError] = useState(false);

  if (!url) {
    return (
      <img
        src={FALLBACK_CREST}
        alt={alt}
        className={`${sizeMap[size]} object-contain ${className}`}
      />
    );
  }

  const isFootballData = url.includes("crests.football-data.org");
  const src = isFootballData ? IMAGE_PROXY + encodeURIComponent(url) : url;

  return (
    <img
      src={imgError ? FALLBACK_CREST : src}
      alt={alt}
      className={`${sizeMap[size]} object-contain ${className}`}
      onError={() => setImgError(true)}
    />
  );
};

export default CrestImage;