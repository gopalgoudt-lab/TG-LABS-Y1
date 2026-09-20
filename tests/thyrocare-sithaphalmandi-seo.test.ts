import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const page=fs.readFileSync('app/thyrocare-sithaphalmandi/page.tsx','utf8');const sitemap=fs.readFileSync('app/sitemap.ts','utf8');
test('location page has canonical local identity and contact',()=>{assert.match(page,/https:\/\/www\.tglabs\.in\/thyrocare-sithaphalmandi/);assert.match(page,/Sithaphalmandi/i);assert.match(page,/Secunderabad/i);assert.match(page,/97011 62302/);});
test('page is transparent about TG Labs and Thyrocare relationship',()=>{assert.match(page,/TG Labs/i);assert.match(page,/Thyrocare/i);assert.doesNotMatch(page,/official Thyrocare website/i);});
test('page supports patient action and local SEO',()=>{assert.match(page,/LocalBusiness/);assert.match(page,/\/\?partner=thyrocare#catalog|\/#catalog/);assert.match(page,/Home sample collection/i);assert.match(page,/WhatsApp/i);});
test('sitemap includes dedicated location page',()=>{assert.match(sitemap,/thyrocare-sithaphalmandi/);});
