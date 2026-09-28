'use client';

import { useEffect, useState } from 'react';

const fallbackOffers = [
  {
    title: 'Full Body Health Checkup',
    subtitle: 'Compare available partner packages and book home collection.',
    image: 'https://images.pexels.com/photos/29925535/pexels-photo-29925535.jpeg?auto=compress&cs=tinysrgb&w=900',
    alt: 'Family representing preventive health checkups',
    query: 'full body',
  },
  {
    title: 'Thyroid Profile',
    subtitle: 'T3, T4 and UTSH testing with convenient home sample collection.',
    image: 'https://images.pexels.com/photos/6749781/pexels-photo-6749781.jpeg?auto=compress&cs=tinysrgb&w=900',
    alt: 'Healthcare professional representing thyroid testing',
    query: 'Thyroid',
  },
  {
    title: 'Diabetes Screening',
    subtitle: 'Find current diabetes tests and partner offers available in your area.',
    image: 'https://images.pexels.com/photos/33200678/pexels-photo-33200678.jpeg?auto=compress&cs=tinysrgb&w=900',
    alt: 'Blood glucose meter representing diabetes screening',
    query: 'diabetes',
  },
];

export default function HomeOfferCarousel() {
  const [offers, setOffers] = useState(fallbackOffers);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let live = true;
    fetch('/api/homepage-offers', { cache: 'no-store' }).then(r => r.ok ? r.json() : { offers: [] }).then(data => {
      if (!live || !Array.isArray(data.offers) || !data.offers.length) return;
      setOffers(data.offers.map((x:any) => ({ title:x.title, subtitle:x.subtitle, image:x.imageUrl, alt:x.imageAlt, query:x.searchQuery })));
      setActive(0);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % offers.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [offers.length]);

  const goTo = (index: number) => setActive((index + offers.length) % offers.length);

  return (
    <div className="refOfferCarousel" aria-roledescription="carousel" aria-label="Latest TG Labs offers">
      <div className="refOfferViewport">
        {offers.map((offer, index) => (
          <article
            className={`refOfferSlide ${index === active ? 'isActive' : ''}`}
            key={offer.title}
            aria-hidden={index !== active}
          >
            <img src={offer.image} alt={offer.alt} loading={index === 0 ? 'eager' : 'lazy'} />
            <div className="refOfferShade" />
            <div className="refOfferContent">
              <span>Latest offer</span>
              <h2>{offer.title}</h2>
              <p>{offer.subtitle}</p>
              <a
                className="refOfferBook"
                href={`/?q=${encodeURIComponent(offer.query)}#catalog`}
                tabIndex={index === active ? 0 : -1}
              >
                Book Now
              </a>
            </div>
          </article>
        ))}
      </div>
      <button className="refOfferArrow refOfferPrev" type="button" onClick={() => goTo(active - 1)} aria-label="Previous offer">‹</button>
      <button className="refOfferArrow refOfferNext" type="button" onClick={() => goTo(active + 1)} aria-label="Next offer">›</button>
      <div className="refOfferDots" aria-label="Choose offer">
        {offers.map((offer, index) => (
          <button
            type="button"
            key={offer.title}
            className={index === active ? 'isActive' : ''}
            onClick={() => goTo(index)}
            aria-label={`Show ${offer.title}`}
            aria-current={index === active ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
}
