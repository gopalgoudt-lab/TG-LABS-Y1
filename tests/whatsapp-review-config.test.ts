import assert from "node:assert/strict";
import test from "node:test";
import { getWhatsAppReviewConfigStatus, isValidWhatsAppReviewTestConfiguration } from "../lib/whatsapp-review-config";

test("valid numeric sender and recipient pass without disclosing their values", () => {
  const config = { enabled: "true", phoneId: "1235543606310095", recipient: "919963885883", token: "private-token" };
  assert.equal(isValidWhatsAppReviewTestConfiguration(config), true);
  assert.deepEqual(getWhatsAppReviewConfigStatus(config), {
    enabled: true, senderIdValid: true, recipientValid: true, accessTokenPresent: true,
  });
  assert.equal(JSON.stringify(getWhatsAppReviewConfigStatus(config)).includes(config.token), false);
});
test("invalid values fail closed", () => {
  assert.equal(isValidWhatsAppReviewTestConfiguration({phoneId:"1209018948971017", recipient:"919963885883",token:"t"}),false);
  assert.equal(isValidWhatsAppReviewTestConfiguration({phoneId:"1235543606310095",recipient:"91 9963885883",token:"t"}),false);
  assert.equal(isValidWhatsAppReviewTestConfiguration({phoneId:"1235543606310095",recipient:"919963885883",token:" "}),false);
});
