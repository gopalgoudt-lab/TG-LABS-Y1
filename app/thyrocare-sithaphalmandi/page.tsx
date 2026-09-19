import SithaphalmandiLanding, { localMetadata } from '@/components/SithaphalmandiLanding';

export const metadata = localMetadata('thyrocare-sithaphalmandi', 'Thyrocare Sithaphalmandi Centre', 'Contact the Thyrocare collection centre in Sithaphalmandi through TG Labs. Find local directions and enquire about tests, packages and home sample collection.');

export default function CentrePage() {
  return <SithaphalmandiLanding slug="thyrocare-sithaphalmandi" title="Thyrocare Sithaphalmandi Centre" intro="Planning a lab visit or a blood test in Sithaphalmandi? Contact the local collection centre to confirm the test you need, preparation instructions and the next suitable collection time.">
    <section><h2>Find the collection centre</h2>
      <address style={{ fontStyle: 'normal' }}>11-1-163, opposite State Bank of India,<br />Mylar Gadda Main Road, Sithaphalmandi,<br />Secunderabad, Telangana.</address>
      <p>The locality may also appear as Seethaphalmandi on maps. Check the map pin and call for directions before travelling.</p>
      <a href="https://share.google/WAUMDMjdq3FkN57JN">Open the centre’s Google listing and directions →</a>
      <p><strong>Visiting hours:</strong> Please call to confirm today’s opening hours and the collection cut-off for your test.</p>
    </section>
    <section><h2>Before visiting</h2><ul>
      <li>Have your test names or clinician’s prescription ready so the centre can confirm the exact investigation.</li>
      <li>Ask for the total price, sample requirements and expected report time for the selected laboratory.</li>
      <li>Confirm whether fasting is required. Follow the laboratory or clinician’s instructions; do not stop prescribed medicines without medical advice.</li>
      <li>For report enquiries, contact the centre that accepted your booking. Avoid posting reports or patient details in public reviews.</li>
    </ul></section>
    <section><h2>Choose how to enquire</h2><p>For a home visit, share your locality and pincode first so the centre can check coverage and timing. For packages, compare the included investigations rather than the package name alone.</p>
      <p><a href="/home-blood-test-sithaphalmandi">Check home sample collection →</a></p>
      <p><a href="/thyrocare-packages-sithaphalmandi">Explore current Thyrocare package listings →</a></p>
    </section>
  </SithaphalmandiLanding>;
}
