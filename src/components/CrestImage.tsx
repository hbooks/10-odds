import { useState } from "react";
import altCrest from "@/assets/crest_c.png";   

const IMAGE_PROXY = "https://wsrv.nl/?url=";

interface CrestImageProps {
  url?: string | null;
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
}

const sizeMap = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-16 w-16",
  xl: "h-12 w-12",
  xxl: "h-20 w-20"
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
        src={altCrest}
        alt={alt}
        className={`${sizeMap["md"]} object-contain ${className}`}
      />
    );
  }

  const isFootballData = url.includes("crests.football-data.org");
  const src = isFootballData ? IMAGE_PROXY + encodeURIComponent(url) : url;

  return (
    <img
      src={imgError ? altCrest : src}
      alt={alt}
      className={`${sizeMap[size]} object-contain ${className}`}
      onError={() => setImgError(true)}
    />
  );
};

export default CrestImage;