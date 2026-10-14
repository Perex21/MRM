import { Approach } from "@/components/sections/Approach";
import { Capabilities } from "@/components/sections/Capabilities";
import { Hero } from "@/components/sections/Hero";
import { Contact, Profile } from "@/components/sections/ProfileContact";
import { SelectedWork } from "@/components/sections/SelectedWork";
import { WindGust } from "@/components/world/WindGust";
import { World } from "@/components/world/World";

/**
 * The home page is one journey: the Arrival, the Path, the Archive, the
 * Disciplines, the Record and the Destination. The World layer behind it
 * carries the landscape from scene to scene; WindGust plays once on arrival.
 */
export default function HomePage() {
  return (
    <>
      <World />
      <WindGust />
      <Hero />
      <Approach />
      <SelectedWork />
      <Capabilities />
      <Profile />
      <Contact />
    </>
  );
}
