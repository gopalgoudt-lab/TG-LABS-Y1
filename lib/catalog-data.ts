import { prisma } from './prisma';
import { isCatalogOfferDisplayable } from './catalog-eligibility';
export const publicOfferSelect={id:true,price:true,mrp:true,availability:true,tat:true,active:true,sourceReference:true,lastVerifiedAt:true,effectiveFrom:true,effectiveTo:true,partner:{select:{id:true,slug:true,name:true,active:true,bookingEnabled:true,operationalEnabled:true,displayEnabled:true,accreditationDisplay:true,accreditationReference:true,accreditationVerifiedAt:true}}} as const;
export const publicProductSelect={id:true,slug:true,name:true,aliases:true,description:true,preparation:true,imageData:true,fastingNeeded:true,fastingHours:true,parameterCount:true,sampleTypes:true,active:true,homeCollectionCharge:true,categories:{where:{category:{active:true}},select:{category:{select:{slug:true,name:true,description:true}}}}} as const;
function isPreviewLegacyOfferDisplayable(product: { active: boolean }, offer: any, now: Date) {
  if (process.env.VERCEL_ENV !== 'preview') return false;
  if (!product.active || !offer.active || offer.availability !== 'AVAILABLE') return false;
  if (!Number.isSafeInteger(offer.price) || offer.price <= 0 || !offer.tat?.trim()) return false;
  if (!offer.partner?.active || !offer.partner?.displayEnabled) return false;
  if (!Number.isFinite(now.getTime())) return false;
  if (offer.effectiveFrom && (!Number.isFinite(offer.effectiveFrom.getTime()) || offer.effectiveFrom.getTime() > now.getTime())) return false;
  if (offer.effectiveTo && (!Number.isFinite(offer.effectiveTo.getTime()) || offer.effectiveTo.getTime() < now.getTime())) return false;
  return !offer.sourceReference?.trim() || !offer.lastVerifiedAt;
}

export function displayableOffers<T extends {active:boolean;partnerOffers:any[]}>(product:T,now=new Date()){
  return product.partnerOffers.filter(offer =>
    isCatalogOfferDisplayable(product,offer,offer.partner,now) ||
    isPreviewLegacyOfferDisplayable(product,offer,now)
  );
}
export async function findPublicTest(slug:string){const value=await prisma.diagnosticTest.findUnique({where:{slug},select:{...publicProductSelect,partnerOffers:{select:publicOfferSelect}}});if(!value?.active)return null;const partnerOffers=displayableOffers(value);return partnerOffers.length?{...value,partnerOffers}:null;}
export async function findPublicPackage(slug:string,type?:'PROFILE'|'PACKAGE'){const value=await prisma.diagnosticPackage.findUnique({where:{slug},select:{...publicProductSelect,packageType:true,partnerOffers:{select:publicOfferSelect},tests:{where:{test:{active:true}},select:{test:{select:{id:true,slug:true,name:true,fastingNeeded:true,sampleTypes:true}}}},includedProfiles:{where:{profile:{active:true}},select:{profile:{select:{id:true,slug:true,name:true,parameterCount:true,tests:{where:{test:{active:true}},select:{test:{select:{id:true,slug:true,name:true}}}}}}}}}});if(!value?.active||(type&&value.packageType!==type))return null;const partnerOffers=displayableOffers(value);return partnerOffers.length?{...value,partnerOffers}:null;}
