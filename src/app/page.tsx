import { Approach } from "@/components/sections/Approach";
import { Capabilities } from "@/components/sections/Capabilities";
import { Hero } from "@/components/sections/Hero";
import { Contact, Profile } from "@/components/sections/ProfileContact";
import { SelectedWork } from "@/components/sections/SelectedWork";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SelectedWork />
      <Approach />
      <Capabilities />
      <Profile />
      <Contact />
    </>
  );
}
