import { FurtherChapters } from "@/components/sections/FurtherChapters";
import { Hero } from "@/components/sections/Hero";
import { SelectedWork } from "@/components/sections/SelectedWork";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SelectedWork />
      <FurtherChapters />
    </>
  );
}
