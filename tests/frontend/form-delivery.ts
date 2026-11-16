import assert from 'node:assert/strict';
import {verifiedFormReceipt} from '../../frontend/src/form-delivery';
const receipt={id:'6262114b-2222-4222-8222-111111111111',formId:'form',requestId:'nonce',receivedAt:'2026-11-16T12:00:00Z',fileCount:2};
assert.deepEqual(verifiedFormReceipt({ok:true,receipt},'form','nonce',2),receipt);
for(const data of [null,{}, {authenticated:true,csrf:'session response'}, {ok:true}, {ok:true,receipt:{...receipt,formId:'other'}}, {ok:true,receipt:{...receipt,requestId:'cached'}}, {ok:true,receipt:{...receipt,fileCount:1}}, {ok:true,receipt:{...receipt,id:'bad'}}, {ok:true,receipt:{...receipt,receivedAt:'bad'}}]) assert.throws(()=>verifiedFormReceipt(data,'form','nonce',2),/confirm/);
console.log('Form receipts: unrelated JSON, replay, wrong form, wrong file count and malformed receipts never show success.');
