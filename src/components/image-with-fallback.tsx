"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  fallbackSrc?: string;
};

export default function ImageWithFallback({
  src,
  alt,
  fallbackSrc = "https://placehold.co/800x600?text=Image+not+found",
  ...rest
}: Props) {
  const [errored, setErrored] = useState(false);

  return (
    <Image
      {...rest}
      src={errored ? fallbackSrc : src}
      alt={alt}
      onError={() => setErrored(true)}
    />
  );
}
