import SithaphalmandiLanding, { localMetadata } from '@/components/SithaphalmandiLanding';

export const metadata = localMetadata('home-blood-test-sithaphalmandi', 'Home Blood Test in Sithaphalmandi', 'Enquire about home blood sample collection in Sithaphalmandi with TG Labs. Confirm pincode coverage, collection charges, preparation and available timings.');

export default function CollectionPage() {
  return <SithaphalmandiLanding slug="home-blood-test-sithaphalmandi" title="Home Blood Test in Sithaphalmandi" intro="Enquire about home sample collection without travelling to the centre. Coverage and timing must be confirmed for your address, selected test and processing laboratory before a visit is arranged.">
    <section><h2>Arrange a collection enquiry</h2><ol>
      <li><strong>Share the test and location.</strong> Tell the centre the test or package name, locality and pincode. Share a full address privately only when needed to arrange the visit.</li>
      <li><strong>Confirm the complete quote.</strong> Ask about test prices, any separate collection charge and the expected report time.</li>
      <li><strong>Confirm preparation and timing.</strong> Ask whether fasting or a particular collection time is required for your selected tests.</li>
      <li><strong>Wait for confirmation.</strong> Agree on the date, time and collection arrangements with the centre. A WhatsApp enquiry alone does not reserve a slot.</li>
    </ol></section>
    <section><h2>Coverage around Sithaphalmandi</h2><p>Contact the centre with your pincode to check home collection in Sithaphalmandi and nearby localities. Being nearby does not automatically mean that every test or time slot is available at your address.</p><p>Online bookings through TG Labs use the existing pincode, partner and slot checks. If a choice is unavailable online, an enquiry does not override those checks.</p></section>
    <section><h2>Preparation and reports</h2><p>Do not assume every blood test needs fasting. Confirm the instructions for your exact test or package, including medicines and water intake, with the laboratory or clinician. Do not change prescribed treatment yourself.</p><p>Ask how the report will be delivered and when to follow up. Report timing varies by investigation and laboratory; no same-day report time is promised here.</p></section>
    <section><h2>Prefer to visit?</h2><p><a href="/thyrocare-sithaphalmandi">Find the Sithaphalmandi centre and contact details →</a></p><p><a href="/home-blood-test-hyderabad">See the wider Hyderabad home collection guide →</a></p></section>
  </SithaphalmandiLanding>;
}
