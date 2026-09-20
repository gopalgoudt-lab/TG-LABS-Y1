import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const api=fs.readFileSync('app/api/bookings/route.ts','utf8');const checkout=fs.readFileSync('app/checkout/page.tsx','utf8');const dto=fs.readFileSync('lib/catalog-public-dto.ts','utf8');const cart=fs.readFileSync('lib/catalog-cart.ts','utf8');const schema=fs.readFileSync('prisma/schema.prisma','utf8');
test('server computes one authoritative home collection charge using highest selected item charge',()=>{assert.match(api,/Math\.max\(0,\s*\.\.\./);assert.match(api,/body\.mode === 'home'/);assert.match(api,/homeCollectionCharge/);});
test('centre booking has no home collection charge',()=>{assert.match(api,/body\.mode === 'home'\s*\?/);});
test('booking stores applied charge and includes it in total',()=>{assert.match(schema,/homeCollectionCharge\s+Int\s+@default\(0\)/);assert.match(api,/totalAmount\s*=\s*pricing\.totalAmount\s*\+\s*homeCollectionCharge/);});
test('public DTO and cart carry configured charge for checkout display only',()=>{assert.match(dto,/homeCollectionCharge/);assert.match(cart,/homeCollectionCharge/);assert.match(checkout,/Home collection charge/);});
