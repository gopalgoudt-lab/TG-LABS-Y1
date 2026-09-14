import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const hub=readFileSync('app/health-blog/page.tsx','utf8');
const article=readFileSync('app/health-blog/[slug]/page.tsx','utf8');
const content=readFileSync('lib/health-content.ts','utf8');
const sitemap=readFileSync('app/sitemap.ts','utf8');

test('health hub exposes canonical educational content',()=>{
 assert.match(hub,/alternates:\{canonical:'https:\/\/www\.tglabs\.in\/health-blog'\}/);
 assert.match(hub,/Medical information notice/);
 assert.match(hub,/general education only/);
});

test('article pages provide SEO and medical-safety boundaries',()=>{
 assert.match(article,/generateStaticParams/);
 assert.match(article,/generateMetadata/);
 assert.match(article,/application\/ld\+json/);
 assert.match(article,/'@type':'Article'/);
 assert.match(article,/not a diagnosis or treatment recommendation/);
 assert.match(article,/Search \{article\.searchQuery\}/);
});

test('content remains conservative and avoids treatment claims',()=>{
 assert.match(content,/The test itself does not establish a diagnosis on its own/);
 assert.match(content,/should not be interpreted in isolation/);
 assert.match(content,/rather than stopping medicines on your own/);
 assert.doesNotMatch(content,/you have (an?|the) disease/i);
 assert.doesNotMatch(content,/take this medicine/i);
});

test('health hub and articles are included in sitemap',()=>{
 assert.match(sitemap,/route: '\/health-blog'/);
 assert.match(sitemap,/healthArticles\.map/);
 assert.match(sitemap,/\/health-blog\/\$\{article\.slug\}/);
});
