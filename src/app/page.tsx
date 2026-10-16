import { Approach } from "@/components/sections/Approach";
import { Capabilities } from "@/components/sections/Capabilities";
import { Hero } from "@/components/sections/Hero";
import { Contact, Profile } from "@/components/sections/ProfileContact";
import { SelectedWork } from "@/components/sections/SelectedWork";
import { World } from "@/components/world/World";

/**
 * The home page is one journey. The Arrival (a living landscape, then the
 * name) carries the visitor up into the clouds and out into the paper of the
 * Archive; the World layer behind the later ink scenes keeps the landscape
 * going from there.
 */
export default function HomePage() {
  return (
    <>
      <World />
      <Hero />
      <SelectedWork />
      <Approach />
      <Capabilities />
      <Profile />
      <Contact />
    </>
  );
}
